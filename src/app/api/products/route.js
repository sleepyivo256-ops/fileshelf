import { query } from '@/lib/db';

export async function GET() {
  const products = await query(`
    SELECT id, title, description, category, price_ugx, file_format, cover_path
    FROM products WHERE published = 1 ORDER BY created_at DESC, id DESC
  `);
  return Response.json({ products });
}
