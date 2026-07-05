-- Adds missing indexes for foreign-key columns in the application schema.
-- Scope: public schema only.
-- Excludes Supabase-managed schemas such as auth, storage, and pgsodium.
-- Uses CREATE INDEX IF NOT EXISTS so the migration is safe to rerun.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    WITH fk_constraints AS (
      SELECT
        c.oid AS constraint_oid,
        n.nspname AS schema_name,
        rel.relname AS table_name,
        c.conname AS constraint_name,
        c.conrelid,
        array_agg(att.attname ORDER BY u.ord) AS column_names,
        array_agg(u.attnum::int ORDER BY u.ord) AS column_nums
      FROM pg_constraint c
      JOIN pg_class rel ON rel.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = rel.relnamespace
      JOIN unnest(c.conkey) WITH ORDINALITY AS u(attnum, ord) ON true
      JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = u.attnum
      WHERE c.contype = 'f'
        AND n.nspname = 'public'
      GROUP BY c.oid, n.nspname, rel.relname, c.conname, c.conrelid
    )
    SELECT
      fk.schema_name,
      fk.table_name,
      fk.constraint_name,
      (
        left(
          'idx_' || fk.table_name || '_' || array_to_string(fk.column_names, '_') || '_fk',
          55
        ) || '_' || substr(md5(fk.constraint_name), 1, 7)
      ) AS index_name,
      (
        SELECT string_agg(format('%I', col), ', ')
        FROM unnest(fk.column_names) AS col
      ) AS columns_sql
    FROM fk_constraints fk
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_index i
      WHERE i.indrelid = fk.conrelid
        AND i.indisvalid = true
        AND i.indisready = true
        AND (
          SELECT array_agg(k.attnum::int ORDER BY k.ord)
          FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
          WHERE k.ord <= array_length(fk.column_nums, 1)
        ) = fk.column_nums
    )
  LOOP
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I.%I (%s)',
      r.index_name,
      r.schema_name,
      r.table_name,
      r.columns_sql
    );
  END LOOP;
END $$;
