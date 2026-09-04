import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUsers } from "drizzle-orm/supabase";

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
 * Умова доступу до рядка: він належить авто, яке належить тому, хто питає.
 *
 * `(select auth.uid())` у дужках навмисно: так Postgres обчислює його один
 * раз на запит, а не для кожного рядка — Supabase окремо про це попереджає.
 *
 * Свідомо без дублювання `user_id` у кожну таблицю: підзапит по індексованому
 * `cars.user_id` на цих обсягах не коштує нічого, а зайва колонка була б ще
 * одним місцем, де дані можуть розійтися з правдою.
 */
const ownCar = (carId: AnyPgColumn) =>
  sql`${carId} in (select ${cars.id} from ${cars} where ${cars.userId} = (select auth.uid()))`;

/** Політики читання й запису для таблиці, привʼязаної до авто. */
function carScopedPolicies(carId: AnyPgColumn, name: string) {
  return [
    pgPolicy(`${name}_select_own`, {
      for: "select",
      to: authenticatedRole,
      using: ownCar(carId),
    }),
    pgPolicy(`${name}_insert_own`, {
      for: "insert",
      to: authenticatedRole,
      withCheck: ownCar(carId),
    }),
    pgPolicy(`${name}_update_own`, {
      for: "update",
      to: authenticatedRole,
      using: ownCar(carId),
      withCheck: ownCar(carId),
    }),
    pgPolicy(`${name}_delete_own`, {
      for: "delete",
      to: authenticatedRole,
      using: ownCar(carId),
    }),
  ];
}

/** Пальне, яким їздить авто. Мітка для інтерфейсу — математика однакова. */
export const fuelTypeEnum = pgEnum("fuel_type", ["petrol", "diesel", "gas"]);

/**
 * Авто.
 *
 * Корінь усього дерева даних: заправки й показання пробігу висять на авто, а
 * авто — на користувачі. Тому саме тут вирішується, чиї дані видно, а решта
 * таблиць питає про це через `cars`.
 *
 * `onDelete: "cascade"` до `auth.users` — щоб «видалити акаунт» справді
 * видаляло все, а не лишало осиротілі рядки, на які вже нема кому подивитись.
 */
export const cars = pgTable(
  "cars",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    makeModel: text("make_model"),
    plate: text("plate"),
    year: integer("year"),
    fuelType: fuelTypeEnum("fuel_type").notNull(),
    ...timestamps,
  },
  (table) => [
    // Кожен запит до будь-якої таблиці проходить через цей індекс — саме він
    // робить підзапит у політиках безкоштовним.
    index("cars_user_id_idx").on(table.userId),
    check(
      "cars_year_plausible",
      sql`${table.year} is null or ${table.year} between 1900 and 2100`,
    ),
    pgPolicy("cars_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.userId} = (select auth.uid())`,
    }),
    pgPolicy("cars_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${table.userId} = (select auth.uid())`,
    }),
    pgPolicy("cars_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${table.userId} = (select auth.uid())`,
      withCheck: sql`${table.userId} = (select auth.uid())`,
    }),
    pgPolicy("cars_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${table.userId} = (select auth.uid())`,
    }),
  ],
);

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
    carId: uuid("car_id")
      .notNull()
      .references(() => cars.id, { onDelete: "cascade" }),
    filledAt: date("filled_at", { mode: "string" }).notNull(),
    volumeLiters: money("volume_liters").notNull(),
    pricePerLiter: money("price_per_liter").notNull(),
    totalCost: money("total_cost").notNull(),
    note: text("note"),
    ...timestamps,
  },
  (table) => [
    // Головний доступ до таблиці — «останні заправки цього авто» і «за місяць».
    // Авто в індексі першим: без нього кожен запит однаково перебирав би чужі
    // рядки, просто щоб їх відкинути.
    index("fuel_entries_car_filled_at_idx").on(
      table.carId,
      table.filledAt.desc(),
    ),
    check("fuel_entries_volume_positive", sql`${table.volumeLiters} > 0`),
    check("fuel_entries_price_positive", sql`${table.pricePerLiter} > 0`),
    check("fuel_entries_total_positive", sql`${table.totalCost} > 0`),
    ...carScopedPolicies(table.carId, "fuel_entries"),
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
    carId: uuid("car_id")
      .notNull()
      .references(() => cars.id, { onDelete: "cascade" }),
    recordedAt: date("recorded_at", { mode: "string" }).notNull(),
    odometerKm: integer("odometer_km").notNull(),
    note: text("note"),
    ...timestamps,
  },
  (table) => [
    // Унікальність тепер у парі з авто: одне показання на день на кожне авто,
    // а не одне на день на весь застосунок.
    unique("odometer_readings_car_date_key").on(table.carId, table.recordedAt),
    check("odometer_readings_km_positive", sql`${table.odometerKm} > 0`),
    ...carScopedPolicies(table.carId, "odometer_readings"),
  ],
);

/**
 * Web Push підписки.
 *
 * `endpoint` унікальний — це і є ідентифікатор підписки з боку браузера.
 * Одна людина, але кілька пристроїв (айфон з головного екрана, десктоп),
 * тому таблиця, а не один рядок.
 */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    failureCount: integer("failure_count").notNull().default(0),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("push_subscriptions_user_id_idx").on(table.userId),
    // Підписка висить на людині, а не на авто: нагадування приходить на
    // пристрій, а вже в ньому видно всі авто власника.
    pgPolicy("push_subscriptions_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.userId} = (select auth.uid())`,
    }),
    pgPolicy("push_subscriptions_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${table.userId} = (select auth.uid())`,
    }),
    pgPolicy("push_subscriptions_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${table.userId} = (select auth.uid())`,
      withCheck: sql`${table.userId} = (select auth.uid())`,
    }),
    pgPolicy("push_subscriptions_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${table.userId} = (select auth.uid())`,
    }),
  ],
);

export type CarRow = typeof cars.$inferSelect;
export type NewCarRow = typeof cars.$inferInsert;
export type FuelType = (typeof fuelTypeEnum.enumValues)[number];

export type FuelEntryRow = typeof fuelEntries.$inferSelect;
export type NewFuelEntryRow = typeof fuelEntries.$inferInsert;

export type OdometerReadingRow = typeof odometerReadings.$inferSelect;
export type NewOdometerReadingRow = typeof odometerReadings.$inferInsert;

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscriptionRow = typeof pushSubscriptions.$inferInsert;
