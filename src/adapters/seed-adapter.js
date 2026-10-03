import { StoreAdapter } from './store-adapter.js';

/**
 * Reads the captured weekly snapshot shipped in data/.
 *
 * This is the only adapter wired today. The data is a snapshot, not a live
 * read, so isLive() is false and the UI prints snapshot.capturedAt.
 */
export class SeedAdapter extends StoreAdapter {
  /** @param {string} basePath Directory holding the three JSON files. */
  constructor(basePath = './data') {
    super();
    this.basePath = basePath.replace(/\/$/, '');
    this._cache = new Map();
  }

  get name() {
    return 'seed';
  }

  isLive() {
    return false;
  }

  /** Fetch once per file, then serve from memory. */
  async _read(file) {
    if (!this._cache.has(file)) {
      this._cache.set(
        file,
        fetch(`${this.basePath}/${file}`).then((res) => {
          if (!res.ok) {
            throw new Error(`Could not read ${file}: HTTP ${res.status}`);
          }
          return res.json();
        }).catch((err) => {
          // Drop the failed promise so a retry is possible after a reconnect.
          this._cache.delete(file);
          throw err;
        }),
      );
    }
    return this._cache.get(file);
  }

  async loadIngredients() {
    return this._read('ingredients.json');
  }

  async loadOffers() {
    return this._read('offers.json');
  }

  async loadRecipes() {
    return this._read('recipes.json');
  }
}
