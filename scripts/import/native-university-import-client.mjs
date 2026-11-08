import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const tables = {
  identityRecord: 'IdentityRecord',
  roleRecord: 'RoleRecord',
  policyRecord: 'PolicyRecord',
  roleAssignmentRecord: 'RoleAssignmentRecord',
  assetRecord: 'AssetRecord',
  university: 'University',
  universitySourceRecord: 'UniversitySourceRecord',
  universityImportChangeSet: 'UniversityImportChangeSet',
  universityImportChange: 'UniversityImportChange',
  referenceCountry: 'ReferenceCountry',
  administrativeRegion: 'AdministrativeRegion',
  referenceCity: 'ReferenceCity',
  auditRecord: 'AuditRecord',
  transactionalOutboxRecord: 'TransactionalOutboxRecord',
};
const identifier = (value) => {
  assert.match(value, /^[A-Za-z][A-Za-z0-9]*$/);
  return '"' + value + '"';
};
const literal = (value) => {
  if (value === null) return 'NULL';
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value));
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  const text =
    value instanceof Date
      ? value.toISOString()
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
  return "'" + text.replaceAll("'", "''") + "'";
};
function where(input) {
  return (
    Object.entries(input ?? {})
      .map(([key, value]) => {
        if (key === 'OR' || key === 'AND')
          return '(' + value.map(where).join(key === 'OR' ? ' OR ' : ' AND ') + ')';
        const column = identifier(key);
        if (value === null) return column + ' IS NULL';
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          if ('in' in value)
            return value.in.length
              ? column + ' IN (' + value.in.map(literal).join(',') + ')'
              : 'FALSE';
          if ('path' in value)
            return (
              column +
              ' #> ARRAY[' +
              value.path.map(literal).join(',') +
              ']::text[] = ' +
              literal(JSON.stringify(value.equals)) +
              '::jsonb'
            );
          throw Error('NATIVE_IMPORT_FILTER_UNSUPPORTED:' + key);
        }
        return column + ' = ' + literal(value);
      })
      .join(' AND ') || 'TRUE'
  );
}
const dates = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k,
      v !== null &&
      [
        'createdAt',
        'updatedAt',
        'assignedAt',
        'appliedAt',
        'retentionExpiresAt',
        'deletedAt',
        'purgedAt',
        'effectiveFrom',
        'effectiveTo',
        'archivedAt',
      ].includes(k)
        ? // Prisma DateTime columns use timestamp without time zone, stored as
          // UTC. Never interpret PostgreSQL's zone-less JSON in the host zone.
          new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(v) ? v : v + 'Z')
        : v,
    ]),
  );
/** Narrow operator adapter over the installed PostgreSQL client. No credentials
 * in command arguments, shell interpolation, schema operations or connection
 * fallback. Keeps one TLS PostgreSQL connection and ordinary transactions. */
export class NativeUniversityImportClient {
  constructor({ executable, connection, ca, timeoutMs = 240000 }) {
    const u = new URL(connection),
      env = {
        ...process.env,
        PGHOST: u.hostname,
        PGPORT: u.port || '5432',
        PGDATABASE: u.pathname.slice(1),
        PGUSER: decodeURIComponent(u.username),
        PGPASSWORD: decodeURIComponent(u.password),
        PGCONNECT_TIMEOUT: '30',
        PGCLIENTENCODING: 'UTF8',
        PGOPTIONS: '',
        PGSSLMODE: u.hostname === '127.0.0.1' ? 'disable' : 'verify-full',
        PGSSLROOTCERT: ca,
      };
    this.process = spawn(executable, ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1'], {
      env,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.pending = [];
    this.buffer = '';
    this.errors = '';
    this.timeoutMs = timeoutMs;
    this.process.stdin.on('error', () => {
      this.closed = true;
      for (const pending of this.pending.splice(0)) {
        clearTimeout(pending.timer);
        pending.reject(Error('NATIVE_IMPORT_INPUT_CLOSED'));
      }
      this.process.kill();
    });
    this.process.on('error', () => {
      this.closed = true;
      for (const p of this.pending.splice(0)) {
        clearTimeout(p.timer);
        p.reject(Error('NATIVE_IMPORT_PROCESS_UNAVAILABLE'));
      }
    });
    this.process.stdout.setEncoding('utf8');
    this.process.stdout.on('data', (chunk) => {
      this.buffer += chunk;
      let at;
      while ((at = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, at).trim();
        this.buffer = this.buffer.slice(at + 1);
        if (!line) continue;
        const pending = this.pending.shift();
        if (!pending) continue;
        clearTimeout(pending.timer);
        try {
          pending.resolve(JSON.parse(line));
        } catch {
          pending.reject(Error('NATIVE_IMPORT_RESULT_INVALID'));
        }
      }
    });
    this.process.stderr.setEncoding('utf8');
    this.process.stderr.on('data', (chunk) => {
      this.errors = (this.errors + chunk).slice(-4000);
    });
    this.send(
      "SET client_min_messages=warning; SET standard_conforming_strings=on; SELECT 'true'::jsonb;",
    ).catch(() => {});
    this.process.on('exit', (code) => {
      this.closed = true;
      for (const p of this.pending.splice(0)) {
        clearTimeout(p.timer);
        p.reject(Error('NATIVE_IMPORT_CONNECTION_CLOSED:' + code + ':' + this.errors.slice(-1000)));
      }
    });
    for (const [delegate, table] of Object.entries(tables))
      this[delegate] = {
        findUnique: async (args) => (await this.find(table, args))[0] ?? null,
        findFirst: async (args) => (await this.find(table, { ...args, take: 1 }))[0] ?? null,
        findMany: (args) => this.find(table, args ?? {}),
        count: async (args) =>
          (
            await this.query(
              'SELECT count(*)::int AS total FROM ' +
                identifier(table) +
                ' WHERE ' +
                where(args?.where),
            )
          )[0].total,
        create: async ({ data }) => (await this.insert(table, [data]))[0],
        createMany: async ({ data }) => ({ count: (await this.insert(table, data)).length }),
      };
  }
  send(sql) {
    assert.ok(!this.closed, 'NATIVE_IMPORT_CLOSED');
    return new Promise((resolve, reject) => {
      const pending = {
        resolve,
        reject,
        timer: setTimeout(() => {
          this.process.kill();
          reject(Error('NATIVE_IMPORT_QUERY_TIMEOUT'));
        }, this.timeoutMs),
      };
      this.pending.push(pending);
      this.process.stdin.write(sql + '\n', (error) => {
        if (error) reject(error);
      });
    });
  }
  query(sql) {
    return this.send(
      "SELECT coalesce(jsonb_agg(row_to_json(__rows)),'[]'::jsonb) FROM (" + sql + ') AS __rows;',
    );
  }
  bind(sql, parameters) {
    return sql.replace(/\$(\d+)/g, (_, n) => {
      const value = parameters[Number(n) - 1];
      if (Array.isArray(value)) return 'ARRAY[' + value.map(literal).join(',') + ']';
      return literal(value);
    });
  }
  $queryRawUnsafe(sql, ...parameters) {
    return this.query(this.bind(sql, parameters));
  }
  async $executeRawUnsafe(sql, ...parameters) {
    const text = this.bind(sql, parameters);
    const result = await this.send(
      'WITH __written AS (' +
        text +
        " RETURNING 1) SELECT jsonb_build_object('total',count(*)::int) FROM __written;",
    );
    return result.total;
  }
  async find(table, args) {
    let columns = args.select
      ? Object.keys(args.select)
          .filter((k) => args.select[k])
          .map(identifier)
          .join(',')
      : '*';
    let sql = 'SELECT ' + columns + ' FROM ' + identifier(table) + ' WHERE ' + where(args.where);
    if (args.orderBy) {
      const ordering = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
      sql +=
        ' ORDER BY ' +
        ordering
          .flatMap((o) =>
            Object.entries(o).map(([k, v]) => identifier(k) + (v === 'desc' ? ' DESC' : ' ASC')),
          )
          .join(',');
    }
    if (args.take) sql += ' LIMIT ' + Number(args.take);
    const rows = (await this.query(sql)).map(dates);
    if (table === 'IdentityRecord' && args.include && rows[0]) {
      rows[0].user =
        (
          await this.query('SELECT * FROM "UserRecord" WHERE "identityId"=' + literal(rows[0].id))
        )[0] ?? null;
      rows[0].account =
        (
          await this.query(
            'SELECT * FROM "AccountRecord" WHERE "identityId"=' + literal(rows[0].id),
          )
        )[0] ?? null;
    }
    if (table === 'University' && args.include?.sourceRecords)
      for (const r of rows)
        r.sourceRecords = await this.find('UniversitySourceRecord', {
          where: { universityId: r.id },
        });
    return rows;
  }
  async insert(table, data) {
    if (!data.length) return [];
    const rows = data.map((row) => ({
        id: row.id ?? randomUUID(),
        ...row,
        ...([
          'University',
          'AuditRecord',
          'TransactionalOutboxRecord',
          'AssetRecord',
          'ReferenceCountry',
          'AdministrativeRegion',
          'ReferenceCity',
        ].includes(table)
          ? { updatedAt: row.updatedAt ?? new Date(), createdAt: row.createdAt ?? new Date() }
          : {}),
      })),
      keys = Object.keys(rows[0]),
      columns = keys.map(identifier).join(',');
    return (
      await this.send(
        'WITH __inserted AS (INSERT INTO ' +
          identifier(table) +
          ' (' +
          columns +
          ') SELECT ' +
          columns +
          ' FROM jsonb_populate_recordset(NULL::' +
          identifier(table) +
          ',' +
          literal(rows) +
          "::jsonb) RETURNING *) SELECT coalesce(jsonb_agg(row_to_json(__inserted)),'[]'::jsonb) FROM __inserted;",
      )
    ).map(dates);
  }
  async copyUniversityImportRows(table, keys, rows) {
    assert.ok(['University', 'UniversitySourceRecord', 'UniversityImportChange'].includes(table));
    assert.ok(rows.length > 0 && rows.length <= 1000);
    let stage2Dictionary;
    if (table === 'UniversitySourceRecord' && rows.every((row) => row.stage === 'STAGE_2')) {
      const headers = Object.keys(rows[0].metadata.rawFields),
        dictionary = [],
        index = new Map();
      const values = rows.map((row) => {
        assert.deepEqual(Object.keys(row.metadata.rawFields), headers);
        assert.ok(!('__stage2CopyDictionary' in row.metadata));
        return headers.map((header) => {
          const value = row.metadata.rawFields[header],
            key = JSON.stringify(value);
          if (!index.has(key)) {
            index.set(key, dictionary.length);
            dictionary.push(value);
          }
          return index.get(key);
        });
      });
      stage2Dictionary = { headers, ids: rows.map((row) => row.id), first: rows[0].id };
      rows = rows.map((row, offset) => ({
        ...row,
        metadata: {
          ...row.metadata,
          rawFields: values[offset],
          ...(offset === 0 ? { __stage2CopyDictionary: dictionary } : {}),
        },
      }));
    }
    // Journal snapshots duplicate rows just inserted on this same connection.
    // Reconstruct those exact fields server-side instead of uploading them twice.
    const snapshots = [];
    if (table === 'UniversityImportChange') {
      for (const type of ['UNIVERSITY', 'SOURCE_RECORD']) {
        const group = rows.filter((row) => row.entityType === type);
        if (!group.length) continue;
        const fields = Object.keys(group[0].afterState);
        assert.ok(
          group.every(
            (row) =>
              row.operation === 'CREATE' &&
              row.changeSetId === rows[0].changeSetId &&
              JSON.stringify(Object.keys(row.afterState)) === JSON.stringify(fields),
          ),
        );
        snapshots.push({ type, fields, count: group.length });
      }
      assert.equal(
        snapshots.reduce((n, group) => n + group.count, 0),
        rows.length,
      );
      rows = rows.map((row) => ({ ...row, afterState: null }));
    }
    const encode = (value) => {
      if (value === null) return '\\N';
      assert.notEqual(value, undefined);
      const text =
        value instanceof Date
          ? value.toISOString()
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);
      // COPY text escaping keeps source text out of SQL and prevents a source
      // newline or backslash-dot from terminating the input stream.
      return text
        .replaceAll('\\', '\\\\')
        .replaceAll('\t', '\\t')
        .replaceAll('\n', '\\n')
        .replaceAll('\r', '\\r');
    };
    const input = rows.map((row) => keys.map((key) => encode(row[key])).join('\t')).join('\n');
    const result = await this.send(
      'COPY ' +
        identifier(table) +
        ' (' +
        keys.map(identifier).join(',') +
        ') FROM STDIN WITH (FORMAT text);\n' +
        input +
        '\n\\.\n' +
        "SELECT jsonb_build_object('copied'," +
        rows.length +
        ');',
    );
    assert.equal(result.copied, rows.length);
    if (stage2Dictionary) {
      // Expand the lossless transport dictionary before returning to the owner
      // procedure. Only the original 44-field object reaches audit/commit.
      const expanded = await this.$executeRawUnsafe(
        'WITH dictionary AS MATERIALIZED (SELECT metadata->\'__stage2CopyDictionary\' AS values FROM "UniversitySourceRecord" WHERE id=$1) ' +
          "UPDATE \"UniversitySourceRecord\" AS source SET metadata=jsonb_set(source.metadata-'__stage2CopyDictionary','{rawFields}'," +
          "(SELECT jsonb_object_agg(header.key,dictionary.values->((source.metadata->'rawFields'->>(header.ordinal-1)::int)::int)) " +
          'FROM jsonb_array_elements_text($2::jsonb) WITH ORDINALITY AS header(key,ordinal))) ' +
          'FROM dictionary WHERE source.id=ANY($3::text[])',
        stage2Dictionary.first,
        JSON.stringify(stage2Dictionary.headers),
        stage2Dictionary.ids,
      );
      assert.equal(expanded, rows.length, 'STAGE2_SOURCE_DICTIONARY_EXPANSION_INCOMPLETE');
    }
    for (const group of snapshots) {
      const ownerTable = group.type === 'UNIVERSITY' ? 'University' : 'UniversitySourceRecord';
      const value =
        group.type === 'SOURCE_RECORD'
          ? `CASE WHEN field='importedAt' THEN to_jsonb(to_char(owner."importedAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) ELSE to_jsonb(owner)->field END`
          : 'to_jsonb(owner)->field';
      const updated = await this.$executeRawUnsafe(
        'UPDATE "UniversityImportChange" AS journal SET "afterState"=(SELECT jsonb_object_agg(field,' +
          value +
          ') FROM unnest($1::text[]) AS field) FROM ' +
          identifier(ownerTable) +
          ' AS owner WHERE journal."changeSetId"=$2 AND journal."entityType"=$3' +
          ' AND journal."entityId"=owner.id AND journal."afterState" IS NULL',
        group.fields,
        rows[0].changeSetId,
        group.type,
      );
      assert.equal(updated, group.count, 'STAGE1_JOURNAL_SNAPSHOT_INCOMPLETE');
    }
    return result.copied;
  }
  async $transaction(work) {
    await this.send(
      "BEGIN ISOLATION LEVEL SERIALIZABLE; SET LOCAL standard_conforming_strings=on; SELECT 'true'::jsonb;",
    );
    try {
      const result = await work(this);
      await this.send("COMMIT; SELECT 'true'::jsonb;");
      return result;
    } catch (e) {
      if (!this.closed) await this.send("ROLLBACK; SELECT 'true'::jsonb;");
      throw e;
    }
  }
  async $disconnect() {
    if (!this.closed) {
      this.process.stdin.end('\\q\n');
      await new Promise((resolve) => this.process.once('exit', resolve));
    }
  }
}
