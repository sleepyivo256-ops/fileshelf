import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const CATEGORIES = ['Books', 'Courses', 'Notes', 'Templates'];

const COVER_STYLES = {
  Books: { bg1: '#06263D', bg2: '#0B3A5C', accent: '#00BFAF', label: 'EBOOK' },
  Courses: { bg1: '#00BFAF', bg2: '#008C80', accent: '#FFFFFF', label: 'COURSE' },
  Notes: { bg1: '#0B3A5C', bg2: '#06263D', accent: '#00BFAF', label: 'NOTES' },
  Templates: { bg1: '#0E4D64', bg2: '#06263D', accent: '#00BFAF', label: 'TEMPLATE' },
};

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

function coverSvg({ title, category }) {
  const s = COVER_STYLES[category] || COVER_STYLES.Books;
  const lines = [];
  const words = title.split(' ');
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > 16) { lines.push(line.trim()); line = w; }
    else line += ' ' + w;
  }
  if (line.trim()) lines.push(line.trim());
  const text = lines.slice(0, 3).map((l, i) =>
    `<text x="60" y="${560 + i * 58}" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="700" fill="#FFFFFF">${escapeXml(l)}</text>`
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${s.bg1}"/><stop offset="1" stop-color="${s.bg2}"/>
  </linearGradient></defs>
  <rect width="600" height="800" rx="24" fill="url(#g)"/>
  <rect x="60" y="80" width="90" height="10" rx="5" fill="${s.accent}"/>
  <text x="60" y="140" font-family="Arial, Helvetica, sans-serif" font-size="26" letter-spacing="6" font-weight="700" fill="${s.accent}">${s.label}</text>
  ${text}
  <text x="60" y="740" font-family="Arial, Helvetica, sans-serif" font-size="24" letter-spacing="4" fill="#FFFFFF" opacity="0.7">FILESHELF</text>
</svg>`;
}

const DEMO_PRODUCTS = [
  { title: 'Atomic Habits Summary Guide', category: 'Books', price_ugx: 12000, file_format: 'PDF', description: 'A practical chapter-by-chapter summary of Atomic Habits with actionable worksheets to build better habits and break bad ones.' },
  { title: 'Digital Marketing Masterclass', category: 'Courses', price_ugx: 25000, file_format: 'ZIP', description: 'Full video course: social media marketing, SEO, email funnels and paid ads. Includes slides and templates.' },
  { title: 'Professional CV Template Pack', category: 'Templates', price_ugx: 8000, file_format: 'DOCX', description: 'ATS-friendly CV and cover letter templates in editable Word format, with a guide to writing winning applications.' },
  { title: 'Study Notes Bundle - Biology', category: 'Notes', price_ugx: 10000, file_format: 'PDF', description: 'Comprehensive, exam-focused Biology notes covering the full syllabus with diagrams and practice questions.' },
  { title: 'Small Business Plan Toolkit', category: 'Templates', price_ugx: 15000, file_format: 'ZIP', description: 'Ready-to-use business plan template, financial projections spreadsheet and investor pitch outline.' },
  { title: 'Personal Finance Handbook', category: 'Books', price_ugx: 10000, file_format: 'PDF', description: 'Learn budgeting, saving and investing basics tailored for East Africa, with printable trackers.' },
  { title: 'Excel for Data Analysis Course', category: 'Courses', price_ugx: 20000, file_format: 'ZIP', description: 'From basics to pivot tables and dashboards. Includes practice datasets and certificate of completion.' },
  { title: 'Research Project Writing Guide', category: 'Notes', price_ugx: 7000, file_format: 'PDF', description: 'Step-by-step guide to writing research proposals, chapters 1-5, with formatting examples and citation styles.' },
];

export function ensureSeed(db) {
  try {
    // Atomic cross-process claim: only one worker/process seeds.
    db.exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)");
    const claim = db.prepare("INSERT OR IGNORE INTO meta (key, value) VALUES ('seed', '1')").run();
    if (claim.changes === 0) return;

    // Admin account
    const email = (process.env.ADMIN_EMAIL || 'admin@fileshelf.ug').toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'fileshelf-admin-2026';
    db.prepare("INSERT OR IGNORE INTO users (email, name, password_hash, role) VALUES (?, 'Store Admin', ?, 'admin')")
      .run(email, bcrypt.hashSync(password, 10));

    // Demo products
    const count = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
    if (count > 0) return;

  const coversDir = path.join(process.cwd(), 'public', 'uploads', 'covers');
  fs.mkdirSync(coversDir, { recursive: true });
  const filesDir = path.join(process.cwd(), 'data', 'files');
  fs.mkdirSync(filesDir, { recursive: true });

  const insert = db.prepare(`INSERT INTO products
    (title, description, category, price_ugx, file_format, cover_path, file_path, file_name, file_size, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`);

  for (const p of DEMO_PRODUCTS) {
    const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const coverName = `${slug}.svg`;
    fs.writeFileSync(path.join(coversDir, coverName), coverSvg(p));
    const fileName = `${slug}.pdf`;
    const filePath = path.join('data', 'files', fileName);
    const content = `FileShelf demo file for: ${p.title}\n\nReplace this with the real product file from the admin dashboard.`;
    fs.writeFileSync(path.join(process.cwd(), filePath), content);
    insert.run(p.title, p.description, p.category, p.price_ugx, p.file_format,
      `/uploads/covers/${coverName}`, filePath, fileName, Buffer.byteLength(content));
  }
  } catch (e) {
    console.error('Seed failed:', e);
  }
}
