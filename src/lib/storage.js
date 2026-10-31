import path from 'path';

// Resolves the Cloudflare environment binding (BUCKET) if available
async function getR2Bucket() {
  try {
    const pkg = '@opennextjs/cloudflare';
    const mod = await import(/* webpackIgnore: true */ pkg);
    if (mod?.getCloudflareContext) {
      const ctx = await mod.getCloudflareContext({ async: true });
      if (ctx?.env?.BUCKET) return ctx.env.BUCKET;
    }
  } catch {
    // Not running inside OpenNext isolate
  }

  // 2. Check global binding (Cloudflare Workers native)
  if (typeof globalThis !== 'undefined' && globalThis.BUCKET) {
    return globalThis.BUCKET;
  }

  return null;
}

/**
 * Save an object to R2 storage (with local filesystem fallback for local dev)
 * @param {string} key - e.g. "files/filename.pdf" or "covers/cover.png"
 * @param {Buffer|ArrayBuffer|Uint8Array|ReadableStream} data
 * @param {string} contentType
 */
export async function putObject(key, data, contentType = 'application/octet-stream') {
  const bucket = await getR2Bucket();
  if (bucket) {
    await bucket.put(key, data, {
      httpMetadata: { contentType },
    });
    return key;
  }

  // Fallback: local disk
  const fs = await import('fs');
  const fullPath = path.join(process.cwd(), 'data', key);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data instanceof ArrayBuffer ? data : await new Response(data).arrayBuffer());
  fs.writeFileSync(fullPath, buffer);
  return key;
}

/**
 * Get an object from R2 storage (with local filesystem fallback)
 * @param {string} key
 * @returns {Promise<{ body: any, size: number, contentType: string } | null>}
 */
export async function getObject(key) {
  const bucket = await getR2Bucket();
  if (bucket) {
    const obj = await bucket.get(key);
    if (!obj) return null;
    return {
      body: obj.body,
      size: obj.size,
      contentType: obj.httpMetadata?.contentType || 'application/octet-stream',
    };
  }

  // Fallback: local disk
  const fs = await import('fs');
  // Check both 'data/' prefix and direct path for backwards compatibility
  const candidate = path.join(process.cwd(), key.startsWith('data') ? key : path.join('data', key));
  if (!fs.existsSync(candidate)) return null;

  const stat = fs.statSync(candidate);
  const stream = fs.createReadStream(candidate);
  return {
    body: stream,
    size: stat.size,
    contentType: 'application/octet-stream',
  };
}

/**
 * Delete an object from storage
 * @param {string} key
 */
export async function deleteObject(key) {
  if (!key) return;
  const bucket = await getR2Bucket();
  if (bucket) {
    await bucket.delete(key);
    return;
  }

  // Fallback: local disk
  const fs = await import('fs');
  const candidate = path.join(process.cwd(), key.startsWith('data') ? key : path.join('data', key));
  if (fs.existsSync(candidate)) {
    try { fs.unlinkSync(candidate); } catch {}
  }
}
