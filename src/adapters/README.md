# Adapters

Owned by the `data` agent. The UI reads offers through here and never opens a
JSON file itself.

## The one import

```js
import { getAdapter, costRecipes, sortOffers } from './src/adapters/index.js';

const adapter = getAdapter();                 // SeedAdapter, reads ./data
const { ingredients, snapshot, bank } = await adapter.loadAll();

const offers = sortOffers(snapshot.offers, 'unitPrice');
const priced = costRecipes(bank, snapshot, ingredients);
```

If `index.html` is not in the same folder as `data/`, pass a base path:
`getAdapter('seed', { basePath: '../data' })`.

## What you get back

`snapshot` and `bank` are the raw contract shapes from PROBLEM.md.
`adapter.isLive()` returns `false`, so the UI must print
`snapshot.capturedAt` and say the data is a captured snapshot.

`costRecipes(bank, snapshot, ingredients)` returns one entry per recipe,
makeable first, then cheapest per serving:

| Field | Meaning |
| --- | --- |
| `recipe` | The untouched recipe object. |
| `makeable` | Every `essential` ingredient has an offer this week. |
| `lines[]` | One per recipe ingredient: `label`, `qty`, `unit`, `essential`, `offer` (or `null`), `lineCost`, `lineSaving`. |
| `missing[]` | Ingredients with no offer. `essential: true` is why a recipe is not makeable. |
| `cost` | Sum of the matched lines, in EUR. |
| `costIsPartial` | True when something is not on offer, so `cost` is not the price of the finished dish. Do not print it as a total when this is set. |
| `essentialCost` | Same sum over essential lines only. |
| `costPerServing` | `cost / recipe.servings`. |
| `saving` | Sum of line savings against each offer's own previous price. Zero where no previous price was published. |
| `storeSplit[]` | `{ store, lines, subtotal }`, biggest spend first. Answers "is this one shop or three". |
| `storeCount` | `storeSplit.length`. |

## The headline list

`bestDeals(snapshot.offers, ingredients)` gives one entry per ingredient: the
single cheapest offer for it across the three stores, biggest percentage drop
first. This is the "cheapest ingredients this week" list the brief asks for.

Each entry is `{ offer, ingredientKey, label, category, saving, savingPct }`.
Entries with no previous price have `savingPct: 0` and sort last. They are
still the cheapest for that ingredient, so they stay in the list.

It ranks on percentage rather than unit price on purpose. See the note below.

## Other helpers

- `sortOffers(offers, key)`, non mutating. Keys: `price`, `unitPrice`,
  `saving`, `store`, `name`. Default `unitPrice`.
- `cheapestByIngredient(offers)` returns a `Map` of key to the single
  cheapest offer, compared on `unitPrice`.
- `offersByIngredient(offers)` returns a `Map` of key to every offer for it,
  cheapest first. Use this for a "same item, other stores" row.
- `bestDeals(offers, ingredients)`, described above.
- `unitSaving(offer)` is the per unit drop against `wasPrice`, or `0`.
- `round2(n)` for cent safe money arithmetic.
- `STORES` is `['ALDI', 'DUNNES', 'LIDL']` in display order.

All of these are pure. No DOM, no fetch.

## Comparing prices honestly

Compare on `unitPrice`, not `price`. A 5kg bag of potatoes at 3.99 beats a
2kg bag at 1.99, and only `unitPrice` shows that. `price` and `size` are what
is printed on the shelf, so show those too.

`unitPrice` is only comparable within one unit. Sorting all 72 offers by it
puts eggs at 0.25 each above beef mince at 6.98 per kg, which tells a user
nothing. Sort by `unitPrice` inside one ingredient or one unit. For a mixed
list, use `bestDeals` or `sortOffers(offers, 'saving')`.

## Files to cache in the service worker

- `data/ingredients.json`
- `data/offers.json`
- `data/recipes.json`
- `src/adapters/index.js`, `store-adapter.js`, `seed-adapter.js`,
  `live-adapter.js`, `matching.js`

`data/validate.mjs` is a Node check, not shipped to the browser. Do not cache it.

## Checking the data

```
node data/validate.mjs
```

Checks the frozen contract field by field, the writing rules over every
string, and the matching rule by costing the whole bank. Non zero exit on
failure.
