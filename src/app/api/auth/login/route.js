import { queryOne } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return Response.json({ error: 'Incorrect email or password.' }, { status: 401 });
  }
  await createSession(user);
  return Response.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}
