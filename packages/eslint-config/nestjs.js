/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["./base.js"],
  env: {
    node: true,
    jest: true,
    es2022: true,
  },
  rules: {
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": "off", // Allow console in backend
  },
};
