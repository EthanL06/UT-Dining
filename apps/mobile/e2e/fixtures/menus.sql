\set ON_ERROR_STOP on

with
  today as (
    select (timezone('America/Chicago', now()))::date as d
  ),
  days as (
    select offset_days, (select d from today) + offset_days as menu_date
    from generate_series(-1, 3) as offset_days
  ),
  food as (
    select jsonb_build_object(
      'name', name,
      'link', '',
      'nutrition', jsonb_build_object(
        'servingSize', '1 each',
        'calories', calories,
        'totalFat', '9g',
        'saturatedFat', '2g',
        'transFat', '0g',
        'cholesterol', '15mg',
        'sodium', '420mg',
        'totalCarbohydrates', carbs,
        'dietaryFiber', '4g',
        'totalSugars', '6g',
        'protein', protein,
        'vitaminD', '0mcg',
        'calcium', '80mg',
        'iron', '2mg',
        'potassium', '300mg',
        'ingredients', 'Fixture ingredients for Maestro tests'
      ),
      'allergens', allergens
    ) as item, name
    from (
      values
        ('Maestro Veggie Burger', '410', '21g', '38g', '{"wheat": true, "soy": true, "vegetarian": true}'::jsonb),
        ('Maestro Grilled Chicken', '320', '42g', '4g', '{"halal": true}'::jsonb),
        ('Maestro Garden Salad', '150', '5g', '12g', '{"vegan": true, "vegetarian": true}'::jsonb),
        ('Maestro Tofu Bowl', '480', '24g', '61g', '{"soy": true, "vegan": true, "vegetarian": true}'::jsonb),
        ('Maestro Breakfast Tacos', '390', '18g', '33g', '{"egg": true, "milk": true, "wheat": true}'::jsonb),
        ('Maestro Tomorrow Special', '520', '30g', '45g', '{"milk": true}'::jsonb)
    ) as f(name, calories, protein, carbs, allergens)
  ),
  payload as (
    select jsonb_build_object(
      'locationName', 'J2 Dining',
      'date', days.menu_date::text,
      'menus', (
        select jsonb_agg(
          jsonb_build_object(
            'type', meal,
            'menuCategories', jsonb_build_array(
              jsonb_build_object(
                'categoryName', 'Maestro Grill',
                'foods', (
                  select jsonb_agg(food.item order by food.name)
                  from food
                  where food.name in ('Maestro Veggie Burger', 'Maestro Grilled Chicken')
                     or (food.name = 'Maestro Breakfast Tacos' and meal = 'Breakfast')
                     or (food.name = 'Maestro Tomorrow Special' and days.offset_days = 1)
                )
              ),
              jsonb_build_object(
                'categoryName', 'Maestro Greens',
                'foods', (
                  select jsonb_agg(food.item order by food.name)
                  from food
                  where food.name in ('Maestro Garden Salad', 'Maestro Tofu Bowl')
                )
              )
            )
          )
          order by ordinality
        )
        from unnest(array['Breakfast', 'Lunch', 'Dinner']) with ordinality as meal
      )
    ) as data
    from days
  )
select public.insert_multiple_locations_and_menus(array_agg(data)) from payload;

