import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // The app's "@/..." import alias, so tests can load Route Handlers and the
    // modules they import. A regex, not the string "@", so scoped packages
    // such as "@supabase/supabase-js" and "@hashvest/web3" are left alone.
    alias: [
      {
        find: /^@\//,
        replacement: fileURLToPath(new URL("./", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
