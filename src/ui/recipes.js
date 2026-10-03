// Recipes: shops, cost, time and servings, then a grid of recipe cards. Each
// card links to its detail page.

import { scaleRecipe } from '../adapters/index.js';
import { esc, inStoreOrder, money, plural, storeName, listJoin } from './format.js';
import { shopsHtml, wireShops, noShopsMessage } from './shops.js';

const COSTS = [[0, 'Any'], [1.5, 'Under €1.50'], [2.5, 'Under €2.50'], [3.5, 'Under €3.50']];
const TIMES = [[0, 'Any'], [45, 'Under 45 min'], [30, 'Under 30 min'], [20, 'Under 20 min']];
const SERVINGS = [[0, 'As written'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6'], [8, '8']];

// Recipes that are short an essential ingredient always sort after the ones
// you can make, whatever the chosen order.
const SORTS = [
  ['cost', 'Lowest cost per serving', (a, b) => a.costPerServing - b.costPerServing],
  ['saving', 'Biggest saving', (a, b) => b.saving - a.saving],
  ['time', 'Quickest', (a, b) => a.recipe.minutes - b.recipe.minutes],
];

function cardHtml(p, servings) {
  const r = p.recipe;
  const scaled = scaleRecipe(p, servings || r.servings);
  const short = p.missing.filter((m) => m.essential);
  const optional = p.missing.filter((m) => !m.essential);
  const chip = short.length
    ? `<span class="chip chip--warn">${plural(short.length, 'item', 'items')} short: no offer on ${esc(listJoin(short.map((m) => m.label.toLowerCase())))}</span>`
    : '';
  const partial = optional.length
    ? `<p class="recipe-card__note">Total leaves out ${esc(listJoin(optional.map((m) => m.label.toLowerCase())))}, not on offer this week.</p>`
    : '';
  const saving = scaled.saving > 0
    ? `<p class="recipe-card__saving">Saves ${money(scaled.saving)} with offers</p>`
    : '';
  const serves = scaled.servings === r.servings
    ? `Serves ${r.servings}`
    : `Serves ${scaled.servings}, scaled from ${r.servings}`;
  const shops = inStoreOrder(p.storeSplit.map((s) => s.store)).map(storeName);

  return `
    <li>
      <a class="card recipe-card" href="#/recipes/${encodeURIComponent(r.id)}">
        ${chip ? `<p class="chips">${chip}</p>` : ''}
        <h2 class="recipe-card__title">${esc(r.title)}</h2>
        <p class="recipe-card__price"><span class="price price--md">${money(p.costPerServing)}</span>
          <span class="recipe-card__per">per serving &middot; ${money(scaled.total)} total</span></p>
        ${saving}
        ${partial}
        <p class="recipe-card__meta">${serves} &middot; ${r.minutes} min &middot; ${esc(listJoin(shops))}</p>
      </a>
    </li>`;
}

export function renderRecipes(root, ctx, state, params) {
  const uses = params.get('uses');
  const usesLabel = uses ? ctx.ingredients[uses]?.label ?? uses : null;

  const option = (value, label, selected) =>
    `<option value="${value}"${value === selected ? ' selected' : ''}>${esc(label)}</option>`;

  root.innerHTML = `
    <div class="page__head">
      <h1 tabindex="-1">Recipes</h1>
      <p class="lead">Costed from this week's offers, using the cheapest of your shops for each ingredient.</p>
    </div>

    ${usesLabel ? `
    <p class="panel notice">Showing recipes that use <strong>${esc(usesLabel.toLowerCase())}</strong>.
      <a href="#/recipes">Show all recipes</a></p>` : ''}

    <section class="panel filters" aria-label="Filter recipes">
      ${shopsHtml(ctx, state)}
      <div class="filters__row">
        <label class="field">Cost per serving
          <select class="select" id="recipe-cost">
            ${COSTS.map(([v, l]) => option(v, l, state.maxCost)).join('')}
          </select>
        </label>
        <label class="field">Cook time
          <select class="select" id="recipe-time">
            ${TIMES.map(([v, l]) => option(v, l, state.maxMinutes)).join('')}
          </select>
        </label>
        <label class="field">Servings
          <select class="select" id="recipe-servings">
            ${SERVINGS.map(([v, l]) => option(v, l, state.servings)).join('')}
          </select>
        </label>
        <label class="field">Sort by
          <select class="select" id="recipe-sort">
            ${SORTS.map(([v, l]) => option(v, l, state.recipeSort)).join('')}
          </select>
        </label>
        <p class="count" role="status" id="recipe-count"></p>
      </div>
    </section>

    <ul class="grid grid--recipes" id="recipe-grid"></ul>
    <div class="empty" id="recipe-empty" hidden>
      <p class="empty__title"></p>
      <button type="button" class="button button--secondary" id="recipe-clear">Clear filters</button>
    </div>
    <p class="reset"><button type="button" class="link-button" id="recipe-reset">Reset all saved choices</button></p>`;

  const grid = root.querySelector('#recipe-grid');
  const empty = root.querySelector('#recipe-empty');
  const emptyTitle = empty.querySelector('.empty__title');
  const clear = root.querySelector('#recipe-clear');
  const count = root.querySelector('#recipe-count');
  const selects = {
    maxCost: root.querySelector('#recipe-cost'),
    maxMinutes: root.querySelector('#recipe-time'),
    servings: root.querySelector('#recipe-servings'),
    recipeSort: root.querySelector('#recipe-sort'),
  };

  function paint() {
    const cmp = (SORTS.find(([v]) => v === state.recipeSort) ?? SORTS[0])[2];
    // With no shop picked there is nothing to cost against, so every card
    // would read 0.00. Show the empty state instead.
    const shown = state.stores.size === 0 ? [] : ctx.priced
      .filter((p) =>
        (!uses || p.lines.some((l) => l.ingredientKey === uses)) &&
        (!state.maxCost || p.costPerServing < state.maxCost) &&
        (!state.maxMinutes || p.recipe.minutes < state.maxMinutes))
      .sort((a, b) => (a.makeable === b.makeable ? 0 : a.makeable ? -1 : 1) || cmp(a, b));
    grid.innerHTML = shown.map((p) => cardHtml(p, state.servings)).join('');
    grid.hidden = shown.length === 0;
    empty.hidden = shown.length > 0;
    // With no cost or time filter set, an empty list means nothing uses the
    // ingredient at all, and clearing filters would not help.
    const narrowed = Boolean(state.maxCost || state.maxMinutes);
    emptyTitle.textContent = noShopsMessage(state) ?? (narrowed || !usesLabel
      ? 'No recipes match these filters'
      : `No recipes use ${usesLabel.toLowerCase()} yet`);
    clear.hidden = !narrowed || state.stores.size === 0;
    count.textContent = plural(shown.length, 'recipe', 'recipes');
    ctx.save();
  }

  wireShops(root, ctx, state, paint);
  for (const [key, select] of Object.entries(selects)) {
    select.addEventListener('change', () => {
      state[key] = key === 'recipeSort' ? select.value : Number(select.value);
      paint();
    });
  }
  clear.addEventListener('click', () => {
    state.maxCost = 0;
    state.maxMinutes = 0;
    selects.maxCost.value = '0';
    selects.maxMinutes.value = '0';
    paint();
    selects.maxCost.focus();
  });
  root.querySelector('#recipe-reset').addEventListener('click', () => ctx.reset());

  paint();
  return usesLabel ? `Recipes using ${usesLabel.toLowerCase()}` : 'Recipes';
}
