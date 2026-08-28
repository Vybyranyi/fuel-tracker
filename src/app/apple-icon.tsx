import { ImageResponse } from "next/og";

import { AppIcon } from "@/components/app-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Іконка для головного екрана iPhone.
 *
 * Тло непрозоре: iOS не підтримує прозорість у таких іконках і підклала б під
 * неї чорне, від чого гліф зник би.
 */
export default function AppleIcon() {
  return new ImageResponse(
    <AppIcon size={size.width} glyphRatio={2 / 3} background="white" />,
    { ...size },
  );
}
