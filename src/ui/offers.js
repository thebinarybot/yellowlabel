// Offer grid: one shelf edge label per offer. Plus the two controls that
// decide which offers exist at all: the store picker and the search box.

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

/** Match the shelf name and the ingredient label, so either term works. */
function matches(offer, ingredients, term) {
  if (!term) return true;
  const label = ingredients[offer.ingredientKey]?.label ?? '';
  return `${offer.name} ${label} ${offer.ingredientKey}`.toLowerCase().includes(term);
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
 * Render the grid from offers already narrowed to the picked stores.
 * @returns {number} how many offers were drawn.
 */
export function renderOffers(root, offers, ingredients, bestIds, state) {
  const term = state.search.trim().toLowerCase();
  const shown = offers
    .filter((o) => matches(o, ingredients, term))
    .sort(SORTS[state.sort] ?? SORTS.unit);

  root.innerHTML = shown.map((o) => labelHtml(o, ingredients, bestIds)).join('');
  return shown.length;
}

/**
 * Store picker. One tick box per store found in the data, so a store added
 * to the snapshot later shows up here without a code change.
 */
export function renderStorePicker(root, stores, state, onChange) {
  root.innerHTML = stores.map((s) => `
    <label class="tick">
      <input type="checkbox" value="${esc(s)}"${state.stores.has(s) ? ' checked' : ''}>
      <span class="stamp stamp--${esc(s)}">${esc(s)}</span>
      <span class="visually-hidden">${esc(storeName(s))}</span>
    </label>`).join('');

  root.addEventListener('change', (event) => {
    const box = event.target.closest('input[type="checkbox"]');
    if (!box) return;
    if (box.checked) state.stores.add(box.value);
    else state.stores.delete(box.value);
    onChange();
  });
}

/** Push state back onto the tick boxes, for the reset control. */
export function syncStorePicker(root, state) {
  for (const box of root.querySelectorAll('input[type="checkbox"]')) {
    box.checked = state.stores.has(box.value);
  }
}
