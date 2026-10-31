import path from 'path';
import { queryOne, execute } from '@/lib/db';
import { getObject } from '@/lib/storage';
import { verifyDownloadToken } from '@/lib/signing';

const MIME = {
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.epub': 'application/epub+zip',
  '.txt': 'text/plain',
};

// Streams a paid product file. Only reachable with a valid short-lived
// signed token issued by /api/download/issue after purchase authorization.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const orderId = verifyDownloadToken(searchParams.get('t'));
  if (!orderId) return Response.json({ error: 'Invalid or expired download link.' }, { status: 403 });

  const order = await queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order || order.status !== 'paid') {
    return Response.json({ error: 'Order is not paid.' }, { status: 403 });
  }

  const product = await queryOne('SELECT * FROM products WHERE id = ?', [order.product_id]);
  if (!product?.file_path) return Response.json({ error: 'File unavailable.' }, { status: 404 });

  const fileData = await getObject(product.file_path);
  if (!fileData) return Response.json({ error: 'File unavailable.' }, { status: 404 });

  await execute('INSERT INTO downloads (order_id) VALUES (?)', [order.id]);

  const ext = path.extname(product.file_name || product.file_path).toLowerCase();
  return new Response(fileData.body, {
    headers: {
      'Content-Type': fileData.contentType || MIME[ext] || 'application/octet-stream',
      'Content-Length': String(fileData.size),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(product.file_name || 'download')}"`,
      'Cache-Control': 'no-store',
    },
  });
}
