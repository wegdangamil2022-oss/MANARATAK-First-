import { PrismaClient } from '@prisma/client';

// Mirrors the schema-backed consumer inventory; source and PostgreSQL tests verify completeness.
export const ASSET_REFERENCE_OWNER_GUARDS = [
  { table: 'Course', fields: ['thumbnailAssetId'], attachments: false, seo: false },
  { table: 'CourseLessonAsset', fields: ['assetId'], attachments: false, seo: false },
  { table: 'CertificateIssuer', fields: ['issuerLogoAssetId'], attachments: false, seo: false },
  { table: 'CertificateTemplateVersion', fields: ['logoAssetId', 'sealAssetId', 'signatureAssetId', 'designAssetId'], attachments: false, seo: false },
  { table: 'Certificate', fields: ['certificatePdfAssetId', 'previewImageAssetId', 'verificationQrAssetId', 'signatureAssetId'], attachments: false, seo: false },
  { table: 'University', fields: ['logoAssetId'], attachments: false, seo: false },
  { table: 'InternationalTestPreparationMaterial', fields: ['assetId'], attachments: false, seo: false },
  { table: 'StudentWorkspace', fields: ['avatarAssetId'], attachments: false, seo: false },
  { table: 'StudentCertificateReadProjection', fields: ['certificatePdfAssetId', 'previewImageAssetId'], attachments: false, seo: false },
  { table: 'CmsContentNode', fields: ['featuredAssetId'], attachments: false, seo: true },
  { table: 'CmsLocalizedContent', fields: ['featuredAssetId'], attachments: false, seo: true },
  { table: 'CmsContentAttachment', fields: ['assetId'], attachments: false, seo: false },
  { table: 'CmsPublishedContent', fields: ['featuredAssetId'], attachments: true, seo: true },
  { table: 'ReferenceCountry', fields: ['flagAssetId'], attachments: false, seo: false },
  { table: 'StudyDestinationProfile', fields: ['imageAssetId'], attachments: false, seo: false },
  { table: 'StudentToolDefinitionRecord', fields: ['iconAssetId'], attachments: false, seo: false },
  { table: 'ServiceCatalogRecord', fields: ['thumbnailAssetId'], attachments: false, seo: false },
  { table: 'ServiceDeliveryArtifactRecord', fields: ['assetId'], attachments: false, seo: false },
  { table: 'CareerEmployerRecord', fields: ['logoAssetId'], attachments: false, seo: false },
  { table: 'CareerProfileRecord', fields: ['resumeAssetId'], attachments: false, seo: false },
  { table: 'CareerApplicationRecord', fields: ['cvAssetId'], attachments: false, seo: false },
] as const;

type Guard = { tableName: string; triggerName: string; enabled: string; type: number;
  functionName: string; argumentsHex: string; columns: string[]; replicationRole: string };

/** Read-only deployment gate: never installs a trigger or repairs historical references. */
export async function assertAssetReferenceIntegrityInstalled(prisma: Pick<PrismaClient, '$queryRaw'>): Promise<void> {
  const guards = await prisma.$queryRaw<Guard[]>`
    SELECT c.relname AS "tableName", t.tgname AS "triggerName", t.tgenabled AS enabled,
      t.tgtype::int AS type, p.proname AS "functionName", encode(t.tgargs, 'hex') AS "argumentsHex",
      ARRAY(SELECT a.attname::text FROM pg_attribute a
        WHERE a.attrelid = c.oid AND a.attnum = ANY(t.tgattr::smallint[]) ORDER BY a.attname) AS columns,
      current_setting('session_replication_role') AS "replicationRole"
    FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE n.nspname = current_schema() AND NOT t.tgisinternal
      AND t.tgname IN ('eap_asset_reference_owner', 'eap_asset_reference_lifecycle', 'eap_asset_restore_barrier')
  `;
  const available = (table: string, name: string, type: number, fn: string, args: string, columns: readonly string[]) =>
    guards.some(guard => guard.tableName === table && guard.triggerName === name &&
      ['O', 'A'].includes(guard.enabled) && guard.replicationRole === 'origin' && guard.type === type &&
      guard.functionName === fn && guard.argumentsHex === args &&
      JSON.stringify(guard.columns) === JSON.stringify([...columns].sort()));
  if (!available('AssetRecord', 'eap_asset_reference_lifecycle', 27,
    'manaratak_protect_asset_references', '', [])) throw new Error('ASSET_REFERENCE_INTEGRITY_NOT_INSTALLED');
  if (!available('AssetRecord', 'eap_asset_restore_barrier', 27,
    'manaratak_protect_pending_asset_restore', '', [])) throw new Error('ASSET_REFERENCE_INTEGRITY_NOT_INSTALLED');
  for (const owner of ASSET_REFERENCE_OWNER_GUARDS) {
    const args = Buffer.from([owner.fields.join(','), String(owner.attachments), String(owner.seo), ''].join('\0')).toString('hex');
    const columns: string[] = [...owner.fields, ...(owner.attachments ? ['attachmentAssetIds'] : []), ...(owner.seo ? ['seoMetadata'] : [])];
    if (!available(owner.table, 'eap_asset_reference_owner', 23,
      'manaratak_require_active_asset_reference', args, columns)) throw new Error('ASSET_REFERENCE_INTEGRITY_NOT_INSTALLED');
  }
}
