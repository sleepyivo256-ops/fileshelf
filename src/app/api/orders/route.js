import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// A customer's orders: by session account, or by email for guests.
export async function GET(req) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get('email') || '').trim().toLowerCase();

  let orders;
  if (user) {
    orders = await query(`SELECT o.id, o.order_code, o.status, o.amount_ugx, o.created_at, o.customer_email,
        p.title, p.file_format, p.cover_path
      FROM orders o JOIN products p ON p.id = o.product_id
      WHERE o.user_id = ? OR o.customer_email = ?
      ORDER BY o.id DESC`, [user.id, user.email]);
  } else if (email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    orders = await query(`SELECT o.id, o.order_code, o.status, o.amount_ugx, o.created_at, o.customer_email,
        p.title, p.file_format, p.cover_path
      FROM orders o JOIN products p ON p.id = o.product_id
      WHERE o.customer_email = ? ORDER BY o.id DESC`, [email]);
  } else {
    return Response.json({ error: 'Sign in or provide an email to view orders.' }, { status: 401 });
  }
  return Response.json({ orders });
}
