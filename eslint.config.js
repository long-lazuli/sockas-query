// @ts-check

import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "no-case-declarations": "off",
    },
  },
);
