import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CmsContentStatus, CmsContentType, ICmsRepository } from '@manaratak/domain';
import { AdminCmsUseCases, PublicCmsUseCases } from '../../src/cms/use-cases/CmsUseCases';

describe('Phase 16 CMS use cases', () => {
  let repository: ICmsRepository;
  let admin: AdminCmsUseCases;
  let publicCms: PublicCmsUseCases;

  beforeEach(() => {
    repository = {
      createContent: vi
        .fn()
        .mockImplementation((data) =>
          Promise.resolve({
            id: 'content-1',
            version: 1,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ),
      updateContent: vi.fn(),
      findContentById: vi.fn(),
      findContentBySlug: vi.fn(),
      getContentDetail: vi.fn(),
      listContent: vi.fn(),
      upsertLocalizedContent: vi.fn(),
      listLocalizedContent: vi.fn(),
      getReadiness: vi.fn().mockResolvedValue({ ready: true, missing: [], warnings: [] }),
      submitForReview: vi.fn(),
      approveReview: vi.fn(),
      rejectReview: vi.fn(),
      schedule: vi.fn(),
      cancelSchedule: vi.fn(),
      publish: vi.fn(),
      archive: vi.fn(),
      listRevisions: vi.fn(),
      restoreRevision: vi.fn(),
      createCategory: vi.fn(),
      listCategories: vi.fn(),
      createTag: vi.fn(),
      listTags: vi.fn(),
      listPublished: vi
        .fn()
        .mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
      getPublishedBySlug: vi.fn(),
      changeLocalizedSlug: vi.fn(),
      listRedirects: vi.fn(),
      createRedirect: vi.fn(),
      listNavigation: vi.fn(),
      saveNavigation: vi.fn(),
      publishNavigation: vi.fn(),
      listBlockSchemas: vi.fn(),
      createBlockSchema: vi.fn(),
      listBlocks: vi.fn(),
      saveBlock: vi.fn(),
      listAnnouncements: vi.fn(),
      saveAnnouncement: vi.fn(),
      publishAnnouncement: vi.fn(),
      archiveAnnouncement: vi.fn(),
      processDueSchedules: vi.fn(),
    };
    admin = new AdminCmsUseCases(repository);
    publicCms = new PublicCmsUseCases(repository);
  });

  it('creates an Arabic-first editorial node as draft owned by the authenticated author', async () => {
    const content = await admin.createContent(
      {
        slug: 'study-guide',
        siteIdentifier: 'manaratak',
        primaryLocale: 'ar',
        contentType: CmsContentType.STUDY_GUIDE,
        title: 'دليل الدراسة',
      },
      'editor-1',
    );
    expect(content.status).toBe(CmsContentStatus.DRAFT);
    expect(repository.createContent).toHaveBeenCalledWith(
      expect.objectContaining({
        publicId: expect.stringMatching(/^cms-/),
        authorId: 'editor-1',
        ownerId: 'editor-1',
        primaryLocale: 'ar',
      }),
    );
  });

  it('rejects raw files and URLs instead of bypassing Phase 05 Asset Platform', async () => {
    await expect(
      admin.createContent(
        {
          slug: 'bad-asset',
          siteIdentifier: 'manaratak',
          primaryLocale: 'ar',
          contentType: CmsContentType.ARTICLE,
          title: 'Bad',
          featuredAssetId: 'https://example.com/image.png',
        },
        'editor-1',
      ),
    ).rejects.toThrow('CMS_ASSET_MUST_USE_EAP_HANDLE');
    await expect(
      admin.upsertLocalizedContent(
        {
          contentId: 'content-1',
          locale: 'ar',
          localizedSlug: 'article',
          title: 'عنوان',
          body: 'محتوى',
          attachmentAssetIds: ['C:\\raw.png'],
        },
        'editor-1',
      ),
    ).rejects.toThrow('CMS_ASSET_MUST_USE_EAP_HANDLE');
  });

  it('blocks review submission when publishing readiness has missing fields', async () => {
    vi.mocked(repository.getReadiness).mockResolvedValue({
      ready: false,
      missing: ['seo.title'],
      warnings: [],
    });
    await expect(admin.submitForReview('content-1', 'ar', 'editor-1')).rejects.toThrow(
      'CMS_NOT_READY:seo.title',
    );
    expect(repository.submitForReview).not.toHaveBeenCalled();
  });

  it('passes actor and optimistic version through maker-checker workflow', async () => {
    await admin.approveReview('content-1', 'ar', 'publisher-2', 7, 'تم التدقيق');
    expect(repository.approveReview).toHaveBeenCalledWith({
      contentId: 'content-1',
      locale: 'ar',
      actorId: 'publisher-2',
      expectedVersion: 7,
      comments: 'تم التدقيق',
    });
  });

  it('cancels a scheduled publication explicitly without publishing it', async () => {
    await admin.cancelSchedule('content-1', 'ar', 'editor-1', 4);
    expect(repository.cancelSchedule).toHaveBeenCalledWith({ contentId: 'content-1', locale: 'ar', actorId: 'editor-1', expectedVersion: 4 });
    expect(repository.publish).not.toHaveBeenCalled();
  });


  it('strips editor-supplied canonical URLs before persistence', async () => {
    await admin.createContent(
      {
        slug: 'seo-governed',
        siteIdentifier: 'manaratak',
        primaryLocale: 'ar',
        contentType: CmsContentType.NEWS,
        title: 'خبر',
        seoMetadata: {
          title: 'خبر',
          description: 'وصف',
          canonicalUrl: 'https://attacker.invalid/impersonate',
          keywords: [],
          noIndex: false,
          noFollow: false,
        },
      },
      'editor-1',
    );
    expect(repository.createContent).toHaveBeenCalledWith(
      expect.objectContaining({ seoMetadata: expect.not.objectContaining({ canonicalUrl: expect.anything() }) }),
    );
  });

  it('publishes navigation and announcements through payload-free checker commands', async () => {
    await admin.publishNavigation('menu-1', 4, 'checker-2');
    expect(repository.publishNavigation).toHaveBeenCalledWith('menu-1', 4, 'checker-2');
    await admin.publishAnnouncement('ann-1', 7, 'checker-2');
    expect(repository.publishAnnouncement).toHaveBeenCalledWith('ann-1', 7, 'checker-2');
  });

  it('keeps the public query on the published projection only', async () => {
    await publicCms.listPublished({ contentType: CmsContentType.ARTICLE }, 'ar');
    expect(repository.listPublished).toHaveBeenCalledWith(
      { contentType: CmsContentType.ARTICLE },
      'ar',
    );
  });
});
