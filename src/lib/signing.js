import crypto from 'crypto';

const secret = process.env.APP_SECRET || 'fileshelf-dev-secret-change-me';

// Short-lived HMAC-signed token authorizing a single download of a single order.
export function signDownloadToken(orderId, maxAgeSec = 900) {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec;
  const payload = `${orderId}.${exp}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyDownloadToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [orderId, exp, sig] = parts;
  const payload = `${orderId}.${exp}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return null;
  return Number(orderId);
}
