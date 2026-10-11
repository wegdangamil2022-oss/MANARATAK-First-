import {
  AIKnowledgeOwnerRequest,
  AIVerifiedKnowledgeSource,
  IAIKnowledgeOwnerGateway,
} from '@manaratak/domain';
import { PublicCmsUseCases } from '../../cms/use-cases/CmsUseCases';

/** No CMS tables or admin drafts are read through the AI boundary. */
export class CmsAIKnowledgeOwnerGateway implements IAIKnowledgeOwnerGateway {
  constructor(private readonly publicCms: PublicCmsUseCases) {}

  async resolve(request: AIKnowledgeOwnerRequest): Promise<AIVerifiedKnowledgeSource | null> {
    if (request.sourceType !== 'CMS' || !request.requesterReferenceId) return null;
    const locale = request.locale ?? 'ar';
    if (!['ar', 'en'].includes(locale)) return null;
    try {
      const content = await this.publicCms.getBySlug(
        request.sourceReferenceId,
        locale,
        'manaratak',
      );
      if (
        content.slug !== request.sourceReferenceId ||
        content.locale !== locale ||
        content.siteIdentifier !== 'manaratak'
      )
        return null;
      return {
        sourceType: 'CMS',
        sourceReferenceId: content.slug,
        sourceVersion: `${content.publicId}:${content.versionNumber}:${content.publishedAt.toISOString()}`,
        locale,
        content: [content.title, content.summary, content.body].filter(Boolean).join('\n'),
        dataClassification: 'PUBLIC',
        transferAllowed: true,
        readerScope: 'PUBLIC',
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'CMS_CONTENT_NOT_FOUND') return null;
      throw error;
    }
  }
}
