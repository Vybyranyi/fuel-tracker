import { z } from "zod";

import { COST_PERIODS } from "@/features/costs/domain/cost-entry";
import {
  EXPORT_FORMATS,
  EXPORT_SECTIONS,
  EXPORT_TOTALS,
} from "@/features/export/domain/export-request";

/**
 * Те, що приходить із форми у `POST /api/export`.
 *
 * Схема тут, а не в маршруті: її читає і сервер, і сама форма, тож вибір
 * «періоду, якого не існує» відпадає з обох боків однаково.
 *
 * Підсумків може не бути жодного — це просто таблиці без зведення. А от без
 * розділу файл був би порожній, тому бодай один обовʼязковий.
 */
export const exportRequestSchema = z.object({
  period: z.enum(COST_PERIODS),
  sections: z
    .array(z.enum(EXPORT_SECTIONS))
    .min(1, "Виберіть хоча б один розділ"),
  totals: z.array(z.enum(EXPORT_TOTALS)),
  format: z.enum(EXPORT_FORMATS),
});

export type ExportRequestInput = z.infer<typeof exportRequestSchema>;
