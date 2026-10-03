// Recipe detail: the cost panel with a servings stepper and pack prices,
// the ingredients priced line by line, and the method.

import { scaleRecipe } from '../adapters/index.js';
import { amount, esc, inStoreOrder, listJoin, money, plural, storeName } from './format.js';

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 12;

function notFound(root) {
  root.innerHTML = `
    <div class="page__head">
      <a class="back" href="#/recipes">Back to recipes</a>
      <h1 tabindex="-1">Recipe not found</h1>
      <p class="lead">That recipe is not in this week's list. It may have been taken out with last week's offers.</p>
    </div>`;
  return 'Recipe not found';
}

function rowHtml(line, showPacks) {
  if (!line.offer) {
    return `
      <tr class="row--missing">
        <th scope="row">${esc(line.label)}${line.essential ? '' : ' <span class="caption">(optional)</span>'}</th>
        <td>${esc(amount(line.qty, line.unit))}</td>
        <td>No offer this week</td>
        <td class="num">Not counted</td>
      </tr>`;
  }
  const o = line.offer;
  const offerLine = line.wasCost != null
    ? `<div class="row__offer">Offer &middot; was <s>${money(line.wasCost)}</s></div>`
    : '';
  const packLine = showPacks
    ? `<div class="row__pack">Pack: ${money(line.packCost)} (${line.packs} &times; ${esc(o.size)})</div>`
    : '';
  return `
    <tr>
      <th scope="row">${esc(line.label)}</th>
      <td>${esc(amount(line.qty, line.unit))}</td>
      <td class="row__shop">${esc(storeName(o.store))}</td>
      <td class="num"><strong>${money(line.lineCost)}</strong>${offerLine}${packLine}</td>
    </tr>`;
}

export function renderRecipe(root, ctx, state, id) {
  const priced = ctx.pricedById.get(id);
  if (!priced) return notFound(root);

  const r = priced.recipe;
  // Opens at the household size picked on the recipes list, if there is one.
  const view = { servings: state.servings || r.servings, packs: false };
  const shops = listJoin(inStoreOrder(priced.storeSplit.map((s) => s.store)).map(storeName));
  const short = priced.missing.filter((m) => m.essential);
  const left = priced.missing.filter((m) => !m.essential);

  root.innerHTML = `
    <div class="page__head">
      <a class="back" href="#/recipes">Back to recipes</a>
      <h1 tabindex="-1">${esc(r.title)}</h1>
      <p class="lead">${r.minutes} min &middot; Serves ${r.servings}</p>
    </div>
    ${state.stores.size === 0 ? `
    <p class="panel notice notice--warn">No shops picked, so nothing here is costed. <a href="#/recipes">Pick your shops</a></p>` : ''}

    <div class="detail">
      <section class="cost" aria-labelledby="cost-h">
        <h2 class="cost__title" id="cost-h">Cost</h2>
        <p class="cost__per"><span class="price price--lg" id="cost-per"></span> <span>per serving</span></p>
        <p class="cost__total"><span id="cost-total-label"></span> <strong id="cost-total"></strong></p>
        <p class="cost__saving" id="cost-saving"></p>
        <div class="stepper">
          <span class="stepper__label" id="serv-l">Servings</span>
          <div class="stepper__controls" role="group" aria-labelledby="serv-l">
            <button type="button" class="stepper__button" id="serv-less" aria-label="Fewer servings">&minus;</button>
            <output class="stepper__value" id="serv-n" aria-live="polite"></output>
            <button type="button" class="stepper__button" id="serv-more" aria-label="More servings">+</button>
          </div>
        </div>
        <p class="caption"><span id="cost-caption"></span> <a href="#/recipes">Change shops</a></p>
        <button type="button" class="toggle" id="pack-toggle" aria-pressed="false">Show pack prices</button>
      </section>

      <div class="detail__main">
        ${short.length ? `
        <p class="panel notice notice--warn">Not makeable from this week's offers alone: no offer on ${esc(listJoin(short.map((m) => m.label.toLowerCase())))}.</p>` : ''}

        <section class="panel notice" aria-labelledby="allergy-h">
          <h2 class="notice__title" id="allergy-h">Allergens</h2>
          <p>Allergen information is not listed for these recipes yet. Always check the label.</p>
        </section>

        <section class="stack" aria-labelledby="ing-h">
          <h2 id="ing-h">Ingredients and cost</h2>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr><th scope="col">Ingredient</th><th scope="col">Amount</th><th scope="col">Shop</th><th scope="col" class="num">Cost</th></tr>
              </thead>
              <tbody id="ing-rows"></tbody>
              <tfoot>
                <tr><th scope="row" colspan="3">Total</th><td class="num table__total" id="ing-total"></td></tr>
              </tfoot>
            </table>
          </div>
          ${left.length ? `<p class="caption">The total leaves out ${esc(listJoin(left.map((m) => m.label.toLowerCase())))}, which ${left.length === 1 ? 'is' : 'are'} not on offer this week.</p>` : ''}
        </section>

        <section class="stack method" aria-labelledby="method-h">
          <h2 id="method-h">Method</h2>
          <ol class="method__steps">
            ${r.steps.map((step) => `<li>${esc(step)}</li>`).join('')}
          </ol>
        </section>
      </div>
    </div>`;

  const $ = (sel) => root.querySelector(sel);
  const less = $('#serv-less');
  const more = $('#serv-more');
  const toggle = $('#pack-toggle');

  function paint() {
    const s = scaleRecipe(priced, view.servings);
    $('#cost-per').textContent = money(s.perServing);
    $('#cost-total-label').textContent = `Total for ${plural(s.servings, 'serving', 'servings')}`;
    $('#cost-total').textContent = money(s.total);
    const saving = $('#cost-saving');
    saving.hidden = !(s.saving > 0);
    saving.textContent = `You save ${money(s.saving)} with this week's offers`;
    $('#serv-n').textContent = String(s.servings);
    less.disabled = s.servings <= MIN_SERVINGS;
    more.disabled = s.servings >= MAX_SERVINGS;
    $('#cost-caption').textContent = shops
      ? `Cost of the amounts used, from ${shops}. Buying full packs costs ${money(s.packTotal)}.`
      : 'None of your shops has these ingredients on offer this week.';
    toggle.setAttribute('aria-pressed', String(view.packs));
    toggle.textContent = view.packs ? 'Hide pack prices' : 'Show pack prices';
    $('#ing-rows').innerHTML = s.lines.map((line) => rowHtml(line, view.packs)).join('');
    $('#ing-total').innerHTML = money(s.total) +
      (view.packs ? `<div class="row__pack">Full packs: ${money(s.packTotal)}</div>` : '');
  }

  // A button disabled at a limit drops keyboard focus, so focus moves to the
  // other button rather than being lost.
  function step(by) {
    view.servings = Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, view.servings + by));
    paint();
    if (by < 0 && less.disabled) more.focus();
    if (by > 0 && more.disabled) less.focus();
  }
  less.addEventListener('click', () => step(-1));
  more.addEventListener('click', () => step(1));
  toggle.addEventListener('click', () => {
    view.packs = !view.packs;
    paint();
  });

  paint();
  return r.title;
}
