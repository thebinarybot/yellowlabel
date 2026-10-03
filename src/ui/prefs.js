// Saved filter choices. localStorage throws in private mode and when site
// data is blocked, so every read and write is wrapped and a failure falls
// back to the defaults rather than taking the page down.

const KEY = 'yellow-label/prefs/v1';

/** A first visit with nothing saved renders from exactly this. */
export const DEFAULTS = {
  // Stores the user has ticked off. Storing the exclusions, not the
  // inclusions, means a store added to the data later arrives switched on.
  storesOff: [],
  search: '',
  category: '',
  sort: 'savingPct',
  maxCost: 0,
  maxMinutes: 0,
  servings: 0,
  recipeSort: 'cost',
};

// The allowed values for each choice. A value saved by an older version of
// the page that is no longer offered falls back to the default.
export const SORTS = ['savingPct', 'price', 'unitPrice'];
export const RECIPE_SORTS = ['cost', 'saving', 'time'];
export const COSTS = [0, 1.5, 2.5, 3.5];
export const MINUTES = [0, 45, 30, 20];
export const SERVINGS = [0, 1, 2, 3, 4, 5, 6, 8];
const CATEGORY = /^[a-z]{0,20}$/;

const pick = (value, allowed, fallback) =>
  allowed.includes(value) ? value : fallback;

/** Saved values are user editable, so each one is checked, not trusted. */
function clean(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULTS };
  return {
    storesOff: Array.isArray(raw.storesOff)
      ? raw.storesOff.filter((s) => typeof s === 'string')
      : [],
    search: typeof raw.search === 'string' ? raw.search.slice(0, 60) : '',
    category: typeof raw.category === 'string' && CATEGORY.test(raw.category) ? raw.category : '',
    sort: pick(raw.sort, SORTS, DEFAULTS.sort),
    maxCost: pick(Number(raw.maxCost), COSTS, DEFAULTS.maxCost),
    recipeSort: pick(raw.recipeSort, RECIPE_SORTS, DEFAULTS.recipeSort),
    maxMinutes: pick(Number(raw.maxMinutes), MINUTES, DEFAULTS.maxMinutes),
    servings: pick(Number(raw.servings), SERVINGS, DEFAULTS.servings),
  };
}

export function loadPrefs() {
  try {
    return clean(JSON.parse(localStorage.getItem(KEY)));
  } catch (err) {
    return { ...DEFAULTS };
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(clean(prefs)));
    return true;
  } catch (err) {
    return false;
  }
}

export function clearPrefs() {
  try {
    localStorage.removeItem(KEY);
    return true;
  } catch (err) {
    return false;
  }
}
