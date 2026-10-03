// Formatting helpers. Everything here is display only, no pricing logic.

import { round2 } from '../adapters/matching.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const STORE_NAMES = {
  ALDI: 'Aldi',
  DUNNES: 'Dunnes Stores',
  LIDL: 'Lidl',
  TESCO: 'Tesco',
};

// Display order for the stores that are known by name. Anything else sorts
// after them, alphabetically, so a new store code in the data still renders.
const STORE_ORDER = Object.keys(STORE_NAMES);

/** Store codes present in a set of offers, in display order. */
export function storesInOffers(offers) {
  return inStoreOrder(offers.map((o) => o.store));
}

/** Store codes, deduplicated, in display order. */
export function inStoreOrder(codes) {
  return [...new Set(codes)].sort((a, b) => {
    const ia = STORE_ORDER.indexOf(a);
    const ib = STORE_ORDER.indexOf(b);
    if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    return a.localeCompare(b);
  });
}

// Reader facing names for the ingredient categories, in the order the
// category filter lists them.
export const CATEGORY_NAMES = {
  protein: 'Meat, fish and eggs',
  veg: 'Vegetables',
  fruit: 'Fruit',
  dairy: 'Dairy',
  bakery: 'Bakery',
  pantry: 'Cupboard',
};

/** "€2.49": always the euro sign and two decimals. */
export function money(n) {
  return `€${round2(n).toFixed(2)}`;
}

/** "2026-10-09" to "9 Oct 2026". Returns the input if it is not a date. */
export function longDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!m) return String(iso ?? '');
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** "2026-10-09" to "9 Oct". */
export function shortDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!m) return String(iso ?? '');
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}`;
}

export function storeName(code) {
  return STORE_NAMES[code] ?? code;
}

export function categoryLabel(key) {
  return CATEGORY_NAMES[key] ?? key;
}

/** A recipe amount in its unit: "500 g", "1.5 kg", "30 ml", "2 each". */
export function amount(qty, unit) {
  const trim = (n) => String(Math.round(n * 10) / 10);
  if (unit === 'kg') return qty < 1 ? `${Math.round(qty * 1000)} g` : `${trim(qty)} kg`;
  if (unit === 'litre') return qty < 1 ? `${Math.round(qty * 1000)} ml` : `${trim(qty)} litres`;
  if (unit === 'pack') return plural(trim(qty), 'pack', 'packs');
  return trim(qty);
}

/** Unit price with its unit: "€2.49/kg", "€0.30 each". */
export function unitPrice(offer) {
  const label = String(offer.unitLabel ?? '');
  if (label.startsWith('per ')) return `${money(offer.unitPrice)}/${label.slice(4)}`;
  return `${money(offer.unitPrice)} ${label}`.trim();
}

/** Singular or plural without a ternary at every call site. */
export function plural(n, one, many) {
  return `${n} ${String(n) === '1' ? one : many}`;
}

/** "Aldi", "Aldi and Lidl", "Aldi, Dunnes Stores and Lidl". */
export function listJoin(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Text to safe HTML. Everything interpolated into innerHTML passes through. */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
