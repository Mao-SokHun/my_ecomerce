import { randomBytes } from 'node:crypto';
import prisma from './prisma';

/**
 * Resolves the next cart / cart_item id. Prefer DB next_prefixed_id (migration
 * 20260515180000_prefixed_id_db_defaults); if the function or sequence is missing,
 * fall back so inserts never send NULL id (avoids 500 on add-to-cart).
 */
export async function allocateCartId(): Promise<string> {
  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT next_prefixed_id('cart', 'carts_id_seq'::regclass) AS id
    `;
    const id = rows[0]?.id;
    if (typeof id === 'string' && id.length > 0) return id;
  } catch {
    /* migration not applied or DB unreachable */
  }
  return `cart${Date.now()}${randomBytes(4).toString('hex')}`;
}

export async function allocateCartItemId(): Promise<string> {
  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT next_prefixed_id('ci', 'cart_items_id_seq'::regclass) AS id
    `;
    const id = rows[0]?.id;
    if (typeof id === 'string' && id.length > 0) return id;
  } catch {
    /* migration not applied or DB unreachable */
  }
  return `ci${Date.now()}${randomBytes(4).toString('hex')}`;
}
