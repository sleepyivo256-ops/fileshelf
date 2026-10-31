'use client';

import { useCallback, useEffect, useState } from 'react';
import { Logo, CloseIcon } from '@/components/icons';

const CATEGORIES = ['Books', 'Courses', 'Notes', 'Templates'];
const FORMATS = ['PDF', 'ZIP', 'DOCX', 'XLSX', 'PPTX', 'EPUB'];
const ugx = (n) => `UGX ${Number(n).toLocaleString('en-US')}`;

export default function AdminPage() {
  const [tab, setTab] = useState('overview');
  return (
    <div className="shell admin-shell">
      <div className="admin-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo size={34} />
          <h1>FileShelf Admin</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>View store</a>
          <button className="btn btn-outline btn-sm" onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/admin/login';
          }}>Sign out</button>
        </div>
      </div>
      <div className="tabs">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Overview</button>
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Products</button>
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>Orders</button>
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'products' && <Products />}
      {tab === 'orders' && <Orders />}
    </div>
  );
}

function Overview() {
  const [data, setData] = useState(null);
  useEffect(() => { fetch('/api/admin/stats').then((r) => r.json()).then(setData); }, []);
  if (!data) return <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  const s = data.stats;
  return (
    <>
      <div className="stat-grid">
        <div className="stat-card"><div className="v teal">{ugx(s.revenue)}</div><div className="l">Total revenue</div></div>
        <div className="stat-card"><div className="v">{s.paidOrders}</div><div className="l">Paid orders</div></div>
        <div className="stat-card"><div className="v">{s.totalDownloads}</div><div className="l">Downloads</div></div>
        <div className="stat-card"><div className="v">{s.publishedProducts}/{s.totalProducts}</div><div className="l">Products live</div></div>
      </div>
      <h3 style={{ margin: '4px 0 10px', color: 'var(--navy)' }}>Recent orders</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Order</th><th>Product</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {data.recentOrders.map((o) => (
              <tr key={o.id}>
                <td>{o.order_code}</td>
                <td>{o.title}</td>
                <td>{o.customer_name}<br /><span style={{ color: 'var(--muted)', fontSize: 12 }}>{o.customer_email}</span></td>
                <td>{ugx(o.amount_ugx)}</td>
                <td><span className={`status ${o.status}`}>{o.status}</span></td>
              </tr>
            ))}
            {data.recentOrders.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)' }}>No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Products() {
  const [products, setProducts] = useState(null);
  const [editing, setEditing] = useState(null); // {} for new, product for edit
  const [error, setError] = useState('');

  const load = useCallback(() => {
    fetch('/api/admin/products').then((r) => r.json()).then((d) => setProducts(d.products || []));
  }, []);
  useEffect(load, [load]);

  const togglePublished = async (p) => {
    const form = new FormData();
    form.set('published', p.published ? '0' : '1');
    await fetch(`/api/admin/products/${p.id}`, { method: 'PUT', body: form });
    load();
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Delete failed.'); return; }
    setError('');
    load();
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn" onClick={() => setEditing({})}>+ Add Product</button>
      </div>
      {error && <div className="form-error">{error}</div>}
      {!products ? <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>File</th><th>Live</th><th>Actions</th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="admin-prod">
                      {p.cover_path ? <img src={p.cover_path} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : <div style={{ width: 40, height: 50, borderRadius: 8, background: 'var(--chip-bg)' }} />}
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{p.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.file_format}</div>
                      </div>
                    </div>
                  </td>
                  <td>{p.category}</td>
                  <td>{ugx(p.price_ugx)}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{p.file_name || '—'}</td>
                  <td><button className={`toggle ${p.published ? 'on' : ''}`} onClick={() => togglePublished(p)} aria-label="Toggle published" /></td>
                  <td>
                    <div className="row-actions">
                      <button className="mini-btn" onClick={() => setEditing(p)}>Edit</button>
                      <button className="mini-btn danger" onClick={() => remove(p)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <ProductForm product={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}

function ProductForm({ product, onClose, onSaved }) {
  const isNew = !product;
  const [form, setForm] = useState({
    title: product?.title || '',
    description: product?.description || '',
    category: product?.category || 'Books',
    price_ugx: product?.price_ugx ?? '',
    file_format: product?.file_format || 'PDF',
    published: product?.published ?? 1,
  });
  const [cover, setCover] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (isNew && !file) { setError('Please upload the product file.'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.set(k, String(v)));
      fd.set('published', form.published ? '1' : '0');
      if (cover) fd.set('cover', cover);
      if (file) fd.set('file', file);
      const res = await fetch(isNew ? '/api/admin/products' : `/api/admin/products/${product.id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Save failed.'); setBusy(false); return; }
      onSaved();
    } catch {
      setError('Network error. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 560 }}>
        <button className="modal-close" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        <h3>{isNew ? 'Add product' : 'Edit product'}</h3>
        <p className="form-note" style={{ textAlign: 'left', margin: '2px 0 16px' }}>
          Fields left unchanged on edit keep their current values.
        </p>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="pf-title">Title</label>
            <input id="pf-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="pf-desc">Description</label>
            <textarea id="pf-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label htmlFor="pf-cat">Category</label>
              <select id="pf-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pf-price">Price (UGX)</label>
              <input id="pf-price" type="number" min="0" step="1" required value={form.price_ugx}
                onChange={(e) => setForm({ ...form, price_ugx: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label htmlFor="pf-fmt">File format</label>
              <select id="pf-fmt" value={form.file_format} onChange={(e) => setForm({ ...form, file_format: e.target.value })}>
                {FORMATS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Published</label>
              <button type="button" className={`toggle ${form.published ? 'on' : ''}`} style={{ marginTop: 10 }}
                onClick={() => setForm({ ...form, published: form.published ? 0 : 1 })} aria-label="Toggle published" />
            </div>
          </div>
          <div className="field">
            <label>Cover image {isNew ? '(optional)' : '(leave empty to keep current)'}</label>
            <label className="file-drop">
              <input type="file" accept=".png,.jpg,.jpeg,.webp,.svg" onChange={(e) => setCover(e.target.files[0] || null)} />
              {cover ? <strong>{cover.name}</strong> : <>Click to choose an image — <strong>PNG, JPG or SVG</strong></>}
            </label>
          </div>
          <div className="field">
            <label>Product file {isNew ? '' : '(leave empty to keep current)'} — PDF, ZIP, DOCX, XLSX, PPTX, EPUB, TXT (max 200 MB)</label>
            <label className="file-drop">
              <input type="file" accept=".pdf,.zip,.docx,.doc,.xlsx,.pptx,.epub,.txt" onChange={(e) => setFile(e.target.files[0] || null)} />
              {file ? <strong>{file.name}</strong> : <>Click to choose the file customers will download</>}
            </label>
          </div>
          <button className="btn btn-block" disabled={busy}>{busy ? 'Saving...' : isNew ? 'Create product' : 'Save changes'}</button>
        </form>
      </div>
    </div>
  );
}

function Orders() {
  const [orders, setOrders] = useState(null);
  useEffect(() => { fetch('/api/admin/orders').then((r) => r.json()).then((d) => setOrders(d.orders || [])); }, []);
  if (!orders) return <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Order</th><th>Product</th><th>Customer</th><th>Amount</th><th>Status</th><th>Downloads</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{o.order_code}<br /><span style={{ color: 'var(--muted)', fontSize: 12 }}>{o.created_at}</span></td>
              <td>{o.product_title}</td>
              <td>{o.customer_name}<br /><span style={{ color: 'var(--muted)', fontSize: 12 }}>{o.customer_email} · {o.customer_phone}</span></td>
              <td>{ugx(o.amount_ugx)}</td>
              <td><span className={`status ${o.status}`}>{o.status}</span></td>
              <td>{o.download_count}</td>
            </tr>
          ))}
          {orders.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)' }}>No orders yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
