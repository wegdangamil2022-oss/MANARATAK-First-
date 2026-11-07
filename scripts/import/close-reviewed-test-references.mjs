import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

/** Reviewed operator procedure. The caller supplies an authenticated/audited
 * Serializable transaction and the governed reference repository. No CLI or
 * implicit environment, schema changes, publishing or source updates. */
export async function closeReviewedTestReferences(
  tx,
  plan,
  planHash,
  referenceRepository,
  dedupKey,
) {
  const ids = [...plan.rows, ...plan.relations].map((r) => r.testId);
  assert.equal(new Set(ids).size, 8, 'CLOSURE_SCOPE_CHANGED');
  await tx.$queryRawUnsafe(
    'SELECT id FROM "InternationalTest" WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',
    ids,
  );
  const history = await tx.internationalTestEvidenceHistory.findMany({
    where: { testId: { in: ids }, actorId: plan.actorId },
  });
  const done = history.filter(
    (r) => r.payload?.kind === 'REFERENCE_CLOSURE' && r.payload?.planHash === planHash,
  );
  if (done.length === 8) return { replayed: true, owners: 0 };
  assert.equal(done.length, 0, 'PARTIAL_REFERENCE_CLOSURE');
  const roots = await tx.internationalTest.findMany({
    where: { id: { in: ids } },
    include: { governance: true },
  });
  assert.equal(roots.length, 8, 'OWNER_MISSING');
  for (const decision of [...plan.rows, ...plan.relations]) {
    const owner = roots.find((r) => r.id === decision.testId);
    assert.ok(
      !owner.isPubliclyVisible &&
        !owner.currentPublishedVersionId &&
        !owner.isSourceVerified &&
        ['IMPORTED', 'READY_TO_REVIEW', 'NEEDS_REVIEW'].includes(owner.status),
      'OWNER_NOT_DRAFT',
    );
    assert.equal(owner.governance?.revision, decision.expectedRevision, 'STALE_REFERENCE_CLOSURE');
  }
  const refIds = {};
  for (const ref of plan.references) {
    const isCountry = ref.kind === 'COUNTRY',
      prior = await (isCountry ? tx.referenceCountry : tx.referenceLanguage).findUnique({
        where: isCountry ? { iso2Code: ref.data.iso2Code } : { isoCode: ref.data.isoCode },
      });
    assert.equal(prior, null, 'REFERENCE_CREATED_SINCE_REVIEW');
    const result = isCountry
      ? await referenceRepository.upsertCountry(ref.data)
      : await referenceRepository.upsertLanguage(ref.data);
    refIds[isCountry ? ref.data.iso2Code : ref.data.isoCode] = result.id;
  }
  const existing = await tx.internationalTestProvider.findMany({
    where: { id: { in: plan.providers.map((r) => r.id) } },
  });
  assert.equal(existing.length, 0, 'PROVIDER_CREATED_SINCE_REVIEW');
  await tx.internationalTestProvider.createMany({
    data: plan.providers.map((p) => ({
      ...p,
      metadata: { reviewedOn: plan.reviewedOn, planHash, source: 'REVIEWED_REFERENCE_CLOSURE' },
    })),
  });
  for (const row of plan.rows) {
    const owner = roots.find((r) => r.id === row.testId);
    assert.equal(owner.canonicalDedupKey, row.expectedCanonicalDedupKey, 'OWNER_IDENTITY_CHANGED');
    assert.ok(
      ['SINGLE_PROVIDER', 'MULTIPLE_PROVIDERS', 'DECENTRALIZED_ADMINISTRATION'].includes(
        row.resolution.mode,
      ),
    );
    const participantIds = row.resolution.providers.map((p) => p.providerId);
    const participants = await tx.internationalTestProvider.findMany({
      where: { id: { in: participantIds } },
    });
    assert.equal(participants.length, participantIds.length, 'PROVIDER_MISSING');
    for (const p of row.resolution.providers)
      assert.equal(
        participants.find((r) => r.id === p.providerId)?.displayName,
        p.displayName,
        'PROVIDER_CHANGED',
      );
    const primary = row.resolution.mode === 'SINGLE_PROVIDER' ? row.resolution.providers[0] : null;
    assert.equal(owner.providerId, null, 'PROVIDER_ALREADY_CHANGED');
    await tx.internationalTest.update({
      where: { id: owner.id },
      data: {
        ...(primary
          ? {
              providerId: primary.providerId,
              providerName: primary.displayName,
              canonicalDedupKey: dedupKey({
                canonicalName: owner.canonicalName,
                providerName: primary.displayName,
              }),
            }
          : {}),
        optionalFields: {
          ...(owner.optionalFields ?? {}),
          providerReviewResolution: { ...row.resolution, reviewedBy: plan.actorId, planHash },
        },
      },
    });
  }
  for (const row of plan.relations) {
    const version = await tx.internationalTestVersion.findFirst({
      where: { testId: row.testId, sourceHash: row.sourceHash },
      include: { contentBlocks: { where: { blockKey: 'source.raw' } } },
    });
    assert.ok(
      version?.contentBlocks.some((b) => b.content.includes(row.excerpt)),
      'SOURCE_EVIDENCE_CHANGED',
    );
    const canonicalReferenceId = refIds[row.referenceCode];
    assert.ok(canonicalReferenceId);
    const data = {
      testId: row.testId,
      canonicalReferenceId,
      relationshipType: row.relationshipType,
      notes: 'علاقة مذكورة في المصدر؛ أضيف المرجع بعد التحقق الرسمي.',
      metadata: {
        sourceKey: row.sourceKey,
        sourceHash: row.sourceHash,
        excerpt: row.excerpt,
        planHash,
        reviewedBy: plan.actorId,
      },
    };
    if (row.kind === 'COUNTRY')
      await tx.internationalTestCountryRelationship.create({
        data: { ...data, countryIso2Code: row.referenceCode },
      });
    else
      await tx.internationalTestLanguageRelationship.create({
        data: { ...data, languageIsoCode: row.referenceCode },
      });
  }
  await tx.internationalTestEvidenceHistory.createMany({
    data: [...plan.rows, ...plan.relations].map((row) => ({
      id: randomUUID(),
      testId: row.testId,
      actorId: plan.actorId,
      payload: { kind: 'REFERENCE_CLOSURE', planHash, decision: row },
    })),
  });
  assert.equal(
    await tx.$executeRawUnsafe(
      'UPDATE "InternationalTestGovernance" SET revision=revision+1,approval=NULL,verification=NULL WHERE "testId"=ANY($1::text[])',
      ids,
    ),
    8,
  );
  return {
    replayed: false,
    owners: 8,
    references: 2,
    relationships: 2,
    singleProvider: 1,
    multipleProviderDecisions: 5,
    referenceIds: refIds,
  };
}
