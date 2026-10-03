# app handoff

## Summary

Single screen PWA, shelf edge label direction, built against the frozen
contract. Nothing outside the `app` scope was edited and the contract was not
changed.

Files written (all inside scope):

- `index.html` single scrolling view: masthead, offers, recipes, footer.
- `styles/label.css` the shelf edge label system.
- `src/ui/app.js` entry point. Reads through `SeedAdapter`, never from a JSON
  file directly, so a live source replaces the seed without a UI change.
- `src/ui/format.js` money, dates, week label, HTML escaping.
- `src/ui/match.js` offer index, cheapest per ingredient, recipe costing.
- `src/ui/offers.js` offer grid, store filter, four sorts.
- `src/ui/recipes.js` recipe cards.
- `manifest.webmanifest`, `sw.js`, `icons/icon.svg`.

What the screen does:

- Masthead carries a black band reading "Captured snapshot, not a live read.
  Captured 03 Oct 2026. Source: seed. Currency: EUR." It is written from
  `adapter.isLive()` and `snapshot.capturedAt`, so it cannot drift from the
  data. The footer repeats the counts and both dates.
- 72 offers render as labels. Store stamp, size, product name, price as the
  hero numeral, was price and saving, unit price, end date. The cheapest offer
  for an ingredient gets a yellow label and the line "cheapest this week".
- Controls: store filter (All, Aldi, Dunnes Stores, Lidl, multi select) and
  sort (shelf price, unit price, saving, store). Default is shelf price low to
  high.
- 14 recipe cards, makeable first then cheapest first. Each card shows total
  cost, cost per serving, a per ingredient table with the store each
  ingredient comes from, the shop split ("2 shops: Aldi 1.26, Lidl 0.60"), and
  the method behind a closed `details`.
- Matching follows the contract: makeable when every `essential: true`
  ingredient has an offer. Cost is the cheapest offer per ingredient by unit
  price, scaled by qty.

Three judgement calls, all on the side of not overstating the data:

1. Default sort is shelf price, not unit price. Unit price mixes "per kg" with
   "each" across different ingredients, which is not a like for like ordering.
   Unit price stays available as an option and the caveat is printed above the
   grid.
2. A recipe total only counts ingredients that have an offer. Cards that skip
   something now name it: "Total excludes 2 ingredients with no offer this
   week: Soy sauce, Scallions." Two cards show this.
3. Non makeable recipes are still shown, marked "1 item short", with the
   missing line marked "No offer, essential".

## Validation

Served with `python3 -m http.server 8731 --bind 127.0.0.1` from the repo root.
Driven with headless Chrome (`google-chrome --headless=new --dump-dom`), which
runs the modules and the service worker for real.

1. Asset check. `curl` on `index.html`, `styles/label.css`, `src/ui/app.js`,
   `src/ui/match.js`, `src/adapters/seed-adapter.js`, `data/offers.json`,
   `manifest.webmanifest`, `sw.js`, `icons/icon.svg`: all HTTP 200, correct
   content types (`application/manifest+json` for the manifest,
   `text/javascript` for the modules).
2. Render and console. `--dump-dom --enable-logging=stderr --log-level=0`:
   72 `li.label`, 14 `li.recipe`, 2 `recipe__caveat`. Count of `CONSOLE` lines
   in the Chrome log: **0**. The only stderr lines are the headless
   environment's own GL and ANGLE failures (`xcb_connect() failed`), which are
   not page errors.
3. Rendered copy read back out of the DOM: week stamp "Week 40 / 2026",
   snapshot band "Captured snapshot, not a live read. Captured 03 Oct 2026.
   Source: seed. Currency: EUR.", offer count "72 offers / 3 stores", recipe
   count "13 recipes makeable of 14", footer "72 offers, 41 ingredients,
   14 recipes."
4. Interaction. A script was injected into a temporary copy (`diag.html`,
   deleted straight after) to drive the controls and report through
   `document.title`. Result:
   `default=72 offers / 3 stores | priceAsc=true | lidlOnly=LIDL:21 offers /
   LIDL | savingDesc=true | backToAll=72 offers / 3 stores | focusOk=true |
   details=14`. So: default order really is price ascending, the store filter
   leaves only LIDL stamps, the saving sort really is descending, reset
   returns all 72, and a filter button takes focus.
5. Offline second load, run against the final files. Pass A with the server up
   on a fresh Chrome profile: 72 labels, 14 recipes. Server then stopped
   (`curl` reports "Failed to connect to 127.0.0.1 port 8731"). Pass B on the
   same profile, nothing serving: **72 labels, 14 recipes, 2 caveats, title
   "Week Prices, Aldi Dunnes Lidl"**. The page is served entirely from the
   service worker caches.
6. Writing and visual rules, scripted over every file owned: banned words 0,
   em dash and en dash 0, characters above U+2500 (emoji range) 0. One
   `border-radius` declaration exists and it is `border-radius: 0` on the
   universal selector. The only `box-shadow` is `6px 6px 0 var(--ink)`, a hard
   offset block. The only gradient is the barcode's
   `repeating-linear-gradient` with hard stops, drawn in CSS, not an image.
7. Contrast, computed to the WCAG formula. Ink on paper 18.04:1, ink on yellow
   14.80:1, small grey on yellow 5.45:1, white on Aldi 18.02:1, white on
   Dunnes 5.88:1, white on Lidl 7.70:1, white on the error red 4.91:1. Price
   red is used only on large numerals: 4.69:1 on paper and 3.85:1 on yellow,
   both over the 3:1 large text floor. No body copy is red.
8. `node --check` passes on `sw.js` and all five `src/ui/*.js` files.
9. Costing cross checked against the real data by hand: vegetable fried rice
   totals 1.86 from 0.60 + 0.75 + 0.12 + 0.39, with soy sauce and scallions at
   0.00 and named in the caveat. Chicken traybake picks Aldi potatoes at 0.80
   per kg over the Dunnes 2.99 pack, which is the correct cheapest by unit
   price.
10. Layout checked by screenshot at 1280px and at the narrowest viewport
    headless Chrome allows. Document `scrollWidth` equals the viewport width,
    so there is no horizontal overflow.

## Remaining Risks

- **Not verified: a real phone, Safari, Firefox, or a Lighthouse install
  audit.** Headless Chrome was the only browser used. The manifest ships one
  SVG icon at `sizes: "any"`, which Chrome accepts, but no PNG icon was
  produced, so an installability audit may still ask for one.
- **Narrow width below 500px was not observed directly.** Headless Chrome
  clamps its window to 500px wide, so the one column layout below that is
  covered by CSS (`minmax(min(226px, 100%), 1fr)`) rather than by a screenshot.
- **The shell cache is versioned by hand.** `sw.js` holds `VERSION = 'v1'` and
  serves shell files cache first. Anyone editing `index.html`, the CSS or the
  UI modules after a load must bump `VERSION` or hard reload, or they will keep
  seeing the cached shell. The three JSON files are stale while revalidate, so
  data changes from the `data` agent do land on the next load without a bump.
- **Counts move with the data.** Every number above was read at 13:05 on
  2026-10-03, against 72 offers, 41 ingredients and 14 recipes. If `data` adds
  more, the counts in this handoff go stale, the UI does not.
- **The recipe total is a shopping total, not a meal cost.** It prices the
  quantity the recipe asks for at the cheapest unit price, which is not the
  same as buying the pack. A 0.03 litre olive oil line costs 0.21 in the table,
  but the real purchase is a whole bottle. This is stated nowhere in the UI and
  is the clearest thing to fix next.
- **A static server is required.** `file://` blocks module imports and the
  service worker. The UI prints a red error block telling the user to serve the
  folder over HTTP if the load fails.
