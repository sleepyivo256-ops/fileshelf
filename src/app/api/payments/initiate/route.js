import crypto from 'crypto';
import { queryOne, execute } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { initiateCollection, normalizeUgPhone, marzConfigured } from '@/lib/marzpay';
import { generateOrderCode } from '@/lib/payments';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }

  const productId = Number(body.productId);
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = normalizeUgPhone(body.phone);

  const product = await queryOne('SELECT * FROM products WHERE id = ? AND published = 1', [productId]);
  if (!product) return Response.json({ error: 'Product not found.' }, { status: 404 });
  if (!name || !/^\+256\d{9}$/.test(phone)) {
    return Response.json({ error: 'Please provide your name and a Ugandan phone number (e.g. 0772 123 456).' }, { status: 400 });
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ error: 'Please provide a valid email address.' }, { status: 400 });
  }
  if (!marzConfigured()) {
    return Response.json({ error: 'Payments are not configured yet. Please contact the store owner.' }, { status: 503 });
  }

  const user = await getCurrentUser();
  const orderCode = generateOrderCode();
  const tx_ref = crypto.randomUUID();
  const info = await execute(`INSERT INTO orders
    (order_code, product_id, user_id, customer_name, customer_email, customer_phone, amount_ugx, tx_ref)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [orderCode, product.id, user?.id || null, name, email || '', phone, product.price_ugx, tx_ref]
  );
  const orderId = info.lastInsertRowid;

  try {
    const data = await initiateCollection({
      phone,
      amount: product.price_ugx,
      reference: tx_ref,
      description: `FileShelf: ${product.title}`,
      callbackUrl: `${APP_URL}/api/payments/webhook`,
    });
    await execute('UPDATE orders SET provider_tx = ? WHERE id = ?', [data.transaction.uuid, orderId]);
    return Response.json({ order_code: orderCode });
  } catch (e) {
    await execute("UPDATE orders SET status = 'failed' WHERE id = ?", [orderId]);
    return Response.json({ error: e.message || 'Could not initiate payment. Please try again.' }, { status: 502 });
  }
}
