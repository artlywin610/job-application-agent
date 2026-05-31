const aliases = new Map([
  ['node', 'node.js'],
  ['nodejs', 'node.js'],
  ['js', 'javascript'],
  ['ts', 'typescript'],
  ['postgres', 'postgresql'],
  ['k8s', 'kubernetes']
]);

function normalizeSkill(skill) {
  const normalized = skill.toLowerCase().replace(/[^a-z0-9+#.]/g, '').trim();
  return aliases.get(normalized) ?? normalized;
}

export function extractRequiredSkills(description) {
  const catalog = [
    'javascript', 'typescript', 'react', 'node.js', 'express', 'sqlite', 'postgresql', 'mongodb',
    'python', 'java', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'playwright', 'selenium',
    'tailwind', 'html', 'css', 'graphql', 'rest', 'machine learning', 'data analysis', 'sql',
    'git', 'ci/cd', 'redux', 'next.js', 'vite', 'linux'
  ];
  const text = description.toLowerCase();
  return catalog.filter((skill) => text.includes(skill));
}

export function scoreJob(resume, job) {
  const resumeSkills = new Set((resume?.skills ?? []).map(normalizeSkill));
  const required = (job.required_skills?.length ? job.required_skills : extractRequiredSkills(job.description)).map(normalizeSkill);
  const uniqueRequired = [...new Set(required)];

  if (!resumeSkills.size || !uniqueRequired.length) {
    return {
      score: resumeSkills.size ? 45 : 0,
      missingSkills: uniqueRequired,
      explanation: resumeSkills.size
        ? 'No explicit required skills were detected, so this job receives a neutral discovery score.'
        : 'Upload a resume before scoring jobs.'
    };
  }

  const matched = uniqueRequired.filter((skill) => resumeSkills.has(skill));
  const missingSkills = uniqueRequired.filter((skill) => !resumeSkills.has(skill));
  const skillScore = Math.round((matched.length / uniqueRequired.length) * 85);
  const keywordBonus = ['intern', 'junior', 'remote', 'entry'].some((word) => job.description.toLowerCase().includes(word)) ? 5 : 0;
  const score = Math.min(100, skillScore + keywordBonus + 10);

  return {
    score,
    missingSkills,
    explanation: `Matched ${matched.length} of ${uniqueRequired.length} detected requirements${matched.length ? ` (${matched.join(', ')})` : ''}. ${missingSkills.length ? `Missing: ${missingSkills.join(', ')}.` : 'No required skills appear to be missing.'}`
  };
}
