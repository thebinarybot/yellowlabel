# Yellow Label

Weekly supermarket offers across Aldi, Dunnes Stores and Lidl in Ireland, and
the meals those offers actually make. A single screen, installable, works
offline.

In the app a yellow label means that offer is the cheapest one for its
ingredient this week. That is where the name comes from.

> ## The prices in this repository are made up
>
> This is a prototype. `data/offers.json` contains **fabricated sample data**
> written by hand on 3 October 2026. It is shaped like real Irish supermarket
> offer data and the figures are plausible, but **it is not a record of what
> Aldi, Dunnes Stores or Lidl charged**, in week 40 of 2026 or at any other
> time. The `validTo` dates are invented on the same basis.
>
> This project is **not affiliated with, endorsed by, or connected to** Aldi,
> Dunnes Stores or Lidl. Those names appear only to label which fictional
> shop a sample price belongs to.
>
> Do not use these numbers to decide where to shop.

## Run it

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`. Use `localhost` rather than an IP address:
service workers only register on `localhost` or HTTPS, so on a bare IP the
page renders but offline mode and the install prompt will not work.

No build step, no dependencies, no bundler. It is HTML, CSS and ES modules.

## What it does

**Offers.** 72 sample offers across the three shops, filterable by shop and
sortable. The cheapest offer for each ingredient is marked with a yellow
label. Every card shows size, unit price, previous price where one exists,
and the date the offer ends.

**What that cooks.** 14 recipes, 13 of them makeable from this week's offers.
Each one shows the total cost, the cost per serving, a line per ingredient
naming which shop is cheapest for it, and how many shops the trip needs. One
recipe is deliberately not makeable, so the matching rule is visibly doing
work rather than always saying yes.

A recipe counts as makeable when every ingredient marked essential has at
least one offer this week. Cost is the sum of the cheapest offer per
ingredient, scaled by the amount the recipe needs.

## Honest limitations

Beyond the fabricated prices above:

- **Recipe totals are less than the till total.** Costing uses the quantity a
  recipe needs, not whole packs. A recipe wanting one garlic bulb is costed at
  0.30, but the shop sells a three pack for 0.89. Consistent across all 14
  recipes, and each line shows the pack size, but the number is the cost of
  the ingredients used, not the cost of the shop.
- **Unit prices only compare inside one ingredient.** `unitPrice` is per kg,
  per litre, per each or per pack depending on the item. Sorting all 72 offers
  by it across different units would be meaningless, which is why the cheapest
  per ingredient view exists.
- **Twenty of the 72 offers have no previous price**, so they score a saving
  of zero. That is honest rather than wrong, but it pushes genuinely cheap
  items down the savings ranking.
- **No nutrition, allergen or dietary information**, deliberately. Nothing in
  the data supports it and none should be added without a real source.
- **Recipe steps have not been cooked.** They are written to be plausible and
  specific.

## Why the data is seeded rather than scraped

Checked on 3 October 2026, not assumed:

- `aldi.ie` returns HTTP 403 on `robots.txt` itself and on the specials page.
  It sits behind bot protection.
- `dunnesstores.com` and `lidl.ie` both serve `robots.txt` with HTTP 200 and
  neither disallows offer pages, but guessed offer URLs returned 404, so the
  real endpoints still need discovery.

There is a second problem that is not about permission. A static client side
PWA cannot fetch three supermarket domains directly because of the same origin
policy. A live version needs a server side fetcher writing the same
`offers.json` on a schedule, with the app still reading one local file.

So every shop sits behind a `StoreAdapter` interface. The seed adapter is the
only one wired. `src/adapters/live-adapter.js` is an explicit stub that throws
`NotImplemented` and records both blockers. Swapping in a real source does not
touch the UI.

## Layout

```
index.html                  the single screen
styles/label.css            shelf edge label design
src/ui/                     rendering, formatting, matching
src/adapters/               StoreAdapter, seed adapter, live stub, costing
data/                       ingredients, offers, recipes, validator
sw.js                       precaches the shell and the three JSON files
scripts/check               contract and writing rule checker
docs/ORCHESTRATION.md       how the agents that built this were run
```

## Checks

```bash
node data/validate.mjs   # data contract, writing rules, matching rule
node scripts/check       # contract plus the visual and writing rules
```

Both exit non zero on failure. `data/validate.mjs` was itself negative tested:
eight faults were seeded into a scratch copy of the data and all eight were
caught.

## How it was built

Two Claude agents working in parallel in tmux panes, one owning the data and
adapter layer and one owning the interface, against a data contract frozen
before either started. `docs/ORCHESTRATION.md` covers the setup, and the
per agent briefs, states and handoffs are in `.claude/orchestration/aiweek/`.
Those handoffs are kept in the repository on purpose: they record what each
agent did, what it verified, and what it decided not to do.

Built in a 90 minute window for an AI Week builder competition.

## Licence

MIT. See `LICENSE`.
