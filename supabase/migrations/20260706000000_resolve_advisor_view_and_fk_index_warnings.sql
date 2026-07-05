-- Resolve Supabase advisor items that are safe to apply automatically.
--
-- This migration is intentionally non-destructive:
--   1. Public views are forced to use invoker privileges so table RLS is respected.
--   2. Supporting indexes are added for foreign-key columns that do not already have
--      a valid matching prefix index.
--
-- This migration does NOT:
--   - create broad RLS policies for PHI-bearing tables,
--   - drop duplicate or unused indexes,
--   - change Supabase Auth settings such as OTP expiry or leaked password protection.

DO $$
DECLARE
  v record;
BEGIN
  FOR v IN
    SELECT n.nspname AS schema_name,
           c.relname AS relation_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
  LOOP
    EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true)', v.schema_name, v.relation_name);
  END LOOP;
END $$;

DO $$
DECLARE
  r record;
  idx_name text;
  cols_sql text;
BEGIN
  FOR r IN
    WITH fk AS (
      SELECT c.oid AS constraint_oid,
             c.conname,
             c.conrelid,
             c.conkey,
             n.nspname AS schema_name,
             rel.relname AS table_name,
             array_agg(a.attname ORDER BY k.ord) AS column_names
      FROM pg_constraint c
      JOIN pg_class rel ON rel.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = rel.relnamespace
      JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
      WHERE c.contype = 'f'
        AND n.nspname = 'public'
      GROUP BY c.oid, c.conname, c.conrelid, c.conkey, n.nspname, rel.relname
    ), indexed_fk AS (
      SELECT fk.constraint_oid
      FROM fk
      JOIN pg_index i ON i.indrelid = fk.conrelid
      WHERE i.indisvalid
        AND i.indpred IS NULL
        AND (i.indkey::smallint[])[0:array_length(fk.conkey, 1)-1] = fk.conkey
    )
    SELECT fk.*
    FROM fk
    LEFT JOIN indexed_fk ix ON ix.constraint_oid = fk.constraint_oid
    WHERE ix.constraint_oid IS NULL
    ORDER BY fk.schema_name, fk.table_name, fk.conname
  LOOP
    SELECT string_agg(format('%I', col), ', ')
      INTO cols_sql
    FROM unnest(r.column_names) AS col;

    idx_name := lower('idx_fk_' || r.table_name || '_' || array_to_string(r.column_names, '_'));
    idx_name := regexp_replace(idx_name, '[^a-z0-9_]', '_', 'g');

    IF length(idx_name) > 55 THEN
      idx_name := left(idx_name, 44) || '_' || substr(md5(r.schema_name || '.' || r.table_name || ':' || array_to_string(r.column_names, ',')), 1, 10);
    END IF;

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.%I (%s)', idx_name, r.schema_name, r.table_name, cols_sql);
  END LOOP;
END $$;
