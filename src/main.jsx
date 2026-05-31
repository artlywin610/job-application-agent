import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Briefcase, CheckCircle2, Clock, FileText, Search, ShieldCheck, XCircle } from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tone}`}><Icon size={24} /></div>
      </div>
    </div>
  );
}

function ResumePanel({ resume, onUploaded }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function uploadResume(event) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setError('');
    const form = new FormData();
    form.append('resume', file);
    try {
      const parsed = await api('/resume', { method: 'POST', body: form });
      onUploaded(parsed);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
      <div className="flex items-center gap-3">
        <FileText className="text-cyan-300" />
        <div>
          <h2 className="text-xl font-semibold text-white">Resume Upload</h2>
          <p className="text-sm text-slate-400">PDF and DOCX parsing for skills, education, and projects.</p>
        </div>
      </div>
      <form onSubmit={uploadResume} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:font-semibold file:text-slate-950"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => setFile(event.target.files?.[0])}
        />
        <button className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-50" disabled={!file || busy}>
          {busy ? 'Parsing…' : 'Upload'}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      {resume && (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <InfoList title="Skills" items={resume.skills} />
          <InfoList title="Education" items={resume.education} />
          <InfoList title="Projects" items={resume.projects} />
        </div>
      )}
    </section>
  );
}

function InfoList({ title, items }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <h3 className="font-semibold text-slate-100">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {(items?.length ? items : ['Not detected yet']).slice(0, 12).map((item) => (
          <span key={item} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{item}</span>
        ))}
      </div>
    </div>
  );
}

function SearchPanel({ onJobs }) {
  const [query, setQuery] = useState('Software Engineer');
  const [location, setLocation] = useState('Remote');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function runSearch(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, location, live: false })
      });
      onJobs(data.jobs);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
      <div className="flex items-center gap-3">
        <Search className="text-emerald-300" />
        <div>
          <h2 className="text-xl font-semibold text-white">Job Search</h2>
          <p className="text-sm text-slate-400">Aggregates LinkedIn, Indeed, Internshala, Wellfound, and Naukri into a review queue.</p>
        </div>
      </div>
      <form onSubmit={runSearch} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Role" />
        <input className="input" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location" />
        <button className="rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-50" disabled={busy}>
          {busy ? 'Searching…' : 'Find Jobs'}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </section>
  );
}

function JobCard({ job, onStatus, onApply }) {
  const scoreColor = job.score >= 75 ? 'text-emerald-300' : job.score >= 50 ? 'text-amber-300' : 'text-rose-300';
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">{job.source}</span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{job.status}</span>
          </div>
          <h3 className="mt-3 text-lg font-bold text-white">{job.title}</h3>
          <p className="text-sm text-slate-400">{job.company} • {job.location}</p>
        </div>
        <div className="text-right">
          <p className={`text-4xl font-black ${scoreColor}`}>{job.score}</p>
          <p className="text-xs uppercase tracking-wide text-slate-500">match score</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{job.explanation}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {job.required_skills.map((skill) => <span key={skill} className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">{skill}</span>)}
        {job.missing_skills.map((skill) => <span key={skill} className="rounded-full bg-rose-400/10 px-3 py-1 text-xs text-rose-200">Missing: {skill}</span>)}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {job.status === 'found' && <button className="btn-primary" onClick={() => onStatus(job.id, 'approved')}>Approve</button>}
        {job.status !== 'rejected' && job.status !== 'applied' && <button className="btn-muted" onClick={() => onStatus(job.id, 'rejected')}>Reject</button>}
        {job.status === 'approved' && <button className="btn-danger" onClick={() => onApply(job.id)}>Run guarded apply</button>}
        {job.url && <a className="btn-muted" href={job.url} target="_blank" rel="noreferrer">Open posting</a>}
      </div>
    </article>
  );
}

function App() {
  const [resume, setResume] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [counts, setCounts] = useState({ jobsFound: 0, jobsApproved: 0, appliedJobs: 0, rejectedJobs: 0 });
  const [message, setMessage] = useState('');

  async function refresh() {
    const [resumeData, jobsData, dashboard] = await Promise.all([
      api('/resume/latest'),
      api('/jobs'),
      api('/dashboard')
    ]);
    setResume(resumeData.resume);
    setJobs(jobsData.jobs);
    setCounts(dashboard);
  }

  useEffect(() => { refresh().catch((err) => setMessage(err.message)); }, []);

  const sortedJobs = useMemo(() => [...jobs].sort((a, b) => b.score - a.score), [jobs]);

  async function updateStatus(id, status) {
    const data = await api(`/jobs/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    setJobs((current) => current.map((job) => job.id === id ? data.job : job));
    setMessage(status === 'approved' ? 'Job saved to approved queue. Automation is still blocked until you confirm apply.' : `Job marked ${status}.`);
    refresh().catch(() => {});
  }

  async function apply(id) {
    const ok = window.confirm('Confirm guarded automation for this approved job? The agent will stop before any final submit step.');
    if (!ok) return;
    await api(`/applications/${id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true })
    });
    setMessage('Guarded application automation completed and did not bypass approval safeguards.');
    refresh().catch(() => {});
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#164e63,transparent_30%),#020617] px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300"><ShieldCheck size={18} /> approval-first automation</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">Job Application Agent</h1>
            <p className="mt-3 max-w-3xl text-slate-300">Upload a resume, discover jobs, inspect match explanations, approve only the opportunities you want, then run guarded Playwright assistance.</p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard icon={Briefcase} label="Jobs Found" value={counts.jobsFound} tone="bg-cyan-400/10 text-cyan-300" />
          <StatCard icon={Clock} label="Jobs Approved" value={counts.jobsApproved} tone="bg-amber-400/10 text-amber-300" />
          <StatCard icon={CheckCircle2} label="Applied Jobs" value={counts.appliedJobs} tone="bg-emerald-400/10 text-emerald-300" />
          <StatCard icon={XCircle} label="Rejected Jobs" value={counts.rejectedJobs} tone="bg-rose-400/10 text-rose-300" />
        </section>

        {message && <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-100">{message}</div>}

        <div className="grid gap-6 xl:grid-cols-2">
          <ResumePanel resume={resume} onUploaded={(parsed) => { setResume(parsed); setMessage('Resume parsed successfully.'); }} />
          <SearchPanel onJobs={(records) => { setJobs(records); refresh().catch(() => {}); }} />
        </div>

        <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <h2 className="text-2xl font-bold text-white">Application Queue</h2>
          <p className="mt-1 text-sm text-slate-400">No application can run until you approve the job and confirm the guarded apply action.</p>
          <div className="mt-6 grid gap-4">
            {sortedJobs.length ? sortedJobs.map((job) => <JobCard key={job.id} job={job} onStatus={updateStatus} onApply={apply} />) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-400">Search for jobs to populate the queue.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
