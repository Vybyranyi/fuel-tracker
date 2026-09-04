import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Спільні для всіх таблиць службові колонки.
 *
 * `withTimezone` тут принципово: сервер працює в UTC, а всі дати в застосунку
 * київські — без TZ у типі різниця вилізла б у звітах за місяць.
 */
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/**
 * Обʼєм і гроші — `numeric(10, 2)`.
 *
 * `numeric` у Postgres — точна десяткова арифметика, а не float: це саме той
 * тип, під який гроші й придумані, тож 0.1 + 0.2 тут не «попливе». Масштаб 2
 * задає рівно два знаки після коми на рівні самого типу — і в базі, і при
 * будь-якому читанні. Третій знак записати неможливо: Postgres округлить його
 * при вставці.
 *
 * У TypeScript Drizzle віддає `numeric` рядком ("40.50"), а не числом — саме
 * щоб ніхто випадково не почав рахувати гроші у float. Репозиторій переводить
 * ці рядки в цілі соті для домену й назад; домен рахує тільки в цілих.
 */
const money = (name: string) => numeric(name, { precision: 10, scale: 2 });

/**
 * Заправка.
 *
 * Зберігаємо всі три числа — обʼєм, ціну і суму — хоча одне з них завжди
 * похідне. Якби ми тримали лише два, кожен перерахунок історичного запису
 * давав би трохи інший результат через округлення; так значення фіксується
 * рівно таким, яким його побачив користувач у момент внесення.
 *
 * Сама тотожність «обʼєм × ціна ≈ сума» перевіряється в zod-схемі, де під неї
 * можна дати зрозуміле повідомлення. У БД лишаємо тільки те, що не залежить
 * від правил округлення.
 */
export const fuelEntries = pgTable(
  "fuel_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    filledAt: date("filled_at", { mode: "string" }).notNull(),
    volumeLiters: money("volume_liters").notNull(),
    pricePerLiter: money("price_per_liter").notNull(),
    totalCost: money("total_cost").notNull(),
    note: text("note"),
    ...timestamps,
  },
  (table) => [
    // Головний доступ до таблиці — «останні заправки» і «за місяць».
    index("fuel_entries_filled_at_idx").on(table.filledAt.desc()),
    check("fuel_entries_volume_positive", sql`${table.volumeLiters} > 0`),
    check("fuel_entries_price_positive", sql`${table.pricePerLiter} > 0`),
    check("fuel_entries_total_positive", sql`${table.totalCost} > 0`),
  ],
);

/**
 * Показання одометра — вносяться раз на місяць за пуш-нагадуванням.
 *
 * Одне показання на дату: повторний запис за той самий день має бути
 * виправленням, а не другим рядком, інакше різниця пробігу за місяць попливе.
 *
 * Умисно НЕ вимагаємо на рівні БД, щоб пробіг лише зростав: помилковий запис
 * треба мати змогу виправити вниз. Перевірку робить сервіс — попередженням.
 */
export const odometerReadings = pgTable(
  "odometer_readings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recordedAt: date("recorded_at", { mode: "string" }).notNull().unique(),
    odometerKm: integer("odometer_km").notNull(),
    note: text("note"),
    ...timestamps,
  },
  (table) => [
    check("odometer_readings_km_positive", sql`${table.odometerKm} > 0`),
  ],
);

/**
 * Web Push підписки.
 *
 * `endpoint` унікальний — це і є ідентифікатор підписки з боку браузера.
 * Одна людина, але кілька пристроїв (айфон з головного екрана, десктоп),
 * тому таблиця, а не один рядок.
 */
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  failureCount: integer("failure_count").notNull().default(0),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  ...timestamps,
});

export type FuelEntryRow = typeof fuelEntries.$inferSelect;
export type NewFuelEntryRow = typeof fuelEntries.$inferInsert;

export type OdometerReadingRow = typeof odometerReadings.$inferSelect;
export type NewOdometerReadingRow = typeof odometerReadings.$inferInsert;

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscriptionRow = typeof pushSubscriptions.$inferInsert;
