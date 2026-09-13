import js from "@eslint/js";

export default [
  { ignores: ["node_modules/**", "test-results/**", "playwright-report/**", ".work/**"] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      globals: Object.fromEntries([
        "chrome", "document", "location", "window", "Node", "MutationObserver", "queueMicrotask",
        "console", "process", "URL", "setTimeout", "Buffer"
      ].map(name => [name, "readonly"]))
    },
    rules: {
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
    }
  }
];
