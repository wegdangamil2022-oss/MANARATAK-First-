import { Prisma, PrismaClient } from '@prisma/client';
import { UniversityCanonicalRelationshipValidator } from './UniversityCanonicalRelationshipValidator';
import type {
  UniversityImportChangeExecutorGateway,
  UniversityImportChangePlan,
  UniversityImportPlannedChange,
} from '@manaratak/application';
import { randomUUID } from 'node:crypto';

type Transaction = Prisma.TransactionClient;
type JsonRecord = Record<string, unknown>;

export class PrismaUniversityImportChangeExecutorGateway implements UniversityImportChangeExecutorGateway {
  constructor(private readonly prisma: PrismaClient) {}

  async apply(
    plan: UniversityImportChangePlan,
    actorId: string,
  ): Promise<{ changeSetId: string; appliedChanges: number }> {
    return this.prisma.$transaction(async (transaction) => {
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
      const changeSet = await transaction.universityImportChangeSet.findUnique({
        where: { id: changeSetId },
        include: { changes: { orderBy: { sequence: 'desc' } } },
      });
      if (!changeSet) throw new Error('UNIVERSITY_CHANGE_SET_NOT_FOUND');
      if (changeSet.state === 'ROLLED_BACK')
        return { changeSetId, revertedChanges: changeSet.changes.length };
      if (changeSet.state !== 'APPLIED')
        throw new Error(`UNIVERSITY_CHANGE_SET_NOT_ROLLBACKABLE:${changeSet.state}`);

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

  private async applyChange(
    transaction: Transaction,
    change: UniversityImportPlannedChange,
    plan: UniversityImportChangePlan,
  ) {
    if (change.entityType === 'UNIVERSITY') return this.applyUniversity(transaction, change);
    const university = await transaction.university.findUnique({
      where: { publicId: change.sourceReferenceId },
    });
    if (!university) throw new Error(`UNIVERSITY_IDENTITY_NOT_FOUND:${change.sourceReferenceId}`);
    const after = change.afterState as JsonRecord;

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
        const before = await transaction.universityOrganizationUnit.findFirst({
          where: { universityId: university.id, unitType, normalizedName },
        });
        const data = {
          unitType,
          name: String(after.name),
          normalizedName,
          sourceReferenceId: this.childReference(change),
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
        await new UniversityCanonicalRelationshipValidator(transaction).validateTest(
          internationalTestId,
          this.string(after.testVariantId),
          this.string(after.testVersionId),
        );
        const before = await transaction.universityProgramAdmissionRequirement.findFirst({
          where: {
            academicProgramId,
            internationalTestId,
            testVariantId: this.string(after.testVariantId) ?? null,
            testVersionId: this.string(after.testVersionId) ?? null,
          },
        });
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
    const displayName = this.requiredString(
      after.officialEnglishName ?? after.officialName ?? after.universityName ?? after.displayName,
      'UNIVERSITY_NAME_REQUIRED',
    );
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
    },
  ) {
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
    if (explicitId) return explicitId;
    if (!sourceCode) return undefined;
    const currency = await transaction.referenceCurrency.findUnique({
      where: { isoCode: sourceCode.toUpperCase() },
      select: { id: true, isActive: true },
    });
    if (!currency?.isActive) throw new Error(code);
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
