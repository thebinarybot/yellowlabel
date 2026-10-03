# Architecture

Plain HTML, CSS and ES modules. No build step, no bundler, no dependencies.
The browser loads `index.html` and imports the modules directly.

```
index.html          header, footer and the view the router fills
styles/tokens.css   design tokens, as given in docs/offers-recipes-handover
styles/app.css      components, built only from the tokens
src/ui/             routing and rendering
src/adapters/       data access and costing
data/               the three JSON files
sw.js               precaches the shell and the data
```

## The two layers

`src/adapters/` knows about data and money. It has no DOM access and no
knowledge of how anything looks.

`src/ui/` knows about the DOM. It asks the adapter layer for data and for
costed recipes, then renders.

The boundary is one import:

```js
import { getAdapter, costRecipes, scaleRecipe, sortOffers } from './src/adapters/index.js';

const adapter = getAdapter();
const { ingredients, snapshot, bank } = await adapter.loadAll();
```

`src/adapters/README.md` documents the full API field by field.

## Screens and routing

Three screens, chosen by the URL hash, because a plain static server has no
fallback that sends unknown paths to `index.html`:

| Route | Module | Screen |
| --- | --- | --- |
| `#/recipes` (default) | `src/ui/recipes.js` | Recipes: shops, cost, cook time, servings, sort. `?uses=<ingredientKey>` narrows to one ingredient |
| `#/offers` | `src/ui/offers.js` | Weekly offers: shops, ingredient search, category, sort |
| `#/recipes/<id>` | `src/ui/recipe.js` | Recipe detail: servings stepper, pack prices, ingredients, method |

`src/ui/app.js` loads the data once, renders the view for the hash, and
moves focus to the new page heading. It holds the filter choices, so they
survive a trip to a recipe and back, and `src/ui/prefs.js` saves them in
localStorage between visits.

"Shops you use" (`src/ui/shops.js`) is shared by both list screens. The
offers listed, the cheapest offer per ingredient and every recipe cost are
worked out against the picked shops only. The store list comes from the
data, and the saved choice records the shops turned off, so a shop added to
the data later arrives switched on.

The design is the handover in `docs/offers-recipes-handover/`. Its full
product also has accounts, price alerts and a recipe builder; only the offers
and recipes screens are built. The recipe data has no allergen or equipment
fields, so the detail page says so rather than showing checks it cannot make.

## StoreAdapter

Every shop sits behind one interface, so where the data comes from is a
detail the interface layer never sees.

| Adapter | State |
| --- | --- |
| `seed-adapter.js` | Wired. Reads the three files in `data/`. |
| `live-adapter.js` | Stub. Throws `NotImplemented` and records why. |

`adapter.isLive()` returns false for the seed adapter, which is what drives
the snapshot notice in the interface.

Adding a real source means writing one more adapter against the same
interface. Nothing in `src/ui/` changes. See [Roadmap](roadmap.md) for what a
live source actually requires, which is more than writing the adapter.

## The join key

`ingredientKey` is the single key connecting the three data files. An offer
and a recipe ingredient refer to the same thing when their `ingredientKey`
matches, and `data/ingredients.json` is the controlled vocabulary of every
valid key.

Nothing invents a key. A key outside the vocabulary fails validation, because
a typo there does not crash anything, it just silently stops a recipe ever
matching an offer.

## Matching and costing

A recipe is **makeable** when every ingredient marked `essential` has at
least one offer this week. Non essential ingredients can be missing.

Cost is the sum of the cheapest offer per ingredient, scaled by the amount
the recipe needs. `costRecipes` also returns:

- `storeSplit`, how the cost divides across shops, which answers whether a
  recipe is one shop or three.
- `costIsPartial`, true when some ingredients had no offer. The cost then
  covers only part of the dish and must not be shown as the price of the
  finished meal.

`scaleRecipe(priced, servings)` rescales a costed recipe for the detail page.
Cost per serving stays fixed; the total is rounded once from the exact sum,
and its cents are shared across the lines by largest remainder, so the lines
always add up to the total. Each line also carries the whole packs needed and
their price. A pack's size is `price / unitPrice`, in the ingredient's unit,
so no size string is parsed.

## Comparing prices honestly

`unitPrice` is per kg, per litre, per each or per pack depending on the
ingredient. It is only meaningful **within** a single ingredient.

Sorting all 72 offers by `unitPrice` across different units would rank eggs
above beef and look authoritative while being meaningless. `bestDeals` exists
to avoid that: it picks the cheapest shop per ingredient and ranks by the size
of the drop.

## Offline

`sw.js` precaches the shell and all three JSON files, so a second load works
with no network. Shell files are served cache first, so bump `VERSION` in
`sw.js` after changing any of them. The web font comes from Google Fonts and
is not cached; offline, text falls back to the system font. `data/validate.mjs` is a Node script and is deliberately not
cached.
