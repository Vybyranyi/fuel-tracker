import "server-only";

import ExcelJS from "exceljs";

import type {
  Cell,
  ExportDocument,
  ExportTable,
} from "@/features/export/domain/export-document";

/**
 * Формати чисел у клітинках.
 *
 * Кома тут — не роздільник тисяч, а знак «постав свій»: Excel підставляє той,
 * що прийнято в системі читача. Тому в українському Excel вийде «12 999,35»,
 * і нічого локалізувати самим не треба.
 */
const NUMBER_FORMATS = {
  date: "dd.mm.yyyy",
  decimal: "#,##0.00",
  integer: "#,##0",
} as const;

/** `IsoDate` — календарна дата без часу, тож і в Excel кладемо опівніч UTC. */
function toUtcDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

function writeCell(target: ExcelJS.Cell, cell: Cell): void {
  switch (cell.kind) {
    case "text":
      target.value = cell.value;
      return;

    case "date":
      target.value = toUtcDate(cell.value);
      target.numFmt = NUMBER_FORMATS.date;
      return;

    case "decimal":
    case "integer":
      // Порожня клітинка, а не нуль: «пробігу не знаємо» і «проїхали нуль» —
      // різні речі, і нуль у таблиці перетворив би перше на друге.
      target.value = cell.value;
      target.numFmt = NUMBER_FORMATS[cell.kind];
      return;
  }
}

function addTable(workbook: ExcelJS.Workbook, table: ExportTable): void {
  const sheet = workbook.addWorksheet(table.name);

  sheet.columns = table.columns.map((column) => ({
    header: column.label,
    width: column.width,
  }));

  // Шапка жирна й приморожена: у вивантаженні за рік рядків більше, ніж
  // екрана, і без цього на середині таблиці вже не видно, де яка колонка.
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: table.columns.length },
  };

  for (const row of table.rows) {
    const added = sheet.addRow([]);
    row.forEach((cell, index) => writeCell(added.getCell(index + 1), cell));
  }
}

/**
 * Аркуш підсумків — і водночас титульна сторінка.
 *
 * Стоїть першим, бо звіт починають читати з «скільки вийшло», а вже потім
 * дивляться, з чого. Назва авто й період теж тут: на аркушах із даними вони
 * зайняли б перший рядок, який має бути шапкою таблиці, щоб працювали
 * сортування й фільтр.
 */
function addSummary(
  workbook: ExcelJS.Workbook,
  document: ExportDocument,
): void {
  const sheet = workbook.addWorksheet("Підсумки");
  sheet.columns = [{ width: 28 }, { width: 16 }];

  const title = sheet.addRow([document.title]);
  title.font = { bold: true, size: 14 };

  if (document.caption) sheet.addRow([document.caption]);
  sheet.addRow([document.period]);
  sheet.addRow([]);

  for (const row of document.summary) {
    const added = sheet.addRow([row.label]);
    writeCell(added.getCell(2), row.value);
  }
}

export async function toXlsx(document: ExportDocument): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Пальне";
  workbook.created = new Date();

  addSummary(workbook, document);
  for (const table of document.tables) addTable(workbook, table);

  // `writeBuffer` віддає ArrayBuffer-подібне; `Response` хоче щось, що вміє
  // віддати байти, — `Buffer` вміє й не копіює зайвого.
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
