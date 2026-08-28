import { ImageResponse } from "next/og";

import { AppIcon } from "@/components/app-icon";

/**
 * Іконки, на які посилається маніфест.
 *
 * Малюються з коду й прораховуються під час збірки, а не лежать у `public`
 * готовими PNG: інакше в репозиторії з'явилися б бінарники, які ніяк не
 * звірити з джерелом — після зміни гліфа вони мовчки лишились би старими.
 */
const ICONS = {
  "icon-192.png": { size: 192, glyphRatio: 2 / 3 },
  "icon-512.png": { size: 512, glyphRatio: 2 / 3 },
  // Маскованій іконці система сама обріже краї під свою форму, тож гліф має
  // сидіти в центральній частині — звідси менша частка.
  "icon-maskable-512.png": { size: 512, glyphRatio: 1 / 2 },
} as const;

type IconName = keyof typeof ICONS;

export function generateStaticParams() {
  return Object.keys(ICONS).map((icon) => ({ icon }));
}

/** Іконки не залежать від запиту — хай лягають у статику при збірці. */
export const dynamic = "force-static";
/** Усе, чого немає в списку, — 404, а не спроба намалювати на льоту. */
export const dynamicParams = false;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ icon: string }> },
) {
  const { icon } = await params;
  const spec = ICONS[icon as IconName] as (typeof ICONS)[IconName] | undefined;

  if (!spec) return new Response("Not found", { status: 404 });

  return new ImageResponse(
    <AppIcon
      size={spec.size}
      glyphRatio={spec.glyphRatio}
      background="white"
    />,
    { width: spec.size, height: spec.size },
  );
}
