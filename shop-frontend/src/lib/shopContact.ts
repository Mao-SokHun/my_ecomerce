/** Default when API has no contact data */
export const FALLBACK_SHOP_CONTACT_LINE = 'sokhunmao390@gmail.com | 0974944390 / 0885459115';

const FALLBACK_EMAIL = 'sokhunmao390@gmail.com';
const FALLBACK_PHONES = ['0974944390', '0885459115'];
const FALLBACK_ADDRESS = '247 Beong Salang St, Toul Kork, Phnom Penh';

function splitPhonesFromInvoiceLine(value: unknown): string[] {
  const raw = typeof value === 'string' ? value : '';
  if (!raw.trim()) return [];
  const parts = raw.split(/\s*\/\s*/).map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts : [raw.trim()];
}

export type ShopReceiptMeta = { contactLine: string; shopAddress: string };

/**
 * Build footer-style contact line and shop address from public `footerInfo` (same shape as Site Settings JSON).
 */
export function shopReceiptMetaFromFooterInfo(footerInfo: unknown): ShopReceiptMeta {
  if (!footerInfo || typeof footerInfo !== 'object') {
    return { contactLine: FALLBACK_SHOP_CONTACT_LINE, shopAddress: FALLBACK_ADDRESS };
  }
  const o = footerInfo as {
    footer?: { email?: string; phones?: unknown[]; address?: string };
    invoice?: { supportEmail?: string; supportPhone?: string; shopAddress?: string };
  };
  const rawPhones = Array.isArray(o.footer?.phones)
    ? o.footer!.phones.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const phones = rawPhones.length > 0 ? rawPhones : splitPhonesFromInvoiceLine(o.invoice?.supportPhone);
  const finalPhones = phones.length > 0 ? phones : FALLBACK_PHONES;
  const email =
    String(o.footer?.email || o.invoice?.supportEmail || '').trim() || FALLBACK_EMAIL;
  const contactLine = `${email} | ${finalPhones.join(' / ')}`;
  const shopAddress =
    String(o.footer?.address || o.invoice?.shopAddress || '').trim() || FALLBACK_ADDRESS;
  return { contactLine, shopAddress };
}
