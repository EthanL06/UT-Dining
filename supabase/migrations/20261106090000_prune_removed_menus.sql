CREATE OR REPLACE FUNCTION public.prune_location_day_menus(
  arg_location_name TEXT,
  arg_date DATE,
  arg_menu_names TEXT[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  removed INTEGER;
BEGIN
  IF arg_menu_names IS NULL OR cardinality(arg_menu_names) = 0 THEN
    RETURN 0;
  END IF;

  DELETE FROM menu m
  USING location l
  WHERE m.location_id = l.id
    AND (LOWER(l.name) = LOWER(arg_location_name) OR LOWER(l.colloquial_name) = LOWER(arg_location_name))
    AND m.date = arg_date
    AND NOT (m.name = ANY (arg_menu_names));

  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prune_location_day_menus(TEXT, DATE, TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_location_day_menus(TEXT, DATE, TEXT[]) TO service_role;
