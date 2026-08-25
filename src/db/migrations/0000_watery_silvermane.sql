CREATE TABLE "fuel_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filled_at" date NOT NULL,
	"volume_liters" numeric(10, 2) NOT NULL,
	"price_per_liter" numeric(10, 2) NOT NULL,
	"total_cost" numeric(10, 2) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fuel_entries_volume_positive" CHECK ("fuel_entries"."volume_liters" > 0),
	CONSTRAINT "fuel_entries_price_positive" CHECK ("fuel_entries"."price_per_liter" > 0),
	CONSTRAINT "fuel_entries_total_positive" CHECK ("fuel_entries"."total_cost" > 0)
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"ip_hash" text PRIMARY KEY NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "login_attempts_count_non_negative" CHECK ("login_attempts"."failed_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "monthly_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" char(7) NOT NULL,
	"exported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_exports_period_unique" UNIQUE("period"),
	CONSTRAINT "monthly_exports_period_format" CHECK ("monthly_exports"."period" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);
--> statement-breakpoint
CREATE TABLE "odometer_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recorded_at" date NOT NULL,
	"odometer_km" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "odometer_readings_recorded_at_unique" UNIQUE("recorded_at"),
	CONSTRAINT "odometer_readings_km_positive" CHECK ("odometer_readings"."odometer_km" > 0)
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"last_success_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE INDEX "fuel_entries_filled_at_idx" ON "fuel_entries" USING btree ("filled_at" DESC NULLS LAST);