# Architecture

Plain HTML, CSS and ES modules. No build step, no bundler, no dependencies.
The browser loads `index.html` and imports the modules directly.

```
index.html          markup and the two sections
styles/label.css    the shelf edge label design
src/ui/             rendering
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
import { getAdapter, bestDeals, costRecipes, sortOffers } from './src/adapters/index.js';

const adapter = getAdapter();
const { ingredients, snapshot, bank } = await adapter.loadAll();
```

`src/adapters/README.md` documents the full API field by field.

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

## Comparing prices honestly

`unitPrice` is per kg, per litre, per each or per pack depending on the
ingredient. It is only meaningful **within** a single ingredient.

Sorting all 72 offers by `unitPrice` across different units would rank eggs
above beef and look authoritative while being meaningless. `bestDeals` exists
to avoid that: it picks the cheapest shop per ingredient and ranks by the size
of the drop.

## Offline

`sw.js` precaches the shell and all three JSON files, so a second load works
with no network. `data/validate.mjs` is a Node script and is deliberately not
cached.
