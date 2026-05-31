import fs from 'node:fs/promises';
import pdf from 'pdf-parse';
import docxParser from 'docx-parser';

const skillCatalog = [
  'javascript', 'typescript', 'react', 'node.js', 'node', 'express', 'sqlite', 'postgresql',
  'mongodb', 'python', 'java', 'c++', 'aws', 'azure', 'gcp', 'docker', 'kubernetes',
  'playwright', 'selenium', 'tailwind', 'html', 'css', 'graphql', 'rest', 'machine learning',
  'data analysis', 'sql', 'git', 'ci/cd', 'redux', 'next.js', 'vite', 'linux', 'figma'
];

function unique(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function extractSection(text, names) {
  const sectionNames = ['skills', 'education', 'projects', 'experience', 'certifications', 'summary'];
  for (const name of names) {
    const pattern = new RegExp(`(?:^|\\n)\\s*${name}\\s*[:\\-]?\\s*\\n?([\\s\\S]*?)(?=\\n\\s*(?:${sectionNames.filter((s) => !names.includes(s)).join('|')})\\s*[:\\-]?\\s*\\n|$)`, 'i');
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

export async function extractTextFromResume(file) {
  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    const buffer = await fs.readFile(file.path);
    const result = await pdf(buffer);
    return result.text;
  }

  if (
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.originalname.toLowerCase().endsWith('.docx')
  ) {
    return new Promise((resolve, reject) => {
      docxParser.parseDocx(file.path, (data) => {
        if (!data) reject(new Error('Unable to parse DOCX content'));
        else resolve(data);
      });
    });
  }

  throw new Error('Unsupported resume type. Upload a PDF or DOCX file.');
}

export function parseResumeText(text) {
  const normalized = text.replace(/\r/g, '').replace(/[\t ]+/g, ' ');
  const lower = normalized.toLowerCase();
  const foundSkills = skillCatalog.filter((skill) => lower.includes(skill));
  const skillsSection = extractSection(normalized, ['skills', 'technical skills']);
  const sectionSkills = skillsSection
    .split(/[\n,;•|]/)
    .map((part) => part.replace(/^[\-*]\s*/, '').trim())
    .filter((part) => part.length > 1 && part.length < 40);

  const educationSection = extractSection(normalized, ['education']);
  const education = unique(
    educationSection
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /bachelor|master|ph\.?d|degree|university|college|school|b\.?tech|m\.?tech|b\.?sc|m\.?sc/i.test(line))
  );

  const projectsSection = extractSection(normalized, ['projects', 'project work']);
  const projects = unique(
    projectsSection
      .split('\n')
      .map((line) => line.replace(/^[\-*•]\s*/, '').trim())
      .filter((line) => line.length > 8)
      .slice(0, 12)
  );

  return {
    rawText: normalized.trim(),
    skills: unique([...foundSkills, ...sectionSkills]).slice(0, 80),
    education: education.slice(0, 20),
    projects
  };
}
