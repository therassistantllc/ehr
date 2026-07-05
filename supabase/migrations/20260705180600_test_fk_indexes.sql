-- FK index migration test.

DO $$
DECLARE
  checked_count integer := 0;
BEGIN
  checked_count := checked_count + 1;
  RAISE NOTICE 'checked %', checked_count;
END $$;
