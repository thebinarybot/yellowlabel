// StoreAdapter: the one interface the UI talks to.
//
// Every store source (seeded snapshot today, a live scraper later) implements
// this. The UI never reads a JSON file directly, so swapping the source is a
// one line change in src/adapters/index.js.
//
// @typedef {'ALDI'|'DUNNES'|'LIDL'|'TESCO'} StoreCode
//
// @typedef {Object} Ingredient
// @property {string} label      Display name, for example "Chicken thighs".
// @property {string} category   protein | veg | fruit | dairy | pantry | bakery
// @property {string} unit       kg | litre | each | pack
//
// @typedef {Object} Offer
// @property {string}    id
// @property {StoreCode} store
// @property {string}    ingredientKey  Key into the ingredients vocabulary.
// @property {string}    name           Shelf name as printed by the store.
// @property {string}    size           "1kg", "6 pack", "500g".
// @property {number}    price          Shelf price in EUR.
// @property {number|null} wasPrice     Previous price, or null when there is none.
// @property {number}    unitPrice      Price normalised to the ingredient unit.
// @property {string}    unitLabel      "per kg", "per litre", "each".
// @property {string}    validTo        ISO date the offer runs to.
//
// @typedef {Object} OfferSnapshot
// @property {string} week        ISO week, for example "2026-W40".
// @property {string} capturedAt  ISO date the snapshot was taken.
// @property {'seed'|'live'} source
// @property {string} currency
// @property {Offer[]} offers
//
// @typedef {Object} RecipeIngredient
// @property {string}  ingredientKey
// @property {number}  qty        Quantity in the ingredient's own unit.
// @property {string}  unit
// @property {boolean} essential  A recipe is only makeable if every essential
//                                ingredient has an offer this week.
//
// @typedef {Object} Recipe
// @property {string}   id
// @property {string}   title
// @property {number}   servings
// @property {number}   minutes
// @property {RecipeIngredient[]} ingredients
// @property {string[]} steps
//
// @typedef {Object} RecipeBank
// @property {string} generatedAt
// @property {Recipe[]} recipes

/**
 * Base class. Subclasses implement the three load methods.
 *
 * Contract for implementors:
 * - Each method returns a Promise and rejects with an Error on failure.
 * - Shapes match the typedefs above exactly. No extra required fields.
 * - isLive() tells the UI whether it may describe the data as current.
 *   The seed adapter returns false, so the UI must show the capture date.
 */
export class StoreAdapter {
  /** @returns {string} Short name for diagnostics. */
  get name() {
    return 'abstract';
  }

  /** @returns {boolean} True only for a real time source. */
  isLive() {
    return false;
  }

  /** @returns {Promise<Record<string, Ingredient>>} */
  async loadIngredients() {
    throw new Error('loadIngredients not implemented');
  }

  /** @returns {Promise<OfferSnapshot>} */
  async loadOffers() {
    throw new Error('loadOffers not implemented');
  }

  /** @returns {Promise<RecipeBank>} */
  async loadRecipes() {
    throw new Error('loadRecipes not implemented');
  }

  /**
   * Convenience: all three in parallel.
   * @returns {Promise<{ingredients: Record<string, Ingredient>, snapshot: OfferSnapshot, bank: RecipeBank}>}
   */
  async loadAll() {
    const [ingredients, snapshot, bank] = await Promise.all([
      this.loadIngredients(),
      this.loadOffers(),
      this.loadRecipes(),
    ]);
    return { ingredients, snapshot, bank };
  }
}

/** The store codes the app knows about, in display order. */
export const STORES = ['ALDI', 'DUNNES', 'LIDL', 'TESCO'];
