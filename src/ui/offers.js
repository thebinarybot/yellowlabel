// Offer grid: one shelf edge label per offer.

import { esc, money, priceHtml, shortDate, storeName, round2 } from './format.js';

export const SORTS = {
  unit: (a, b) => a.unitPrice - b.unitPrice || a.price - b.price,
  price: (a, b) => a.price - b.price || a.unitPrice - b.unitPrice,
  saving: (a, b) => saving(b) - saving(a) || a.unitPrice - b.unitPrice,
  store: (a, b) => a.store.localeCompare(b.store) || a.unitPrice - b.unitPrice,
};

export function saving(offer) {
  return offer.wasPrice ? round2(offer.wasPrice - offer.price) : 0;
}

function labelHtml(offer, ingredients, bestIds) {
  const meta = ingredients[offer.ingredientKey];
  const cut = saving(offer);
  const isBest = bestIds.has(offer.id);

  const wasLine = offer.wasPrice
    ? `<p class="label__was">Was <s>${money(offer.wasPrice)}</s>. Saves ${money(cut)}</p>`
    : '<p class="label__was">No previous price</p>';

  // The store's shelf name often repeats the ingredient label. Print the
  // label only when it adds something.
  const ingredientLabel = meta?.label ?? offer.ingredientKey;
  const a = ingredientLabel.toLowerCase();
  const b = offer.name.toLowerCase();
  const repeats = a === b || b.includes(a) || a.includes(b);
  const subParts = [];
  if (!repeats) subParts.push(esc(ingredientLabel));
  if (isBest) subParts.push('cheapest this week');
  const subLine = subParts.length
    ? `<p class="label__key">${subParts.join(' / ')}</p>`
    : '';

  return `
    <li class="label${isBest ? ' label--best' : ''}">
      <div class="label__top">
        <span class="stamp stamp--${esc(offer.store)}">${esc(offer.store)}</span>
        <span class="label__size">${esc(offer.size)}</span>
      </div>
      <h3 class="label__name">${esc(offer.name)}</h3>
      ${subLine}
      <p class="price">${priceHtml(offer.price)}</p>
      ${wasLine}
      <dl class="label__meta">
        <div>
          <dt>Unit</dt>
          <dd>${money(offer.unitPrice)} ${esc(offer.unitLabel)}</dd>
        </div>
        <div>
          <dt>Ends</dt>
          <dd>${esc(shortDate(offer.validTo))}</dd>
        </div>
      </dl>
    </li>`;
}

/**
 * Render the grid.
 * @returns {number} how many offers were drawn.
 */
export function renderOffers(root, offers, ingredients, bestIds, state) {
  const shown = offers
    .filter((o) => state.stores.size === 0 || state.stores.has(o.store))
    .sort(SORTS[state.sort] ?? SORTS.unit);

  root.innerHTML = shown.map((o) => labelHtml(o, ingredients, bestIds)).join('');
  return shown.length;
}

/** Store filter buttons. An empty selection means every store. */
export function renderStoreFilter(root, stores, state, onChange) {
  root.innerHTML = [
    `<button type="button" class="segment__btn" data-store="" aria-pressed="${state.stores.size === 0}">All</button>`,
    ...stores.map((s) =>
      `<button type="button" class="segment__btn" data-store="${esc(s)}" aria-pressed="${state.stores.has(s)}">${esc(storeName(s))}</button>`),
  ].join('');

  root.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-store]');
    if (!btn) return;
    const code = btn.dataset.store;
    if (code === '') {
      state.stores.clear();
    } else if (state.stores.has(code)) {
      state.stores.delete(code);
    } else {
      state.stores.add(code);
    }
    for (const b of root.querySelectorAll('button[data-store]')) {
      const key = b.dataset.store;
      b.setAttribute('aria-pressed', String(key === '' ? state.stores.size === 0 : state.stores.has(key)));
    }
    onChange();
  });
}
