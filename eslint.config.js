// Flat ESLint config (ESLint 9+). eslint-config-expo bundles the Expo/React
// Native + react-hooks rules; see MB6.
const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: [
      "dist/*",
      ".expo/*",
      "node_modules/*",
      "lib/api/schema.ts", // generated from the OpenAPI spec
    ],
  },
  {
    // `jest.mock` factories are hoisted above the imports, so they can only
    // reach a module through `require()`.
    files: ["__tests__/**"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];
