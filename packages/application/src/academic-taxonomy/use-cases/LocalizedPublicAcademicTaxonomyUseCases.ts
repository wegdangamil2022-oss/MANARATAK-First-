import { PublicAcademicTaxonomyUseCases } from './PublicAcademicTaxonomyUseCases';
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
    const records = await new PublicAcademicTaxonomyUseCases(this.repository).listNodes(filters);
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
    const records = await new PublicAcademicTaxonomyUseCases(this.repository).searchNodes(query, filters);
    return records.map((record) => this.project(record, locale));
  }

  public async listChildren(parentNodeId: string, locale: SupportedLocale = DEFAULT_LOCALE, filters: { page?: number; pageSize?: number } = {}): Promise<LocalizedAcademicTaxonomyNodeDto[]> {
    return (await new PublicAcademicTaxonomyUseCases(this.repository).listChildren(parentNodeId, filters)).map(node => this.project(node, locale));
  }
  public async listParents(childNodeId: string, locale: SupportedLocale = DEFAULT_LOCALE, filters: { page?: number; pageSize?: number } = {}): Promise<LocalizedAcademicTaxonomyNodeDto[]> {
    return (await new PublicAcademicTaxonomyUseCases(this.repository).listParents(childNodeId, filters)).map(node => this.project(node, locale));
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
