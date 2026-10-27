import parser from "@typescript-eslint/parser";
export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.next-production/**",
      "artifacts/**",
      "test-results/**",
      "**/next-env.d.ts",
    ],
  },
  {
    files: ["**/*.{ts,tsx,mts}"],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-debugger": "error",
      "no-dupe-args": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-unreachable": "error",
      "no-unsafe-finally": "error",
      "valid-typeof": "error",
      "use-isnan": "error",
    },
  },
];
