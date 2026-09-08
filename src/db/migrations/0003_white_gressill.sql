CREATE TYPE "public"."service_item_kind" AS ENUM('part', 'labour');--> statement-breakpoint
CREATE TABLE "service_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_record_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"kind" "service_item_kind" NOT NULL,
	CONSTRAINT "service_items_quantity_positive" CHECK ("service_items"."quantity" > 0),
	CONSTRAINT "service_items_unit_price_non_negative" CHECK ("service_items"."unit_price" >= 0),
	CONSTRAINT "service_items_amount_non_negative" CHECK ("service_items"."amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "service_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "service_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"performed_at" date NOT NULL,
	"odometer_km" integer,
	"vendor" text,
	"note" text,
	"total_cost" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_records_total_non_negative" CHECK ("service_records"."total_cost" >= 0),
	CONSTRAINT "service_records_odometer_positive" CHECK ("service_records"."odometer_km" is null or "service_records"."odometer_km" > 0)
);
--> statement-breakpoint
ALTER TABLE "service_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_service_record_id_service_records_id_fk" FOREIGN KEY ("service_record_id") REFERENCES "public"."service_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_items_record_idx" ON "service_items" USING btree ("service_record_id","position");--> statement-breakpoint
CREATE INDEX "service_records_car_performed_at_idx" ON "service_records" USING btree ("car_id","performed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE POLICY "service_items_select_own" ON "service_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("service_items"."service_record_id" in (
    select "service_records"."id" from "service_records"
    where "service_records"."car_id" in (
      select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid())
    )
  ));--> statement-breakpoint
CREATE POLICY "service_items_insert_own" ON "service_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("service_items"."service_record_id" in (
    select "service_records"."id" from "service_records"
    where "service_records"."car_id" in (
      select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid())
    )
  ));--> statement-breakpoint
CREATE POLICY "service_items_update_own" ON "service_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("service_items"."service_record_id" in (
    select "service_records"."id" from "service_records"
    where "service_records"."car_id" in (
      select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid())
    )
  )) WITH CHECK ("service_items"."service_record_id" in (
    select "service_records"."id" from "service_records"
    where "service_records"."car_id" in (
      select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid())
    )
  ));--> statement-breakpoint
CREATE POLICY "service_items_delete_own" ON "service_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("service_items"."service_record_id" in (
    select "service_records"."id" from "service_records"
    where "service_records"."car_id" in (
      select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid())
    )
  ));--> statement-breakpoint
CREATE POLICY "service_records_select_own" ON "service_records" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("service_records"."car_id" in (select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "service_records_insert_own" ON "service_records" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("service_records"."car_id" in (select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "service_records_update_own" ON "service_records" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("service_records"."car_id" in (select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid()))) WITH CHECK ("service_records"."car_id" in (select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "service_records_delete_own" ON "service_records" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("service_records"."car_id" in (select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid())));