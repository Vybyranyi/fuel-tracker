import "server-only";

import { auth, sheets } from "@googleapis/sheets";

import {
  LAST_COLUMN,
  SHEET_HEADER,
  sheetRange,
  type SheetRow,
} from "@/features/sheets-export/domain/export-row";

/**
 * Те, що вивантаженню треба вміти робити з таблицею.
 *
 * Окремим інтерфейсом, а не прямими викликами з сервісу: логіку «створити
 * аркуш, якщо його нема; дописати шапку, якщо порожньо; додати рядок» треба
 * могти перевірити тестом, а до справжнього Google з тесту не достукаєшся.
 */
export interface SheetsGateway {
  listSheetTitles(): Promise<string[]>;
  createSheet(title: string): Promise<void>;
  /** Перший рядок аркуша. Порожній масив — шапки ще немає. */
  readHeader(title: string): Promise<string[]>;
  writeHeader(title: string): Promise<void>;
  appendRow(title: string, row: SheetRow): Promise<void>;
}

const SETUP_HINT =
  "Створи сервісний акаунт Google, віддай таблицю йому в доступ і заповни змінні (див. .env.example).";

interface SheetsConfig {
  email: string;
  privateKey: string;
  spreadsheetId: string;
  tabName: string;
}

/** Назва аркуша за замовчуванням — та, що в плані. */
const DEFAULT_TAB_NAME = "Пальне";

export function readSheetsConfig(): SheetsConfig {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  const missing = [
    !email && "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    !privateKey && "GOOGLE_PRIVATE_KEY",
    !spreadsheetId && "GOOGLE_SHEETS_SPREADSHEET_ID",
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(
      `Немає змінних для вивантаження в Google Sheets: ${missing.join(", ")}. ${SETUP_HINT}`,
    );
  }

  return {
    email: email!,
    // У змінних оточення Versel переноси рядків зберігаються як два символи
    // «\» і «n». Якщо їх не повернути назад, розбір ключа падає з
    // невиразним «error:1E08010C:DECODER routines::unsupported».
    privateKey: privateKey!.replace(/\\n/g, "\n"),
    spreadsheetId: spreadsheetId!,
    tabName: process.env.GOOGLE_SHEETS_TAB_NAME || DEFAULT_TAB_NAME,
  };
}

export function isSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  );
}

export function sheetsTabName(): string {
  return process.env.GOOGLE_SHEETS_TAB_NAME || DEFAULT_TAB_NAME;
}

export function createSheetsGateway(): SheetsGateway {
  const config = readSheetsConfig();

  const client = sheets({
    version: "v4",
    auth: new auth.JWT({
      email: config.email,
      key: config.privateKey,
      // Лише запис у таблиці: доступу до диска чи пошти сервісному акаунту не
      // потрібно, і просити його — зайвий ризик.
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    }),
  });

  const { spreadsheetId } = config;

  return {
    async listSheetTitles() {
      const response = await client.spreadsheets.get({
        spreadsheetId,
        // Просимо самі назви: повна відповідь тягне всі дані таблиці.
        fields: "sheets.properties.title",
      });

      return (response.data.sheets ?? [])
        .map((sheet) => sheet.properties?.title)
        .filter((title): title is string => Boolean(title));
    },

    async createSheet(title) {
      await client.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title } } }] },
      });
    },

    async readHeader(title) {
      const response = await client.spreadsheets.values.get({
        spreadsheetId,
        range: sheetRange(title, `A1:${LAST_COLUMN}1`),
      });

      return (response.data.values?.[0] ?? []).map(String);
    },

    async writeHeader(title) {
      await client.spreadsheets.values.update({
        spreadsheetId,
        range: sheetRange(title, `A1:${LAST_COLUMN}1`),
        valueInputOption: "RAW",
        requestBody: { values: [[...SHEET_HEADER]] },
      });
    },

    async appendRow(title, row) {
      await client.spreadsheets.values.append({
        spreadsheetId,
        range: sheetRange(title, `A:${LAST_COLUMN}`),
        // RAW, а не USER_ENTERED: числа вже числа, і хай Google не намагається
        // тлумачити їх за локаллю таблиці.
        valueInputOption: "RAW",
        // Саме INSERT_ROWS: інакше запис затер би те, що лежить нижче.
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [row] },
      });
    },
  };
}
