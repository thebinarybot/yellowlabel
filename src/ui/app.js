// Entry point. Reads through the StoreAdapter, never from a JSON file
// directly, so a live source can replace the seed without touching the UI.

import { SeedAdapter } from '../adapters/seed-adapter.js';
import { longDate, plural, storesInOffers, weekLabel } from './format.js';
import { indexOffers, bestOfferIds, costAll } from './match.js';
import { renderOffers, renderStorePicker, syncStorePicker } from './offers.js';
import { renderRecipes } from './recipes.js';
import { DEFAULTS, loadPrefs, savePrefs, clearPrefs } from './prefs.js';

const el = (id) => document.getElementById(id);

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
  const recipes = bank.recipes ?? [];
  // The store list comes from the data, so a store added to the snapshot
  // appears in the picker on its own.
  const present = storesInOffers(offers);

  const saved = loadPrefs();
  const state = {
    stores: new Set(present.filter((s) => !saved.storesOff.includes(s))),
    search: saved.search,
    sort: saved.sort,
    maxMinutes: saved.maxMinutes,
    servings: saved.servings,
    recipeSort: saved.recipeSort,
  };

  el('week-stamp').textContent = weekLabel(snapshot.week);
  el('masthead-stores').textContent = present.join(' · ');
  el('footer-source').textContent =
    `${offers.length} offers, ${Object.keys(ingredients).length} ingredients, ` +
    `${recipes.length} recipes. Snapshot ${snapshot.week}, ` +
    `captured ${longDate(snapshot.capturedAt)}. Source: ${snapshot.source}. ` +
    `Recipe bank generated ${longDate(bank.generatedAt)}.`;

  const grid = el('offer-grid');
  const offerEmpty = el('offer-empty');
  const offerCount = el('offer-count');
  const recipeList = el('recipe-list');
  const recipeEmpty = el('recipe-empty');
  const recipeCount = el('recipe-count');
  const picker = el('store-picker');

  function scopeLabel() {
    if (state.stores.size === 0) return 'no stores';
    if (state.stores.size === present.length) return plural(present.length, 'store', 'stores');
    return present.filter((s) => state.stores.has(s)).join(' + ');
  }

  function paint() {
    // Everything downstream is costed against the picked stores only, so the
    // filter happens once here and both sections read the same basket.
    const inScope = offers.filter((o) => state.stores.has(o.store));
    const byKey = indexOffers(inScope);
    const bestIds = bestOfferIds(byKey);

    const drawn = renderOffers(grid, inScope, ingredients, bestIds, state);
    offerEmpty.hidden = drawn > 0;
    offerEmpty.textContent = state.stores.size === 0
      ? 'No stores ticked. Tick at least one store to see offers.'
      : 'No offers match that search.';
    offerCount.textContent = `${plural(drawn, 'offer', 'offers')} / ${scopeLabel()}`;

    // With no store ticked there is nothing to cost against, so the cards
    // would all read 0.00. Show the empty state instead.
    const priced = state.stores.size === 0
      ? []
      : costAll(recipes, byKey, ingredients, state.servings, state.recipeSort);
    const { shown, makeable } = renderRecipes(recipeList, priced, state);
    recipeEmpty.hidden = shown > 0;
    if (state.stores.size === 0) {
      recipeEmpty.textContent = 'No stores ticked. Tick at least one store to cost a recipe.';
      recipeCount.textContent = `0 recipes makeable / ${scopeLabel()}`;
    } else {
      recipeEmpty.textContent = state.maxMinutes > 0
        ? `No recipes under ${state.maxMinutes} min.`
        : 'No recipes to cost.';
      recipeCount.textContent =
        `${plural(makeable, 'recipe', 'recipes')} makeable of ${shown} / ${scopeLabel()}`;
    }

    savePrefs({
      storesOff: present.filter((s) => !state.stores.has(s)),
      search: state.search,
      sort: state.sort,
      maxMinutes: state.maxMinutes,
      servings: state.servings,
      recipeSort: state.recipeSort,
    });
  }

  renderStorePicker(picker, present, state, paint);

  const search = el('search-input');
  const sortSelect = el('sort-select');
  const timeSelect = el('time-select');
  const servingsSelect = el('servings-select');
  const recipeSortSelect = el('recipe-sort-select');

  function syncControls() {
    search.value = state.search;
    sortSelect.value = state.sort;
    timeSelect.value = String(state.maxMinutes);
    servingsSelect.value = String(state.servings);
    recipeSortSelect.value = state.recipeSort;
    syncStorePicker(picker, state);
  }

  search.addEventListener('input', () => {
    state.search = search.value;
    paint();
  });
  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    paint();
  });
  timeSelect.addEventListener('change', () => {
    state.maxMinutes = Number(timeSelect.value);
    paint();
  });
  servingsSelect.addEventListener('change', () => {
    state.servings = Number(servingsSelect.value);
    paint();
  });
  recipeSortSelect.addEventListener('change', () => {
    state.recipeSort = recipeSortSelect.value;
    paint();
  });

  el('reset-btn').addEventListener('click', () => {
    state.stores = new Set(present);
    state.search = DEFAULTS.search;
    state.sort = DEFAULTS.sort;
    state.maxMinutes = DEFAULTS.maxMinutes;
    state.servings = DEFAULTS.servings;
    state.recipeSort = DEFAULTS.recipeSort;
    syncControls();
    paint();
    // paint() writes the current state back, so the clear comes last.
    clearPrefs();
  });

  syncControls();
  paint();
}

function fail(err) {
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
