import { defineWranglerConfig } from "wrangler/experimental-config";

// dist only. The repo also holds the wiki, the agent rig and the validators,
// none of which belong on a public host. scripts/build-dist assembles it.
export default defineWranglerConfig({
  "assetsDirectory": "./dist"
});
