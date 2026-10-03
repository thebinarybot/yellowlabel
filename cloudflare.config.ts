import { defineConfig, triggers } from "cf/config";

export default defineConfig({
  worker: {
    "name": "yellowlabel",
    "compatibilityDate": "2026-09-25",
    "observability": {
      "enabled": true
    },
    // Served from yellowlabel.nithinr.com. A Workers route only fires when a
    // proxied DNS record exists for the hostname, so the AAAA 100:: placeholder
    // in the zone is load bearing, not decoration.
    "triggers": [
      triggers.fetch({ pattern: "yellowlabel.nithinr.com/*", zone: "nithinr.com" })
    ]
  }
});
