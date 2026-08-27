import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // TODO(deuda-tecnica): hay ~100 usos de `any` heredados en el código.
      // Se mantiene como warning para poder reducirlo de forma incremental
      // sin bloquear los gates funcionales del producto.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    ...eslintPluginPrettier,
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Prettier se mantiene instalado para formato explícito, pero no bloquea
      // el gate funcional de ESLint. Typecheck, tests y build siguen siendo
      // bloqueantes.
      "prettier/prettier": "off",
    },
  },
);
