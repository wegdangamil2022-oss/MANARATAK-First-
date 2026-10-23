import { AuthorizationEvaluatorService } from '@manaratak/domain';
import { PrismaRoleRepository } from '../authorization/PrismaRoleRepository';
import { PrismaRoleAssignmentRepository } from '../authorization/PrismaRoleAssignmentRepository';
import { PrismaPolicyRepository } from '../authorization/PrismaPolicyRepository';
import { DefaultPolicyEvaluator } from '../authorization/DefaultPolicyEvaluator';
import { Prisma, PrismaClient } from '@prisma/client';
import { UniversityCanonicalRelationshipValidator } from './UniversityCanonicalRelationshipValidator';
import type {
  UniversityImportChangeExecutorGateway,
  UniversityImportChangePlan,
  UniversityImportPlannedChange,
} from '@manaratak/application';
import { randomUUID } from 'node:crypto';
import { validateUniversityImportPlanSeal } from '@manaratak/application';
import { planUniversityScreenedSources, type UniversityScreeningSourceBinding } from '@manaratak/application';

type Transaction = Prisma.TransactionClient;
type JsonRecord = Record<string, unknown>;

export class PrismaUniversityImportChangeExecutorGateway implements UniversityImportChangeExecutorGateway {
  constructor(private readonly prisma: PrismaClient) {}

  async previewScreenedSources(bindings: UniversityScreeningSourceBinding[], actorId: string) {
    return this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      await this.verifyOperator(tx, actorId);
      const plans = await planUniversityScreenedSources({ read: async (sourceReferenceId, receiptId, assetId) => ({
        receipt: await tx.importScreeningReceipt.findUnique({ where: { id: receiptId } }),
        asset: await tx.assetRecord.findUnique({ where: { id: assetId } }),
        existingUniversity: await tx.university.findUnique({ where: { publicId: sourceReferenceId }, select: { id: true, publicId: true } }),
      }) }, bindings);
      return { state: 'OWNER_REVIEW_REQUIRED' as const, readyToWrite: false as const, databaseWrites: 0 as const, plans };
    }, { isolationLevel: 'RepeatableRead', timeout: 15000 });
  }

  async apply(
    plan: UniversityImportChangePlan,
    actorId: string,
  ): Promise<{ changeSetId: string; appliedChanges: number }> {
    validateUniversityImportPlanSeal(plan);
    if (plan.validationIssues.length || plan.databaseWrites !== 0 || !plan.changes.length) throw new Error('UNIVERSITY_IMPORT_PLAN_NOT_WRITABLE');
    return this.prisma.$transaction(async (transaction) => {
      await this.authorizeOperator(transaction, actorId);
      await transaction.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${plan.changeSetId}, 0))`;
      const existing = await transaction.universityImportChangeSet.findUnique({
        where: { id: plan.changeSetId },
        include: { changes: true },
      });
      if (existing?.state === 'APPLIED')
        return { changeSetId: existing.id, appliedChanges: existing.changes.length };
      if (existing) throw new Error(`UNIVERSITY_CHANGE_SET_NOT_APPLICABLE:${existing.state}`);

      await transaction.universityImportChangeSet.create({
        data: {
          id: plan.changeSetId,
          sourceArtifactId: plan.sourceArtifactId,
          stage: plan.stage,
          state: 'PLANNED',
          approvedBy: actorId,
        },
      });

      for (const change of [...plan.changes].sort((a, b) => a.sequence - b.sequence)) {
        const applied = await this.applyChange(transaction, change, plan);
        await transaction.universityImportChange.create({
          data: {
            changeSetId: plan.changeSetId,
            universityId: applied.universityId,
            entityType: change.entityType,
            entityId: applied.entityId,
            operation: applied.operation,
            beforeState: this.json(applied.beforeState),
            afterState: this.json(applied.afterState),
            sequence: change.sequence,
          },
        });
      }

      const appliedAt = new Date();
      await transaction.universityImportChangeSet.update({
        where: { id: plan.changeSetId },
        data: { state: 'APPLIED', appliedAt },
      });
      await this.recordAuditAndOutbox(
        transaction,
        plan.changeSetId,
        actorId,
        'UNIVERSITY_CHANGE_SET_APPLIED',
        plan.changes.length,
        appliedAt,
      );
      return { changeSetId: plan.changeSetId, appliedChanges: plan.changes.length };
    });
  }

  async rollback(
    changeSetId: string,
    actorId: string,
  ): Promise<{ changeSetId: string; revertedChanges: number }> {
    return this.prisma.$transaction(async (transaction) => {
      await this.authorizeOperator(transaction, actorId);
      await transaction.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${changeSetId}, 0))`;
      const changeSet = await transaction.universityImportChangeSet.findUnique({
        where: { id: changeSetId },
        include: { changes: { orderBy: { sequence: 'desc' } } },
      });
      if (!changeSet) throw new Error('UNIVERSITY_CHANGE_SET_NOT_FOUND');
      if (changeSet.state === 'ROLLED_BACK')
        return { changeSetId, revertedChanges: changeSet.changes.length };
      if (changeSet.state !== 'APPLIED')
        throw new Error(`UNIVERSITY_CHANGE_SET_NOT_ROLLBACKABLE:${changeSet.state}`);

      await this.assertRollbackUnchanged(transaction, changeSet.changes);
      for (const change of changeSet.changes) await this.rollbackChange(transaction, change);
      const rolledBackAt = new Date();
      await transaction.universityImportChangeSet.update({
        where: { id: changeSetId },
        data: { state: 'ROLLED_BACK', rolledBackAt },
      });
      await this.recordAuditAndOutbox(
        transaction,
        changeSetId,
        actorId,
        'UNIVERSITY_CHANGE_SET_ROLLED_BACK',
        changeSet.changes.length,
        rolledBackAt,
      );
      return { changeSetId, revertedChanges: changeSet.changes.length };
    });
  }

  private async assertRollbackUnchanged(transaction: Transaction, changes: Array<{
    entityType: string; entityId: string; universityId: string | null; operation: string; afterState: Prisma.JsonValue | null;
  }>): Promise<void> {
    // Validate every row before the first mutation; a source row must not be
    // deleted before discovering that its parent has since changed.
    const owners = [...new Set(changes.map(row => row.universityId).filter((id): id is string => Boolean(id)))].sort();
    for (const id of owners) {
      await transaction.$queryRaw`SELECT id FROM "University" WHERE id = ${id} FOR UPDATE`;
      const owner = await transaction.university.findUnique({ where: { id }, include: { _count: true } });
      if (!owner || ['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(owner.status)) throw new Error('UNIVERSITY_IMPORT_ROLLBACK_OWNER_IMMUTABLE');
      if (changes.some(row => row.entityType === 'UNIVERSITY' && row.entityId === id && row.operation === 'CREATE')) {
        const relationTypes: Record<string, string> = { campuses: 'CAMPUS', organizationUnits: 'ORGANIZATION_UNIT', academicPrograms: 'ACADEMIC_PROGRAM', tuitionProfiles: 'TUITION', accommodationProfiles: 'ACCOMMODATION', rankings: 'RANKING', sourceRecords: 'SOURCE_RECORD' };
        for (const [relation, count] of Object.entries(owner._count)) {
          const expected = relation === 'importChanges' ? changes.filter(row => row.universityId === id).length
            : changes.filter(row => row.universityId === id && row.operation === 'CREATE' && row.entityType === relationTypes[relation]).length;
          if (count !== expected) throw new Error('UNIVERSITY_IMPORT_ROLLBACK_DEPENDENCIES');
        }
      }
    }
    const delegates = {
      UNIVERSITY: ['University', transaction.university], CAMPUS: ['UniversityCampus', transaction.universityCampus],
      ORGANIZATION_UNIT: ['UniversityOrganizationUnit', transaction.universityOrganizationUnit], ACADEMIC_PROGRAM: ['UniversityAcademicProgram', transaction.universityAcademicProgram],
      ADMISSION_REQUIREMENT: ['UniversityProgramAdmissionRequirement', transaction.universityProgramAdmissionRequirement], TUITION: ['UniversityTuitionProfile', transaction.universityTuitionProfile],
      ACCOMMODATION: ['UniversityAccommodationProfile', transaction.universityAccommodationProfile], RANKING: ['UniversityRanking', transaction.universityRanking], SOURCE_RECORD: ['UniversitySourceRecord', transaction.universitySourceRecord],
    } as const;
    const canonical = (value: unknown): string => JSON.stringify(JSON.parse(JSON.stringify(value)), (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
    for (const change of [...changes].sort((a, b) => `${a.entityType}:${a.entityId}`.localeCompare(`${b.entityType}:${b.entityId}`))) {
      const selected = delegates[change.entityType as keyof typeof delegates];
      if (!selected || !change.afterState) throw new Error('UNIVERSITY_IMPORT_ROLLBACK_CONFLICT');
      // Table identifiers come exclusively from the fixed mapping above.
      await transaction.$queryRaw(Prisma.sql`SELECT id FROM ${Prisma.raw('"' + selected[0] + '"')} WHERE id = ${change.entityId} FOR UPDATE`);
      const repository = selected[1] as unknown as { findUnique(input: { where: { id: string } }): Promise<Record<string, unknown> | null> };
      const current = await repository.findUnique({ where: { id: change.entityId } });
      if (!current) throw new Error('UNIVERSITY_IMPORT_ROLLBACK_CONFLICT');
      const { _count: _relations, ...fields } = current;
      if (canonical(fields) !== canonical(change.afterState)) throw new Error('UNIVERSITY_IMPORT_ROLLBACK_CONFLICT');
    }
  }

  private async authorizeOperator(tx: Transaction, actorId: string): Promise<void> {
    if (!actorId?.trim()) throw new Error('UNIVERSITY_IMPORT_ACTOR_REQUIRED');
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "IdentityRecord" WHERE "id" = ${actorId} FOR SHARE`);
    await tx.$queryRaw(Prisma.sql`SELECT "identityId" FROM "UserRecord" WHERE "identityId" = ${actorId} FOR SHARE`);
    await tx.$queryRaw(Prisma.sql`SELECT "identityId" FROM "AccountRecord" WHERE "identityId" = ${actorId} FOR SHARE`);
    await tx.$queryRaw(Prisma.sql`SELECT a."id" FROM "RoleAssignmentRecord" a JOIN "RoleRecord" r ON r."id" = a."roleId" WHERE a."identityId" = ${actorId} FOR SHARE OF a, r`);
    await tx.$queryRaw(Prisma.sql`SELECT p."id" FROM "PolicyRecord" p WHERE p."id" IN (
      SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(r."policyIds") = 'array' THEN r."policyIds" ELSE '[]'::jsonb END)
      FROM "RoleAssignmentRecord" a JOIN "RoleRecord" r ON r."id" = a."roleId" WHERE a."identityId" = ${actorId}
    ) FOR SHARE OF p`);
    await this.verifyOperator(tx, actorId);
  }

  private async verifyOperator(tx: Transaction, actorId: string): Promise<void> {
    if (!actorId?.trim()) throw new Error('UNIVERSITY_IMPORT_ACTOR_REQUIRED');
    const identity = await tx.identityRecord.findUnique({ where: { id: actorId }, include: { user: true, account: true } });
    if (!identity || identity.deletedAt || identity.status !== 'ACTIVE' || !identity.user?.isEmailVerified || identity.account?.accessState !== 'Active') throw new Error('UNIVERSITY_IMPORT_VERIFIED_ACTIVE_ACTOR_REQUIRED');
    const client = tx as unknown as PrismaClient;
    const evaluator = new AuthorizationEvaluatorService(new PrismaRoleRepository(client), new PrismaPolicyRepository(client), new PrismaRoleAssignmentRepository(client), new DefaultPolicyEvaluator());
    for (const permission of ['admin:imports:manage', 'admin:universities:manage']) {
      if (!(await evaluator.evaluatePermission(actorId, permission, { requestTime: new Date(), source: 'reviewed-university-import-cli' })).isGranted) throw new Error('UNIVERSITY_IMPORT_ACTOR_PERMISSION_DENIED');
    }
  }

  private async applyChange(
    transaction: Transaction,
    change: UniversityImportPlannedChange,
    plan: UniversityImportChangePlan,
  ) {
    if (change.entityType === 'UNIVERSITY') return this.applyUniversity(transaction, change);
    let university = await transaction.university.findUnique({
      where: { publicId: change.sourceReferenceId },
    });
    if (!university) throw new Error(`UNIVERSITY_IDENTITY_NOT_FOUND:${change.sourceReferenceId}`);
    if (change.entityType === 'ADMISSION_REQUIREMENT') {
      // Share the owner lock with admin CAS writers before reading the nullable identity.
      await transaction.$queryRaw`SELECT id FROM "University" WHERE id = ${university.id} FOR UPDATE`;
      university = await transaction.university.findUniqueOrThrow({ where: { id: university.id } });
    }
    const after = change.afterState as JsonRecord;
    if (['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(university.status))
      throw new Error('UNIVERSITY_IMPORT_OWNER_LIFECYCLE_IMMUTABLE');

    switch (change.entityType) {
      case 'CAMPUS': {
        const sourceReferenceId = this.childReference(change);
        const before = await transaction.universityCampus.findFirst({
          where: { universityId: university.id, sourceReferenceId },
        });
        const data = {
          name: this.requiredString(after.name, 'CAMPUS_NAME_REQUIRED'),
          campusType: this.string(after.campusType),
          address: this.string(after.address),
          sourceReferenceId,
          countryReferenceId: this.string(after.countryReferenceId),
          regionReferenceId: this.string(after.regionReferenceId),
          cityReferenceId: this.string(after.cityReferenceId),
        };
        await new UniversityCanonicalRelationshipValidator(transaction).validateCampus(data);
        const record = before
          ? await transaction.universityCampus.update({ where: { id: before.id }, data })
          : await transaction.universityCampus.create({
              data: { universityId: university.id, ...data },
            });
        return this.applied(university.id, record.id, before, record);
      }
      case 'ORGANIZATION_UNIT': {
        const normalizedName = this.requiredString(after.name, 'ORGANIZATION_UNIT_NAME_REQUIRED')
          .trim()
          .toLocaleLowerCase('en-US');
        const unitType = this.requiredString(after.unitType, 'ORGANIZATION_UNIT_TYPE_REQUIRED');
        if (!['FACULTY', 'SCHOOL', 'COLLEGE', 'DEPARTMENT'].includes(unitType))
          throw new Error('UNIVERSITY_IMPORT_ORGANIZATION_TYPE_INVALID');
        const sourceReferenceId = this.childReference(change);
        const before = await transaction.universityOrganizationUnit.findFirst({
          where: { universityId: university.id, sourceReferenceId },
        });
        if (!before) {
          const ambiguous = await transaction.universityOrganizationUnit.findFirst({
            where: { universityId: university.id, unitType, normalizedName },
            select: { id: true },
          });
          if (ambiguous) throw new Error('UNIVERSITY_IMPORT_ORGANIZATION_DUPLICATE_REVIEW_REQUIRED');
        }
        const data = {
          unitType,
          name: String(after.name),
          normalizedName,
          sourceReferenceId,
          status: this.string(after.status) ?? 'ACTIVE',
        };
        const record = before
          ? await transaction.universityOrganizationUnit.update({ where: { id: before.id }, data })
          : await transaction.universityOrganizationUnit.create({
              data: { universityId: university.id, ...data },
            });
        return this.applied(university.id, record.id, before, record);
      }
      case 'ACADEMIC_PROGRAM': {
        const sourceReferenceId = this.childReference(change);
        const degreeLevelId = this.string(after.degreeLevelId);
        const status = this.string(after.status) ?? (degreeLevelId ? 'DRAFT' : 'REVIEW_REQUIRED');
        if (status !== 'REVIEW_REQUIRED' && !degreeLevelId)
          throw new Error('CANONICAL_DEGREE_LEVEL_REQUIRED');
        if (degreeLevelId) {
          await new UniversityCanonicalRelationshipValidator(transaction).validateProgram(
            degreeLevelId,
            this.string(after.majorId),
            this.string(after.majorMappingState),
          );
        }
        const before = await transaction.universityAcademicProgram.findFirst({
          where: { universityId: university.id, sourceReferenceId },
        });
        const sourceProgramName = this.requiredString(
          after.sourceProgramName,
          'PROGRAM_NAME_REQUIRED',
        );
        const data = {
          sourceReferenceId,
          sourceProgramName,
          normalizedName: sourceProgramName.trim().toLocaleLowerCase('en-US'),
          degreeLevelId,
          majorId: this.string(after.majorId),
          majorMappingState: this.string(after.majorMappingState) ?? 'MAJOR_REVIEW_REQUIRED',
          status,
          metadata: this.json(after.metadata),
        };
        const record = before
          ? await transaction.universityAcademicProgram.update({ where: { id: before.id }, data })
          : await transaction.universityAcademicProgram.create({
              data: {
                universityId: university.id,
                ...data,
              } as Prisma.UniversityAcademicProgramUncheckedCreateInput,
            });
        return this.applied(university.id, record.id, before, record);
      }
      case 'ADMISSION_REQUIREMENT': {
        const explicitProgramId = this.string(after.academicProgramId);
        const programSourceReferenceId = this.string(after.academicProgramSourceReferenceId);
        const academicProgram = explicitProgramId
          ? await transaction.universityAcademicProgram.findUnique({ where: { id: explicitProgramId } })
          : programSourceReferenceId
            ? await transaction.universityAcademicProgram.findFirst({ where: { universityId: university.id, sourceReferenceId: programSourceReferenceId } })
            : null;
        if (!academicProgram || academicProgram.universityId !== university.id)
          throw new Error('CANONICAL_ACADEMIC_PROGRAM_REQUIRED');
        const academicProgramId = academicProgram.id;
        const internationalTestId = this.requiredString(
          after.internationalTestId,
          'CANONICAL_INTERNATIONAL_TEST_REQUIRED',
        );
        await new UniversityCanonicalRelationshipValidator(transaction).validateAdmissionRequirements([{
          internationalTestId,
          testVariantId: this.string(after.testVariantId),
          testVersionId: this.string(after.testVersionId),
          minimumScore: this.number(after.minimumScore),
          status: this.string(after.status) ?? 'REVIEW_REQUIRED',
        }]);
        const matches = await transaction.universityProgramAdmissionRequirement.findMany({
          where: {
            academicProgramId,
            internationalTestId,
            testVariantId: this.string(after.testVariantId) ?? null,
            testVersionId: this.string(after.testVersionId) ?? null,
          },
          take: 2,
        });
        if (matches.length > 1) throw new Error('UNIVERSITY_ADMISSION_TEST_EXISTING_DUPLICATES');
        const before = matches[0];
        const data = {
          academicProgramId,
          internationalTestId,
          testVariantId: this.string(after.testVariantId),
          testVersionId: this.string(after.testVersionId),
          minimumScore: this.number(after.minimumScore),
          status: this.string(after.status) ?? 'REVIEW_REQUIRED',
        };
        const record = before
          ? await transaction.universityProgramAdmissionRequirement.update({
              where: { id: before.id },
              data,
            })
          : await transaction.universityProgramAdmissionRequirement.create({ data });
        await this.advanceAdmissionOwner(transaction, university.id);
        return this.applied(university.id, record.id, before, record);
      }
      case 'TUITION': {
        const currencyCode = this.string(after.currencyCode);
        const currencyReferenceId = await this.resolveCurrencyReference(
          transaction,
          this.string(after.currencyReferenceId),
          currencyCode,
          'TUITION_CANONICAL_CURRENCY_REQUIRED',
        );
        const before = await transaction.universityTuitionProfile.findFirst({
          where: { universityId: university.id, profileType: 'GENERAL' },
        });
        const data = {
          profileType: 'GENERAL',
          amount: this.number(after.annualTuitionFee),
          currencyCode,
          currencyReferenceId,
          officialSourceUrl: this.string(after.officialSourceUrl),
          metadata: this.json({ graduateTuitionFee: after.graduateTuitionFee }),
        };
        const record = before
          ? await transaction.universityTuitionProfile.update({ where: { id: before.id }, data })
          : await transaction.universityTuitionProfile.create({
              data: {
                universityId: university.id,
                ...data,
              } as Prisma.UniversityTuitionProfileUncheckedCreateInput,
            });
        return this.applied(university.id, record.id, before, record);
      }
      case 'ACCOMMODATION': {
        const currencyCode = this.string(after.currencyCode);
        const livingCostCurrencyCode = this.string(after.livingCostCurrencyCode);
        const currencyReferenceId = await this.resolveCurrencyReference(
          transaction,
          this.string(after.currencyReferenceId),
          currencyCode,
          'ACCOMMODATION_CANONICAL_CURRENCY_REQUIRED',
        );
        const livingCostCurrencyReferenceId = await this.resolveCurrencyReference(
          transaction,
          this.string(after.livingCostCurrencyReferenceId),
          livingCostCurrencyCode,
          'LIVING_COST_CANONICAL_CURRENCY_REQUIRED',
        );
        const before = await transaction.universityAccommodationProfile.findFirst({
          where: { universityId: university.id },
        });
        const data = {
          accommodationAvailable: this.boolean(after.accommodationAvailable),
          internationalEligible: this.boolean(after.internationalEligible),
          typicalCost: this.number(after.typicalCost),
          currencyCode,
          currencyReferenceId,
          averageMonthlyLivingCost: this.number(after.averageMonthlyLivingCost),
          livingCostCurrencyCode,
          livingCostCurrencyReferenceId,
        };
        const record = before
          ? await transaction.universityAccommodationProfile.update({
              where: { id: before.id },
              data,
            })
          : await transaction.universityAccommodationProfile.create({
              data: {
                universityId: university.id,
                ...data,
              } as Prisma.UniversityAccommodationProfileUncheckedCreateInput,
            });
        return this.applied(university.id, record.id, before, record);
      }
      case 'RANKING': {
        const provider = this.requiredString(after.provider, 'RANKING_PROVIDER_REQUIRED');
        const rankingYear = this.requiredNumber(after.rankingYear, 'RANKING_YEAR_REQUIRED');
        const scope = this.requiredString(after.scope, 'RANKING_SCOPE_REQUIRED');
        const before = await transaction.universityRanking.findUnique({
          where: {
            universityId_provider_rankingYear_scope: {
              universityId: university.id,
              provider,
              rankingYear,
              scope,
            },
          },
        });
        const data = {
          provider,
          rankingYear,
          scope,
          rank: this.requiredString(after.rank, 'RANK_REQUIRED'),
          scopeLabel: this.string(after.scopeLabel),
          note: this.string(after.note),
          officialSourceUrl: this.requiredString(
            after.officialSourceUrl,
            'RANKING_SOURCE_REQUIRED',
          ),
          verifiedAt: this.requiredDate(after.verifiedAt, 'RANKING_VERIFIED_AT_REQUIRED'),
        };
        const record = before
          ? await transaction.universityRanking.update({ where: { id: before.id }, data })
          : await transaction.universityRanking.create({
              data: { universityId: university.id, ...data },
            });
        return this.applied(university.id, record.id, before, record);
      }
      case 'SOURCE_RECORD': {
        const sourceRowNumber = this.number(after.sourceRowNumber) ?? null;
        const sourceHash = this.requiredString(after.contentHash, 'SOURCE_HASH_REQUIRED');
        const sourceIdentityKey = [
          plan.stage,
          plan.sourceArtifactId,
          sourceRowNumber === null ? `hash:${sourceHash}` : `row:${sourceRowNumber}`,
        ].join('|');
        const before = await transaction.universitySourceRecord.findUnique({ where: { sourceIdentityKey } });
        if (before && before.universityId !== university.id)
          throw new Error('UNIVERSITY_SOURCE_PROVENANCE_OWNERSHIP_MISMATCH');
        const data = {
          sourceIdentityKey,
          stage: plan.stage,
          sourceArtifactId: plan.sourceArtifactId,
          sourceRowNumber,
          sourceHash,
          importedAt: new Date(),
        };
        const record = before
          ? await transaction.universitySourceRecord.update({ where: { id: before.id }, data })
          : await transaction.universitySourceRecord.create({
              data: { universityId: university.id, ...data },
            });
        return this.applied(university.id, record.id, before, record);
      }
      default:
        throw new Error(`UNSUPPORTED_UNIVERSITY_CHANGE_ENTITY:${change.entityType}`);
    }
  }

  private async applyUniversity(transaction: Transaction, change: UniversityImportPlannedChange) {
    const after = change.afterState as JsonRecord;
    const before = await transaction.university.findUnique({
      where: { publicId: change.sourceReferenceId },
    });
    // Enrichment stages deliberately do not repeat the Stage-1 university name.
    // Preserve the reviewed identity instead of failing, renaming, or creating a placeholder.
    const displayName = this.string(
      after.officialEnglishName ?? after.officialName ?? after.universityName ?? after.displayName,
    ) ?? before?.displayName;
    if (!displayName) throw new Error('UNIVERSITY_NAME_REQUIRED');
    if (before && ['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(before.status))
      throw new Error('UNIVERSITY_IMPORT_OWNER_LIFECYCLE_IMMUTABLE');
    const data = {
      displayName,
      canonicalName: displayName.trim(),
      country: this.string(after.countryName ?? after.country),
      city: this.string(after.verifiedCity ?? after.city),
      institutionType: this.string(after.verifiedInstitutionType ?? after.institutionType),
      officialWebsite: this.string(after.officialWebsiteUrl ?? after.officialWebsite),
      officialSourceUrl: this.string(after.primarySourceUrl ?? after.officialSourceUrl),
      foundedYear: this.number(after.foundedYear),
      countryReferenceId: this.string(after.countryReferenceId),
      regionReferenceId: this.string(after.regionReferenceId),
      cityReferenceId: this.string(after.cityReferenceId),
      institutionalOwnership: this.string(after.verifiedOwnership ?? after.institutionalOwnership),
      completenessStatus: 'NEEDS_REVIEW',
      status: 'READY_TO_REVIEW',
    };
    await new UniversityCanonicalRelationshipValidator(transaction).validateCampus(data);
    if (change.operation === 'UPDATE' && !before) throw new Error('UNIVERSITY_IMPORT_IDENTITY_CHANGED_SINCE_PLAN');
    if (change.operation === 'CREATE' && before) throw new Error('UNIVERSITY_IMPORT_IDENTITY_CREATED_SINCE_PLAN');
    const record = before
      ? await transaction.university.update({ where: { id: before.id }, data })
      : await transaction.university.create({
          data: {
            publicId: change.sourceReferenceId,
            slug: change.sourceReferenceId.toLocaleLowerCase('en-US'),
            canonicalDedupKey: change.sourceReferenceId.toLocaleLowerCase('en-US'),
            ...data,
          },
        });
    return this.applied(record.id, record.id, before, record);
  }

  private async rollbackChange(
    transaction: Transaction,
    change: {
      entityType: string;
      entityId: string;
      operation: string;
      beforeState: Prisma.JsonValue | null;
      afterState: Prisma.JsonValue | null;
      universityId: string | null;
    },
  ) {
    if (change.entityType === 'ADMISSION_REQUIREMENT') {
      if (!change.universityId) throw new Error('UNIVERSITY_IMPORT_ROLLBACK_OWNER_REQUIRED');
      await transaction.$queryRaw`SELECT id FROM "University" WHERE id = ${change.universityId} FOR UPDATE`;
      const owner = await transaction.university.findUniqueOrThrow({ where: { id: change.universityId } });
      if (['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(owner.status))
        throw new Error('UNIVERSITY_IMPORT_OWNER_LIFECYCLE_IMMUTABLE');
      const current = await transaction.universityProgramAdmissionRequirement.findUnique({ where: { id: change.entityId } });
      const canonical = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
      if (!current || canonical(current) !== canonical(change.afterState))
        throw new Error('UNIVERSITY_IMPORT_ROLLBACK_CONFLICT');
      await this.advanceAdmissionOwner(transaction, owner.id);
    }
    if (change.operation === 'CREATE')
      return this.deleteEntity(transaction, change.entityType, change.entityId);
    const before = this.record(change.beforeState);
    if (!before)
      throw new Error(`UNIVERSITY_ROLLBACK_STATE_MISSING:${change.entityType}:${change.entityId}`);
    const data = this.mutableState(before);
    switch (change.entityType) {
      case 'UNIVERSITY':
        await transaction.university.update({ where: { id: change.entityId }, data });
        break;
      case 'CAMPUS':
        await transaction.universityCampus.update({ where: { id: change.entityId }, data });
        break;
      case 'ORGANIZATION_UNIT':
        await transaction.universityOrganizationUnit.update({
          where: { id: change.entityId },
          data,
        });
        break;
      case 'ACADEMIC_PROGRAM':
        await transaction.universityAcademicProgram.update({
          where: { id: change.entityId },
          data,
        });
        break;
      case 'ADMISSION_REQUIREMENT':
        await transaction.universityProgramAdmissionRequirement.update({
          where: { id: change.entityId },
          data,
        });
        break;
      case 'TUITION':
        await transaction.universityTuitionProfile.update({ where: { id: change.entityId }, data });
        break;
      case 'ACCOMMODATION':
        await transaction.universityAccommodationProfile.update({
          where: { id: change.entityId },
          data,
        });
        break;
      case 'RANKING':
        await transaction.universityRanking.update({ where: { id: change.entityId }, data });
        break;
      case 'SOURCE_RECORD':
        await transaction.universitySourceRecord.update({ where: { id: change.entityId }, data });
        break;
      default:
        throw new Error(`UNSUPPORTED_UNIVERSITY_ROLLBACK_ENTITY:${change.entityType}`);
    }
  }

  private async deleteEntity(
    transaction: Transaction,
    entityType: string,
    id: string,
  ): Promise<void> {
    switch (entityType) {
      case 'UNIVERSITY':
        await transaction.university.delete({ where: { id } });
        break;
      case 'CAMPUS':
        await transaction.universityCampus.delete({ where: { id } });
        break;
      case 'ORGANIZATION_UNIT':
        await transaction.universityOrganizationUnit.delete({ where: { id } });
        break;
      case 'ACADEMIC_PROGRAM':
        await transaction.universityAcademicProgram.delete({ where: { id } });
        break;
      case 'ADMISSION_REQUIREMENT':
        await transaction.universityProgramAdmissionRequirement.delete({ where: { id } });
        break;
      case 'TUITION':
        await transaction.universityTuitionProfile.delete({ where: { id } });
        break;
      case 'ACCOMMODATION':
        await transaction.universityAccommodationProfile.delete({ where: { id } });
        break;
      case 'RANKING':
        await transaction.universityRanking.delete({ where: { id } });
        break;
      case 'SOURCE_RECORD':
        await transaction.universitySourceRecord.delete({ where: { id } });
        break;
      default:
        throw new Error(`UNSUPPORTED_UNIVERSITY_ROLLBACK_ENTITY:${entityType}`);
    }
  }

  private async advanceAdmissionOwner(transaction: Transaction, id: string): Promise<void> {
    await transaction.$executeRaw`
      UPDATE "University" SET
        "updatedAt" = GREATEST(clock_timestamp(), "updatedAt" + interval '1 millisecond'),
        status = CASE WHEN status = 'READY_TO_PUBLISH' THEN 'READY_TO_REVIEW' ELSE status END
      WHERE id = ${id}`;
  }

  private async recordAuditAndOutbox(
    transaction: Transaction,
    changeSetId: string,
    actorId: string,
    action: string,
    count: number,
    timestamp: Date,
  ) {
    const auditId = randomUUID();
    await transaction.auditRecord.create({
      data: {
        id: auditId,
        reference: `AUD-${auditId}`,
        action,
        category: 'UNIVERSITY_IMPORT',
        severity: 'INFO',
        actorId,
        actorType: 'IDENTITY',
        targetId: changeSetId,
        targetType: 'UNIVERSITY_CHANGE_SET',
        source: 'university-import-change-set',
        timestamp,
        contextMetadata: {
          result: 'SUCCESS',
          changeCount: count,
          atomicity: 'BUSINESS_AUDIT_OUTBOX',
        },
      },
    });
    await transaction.transactionalOutboxRecord.create({
      data: {
        id: randomUUID(),
        eventType: action,
        domain: 'UNIVERSITIES',
        aggregateType: 'UNIVERSITY_CHANGE_SET',
        aggregateId: changeSetId,
        payload: { changeSetId, changeCount: count, operation: action },
        metadata: { actorId, atomicity: 'BUSINESS_AUDIT_OUTBOX' },
        state: 'PENDING',
        attempts: 0,
        availableAt: timestamp,
      },
    });
  }

  private applied(
    universityId: string,
    entityId: string,
    beforeState: unknown,
    afterState: unknown,
  ) {
    return {
      universityId,
      entityId,
      operation: beforeState ? 'UPDATE' : 'CREATE',
      beforeState,
      afterState,
    };
  }
  private childReference(change: UniversityImportPlannedChange): string {
    return change.entityKey.slice(change.sourceReferenceId.length + 1);
  }
  private mutableState(value: JsonRecord): Prisma.InputJsonObject & JsonRecord {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = value;
    return rest as Prisma.InputJsonObject & JsonRecord;
  }
  private json(value: unknown): Prisma.InputJsonValue | undefined {
    return value == null ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
  }
  private record(value: unknown): JsonRecord | undefined {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as JsonRecord)
      : undefined;
  }
  private string(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }
  private requiredString(value: unknown, code: string): string {
    const result = this.string(value);
    if (!result) throw new Error(code);
    return result;
  }
  private async resolveCurrencyReference(
    transaction: Transaction,
    explicitId: string | undefined,
    sourceCode: string | undefined,
    code: string,
  ): Promise<string | undefined> {
    if (!explicitId && !sourceCode) return undefined;
    const currency = explicitId
      ? await transaction.referenceCurrency.findUnique({
          where: { id: explicitId },
          select: { id: true, isoCode: true, isActive: true, lifecycleState: true },
        })
      : await transaction.referenceCurrency.findUnique({
          where: { isoCode: sourceCode!.toUpperCase() },
          select: { id: true, isoCode: true, isActive: true, lifecycleState: true },
        });
    if (!currency?.isActive || currency.lifecycleState !== 'ACTIVE') throw new Error(code);
    if (sourceCode && currency.isoCode.toUpperCase() !== sourceCode.toUpperCase())
      throw new Error('UNIVERSITY_IMPORT_CURRENCY_REFERENCE_MISMATCH');
    return currency.id;
  }
  private number(value: unknown): number | undefined {
    const result = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(result) ? result : undefined;
  }
  private requiredNumber(value: unknown, code: string): number {
    const result = this.number(value);
    if (result === undefined) throw new Error(code);
    return result;
  }
  private boolean(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
  }
  private requiredDate(value: unknown, code: string): Date {
    const date = new Date(String(value ?? ''));
    if (Number.isNaN(date.getTime())) throw new Error(code);
    return date;
  }
}
