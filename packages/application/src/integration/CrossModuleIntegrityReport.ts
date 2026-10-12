/** Caller supplies already permissioned owner facts. No private student/finance projection is admitted. */
export type IntegrityOwner = 'UNIVERSITIES' | 'MAJORS' | 'SCHOLARSHIPS' | 'TESTS' | 'CMS';
export type IntegrityFact = {
  owner: IntegrityOwner;
  id: string;
  status: string;
  references: Array<{
    owner: IntegrityOwner;
    id: string;
    expectedParentId?: string;
    actualParentId?: string;
    publiclyEligible?: boolean;
  }>;
};
export function crossModuleIntegrityReport(
  facts: IntegrityFact[],
  allowed: ReadonlySet<IntegrityOwner>,
  provenance: 'CI_FIXTURE' | 'PERMISSIONED_OWNER_SAMPLE',
  complete: boolean,
) {
  const publicOwners = new Set<IntegrityOwner>([
    'UNIVERSITIES',
    'MAJORS',
    'SCHOLARSHIPS',
    'TESTS',
    'CMS',
  ]);
  if (
    facts.length > 1000 ||
    [...allowed].some((owner) => !publicOwners.has(owner)) ||
    facts.some((fact) => !publicOwners.has(fact.owner) || fact.references.length > 100)
  )
    throw new Error('INTEGRITY_OWNER_SCOPE_INVALID');
  const visible = facts.filter((fact) => allowed.has(fact.owner));
  const ids = new Set(visible.map((fact) => `${fact.owner}:${fact.id}`));
  const findings = visible.flatMap((fact) =>
    fact.references
      .filter((ref) => allowed.has(ref.owner))
      .flatMap((ref) => {
        const codes = [
          !ids.has(`${ref.owner}:${ref.id}`) && complete ? 'MISSING_OWNER_REFERENCE' : null,
          ref.expectedParentId && ref.actualParentId && ref.expectedParentId !== ref.actualParentId
            ? 'OWNER_PARENT_MISMATCH'
            : null,
          fact.status === 'PUBLISHED' && ref.publiclyEligible === false
            ? 'NONPUBLIC_PUBLISHED_EDGE'
            : null,
        ].filter((code): code is string => Boolean(code));
        return codes.map((code) => ({
          owner: fact.owner,
          ownerId: fact.id,
          targetOwner: ref.owner,
          targetId: ref.id,
          code,
        }));
      }),
  );
  return {
    protocolVersion: 1,
    provenance,
    coverage: complete ? 'DECLARED_INPUT_COMPLETE' : 'PARTIAL_OWNER_SAMPLE',
    productionIntegrity: 'UNVERIFIED',
    capturedAt: new Date().toISOString(),
    checkedOwners: [...allowed],
    findings,
  };
}
