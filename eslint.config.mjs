import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

/**
 * Архітектура проєкту — односпрямована:
 *
 *   domain ← repository ← service ← action ← UI
 *
 * `domain` — чисті обчислення (гроші, обʼєм, дати, агрегації). Саме там
 * найбільше цінності від тестів, тому шар має лишатись без БД, React і Next:
 * інакше його не можна запустити у вакуумі.
 *
 * Правила нижче роблять цей напрямок таким, що його неможливо порушити
 * непомітно, а не просто домовленістю в README.
 */

/** Шари всередині `src/features/<feature>/`, куди не можна імпортувати «вгору». */
const upwardLayers = {
  // `schemas` описують форму вхідних даних і спираються лише на domain:
  // їх читає і сервер, і форма, тож затягнути туди БД означало б потягнути
  // її і в клієнтський бандл.
  schemas: ["repository", "services", "actions", "components", "hooks"],
  repository: ["services", "actions", "components", "hooks"],
  services: ["actions", "components", "hooks"],
  actions: ["components", "hooks"],
};

const layerBoundaries = Object.entries(upwardLayers).map(
  ([layer, forbidden]) => ({
    files: [`src/features/*/${layer}/**/*.{ts,tsx}`],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: forbidden.map((target) => ({
            group: [
              `**/${target}/**`,
              `@/features/*/${target}`,
              `@/features/*/${target}/**`,
            ],
            message: `Шар «${layer}» не імпортує «${target}»: залежності йдуть лише вниз (domain ← repository ← service ← action ← UI).`,
          })),
        },
      ],
    },
  }),
);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Типозалежні правила. Вони ловлять саме те, на чому цей проєкт може
  // мовчки поламатись: незачекані проміси в server actions і в обробниках подій.
  {
    files: ["src/**/*.{ts,tsx}", "*.{ts,mts}"],
    ignores: ["src/components/ui/**"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      // eslint-config-next послаблює це до warn; для нового коду тримаємо error.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // `domain` — єдиний шар, який має лишатись повністю чистим.
  {
    files: ["src/features/*/domain/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/db", "@/db/**", "drizzle-orm", "drizzle-orm/**"],
              message:
                "domain не ходить у базу — приймай уже прочитані дані аргументом.",
            },
            {
              group: ["react", "react-dom", "next", "next/**", "server-only"],
              message:
                "domain не знає ні про React, ні про Next: це чисті функції.",
            },
            {
              group: [
                "**/repository/**",
                "**/services/**",
                "**/actions/**",
                "**/components/**",
                "**/hooks/**",
              ],
              message: "domain — найнижчий шар, він ні від кого не залежить.",
            },
          ],
        },
      ],
    },
  },

  ...layerBoundaries,

  // Обхід RLS — рівно для однієї потреби: щоденна задача не має користувача,
  // від імені якого можна читати, а обійти має всіх. Будь-де ще це означало б
  // тихо зняти захист, який ставили в базі.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/features/cron/**", "src/db/**"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/db/admin"],
              message:
                "Це підключення не бачить RLS. Запити від імені людини йдуть через withUser/withCarScope із @/db.",
            },
          ],
        },
      ],
    },
  },

  // UI звертається до даних тільки через server actions — не в репозиторій
  // і не в базу навпростець, інакше запит поїде в клієнтський бандл.
  {
    files: ["src/features/*/{components,hooks}/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/db",
                "@/db/**",
                "**/repository/**",
                "drizzle-orm",
                "drizzle-orm/**",
              ],
              message:
                "UI дістає дані через server actions, а не з БД напряму.",
            },
          ],
        },
      ],
    },
  },

  // `src/lib` — загальні утиліти, спільні для всіх фіч. Щойно вони почнуть
  // залежати від конкретної фічі чи від БД, це вже не утиліти.
  {
    files: ["src/lib/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/**", "@/db", "@/db/**"],
              message:
                "src/lib — загальні утиліти: вони не знають ні про фічі, ні про БД.",
            },
          ],
        },
      ],
    },
  },

  // Компоненти shadcn/ui доставляє CLI — ми їх не пишемо й не рефакторимо.
  {
    files: ["src/components/ui/**"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // Має лишатись останнім: вимикає правила, які конфліктують із Prettier.
  prettier,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
