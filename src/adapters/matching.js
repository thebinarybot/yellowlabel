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

  // Totals add the unrounded line costs and round once, so a cost per
  // serving times the servings lands on the total instead of drifting.
  const exact = (list, per) => round2(list.reduce((sum, line) => sum + per(line.offer) * line.qty, 0));
  const cost = exact(matched, (offer) => offer.unitPrice);
  const essentialCost = exact(matched.filter((l) => l.essential), (offer) => offer.unitPrice);
  const saving = exact(matched, unitSaving);
  const rawCost = matched.reduce((sum, line) => sum + line.offer.unitPrice * line.qty, 0);

  return {
    recipe,
    makeable,
    lines,
    missing: missing.map((line) => ({ ingredientKey: line.ingredientKey, label: line.label, essential: line.essential })),
    cost,
    costIsPartial: missing.length > 0,
    essentialCost,
    costPerServing: recipe.servings ? round2(rawCost / recipe.servings) : null,
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
        savingPct: savingPct(offer),
      };
    })
    .sort((a, b) => b.savingPct - a.savingPct || a.label.localeCompare(b.label));
}

/** Percentage drop against the previous price, rounded. 0 when there is none. */
export function savingPct(offer) {
  if (offer.wasPrice == null || !(offer.wasPrice > offer.price)) return 0;
  return Math.round((1 - offer.price / offer.wasPrice) * 100);
}

/**
 * How much one pack holds, in the ingredient's own unit (kg, litre, each or
 * pack). Worked out from price over unit price, so a "2 x 400g" size string
 * never needs parsing: 2.49 at 2.49 per kg is a 1 kg pack.
 */
export function packQty(offer) {
  if (!offer || !(offer.unitPrice > 0)) return null;
  return Math.round((offer.price / offer.unitPrice) * 1000) / 1000;
}

/**
 * A costed recipe rescaled to a number of servings, for the detail page.
 *
 * Per serving cost stays the recipe's own, because the amounts scale with
 * the servings. The total adds the unrounded lines and rounds once, so the
 * total for one serving is the per serving price. The cents of that total
 * are then shared out across the lines by largest remainder, so the printed
 * lines always add up to the printed total and each is within a cent of its
 * exact cost.
 *
 * packCost is what the whole packs cost at the till: packs needed is the
 * amount used over the pack size, rounded up, never fewer than one.
 *
 * @param {ReturnType<typeof costRecipe>} priced
 * @param {number} servings
 */
export function scaleRecipe(priced, servings) {
  const base = priced.recipe.servings || 1;
  const factor = servings / base;

  const lines = priced.lines.map((line) => {
    const qty = line.qty * factor;
    if (!line.offer) {
      return { ...line, qty, lineCost: null, lineSaving: 0, wasCost: null, packs: 0, packCost: null };
    }
    const lineCost = round2(line.offer.unitPrice * qty);
    const lineSaving = round2(unitSaving(line.offer) * qty);
    const size = packQty(line.offer);
    const packs = size ? Math.max(1, Math.ceil(qty / size - 1e-9)) : 1;
    return {
      ...line,
      qty,
      lineCost,
      lineSaving,
      wasCost: lineSaving > 0 ? round2(lineCost + lineSaving) : null,
      packs,
      packCost: round2(packs * line.offer.price),
    };
  });

  const onOffer = lines.filter((line) => line.offer);
  const exact = (per) => round2(onOffer.reduce((sum, line) => sum + per(line.offer) * line.qty, 0));
  const total = exact((offer) => offer.unitPrice);
  apportion(onOffer, total);

  return {
    servings,
    factor,
    lines,
    total,
    perServing: priced.costPerServing,
    saving: exact(unitSaving),
    packTotal: round2(onOffer.reduce((sum, line) => sum + line.packCost, 0)),
  };
}

/**
 * Set each line's lineCost so the lines add up to total exactly: every line
 * gets its exact cost rounded down to the cent, then the cents left over go
 * to the lines that lost the most in rounding.
 */
function apportion(lines, total) {
  const exactCents = lines.map((line) => line.offer.unitPrice * line.qty * 100);
  const cents = exactCents.map((c) => Math.floor(c + 1e-9));
  let left = Math.round(total * 100) - cents.reduce((a, b) => a + b, 0);
  const order = exactCents
    .map((c, i) => [c - cents[i], i])
    .sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    cents[i] += 1;
    left -= 1;
  }
  lines.forEach((line, i) => {
    line.lineCost = cents[i] / 100;
    if (line.wasCost != null) line.wasCost = round2(line.lineCost + line.lineSaving);
  });
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
  savingPct: (a, b) => savingPct(b) - savingPct(a) || a.price - b.price,
  store: (a, b) => a.store.localeCompare(b.store) || a.unitPrice - b.unitPrice,
  name: (a, b) => a.name.localeCompare(b.name),
};

/** Non mutating sort. Unknown key falls back to unit price. */
export function sortOffers(offers, key = 'unitPrice') {
  const cmp = OFFER_SORTS[key] || OFFER_SORTS.unitPrice;
  return [...offers].sort(cmp);
}
