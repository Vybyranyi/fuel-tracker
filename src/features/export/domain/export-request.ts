import {
  DEFAULT_COST_PERIOD,
  type CostPeriod,
} from "@/features/costs/domain/cost-entry";

/**
 * Що саме вивантажуємо.
 *
 * Період береться той самий, що й у списку витрат, — навмисно: людина вже
 * знає ці варіанти, і «3 місяці» тут мають означати рівно те, що там.
 */
export const EXPORT_FORMATS = ["xlsx", "pdf"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  xlsx: "Excel",
  pdf: "PDF",
};

/**
 * Розділи — це таблиці у файлі.
 *
 * «Позиції ТО» окремо від «Записів ТО», бо це різний рівень подробиць: у
 * записі видно, скільки коштував візит, у позиціях — за що саме. Позиції без
 * записів не мають сенсу, тому форма їх не дає вибрати наодинці.
 */
export const EXPORT_SECTIONS = ["fuel", "service", "items"] as const;
export type ExportSection = (typeof EXPORT_SECTIONS)[number];

export const EXPORT_SECTION_LABELS: Record<ExportSection, string> = {
  fuel: "Заправки",
  service: "Записи ТО",
  items: "Позиції ТО",
};

/** Групи підсумків. Кожна дає кілька рядків, а не одне число. */
export const EXPORT_TOTALS = [
  "money",
  "fuel",
  "service",
  "distance",
  "perKm",
] as const;
export type ExportTotal = (typeof EXPORT_TOTALS)[number];

export const EXPORT_TOTAL_LABELS: Record<ExportTotal, string> = {
  money: "Гроші",
  fuel: "Пальне",
  service: "Запчастини й робота",
  distance: "Пробіг і витрата",
  perKm: "Вартість кілометра",
};

export interface ExportRequest {
  period: CostPeriod;
  sections: ExportSection[];
  totals: ExportTotal[];
  format: ExportFormat;
}

/**
 * Що пропонуємо, поки нічого не вибрали.
 *
 * Обидва види витрат і гроші з пальним у підсумках — те, заради чого
 * вивантаження відкривають найчастіше. Позиції ТО вимкнені: це подробиці,
 * по які приходять свідомо.
 */
export const DEFAULT_EXPORT_REQUEST: ExportRequest = {
  period: DEFAULT_COST_PERIOD,
  sections: ["fuel", "service"],
  totals: ["money", "fuel"],
  format: "xlsx",
};

export const EXPORT_CONTENT_TYPES: Record<ExportFormat, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};
