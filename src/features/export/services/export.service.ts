import "server-only";

import {
  getActiveCar,
  requireCarScope,
} from "@/features/cars/services/cars.service";
import { resolvePeriod } from "@/features/costs/domain/cost-entry";
import * as costsRepository from "@/features/costs/repository/costs.repository";
import { buildExportDocument } from "@/features/export/domain/export-document";
import {
  EXPORT_CONTENT_TYPES,
  type ExportRequest,
} from "@/features/export/domain/export-request";
import { toPdf } from "@/features/export/services/pdf-writer";
import { toXlsx } from "@/features/export/services/xlsx-writer";
import * as statsRepository from "@/features/stats/repository/stats.repository";
import { UserFacingError } from "@/lib/safe-action";
import { todayInKyiv } from "@/lib/date";

export interface ExportFile {
  body: Buffer;
  fileName: string;
  contentType: string;
}

/**
 * Збирає файл із того, що вже вміють читати інші фічі.
 *
 * Власного репозиторію тут немає навмисно: вивантаження не знає про базу
 * нічого свого — це ті самі витрати, що в списку, і ті самі показання, що в
 * статистиці, лише покладені в таблицю. Свої запити означали б другу копію
 * тих самих `where`, яка колись розійдеться з першою, і цифри у файлі
 * перестали б збігатися з тими, що на екрані.
 */
export async function createExport(
  request: ExportRequest,
): Promise<ExportFile> {
  const [scope, car] = await Promise.all([requireCarScope(), getActiveCar()]);

  if (!car) throw new UserFacingError("Спершу додайте авто");

  const range = resolvePeriod(request.period, todayInKyiv());
  const wantsFuel = request.sections.includes("fuel");
  const wantsService = request.sections.includes("service");
  // Показання одометра піднімаємо лише тоді, коли з них щось рахується.
  const wantsDistance =
    request.totals.includes("distance") || request.totals.includes("perKm");

  const [rows, points] = await Promise.all([
    costsRepository.listCosts(scope, range, {
      fuel: wantsFuel,
      service: wantsService,
    }),
    wantsDistance ? statsRepository.listOdometerPoints(scope) : [],
  ]);

  const document = buildExportDocument({
    car,
    request,
    range,
    fuel: rows.fuel,
    service: rows.service,
    readings: points,
    today: todayInKyiv(),
  });

  const body =
    request.format === "xlsx" ? await toXlsx(document) : await toPdf(document);

  return {
    body,
    fileName: `${document.baseName}.${request.format}`,
    contentType: EXPORT_CONTENT_TYPES[request.format],
  };
}
