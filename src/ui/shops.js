// "Shops you use": the stores everything is costed against. Offers listed,
// recipe costs and the cheapest shop per ingredient all read this one set,
// so it is shared by the offers and recipes screens and saved between visits.

import { esc, storeName } from './format.js';

/** The pill group markup. Each shop is an aria-pressed toggle. */
export function shopsHtml(ctx, state) {
  const pill = (store) =>
    `<button type="button" class="pill" data-shop="${esc(store)}" aria-pressed="${state.stores.has(store)}">${esc(storeName(store))}</button>`;
  return `
    <div class="shops">
      <p class="field__label" id="shops-l">Shops you use</p>
      <div class="pills" role="group" aria-labelledby="shops-l">
        <button type="button" class="pill" data-shop="*" aria-pressed="${state.stores.size === ctx.present.length}">All shops</button>
        ${ctx.present.map(pill).join('')}
      </div>
    </div>`;
}

/**
 * Wire the pills inside root. onChange runs after the set changes, once the
 * offers and costs have been worked out again for the new set.
 */
export function wireShops(root, ctx, state, onChange) {
  const group = root.querySelector('.shops .pills');
  const sync = () => {
    for (const button of group.querySelectorAll('[data-shop]')) {
      const on = button.dataset.shop === '*'
        ? state.stores.size === ctx.present.length
        : state.stores.has(button.dataset.shop);
      button.setAttribute('aria-pressed', String(on));
    }
  };

  group.addEventListener('click', (event) => {
    const button = event.target.closest('[data-shop]');
    if (!button) return;
    const shop = button.dataset.shop;
    if (shop === '*') state.stores = new Set(ctx.present);
    else if (state.stores.has(shop)) state.stores.delete(shop);
    else state.stores.add(shop);
    ctx.rescope();
    sync();
    onChange();
  });
  return sync;
}

/** "No shops picked" message for an empty state, or null when some are. */
export function noShopsMessage(state) {
  return state.stores.size === 0
    ? 'No shops picked. Pick at least one shop to see offers and costs.'
    : null;
}
