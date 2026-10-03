# Roadmap

What a real version needs, and what is currently approximate.

## Live offer data

The seed adapter is the only one wired. `src/adapters/live-adapter.js` is a
stub. Swapping in a real source does not touch the interface layer, but two
things stand in the way and neither is the adapter.

**The endpoints are not known.** Checked on 3 October 2026:

| Site | `robots.txt` | Notes |
| --- | --- | --- |
| `aldi.ie` | HTTP 403 | 403 on the specials page too. Behind bot protection. |
| `dunnesstores.com` | HTTP 200 | Disallows `/account`, `/checkout`, `/busca`, `/quick-view` and filter or sort query strings. Offer pages are not disallowed. |
| `lidl.ie` | HTTP 200 | Disallows `/q/search` and every numeric prefixed path. |

Guessed offer URLs returned 404 on both Dunnes and Lidl, so the real
endpoints still need finding. Anything built here should respect each site's
terms and `robots.txt`, and should not hammer them.

**It cannot run in the browser.** A static client side app cannot fetch three
supermarket domains directly because of the same origin policy. A live source
needs a server side fetcher writing the same `offers.json` shape on a
schedule, with the app still reading one local file. That is a different
deployment shape to the current one: the app stays static, but something has
to run behind it.

An interim option that needs no scraping is parsing a leaflet the user
supplies, which keeps the app static and sidesteps both problems.

## Pack rounding in costing

Costing currently uses the quantity a recipe needs, not whole packs. A recipe
wanting one garlic bulb is costed at 0.30, but the shop sells a three pack for
0.89.

The totals are therefore the cost of the ingredients used, not the cost of the
shop, which is always higher. It is consistent across all 14 recipes and each
line shows the pack size, but the number is optimistic.

Fixing it means ceiling each ingredient to whole packs and showing both
numbers: what the meal uses, and what the trip costs. That second number is
arguably the more useful one, and it changes which recipes look cheapest.

## Savings ranking

20 of the 72 offers have no previous price, so they score a saving of zero and
sink in any ranking by saving. Penne pasta at 0.69 for 500g is a good price
and ranks last.

A fairer ranking would compare against a reference price per ingredient rather
than against the previous price of that one offer.

## Smaller things

- **Shopping list.** The cross shop split is computed per recipe but there is
  no way to combine several recipes into one list and see the split for the
  whole trip.
- **Dietary filters.** Not possible with the current data, and nothing should
  be added without a real source for it. The recipes carry title, servings,
  time, ingredients and steps only, with no nutrition or allergen data.
- **Recipe steps.** Written to be plausible and specific, but never cooked.
- **More than one week.** Everything assumes a single current snapshot. Price
  history would make a saving claim defensible rather than relative to one
  previous price.
