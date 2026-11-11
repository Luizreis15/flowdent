// Fast lint tier. The type-aware rules live in eslint.typed.config.mjs
// (`npm run lint:typed`).
//
// Quality gates from soumatheusgomes/vibe-coding-toolkit (templates/eslint,
// rev 7ef68dd). The three quality/* rules are copied byte for byte into
// eslint-rules/ -- do not edit them; recopy from the same revision to update.
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

import quality from "./eslint-rules/index.cjs";

export default defineConfig([
  // Existing project config, preserved as it was.
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
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },

  // Quality gates. Severities set from the measured baseline: a rule with
  // violations starts at "warn" with its count noted; promote it back to
  // "error" when the count reaches zero.
  {
    files: ["src/**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}"],
    plugins: { quality },
    rules: {
      // Baseline 2026-11-11: 59 files over 350 lines.
      "quality/max-lines": ["warn", { max: 350 }],
      // No log adapter exists yet, so there is no "off" block for one.
      // Baseline 2026-11-11: 272 violations in 117 files.
      "quality/no-direct-console": [
        "warn",
        { logger: "a project logger module (none exists yet)" },
      ],
      // Presentation layers must go through hooks/services instead of
      // importing the Supabase client directly. `extensions` is omitted on
      // purpose: hooks in src/hooks/ are .tsx and are the right place for
      // data access.
      // Baseline 2026-11-11: 169 violations in 169 files.
      "quality/no-direct-data-access": [
        "warn",
        {
          modules: ["@/integrations/supabase/client"],
          bindings: ["supabase"],
          layers: ["/src/pages/", "/src/components/"],
        },
      ],
    },
  },

  {
    // Not hand-written code: Supabase-generated types, vendored shadcn/ui
    // component and a static data list. Excluded by decision on 2026-11-11.
    // Must stay AFTER the block that turns the rule on.
    files: [
      "src/integrations/supabase/types.ts",
      "src/components/ui/sidebar.tsx",
      "src/data/medicamentos.ts",
    ],
    rules: {
      "quality/max-lines": "off",
    },
  },

  {
    files: ["eslint-rules/**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { module: "readonly", require: "readonly" },
    },
  },

  globalIgnores([
    ".claude/**",
    "node_modules/**",
    "dist/**",
    "dist-ssr/**",
    "coverage/**",
    "**/*.tsbuildinfo",
    "package-lock.json",
  ]),
]);
