import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Кириличний шрифт для PDF читається з диска під час запиту, тож він має
   * лежати поруч із функцією. Трасування залежностей його не бачить — воно
   * ходить по імпортах, а шрифт відкривається за шляхом, — тому кажемо прямо.
   */
  outputFileTracingIncludes: {
    "/api/export": ["src/features/export/assets/*.ttf"],
  },
};

export default nextConfig;
