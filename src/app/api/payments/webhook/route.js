import crypto from 'crypto';
import { finalizePayment } from '@/lib/payments';

// MarzPay webhook. Signature = HMAC-SHA256 of "{timestamp}.{rawBody}" with the
// API secret, sent as "t={timestamp},v1={hex}" in X-MarzPay-Signature.
// Processing is idempotent (see finalizePayment).
export async function POST(req) {
  const rawBody = await req.text();
  const secret = process.env.MARZ_API_SECRET;
  const header = req.headers.get('x-marzpay-signature') || '';
  const match = header.match(/t=(\d+),v1=([0-9a-f]+)/);

  if (!secret || !match) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const expected = crypto.createHmac('sha256', secret).update(`${match[1]}.${rawBody}`).digest('hex');
  const a = Buffer.from(match[2]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let event;
  try { event = JSON.parse(rawBody); } catch { return Response.json({ error: 'Invalid payload' }, { status: 400 }); }

  if (event.event_type === 'collection.completed' && event.transaction?.status === 'completed') {
    try {
      await finalizePayment({ tx_ref: event.transaction.reference });
    } catch {
      // Return 200 anyway; the customer-facing status check can complete it.
    }
  }
  return Response.json({ ok: true });
}
