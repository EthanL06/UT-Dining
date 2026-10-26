CREATE INDEX IF NOT EXISTS idx_menu_location_id ON public.menu USING btree (location_id);
CREATE INDEX IF NOT EXISTS idx_menu_date ON public.menu USING btree (date);
CREATE INDEX IF NOT EXISTS idx_menu_category_menu_id ON public.menu_category USING btree (menu_id);
CREATE INDEX IF NOT EXISTS idx_food_item_menu_category_id ON public.food_item USING btree (menu_category_id);
CREATE INDEX IF NOT EXISTS idx_food_item_nutrition_id ON public.food_item USING btree (nutrition_id);
CREATE INDEX IF NOT EXISTS idx_food_item_allergens_id ON public.food_item USING btree (allergens_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_food_item_id ON public.nutrition USING btree (food_item_id);
CREATE INDEX IF NOT EXISTS idx_allergens_food_item_id ON public.allergens USING btree (food_item_id);
