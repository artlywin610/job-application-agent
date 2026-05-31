import { chromium } from 'playwright';

export async function applyToApprovedJob(job) {
  if (job.status !== 'approved') {
    throw new Error('Safety guard: job must be explicitly approved before application automation can run.');
  }

  const log = [
    { at: new Date().toISOString(), message: 'Confirmed explicit approval status before launching browser.' }
  ];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    if (job.url) {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      log.push({ at: new Date().toISOString(), message: `Opened ${job.source} job page for user-supervised application.` });
    }

    log.push({
      at: new Date().toISOString(),
      message: 'Stopped before final submission. The platform never clicks submit without a separate user-controlled review step.'
    });
  } finally {
    await browser.close();
  }

  return log;
}
