// Pure functions implementing the matching rule from wiki/build/problem.md.
//
//   A recipe is makeable when every essential ingredient has at least one
//   offer this week. Recipe cost is the sum of the cheapest offer per
//   ingredient, scaled by qty.
//
// No DOM here and no fetching. Give these plain objects, get plain objects
// back, so the UI decides everything about presentation.

/** Round to cents. Money arithmetic in floats drifts without this. */
export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Cheapest offer per ingredientKey, compared on unitPrice so unlike pack
 * sizes compare honestly.
 *
 * @param {import('./store-adapter.js').Offer[]} offers
 * @returns {Map<string, import('./store-adapter.js').Offer>}
 */
export function cheapestByIngredient(offers) {
  const best = new Map();
  for (const offer of offers) {
    const current = best.get(offer.ingredientKey);
    if (!current || offer.unitPrice < current.unitPrice) {
      best.set(offer.ingredientKey, offer);
    }
  }
  return best;
}

/** Every offer for one ingredient, cheapest unit price first. */
export function offersByIngredient(offers) {
  const groups = new Map();
  for (const offer of offers) {
    if (!groups.has(offer.ingredientKey)) groups.set(offer.ingredientKey, []);
    groups.get(offer.ingredientKey).push(offer);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.unitPrice - b.unitPrice);
  }
  return groups;
}

/**
 * What one offer saves against its own previous price, per unit.
 * Returns 0 when there is no previous price. Never a negative number.
 */
export function unitSaving(offer) {
  if (offer.wasPrice == null || !offer.price) return 0;
  const wasUnitPrice = offer.wasPrice * (offer.unitPrice / offer.price);
  return Math.max(0, wasUnitPrice - offer.unitPrice);
}

/**
 * Cost one recipe against this week's offers.
 *
 * cost covers only the lines that have an offer. When costIsPartial is true
 * something in the list is not on offer this week, so cost is the price of
 * what you can buy on offer, not the price of the finished dish. Label it
 * that way in the UI rather than printing it as a total.
 *
 * @param {import('./store-adapter.js').Recipe} recipe
 * @param {Map<string, import('./store-adapter.js').Offer>} best Output of cheapestByIngredient.
 * @param {Record<string, import('./store-adapter.js').Ingredient>} ingredients
 */
export function costRecipe(recipe, best, ingredients) {
  const lines = recipe.ingredients.map((item) => {
    const offer = best.get(item.ingredientKey) || null;
    const meta = ingredients[item.ingredientKey];
    return {
      ingredientKey: item.ingredientKey,
      label: meta ? meta.label : item.ingredientKey,
      qty: item.qty,
      unit: item.unit,
      essential: item.essential,
      offer,
      lineCost: offer ? round2(offer.unitPrice * item.qty) : null,
      lineSaving: offer ? round2(unitSaving(offer) * item.qty) : 0,
    };
  });

  const matched = lines.filter((line) => line.offer);
  const missing = lines.filter((line) => !line.offer);
  const makeable = lines.every((line) => !line.essential || line.offer);

  // Subtotal per store, so a user can see whether this is one shop or three.
  const byStore = new Map();
  for (const line of matched) {
    const store = line.offer.store;
    const entry = byStore.get(store) || { store, lines: 0, subtotal: 0 };
    entry.lines += 1;
    entry.subtotal = round2(entry.subtotal + line.lineCost);
    byStore.set(store, entry);
  }
  const storeSplit = [...byStore.values()].sort((a, b) => b.subtotal - a.subtotal);

  const cost = round2(matched.reduce((sum, line) => sum + line.lineCost, 0));
  const essentialCost = round2(
    matched.filter((l) => l.essential).reduce((sum, line) => sum + line.lineCost, 0),
  );
  const saving = round2(matched.reduce((sum, line) => sum + line.lineSaving, 0));

  return {
    recipe,
    makeable,
    lines,
    missing: missing.map((line) => ({ ingredientKey: line.ingredientKey, label: line.label, essential: line.essential })),
    cost,
    costIsPartial: missing.length > 0,
    essentialCost,
    costPerServing: recipe.servings ? round2(cost / recipe.servings) : null,
    saving,
    storeSplit,
    storeCount: storeSplit.length,
  };
}

/**
 * Cost the whole bank. Makeable recipes first, then cheapest per serving,
 * which is the order a user scanning for dinner actually wants.
 */
export function costRecipes(bank, snapshot, ingredients) {
  const best = cheapestByIngredient(snapshot.offers);
  return bank.recipes
    .map((recipe) => costRecipe(recipe, best, ingredients))
    .sort((a, b) => {
      if (a.makeable !== b.makeable) return a.makeable ? -1 : 1;
      return (a.costPerServing ?? Infinity) - (b.costPerServing ?? Infinity);
    });
}

/**
 * The headline list: for each ingredient, the one cheapest offer across the
 * three stores, ranked by how far the price has dropped.
 *
 * Ranking on percentage, not on unitPrice, is deliberate. Unit prices are
 * only comparable within one unit, so sorting a per kg price against a per
 * each price puts eggs above beef and means nothing. A percentage drop is
 * comparable across every unit.
 *
 * Offers with no previous price score 0 and sort to the bottom. They are
 * still the cheapest for their ingredient, which is why they are included.
 */
export function bestDeals(offers, ingredients) {
  return [...cheapestByIngredient(offers).entries()]
    .map(([key, offer]) => {
      const meta = ingredients[key];
      return {
        offer,
        ingredientKey: key,
        label: meta ? meta.label : key,
        category: meta ? meta.category : 'other',
        saving: round2(unitSaving(offer)),
        savingPct: offer.wasPrice ? Math.round((1 - offer.price / offer.wasPrice) * 100) : 0,
      };
    })
    .sort((a, b) => b.savingPct - a.savingPct || a.label.localeCompare(b.label));
}

// Sort keys the UI can offer without writing its own comparators.
//
// unitPrice only compares like with like. Use it inside one ingredient or one
// unit, not across the whole list, where a per each price would sit next to a
// per kg price. For a mixed list use bestDeals above, or the saving sort.
export const OFFER_SORTS = {
  price: (a, b) => a.price - b.price,
  unitPrice: (a, b) => a.unitPrice - b.unitPrice,
  saving: (a, b) => unitSaving(b) - unitSaving(a),
  store: (a, b) => a.store.localeCompare(b.store) || a.unitPrice - b.unitPrice,
  name: (a, b) => a.name.localeCompare(b.name),
};

/** Non mutating sort. Unknown key falls back to unit price. */
export function sortOffers(offers, key = 'unitPrice') {
  const cmp = OFFER_SORTS[key] || OFFER_SORTS.unitPrice;
  return [...offers].sort(cmp);
}
