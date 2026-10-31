import { query, queryOne } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const revRow = await queryOne("SELECT COALESCE(SUM(amount_ugx),0) AS v FROM orders WHERE status = 'paid'");
  const revenue = revRow?.v || 0;

  const paidRow = await queryOne("SELECT COUNT(*) AS c FROM orders WHERE status = 'paid'");
  const paidOrders = paidRow?.c || 0;

  const pendingRow = await queryOne("SELECT COUNT(*) AS c FROM orders WHERE status = 'pending'");
  const pendingOrders = pendingRow?.c || 0;

  const totalProdRow = await queryOne('SELECT COUNT(*) AS c FROM products');
  const totalProducts = totalProdRow?.c || 0;

  const pubProdRow = await queryOne('SELECT COUNT(*) AS c FROM products WHERE published = 1');
  const publishedProducts = pubProdRow?.c || 0;

  const totalDlRow = await queryOne('SELECT COUNT(*) AS c FROM downloads');
  const totalDownloads = totalDlRow?.c || 0;

  const custRow = await queryOne("SELECT COUNT(*) AS c FROM users WHERE role = 'customer'");
  const customers = custRow?.c || 0;

  const recentOrders = await query(`SELECT o.id, o.order_code, o.customer_name, o.customer_email, o.amount_ugx,
      o.status, o.created_at, p.title
    FROM orders o JOIN products p ON p.id = o.product_id
    ORDER BY o.id DESC LIMIT 10`);

  const topProducts = await query(`SELECT p.id, p.title, p.category, p.price_ugx,
      SUM(CASE WHEN o.status = 'paid' THEN 1 ELSE 0 END) AS sales,
      COUNT(o.id) AS orders
    FROM products p LEFT JOIN orders o ON o.product_id = p.id
    GROUP BY p.id ORDER BY sales DESC, p.id DESC LIMIT 8`);

  return Response.json({
    stats: { revenue, paidOrders, pendingOrders, totalProducts, publishedProducts, totalDownloads, customers },
    recentOrders,
    topProducts,
  });
}
