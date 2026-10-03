# app task (round 2)

## Objective
Cut the explanatory text, add a store picker and four filters, and remember
the user's choices locally.

## Scope
`index.html`, `src/ui/*`, `styles/*`, `manifest.webmanifest`, `sw.js`.
Do not touch `data/*` or `src/adapters/*`. The data agent is adding Tesco
offers to `data/offers.json` at the same time. Read stores from the data, do
not hardcode a list of four.

## 1. Remove this text

Delete these four strings entirely:

- "Offers across three Irish supermarkets, and what they cook. Prices in EUR."
- "Captured snapshot, not a live read. Captured 03 Oct 2026. Source: seed.
  Currency: EUR."
- "Yellow labels are the cheapest offer for that ingredient this week. Unit
  price compares like with like inside one ingredient only, so a per kg and an
  each price sorted together are not the same measure."
- "Cost is the cheapest offer per ingredient this week, scaled by the amount
  the recipe needs. Ingredients with no offer are priced at zero and called
  out on the line."

## 2. Replace the snapshot banner with a chip

In place of the removed banner, a small chip in the header reading
`SAMPLE DATA`. Styled like the existing store stamps: hard edges, no radius.
It must stay visible without scrolling. This is the only thing in the running
app telling a viewer the prices are not real, so it does not get removed or
hidden behind an interaction.

## 3. Store picker

Tick which stores you shop at. Everything is costed using only those stores.

- Read the store list from the offers data, so Tesco appears automatically.
- All stores on by default.
- Deselecting a store removes its offers and re-costs every recipe against
  what is left. A recipe that loses an essential ingredient becomes not
  makeable, and the count in the heading updates.
- Deselecting every store must not break the page. Show an empty state.

## 4. Filters

On offers: an ingredient search box, matching product name and ingredient.

On recipes:
- Cook time: under 20, under 30, under 45, any. `minutes` is already in the data.
- Servings: scale every recipe and its cost to the chosen household size.
  Default to the recipe's own servings. Cost scales with the quantity.
- Sort by saving as well as by cost.

## 5. Remember choices

Persist the store picker, servings and filters in `localStorage`.

- Wrap every read and write in try/catch. It throws in private mode.
- A first visit with nothing saved must render correctly.
- Include a visible reset control that clears the saved state.

## Constraints
- Shelf edge label direction holds: no border radius, no soft gradients, no
  emoji, no em dashes, no banned words.
- Controls must be keyboard reachable with a visible focus ring.
- `node scripts/check` must pass when done.

## Time
About 25 minutes. Order: text removals and chip first, then store picker,
then filters, then persistence. Each one working before you start the next.
If time runs out, stop at a working point rather than leaving a filter half
wired.

## Seeded Local Overlays
- wiki/build/problem.md
- wiki/build/agents.md
