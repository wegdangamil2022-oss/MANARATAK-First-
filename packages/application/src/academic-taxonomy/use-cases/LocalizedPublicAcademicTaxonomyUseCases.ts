import {
  AcademicStandardType,
  AcademicTaxonomyFilters,
  AcademicTaxonomyNodeDto,
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  IAcademicTaxonomyRepository,
} from '@manaratak/domain';
import { DEFAULT_LOCALE, type SupportedLocale } from '@manaratak/shared';
import { ApplicationLocaleProjectionService } from '../../localization/ApplicationLocaleProjectionService';

export type LocalizedAcademicTaxonomyNodeDto = AcademicTaxonomyNodeDto & {
  displayName: string;
};

export class LocalizedPublicAcademicTaxonomyUseCases {
  constructor(
    private readonly repository: IAcademicTaxonomyRepository,
    private readonly projection = new ApplicationLocaleProjectionService(),
  ) {}

  public async listNodes(
    filters: AcademicTaxonomyFilters = {},
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<LocalizedAcademicTaxonomyNodeDto[]> {
    const records = await this.repository.listNodes({ ...filters, status: AcademicTaxonomyStatus.ACTIVE });
    return records.map((record) => this.project(record, locale));
  }

  public async getNode(
    nodeId: string,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<LocalizedAcademicTaxonomyNodeDto | null> {
    const record = await this.repository.getNode(nodeId);
    return record?.status === AcademicTaxonomyStatus.ACTIVE ? this.project(record, locale) : null;
  }

  public async getNodeByCanonicalKey(
    input: {
      nodeType: AcademicTaxonomyNodeType;
      canonicalCode: string;
      standardType?: AcademicStandardType;
    },
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<LocalizedAcademicTaxonomyNodeDto | null> {
    const record = await this.repository.getNodeByCanonicalKey(input);
    return record?.status === AcademicTaxonomyStatus.ACTIVE ? this.project(record, locale) : null;
  }

  public async searchNodes(
    query: string,
    filters: AcademicTaxonomyFilters = {},
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<LocalizedAcademicTaxonomyNodeDto[]> {
    const trimmed = (query ?? '').trim();
    const records = await this.repository.listNodes({
      ...filters,
      status: AcademicTaxonomyStatus.ACTIVE,
      ...(trimmed ? { q: trimmed } : {}),
    });
    return records.map((record) => this.project(record, locale));
  }

  public async listChildren(
    parentNodeId: string,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<LocalizedAcademicTaxonomyNodeDto[]> {
    const parent = await this.repository.getNode(parentNodeId);
    if (parent?.status !== AcademicTaxonomyStatus.ACTIVE) return [];
    const records = await this.repository.listChildren(parentNodeId);
    return records.filter((record) => record.status === AcademicTaxonomyStatus.ACTIVE).map((record) => this.project(record, locale));
  }

  public async listParents(
    childNodeId: string,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<LocalizedAcademicTaxonomyNodeDto[]> {
    const child = await this.repository.getNode(childNodeId);
    if (child?.status !== AcademicTaxonomyStatus.ACTIVE) return [];
    const records = await this.repository.listParents(childNodeId);
    return records.filter((record) => record.status === AcademicTaxonomyStatus.ACTIVE).map((record) => this.project(record, locale));
  }

  private project(
    node: AcademicTaxonomyNodeDto,
    locale: SupportedLocale,
  ): LocalizedAcademicTaxonomyNodeDto {
    const localizedArabic = this.nonEmpty(node.localizedNames?.ar);
    const localizedEnglish = this.nonEmpty(node.localizedNames?.en) ?? node.canonicalName;
    const displayName = this.projection.resolveValue<string>({
      requestedLocale: locale,
      sourceLocale: 'en',
      sourceValue: node.canonicalName,
      localizedValues: {
        ar: localizedArabic,
        en: localizedEnglish,
      },
    }).value ?? node.canonicalName;

    return {
      ...node,
      displayName,
      localizedNames: undefined,
    };
  }

  private nonEmpty(value: string | undefined): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }
}
