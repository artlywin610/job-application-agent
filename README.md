# Job Application Agent

A local-first job application automation platform built with React, Tailwind, Node.js, Express, SQLite, and Playwright. It helps you upload and parse a resume, discover jobs, score role fit, manage an approval queue, and run guarded browser automation only after explicit user approval.

> Safety principle: this app never submits applications without explicit user approval. The backend rejects automation unless a job is already approved and the request includes `confirm: true`; the Playwright helper also stops before a final submit action.

## Features

- **Resume upload**
  - PDF and DOCX support.
  - Extracts raw resume text.
  - Detects skills, education, and projects.
- **Job search aggregation**
  - Source coverage for LinkedIn, Indeed, Internshala, Wellfound, and Naukri.
  - Default local demo mode creates realistic source-tagged listings so setup works without scraping credentials or violating job-board flows.
  - Optional live discovery scaffold uses Playwright to open source boards and can be extended with compliant integrations.
- **Matching engine**
  - Scores jobs from 0 to 100.
  - Explains why each score was assigned.
  - Highlights missing skills.
- **Application queue**
  - Saves found jobs before applying.
  - Requires user approval to move a job into the approved queue.
  - Requires a second explicit confirmation before guarded Playwright automation.
- **Dashboard**
  - Jobs Found.
  - Jobs Approved.
  - Applied Jobs.
  - Rejected Jobs.
- **Database**
  - SQLite via `better-sqlite3`.

## Tech stack

- Frontend: React, Vite, Tailwind CSS, lucide-react.
- Backend: Node.js, Express, Multer.
- Database: SQLite.
- Resume parsing: `pdf-parse`, `docx-parser`.
- Browser automation: Playwright.

## Local setup

### Prerequisites

- Node.js 20 or newer.
- npm.

### Install dependencies

```bash
npm install
```

### Install Playwright browser binaries

```bash
npx playwright install chromium
```

### Configure environment

Create an optional `.env` file:

```bash
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
VITE_API_URL=http://localhost:4000/api
```

### Run the app locally

```bash
npm run dev
```

Open the frontend at <http://localhost:5173>. The API runs at <http://localhost:4000/api>.

### Production-style build

```bash
npm run build
npm run server:start
```

## How to use

1. Upload a PDF or DOCX resume.
2. Review extracted skills, education, and projects.
3. Search for a role and location.
4. Inspect each job's match score, explanation, required skills, and missing skills.
5. Approve jobs you want to pursue or reject jobs you do not want.
6. For an approved job, click **Run guarded apply** and confirm the browser automation prompt.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check. |
| `POST` | `/api/resume` | Upload a `resume` file field containing PDF or DOCX. |
| `GET` | `/api/resume/latest` | Fetch latest parsed resume. |
| `POST` | `/api/jobs/search` | Search and persist jobs. Body: `{ "query": "Software Engineer", "location": "Remote", "live": false }`. |
| `GET` | `/api/jobs` | List saved jobs. Optional `?status=approved`. |
| `PATCH` | `/api/jobs/:id/status` | Set `found`, `approved`, `applied`, `rejected`, or `failed`. |
| `POST` | `/api/jobs/:id/rescore` | Rescore a job against the latest resume. |
| `POST` | `/api/applications/:jobId/apply` | Run guarded automation. Requires approved job and `{ "confirm": true }`. |
| `GET` | `/api/dashboard` | Dashboard counts. |

## Data storage

- SQLite database: `data/job-agent.sqlite`.
- Temporary uploads: `uploads/` and removed after parsing.
- Both runtime paths are ignored by git.

## Extending job-board integrations

The current implementation provides a safe demo search mode and a Playwright live-discovery scaffold in `server/services/jobSearch.js`. Before adding automated scraping or submission for any third-party board, review that site's terms, robots policies, authentication requirements, and anti-abuse expectations. Prefer official APIs or user-exported data where available.

## Safety guarantees

- Jobs start in `found` status.
- The backend only runs automation for jobs in `approved` status.
- The apply endpoint requires `confirm: true`.
- The Playwright service logs its actions and intentionally stops before final submission.
- The UI communicates that approval and confirmation are required.
