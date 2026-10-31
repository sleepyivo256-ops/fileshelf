import { query, execute } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { saveCover, saveProductFile } from '@/lib/uploads';

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const products = await query(`SELECT id, title, description, category, price_ugx, file_format,
      cover_path, file_name, file_size, published, created_at
    FROM products ORDER BY id DESC`);
  return Response.json({ products });
}

export async function POST(req) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData();
  const title = String(form.get('title') || '').trim();
  const description = String(form.get('description') || '').trim();
  const category = String(form.get('category') || '');
  const price = Number(form.get('price_ugx'));
  const fileFormat = String(form.get('file_format') || 'PDF').trim().toUpperCase();
  const published = form.get('published') === '1' ? 1 : 0;
  const cover = form.get('cover');
  const file = form.get('file');

  if (!title || !['Books', 'Courses', 'Notes', 'Templates'].includes(category) ||
      !Number.isFinite(price) || price < 0) {
    return Response.json({ error: 'Title, a valid category and price are required.' }, { status: 400 });
  }
  if (!file || typeof file === 'string' || file.size === 0) {
    return Response.json({ error: 'Please upload the product file.' }, { status: 400 });
  }

  let coverPath = '';
  let saved;
  try {
    coverPath = cover && typeof cover !== 'string' && cover.size > 0 ? await saveCover(cover) : '';
    saved = await saveProductFile(file);
  } catch (e) {
    return Response.json({ error: e.message || 'Upload failed.' }, { status: e.status || 500 });
  }

  const info = await execute(`INSERT INTO products
    (title, description, category, price_ugx, file_format, cover_path, file_path, file_name, file_size, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description, category, Math.round(price), fileFormat, coverPath,
      saved.relPath, saved.fileName, saved.size, published]
  );

  return Response.json({ id: info.lastInsertRowid });
}
