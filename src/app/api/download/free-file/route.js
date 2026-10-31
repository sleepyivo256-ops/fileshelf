import path from 'path';
import crypto from 'crypto';
import { queryOne } from '@/lib/db';
import { getObject } from '@/lib/storage';

// Streams a free product file using a short-lived signed token issued by
// /api/download/free. No payment or order is required.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('t');
  if (!token) return Response.json({ error: 'Invalid or expired download link.' }, { status: 403 });

  const productId = verifyFreeToken(token);
  if (!productId) return Response.json({ error: 'Invalid or expired download link.' }, { status: 403 });

  const product = await queryOne('SELECT * FROM products WHERE id = ? AND published = 1 AND price_ugx = 0', [productId]);
  if (!product?.file_path) return Response.json({ error: 'File unavailable.' }, { status: 404 });

  const fileData = await getObject(product.file_path);
  if (!fileData) return Response.json({ error: 'File unavailable.' }, { status: 404 });

  const ext = path.extname(product.file_name || product.file_path).toLowerCase();
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
  return new Response(fileData.body, {
    headers: {
      'Content-Type': fileData.contentType || MIME[ext] || 'application/octet-stream',
      'Content-Length': String(fileData.size),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(product.file_name || 'download')}"`,
      'Cache-Control': 'no-store',
    },
  });
}

function verifyFreeToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [prefix, productId, exp, sig] = parts;
  if (prefix !== 'free') return null;
  const secret = process.env.APP_SECRET || 'fileshelf-dev-secret-change-me';
  const payload = `${prefix}:${productId}:${exp}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return null;
  return Number(productId);
}
