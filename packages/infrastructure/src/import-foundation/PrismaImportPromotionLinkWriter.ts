import { PrismaClient } from '@prisma/client';

/** Import-context owner mutation for recording canonical promotion handoff. */
export class PrismaImportPromotionLinkWriter {
  public constructor(private readonly prisma: PrismaClient) {}

  public async recordPromotion(input: { recordId: string; courseId: string; processingNotes: string }): Promise<void> {
    await this.prisma.importRecord.update({
      where: { id: input.recordId },
      data: {
        promotedEntityId: input.courseId,
        processingNotes: input.processingNotes,
      },
    });
  }
}
