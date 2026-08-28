import { ImageResponse } from "next/og";

import { AppIcon } from "@/components/app-icon";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Фавікон — без тла, щоб не світити білим прямокутником на темній панелі. */
export default function Icon() {
  return new ImageResponse(<AppIcon size={size.width} glyphRatio={3 / 4} />, {
    ...size,
  });
}
