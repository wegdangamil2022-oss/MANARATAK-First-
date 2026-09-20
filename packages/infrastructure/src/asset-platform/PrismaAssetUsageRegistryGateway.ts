import { PrismaClient } from '@prisma/client';
import { AssetId, AssetUsageReference, IAssetUsageRegistryGateway } from '@manaratak/domain';

type DelegateCheck = {
  delegate: string;
  field: string;
  consumer: string;
};

const DIRECT_USAGE_CHECKS: DelegateCheck[] = [
  { delegate: 'course', field: 'thumbnailAssetId', consumer: 'COURSE' },
  { delegate: 'courseLessonAsset', field: 'assetId', consumer: 'COURSE_LESSON_ASSET' },
  { delegate: 'certificateIssuer', field: 'issuerLogoAssetId', consumer: 'CERTIFICATE_ISSUER' },
  { delegate: 'certificateTemplateVersion', field: 'logoAssetId', consumer: 'CERTIFICATE_TEMPLATE_LOGO' },
  { delegate: 'certificateTemplateVersion', field: 'sealAssetId', consumer: 'CERTIFICATE_TEMPLATE_SEAL' },
  { delegate: 'certificateTemplateVersion', field: 'signatureAssetId', consumer: 'CERTIFICATE_TEMPLATE_SIGNATURE' },
  { delegate: 'certificateTemplateVersion', field: 'designAssetId', consumer: 'CERTIFICATE_TEMPLATE_DESIGN' },
  { delegate: 'certificate', field: 'certificatePdfAssetId', consumer: 'CERTIFICATE_PDF' },
  { delegate: 'certificate', field: 'previewImageAssetId', consumer: 'CERTIFICATE_PREVIEW' },
  { delegate: 'certificate', field: 'verificationQrAssetId', consumer: 'CERTIFICATE_QR' },
  { delegate: 'certificate', field: 'signatureAssetId', consumer: 'CERTIFICATE_SIGNATURE' },
  { delegate: 'university', field: 'logoAssetId', consumer: 'UNIVERSITY_LOGO' },
  { delegate: 'internationalTestPreparationMaterial', field: 'assetId', consumer: 'INTERNATIONAL_TEST_MATERIAL' },
  { delegate: 'studentWorkspace', field: 'avatarAssetId', consumer: 'STUDENT_AVATAR' },
  { delegate: 'studentCertificateReadProjection', field: 'certificatePdfAssetId', consumer: 'STUDENT_CERTIFICATE_PDF' },
  { delegate: 'studentCertificateReadProjection', field: 'previewImageAssetId', consumer: 'STUDENT_CERTIFICATE_PREVIEW' },
  { delegate: 'cmsContentNode', field: 'featuredAssetId', consumer: 'CMS_NODE_FEATURED' },
  { delegate: 'cmsLocalizedContent', field: 'featuredAssetId', consumer: 'CMS_LOCALIZED_FEATURED' },
  { delegate: 'cmsContentAttachment', field: 'assetId', consumer: 'CMS_ATTACHMENT' },
  { delegate: 'cmsPublishedContent', field: 'featuredAssetId', consumer: 'CMS_PUBLISHED_FEATURED' },
  { delegate: 'referenceCountry', field: 'flagAssetId', consumer: 'REFERENCE_COUNTRY_FLAG' },
  { delegate: 'studyDestinationProfile', field: 'imageAssetId', consumer: 'STUDY_DESTINATION_IMAGE' },
  { delegate: 'studentToolDefinitionRecord', field: 'iconAssetId', consumer: 'STUDENT_TOOL_ICON' },
  { delegate: 'serviceCatalogRecord', field: 'thumbnailAssetId', consumer: 'SERVICE_THUMBNAIL' },
  { delegate: 'serviceDeliveryArtifactRecord', field: 'assetId', consumer: 'SERVICE_DELIVERY_ARTIFACT' },
  { delegate: 'careerEmployerRecord', field: 'logoAssetId', consumer: 'CAREER_EMPLOYER_LOGO' },
  { delegate: 'careerProfileRecord', field: 'resumeAssetId', consumer: 'CAREER_PROFILE_RESUME' },
  { delegate: 'careerApplicationRecord', field: 'cvAssetId', consumer: 'CAREER_APPLICATION_CV' },
];

export class PrismaAssetUsageRegistryGateway implements IAssetUsageRegistryGateway {
  constructor(private readonly prisma: PrismaClient) {}

  async isAssetInUse(id: AssetId): Promise<boolean> {
    return (await this.findUsages(id)).length > 0;
  }

  async findUsages(id: AssetId): Promise<AssetUsageReference[]> {
    const usages: AssetUsageReference[] = [];
    const client = this.prisma as unknown as Record<string, { count(args: unknown): Promise<number> }>;
    for (const check of DIRECT_USAGE_CHECKS) {
      const delegate = client[check.delegate];
      if (!delegate?.count) throw new Error(`ASSET_USAGE_REGISTRY_DELEGATE_MISSING:${check.delegate}`);
      const count = await delegate.count({ where: { [check.field]: id.value } });
      if (count > 0) usages.push({ consumer: check.consumer, field: check.field });
    }

    const jsonClient = this.prisma as unknown as Record<string, { count(args: unknown): Promise<number> }>;
    const publishedAttachmentCount = await jsonClient.cmsPublishedContent.count({
      where: { attachmentAssetIds: { array_contains: [id.value] } },
    });
    if (publishedAttachmentCount > 0) {
      usages.push({ consumer: 'CMS_PUBLISHED_ATTACHMENTS', field: 'attachmentAssetIds' });
    }

    const seoChecks = [
      { delegate: 'cmsContentNode', consumer: 'CMSCONTENTNODE_SEO' },
      { delegate: 'cmsLocalizedContent', consumer: 'CMSLOCALIZEDCONTENT_SEO' },
      { delegate: 'cmsPublishedContent', consumer: 'CMSPUBLISHEDCONTENT_SEO' },
    ] as const;
    for (const check of seoChecks) {
      const count = await jsonClient[check.delegate].count({
        where: { seoMetadata: { path: ['openGraphAssetId'], equals: id.value } },
      });
      if (count > 0) {
        usages.push({ consumer: check.consumer, field: 'seoMetadata.openGraphAssetId' });
      }
    }
    return usages;
  }

  async registerUsage(): Promise<void> {
    throw new Error('ASSET_USAGE_REGISTRY_IS_DERIVED_READ_ONLY');
  }

  async unregisterUsage(): Promise<void> {
    throw new Error('ASSET_USAGE_REGISTRY_IS_DERIVED_READ_ONLY');
  }
}
