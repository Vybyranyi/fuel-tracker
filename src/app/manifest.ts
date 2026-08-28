import type { MetadataRoute } from "next";

/** Маніфест не залежить від запиту — статика. */
export const dynamic = "force-static";

/**
 * Маніфест PWA.
 *
 * Головне тут — `display: "standalone"`: саме він робить із вкладки застосунок
 * з власною іконкою. На iPhone це ще й умова для пуш-сповіщень — Safari дає
 * дозвіл на них лише тому, що додано на головний екран.
 *
 * Кольори — темні, бо темна тема стоїть за замовчуванням: `background_color`
 * малюється на екрані запуску ще до того, як завантажиться CSS, і світлий
 * прямокутник тут блимав би при кожному відкритті.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Пальне",
    short_name: "Пальне",
    description: "Облік заправок і витрат на пальне",
    lang: "uk",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
