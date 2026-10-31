import path from 'path';

let localSqliteInstance = null;

// Retrieves the Cloudflare D1 database binding if available
async function getD1Binding() {
  try {
    const pkg = '@opennextjs/cloudflare';
    const mod = await import(/* webpackIgnore: true */ pkg);
    if (mod?.getCloudflareContext) {
      const ctx = await mod.getCloudflareContext({ async: true });
      if (ctx?.env?.DB) return ctx.env.DB;
    }
  } catch {
    // Not running inside OpenNext / Cloudflare isolate
  }

  if (typeof globalThis !== 'undefined' && globalThis.DB) {
    return globalThis.DB;
  }

  return null;
}

// Fallback to local better-sqlite3 for local Node.js development
async function getLocalSqlite() {
  if (localSqliteInstance) return localSqliteInstance;
  const fs = await import('fs');
  const Database = (await import('better-sqlite3')).default;

  const DATA_DIR = path.join(process.cwd(), 'data');
  for (const dir of [DATA_DIR, path.join(DATA_DIR, 'files'), path.join(DATA_DIR, 'uploads', 'covers')]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(path.join(DATA_DIR, 'fileshelf.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Ensure tables exist on local disk
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin','customer')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL CHECK (category IN ('Books','Courses','Notes','Templates')),
      price_ugx INTEGER NOT NULL DEFAULT 0,
      file_format TEXT NOT NULL DEFAULT 'PDF',
      cover_path TEXT NOT NULL DEFAULT '',
      file_path TEXT NOT NULL DEFAULT '',
      file_name TEXT NOT NULL DEFAULT '',
      file_size INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT NOT NULL UNIQUE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      user_id INTEGER REFERENCES users(id),
      customer_name TEXT NOT NULL DEFAULT '',
      customer_email TEXT NOT NULL DEFAULT '',
      customer_phone TEXT NOT NULL DEFAULT '',
      amount_ugx INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','cancelled')),
      tx_ref TEXT UNIQUE,
      provider_tx TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      paid_at TEXT
    );
    CREATE TABLE IF NOT EXISTS downloads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  `);

  localSqliteInstance = db;
  return localSqliteInstance;
}

/**
 * Returns raw database instance (D1 in Cloudflare, better-sqlite3 locally)
 */
export async function getDb() {
  const d1 = await getD1Binding();
  if (d1) return d1;
  return getLocalSqlite();
}

/**
 * Execute a query that returns multiple rows
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<any[]>}
 */
export async function query(sql, params = []) {
  const d1 = await getD1Binding();
  if (d1) {
    const stmt = d1.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const res = await bound.all();
    return res.results || [];
  }
  const sqlite = await getLocalSqlite();
  return sqlite.prepare(sql).all(...params);
}

/**
 * Execute a query that returns a single row
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<any|null>}
 */
export async function queryOne(sql, params = []) {
  const d1 = await getD1Binding();
  if (d1) {
    const stmt = d1.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const row = await bound.first();
    return row || null;
  }
  const sqlite = await getLocalSqlite();
  const row = sqlite.prepare(sql).get(...params);
  return row || null;
}

/**
 * Execute an INSERT / UPDATE / DELETE statement
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<{ lastInsertRowid: number|null, changes: number }>}
 */
export async function execute(sql, params = []) {
  const d1 = await getD1Binding();
  if (d1) {
    const stmt = d1.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const res = await bound.run();
    return {
      lastInsertRowid: res.meta?.last_row_id ?? null,
      changes: res.meta?.changes ?? 0,
    };
  }
  const sqlite = await getLocalSqlite();
  const info = sqlite.prepare(sql).run(...params);
  return {
    lastInsertRowid: info.lastInsertRowid ? Number(info.lastInsertRowid) : null,
    changes: info.changes,
  };
}

export default {
  query,
  queryOne,
  execute,
  getDb,
};
