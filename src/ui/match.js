// Offer to recipe matching and costing.
//
// The rule, from the frozen contract: a recipe is makeable when every
// essential ingredient has at least one offer this week. Cost is the sum of
// the cheapest offer per ingredient, scaled by qty.

import { round2 } from './format.js';

/** Quantities are scaled, so they need more than cents of precision. */
function round3(n) {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

/**
 * Group offers by ingredientKey, cheapest unit price first.
 * @returns {Map<string, Array>} key to sorted offers.
 */
export function indexOffers(offers) {
  const byKey = new Map();
  for (const offer of offers) {
    const list = byKey.get(offer.ingredientKey) ?? [];
    list.push(offer);
    byKey.set(offer.ingredientKey, list);
  }
  for (const list of byKey.values()) {
    list.sort((a, b) => a.unitPrice - b.unitPrice || a.price - b.price);
  }
  return byKey;
}

/** The set of offer ids that are the cheapest for their ingredient. */
export function bestOfferIds(byKey) {
  const ids = new Set();
  for (const list of byKey.values()) {
    if (list.length) ids.add(list[0].id);
  }
  return ids;
}

// wasPrice is a shelf price, so it has to be put on the same per unit footing
// as unitPrice before a saving can be scaled by a recipe quantity.
function unitWasPrice(offer) {
  if (!offer.wasPrice || !(offer.price > 0)) return offer.unitPrice;
  return offer.unitPrice * (offer.wasPrice / offer.price);
}

/**
 * Price one recipe against this week's offers.
 * @param {number} servingsWanted Household size, or 0 for the recipe's own.
 * @returns {{recipe, servings: number, makeable: boolean, total: number,
 *            saving: number, perServing: number, lines: Array, stores: Array,
 *            missingEssential: number}}
 */
export function costRecipe(recipe, byKey, ingredients, servingsWanted = 0) {
  const base = recipe.servings > 0 ? recipe.servings : 1;
  const servings = servingsWanted > 0 ? servingsWanted : base;
  const scale = servings / base;

  const lines = recipe.ingredients.map((item) => {
    const offers = byKey.get(item.ingredientKey) ?? [];
    const best = offers[0] ?? null;
    const meta = ingredients[item.ingredientKey] ?? null;
    const qty = round3(item.qty * scale);
    return {
      key: item.ingredientKey,
      label: meta?.label ?? item.ingredientKey,
      qty,
      unit: item.unit,
      essential: item.essential === true,
      offer: best,
      cost: best ? round2(best.unitPrice * qty) : 0,
      saving: best ? round2((unitWasPrice(best) - best.unitPrice) * qty) : 0,
    };
  });

  const missingEssential = lines.filter((l) => l.essential && !l.offer).length;
  const total = round2(lines.reduce((sum, l) => sum + l.cost, 0));
  const saving = round2(lines.reduce((sum, l) => sum + l.saving, 0));

  // Spend per store, so a user can see whether this is a one shop recipe.
  const spend = new Map();
  for (const line of lines) {
    if (!line.offer) continue;
    spend.set(line.offer.store, round2((spend.get(line.offer.store) ?? 0) + line.cost));
  }
  const stores = [...spend.entries()]
    .map(([store, amount]) => ({ store, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    recipe,
    servings,
    makeable: missingEssential === 0,
    missingEssential,
    total,
    saving,
    perServing: servings > 0 ? round2(total / servings) : total,
    lines,
    stores,
  };
}

const ORDER = {
  cost: (a, b) => a.total - b.total,
  saving: (a, b) => b.saving - a.saving || a.total - b.total,
};

/**
 * Cost every recipe, makeable ones first.
 * @param {number} servingsWanted Household size, or 0 for the recipe's own.
 * @param {'cost'|'saving'} order How to rank the makeable ones.
 */
export function costAll(recipes, byKey, ingredients, servingsWanted = 0, order = 'cost') {
  const rank = ORDER[order] ?? ORDER.cost;
  return recipes
    .map((r) => costRecipe(r, byKey, ingredients, servingsWanted))
    .sort((a, b) => {
      if (a.makeable !== b.makeable) return a.makeable ? -1 : 1;
      if (a.makeable) return rank(a, b);
      return a.missingEssential - b.missingEssential || a.total - b.total;
    });
}
