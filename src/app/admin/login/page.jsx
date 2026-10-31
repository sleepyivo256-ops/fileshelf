'use client';

import { useState } from 'react';
import { Logo } from '@/components/icons';

export default function AdminLoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed.'); setBusy(false); return; }
      if (data.user.role !== 'admin') {
        await fetch('/api/auth/logout', { method: 'POST' });
        setError('This account does not have admin access.');
        setBusy(false);
        return;
      }
      window.location.href = '/admin';
    } catch {
      setError('Network error. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="shell">
      <div className="login-card">
        <Logo size={44} />
        <h1>Admin Dashboard</h1>
        <p>Sign in with your admin account to manage products, orders and sales.</p>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="ad-email">Email</label>
            <input id="ad-email" type="email" required autoComplete="username"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="ad-pass">Password</label>
            <input id="ad-pass" type="password" required autoComplete="current-password"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="btn btn-block" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
        </form>
        <p className="form-note"><a href="/" style={{ color: 'var(--teal-dark)', fontWeight: 700, textDecoration: 'none' }}>← Back to store</a></p>
      </div>
    </div>
  );
}
