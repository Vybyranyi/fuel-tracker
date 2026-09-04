CREATE TYPE "public"."fuel_type" AS ENUM('petrol', 'diesel', 'gas');--> statement-breakpoint
CREATE TABLE "cars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"make_model" text,
	"plate" text,
	"year" integer,
	"fuel_type" "fuel_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cars_year_plausible" CHECK ("cars"."year" is null or "cars"."year" between 1900 and 2100)
);
--> statement-breakpoint
ALTER TABLE "cars" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fuel_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "odometer_readings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "odometer_readings" DROP CONSTRAINT "odometer_readings_recorded_at_unique";--> statement-breakpoint
DROP INDEX "fuel_entries_filled_at_idx";--> statement-breakpoint
ALTER TABLE "fuel_entries" ADD COLUMN "car_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "odometer_readings" ADD COLUMN "car_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "cars" ADD CONSTRAINT "cars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cars_user_id_idx" ON "cars" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odometer_readings" ADD CONSTRAINT "odometer_readings_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fuel_entries_car_filled_at_idx" ON "fuel_entries" USING btree ("car_id","filled_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "odometer_readings" ADD CONSTRAINT "odometer_readings_car_date_key" UNIQUE("car_id","recorded_at");--> statement-breakpoint
CREATE POLICY "fuel_entries_select_own" ON "fuel_entries" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("fuel_entries"."car_id" in (select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "fuel_entries_insert_own" ON "fuel_entries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("fuel_entries"."car_id" in (select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "fuel_entries_update_own" ON "fuel_entries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("fuel_entries"."car_id" in (select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid()))) WITH CHECK ("fuel_entries"."car_id" in (select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "fuel_entries_delete_own" ON "fuel_entries" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("fuel_entries"."car_id" in (select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "odometer_readings_select_own" ON "odometer_readings" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("odometer_readings"."car_id" in (select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "odometer_readings_insert_own" ON "odometer_readings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("odometer_readings"."car_id" in (select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "odometer_readings_update_own" ON "odometer_readings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("odometer_readings"."car_id" in (select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid()))) WITH CHECK ("odometer_readings"."car_id" in (select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "odometer_readings_delete_own" ON "odometer_readings" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("odometer_readings"."car_id" in (select "cars"."id" from "cars" where "cars"."user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "push_subscriptions_select_own" ON "push_subscriptions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("push_subscriptions"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "push_subscriptions_insert_own" ON "push_subscriptions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("push_subscriptions"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "push_subscriptions_update_own" ON "push_subscriptions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("push_subscriptions"."user_id" = (select auth.uid())) WITH CHECK ("push_subscriptions"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "push_subscriptions_delete_own" ON "push_subscriptions" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("push_subscriptions"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "cars_select_own" ON "cars" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("cars"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "cars_insert_own" ON "cars" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("cars"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "cars_update_own" ON "cars" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("cars"."user_id" = (select auth.uid())) WITH CHECK ("cars"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "cars_delete_own" ON "cars" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("cars"."user_id" = (select auth.uid()));