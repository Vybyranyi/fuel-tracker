import "server-only";

import {
  buildExportRow,
  type SheetRow,
} from "@/features/sheets-export/domain/export-row";
import * as repository from "@/features/sheets-export/repository/monthly-exports.repository";
import {
  createSheetsGateway,
  isSheetsConfigured,
  sheetsTabName,
  type SheetsGateway,
} from "@/features/sheets-export/services/google-sheets.gateway";
import type { MonthlyFuelStats } from "@/features/stats/domain/monthly-stats";
import { getStatsOverview } from "@/features/stats/services/stats.service";
import { monthKeyOf, todayInKyiv, type MonthKey } from "@/lib/date";
import { UserFacingError } from "@/lib/safe-action";

export type ExportResult =
  | { status: "exported"; period: MonthKey; row: SheetRow }
  /** Місяць уже вивантажували — повторний запуск нічого не робить. */
  | { status: "already-exported"; period: MonthKey }
  /** За місяць немає жодної заправки — писати в таблицю нічого. */
  | { status: "no-data"; period: MonthKey };

/**
 * Готує аркуш до запису.
 *
 * Аркуш може не існувати — тоді створюємо. Може існувати без шапки: людина
 * могла завести вкладку руками, побачивши, що така буде. Тому шапку пишемо не
 * лише слідом за створенням, а щоразу, коли перший рядок порожній.
 */
async function ensureSheetReady(
  gateway: SheetsGateway,
  tabName: string,
): Promise<void> {
  const titles = await gateway.listSheetTitles();

  if (!titles.includes(tabName)) {
    await gateway.createSheet(tabName);
    await gateway.writeHeader(tabName);
    return;
  }

  const header = await gateway.readHeader(tabName);
  if (header.length === 0) {
    await gateway.writeHeader(tabName);
  }
}

/**
 * Вивантажує один місяць.
 *
 * Порядок дій тут важливіший за самі дії. Спершу займаємо місяць у базі й лише
 * потім пишемо в Google: якби ми писали спочатку, два одночасні запуски крону
 * (а Versel не обіцяє рівно одного) дописали б два однакові рядки. Якщо ж
 * запис не вдався — місяць звільняємо, інакше він лишився б «вивантаженим»
 * назавжди, а рядка в таблиці не з'явилося б ніколи.
 */
export async function exportPeriod(
  period: MonthKey,
  gateway: SheetsGateway = createSheetsGateway(),
): Promise<ExportResult> {
  const { months } = await getStatsOverview();
  const stats: MonthlyFuelStats | undefined = months.find(
    (month) => month.month === period,
  );

  if (!stats) return { status: "no-data", period };

  const row = buildExportRow(stats);

  if (!(await repository.claimPeriod(period, row))) {
    return { status: "already-exported", period };
  }

  try {
    const tabName = sheetsTabName();
    await ensureSheetReady(gateway, tabName);
    await gateway.appendRow(tabName, row);
  } catch (error) {
    await repository.releasePeriod(period);

    // Підказку про доступ даємо лише тут, де помилка справді від Google:
    // майже завжди це «таблицю не розшарили на сервісний акаунт». Збій бази
    // сюди не потрапляє й піде загальним повідомленням — інакше застосунок
    // радив би перевіряти доступ до таблиці, коли лежить Postgres.
    console.error(`Не вдалося записати ${period} в Google Sheets`, error);
    throw new UserFacingError(
      "Не вдалося записати в таблицю. Перевір, чи відкрито до неї доступ сервісному акаунту.",
    );
  }

  return { status: "exported", period, row };
}

/** Стан вивантаження для сторінки налаштувань. */
export interface ExportStatus {
  configured: boolean;
  /** Місяці із заправками, які ще не потрапили в таблицю. */
  pending: MonthKey[];
  tabName: string;
}

export async function getExportStatus(): Promise<ExportStatus> {
  const configured = isSheetsConfigured();

  if (!configured) {
    return { configured, pending: [], tabName: sheetsTabName() };
  }

  const [{ months }, exported] = await Promise.all([
    getStatsOverview(),
    repository.listExportedPeriods(),
  ]);

  const done = new Set(exported);
  // Поточний місяць не пропонуємо: він ще не закінчився, і рядок за нього був
  // би неповним — а виправити вже вивантажений місяць нічим.
  const currentMonth = monthKeyOf(todayInKyiv());

  return {
    configured,
    pending: months
      .map((month) => month.month)
      .filter((month) => month !== currentMonth && !done.has(month)),
    tabName: sheetsTabName(),
  };
}
