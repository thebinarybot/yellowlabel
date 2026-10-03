// Formatting helpers. Everything here is display only, no pricing logic.

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
  const found = [...new Set(offers.map((o) => o.store))];
  return found.sort((a, b) => {
    const ia = STORE_ORDER.indexOf(a);
    const ib = STORE_ORDER.indexOf(b);
    if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    return a.localeCompare(b);
  });
}

/** Round to cents, away from float noise. */
export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** "2.49", always two decimals. */
export function money(n) {
  return round2(n).toFixed(2);
}

/** Price as a hero numeral: euros large, cents raised. */
export function priceHtml(n) {
  const [euros, cents] = money(n).split('.');
  return `<span class="price__cur">&euro;</span>${euros}<span class="price__cents">.${cents}</span>`;
}

/** "2026-10-09" to "09 Oct 2026". Returns the input if it is not a date. */
export function longDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!m) return String(iso ?? '');
  return `${m[3]} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** "2026-10-09" to "09 Oct". */
export function shortDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!m) return String(iso ?? '');
  return `${m[3]} ${MONTHS[Number(m[2]) - 1]}`;
}

/** "2026-W40" to "Week 40". */
export function weekLabel(week) {
  const m = /^(\d{4})-W(\d{1,2})$/.exec(String(week ?? ''));
  return m ? `Week ${Number(m[2])} / ${m[1]}` : String(week ?? 'Week');
}

export function storeName(code) {
  return STORE_NAMES[code] ?? code;
}

/** Singular or plural without a ternary at every call site. */
export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Text to safe HTML. Everything interpolated into innerHTML passes through. */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
