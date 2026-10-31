import crypto from 'crypto';
import { queryOne, execute } from './db';
import { checkTransaction, marzConfigured } from './marzpay';

export function generateOrderCode() {
  return 'FS-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Server-side, idempotent payment fulfilment. Confirms the collection status
// with MarzPay before marking an order paid. Safe to call from the webhook
// and from the customer's "check status" request.
export async function finalizePayment({ tx_ref }) {
  const order = await queryOne('SELECT * FROM orders WHERE tx_ref = ?', [tx_ref]);
  if (!order) return null;
  if (order.status === 'paid') return order;
  if (!order.provider_tx || !marzConfigured()) return order;

  let tx;
  try {
    tx = await checkTransaction(order.provider_tx);
  } catch {
    return order; // provider unreachable — leave as-is, retry later
  }

  const transaction = tx.transaction || {};
  if (transaction.status === 'completed') {
    const amount = tx.collection?.amount?.raw;
    const currency = tx.collection?.amount?.currency;
    if (currency === 'UGX' && Number(amount) === Number(order.amount_ugx)) {
      await execute("UPDATE orders SET status = 'paid', paid_at = datetime('now') WHERE id = ? AND status = 'pending'", [order.id]);
    } else {
      await execute("UPDATE orders SET status = 'failed' WHERE id = ? AND status = 'pending'", [order.id]);
    }
  } else if (transaction.status === 'failed') {
    await execute("UPDATE orders SET status = 'failed' WHERE id = ? AND status = 'pending'", [order.id]);
  }

  return await queryOne('SELECT * FROM orders WHERE id = ?', [order.id]);
}
