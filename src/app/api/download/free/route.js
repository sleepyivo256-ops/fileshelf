import crypto from 'crypto';
import { queryOne } from '@/lib/db';

// Issues a short-lived signed download URL for a FREE product (no payment required).
// No order is created — the token authorizes a direct download of the product file.
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }

  const productId = Number(body.product_id);
  const product = await queryOne('SELECT * FROM products WHERE id = ? AND published = 1 AND price_ugx = 0', [productId]);
  if (!product) return Response.json({ error: 'Free product not found.' }, { status: 404 });
  if (!product.file_path) return Response.json({ error: 'No file available for this product.' }, { status: 404 });

  const freeToken = signFreeToken(product.id);
  return Response.json({ url: `/api/download/free-file?t=${freeToken}` });
}

function signFreeToken(productId, maxAgeSec = 900) {
  const secret = process.env.APP_SECRET || 'fileshelf-dev-secret-change-me';
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec;
  const payload = `free:${productId}:${exp}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
