import { Pencil } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteCarDialog } from "@/features/cars/components/delete-car-dialog";
import {
  describeCar,
  FUEL_TYPE_LABELS,
  type Car,
  type CarContents,
} from "@/features/cars/domain/car";

export interface CarListItem {
  car: Car;
  contents: CarContents;
}

interface CarListProps {
  items: CarListItem[];
  activeId: string;
}

export function CarList({ items, activeId }: CarListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map(({ car, contents }) => (
        <li
          key={car.id}
          className="flex items-center gap-2 rounded-xl border bg-card p-3"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{car.name}</span>
              {car.id === activeId ? (
                <Badge variant="secondary" className="shrink-0">
                  активне
                </Badge>
              ) : null}
            </div>
            <span className="truncate text-xs text-muted-foreground">
              {[describeCar(car), FUEL_TYPE_LABELS[car.fuelType]]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>

          <Button variant="ghost" size="icon" asChild>
            <Link href={`/cars/${car.id}`} aria-label={`Змінити ${car.name}`}>
              <Pencil aria-hidden />
            </Link>
          </Button>

          <DeleteCarDialog car={car} contents={contents} />
        </li>
      ))}
    </ul>
  );
}
