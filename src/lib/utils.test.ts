import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("склеює класи та відкидає порожні значення", () => {
    expect(cn("px-2", undefined, null, false, "py-1")).toBe("px-2 py-1");
  });

  it("підтримує умовні класи обʼєктом", () => {
    expect(cn("text-sm", { "font-bold": true, italic: false })).toBe(
      "text-sm font-bold",
    );
  });

  // Головна причина, чому cn існує: клас, переданий у компонент ззовні,
  // має перемагати дефолтний, а не дублюватись поруч із ним.
  it("розвʼязує конфлікт tailwind-класів на користь останнього", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("bg-primary text-sm", "bg-destructive")).toBe(
      "text-sm bg-destructive",
    );
  });
});
