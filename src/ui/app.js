// Entry point and router. Reads through the StoreAdapter, never from a JSON
// file directly, so a live source can replace the seed without touching the
// UI.
//
// Routes are hashes (#/offers, #/recipes, #/recipes/<id>) because a plain
// static server has no fallback that sends unknown paths to index.html.

import { getAdapter, costRecipes, cheapestByIngredient } from '../adapters/index.js';
import { longDate, storesInOffers } from './format.js';
import { DEFAULTS, loadPrefs, savePrefs, clearPrefs } from './prefs.js';
import { renderOffers } from './offers.js';
import { renderRecipes } from './recipes.js';
import { renderRecipe } from './recipe.js';

const view = document.getElementById('view');

// Filter choices live here, not in the views, so they survive a trip to a
// recipe and back, and are saved so they survive a visit.
let state = null;
let ctx = null;
let firstRoute = true;

function stateFrom(prefs, present) {
  return {
    stores: new Set(present.filter((s) => !prefs.storesOff.includes(s))),
    search: prefs.search,
    category: prefs.category,
    sort: prefs.sort,
    maxCost: prefs.maxCost,
    maxMinutes: prefs.maxMinutes,
    servings: prefs.servings,
    recipeSort: prefs.recipeSort,
  };
}

async function boot() {
  const adapter = getAdapter('seed', { basePath: './data' });
  let ingredients;
  let snapshot;
  let bank;
  try {
    ({ ingredients, snapshot, bank } = await adapter.loadAll());
  } catch (err) {
    fail(err);
    return;
  }

  const allOffers = snapshot.offers ?? [];
  // The store list comes from the data, so a store added to the snapshot
  // appears in the picker on its own.
  const present = storesInOffers(allOffers);
  state = stateFrom(loadPrefs(), present);

  ctx = {
    live: adapter.isLive(),
    ingredients,
    snapshot,
    allOffers,
    present,
    // Everything downstream is costed against the picked shops only, so the
    // filter happens once here and every screen reads the same basket.
    rescope() {
      this.offers = allOffers.filter((o) => state.stores.has(o.store));
      this.priced = costRecipes(bank, { ...snapshot, offers: this.offers }, ingredients);
      this.pricedById = new Map(this.priced.map((p) => [p.recipe.id, p]));
      this.bestIds = new Set([...cheapestByIngredient(this.offers).values()].map((o) => o.id));
    },
    save() {
      savePrefs({
        storesOff: present.filter((s) => !state.stores.has(s)),
        search: state.search,
        category: state.category,
        sort: state.sort,
        maxCost: state.maxCost,
        maxMinutes: state.maxMinutes,
        servings: state.servings,
        recipeSort: state.recipeSort,
      });
    },
    reset() {
      state = stateFrom(DEFAULTS, present);
      this.rescope();
      clearPrefs();
      route();
    },
  };
  ctx.rescope();

  document.getElementById('footer-checked').textContent =
    `Prices checked ${longDate(snapshot.capturedAt)}. Always check in store.`;

  window.addEventListener('hashchange', route);
  route();
}

function parse(hash) {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { parts, params: new URLSearchParams(query) };
}

function route() {
  const { parts, params } = parse(location.hash);
  // Meals lead: with no hash the site opens on the recipes.
  const [section = 'recipes', id] = parts;

  let current = 'recipes';
  let title;
  if (section === 'offers') {
    current = 'offers';
    title = renderOffers(view, ctx, state);
  } else if (id) {
    title = renderRecipe(view, ctx, state, id);
  } else {
    title = renderRecipes(view, ctx, state, params);
  }

  document.title = `${title}, Yellow Label`;
  // The current page gets aria-current. On a recipe the Recipes link is the
  // section, not the page, so it is marked as a section instead.
  for (const link of document.querySelectorAll('[data-nav]')) {
    link.removeAttribute('aria-current');
    link.classList.toggle('nav__link--section', false);
    if (link.dataset.nav !== current) continue;
    if (id) link.classList.add('nav__link--section');
    else link.setAttribute('aria-current', 'page');
  }

  // After a navigation, start at the top and move focus to the new heading so
  // a screen reader announces the page. Not on first load, where focus belongs
  // to the browser.
  if (!firstRoute) {
    window.scrollTo(0, 0);
    view.querySelector('h1')?.focus();
  }
  firstRoute = false;
}

function fail(err) {
  view.innerHTML = `
    <div class="error" role="alert">
      <h1>Offer data did not load</h1>
      <p>Serve this folder over HTTP, not from file://, and check that data/ is present.</p>
    </div>`;
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
