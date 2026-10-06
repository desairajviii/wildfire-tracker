import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "data/"] },
  js.configs.recommended,
  {
    files: ["backend/**/*.js"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["frontend/**/*.js"],
    languageOptions: { globals: globals.browser },
  },
];
