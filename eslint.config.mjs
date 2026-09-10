import next from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      // Local agent tooling, not part of the application.
      ".agents/**",
      ".claude/**",
      "qa-shots/**",
      "playwright-report/**",
      "test-results/**",
      "modeles-3D/**",
      ".model-build/**",
    ],
  },
  ...next,
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // The render loop is mutation-based by design.
    //
    // React Compiler's purity and immutability rules assume a tree that is
    // re-rendered when data changes. react-three-fiber deliberately does the
    // opposite: `useFrame` writes straight into three.js objects and refs sixty
    // to a hundred and twenty times a second precisely so that React never
    // re-renders. Following these rules here would mean routing scroll position
    // through component state, which is the one thing this architecture exists
    // to avoid.
    files: ["components/three/**/*.tsx", "lib/stage-store.ts"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
    },
  },
  {
    // Build tooling runs in Node, outside the bundler.
    files: ["scripts/**/*.mjs"],
    rules: { "import/no-anonymous-default-export": "off" },
  },
];

export default config;
