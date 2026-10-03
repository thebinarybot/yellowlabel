// Weekly offers: shops, search, category and sort, then a grid of offer cards.

import { sortOffers, savingPct } from '../adapters/index.js';
import {
  CATEGORY_NAMES, esc, longDate, money, plural, shortDate, storeName, unitPrice,
} from './format.js';
import { shopsHtml, wireShops, noShopsMessage } from './shops.js';

// The sorts this screen offers, in the order the select lists them. Biggest
// saving ranks on percentage, which compares across units where a unit price
// does not.
const SORTS = [
  ['savingPct', 'Biggest saving'],
  ['price', 'Lowest price'],
  ['unitPrice', 'Lowest unit price'],
];

/** Match the shop's name and the ingredient label, so either term works. */
function matches(offer, ingredients, term) {
  if (!term) return true;
  const label = ingredients[offer.ingredientKey]?.label ?? '';
  return `${offer.name} ${label} ${offer.ingredientKey}`.toLowerCase().includes(term);
}

function cardHtml(offer, ingredients, isBest) {
  const meta = ingredients[offer.ingredientKey];
  const pct = savingPct(offer);
  const was = offer.wasPrice
    ? `<span class="offer__was">was <s>${money(offer.wasPrice)}</s></span>`
    : '';
  const chips = [];
  if (pct > 0) {
    chips.push(`<span class="chip chip--saving">Save ${money(offer.wasPrice - offer.price)} (${pct}%)</span>`);
  }
  if (isBest) chips.push('<span class="chip chip--best">Cheapest for this item</span>');

  return `
    <li>
      <article class="card offer">
        <p class="offer__shop">${esc(storeName(offer.store))}</p>
        <h2 class="offer__name">${esc(offer.name)}</h2>
        <p class="offer__size">${esc(offer.size)} &middot; ${esc(unitPrice(offer))}</p>
        <p class="offer__prices"><span class="price price--md">${money(offer.price)}</span>${was}</p>
        ${chips.length ? `<p class="chips">${chips.join('')}</p>` : ''}
        <p class="offer__ends">Ends ${esc(shortDate(offer.validTo))}</p>
        <a class="card__link" href="#/recipes?uses=${encodeURIComponent(offer.ingredientKey)}">Recipes using this<span class="visually-hidden">: ${esc(meta?.label ?? offer.name)}</span></a>
      </article>
    </li>`;
}

export function renderOffers(root, ctx, state) {
  const { ingredients, snapshot } = ctx;
  const used = new Set(ctx.allOffers.map((o) => ingredients[o.ingredientKey]?.category));
  const categories = Object.keys(CATEGORY_NAMES).filter((c) => used.has(c));
  const ends = [...new Set(ctx.allOffers.map((o) => o.validTo))].sort();

  const option = (value, label, selected) =>
    `<option value="${value}"${value === selected ? ' selected' : ''}>${esc(label)}</option>`;

  root.innerHTML = `
    <div class="page__head">
      <h1 tabindex="-1">Weekly offers</h1>
      <p class="lead">Prices captured ${esc(longDate(snapshot.capturedAt))}. Offers end between ${esc(shortDate(ends[0]))} and ${esc(shortDate(ends[ends.length - 1]))}.</p>
      <p class="irish" lang="ga">An luach is fearr, gach seachtain.</p>
    </div>

    <section class="panel filters" aria-label="Filter offers">
      ${shopsHtml(ctx, state)}
      <div class="filters__row">
        <label class="field field--grow">Find an ingredient
          <input type="search" class="input" id="offer-search" placeholder="chicken, broccoli, pasta" autocomplete="off" value="${esc(state.search)}">
        </label>
        <label class="field">Category
          <select class="select" id="offer-category">
            ${option('', 'All categories', state.category)}
            ${categories.map((c) => option(c, CATEGORY_NAMES[c], state.category)).join('')}
          </select>
        </label>
        <label class="field">Sort by
          <select class="select" id="offer-sort">
            ${SORTS.map(([value, label]) => option(value, label, state.sort)).join('')}
          </select>
        </label>
        <p class="count" role="status" id="offer-count"></p>
      </div>
    </section>

    <ul class="grid grid--offers" id="offer-grid"></ul>
    <div class="empty" id="offer-empty" hidden>
      <p class="empty__title"></p>
      <p class="empty__hint">Try another search, shop or category.</p>
      <button type="button" class="button button--secondary" id="offer-clear">Clear filters</button>
    </div>
    <p class="reset"><button type="button" class="link-button" id="offer-reset">Reset all saved choices</button></p>`;

  const grid = root.querySelector('#offer-grid');
  const empty = root.querySelector('#offer-empty');
  const count = root.querySelector('#offer-count');
  const search = root.querySelector('#offer-search');
  const category = root.querySelector('#offer-category');
  const sort = root.querySelector('#offer-sort');

  function paint() {
    const term = state.search.trim().toLowerCase();
    const shown = sortOffers(
      ctx.offers.filter((o) =>
        matches(o, ingredients, term) &&
        (!state.category || ingredients[o.ingredientKey]?.category === state.category)),
      state.sort,
    );
    grid.innerHTML = shown.map((o) => cardHtml(o, ingredients, ctx.bestIds.has(o.id))).join('');
    grid.hidden = shown.length === 0;
    empty.hidden = shown.length > 0;
    const noShops = noShopsMessage(state);
    empty.querySelector('.empty__title').textContent = noShops ?? 'No offers match these filters';
    empty.querySelector('.empty__hint').hidden = Boolean(noShops);
    empty.querySelector('button').hidden = Boolean(noShops);
    count.textContent = `Showing ${plural(shown.length, 'offer', 'offers')}`;
    ctx.save();
  }

  wireShops(root, ctx, state, paint);
  search.addEventListener('input', () => {
    state.search = search.value;
    paint();
  });
  category.addEventListener('change', () => {
    state.category = category.value;
    paint();
  });
  sort.addEventListener('change', () => {
    state.sort = sort.value;
    paint();
  });
  // Clear resets what narrows the list, not how it is ordered or which shops
  // are used, which are standing choices rather than a filter.
  root.querySelector('#offer-clear').addEventListener('click', () => {
    state.search = '';
    state.category = '';
    search.value = '';
    category.value = '';
    paint();
    search.focus();
  });
  root.querySelector('#offer-reset').addEventListener('click', () => ctx.reset());

  paint();
  return 'Weekly offers';
}
