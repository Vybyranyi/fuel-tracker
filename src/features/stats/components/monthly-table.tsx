import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MonthlyFuelStats } from "@/features/stats/domain/monthly-stats";
import { formatDecimal, formatMonth } from "@/lib/format";

/**
 * Ті самі числа, що на графіках, — текстом.
 *
 * Підказка при наведенні не може бути єдиним способом прочитати значення: на
 * телефоні наведення немає взагалі, а зчитувач екрана з неї нічого не візьме.
 * Тому таблиця не ховається за перемикачем, а просто лежить під графіками.
 *
 * Одиниці — у шапці, а не в кожній комірці. З «199,99 л» і «12 999,35 ₴» у
 * рядках таблиця не влазила в екран айфона, і остання колонка обрізалась.
 */
export function MonthlyTable({ months }: { months: MonthlyFuelStats[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Місяць</TableHead>
            <TableHead className="text-right">Літри</TableHead>
            <TableHead className="text-right">₴</TableHead>
            <TableHead className="text-right whitespace-nowrap">
              л/100&nbsp;км
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...months].reverse().map((month) => (
            <TableRow key={month.month}>
              <TableCell className="whitespace-nowrap">
                {formatMonth(month.month)}
              </TableCell>
              {/* Табличні цифри саме тут: у стовпці числа мають вирівнюватись
                  по розрядах, інакше їх незручно порівнювати згори вниз. */}
              <TableCell className="text-right tabular-nums">
                {formatDecimal(month.liters)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatDecimal(month.totalCost)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {month.consumptionPer100Km
                  ? formatDecimal(month.consumptionPer100Km)
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
