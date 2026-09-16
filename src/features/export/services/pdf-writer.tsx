import "server-only";

import path from "node:path";

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import type {
  Cell,
  ExportDocument,
  ExportTable,
} from "@/features/export/domain/export-document";

/**
 * Кириличний шрифт лежить у репозиторії.
 *
 * Жоден із вбудованих у PDF шрифтів кирилиці не має: без цього файлу «Октавія»
 * стає рядком порожніх прямокутників, і по логах цього не видно — файл же
 * згенерувався. Тому шрифт не тягнеться з мережі під час запиту, а їде разом
 * із кодом; `outputFileTracingIncludes` у `next.config.ts` кладе його поруч із
 * функцією на Verselі.
 */
const FONT_DIR = path.join(process.cwd(), "src/features/export/assets");
const FONT_FAMILY = "Noto Sans";

Font.register({
  family: FONT_FAMILY,
  fonts: [
    { src: path.join(FONT_DIR, "NotoSans-Regular.ttf") },
    { src: path.join(FONT_DIR, "NotoSans-Bold.ttf"), fontWeight: 700 },
  ],
});

/**
 * Перенесення слів вимикаємо.
 *
 * Типовий алгоритм у бібліотеці — англійський, і українські слова він рве не
 * там, де треба: «Шиномон-таж». Краще довший рядок, ніж вигаданий дефіс.
 */
Font.registerHyphenationCallback((word) => [word]);

const BORDER = "#d4d4d4";
const MUTED = "#525252";

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 32,
    color: "#171717",
  },
  title: { fontSize: 16, fontWeight: 700 },
  caption: { fontSize: 9, color: MUTED, marginTop: 2 },
  period: { fontSize: 9, color: MUTED, marginTop: 2 },
  section: { marginTop: 18 },
  heading: { fontSize: 11, fontWeight: 700, marginBottom: 6 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingVertical: 3,
  },
  summaryLabel: { color: MUTED },
  summaryValue: { fontWeight: 700 },
  headRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#171717",
    paddingBottom: 3,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingVertical: 3,
  },
  // Відступ праворуч тримає повітря між притиснутим до правого краю числом і
  // текстом наступної колонки: без нього «2 311,29 ОККО» читається як одне.
  headCell: { fontWeight: 700, paddingRight: 10 },
  cell: { paddingRight: 10 },
  right: { textAlign: "right" },
  empty: { color: MUTED, paddingVertical: 4 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    fontSize: 7,
    color: MUTED,
    textAlign: "center",
  },
});

const numberFormatter = new Intl.NumberFormat("uk-UA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeFormatter = new Intl.NumberFormat("uk-UA", {
  maximumFractionDigits: 0,
});

/**
 * Текст клітинки.
 *
 * `null` малюємо прочерком, а не порожнечею: у надрукованій таблиці порожня
 * клітинка читається як «забули заповнити», а прочерк — як «нема чого».
 */
function render(cell: Cell): string {
  switch (cell.kind) {
    case "text":
      return cell.value;
    case "date": {
      const [year, month, day] = cell.value.split("-");
      return `${day}.${month}.${year}`;
    }
    case "decimal":
      return cell.value === null ? "—" : numberFormatter.format(cell.value);
    case "integer":
      return cell.value === null ? "—" : wholeFormatter.format(cell.value);
  }
}

function Table({ table }: { table: ExportTable }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{table.name}</Text>

      {/* Частки рядка беремо з тих самих ширин, що й XLSX: колонка нотатки
          має лишатись широкою, а дата — вузькою, у будь-якому форматі. */}
      <View style={styles.headRow}>
        {table.columns.map((column) => (
          <Text
            key={column.label}
            style={[
              styles.headCell,
              { flexGrow: column.width, flexBasis: 0 },
              column.numeric ? styles.right : {},
            ]}
          >
            {column.label}
          </Text>
        ))}
      </View>

      {table.rows.length === 0 ? (
        <Text style={styles.empty}>Немає записів за цей період</Text>
      ) : (
        table.rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row} wrap={false}>
            {row.map((cell, index) => (
              <Text
                key={index}
                style={[
                  styles.cell,
                  { flexGrow: table.columns[index]!.width, flexBasis: 0 },
                  table.columns[index]!.numeric ? styles.right : {},
                ]}
              >
                {render(cell)}
              </Text>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

function Report({ document }: { document: ExportDocument }) {
  return (
    <Document title={`${document.title} — ${document.period}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{document.title}</Text>
        {document.caption ? (
          <Text style={styles.caption}>{document.caption}</Text>
        ) : null}
        <Text style={styles.period}>{document.period}</Text>

        {document.summary.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.heading}>Підсумки</Text>
            {document.summary.map((row) => (
              <View key={row.label} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{row.label}</Text>
                <Text style={styles.summaryValue}>{render(row.value)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {document.tables.map((table) => (
          <Table key={table.name} table={table} />
        ))}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

export function toPdf(document: ExportDocument): Promise<Buffer> {
  return renderToBuffer(<Report document={document} />);
}
