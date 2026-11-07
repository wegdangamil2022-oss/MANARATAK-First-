import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const reviewHash = (value) => createHash('sha256').update(value).digest('hex');

/** Offline source proof. This module never reads credentials or opens a database. */
export function verifyReviewedTestRelationships(plan, manifestBytes, root) {
  assert.equal(plan.schemaVersion, 1);
  assert.equal(reviewHash(manifestBytes), plan.sourceManifestHash, 'SOURCE_MANIFEST_CHANGED');
  assert.ok(plan.actorId);
  const manifest = JSON.parse(manifestBytes),
    sourceCache = new Map(),
    ids = new Set();
  for (const row of plan.rows) {
    assert.ok(!ids.has(row.testId), 'DUPLICATE_OWNER');
    ids.add(row.testId);
    assert.ok(Number.isSafeInteger(row.expectedRevision) && row.expectedRevision >= 0);
    const relationships = new Set();
    for (const decision of [
      ...(row.provider?.decision === 'LINK' ? [row.provider] : []),
      ...row.relationships,
    ]) {
      const source = manifest.matching_rows.find(
        (s) => s.sourceKey === decision.sourceKey && s.sourceHash === decision.sourceHash,
      );
      assert.ok(source, 'UNKNOWN_SOURCE');
      let text = sourceCache.get(source.sourceKey);
      if (text === undefined) {
        const file = fs.realpathSync(path.resolve(root, source.file)),
          base = fs.realpathSync(root);
        assert.ok(file.startsWith(base + path.sep), 'SOURCE_OUTSIDE_REPOSITORY');
        const bytes = fs.readFileSync(file);
        assert.equal(reviewHash(bytes), source.sourceHash, 'SOURCE_BYTES_CHANGED');
        text = bytes.toString('utf8');
        sourceCache.set(source.sourceKey, text);
      }
      assert.ok(
        decision.excerpt?.trim() && text.includes(decision.excerpt),
        'NON_LITERAL_SOURCE_EVIDENCE',
      );
      if (decision.decision === 'LINK') {
        assert.ok(decision.excerpt.includes(decision.literalName), 'PROVIDER_NOT_IN_EVIDENCE');
        assert.ok(decision.providerId && decision.providerName);
      } else {
        assert.ok(['COUNTRY', 'LANGUAGE', 'DEGREE', 'TAXONOMY'].includes(decision.kind));
        assert.ok(decision.referenceId && decision.referenceCode && decision.relationshipType);
        const key = `${decision.kind}:${decision.referenceId}:${decision.relationshipType}`;
        assert.ok(!relationships.has(key), 'DUPLICATE_RELATIONSHIP');
        relationships.add(key);
      }
    }
  }
  return { owners: ids.size, sources: sourceCache.size };
}

/** Operator-only persistence inside an authenticated, audited transaction.
 * The caller must lock/recheck the active actor and permissions in this same
 * transaction and supply the domain deduplication function. No standalone CLI,
 * implicit credentials, publication, deletion, schema changes or source rewrites.
 */
export async function persistReviewedTestRelationshipBatch(tx, plan, rows, planHash, dedupKey) {
  assert.ok(plan.actorId && /^[a-f0-9]{64}$/.test(planHash));
  assert.ok(rows.length > 0 && rows.length <= 10);
  const ids = rows.map((row) => row.testId);
  await tx.$queryRawUnsafe(
    'SELECT "id" FROM "InternationalTest" WHERE "id" = ANY($1::text[]) ORDER BY "id" FOR UPDATE',
    ids,
  );
  const prior = await tx.internationalTestEvidenceHistory.findMany({
    where: { testId: { in: ids }, actorId: plan.actorId },
  });
  const applied = new Set(
    prior
      .filter(
        (r) => r.payload?.kind === 'SOURCE_RELATIONSHIP_REVIEW' && r.payload?.planHash === planHash,
      )
      .map((r) => r.testId),
  );
  if (applied.size === ids.length) return { replayed: true, owners: 0, relationships: 0 };
  assert.equal(applied.size, 0, 'PARTIAL_REVIEW_BATCH');
  const roots = await tx.internationalTest.findMany({
    where: { id: { in: ids } },
    include: {
      governance: true,
      versions: {
        select: {
          sourceHash: true,
          contentBlocks: { where: { blockKey: 'source.raw' }, select: { content: true } },
        },
      },
    },
  });
  assert.equal(roots.length, ids.length, 'OWNER_MISSING');
  const changes = [],
    evidence = [],
    relationData = { COUNTRY: [], LANGUAGE: [], DEGREE: [], TAXONOMY: [] };
  const definitions = {
    COUNTRY: ['ReferenceCountry', 'referenceCountry', 'iso2Code'],
    LANGUAGE: ['ReferenceLanguage', 'referenceLanguage', 'isoCode'],
    DEGREE: ['DegreeLevel', 'degreeLevel', 'canonicalCode'],
    TAXONOMY: ['AcademicTaxonomyNode', 'academicTaxonomyNode', 'canonicalCode'],
  };
  const references = rows.flatMap((row) => row.relationships);
  for (const [kind, [table, delegate, code]] of Object.entries(definitions)) {
    const targetIds = [
      ...new Set(references.filter((r) => r.kind === kind).map((r) => r.referenceId)),
    ];
    if (!targetIds.length) continue;
    await tx.$queryRawUnsafe(
      `SELECT "id" FROM "${table}" WHERE "id" = ANY($1::text[]) ORDER BY "id" FOR SHARE`,
      targetIds,
    );
    const found = await tx[delegate].findMany({ where: { id: { in: targetIds } } });
    for (const ref of references.filter((r) => r.kind === kind)) {
      const target = found.find((r) => r.id === ref.referenceId);
      assert.ok(target && target[code] === ref.referenceCode, 'REFERENCE_ID_CODE_MISMATCH');
      assert.ok(
        kind === 'DEGREE' || kind === 'TAXONOMY'
          ? target.status === 'ACTIVE'
          : target.isActive && target.lifecycleState === 'ACTIVE',
        'INACTIVE_REFERENCE',
      );
    }
  }
  const providerIds = rows.flatMap((row) =>
    row.provider?.decision === 'LINK' ? [row.provider.providerId] : [],
  );
  if (providerIds.length)
    await tx.$queryRawUnsafe(
      'SELECT "id" FROM "InternationalTestProvider" WHERE "id" = ANY($1::text[]) ORDER BY "id" FOR SHARE',
      providerIds,
    );
  const providers = await tx.internationalTestProvider.findMany({
    where: { id: { in: providerIds } },
  });
  for (const row of rows) {
    const current = roots.find((root) => root.id === row.testId);
    assert.ok(
      !current.isPubliclyVisible &&
        !current.isSourceVerified &&
        !current.currentPublishedVersionId &&
        ['IMPORTED', 'READY_TO_REVIEW', 'NEEDS_REVIEW'].includes(current.status),
      'OWNER_NOT_UNPUBLISHED_DRAFT',
    );
    assert.equal(current.governance?.revision ?? 0, row.expectedRevision, 'STALE_REVIEW_REVISION');
    assert.equal(current.providerId, row.expectedProviderId, 'PROVIDER_CHANGED');
    assert.equal(current.canonicalDedupKey, row.expectedCanonicalDedupKey, 'IDENTITY_CHANGED');
    for (const ref of [
      ...(row.provider?.decision === 'LINK' ? [row.provider] : []),
      ...row.relationships,
    ]) {
      const version = current.versions.find((v) => v.sourceHash === ref.sourceHash);
      assert.ok(
        version?.contentBlocks.some((b) => b.content.includes(ref.excerpt)),
        'PERSISTED_SOURCE_EVIDENCE_MISMATCH',
      );
    }
    const provider = row.provider?.decision === 'LINK' ? row.provider : null;
    if (provider)
      assert.equal(
        providers.find((p) => p.id === provider.providerId)?.displayName,
        provider.providerName,
        'PROVIDER_REFERENCE_CHANGED',
      );
    const canonicalDedupKey = provider
      ? dedupKey({ canonicalName: current.canonicalName, providerName: provider.providerName })
      : current.canonicalDedupKey;
    changes.push({
      id: current.id,
      providerId: provider?.providerId ?? current.providerId,
      providerName: provider?.providerName ?? current.providerName,
      canonicalDedupKey,
      review: {
        planHash,
        reviewedBy: plan.actorId,
        providerDecision: row.provider?.decision ?? 'EXISTING_PROVIDER_PRESERVED',
        providerReason: row.provider?.reason ?? null,
      },
    });
    evidence.push({
      id: randomUUID(),
      testId: current.id,
      actorId: plan.actorId,
      payload: {
        kind: 'SOURCE_RELATIONSHIP_REVIEW',
        planHash,
        provider: row.provider ?? null,
        relationships: row.relationships,
      },
    });
    for (const ref of row.relationships) {
      const common = {
        id: randomUUID(),
        testId: row.testId,
        relationshipType: ref.relationshipType,
        notes: 'علاقة مذكورة صراحة في المصدر؛ ليست ضمان قبول أو توافر جلسات.',
        metadata: {
          source: 'SOURCE_LITERAL_ADMIN_REVIEW',
          planHash,
          reviewedBy: plan.actorId,
          sourceKey: ref.sourceKey,
          sourceHash: ref.sourceHash,
          excerpt: ref.excerpt,
        },
      };
      relationData[ref.kind].push(
        ref.kind === 'COUNTRY'
          ? { ...common, canonicalReferenceId: ref.referenceId, countryIso2Code: ref.referenceCode }
          : ref.kind === 'LANGUAGE'
            ? {
                ...common,
                canonicalReferenceId: ref.referenceId,
                languageIsoCode: ref.referenceCode,
              }
            : ref.kind === 'DEGREE'
              ? { ...common, degreeLevelId: ref.referenceId, degreeLevelCode: ref.referenceCode }
              : { ...common, taxonomyNodeId: ref.referenceId },
      );
    }
  }
  // Unique canonicalDedupKey and relationship constraints reject collisions;
  // no upsert or skipDuplicates silently masks a conflicting review.
  const changed = await tx.$executeRawUnsafe(
    `UPDATE "InternationalTest" t SET "providerId"=d."providerId", "providerName"=d."providerName", "canonicalDedupKey"=d."canonicalDedupKey", "optionalFields"=coalesce(t."optionalFields",'{}'::jsonb)||jsonb_build_object('sourceRelationshipReview',d.review), "updatedAt"=now() FROM jsonb_to_recordset($1::jsonb) AS d(id text,"providerId" text,"providerName" text,"canonicalDedupKey" text,review jsonb) WHERE t.id=d.id`,
    JSON.stringify(changes),
  );
  assert.equal(changed, rows.length);
  for (const [kind, delegate] of Object.entries({
    COUNTRY: 'internationalTestCountryRelationship',
    LANGUAGE: 'internationalTestLanguageRelationship',
    DEGREE: 'internationalTestDegreeRelationship',
    TAXONOMY: 'internationalTestAcademicTaxonomyRelationship',
  }))
    if (relationData[kind].length) await tx[delegate].createMany({ data: relationData[kind] });
  await tx.internationalTestEvidenceHistory.createMany({ data: evidence });
  const advanced = await tx.$executeRawUnsafe(
    'UPDATE "InternationalTestGovernance" SET "revision"="revision"+1,"approval"=NULL,"verification"=NULL WHERE "testId"=ANY($1::text[])',
    ids,
  );
  assert.equal(advanced, rows.length, 'GOVERNANCE_OWNER_MISSING');
  return { replayed: false, owners: rows.length, relationships: references.length };
}
