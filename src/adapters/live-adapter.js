import { StoreAdapter } from './store-adapter.js';

/**
 * Placeholder for a real time source. Not wired, and it will not be wired
 * from the browser.
 *
 * What was checked on 2026-10-03, before writing this stub:
 *
 * - aldi.ie returns HTTP 403 on robots.txt itself and 403 on the specials
 *   page. It sits behind bot protection.
 * - dunnesstores.com serves robots.txt with HTTP 200. It disallows
 *   /account/*, /checkout/*, /busca/*, /quick-view/* and filter or sort query
 *   strings. Offer pages are not disallowed.
 * - lidl.ie serves robots.txt with HTTP 200. It disallows /q/search?id=* and
 *   every numeric prefixed path, /1* through /9*.
 * - Guessed offer URLs returned 404 on Dunnes and Lidl, so the real endpoints
 *   still need discovery.
 *
 * Two blockers stand between this stub and a working implementation, and
 * neither is a code problem:
 *
 * 1. Endpoint discovery. Nobody has found the offer URLs yet.
 * 2. Same origin policy. A static client side PWA cannot fetch three
 *    supermarket domains directly. A live source needs a server side fetcher
 *    that writes the same offers.json shape on a schedule, and the PWA keeps
 *    reading one local file. That keeps this interface unchanged.
 */
export class LiveAdapter extends StoreAdapter {
  constructor(options = {}) {
    super();
    this.options = options;
  }

  get name() {
    return 'live';
  }

  isLive() {
    return true;
  }

  async loadIngredients() {
    throw new NotImplemented('loadIngredients');
  }

  async loadOffers() {
    throw new NotImplemented('loadOffers');
  }

  async loadRecipes() {
    // Recipes are authored ahead of time and are never scraped, so even a
    // live offer source reads the same static bank.
    throw new NotImplemented('loadRecipes');
  }
}

class NotImplemented extends Error {
  constructor(method) {
    super(
      `LiveAdapter.${method} is a stub. Store endpoints are not discovered ` +
        `and a browser cannot fetch them cross origin. Use SeedAdapter.`,
    );
    this.name = 'NotImplemented';
  }
}
