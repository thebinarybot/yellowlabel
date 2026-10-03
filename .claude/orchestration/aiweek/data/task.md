# data task (round 2)

## Objective
Add Tesco to the offer data and keep every existing check passing.

## Scope
`data/*` only. Do not touch index.html, src/ui/* or styles.

## Work
1. Add `TESCO` as a valid store in `data/validate.mjs`. The contract in
   wiki/build/problem.md and `scripts/check` already allow it.
2. Add roughly 20 to 25 Tesco offers to `data/offers.json`, using existing
   `ingredientKey` values from the vocabulary. Do not invent new keys unless
   you also add them to `ingredients.json`.
3. Tesco must not be uniformly cheapest or dearest. It should win on some
   ingredients and lose on others, otherwise the store picker has nothing to
   show. Make sure at least two recipes change their cheapest store once
   Tesco is in.
4. Keep `source: "seed"`. The prices are sample data, not real Tesco prices.

## Constraints
- `node data/validate.mjs` and `node scripts/check` must both pass when done.
- Writing rules still apply: no em dashes, no banned words, no emoji.
- Do not change the contract shape. Only the set of valid stores changed.

## Time
About 25 minutes total for this round. Write the offers first, validate, then
stop. Do not refactor anything that already works.

## Seeded Local Overlays
- wiki/build/problem.md
- wiki/build/agents.md
