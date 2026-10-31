import { queryOne, execute } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { saveCover, saveProductFile, deleteProductFile } from '@/lib/uploads';

export async function PUT(req, { params }) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const product = await queryOne('SELECT * FROM products WHERE id = ?', [Number(id)]);
  if (!product) return Response.json({ error: 'Product not found.' }, { status: 404 });

  const form = await req.formData();
  const title = String(form.get('title') ?? product.title).trim();
  const description = String(form.get('description') ?? product.description).trim();
  const category = String(form.get('category') ?? product.category);
  const price = form.get('price_ugx') !== null ? Number(form.get('price_ugx')) : product.price_ugx;
  const fileFormat = String(form.get('file_format') ?? product.file_format).trim().toUpperCase();
  const published = form.get('published') !== null ? (form.get('published') === '1' ? 1 : 0) : product.published;
  const cover = form.get('cover');
  const file = form.get('file');

  if (!title || !['Books', 'Courses', 'Notes', 'Templates'].includes(category) ||
      !Number.isFinite(price) || price < 0) {
    return Response.json({ error: 'Title, a valid category and price are required.' }, { status: 400 });
  }

  try {
    let coverPath = product.cover_path;
    if (cover && typeof cover !== 'string' && cover.size > 0) {
      coverPath = await saveCover(cover);
    }
    let filePath = product.file_path;
    let fileName = product.file_name;
    let fileSize = product.file_size;
    if (file && typeof file !== 'string' && file.size > 0) {
      const saved = await saveProductFile(file);
      await deleteProductFile(product.file_path);
      filePath = saved.relPath;
      fileName = saved.fileName;
      fileSize = saved.size;
    }

    await execute(`UPDATE products SET title = ?, description = ?, category = ?, price_ugx = ?, file_format = ?,
        cover_path = ?, file_path = ?, file_name = ?, file_size = ?, published = ?, updated_at = datetime('now')
      WHERE id = ?`,
      [title, description, category, Math.round(price), fileFormat,
        coverPath, filePath, fileName, fileSize, published, product.id]
    );
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message || 'Upload failed.' }, { status: e.status || 500 });
  }
}

export async function DELETE(req, { params }) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const product = await queryOne('SELECT * FROM products WHERE id = ?', [Number(id)]);
  if (!product) return Response.json({ error: 'Product not found.' }, { status: 404 });

  const paidOrdersRow = await queryOne("SELECT COUNT(*) AS c FROM orders WHERE product_id = ? AND status = 'paid'", [product.id]);
  const paidOrders = paidOrdersRow?.c || 0;
  if (paidOrders > 0) {
    return Response.json({ error: `This product has ${paidOrders} paid order(s). Unpublish it instead of deleting.` }, { status: 409 });
  }

  await deleteProductFile(product.file_path);
  await execute('DELETE FROM orders WHERE product_id = ?', [product.id]);
  await execute('DELETE FROM products WHERE id = ?', [product.id]);
  return Response.json({ ok: true });
}
