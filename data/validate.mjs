// Contract and house style check for the three data files.
//
//   node data/validate.mjs
//
// Exits non zero on the first category of failure, printing every problem it
// found. Checks three things:
//
//   1. The frozen contract in wiki/build/problem.md, field by field.
//   2. The writing rules, over every string a user can read.
//   3. The matching rule, by actually costing the recipe bank.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { costRecipes, cheapestByIngredient, scaleRecipe, packQty, savingPct } from '../src/adapters/matching.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(readFileSync(join(here, f), 'utf8'));

const ingredients = read('ingredients.json');
const snapshot = read('offers.json');
const bank = read('recipes.json');

const problems = [];
const fail = (where, msg) => problems.push(`${where}: ${msg}`);

const STORES = new Set(['ALDI', 'DUNNES', 'LIDL', 'TESCO']);
const UNITS = new Set(['kg', 'litre', 'each', 'pack']);
const CATEGORIES = new Set(['protein', 'veg', 'fruit', 'dairy', 'pantry', 'bakery']);
const UNIT_LABEL = { kg: 'per kg', litre: 'per litre', each: 'each', pack: 'per pack' };
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// 1. Ingredients, the controlled vocabulary.
for (const [key, ing] of Object.entries(ingredients)) {
  const at = `ingredients.${key}`;
  if (!/^[a-z][a-z0-9_]*$/.test(key)) fail(at, 'key is not lower snake case');
  if (!ing.label) fail(at, 'missing label');
  if (!CATEGORIES.has(ing.category)) fail(at, `unknown category "${ing.category}"`);
  if (!UNITS.has(ing.unit)) fail(at, `unknown unit "${ing.unit}"`);
}

// 2. Offers.
for (const field of ['week', 'capturedAt', 'source', 'currency']) {
  if (!snapshot[field]) fail('offers.json', `missing ${field}`);
}
if (snapshot.source !== 'seed') fail('offers.json', 'source must be "seed" while the live adapter is a stub');
if (!ISO_DATE.test(snapshot.capturedAt || '')) fail('offers.json', 'capturedAt is not an ISO date');
if (!/^\d{4}-W\d{2}$/.test(snapshot.week || '')) fail('offers.json', 'week is not an ISO week');

const ids = new Set();
for (const offer of snapshot.offers) {
  const at = `offer ${offer.id}`;
  if (ids.has(offer.id)) fail(at, 'duplicate id');
  ids.add(offer.id);
  if (!STORES.has(offer.store)) fail(at, `unknown store "${offer.store}"`);
  const ing = ingredients[offer.ingredientKey];
  if (!ing) fail(at, `ingredientKey "${offer.ingredientKey}" is not in the vocabulary`);
  if (!offer.name) fail(at, 'missing name');
  if (!offer.size) fail(at, 'missing size');
  if (!(offer.price > 0)) fail(at, 'price must be above zero');
  if (offer.wasPrice !== null && !(offer.wasPrice > offer.price)) {
    fail(at, `wasPrice ${offer.wasPrice} is not above price ${offer.price}`);
  }
  if (!(offer.unitPrice > 0)) fail(at, 'unitPrice must be above zero');
  if (ing && offer.unitLabel !== UNIT_LABEL[ing.unit]) {
    fail(at, `unitLabel "${offer.unitLabel}" does not match the ${ing.unit} unit`);
  }
  if (!ISO_DATE.test(offer.validTo || '')) fail(at, 'validTo is not an ISO date');
  if (offer.validTo < snapshot.capturedAt) fail(at, 'validTo is before the capture date');
}

// 3. Recipes.
const recipeIds = new Set();
for (const recipe of bank.recipes) {
  const at = `recipe ${recipe.id}`;
  if (recipeIds.has(recipe.id)) fail(at, 'duplicate id');
  recipeIds.add(recipe.id);
  if (!recipe.title) fail(at, 'missing title');
  if (!(recipe.servings > 0)) fail(at, 'servings must be above zero');
  if (!(recipe.minutes > 0)) fail(at, 'minutes must be above zero');
  if (!recipe.steps || recipe.steps.length < 2) fail(at, 'needs at least two steps');
  if (!recipe.ingredients || recipe.ingredients.length === 0) fail(at, 'has no ingredients');
  const seen = new Set();
  for (const item of recipe.ingredients || []) {
    const ing = ingredients[item.ingredientKey];
    if (!ing) {
      fail(at, `ingredientKey "${item.ingredientKey}" is not in the vocabulary`);
      continue;
    }
    if (seen.has(item.ingredientKey)) fail(at, `lists ${item.ingredientKey} twice`);
    seen.add(item.ingredientKey);
    if (item.unit !== ing.unit) fail(at, `${item.ingredientKey} uses "${item.unit}" but the vocabulary says "${ing.unit}"`);
    if (!(item.qty > 0)) fail(at, `${item.ingredientKey} has a qty of ${item.qty}`);
    if (typeof item.essential !== 'boolean') fail(at, `${item.ingredientKey} essential is not a boolean`);
  }
  if (!(recipe.ingredients || []).some((i) => i.essential)) fail(at, 'has no essential ingredient');
}

// 4. Writing rules, over every string a user can read.
const BANNED = [
  'delve', 'seamless', 'seamlessly', 'effortless', 'effortlessly', 'elevate',
  'unlock', 'unleash', 'revolutionise', 'revolutionary', 'game changer',
  'game changing', 'harness', 'leverage', 'robust', 'cutting edge',
  'state of the art', 'empower', 'transform your', 'dive in', 'look no further',
  "in today's fast paced world", "it's worth noting", 'navigate the landscape',
  'tailored to your needs', 'curated selection',
];
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/u;

function checkText(where, value) {
  if (typeof value === 'string') {
    if (value.includes('\u2014')) fail(where, 'contains an em dash');
    if (value.includes('\u2013')) fail(where, 'contains an en dash');
    if (EMOJI.test(value)) fail(where, 'contains an emoji');
    const lower = value.toLowerCase();
    for (const word of BANNED) {
      if (new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower)) {
        fail(where, `uses the banned word "${word}"`);
      }
    }
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => checkText(`${where}[${i}]`, v));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) checkText(`${where}.${k}`, v);
  }
}
checkText('ingredients.json', ingredients);
checkText('offers.json', snapshot);
checkText('recipes.json', bank);

// 5. The matching rule, run for real.
const priced = costRecipes(bank, snapshot, ingredients);
const makeable = priced.filter((p) => p.makeable);
if (makeable.length === 0) fail('matching', 'no recipe is makeable from the offers this week');

// 6. The detail page rules: servings scaling, pack prices and percent saving.
for (const offer of snapshot.offers) {
  const size = packQty(offer);
  if (!(size > 0)) fail(`offer ${offer.id}`, 'pack size from price over unit price is not above zero');
  const pct = savingPct(offer);
  if (pct < 0 || pct > 100) fail(`offer ${offer.id}`, `saving of ${pct}% is out of range`);
  if (offer.wasPrice == null && pct !== 0) fail(`offer ${offer.id}`, 'has a saving with no previous price');
}
for (const p of priced) {
  const at = `scaling ${p.recipe.id}`;
  const base = scaleRecipe(p, p.recipe.servings);
  if (base.total !== p.cost) {
    fail(at, `total at the recipe's own servings is ${base.total}, costing says ${p.cost}`);
  }
  for (const servings of [1, 2, 7, 12]) {
    const scaled = scaleRecipe(p, servings);
    if (scaled.perServing !== p.costPerServing) fail(at, `per serving moved at ${servings} servings`);
    if (servings === 1 && scaled.total !== p.costPerServing) {
      fail(at, `total for 1 serving is ${scaled.total} but per serving is ${p.costPerServing}`);
    }
    if (Math.abs(scaled.total - p.costPerServing * servings) > 0.005 * servings + 0.005) {
      fail(at, `total ${scaled.total} at ${servings} servings does not match ${p.costPerServing} per serving`);
    }
    const lineCents = scaled.lines.reduce((t, l) => t + Math.round((l.lineCost ?? 0) * 100), 0);
    if (lineCents !== Math.round(scaled.total * 100)) {
      fail(at, `lines add up to ${(lineCents / 100).toFixed(2)} but the total is ${scaled.total} at ${servings} servings`);
    }
    for (const l of scaled.lines.filter((x) => x.offer)) {
      if (Math.abs(l.lineCost - l.offer.unitPrice * l.qty) >= 0.01) fail(at, `${l.ingredientKey} line is more than a cent off its exact cost`);
    }
    if (scaled.packTotal < scaled.total) fail(at, `full packs ${scaled.packTotal} cost less than the amounts used ${scaled.total}`);
    for (const line of scaled.lines.filter((l) => l.offer)) {
      if (line.packs * packQty(line.offer) < line.qty - 1e-6) fail(at, `${line.ingredientKey} packs do not cover the amount used`);
    }
  }
}

if (problems.length) {
  console.error(`FAIL: ${problems.length} problem(s)\n`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

const best = cheapestByIngredient(snapshot.offers);
const covered = Object.keys(ingredients).filter((k) => best.has(k));
console.log('PASS');
console.log(`  ingredients  ${Object.keys(ingredients).length} (${covered.length} with an offer this week)`);
console.log(`  offers       ${snapshot.offers.length} across ${new Set(snapshot.offers.map((o) => o.store)).size} stores, week ${snapshot.week}, captured ${snapshot.capturedAt}`);
console.log(`  recipes      ${bank.recipes.length} (${makeable.length} makeable)`);
console.log('');
for (const p of priced) {
  const flag = p.makeable ? ' ' : 'x';
  const split = p.storeSplit.map((s) => `${s.store} ${s.subtotal.toFixed(2)}`).join(', ');
  const miss = p.missing.length ? `  missing: ${p.missing.map((m) => m.ingredientKey + (m.essential ? '*' : '')).join(', ')}` : '';
  console.log(`  ${flag} ${p.recipe.title.padEnd(32)} ${String(p.cost.toFixed(2)).padStart(6)}  ${String(p.costPerServing.toFixed(2)).padStart(5)}/serving  saves ${p.saving.toFixed(2)}  [${split}]${miss}`);
}
