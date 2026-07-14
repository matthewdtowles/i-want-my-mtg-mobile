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
];
