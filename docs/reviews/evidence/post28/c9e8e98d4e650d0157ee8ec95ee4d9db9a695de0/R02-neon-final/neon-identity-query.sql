SELECT current_database() AS database, current_user AS role,
  session_user AS "sessionRole", d.oid::text AS "databaseOid",
  (current_setting('server_version_num')::integer / 10000)::integer AS "postgresMajor",
  current_setting('TimeZone') AS timezone,
  (current_setting('transaction_read_only')='on') AS "probeReadOnly",
  current_setting('session_replication_role') AS "sessionReplicationRole",
  COALESCE((SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),false) AS tls,
  (SELECT version FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS "tlsVersion",
  r.rolsuper AS superuser, r.rolcreaterole AS "createRole", r.rolcreatedb AS "createDatabase",
  r.rolreplication AS replication, r.rolbypassrls AS "bypassRls",
  EXISTS(SELECT 1 FROM pg_roles p WHERE (p.rolsuper OR p.rolcreaterole OR p.rolcreatedb OR p.rolreplication OR p.rolbypassrls OR p.rolname='neon_superuser' OR p.rolname LIKE 'pg_%')
    AND pg_has_role(current_user, p.oid, 'MEMBER')) AS "privilegedMembership",
  pg_has_role(current_user, 'pg_write_all_data', 'MEMBER') AS "globalWrite",
  pg_has_role(current_user, 'pg_read_all_data', 'MEMBER') AS "globalRead",
  pg_has_role(current_user, pg_get_userbyid(d.datdba), 'MEMBER') AS "databaseOwner",
  has_database_privilege(current_user, d.oid, 'CREATE') AS "databaseCreate",
  has_database_privilege(current_user, d.oid, 'CONNECT') AS "canConnect",
  has_schema_privilege(current_user, 'public', 'USAGE') AS "schemaUsage",
  has_schema_privilege(current_user, 'public', 'CREATE') AS "schemaCreate",
  EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname NOT IN ('public','information_schema')
    AND n.nspname NOT LIKE 'pg_%' AND has_schema_privilege(current_user,n.oid,'CREATE')) AS "otherSchemaCreate",
  EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_%'
    AND pg_has_role(current_user,c.relowner,'MEMBER')) AS "ownsRelations",
  (SELECT count(*)::integer FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')) AS "publicTables",
  (SELECT count(*)::integer FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace
    WHERE n.nspname='public' AND NOT c.convalidated) AS "unvalidatedConstraints",
  (SELECT count(*)::integer FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT i.indisvalid) AS "invalidIndexes"
  FROM pg_database d JOIN pg_roles r ON r.rolname=current_user WHERE d.datname=current_database()