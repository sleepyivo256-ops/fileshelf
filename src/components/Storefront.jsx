'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Logo, SearchIcon, UserIcon, MenuIcon, CloseIcon, CartIcon, CheckIcon, ArrowRight,
  DownloadIcon, SunIcon, MoonIcon, CATEGORY_ICONS,
} from './icons';

const CATEGORIES = ['Books', 'Courses', 'Notes', 'Templates'];
const PAGE_SIZE = 8;
const ugx = (n) => `UGX ${Number(n).toLocaleString('en-US')}`;

export default function Storefront() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState(null); // {type, product?, order?, result?}
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === 'dark');
  }, []);
  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark';
    setDark(!dark);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('fs_theme', next); } catch {}
  };

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  }, []);

  useEffect(() => {
    fetch('/api/products').then((r) => r.json()).then((d) => {
      setProducts(d.products || []);
      setLoading(false);
    }).catch(() => setLoading(false));
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user)).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const inCat = category === 'All' || p.category === category;
      const inQuery = !q || `${p.title} ${p.description} ${p.category}`.toLowerCase().includes(q);
      return inCat && inQuery;
    });
  }, [products, search, category]);

  const shown = filtered.slice(0, visible);

  const openProduct = (p) => setModal({ type: 'product', product: p });
  const buyNow = (p) => setModal({ type: 'checkout', product: p });
  const closeModal = () => setModal(null);

  const afterAuth = (u) => { setUser(u); setModal({ type: 'orders' }); };
  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setMenuOpen(false);
    showToast('Signed out.');
  };

  const guestEmail = () => (typeof window !== 'undefined' && localStorage.getItem('fs_email')) || '';

  return (
    <>
      <header className="header">
        <div className="shell header-inner">
          <a href="#" className="brand" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <Logo />
            <div className="brand-text">
              <div className="brand-name">File<span>Shelf</span></div>
              <div className="brand-motto">Digital Solutions for Everyday Life</div>
            </div>
          </a>
          <div className="header-actions">
            <button className="icon-btn" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme}>
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button className="icon-btn" aria-label="My orders" onClick={() => setModal({ type: 'orders' })}>
              <CartIcon />
            </button>
            <button className="icon-btn" aria-label="Account menu" onClick={() => setMenuOpen((v) => !v)}>
              <MenuIcon />
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="menu-pop" onMouseLeave={() => setMenuOpen(false)}>
            {user && <div className="menu-email">Signed in as<br /><strong>{user.email}</strong></div>}
            <button onClick={() => { setMenuOpen(false); setModal({ type: 'orders' }); }}>
              <CartIcon /> My Orders & Downloads
            </button>
            {user ? (
              <button onClick={signOut}><UserIcon /> Sign out</button>
            ) : (
              <button onClick={() => { setMenuOpen(false); setModal({ type: 'auth' }); }}>
                <UserIcon /> Sign in / Create account
              </button>
            )}
            {user?.role === 'admin' && (
              <a href="/admin"><TemplateIconSmall /> Admin Dashboard</a>
            )}
          </div>
        )}
      </header>

      <main className="shell">
        <div className="search-wrap">
          <div className="search">
            <SearchIcon />
            <input
              type="search"
              placeholder="Search digital resources..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisible(PAGE_SIZE); }}
              aria-label="Search digital resources"
            />
          </div>
        </div>

        <section className="hero">
          <div className="hero-eyebrow">FILE SHELF</div>
          <h1>Real Solutions.<br /><span className="accent">Digital Resources.</span></h1>
          <p>Practical resources for work, business, learning and everyday life — all in one place.</p>
          <button className="btn" onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}>
            Shop Now <ArrowRight />
          </button>
        </section>

        <div className="cats" role="tablist" aria-label="Categories">
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c];
            return (
              <button
                key={c}
                role="tab"
                aria-selected={category === c}
                className={`cat ${category === c ? 'active' : ''}`}
                onClick={() => { setCategory(category === c ? 'All' : c); setVisible(PAGE_SIZE); }}
              >
                <Icon /><span>{c}</span>
              </button>
            );
          })}
        </div>

        <section id="products">
          <div className="section-head">
            <h2>Explore Resources</h2>
          </div>
          {loading ? (
            <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : shown.length === 0 ? (
            <div className="empty">No resources match your search.</div>
          ) : (
            <div className="grid">
              {shown.map((p) => (
                <article key={p.id} className="card" onClick={() => openProduct(p)}>
                  <div className="card-cover">
                    {p.cover_path ? (
                      <img src={p.cover_path} alt={p.title} loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--teal)' }}>
                        {(() => { const I = CATEGORY_ICONS[p.category] || CATEGORY_ICONS.Books; return <I size={44} />; })()}
                      </div>
                    )}
                  </div>
                  <div className="card-body">
                    <div className="card-title">{p.title}</div>
                    <div className="card-cat">{p.category} · {p.file_format}</div>
                    <div className="card-price">{ugx(p.price_ugx)}</div>
                    <button className="btn" onClick={(e) => { e.stopPropagation(); p.price_ugx === 0 ? handleFreeDownload(p, showToast) : buyNow(p); }}>
                      {p.price_ugx === 0 ? 'Download' : 'Buy Now'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          {filtered.length > visible && (
            <div className="load-more">
              <button className="btn btn-outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Load More ({filtered.length - visible} left)
              </button>
            </div>
          )}
        </section>

        <footer className="footer">© 2026 FileShelf. All rights reserved.</footer>
      </main>

      {modal?.type === 'product' && (
        <Modal onClose={closeModal}>
          <div className="pd-cover">
            {modal.product.cover_path && (
              <img src={modal.product.cover_path} alt={modal.product.title}
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            )}
          </div>
          <h3>{modal.product.title}</h3>
          <div className="pd-meta">
            <span className="chip">{modal.product.category}</span>
            <span className="chip navy">{modal.product.file_format} file</span>
          </div>
          <p className="pd-desc">{modal.product.description || 'A practical digital resource from FileShelf.'}</p>
          <div className="pd-price">{ugx(modal.product.price_ugx)}</div>
          {modal.product.price_ugx === 0 ? (
            <button className="btn btn-block" onClick={() => handleFreeDownload(modal.product, showToast)}>
              Download now <ArrowRight />
            </button>
          ) : (
            <button className="btn btn-block" onClick={() => buyNow(modal.product)}>Buy Now <ArrowRight /></button>
          )}
          <p className="form-note">{modal.product.price_ugx === 0 ? 'Free resource — download instantly.' : 'Pay securely with MTN MoMo or Airtel Money. Download instantly after payment.'}</p>
        </Modal>
      )}

      {modal?.type === 'checkout' && (
        <CheckoutModal
          product={modal.product}
          user={user}
          guestEmail={guestEmail()}
          onClose={closeModal}
          onInitiated={(orderCode) => setModal({ type: 'approve', product: modal.product, order_code: orderCode })}
          onError={showToast}
        />
      )}

      {modal?.type === 'approve' && (
        <ApproveModal
          product={modal.product}
          order_code={modal.order_code}
          onClose={closeModal}
          onResolved={(result) => setModal({ type: 'payment', result })}
          onError={showToast}
        />
      )}

      {modal?.type === 'free-download' && (
        <FreeDownloadModal product={modal.product} onClose={closeModal} />
      )}

      {modal?.type === 'auth' && (
        <AuthModal onClose={closeModal} onAuth={afterAuth} onError={showToast} />
      )}

      {modal?.type === 'orders' && (
        <OrdersModal user={user} guestEmail={guestEmail()} onClose={closeModal}
          onRequireAuth={() => setModal({ type: 'auth' })} onError={showToast} />
      )}

      {modal?.type === 'verifying' && (
        <Modal onClose={closeModal}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 14px' }} />
            <p>Verifying your payment...</p>
          </div>
        </Modal>
      )}

      {modal?.type === 'payment' && (
        <PaymentResultModal
          result={modal.result}
          user={user}
          guestEmail={guestEmail()}
          onClose={closeModal}
          onError={showToast}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function TemplateIconSmall() {
  const I = CATEGORY_ICONS.Templates;
  return <I size={18} />;
}

function Modal({ children, onClose }) {
  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        {children}
      </div>
    </div>
  );
}

function CheckoutModal({ product, user, guestEmail, onClose, onInitiated, onError }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || guestEmail || '',
    phone: '',
  });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not start payment.'); setBusy(false); return; }
      onInitiated(data.order_code);
    } catch {
      setError('Network error. Please try again.');
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h3>Checkout</h3>
      <p className="form-note" style={{ textAlign: 'left', margin: '2px 0 16px' }}>
        {product.title} — <strong style={{ color: 'var(--teal)' }}>{ugx(product.price_ugx)}</strong>
      </p>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="co-name">Full name</label>
          <input id="co-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="co-phone">Mobile money phone number</label>
          <input id="co-phone" type="tel" required placeholder="e.g. 0772 123 456"
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <button className="btn btn-block" disabled={busy}>
          {busy ? 'Sending payment request...' : `Pay ${ugx(product.price_ugx)}`}
        </button>
        <p className="form-note">You will receive a prompt on your phone to approve the payment.</p>
      </form>
    </Modal>
  );
}

function ApproveModal({ product, order_code, onClose, onResolved, onError }) {
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState('');

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_code }),
      });
      const data = await res.json();
      if (data.order && (data.order.status === 'paid' || data.order.status === 'failed')) {
        onResolved(data);
        return;
      }
      setNote('Not confirmed yet. Approve the request on your phone, then check again.');
    } catch {
      onError('Network error. Please try again.');
    }
    setChecking(false);
  }, [order_code, onResolved, onError]);

  useEffect(() => {
    const first = setTimeout(check, 4000);
    const poll = setInterval(check, 8000);
    return () => { clearTimeout(first); clearInterval(poll); };
  }, [check]);

  return (
    <Modal onClose={onClose}>
      <h3>Approve payment</h3>
      <p className="form-note" style={{ textAlign: 'left', margin: '4px 0 16px' }}>
        A payment request of <strong style={{ color: 'var(--teal)' }}>{ugx(product.price_ugx)}</strong> for{' '}
        <strong>{product.title}</strong> has been sent to your phone.
        Enter your mobile money PIN to approve it.
      </p>
      <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
      </div>
      {note && <div className="form-error" style={{ background: '#fef3c7', color: '#92400e' }}>{note}</div>}
      <button className="btn btn-block" onClick={check} disabled={checking}>
        {checking ? 'Checking...' : 'I have approved — check status'}
      </button>
      <p className="form-note">Order {order_code}. This page updates automatically.</p>
    </Modal>
  );
}

function AuthModal({ onClose, onAuth, onError }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); setBusy(false); return; }
      onAuth(data.user);
    } catch {
      setError('Network error. Please try again.');
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h3>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h3>
      <p className="form-note" style={{ textAlign: 'left', margin: '2px 0 16px' }}>
        Track orders and access your downloads anytime.
      </p>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={submit}>
        {mode === 'register' && (
          <div className="field">
            <label htmlFor="au-name">Full name</label>
            <input id="au-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
        )}
        <div className="field">
          <label htmlFor="au-email">Email</label>
          <input id="au-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="au-pass">Password</label>
          <input id="au-pass" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="btn btn-block" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <p className="form-note">
          {mode === 'login' ? 'New here?' : 'Already have an account?'}{' '}
          <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </form>
    </Modal>
  );
}

async function requestDownload(order, email, onError) {
  const res = await fetch('/api/download/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: order.id, email }),
  });
  const data = await res.json();
  if (!res.ok) { onError(data.error || 'Download failed.'); return; }
  const a = document.createElement('a');
  a.href = data.url;
  a.download = true;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function handleFreeDownload(product, onError) {
  try {
    const res = await fetch('/api/download/free', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id }),
    });
    const data = await res.json();
    if (!res.ok) { onError(data.error || 'Download failed.'); return; }
    const a = document.createElement('a');
    a.href = data.url;
    a.download = true;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    onError('Network error. Please try again.');
  }
}

function OrdersModal({ user, guestEmail, onClose, onRequireAuth, onError }) {
  const [email, setEmail] = useState(guestEmail || '');
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (q) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/orders' + (q ? `?email=${encodeURIComponent(q)}` : ''));
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not load orders.'); setOrders(null); }
      else setOrders(data.orders);
    } catch {
      setError('Network error.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  return (
    <Modal onClose={onClose}>
      <h3>My Orders</h3>
      {!user && (
        <>
          <p className="form-note" style={{ textAlign: 'left', margin: '4px 0 14px' }}>
            Enter the email you used at checkout, or sign in.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); load(email.trim()); }} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="btn" type="submit" disabled={loading}>Find</button>
          </form>
          <p className="form-note" style={{ margin: '0 0 14px' }}>
            <button onClick={onRequireAuth}>Sign in / Create account</button>
          </p>
        </>
      )}
      {error && <div className="form-error">{error}</div>}
      {loading && <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div>}
      {orders && orders.length === 0 && <div className="empty">No orders yet.</div>}
      {orders?.map((o) => (
        <div className="order-row" key={o.id}>
          {o.cover_path ? (
            <img src={o.cover_path} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
          ) : <div style={{ width: 46, height: 58, borderRadius: 8, background: 'var(--chip-bg)' }} />}
          <div className="order-info">
            <div className="t">{o.title}</div>
            <div className="s">{o.order_code} · {ugx(o.amount_ugx)}</div>
            <span className={`status ${o.status}`}>{o.status}</span>
          </div>
          {o.status === 'paid' && (
            <button className="btn btn-sm" onClick={() => requestDownload(o, user?.email || email.trim(), onError)}>
              <DownloadIcon /> Get
            </button>
          )}
        </div>
      ))}
    </Modal>
  );
}

function PaymentResultModal({ result, user, guestEmail, onClose, onError }) {
  // Hooks must be called unconditionally before any early returns
  const [email, setEmail] = useState(user?.email || result?.order?.customer_email || guestEmail || '');
  const [emailSent, setEmailSent] = useState(false);

  if (result?.cancelled) {
    return (
      <Modal onClose={onClose}>
        <h3 style={{ textAlign: 'center' }}>Payment cancelled</h3>
        <p className="form-note">You cancelled the payment. Your order was not charged.</p>
        <button className="btn btn-block" style={{ marginTop: 16 }} onClick={onClose}>Close</button>
      </Modal>
    );
  }
  const order = result?.order;
  if (result?.error || !order) {
    return (
      <Modal onClose={onClose}>
        <h3 style={{ textAlign: 'center' }}>Payment status</h3>
        <p className="form-note">{result?.error || 'We could not confirm your payment yet. If you were charged, check My Orders in a few minutes.'}</p>
        <button className="btn btn-block" style={{ marginTop: 16 }} onClick={onClose}>Close</button>
      </Modal>
    );
  }
  if (order.status !== 'paid') {
    return (
      <Modal onClose={onClose}>
        <h3 style={{ textAlign: 'center' }}>Payment not completed</h3>
        <p className="form-note">
          Order <strong>{order.order_code}</strong> is still {order.status}.
          If money was deducted from your mobile money, it will be reconciled automatically — check My Orders shortly.
        </p>
        <button className="btn btn-block" style={{ marginTop: 16 }} onClick={onClose}>Close</button>
      </Modal>
    );
  }

  const saveEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) { onError('Please enter a valid email.'); return; }
    try {
      const res = await fetch('/api/orders/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_code: order.order_code, email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) { onError(data.error || 'Could not save email.'); return; }
      setEmailSent(true);
    } catch {
      onError('Network error. Please try again.');
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="success-icon"><CheckIcon /></div>
      <h3 style={{ textAlign: 'center' }}>Payment successful</h3>
      <p className="form-note" style={{ margin: '6px 0 4px' }}>
        Order <strong>{order.order_code}</strong> — {result.product?.title}<br />
        {ugx(order.amount_ugx)} paid via mobile money.
      </p>
      {!emailSent && (
        <>
          <p className="form-note" style={{ textAlign: 'left', margin: '10px 0 8px' }}>
            Download your document to your phone, then enter your email to receive the download link.
          </p>
          <div className="field" style={{ marginBottom: 12 }}>
            <input id="pr-email" type="email" placeholder="you@example.com" required
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn btn-block" style={{ marginTop: 10 }} onClick={saveEmail}>
            Save email & send download link
          </button>
        </>
      )}
      {emailSent && (
        <p className="form-note" style={{ textAlign: 'center', color: 'var(--teal)' }}>
          Download link sent to <strong>{email}</strong>. You can also download again under My Orders.
        </p>
      )}
      <button className="btn btn-block" style={{ marginTop: 16 }} onClick={onClose}>Close</button>
    </Modal>
  );
}
