CREATE INDEX `food_item_category_idx` ON `food_item` (`menu_category_id`);--> statement-breakpoint
CREATE INDEX `menu_date_location_idx` ON `menu` (`date`,`location_id`);--> statement-breakpoint
CREATE INDEX `menu_category_menu_idx` ON `menu_category` (`menu_id`);