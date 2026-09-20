import {
  IInternationalTestRepository,
  InternationalTestDto,
  InternationalTestFilters,
  PaginatedInternationalTestResult,
} from '@manaratak/domain';
import { DEFAULT_LOCALE, type SupportedLocale } from '@manaratak/shared';
import { ApplicationLocaleProjectionService } from '../../localization/ApplicationLocaleProjectionService';

export class LocalizedInternationalTestPublicUseCases {
  constructor(
    private readonly repository: IInternationalTestRepository,
    private readonly projection = new ApplicationLocaleProjectionService(),
  ) {}

  public async listPublished(
    filters: Omit<InternationalTestFilters, 'status'> = {},
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<PaginatedInternationalTestResult<InternationalTestDto>> {
    const safeFilters = filters ?? {};
    const requestedPage = typeof safeFilters.page === 'number' ? safeFilters.page : 1;
    const requestedPageSize = typeof safeFilters.pageSize === 'number' ? safeFilters.pageSize : 20;
    const paginated = await this.repository.listPublished({
      ...safeFilters,
      page: Math.max(1, Math.floor(requestedPage)),
      pageSize: Math.min(50, Math.max(1, Math.floor(requestedPageSize))),
    });
    return {
      ...paginated,
      data: paginated.data.map((test) => this.projection.projectInternationalTest(test, locale)),
    };
  }

  public async getPublishedBySlug(
    slug: string,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<InternationalTestDto> {
    const test = await this.repository.findPublishedBySlug(slug);
    if (!test) {
      throw new Error('International test not found');
    }
    return this.projection.projectInternationalTest(test, locale);
  }
}
