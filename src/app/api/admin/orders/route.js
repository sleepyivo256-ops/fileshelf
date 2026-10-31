import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const orders = await query(`SELECT o.id, o.order_code, o.customer_name, o.customer_email, o.customer_phone,
      o.amount_ugx, o.status, o.tx_ref, o.created_at, o.paid_at, p.title AS product_title,
      (SELECT COUNT(*) FROM downloads d WHERE d.order_id = o.id) AS download_count
    FROM orders o JOIN products p ON p.id = o.product_id
    ORDER BY o.id DESC LIMIT 200`);
  return Response.json({ orders });
}
