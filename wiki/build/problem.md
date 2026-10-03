# Problem Statement

## Verbatim statement

Aldi, Dunnes Stores and Lidl publish weekly offers. Build a PWA where a user
lands on the site, sees the cheapest ingredients across those three stores this
week, and finds what recipes they can make from them.

Market: Ireland. Currency: EUR.

## Constraints

- **Time budget: 90 minutes.** Prototype quality is acceptable. Production
  readiness is not required.
- **Deploy target: local only.** Served from the folder by a static server.
- **No LLM at runtime.** There is no API key on this machine and the PWA is
  client side, so it cannot hold a secret anyway. All generated content is
  produced ahead of time and shipped as static JSON.
- **Offers are seeded, not scraped.** See "Why the data is seeded" below.

## Judging criteria assumed

A working demo beats a broken ambitious one. The app must load, show real
looking offer data, and produce recipes from it without a dead end.

## Decisions taken (interview, 2026-10-03)

| Decision | Choice |
| --- | --- |
| Offer data | Seeded weekly snapshot behind a `StoreAdapter` interface, live scraper stubbed |
| Recipes | Pre-generated bank, authored by Claude ahead of time, shipped static |
| Core flow | Deals to recipes: offers first, what they cook second |
| Stack | Vanilla HTML, CSS and JS. No build step. TypeScript only if it pays for itself |
| Visual direction | Shelf edge label (supermarket discount sticker). Since replaced by the design in `docs/offers-recipes-handover/` |
| Screens | One scrolling view |
| Agents | Two in parallel: `data` and `app` |

## Why the data is seeded

This was checked, not assumed, on 2026-10-03:

- `aldi.ie` returns **HTTP 403 on `robots.txt` itself** and 403 on the specials
  page. It sits behind bot protection. It is not scrapable in this time budget.
- `dunnesstores.com` serves `robots.txt` with HTTP 200 and disallows
  `/account/*`, `/checkout/*`, `/busca/*`, `/quick-view/*` and filter or sort
  query strings. Offer pages are not disallowed.
- `lidl.ie` serves `robots.txt` with HTTP 200 and disallows `/q/search?id=*`
  and every numeric prefixed path (`/1*` through `/9*`).

Guessed offer URLs returned 404 on both Dunnes and Lidl, so the real endpoints
still need discovery. That is a research task, not a 90 minute task.

The architecture therefore puts every store behind a `StoreAdapter` so a live
scraper can be dropped in later without touching the UI. The seed adapter is
the only one wired today. **Do not present seeded data as live.** The UI states
the data is a captured snapshot with its capture date.

---

# System Prompt

Both agents load this. It is the contract.

```
You are working on a 90 minute prototype: a PWA that shows this week's
supermarket offers across Aldi, Dunnes Stores and Lidl in Ireland, and the
recipes those offers unlock.

OPERATING RULES

1. Ship something that runs. A working narrow slice beats a broad broken one.
   If you are running out of time, cut scope, do not leave something half
   wired.
2. Stay inside your lane. Read AGENTS.md for what you own and what you must
   not touch. The two agents work in parallel on one small codebase, so
   editing outside your scope causes collisions.
3. The data contract below is frozen. Build against it. If you believe it must
   change, say so and stop, do not change it unilaterally, because the other
   agent is building against it right now.
4. Never present seeded data as live scraped data. The UI must say it is a
   captured snapshot and show the capture date.
5. No invented nutrition claims, no invented allergen advice, no health
   guidance. Prices and recipes only.

WRITING RULES, UI COPY AND CODE COMMENTS

These are hard requirements, not preferences.

- No em dashes anywhere. Use commas, colons, full stops or parentheses.
- Banned words and phrases: delve, seamless, seamlessly, effortless,
  effortlessly, elevate, unlock, unleash, revolutionise, revolutionary,
  game changer, game changing, harness, leverage (as a verb), robust,
  cutting edge, state of the art, empower, transform your, dive in,
  look no further, in today's fast paced world, it's worth noting,
  navigate the landscape, tailored to your needs, curated selection.
- No emoji in UI copy.
- No marketing voice. Write like a price label: short, factual, specific.
  "Chicken thighs, 1kg, 2.49 at Aldi, was 3.99" is correct.
  "Unlock effortless savings on premium poultry" is a failure.
- Numbers beat adjectives. "Saves 1.50" not "great value".

VISUAL DIRECTION: SHELF EDGE LABEL

The app should look like the printed discount labels on a supermarket shelf,
not like a web app.

- Hard edges. border-radius is 0 everywhere. No exceptions.
- No gradients, no glassmorphism, no blur, no soft drop shadows. Shadows, if
  any, are hard offset blocks (for example 4px 4px 0 #000).
- Palette: label yellow (#FFE500 range), price red (#E3000F range), ink black
  (#111), paper white (#FAFAF5). Store accents only where a store is named.
- Type: heavy condensed sans for prices and product names (for example
  Archivo Narrow, Oswald, or a system condensed stack). Price numerals are the
  largest thing on screen. Monospace for codes and small print.
- Price is the hero. Product name is secondary. Store name is a stamp.
- Barcode motif as a divider or footer element, drawn in CSS, not an image.
- Grid of labels, tight gutters, visible rules between rows.
- Motion is minimal and mechanical. No easing flourishes, no fade ins on
  scroll.

ACCESSIBILITY FLOOR

Contrast at least 4.5:1 for body text. Red on yellow fails that, so red is for
large price numerals only, never body copy. Every interactive element reachable
by keyboard with a visible focus ring (a hard 3px black outline suits the
direction).
```

---

# Data Contract (frozen)

Three files in `data/`. `ingredientKey` is the join between offers and recipes.
Both agents use the exact same keys or nothing matches.

## `data/ingredients.json`

The controlled vocabulary. Owned by the `data` agent. Nothing invents a key
that is not in here.

```json
{
  "chicken_thigh": { "label": "Chicken thighs", "category": "protein", "unit": "kg" },
  "broccoli":      { "label": "Broccoli",       "category": "veg",     "unit": "kg" }
}
```

## `data/offers.json`

```json
{
  "week": "2026-W40",
  "capturedAt": "2026-10-03",
  "source": "seed",
  "currency": "EUR",
  "offers": [
    {
      "id": "aldi-chicken-thigh-1kg",
      "store": "ALDI",
      "ingredientKey": "chicken_thigh",
      "name": "Chicken Thighs",
      "size": "1kg",
      "price": 2.49,
      "wasPrice": 3.99,
      "unitPrice": 2.49,
      "unitLabel": "per kg",
      "validTo": "2026-10-09"
    }
  ]
}
```

- `store` is one of `ALDI`, `DUNNES`, `LIDL`, `TESCO`.
- `wasPrice` may be `null` when there is no previous price.
- `unitPrice` and `unitLabel` exist so unlike sizes can be compared honestly.

## `data/recipes.json`

```json
{
  "generatedAt": "2026-10-03",
  "recipes": [
    {
      "id": "chicken-traybake",
      "title": "Chicken traybake",
      "servings": 4,
      "minutes": 45,
      "ingredients": [
        { "ingredientKey": "chicken_thigh", "qty": 1,   "unit": "kg", "essential": true },
        { "ingredientKey": "onion_brown",   "qty": 0.3, "unit": "kg", "essential": false }
      ],
      "steps": ["Heat oven to 200C.", "..."]
    }
  ]
}
```

## Matching rule

A recipe is **makeable** when every `essential: true` ingredient has at least
one offer this week. Recipe cost is the sum of the cheapest offer per
ingredient, scaled by `qty`. Show which store each ingredient comes from, and
the split across stores, because a user may not want three shops.

---

# Done means

- `index.html` loads from a static server with no console errors.
- Offers render as shelf edge labels, grouped or sortable by price.
- Below them, the recipes those offers make, each with a total cost and a per
  ingredient store breakdown.
- A visible note that the offer data is a snapshot captured on a given date.
- `manifest.webmanifest` and a service worker that caches the shell and the
  three JSON files, so a second load works offline.
- No banned words, no em dashes, no emoji, no rounded corners anywhere.
