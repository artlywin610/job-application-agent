import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.join(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, 'job-agent.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS resumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      mimetype TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      skills TEXT NOT NULL,
      education TEXT NOT NULL,
      projects TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT,
      url TEXT,
      description TEXT NOT NULL,
      required_skills TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'found' CHECK(status IN ('found', 'approved', 'applied', 'rejected', 'failed')),
      score INTEGER NOT NULL DEFAULT 0,
      explanation TEXT NOT NULL DEFAULT '',
      missing_skills TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source, url)
    );

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
      approved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      applied_at TEXT,
      notes TEXT,
      automation_log TEXT NOT NULL DEFAULT '[]'
    );
  `);
}

const parseJson = (value, fallback) => {
  try {
    return JSON.parse(value ?? '');
  } catch {
    return fallback;
  }
};

export function serializeResume(row) {
  if (!row) return null;
  return {
    ...row,
    skills: parseJson(row.skills, []),
    education: parseJson(row.education, []),
    projects: parseJson(row.projects, [])
  };
}

export function serializeJob(row) {
  if (!row) return null;
  return {
    ...row,
    required_skills: parseJson(row.required_skills, []),
    missing_skills: parseJson(row.missing_skills, [])
  };
}

export function latestResume() {
  return serializeResume(db.prepare('SELECT * FROM resumes ORDER BY created_at DESC, id DESC LIMIT 1').get());
}

export function dashboardCounts() {
  const rows = db.prepare('SELECT status, COUNT(*) as count FROM jobs GROUP BY status').all();
  const counts = { found: 0, approved: 0, applied: 0, rejected: 0, failed: 0 };
  for (const row of rows) counts[row.status] = row.count;
  return {
    jobsFound: counts.found,
    jobsApproved: counts.approved,
    appliedJobs: counts.applied,
    rejectedJobs: counts.rejected,
    failedJobs: counts.failed
  };
}
