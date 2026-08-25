const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "dist/*",
      "android/*",
      ".expo/*",
      ".codex/*",
      ".agents/*",
      ".figma-import/*",
      ".validation/*",
      ".expo-validation/*",
      "screenshots/*",
      "scripts/*",
    ],
  },
  {
    files: ["src/lib/audio/AudioRuntime.tsx"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
  {
    files: ["jest.setup.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["src/__tests__/**/*.ts", "src/__tests__/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);
