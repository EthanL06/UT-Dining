CREATE OR REPLACE FUNCTION public.prune_old_menus(
  arg_keep_days INTEGER,
  arg_limit INTEGER DEFAULT 200
)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  removed INTEGER;
BEGIN
  IF arg_keep_days IS NULL OR arg_keep_days < 7 THEN
    RAISE EXCEPTION 'arg_keep_days must be at least 7';
  END IF;

  WITH doomed AS (
    SELECT id
    FROM menu
    WHERE date < (timezone('America/Chicago', now()))::date - arg_keep_days
    ORDER BY date, id
    LIMIT GREATEST(COALESCE(arg_limit, 200), 1)
  )
  DELETE FROM menu m
  USING doomed d
  WHERE m.id = d.id;

  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prune_old_menus(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_old_menus(INTEGER, INTEGER) TO service_role;

DROP INDEX IF EXISTS public.food_item_menu_category_id_idx;
