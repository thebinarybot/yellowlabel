// The single import point for the UI.
//
//   import { getAdapter, costRecipes, sortOffers } from './src/adapters/index.js';
//   const adapter = getAdapter();
//   const { ingredients, snapshot, bank } = await adapter.loadAll();
//   const priced = costRecipes(bank, snapshot, ingredients);

export { StoreAdapter, STORES } from './store-adapter.js';
export { SeedAdapter } from './seed-adapter.js';
export { LiveAdapter } from './live-adapter.js';
export {
  round2,
  cheapestByIngredient,
  offersByIngredient,
  unitSaving,
  savingPct,
  packQty,
  costRecipe,
  scaleRecipe,
  costRecipes,
  bestDeals,
  sortOffers,
  OFFER_SORTS,
} from './matching.js';

import { SeedAdapter } from './seed-adapter.js';
import { LiveAdapter } from './live-adapter.js';

/**
 * Pick a source. 'seed' is the only one that works today, and it is the
 * default, so the UI can call getAdapter() with no argument.
 *
 * @param {'seed'|'live'} kind
 * @param {object} options Passed through. SeedAdapter takes a basePath.
 */
export function getAdapter(kind = 'seed', options = {}) {
  if (kind === 'live') return new LiveAdapter(options);
  if (kind === 'seed') return new SeedAdapter(options.basePath);
  throw new Error(`Unknown adapter: ${kind}`);
}
