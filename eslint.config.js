import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.next/**", "**/*.js", "**/*.cjs"]
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
      "react-hooks": reactHooks,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" }],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@manaratak/ui/*", "!@manaratak/ui"],
              message: "Please use public exports from @manaratak/ui."
            },
            {
              group: ["@manaratak/*/src/infrastructure/*"],
              message: "Clean architecture violation: Cannot import directly from infrastructure layers."
            }
          ]
        }
      ]
    },
  },
  {
    files: [
      "apps/web/src/features/international-tests/**/*.{ts,tsx}",
      "apps/api/src/presentation/api/router/InternationalTest*.ts",
      "packages/domain/src/tests-platform/**/*.ts",
      "packages/application/src/tests-platform/**/*.ts"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error"
    }
  }
];
