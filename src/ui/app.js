// Entry point. Reads through the StoreAdapter, never from a JSON file
// directly, so a live source can replace the seed without touching the UI.

import { SeedAdapter } from '../adapters/seed-adapter.js';
import { STORES } from '../adapters/store-adapter.js';
import { longDate, plural, weekLabel } from './format.js';
import { indexOffers, bestOfferIds, costAll } from './match.js';
import { renderOffers, renderStoreFilter } from './offers.js';
import { renderRecipes } from './recipes.js';

const el = (id) => document.getElementById(id);

const state = {
  sort: 'price',
  stores: new Set(),
};

async function boot() {
  const adapter = new SeedAdapter('./data');

  let ingredients;
  let snapshot;
  let bank;
  try {
    ({ ingredients, snapshot, bank } = await adapter.loadAll());
  } catch (err) {
    fail(err);
    return;
  }

  const offers = snapshot.offers ?? [];
  const byKey = indexOffers(offers);
  const bestIds = bestOfferIds(byKey);
  const priced = costAll(bank.recipes ?? [], byKey, ingredients);

  // Rule 4 of the contract: seeded data is never presented as live.
  const live = adapter.isLive();
  const kind = live ? 'Live read' : 'Captured snapshot, not a live read';
  el('snapshot-note').textContent =
    `${kind}. Captured ${longDate(snapshot.capturedAt)}. ` +
    `Source: ${snapshot.source}. Currency: ${snapshot.currency}.`;
  el('week-stamp').textContent = weekLabel(snapshot.week);
  el('footer-source').textContent =
    `${offers.length} offers, ${Object.keys(ingredients).length} ingredients, ` +
    `${(bank.recipes ?? []).length} recipes. Snapshot ${snapshot.week}, ` +
    `captured ${longDate(snapshot.capturedAt)}. Recipe bank generated ` +
    `${longDate(bank.generatedAt)}.`;

  const grid = el('offer-grid');
  const empty = el('offer-empty');
  const count = el('offer-count');

  const present = STORES.filter((s) => offers.some((o) => o.store === s));

  function paint() {
    const n = renderOffers(grid, offers, ingredients, bestIds, state);
    empty.hidden = n > 0;
    const scope = state.stores.size === 0
      ? `${present.length} stores`
      : [...state.stores].join(' + ');
    count.textContent = `${plural(n, 'offer', 'offers')} / ${scope}`;
  }

  renderStoreFilter(el('store-filter'), present, state, paint);

  const sortSelect = el('sort-select');
  sortSelect.value = state.sort;
  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    paint();
  });

  paint();

  const makeable = renderRecipes(el('recipe-list'), priced);
  el('recipe-count').textContent =
    `${plural(makeable, 'recipe', 'recipes')} makeable of ${priced.length}`;
}

function fail(err) {
  const note = el('snapshot-note');
  note.textContent = `Could not load the snapshot: ${err.message}`;
  const box = document.createElement('p');
  box.className = 'error';
  box.textContent = 'Offer data did not load. Serve this folder over HTTP, not from file://, and check data/ is present.';
  el('offers').append(box);
  console.error(err);
}

// The service worker caches the shell and the three JSON files so a second
// load works offline. It needs http or https, so file:// is skipped.
function registerWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (!/^https?:$/.test(location.protocol)) return;
  navigator.serviceWorker.register('./sw.js').catch((err) => {
    console.warn('Service worker did not register:', err.message);
  });
}

boot();
window.addEventListener('load', registerWorker);
