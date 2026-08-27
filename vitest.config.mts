import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Справжній `server-only` кидає виняток поза React Server Components,
      // тож у тестах серверні модулі падали б уже на імпорті.
      "server-only": fileURLToPath(
        new URL("./src/test/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    // Тестуємо `domain` — чисті обчислення грошей, обʼєму, дат і агрегацій.
    // Їм не потрібен DOM, тому не платимо за нього часом запуску.
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      include: ["src/features/**/domain/**", "src/lib/**"],
      reporter: ["text", "html"],
    },
  },
});
