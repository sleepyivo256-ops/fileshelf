import { queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { signDownloadToken } from '@/lib/signing';

// Issues a short-lived signed download URL for a PAID order.
// Authorized if: session user owns the order, or the provided email matches.
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }

  const orderId = Number(body.order_id);
  const email = String(body.email || '').trim().toLowerCase();
  const order = await queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order || order.status !== 'paid') {
    return Response.json({ error: 'Download not available for this order.' }, { status: 403 });
  }

  const user = await getCurrentUser();
  const owns = (user && (order.user_id === user.id || order.customer_email === user.email)) ||
    (email && email === order.customer_email);
  if (!owns) {
    return Response.json({ error: 'Please sign in or use the email you paid with.' }, { status: 403 });
  }

  const token = signDownloadToken(order.id);
  return Response.json({ url: `/api/download?t=${token}` });
}
