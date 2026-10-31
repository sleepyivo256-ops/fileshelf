import { queryOne, execute } from '@/lib/db';

// Update the customer email on a paid order so the download link can be sent there.
// The customer provides their email AFTER payment/download.
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }

  const orderCode = String(body.order_code || '').trim();
  const email = String(body.email || '').trim().toLowerCase();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ error: 'Please provide a valid email address.' }, { status: 400 });
  }

  const order = await queryOne('SELECT * FROM orders WHERE order_code = ?', [orderCode]);
  if (!order) return Response.json({ error: 'Order not found.' }, { status: 404 });
  if (order.status !== 'paid') {
    return Response.json({ error: 'Email can only be saved for paid orders.' }, { status: 403 });
  }

  await execute('UPDATE orders SET customer_email = ? WHERE id = ?', [email, order.id]);
  return Response.json({ ok: true, email });
}
