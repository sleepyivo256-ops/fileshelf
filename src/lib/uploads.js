import path from 'path';
import crypto from 'crypto';
import { putObject, deleteObject } from './storage';

const ALLOWED_EXT = ['.pdf', '.zip', '.docx', '.doc', '.xlsx', '.pptx', '.epub', '.txt'];
const COVER_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
const MAX_FILE = 200 * 1024 * 1024; // 200 MB
const MAX_COVER = 5 * 1024 * 1024;

const MIME_MAP = {
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.epub': 'application/epub+zip',
  '.txt': 'text/plain',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function extOf(name) {
  return path.extname(name || '').toLowerCase();
}

// Paid product files are stored in R2 (or local data/files) and
// are only streamed by /api/download after purchase.
export async function saveProductFile(file) {
  if (file.size > MAX_FILE) throw Object.assign(new Error('File too large (max 200 MB).'), { status: 400 });
  const ext = extOf(file.name);
  if (!ALLOWED_EXT.includes(ext)) {
    throw Object.assign(new Error(`Unsupported file type "${ext || 'unknown'}". Allowed: ${ALLOWED_EXT.join(', ')}`), { status: 400 });
  }

  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const key = `files/${name}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = MIME_MAP[ext] || 'application/octet-stream';

  await putObject(key, buffer, mime);
  return { relPath: key, fileName: file.name, size: buffer.length };
}

export async function saveCover(file) {
  if (file.size > MAX_COVER) throw Object.assign(new Error('Cover image too large (max 5 MB).'), { status: 400 });
  const ext = extOf(file.name);
  if (!COVER_EXT.includes(ext)) {
    throw Object.assign(new Error('Cover must be a PNG, JPG, WEBP or SVG image.'), { status: 400 });
  }

  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const key = `covers/${name}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = MIME_MAP[ext] || 'image/jpeg';

  await putObject(key, buffer, mime);
  return `/uploads/covers/${name}`;
}

export async function deleteProductFile(relPath) {
  if (!relPath) return;
  await deleteObject(relPath);
}
