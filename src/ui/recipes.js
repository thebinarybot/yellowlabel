// Recipe cards: cost, per ingredient store breakdown, shop split, method.

import { esc, money, priceHtml, plural, storeName } from './format.js';

function lineHtml(line) {
  const qty = `${line.qty} ${esc(line.unit)}`;

  if (!line.offer) {
    const note = line.essential ? 'No offer, essential' : 'No offer, optional';
    return `
      <tr class="row--missing">
        <td>${esc(line.label)}<span class="basket__qty">${qty}. ${note}</span></td>
        <td><span class="stamp stamp--miss">None</span></td>
        <td>0.00</td>
      </tr>`;
  }

  return `
    <tr>
      <td>${esc(line.label)}<span class="basket__qty">${qty} at ${money(line.offer.unitPrice)} ${esc(line.offer.unitLabel)}</span></td>
      <td><span class="stamp stamp--${esc(line.offer.store)}">${esc(line.offer.store)}</span></td>
      <td>${money(line.cost)}</td>
    </tr>`;
}

function splitHtml(priced) {
  if (priced.stores.length === 0) return '';
  const parts = priced.stores
    .map((s) => `${esc(storeName(s.store))} ${money(s.amount)}`)
    .join(', ');
  const shops = plural(priced.stores.length, 'shop', 'shops');
  return `<p class="split">${shops}: ${parts}</p>`;
}

// The total is the sum of what is on offer. Anything with no offer this week
// contributes zero, so say so on the card rather than leaving it implied.
function caveatHtml(priced) {
  const missing = priced.lines.filter((l) => !l.offer);
  if (missing.length === 0) return '';
  const names = missing.map((l) => esc(l.label)).join(', ');
  return `<p class="recipe__caveat">Total excludes ${plural(missing.length, 'ingredient', 'ingredients')} with no offer this week: ${names}.</p>`;
}

function cardHtml(priced) {
  const { recipe } = priced;
  const flag = priced.makeable
    ? '<span class="stamp stamp--flag">Makeable</span>'
    : `<span class="stamp stamp--miss">${plural(priced.missingEssential, 'item short', 'items short')}</span>`;

  const facts = [
    plural(priced.servings, 'serving', 'servings'),
    `${recipe.minutes} min`,
  ];
  if (priced.servings !== recipe.servings) {
    facts.push(`scaled from ${recipe.servings}`);
  }

  const savingLine = priced.saving > 0
    ? `<span class="recipe__saving">Saves ${money(priced.saving)}</span>`
    : '';

  return `
    <li class="recipe${priced.makeable ? '' : ' recipe--short'}">
      <div class="recipe__head">
        <h3 class="recipe__title">${esc(recipe.title)}</h3>
        ${flag}
      </div>
      <p class="recipe__facts">${facts.join(' / ')}</p>
      <p class="recipe__cost">
        <span class="price">${priceHtml(priced.total)}</span>
        <span class="recipe__per">${money(priced.perServing)} per serving</span>
        ${savingLine}
      </p>
      <table class="basket">
        <caption>Cheapest offer per ingredient</caption>
        <thead>
          <tr><th scope="col">Ingredient</th><th scope="col">Store</th><th scope="col">Cost</th></tr>
        </thead>
        <tbody>${priced.lines.map(lineHtml).join('')}</tbody>
      </table>
      ${caveatHtml(priced)}
      ${splitHtml(priced)}
      <details class="method">
        <summary>Method</summary>
        <ol>${recipe.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      </details>
    </li>`;
}

/**
 * Render the cards that pass the cook time filter.
 * @returns {{shown: number, makeable: number}}
 */
export function renderRecipes(root, pricedRecipes, state) {
  const cap = state.maxMinutes;
  const shown = cap > 0
    ? pricedRecipes.filter((p) => p.recipe.minutes < cap)
    : pricedRecipes;

  root.innerHTML = shown.map(cardHtml).join('');
  return {
    shown: shown.length,
    makeable: shown.filter((p) => p.makeable).length,
  };
}
