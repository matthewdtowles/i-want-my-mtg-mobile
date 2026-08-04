// Component/screen tests only. The pure-helper suite under lib/ runs on
// node:test via tsx (`npm test`) and is deliberately left out of here — it is
// faster without a babel transform, and there is no reason to move it.
module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/__tests__/**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],
};
