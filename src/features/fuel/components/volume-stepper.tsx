"use client";

import { Button } from "@/components/ui/button";
import { decimal2FromNumber, type Decimal2 } from "@/lib/units";

/**
 * Кроки, які реально трапляються на заправці.
 *
 * «Залий на 20» звучить частіше за «залий 20.35», тому ±5 — основний крок,
 * а ±1 лишається для доведення до потрібного числа.
 */
const STEPS = [-5, -1, +1, +5] as const;

interface VolumeStepperProps {
  onStep: (delta: Decimal2) => void;
  disabled?: boolean;
}

/**
 * Кнопки під полем обʼєму, а не з боків.
 *
 * Заправку вносять з телефона однією рукою: ряд на всю ширину під інпутом
 * дає чотири великі цілі підряд, тоді як пара стрілок по краях поля — дві
 * маленькі, ще й у різних кутах екрана.
 */
export function VolumeStepper({ onStep, disabled }: VolumeStepperProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {STEPS.map((step) => (
        <Button
          key={step}
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => onStep(decimal2FromNumber(step))}
          className="h-11 text-base tabular-nums"
          aria-label={`${step > 0 ? "Додати" : "Відняти"} ${Math.abs(step)} літрів`}
        >
          {step > 0 ? `+${step}` : step}
        </Button>
      ))}
    </div>
  );
}
