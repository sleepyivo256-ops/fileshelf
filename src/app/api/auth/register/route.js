import { queryOne, execute } from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid name and email.' }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return Response.json({ error: 'An account with this email already exists.' }, { status: 409 });
  }

  const hash = await hashPassword(password);
  const info = await execute("INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, 'customer')", [email, name, hash]);
  const user = { id: info.lastInsertRowid, email, name, role: 'customer' };
  await createSession(user);
  return Response.json({ user });
}
