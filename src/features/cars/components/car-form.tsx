"use client";

import { Car as CarIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCarAction } from "@/features/cars/actions/cars.actions";
import {
  FUEL_TYPES,
  FUEL_TYPE_LABELS,
  type FuelType,
} from "@/features/cars/domain/car";

export function CarForm() {
  const [fuelType, setFuelType] = useState<FuelType>("petrol");
  const { execute, isPending, result } = useAction(createCarAction);

  const fieldError = (name: string): string | undefined =>
    (result.validationErrors as Record<string, { _errors?: string[] }>)?.[name]
      ?._errors?.[0];

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);

        execute({
          name: String(data.get("name") ?? ""),
          makeModel: String(data.get("makeModel") ?? ""),
          plate: String(data.get("plate") ?? ""),
          year: String(data.get("year") ?? ""),
          fuelType,
        });
      }}
    >
      <Field label="Назва" name="name" error={fieldError("name")}>
        <Input
          id="name"
          name="name"
          required
          autoFocus
          maxLength={40}
          placeholder="Октавія"
        />
      </Field>

      <Field label="Марка і модель" name="makeModel">
        <Input
          id="makeModel"
          name="makeModel"
          maxLength={60}
          placeholder="Skoda Octavia"
        />
      </Field>

      <Field label="Держномер" name="plate">
        <Input
          id="plate"
          name="plate"
          maxLength={16}
          autoCapitalize="characters"
          placeholder="AA1234BB"
        />
      </Field>

      <Field label="Рік" name="year" error={fieldError("year")}>
        <Input
          id="year"
          name="year"
          inputMode="numeric"
          maxLength={4}
          placeholder="2015"
        />
      </Field>

      <div className="flex flex-col gap-2">
        <Label htmlFor="fuelType">Пальне</Label>
        <Select
          value={fuelType}
          onValueChange={(value) => setFuelType(value as FuelType)}
        >
          <SelectTrigger id="fuelType" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FUEL_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {FUEL_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isPending} className="mt-2">
        <CarIcon aria-hidden />
        {isPending ? "Зберігаю…" : "Зберегти"}
      </Button>

      <p className="min-h-5 text-center text-sm text-destructive" role="alert">
        {result.serverError}
      </p>
    </form>
  );
}

/** Підпис, поле й місце під помилку — щоб її поява не смикала розкладку. */
function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
