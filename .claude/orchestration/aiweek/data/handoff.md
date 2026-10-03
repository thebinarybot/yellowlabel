# data handoff

## Summary

All three data files and the adapter layer are in place, built to the frozen
contract in PROBLEM.md. The contract was not changed.

**Files written** (all inside the `data` scope, nothing else touched):

| File | What it is |
| --- | --- |
| `data/ingredients.json` | 41 key controlled vocabulary. 38 have an offer this week. |
| `data/offers.json` | 72 offers, week 2026-W40, captured 2026-10-03, `source: "seed"`. |
| `data/recipes.json` | 14 recipes. 13 makeable from this week's offers, 1 not. |
| `data/validate.mjs` | Node check: contract, writing rules, matching rule. |
| `src/adapters/store-adapter.js` | The `StoreAdapter` interface and the typedefs. |
| `src/adapters/seed-adapter.js` | Reads `data/*.json`. The only adapter wired. |
| `src/adapters/live-adapter.js` | Stub. Throws `NotImplemented` with the reason. |
| `src/adapters/matching.js` | Pure costing and sorting. No DOM, no fetch. |
| `src/adapters/index.js` | Single import point for the UI. |
| `src/adapters/README.md` | The API the `app` agent calls, field by field. |

**For the `app` agent**, the whole surface is one import:

```js
import { getAdapter, bestDeals, costRecipes, sortOffers } from './src/adapters/index.js';
const adapter = getAdapter();
const { ingredients, snapshot, bank } = await adapter.loadAll();
```

Full API in `src/adapters/README.md`. Four things worth knowing:

1. `adapter.isLive()` returns `false`. Print `snapshot.capturedAt`
   (2026-10-03) and say the data is a captured snapshot.
2. `bestDeals(snapshot.offers, ingredients)` is the headline list: the
   cheapest store per ingredient, biggest percentage drop first. Use this
   rather than sorting all 72 offers by `unitPrice`, which would compare a per
   each price against a per kg price and rank eggs above beef.
3. `costRecipes(...)` returns `storeSplit` per recipe, which answers "is this
   one shop or three". Of the 14 recipes, 1 is a single store shop, 10 need
   two stores and 3 need all three, so the split is worth showing.
4. When `costIsPartial` is true, `cost` covers only the ingredients that are
   on offer, so do not print it as the price of the finished dish.

Service worker precache list is at the end of `src/adapters/README.md`.
`data/validate.mjs` is a Node script and must not be cached.

**Placeholder timing.** A three offer `offers.json` was written in the first
few minutes, before the full set, so `app` was not blocked waiting. It has
since been replaced by the full snapshot at the same path and the same shape.

**Deliberate gaps in the data**, so the matching rule is visibly doing work
rather than always saying yes:

- `prawn_raw` has no offer and is essential to `garlic-prawn-pasta`, so that
  recipe is not makeable and sorts last.
- `soy_sauce` and `scallion` have no offer and are both non essential in
  `veg-fried-rice`, so it stays makeable with two missing optional lines.

## Validation

Every claim below has a command behind it. All were run from the repo root.

**1. Contract, writing rules and matching rule.** `node data/validate.mjs`
exits 0:

```
PASS
  ingredients  41 (38 with an offer this week)
  offers       72 across 3 stores, week 2026-W40, captured 2026-10-03
  recipes      14 (13 makeable)
```

It then prints every recipe costed, cheapest per serving first, for example:

```
    Chicken traybake                   3.79   0.95/serving  saves 1.92  [ALDI 3.31, LIDL 0.48]
    Salmon and leek traybake          10.07   2.52/serving  saves 2.50  [LIDL 8.32, ALDI 1.75]
  x Garlic prawn pasta                 1.45   0.36/serving  saves 0.14  [...]  missing: prawn_raw*
```

What it checks: ingredient keys are snake case with a known category and
unit; every offer has a known store and a known `ingredientKey`, a price above
zero, a `wasPrice` that is either null or above the price, a `unitLabel` that
matches the ingredient unit, an ISO `validTo` not before the capture date, and
a unique id; every recipe ingredient key exists, its unit matches the
vocabulary, `qty` is above zero, `essential` is a boolean, no ingredient is
listed twice, and at least one is essential; and then it costs the whole bank
and asserts at least one recipe is makeable.

**2. The validator actually fails.** A PASS only means something if a FAIL is
reachable, so the data was copied to a scratch directory, eight faults were
seeded into the copy, and the validator caught all eight and exited 1:

```
FAIL: 8 problem(s)
  offer aldi-chicken-thigh-1kg: ingredientKey "unicorn_steak" is not in the vocabulary
  offer lidl-chicken-thigh-900g: wasPrice 0.1 is not above price 2.69
  offer dunnes-chicken-thigh-1kg: unitLabel "per bucket" does not match the kg unit
  recipe chicken-traybake: chicken_thigh uses "litre" but the vocabulary says "kg"
  recipe sausage-and-mash: servings must be above zero
  offers.json.offers[3].name: contains an em dash
  offers.json.offers[3].name: uses the banned word "unlock"
  offers.json.offers[3].name: uses the banned word "robust"
exit code: 1
```

The scratch copy was deleted. The real data was not modified, and
`node data/validate.mjs` passes again after the test.

**3. Served over HTTP, not just read from disk.** `python3 -m http.server`
on the repo root, then every shipped file requested:

```
data/ingredients.json              200 application/json
data/offers.json                   200 application/json
data/recipes.json                  200 application/json
src/adapters/index.js              200 text/javascript
src/adapters/matching.js           200 text/javascript
src/adapters/seed-adapter.js       200 text/javascript
src/adapters/store-adapter.js      200 text/javascript
src/adapters/live-adapter.js       200 text/javascript
```

`text/javascript` matters: ES module imports fail if the server sends the
wrong type.

**4. The adapter works end to end over that server**, with `basePath` pointed
at the HTTP origin, which is the same code path the browser takes:

```
adapter seed isLive false
loaded 41 ingredients, 72 offers, 14 recipes
chicken_thigh across stores: ALDI 2.49 < LIDL 2.99 < DUNNES 3.29
top recipe: Vegetable fried rice cost 1.86 partial true stores 2
live stub throws NotImplemented: LiveAdapter.loadOffers is a stub...
```

**5. Writing rules, over the source as well as the data.** The validator
covers every string in the three JSON files. Separately, a grep for em
dashes, en dashes and all 25 banned words was run over the JSON, the five
adapter modules and the README. No hits. A grep for any non ASCII byte across
all of those files returns nothing, so there are no emoji and no smart
punctuation anywhere in what this agent wrote.

**Not verified by me.** Three things are outside the files I own, so I did not
check them and they are the `app` agent's to confirm:

- `index.html` loading with no console errors.
- The service worker caching the three JSON files and a second load working
  offline.
- Anything about the rendered appearance, including the shelf edge label
  direction and the contrast floor.

## Remaining Risks

**Prices are invented, not captured.** This is the big one. `source: "seed"`
and `capturedAt` are honest in the data, and the UI is required to show them,
but the numbers themselves are plausible Irish supermarket prices written by
hand on 2026-10-03, not a reading of any store. They are not a record of what
Aldi, Dunnes or Lidl charged in week 2026-W40. If the demo is described out
loud, it should be described as a snapshot shaped like real offer data. The
`validTo` dates (7, 9 and 11 October 2026) are made up on the same basis.

**The live adapter is further from working than a stub suggests.** Two
blockers, neither of them code, both recorded in the file:

1. Endpoint discovery. `aldi.ie` returns 403 on `robots.txt` itself and sits
   behind bot protection. Dunnes and Lidl serve `robots.txt` with 200 and do
   not disallow offer pages, but guessed offer URLs 404, so the real
   endpoints are still unknown.
2. Same origin policy. A static client side PWA cannot fetch three
   supermarket domains directly. A live source needs a server side fetcher
   writing the same `offers.json` shape on a schedule, with the PWA still
   reading one local file. The interface is built so that swap does not touch
   the UI, but it is a different deployment shape to the one in the brief.

**Unit prices are only comparable within one unit.** `unitPrice` is per kg,
per litre, per each or per pack depending on the ingredient. Sorting the full
72 offer list by it is meaningless across units. `bestDeals` exists to avoid
this and the README says so, but nothing stops the UI calling
`sortOffers(offers, 'unitPrice')` on the whole list and rendering a ranking
that looks authoritative and is not.

**Pack quantities are ignored in costing.** A recipe needing 1 garlic bulb is
costed at the per bulb price, 0.30, but the shop sells a 3 pack for 0.89. The
recipe totals are therefore the cost of the quantity used, not the cost of the
trip to the shop, which is always higher. This is a reasonable prototype
choice and it is consistent across all 14 recipes, but a user reading "3.79"
for the chicken traybake will spend more than that at the till. The UI showing
`size` next to each line mitigates it. Fixing it properly means ceiling to
whole packs, which was out of scope for the time budget.

**Savings depend on a `wasPrice` that 20 of 72 offers do not have.** Those
score a saving of 0 and a `savingPct` of 0, which is correct and honest but
pushes genuinely cheap items with no previous price to the bottom of
`bestDeals`. Penne pasta at 0.69 per 500g is a good price and ranks last.

**No nutrition, allergen or dietary data, by instruction.** Recipes carry
title, servings, minutes, ingredients and steps only. Nothing in the data
supports a dietary filter, and none should be added without a real source.

**Recipe steps are not tested cooking.** They are written to be plausible and
specific. Quantities and times have not been cooked.
