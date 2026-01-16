import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "tests/integration/**/*.test.ts",
      "tests/unit/**/*.test.ts",
      "tests/e2e/**/*.test.ts",
    ],
    exclude: [
      "tests/ux/**/*.spec.ts",
      "node_modules/**",
    ],
  },
});
