import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import fs from 'node:fs/promises';
import { db, migrate, serializeJob, latestResume, dashboardCounts } from './db.js';
import { extractTextFromResume, parseResumeText } from './services/resumeParser.js';
import { searchJobs } from './services/jobSearch.js';
import { scoreJob } from './services/matchingEngine.js';
import { applyToApprovedJob } from './services/applicationAutomation.js';

migrate();

const app = express();
const port = process.env.PORT || 4000;
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.includes(file.mimetype) || /\.(pdf|docx)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Only PDF and DOCX resumes are supported.'));
  }
});

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/resume', upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Upload a PDF or DOCX resume.' });
    const text = await extractTextFromResume(req.file);
    const parsed = parseResumeText(text);
    const result = db.prepare(`
      INSERT INTO resumes (filename, mimetype, raw_text, skills, education, projects)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      req.file.originalname,
      req.file.mimetype,
      parsed.rawText,
      JSON.stringify(parsed.skills),
      JSON.stringify(parsed.education),
      JSON.stringify(parsed.projects)
    );
    await fs.rm(req.file.path, { force: true });
    res.status(201).json({ id: result.lastInsertRowid, ...parsed });
  } catch (error) {
    if (req.file?.path) await fs.rm(req.file.path, { force: true });
    next(error);
  }
});

app.get('/api/resume/latest', (_req, res) => res.json({ resume: latestResume() }));

app.post('/api/jobs/search', async (req, res, next) => {
  try {
    const resume = latestResume();
    const jobs = await searchJobs({ ...req.body, resume });
    const insert = db.prepare(`
      INSERT INTO jobs (source, title, company, location, url, description, required_skills, score, explanation, missing_skills)
      VALUES (@source, @title, @company, @location, @url, @description, @required_skills, @score, @explanation, @missing_skills)
      ON CONFLICT(source, url) DO UPDATE SET
        title=excluded.title,
        company=excluded.company,
        location=excluded.location,
        description=excluded.description,
        required_skills=excluded.required_skills,
        score=excluded.score,
        explanation=excluded.explanation,
        missing_skills=excluded.missing_skills,
        updated_at=CURRENT_TIMESTAMP
    `);

    const saveMany = db.transaction((records) => {
      for (const job of records) {
        insert.run({
          ...job,
          required_skills: JSON.stringify(job.required_skills ?? []),
          missing_skills: JSON.stringify(job.missingSkills ?? job.missing_skills ?? [])
        });
      }
    });
    saveMany(jobs);

    const rows = db.prepare('SELECT * FROM jobs ORDER BY score DESC, created_at DESC').all().map(serializeJob);
    res.json({ jobs: rows });
  } catch (error) {
    next(error);
  }
});

app.get('/api/jobs', (req, res) => {
  const status = req.query.status;
  const rows = status
    ? db.prepare('SELECT * FROM jobs WHERE status = ? ORDER BY score DESC, created_at DESC').all(status)
    : db.prepare('SELECT * FROM jobs ORDER BY score DESC, created_at DESC').all();
  res.json({ jobs: rows.map(serializeJob) });
});

app.patch('/api/jobs/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['found', 'approved', 'applied', 'rejected', 'failed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found.' });

  db.prepare('UPDATE jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
  if (status === 'approved') {
    db.prepare(`INSERT INTO applications (job_id, notes) VALUES (?, ?) ON CONFLICT(job_id) DO UPDATE SET approved_at=CURRENT_TIMESTAMP, notes=excluded.notes`).run(req.params.id, req.body.notes ?? 'User approved from queue.');
  }
  res.json({ job: serializeJob(db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id)) });
});

app.post('/api/jobs/:id/rescore', (req, res) => {
  const resume = latestResume();
  const job = serializeJob(db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id));
  if (!job) return res.status(404).json({ error: 'Job not found.' });
  const scoring = scoreJob(resume, job);
  db.prepare('UPDATE jobs SET score = ?, explanation = ?, missing_skills = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(scoring.score, scoring.explanation, JSON.stringify(scoring.missingSkills), req.params.id);
  res.json({ job: serializeJob(db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id)) });
});

app.post('/api/applications/:jobId/apply', async (req, res, next) => {
  try {
    const job = serializeJob(db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.jobId));
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    if (job.status !== 'approved' || req.body.confirm !== true) {
      return res.status(403).json({ error: 'Explicit approval and confirm=true are required before automation.' });
    }
    const log = await applyToApprovedJob(job);
    db.prepare('UPDATE jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('applied', job.id);
    db.prepare('UPDATE applications SET applied_at = CURRENT_TIMESTAMP, automation_log = ? WHERE job_id = ?')
      .run(JSON.stringify(log), job.id);
    res.json({ log });
  } catch (error) {
    next(error);
  }
});

app.get('/api/dashboard', (_req, res) => res.json(dashboardCounts()));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message ?? 'Unexpected server error' });
});

app.listen(port, () => {
  console.log(`Job Application Agent API running on http://localhost:${port}`);
});
