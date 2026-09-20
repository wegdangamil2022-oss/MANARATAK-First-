import { Prisma, PrismaClient } from '@prisma/client';
import {
  FellowshipDefinitionDto,
  IFellowshipDefinitionRepository,
  MajorImportCompletenessState,
  MajorStatus,
} from '@manaratak/domain';

export class PrismaFellowshipDefinitionRepository implements IFellowshipDefinitionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    data: Omit<FellowshipDefinitionDto, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<FellowshipDefinitionDto, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<FellowshipDefinitionDto> {
    const created = await this.prisma.fellowshipDefinition.create({
      data: {
        id: data.id,
        publicId: data.publicId,
        slug: data.slug,
        canonicalName: data.canonicalName,
        canonicalDedupKey: data.canonicalDedupKey,
        displayName: data.displayName,
        localizedNameAr: data.localizedNameAr,
        localizedNameEn: data.localizedNameEn,
        fellowshipType: data.fellowshipType,
        professionalDomain: data.professionalDomain,
        status: data.status,
        completenessStatus: data.completenessStatus,
        linkedMajorId: data.linkedMajorId,
        linkedProfileId: data.linkedProfileId,
        optionalFields: data.optionalFields as Prisma.InputJsonValue | undefined,
      },
    });

    return this.mapToDto(created);
  }

  async update(
    id: string,
    updates: Partial<Pick<FellowshipDefinitionDto, 'displayName' | 'localizedNameAr' | 'localizedNameEn' | 'status' | 'completenessStatus' | 'professionalDomain' | 'linkedMajorId' | 'linkedProfileId' | 'optionalFields'>>
  ): Promise<FellowshipDefinitionDto> {
    const updated = await this.prisma.fellowshipDefinition.update({
      where: { id },
      data: {
        displayName: updates.displayName,
        localizedNameAr: updates.localizedNameAr,
        localizedNameEn: updates.localizedNameEn,
        status: updates.status,
        completenessStatus: updates.completenessStatus,
        professionalDomain: updates.professionalDomain,
        linkedMajorId: updates.linkedMajorId,
        linkedProfileId: updates.linkedProfileId,
        optionalFields: updates.optionalFields as Prisma.InputJsonValue | undefined,
      },
    });

    return this.mapToDto(updated);
  }

  async findByDedupKey(key: string): Promise<FellowshipDefinitionDto | null> {
    const record = await this.prisma.fellowshipDefinition.findUnique({
      where: { canonicalDedupKey: key },
    });

    return record ? this.mapToDto(record) : null;
  }

  private mapToDto(record: Prisma.FellowshipDefinitionGetPayload<Record<string, never>>): FellowshipDefinitionDto {
    return {
      id: record.id,
      publicId: record.publicId,
      slug: record.slug,
      canonicalName: record.canonicalName,
      canonicalDedupKey: record.canonicalDedupKey,
      displayName: record.displayName,
      localizedNameAr: record.localizedNameAr,
      localizedNameEn: record.localizedNameEn,
      fellowshipType: record.fellowshipType,
      professionalDomain: record.professionalDomain,
      status: record.status as MajorStatus,
      completenessStatus: record.completenessStatus as MajorImportCompletenessState,
      linkedMajorId: record.linkedMajorId,
      linkedProfileId: record.linkedProfileId,
      optionalFields: record.optionalFields as Record<string, unknown> | null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
