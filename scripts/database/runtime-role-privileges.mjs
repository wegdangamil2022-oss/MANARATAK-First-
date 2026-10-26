export function applicationPrivilegesSql(applicationRole) {
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(applicationRole ?? '') || applicationRole === 'postgres' || applicationRole.startsWith('pg_')) {
    throw new Error('APPLICATION_ROLE_INVALID');
  }
  // Default ACLs cannot exclude one table by name. New tables remain inaccessible
  // to the application until this post-migration policy explicitly grants them.
  return `DO $application_identity$
BEGIN
  IF '${applicationRole}' = current_user OR NOT EXISTS (
    SELECT FROM pg_roles r WHERE r.rolname='${applicationRole}' AND NOT (
      r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls
      OR EXISTS (SELECT FROM pg_auth_members m WHERE m.member=r.oid)
    )
  ) THEN RAISE EXCEPTION 'APPLICATION_ROLE_PRIVILEGE_REVIEW_REQUIRED'; END IF;
END
$application_identity$;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM ${applicationRole};
DO $application_grants$
DECLARE entry record;
BEGIN
  FOR entry IN SELECT n.nspname, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relname <> '_prisma_migrations'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I.%I TO %I', entry.nspname, entry.relname, '${applicationRole}');
  END LOOP;
  -- Reviewed read-through views are explicitly read-only. Do not grant all
  -- views, owner privileges, DDL, membership or migration-ledger access.
  IF EXISTS (SELECT FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='ReviewOwnerProjection' AND c.relkind='v') THEN
    GRANT SELECT ON public."ReviewOwnerProjection" TO ${applicationRole};
  END IF;
  IF to_regclass('public."_prisma_migrations"') IS NOT NULL THEN
    REVOKE ALL ON TABLE public."_prisma_migrations" FROM ${applicationRole}, PUBLIC;
    IF has_table_privilege('${applicationRole}', 'public._prisma_migrations', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
      RAISE EXCEPTION 'APPLICATION_MIGRATION_LEDGER_ACCESS_REMAINS';
    END IF;
  END IF;
END
$application_grants$;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${applicationRole};`;
}
