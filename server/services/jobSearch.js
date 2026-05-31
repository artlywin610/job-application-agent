import { chromium } from 'playwright';
import { extractRequiredSkills, scoreJob } from './matchingEngine.js';

const sources = ['LinkedIn', 'Indeed', 'Internshala', 'Wellfound', 'Naukri'];

const sourceUrls = {
  LinkedIn: 'https://www.linkedin.com/jobs/search/',
  Indeed: 'https://www.indeed.com/jobs',
  Internshala: 'https://internshala.com/internships/',
  Wellfound: 'https://wellfound.com/jobs',
  Naukri: 'https://www.naukri.com/jobs'
};

function buildMockJobs(query, location) {
  const role = query || 'Software Engineer';
  const place = location || 'Remote';
  return sources.flatMap((source, index) => [
    {
      source,
      title: `${role} ${index % 2 === 0 ? 'Intern' : 'Associate'}`,
      company: `${source} Sample Company`,
      location: place,
      url: `${sourceUrls[source]}?sample=${encodeURIComponent(role)}-${index}`,
      description: `${role} opening requiring JavaScript, React, Node.js, SQL, Git, REST APIs, and strong communication. Nice to have Docker and Playwright.`,
      required_skills: ['javascript', 'react', 'node.js', 'sql', 'git', 'rest']
    },
    {
      source,
      title: `Frontend ${role}`,
      company: `${source} Labs`,
      location: place,
      url: `${sourceUrls[source]}?sample=frontend-${encodeURIComponent(role)}-${index}`,
      description: `Frontend role focused on React, TypeScript, Tailwind, HTML, CSS, testing, and accessible user interfaces.`,
      required_skills: ['react', 'typescript', 'tailwind', 'html', 'css']
    }
  ]);
}

export async function searchJobs({ query, location, resume, live = false }) {
  if (!live) {
    return buildMockJobs(query, location).map((job) => ({
      ...job,
      ...scoreJob(resume, job)
    }));
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const discovered = [];

  try {
    for (const source of sources) {
      await page.goto(sourceUrls[source], { waitUntil: 'domcontentloaded', timeout: 30000 });
      discovered.push({
        source,
        title: query || 'Discovered Job',
        company: `${source} listing`,
        location: location || 'See posting',
        url: page.url(),
        description: `Live discovery placeholder from ${source}. Review the job board directly before approving. ${query ?? ''}`,
        required_skills: extractRequiredSkills(query ?? '')
      });
    }
  } finally {
    await browser.close();
  }

  return discovered.map((job) => ({ ...job, ...scoreJob(resume, job) }));
}
