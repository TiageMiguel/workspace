import raycastConfig from "@raycast/eslint-config";
import perfectionist from "eslint-plugin-perfectionist";
import { defineConfig } from "eslint/config";

const config = defineConfig([
  ...raycastConfig,
  {
    plugins: {
      perfectionist,
    },
    rules: {
      "perfectionist/sort-imports": "error",
    },
  },
]);

export default config;
