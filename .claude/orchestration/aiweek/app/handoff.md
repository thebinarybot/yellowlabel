# app handoff (round 2)

## Summary

Round 2 cut the explanatory prose, replaced the snapshot banner with a header
chip, added a store picker and four filters, and persisted the choices in
`localStorage`. Nothing outside the `app` scope was touched and the frozen
contract was not changed.

Files changed, all inside scope:

- `index.html` masthead, new store picker bar, offer controls, recipe controls.
- `styles/label.css` picker, tick boxes, search input, reset button, sample
  chip, saving chip, Tesco accent.
- `src/ui/app.js` state, wiring, empty states, persistence.
- `src/ui/format.js` Tesco display name, `storesInOffers()`.
- `src/ui/match.js` servings scaling, per recipe saving, saving sort.
- `src/ui/offers.js` store picker, ingredient search.
- `src/ui/recipes.js` cook time filter, scaled servings line, saving chip.
- `src/ui/prefs.js` new. The `localStorage` wrapper.
- `sw.js` `prefs.js` added to the shell list, `VERSION` bumped to `v2`.

### 1. Text removals

All four strings are gone, verified by grep over `index.html`, `src/ui` and
`styles`. The `masthead__sub` and `snapshot` elements and their CSS rules were
removed with them, not left empty.

### 2. Sample data chip

`<p class="stamp stamp--sample">Sample data</p>` sits in the masthead top row
beside the week stamp, white on price red with a black border, no radius. It
is in the first 60px of the document at 1280px and at 390px, so it is visible
without scrolling on both. It is static markup with no interaction, so there
is no path that hides it. The footer still carries the capture date, the
source and both counts, written from `snapshot.capturedAt` and
`snapshot.source`, so the contract's "say it is a snapshot, show the date"
requirement is still met by data, not by a hardcoded string.

### 3. Store picker

One tick box per store found in `offers.json`, built by `storesInOffers()`,
which sorts the codes it finds into a known display order and puts anything it
does not recognise after them alphabetically. No list of stores is hardcoded in
the UI. Tesco appeared on its own when the `data` agent added it: the picker
now shows four.

Everything downstream reads one filtered array. `paint()` narrows the offers to
the ticked stores once, then re-indexes and re-costs every recipe against that
narrower basket, so the grid, the cheapest-this-week yellow flag, the recipe
totals, the store split and the makeable count all move together.

The saved value is the list of stores ticked **off**, not the list ticked on.
That way a store added to the snapshot later arrives switched on for a user who
already has saved preferences, which is what happened with Tesco.

### 4. Filters

- **Search** on the offers, matching the shelf name, the ingredient label and
  the ingredient key, so "broccoli", "Broccoli Head" and `broccoli` all work.
- **Cook time**: any, under 45, under 30, under 20, read off `recipe.minutes`.
- **Servings**: "As written" plus 1 to 6 and 8. Every quantity is scaled by
  `wanted / recipe.servings`, and cost follows the scaled quantity, so cost per
  serving stays constant and the card prints "6 servings / 35 min / scaled
  from 4". Cook time is not scaled, because a traybake for six does not take
  half again as long and inventing a number would be a made up claim.
- **Recipe sort**: total cost low to high, or saving high to low. Offer sort
  keeps its four options from round 1.

Recipe saving is computed per line, not per shelf price. `wasPrice` is a shelf
price, so it is put on the same per unit footing as `unitPrice`
(`unitPrice * wasPrice / price`) before being scaled by the recipe quantity.
Without that, a 900g pack and a 1kg pack would contribute savings that are not
comparable.

### 5. Persistence

`src/ui/prefs.js` owns one key, `yellow-label/prefs/v1`. Every read and write
is inside try/catch and returns the defaults or `false` on a throw. The stored
value is re-validated on the way in and on the way out against an allow list
per field, because it is user editable, so a hand edited `servings: 999` falls
back to the default instead of rendering a nonsense card. A first visit with
nothing saved renders from `DEFAULTS`. The reset button restores the defaults,
repaints, then clears the key, so storage is left genuinely empty rather than
holding a written-back copy of the defaults.

### Empty states

- No stores ticked: the offer grid and the recipe list both empty, with "No
  stores ticked. Tick at least one store to see offers." and "... to cost a
  recipe." The recipe list is deliberately not rendered as 14 cards reading
  0.00, which is what costing against an empty basket would otherwise produce.
- Search with no match: "No offers match that search."
- Cook time with no match: "No recipes under N min."

## Validation

Served with `python3 -m http.server 8731` from the repo root. Driven for real
in headless Chrome 135 over the DevTools Protocol, so the modules, the events
and `localStorage` all ran in a browser, not in a stub.

1. **Interaction, 12 steps, one live page.** Each step reports the two counts,
   the card and label totals, both empty states, the first card, and the raw
   `localStorage` value:
   - initial: `97 offers / 4 stores`, `13 recipes makeable of 14`, 97 labels,
     14 cards, saved `{"storesOff":[],...}`.
   - Tesco off: `72 offers / ALDI + DUNNES + LIDL`, 72 labels, first card cost
     moves 1.77 to 1.86, saved `{"storesOff":["TESCO"],...}`.
   - all four off: `0 offers / no stores`, `0 recipes makeable / no stores`,
     0 labels, 0 cards, both empty states shown with the right text.
   - all back on: returns to 97 / 13 of 14 exactly.
   - search "broccoli": 3 labels, recipe count unchanged.
   - search "zzzznope": 0 labels, "No offers match that search."
   - under 30: `3 recipes makeable of 4`, 4 cards.
   - under 20: `1 recipe makeable of 1`, 1 card, singular wording correct.
   - servings 8: first card 1.77 to 3.54, facts line "8 servings / 25 min /
     scaled from 4", per serving unchanged at 0.44.
   - sort by saving: first card changes from Vegetable fried rice to Salmon and
     leek traybake, which is the highest saving, not the lowest cost.
   - full page reload: counts, first card, servings select (8), cook time (0)
     and recipe sort (saving) all come back from storage.
   - reset: back to 97 / 13 of 14, servings "As written", first card Vegetable
     fried rice at 1.77.
2. **Console.** `Runtime.exceptionThrown` and `console.error` were subscribed
   for the whole run. Zero of either, on first load, across all 12 steps and
   after the reload. The only stderr in the Chrome log is the headless
   environment's own GL and ANGLE failures (`xcb_connect() failed`), which are
   not page errors.
3. **Offline second load.** Service worker reported `active`, then
   `Network.emulateNetworkConditions {offline: true}` and a navigate: 97
   labels, 14 recipe cards, chip still reading "Sample data". Served entirely
   from the `v2` caches.
4. **`localStorage` throwing.** `prefs.js` was exercised with a stub whose
   `getItem` returns `null`: returns `DEFAULTS`. Every accessor is inside
   try/catch, so a private window that throws on access falls back to the same
   path the first visit takes.
5. **Costing, cross checked in Node against the real data.** Store filter:
   13 makeable across four stores, 12 across Aldi plus Lidl, 8 across Aldi
   alone. Scaling: Vegetable fried rice 4 servings 1.77, 8 servings 3.54, per
   serving 0.44 both ways. Saving sort really does reorder: by saving the top
   three are Salmon and leek traybake (2.49), Chicken traybake (1.92), Chicken
   fajitas (1.73); by cost they are Vegetable fried rice (1.77), Cheese on
   toast (2.52), Mushroom pasta (2.71).
6. **`node scripts/check`: PASS**, no contract or style violations, against 97
   offers, 14 recipes, 41 ingredients. `node --check` passes on every file
   written.
7. **Writing and visual rules.** Banned words 0, em dashes 0, emoji 0, over the
   files owned. One `border-radius` declaration and it is `border-radius: 0` on
   the universal selector. The new tick boxes use `appearance: none` with a
   drawn 2px square, so no platform rounding leaks in. No gradient was added:
   the barcode's `repeating-linear-gradient` with hard stops is still the only
   one.
8. **Contrast, computed to the WCAG formula, for the new elements.** Sample
   chip white on price red 4.91:1. Reset button yellow on ink 14.80:1. Control
   legends and the search placeholder, grey on paper, 6.64:1. Search text
   18.04:1. Tick row ink on the off grey 16.35:1 and on yellow 14.80:1. Saving
   chip ink on yellow 14.80:1. Tesco stamp white on #00539F 7.67:1. All over
   4.5:1.
9. **Keyboard.** All ten new and existing controls are native `input`,
   `select` and `button` elements in document order, so they are tab
   reachable, and the existing `:focus-visible { outline: 3px solid var(--ink) }`
   covers them, including the `appearance: none` tick boxes.
10. **Layout.** Screenshots at 1280px and at 390px with a 2x device pixel
    ratio. `document.documentElement.scrollWidth > window.innerWidth` is
    `false` at 390px, so there is no horizontal overflow. The picker wraps to
    two rows on the phone and the chip is still above the fold.

## Remaining Risks

- **`.tick:has(input:checked)` needs `:has`.** It is what turns a ticked store
  row yellow. Chrome 105 and Safari 15.4 have it; an older browser loses the
  yellow fill but keeps the drawn tick inside the box, so the state is still
  readable. Not verified outside Chrome 135.
- **The store code is the only visible label in the picker.** "DUNNES" rather
  than "Dunnes Stores", because the stamp already prints the code and printing
  both read "DUNNES Dunnes Stores". The full name is there for a screen reader
  in a `.visually-hidden` span. A sighted user who does not know the
  abbreviation gets no expansion.
- **One saved key, version `v1`, with no migration.** Adding a field later is
  safe because `clean()` fills gaps from `DEFAULTS`, but changing the meaning
  of a field would need the key bumping to `v2`.
- **"Under 20 min" matches one recipe in the current bank.** The filter is
  correct, the data is thin at that end. Worth knowing before demoing that
  option.
- **The shell cache is still versioned by hand.** `sw.js` is now `v2`. Anyone
  editing `index.html`, the CSS or the UI modules must bump it again or hard
  reload, or they will keep seeing the cached shell. The three JSON files stay
  stale while revalidate, so `data` changes land without a bump.
- **The recipe total is still a shopping total, not a meal cost**, and
  scaling makes it more visible. It prices the quantity the recipe asks for at
  the cheapest unit price, so olive oil at 0.045 litre costs 0.31 while the
  real purchase is a bottle. Carried over from round 1 and still the clearest
  thing to fix next.
- **Counts move with the data.** Every number above was read at 13:50 on
  2026-10-03 against 97 offers, 41 ingredients and 14 recipes. If `data` adds
  more, this handoff goes stale, the UI does not.
- **Not verified: a real phone, Safari, Firefox, or a Lighthouse audit.**
  Headless Chrome 135 was the only browser used.

## Superseded after this handoff

Section 2 above describes a `SAMPLE DATA` chip in the masthead. The chip was
removed at the owner's request after this handoff was written, and its CSS
rule was removed with it. The footer still prints the capture date and the
source from the data. The repository README still states that the prices are
sample data.

The two sections were also swapped: meals now lead and offers sit below, so
the `recipes-head` heading changed from "What that cooks", which referred to
the offers above it, to "Meals this week". The skip link moved from `#offers`
to `#recipes`. `sw.js` was bumped to `v3` for those edits, per the cache
warning in Remaining Risks above.
