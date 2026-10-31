const BASE = 'https://wallet.wearemarz.com/api/v1';

export function marzConfigured() {
  return Boolean(process.env.MARZ_API_KEY && process.env.MARZ_API_SECRET);
}

function authHeader() {
  const b64 = Buffer.from(`${process.env.MARZ_API_KEY}:${process.env.MARZ_API_SECRET}`).toString('base64');
  return `Basic ${b64}`;
}

// Normalize Ugandan numbers to +256XXXXXXXXX (MarzPay requirement).
export function normalizeUgPhone(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('256')) return `+${d}`;
  if (d.startsWith('0')) return `+256${d.slice(1)}`;
  if (d.length === 9) return `+256${d}`;
  return `+${d}`;
}

// Initiate a mobile money collection (MTN MoMo / Airtel Money are auto-detected
// from the phone prefix). The customer approves the push request on their phone.
export async function initiateCollection({ phone, amount, reference, description, callbackUrl }) {
  const form = new FormData();
  form.set('phone_number', normalizeUgPhone(phone));
  form.set('amount', String(Math.round(amount)));
  form.set('country', 'UG');
  form.set('reference', reference);
  form.set('description', description);
  form.set('callback_url', callbackUrl);

  const res = await fetch(`${BASE}/collect-money`, {
    method: 'POST',
    headers: { Authorization: authHeader() },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === 'error') {
    throw new Error(data.message || `MarzPay request failed (${res.status})`);
  }
  return data.data;
}

// Server-side status check for a collection transaction.
export async function checkTransaction(uuid) {
  const res = await fetch(`${BASE}/collect-money/${uuid}`, { headers: { Authorization: authHeader() } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === 'error') {
    throw new Error(data.message || `MarzPay status check failed (${res.status})`);
  }
  return data.data;
}
