// Offer to recipe matching and costing.
//
// The rule, from the frozen contract: a recipe is makeable when every
// essential ingredient has at least one offer this week. Cost is the sum of
// the cheapest offer per ingredient, scaled by qty.

import { round2 } from './format.js';

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

/**
 * Price one recipe against this week's offers.
 * @returns {{recipe, makeable: boolean, total: number, perServing: number,
 *            lines: Array, stores: Array, missingEssential: number}}
 */
export function costRecipe(recipe, byKey, ingredients) {
  const lines = recipe.ingredients.map((item) => {
    const offers = byKey.get(item.ingredientKey) ?? [];
    const best = offers[0] ?? null;
    const meta = ingredients[item.ingredientKey] ?? null;
    return {
      key: item.ingredientKey,
      label: meta?.label ?? item.ingredientKey,
      qty: item.qty,
      unit: item.unit,
      essential: item.essential === true,
      offer: best,
      cost: best ? round2(best.unitPrice * item.qty) : 0,
    };
  });

  const missingEssential = lines.filter((l) => l.essential && !l.offer).length;
  const total = round2(lines.reduce((sum, l) => sum + l.cost, 0));

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
    makeable: missingEssential === 0,
    missingEssential,
    total,
    perServing: recipe.servings > 0 ? round2(total / recipe.servings) : total,
    lines,
    stores,
  };
}

/** Cost every recipe, makeable ones first, then cheapest first. */
export function costAll(recipes, byKey, ingredients) {
  return recipes
    .map((r) => costRecipe(r, byKey, ingredients))
    .sort((a, b) => {
      if (a.makeable !== b.makeable) return a.makeable ? -1 : 1;
      if (a.makeable) return a.total - b.total;
      return a.missingEssential - b.missingEssential || a.total - b.total;
    });
}
