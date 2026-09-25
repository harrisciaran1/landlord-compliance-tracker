-- Grant table-level privileges to Supabase auth roles.
--
-- Context: 00001_initial_schema.sql enabled Row Level Security and defined
-- policies, but never granted table privileges. In Postgres these are two
-- separate layers:
--   * GRANT decides whether a role may touch the table at all
--   * RLS policies then filter which rows that role may see/modify
--
-- Without grants, queries fail with "permission denied for table <name>"
-- before RLS policies are ever evaluated.
--
-- Broad grants are safe here because RLS is enabled on every table below.
-- With RLS enabled, an operation that has no matching policy is denied even
-- if the grant allows it. For example notification_log and audit_log only
-- define SELECT policies, so they remain effectively read-only for users.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
    TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure future tables created in this schema inherit the same grants,
-- so this problem doesn't recur with later migrations.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
