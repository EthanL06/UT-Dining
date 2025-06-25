

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."payment_method" AS ENUM (
    'Bevo Pay',
    'Cash',
    'Credit/Debit',
    'Dine In Dollars'
);


ALTER TYPE "public"."payment_method" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_location_and_menus"("arg_data" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_location_id UUID;
  new_menu_id BIGINT;
  new_menu_cat_id BIGINT;
  new_food_item_id BIGINT;
  nutrit_id BIGINT;
  allerg_id BIGINT;
  menu_item JSONB;
  menu_cat_item JSONB;
  food_item JSONB;
  nutrition JSONB;
BEGIN
  -- Attempt to fetch an existing location by name or colloquial_name (case-insensitive)
  SELECT id INTO v_location_id
  FROM location
  WHERE LOWER(name) = LOWER(arg_data->>'locationName')
     OR LOWER(colloquial_name) = LOWER(arg_data->>'locationName');

  -- If not found, insert a new location
  IF v_location_id IS NULL THEN
    INSERT INTO location (name, updated_at)
    VALUES (arg_data->>'locationName', NOW())
    RETURNING id INTO v_location_id;
  END IF;

  IF v_location_id IS NULL THEN
    RAISE EXCEPTION 'Failed to insert or resolve location for name %', arg_data->>'locationName';
  END IF;

  FOR menu_item IN SELECT * FROM jsonb_array_elements(arg_data->'menus') LOOP
    -- Insert or update menu
    INSERT INTO menu (location_id, name, date, updated_at)
    VALUES (
      v_location_id,
      menu_item->>'type',
      (arg_data->>'date')::date,
      NOW()
    )
    ON CONFLICT (name, date, location_id) DO UPDATE
    SET updated_at = NOW()
    RETURNING id INTO new_menu_id;

    -- Clear old menu categories when menu is reused/updated
    DELETE FROM menu_category
    WHERE menu_id = new_menu_id;

    IF new_menu_id IS NULL THEN
      RAISE EXCEPTION 'Failed to insert menu for location_id %', v_location_id;
    END IF;

    FOR menu_cat_item IN SELECT * FROM jsonb_array_elements(menu_item->'menuCategories') LOOP
      INSERT INTO menu_category (title, menu_id)
      VALUES (menu_cat_item->>'categoryName', new_menu_id)
      RETURNING id INTO new_menu_cat_id;

      IF new_menu_cat_id IS NULL THEN
        RAISE EXCEPTION 'Failed to insert menu category for menu_id %', new_menu_id;
      END IF;

      FOR food_item IN SELECT * FROM jsonb_array_elements(menu_cat_item->'foods') LOOP
        nutrition := food_item->'nutrition';

        INSERT INTO food_item (name, link, menu_category_id)
        VALUES (food_item->>'name', food_item->>'link', new_menu_cat_id)
        RETURNING id INTO new_food_item_id;

        IF new_food_item_id IS NULL THEN
          RAISE EXCEPTION 'Failed to insert food item for menu_category_id %', new_menu_cat_id;
        END IF;

        INSERT INTO nutrition (
          food_item_id, serving_size, calories, total_fat, saturated_fat,
          trans_fat, cholesterol, sodium, total_carbohydrates, dietary_fiber,
          total_sugars, protein, vitamin_d, calcium, iron, potassium, ingredients
        ) VALUES (
          new_food_item_id,
          nutrition->>'servingSize', nutrition->>'calories', nutrition->>'totalFat',
          nutrition->>'saturatedFat', nutrition->>'transFat', nutrition->>'cholesterol',
          nutrition->>'sodium', nutrition->>'totalCarbohydrates', nutrition->>'dietaryFiber',
          nutrition->>'totalSugars', nutrition->>'protein', nutrition->>'vitaminD',
          nutrition->>'calcium', nutrition->>'iron', nutrition->>'potassium',
          nutrition->>'ingredients'
        )
        RETURNING id INTO nutrit_id;

        IF nutrit_id IS NULL THEN
          RAISE EXCEPTION 'Failed to insert nutrition for food_item_id %', new_food_item_id;
        END IF;

        INSERT INTO allergens (
          food_item_id, beef, egg, fish, milk, peanuts, pork, shellfish,
          soy, tree_nuts, wheat, sesame_seeds, vegan, vegetarian, halal
        ) VALUES (
          new_food_item_id,
          (food_item#>'{allergens,beef}')::boolean,
          (food_item#>'{allergens,egg}')::boolean,
          (food_item#>'{allergens,fish}')::boolean,
          (food_item#>'{allergens,milk}')::boolean,
          (food_item#>'{allergens,peanuts}')::boolean,
          (food_item#>'{allergens,pork}')::boolean,
          (food_item#>'{allergens,shellfish}')::boolean,
          (food_item#>'{allergens,soy}')::boolean,
          (food_item#>'{allergens,tree_nuts}')::boolean,
          (food_item#>'{allergens,wheat}')::boolean,
          (food_item#>'{allergens,sesame_seeds}')::boolean,
          (food_item#>'{allergens,vegan}')::boolean,
          (food_item#>'{allergens,vegetarian}')::boolean,
          (food_item#>'{allergens,halal}')::boolean
        )
        RETURNING id INTO allerg_id;

        IF allerg_id IS NULL THEN
          RAISE EXCEPTION 'Failed to insert allergens for food_item_id %', new_food_item_id;
        END IF;

        UPDATE food_item
        SET nutrition_id = nutrit_id, allergens_id = allerg_id
        WHERE id = new_food_item_id;

      END LOOP;
    END LOOP;
  END LOOP;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."insert_location_and_menus"("arg_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_multiple_locations_and_menus"("arg_data_array" "jsonb"[]) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  arg_data JSONB;
  result BOOLEAN;
BEGIN
  FOREACH arg_data IN ARRAY arg_data_array LOOP
    result := insert_location_and_menus(arg_data);
    IF NOT result THEN
      RAISE EXCEPTION 'Failed to insert data for: %', arg_data;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."insert_multiple_locations_and_menus"("arg_data_array" "jsonb"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_display_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.display_order IS NULL OR NEW.display_order = 0 THEN
    SELECT COALESCE(MAX(display_order), 0) + 1 INTO NEW.display_order FROM location;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_display_order"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."allergens" (
    "id" bigint NOT NULL,
    "food_item_id" bigint,
    "beef" boolean,
    "egg" boolean,
    "fish" boolean,
    "peanuts" boolean,
    "pork" boolean,
    "shellfish" boolean,
    "soy" boolean,
    "tree_nuts" boolean,
    "wheat" boolean,
    "sesame_seeds" boolean,
    "vegan" boolean,
    "vegetarian" boolean,
    "halal" boolean,
    "milk" boolean
);


ALTER TABLE "public"."allergens" OWNER TO "postgres";


ALTER TABLE "public"."allergens" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."allergens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."food_item" (
    "id" bigint NOT NULL,
    "menu_category_id" bigint,
    "nutrition_id" bigint,
    "allergens_id" bigint,
    "name" "text",
    "link" "text"
);


ALTER TABLE "public"."food_item" OWNER TO "postgres";


ALTER TABLE "public"."food_item" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."food_item_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."location" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "colloquial_name" "text",
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "address" "text" DEFAULT ''::"text" NOT NULL,
    "type_id" "uuid" NOT NULL,
    "regular_service_hours" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "methods_of_payment" "public"."payment_method"[] DEFAULT '{}'::"public"."payment_method"[] NOT NULL,
    "meal_times" "jsonb"[] DEFAULT '{}'::"jsonb"[] NOT NULL,
    "google_maps_link" "text" DEFAULT ''::"text" NOT NULL,
    "apple_maps_link" "text" DEFAULT ''::"text" NOT NULL,
    "image" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "force_close" boolean DEFAULT false NOT NULL,
    "has_menus" boolean DEFAULT false,
    "display_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."location" OWNER TO "postgres";


COMMENT ON COLUMN "public"."location"."colloquial_name" IS 'Optional colloquial or informal name for the location';



COMMENT ON COLUMN "public"."location"."description" IS 'Detailed description of the location';



COMMENT ON COLUMN "public"."location"."address" IS 'Physical address of the location';



COMMENT ON COLUMN "public"."location"."type_id" IS 'Foreign key reference to location_type table';



COMMENT ON COLUMN "public"."location"."regular_service_hours" IS 'JSON object containing service hours for each day of the week';



COMMENT ON COLUMN "public"."location"."methods_of_payment" IS 'Array of accepted payment methods at this location';



COMMENT ON COLUMN "public"."location"."meal_times" IS 'Array of JSON objects containing meal times (breakfast, lunch, dinner, etc.)';



COMMENT ON COLUMN "public"."location"."google_maps_link" IS 'Google Maps URL for the location';



COMMENT ON COLUMN "public"."location"."apple_maps_link" IS 'Apple Maps URL for the location';



COMMENT ON COLUMN "public"."location"."image" IS 'Optional image URL or path for the location';



COMMENT ON COLUMN "public"."location"."created_at" IS 'Timestamp when the location was created';



COMMENT ON COLUMN "public"."location"."updated_at" IS 'Timestamp when the location was last updated';



COMMENT ON COLUMN "public"."location"."force_close" IS 'When true, forces the location to show as closed regardless of service hours. Used for emergency closures, maintenance, etc.';



CREATE TABLE IF NOT EXISTS "public"."location_type" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "display_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."location_type" OWNER TO "postgres";


COMMENT ON COLUMN "public"."location_type"."display_order" IS 'Controls the display order of location types in filters and UI. Lower numbers appear first.';



CREATE TABLE IF NOT EXISTS "public"."menu" (
    "id" bigint NOT NULL,
    "name" "text",
    "location_id" "uuid",
    "date" "date" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."menu" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."menu_category" (
    "id" bigint NOT NULL,
    "menu_id" bigint NOT NULL,
    "title" "text"
);


ALTER TABLE "public"."menu_category" OWNER TO "postgres";


COMMENT ON TABLE "public"."menu_category" IS 'Each menu has multiple menu categories';



ALTER TABLE "public"."menu_category" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."menu_category_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."menu" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."menu_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."nutrition" (
    "id" bigint NOT NULL,
    "food_item_id" bigint,
    "calories" "text",
    "total_fat" "text",
    "saturated_fat" "text",
    "cholesterol" "text",
    "sodium" "text",
    "total_carbohydrates" "text",
    "dietary_fiber" "text",
    "total_sugars" "text",
    "protein" "text",
    "vitamin_d" "text",
    "calcium" "text",
    "iron" "text",
    "potassium" "text",
    "ingredients" "text",
    "trans_fat" "text",
    "serving_size" "text"
);


ALTER TABLE "public"."nutrition" OWNER TO "postgres";


ALTER TABLE "public"."nutrition" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."nutrition_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."allergens"
    ADD CONSTRAINT "allergens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_item"
    ADD CONSTRAINT "food_item_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location"
    ADD CONSTRAINT "location_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_type"
    ADD CONSTRAINT "location_type_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."location_type"
    ADD CONSTRAINT "location_type_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_category"
    ADD CONSTRAINT "menu_category_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu"
    ADD CONSTRAINT "menu_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nutrition"
    ADD CONSTRAINT "nutrition_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu"
    ADD CONSTRAINT "unique_menu_name_date" UNIQUE ("name", "date", "location_id");



CREATE INDEX "idx_location_type_display_order" ON "public"."location_type" USING "btree" ("display_order");



CREATE INDEX "idx_locations_created_at" ON "public"."location" USING "btree" ("created_at");



CREATE INDEX "idx_locations_meal_times" ON "public"."location" USING "gin" ("meal_times");



CREATE INDEX "idx_locations_payment_methods" ON "public"."location" USING "gin" ("methods_of_payment");



CREATE INDEX "idx_locations_service_hours" ON "public"."location" USING "gin" ("regular_service_hours");



CREATE INDEX "idx_locations_type_id" ON "public"."location" USING "btree" ("type_id");



CREATE INDEX "idx_locations_updated_at" ON "public"."location" USING "btree" ("updated_at");



CREATE OR REPLACE TRIGGER "set_display_order_trigger" BEFORE INSERT ON "public"."location" FOR EACH ROW EXECUTE FUNCTION "public"."set_display_order"();



ALTER TABLE ONLY "public"."allergens"
    ADD CONSTRAINT "allergens_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_item"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."food_item"
    ADD CONSTRAINT "food_item_allergens_id_fkey" FOREIGN KEY ("allergens_id") REFERENCES "public"."allergens"("id") ON UPDATE CASCADE ON DELETE CASCADE;



COMMENT ON CONSTRAINT "food_item_allergens_id_fkey" ON "public"."food_item" IS 'Cascade delete/update: when allergens record is deleted/updated, associated food items are deleted/updated';



ALTER TABLE ONLY "public"."food_item"
    ADD CONSTRAINT "food_item_menu_category_id_fkey" FOREIGN KEY ("menu_category_id") REFERENCES "public"."menu_category"("id") ON UPDATE CASCADE ON DELETE CASCADE;



COMMENT ON CONSTRAINT "food_item_menu_category_id_fkey" ON "public"."food_item" IS 'Cascade delete/update: when menu category is deleted/updated, associated food items are deleted/updated';



ALTER TABLE ONLY "public"."food_item"
    ADD CONSTRAINT "food_item_nutrition_id_fkey" FOREIGN KEY ("nutrition_id") REFERENCES "public"."nutrition"("id") ON UPDATE CASCADE ON DELETE CASCADE;



COMMENT ON CONSTRAINT "food_item_nutrition_id_fkey" ON "public"."food_item" IS 'Cascade delete/update: when nutrition record is deleted/updated, associated food items are deleted/updated';



ALTER TABLE ONLY "public"."location"
    ADD CONSTRAINT "location_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."location_type"("id");



ALTER TABLE ONLY "public"."menu_category"
    ADD CONSTRAINT "menu_category_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "public"."menu"("id") ON UPDATE CASCADE ON DELETE CASCADE;



COMMENT ON CONSTRAINT "menu_category_menu_id_fkey" ON "public"."menu_category" IS 'Cascade delete/update: when menu is deleted/updated, all associated menu categories are deleted/updated';



ALTER TABLE ONLY "public"."menu"
    ADD CONSTRAINT "menu_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON UPDATE CASCADE ON DELETE CASCADE;



COMMENT ON CONSTRAINT "menu_location_id_fkey" ON "public"."menu" IS 'Cascade delete/update: when location is deleted/updated, all associated menus are deleted/updated';



ALTER TABLE ONLY "public"."nutrition"
    ADD CONSTRAINT "nutrition_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_item"("id") ON UPDATE CASCADE ON DELETE CASCADE;



COMMENT ON CONSTRAINT "nutrition_food_item_id_fkey" ON "public"."nutrition" IS 'Cascade delete/update: when food item is deleted/updated, associated nutrition record is deleted/updated';



CREATE POLICY "Allow read access to all users" ON "public"."location" FOR SELECT USING (true);



CREATE POLICY "Allow read access to all users" ON "public"."location_type" FOR SELECT USING (true);



CREATE POLICY "Enable ALL to authenticated users" ON "public"."location" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable ALL to authenticated users" ON "public"."location_type" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."allergens" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."food_item" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."menu" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."menu_category" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."nutrition" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."allergens" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."food_item" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."menu" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."menu_category" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."nutrition" FOR SELECT USING (true);



ALTER TABLE "public"."allergens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."food_item" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."location" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."location_type" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."menu" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."menu_category" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nutrition" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."allergens";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."food_item";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."menu";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."menu_category";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."nutrition";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."insert_location_and_menus"("arg_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_location_and_menus"("arg_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_location_and_menus"("arg_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_multiple_locations_and_menus"("arg_data_array" "jsonb"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."insert_multiple_locations_and_menus"("arg_data_array" "jsonb"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_multiple_locations_and_menus"("arg_data_array" "jsonb"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_display_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_display_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_display_order"() TO "service_role";



























GRANT ALL ON TABLE "public"."allergens" TO "anon";
GRANT ALL ON TABLE "public"."allergens" TO "authenticated";
GRANT ALL ON TABLE "public"."allergens" TO "service_role";



GRANT ALL ON SEQUENCE "public"."allergens_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."allergens_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."allergens_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."food_item" TO "anon";
GRANT ALL ON TABLE "public"."food_item" TO "authenticated";
GRANT ALL ON TABLE "public"."food_item" TO "service_role";



GRANT ALL ON SEQUENCE "public"."food_item_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."food_item_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."food_item_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."location" TO "anon";
GRANT ALL ON TABLE "public"."location" TO "authenticated";
GRANT ALL ON TABLE "public"."location" TO "service_role";



GRANT ALL ON TABLE "public"."location_type" TO "anon";
GRANT ALL ON TABLE "public"."location_type" TO "authenticated";
GRANT ALL ON TABLE "public"."location_type" TO "service_role";



GRANT ALL ON TABLE "public"."menu" TO "anon";
GRANT ALL ON TABLE "public"."menu" TO "authenticated";
GRANT ALL ON TABLE "public"."menu" TO "service_role";



GRANT ALL ON TABLE "public"."menu_category" TO "anon";
GRANT ALL ON TABLE "public"."menu_category" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_category" TO "service_role";



GRANT ALL ON SEQUENCE "public"."menu_category_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."menu_category_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."menu_category_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."menu_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."menu_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."menu_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."nutrition" TO "anon";
GRANT ALL ON TABLE "public"."nutrition" TO "authenticated";
GRANT ALL ON TABLE "public"."nutrition" TO "service_role";



GRANT ALL ON SEQUENCE "public"."nutrition_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."nutrition_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."nutrition_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
