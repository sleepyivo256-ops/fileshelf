import { queryOne } from '@/lib/db';
import { finalizePayment } from '@/lib/payments';

// Called by the storefront after the customer approves the payment on their
// phone. Polls MarzPay server-side before confirming the order.
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }

  const orderCode = String(body.order_code || '').trim();
  const order = await queryOne('SELECT * FROM orders WHERE order_code = ?', [orderCode]);
  if (!order) return Response.json({ error: 'Order not found.' }, { status: 404 });

  try {
    const updated = await finalizePayment({ tx_ref: order.tx_ref });
    const product = await queryOne('SELECT title, file_format FROM products WHERE id = ?', [order.product_id]);
    return Response.json({
      order: {
        id: updated.id,
        order_code: updated.order_code,
        status: updated.status,
        amount_ugx: updated.amount_ugx,
        customer_email: updated.customer_email,
      },
      product,
    });
  } catch {
    return Response.json({ order: { order_code: order.order_code, status: order.status }, error: 'Verification failed' }, { status: 502 });
  }
}
