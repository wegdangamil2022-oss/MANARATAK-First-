import { Plus, RefreshCw, Search, Files, FolderTree } from 'lucide-react';
import { useCmsWorkspace, CmsWorkspace } from './useCmsWorkspace';
import { CmsContentCreate } from './CmsContentCreate';
import { CmsContentDetails } from './CmsContentDetails';
import { contentTypes, labelOf } from './cmsModels';
import { Action, Alert, Loading, Empty, Panel, Status, TaxonomyPanel } from './CmsControls';

export function CmsContentWorkspace() {
  const w = useCmsWorkspace(),
    ar = w.uiLanguage === 'ar';
  return (
    <>
      {w.notice && <Alert tone="success">{w.notice}</Alert>}
      {w.error && <Alert tone="error">{w.error}</Alert>}
      {w.screen === 'list' && <CmsContentLibrary w={w} />}
      {w.screen === 'create' && (
        <>
          <Action disabled={w.busy} onClick={() => w.go(w.listUrl)}>
            {ar ? 'العودة للمكتبة' : 'Back to library'}
          </Action>
          {w.canAuthor ? (
            <CmsContentCreate workspace={w} />
          ) : (
            <Alert tone="error">
              {ar ? 'ليست لديك صلاحية إنشاء المحتوى.' : 'Content authoring permission is required.'}
            </Alert>
          )}
        </>
      )}
      {w.screen === 'detail' &&
        (w.selected ? (
          <CmsContentDetails workspace={w} />
        ) : w.busy ? (
          <Loading />
        ) : (
          <Action onClick={() => w.go(w.listUrl)}>
            {ar ? 'العودة للمكتبة' : 'Back to library'}
          </Action>
        ))}
      {w.screen === 'taxonomy' && (
        <>
          {w.catalogError && (
            <Alert tone="error">
              {w.catalogError}
              <Action onClick={() => void w.loadCatalogs()}>
                {ar ? 'إعادة المحاولة' : 'Retry'}
              </Action>
            </Alert>
          )}
          <div className="cms-taxonomy-grid">
            <Panel title={ar ? 'التصنيفات' : 'Categories'} icon={<FolderTree size={20} />}>
              {w.categories.length ? (
                <ul className="cms-taxonomy-list">
                  {w.categories.map((item) => (
                    <li key={item.id}>
                      <strong>{ar ? item.nameAr : item.nameEn}</strong>
                      <small dir="ltr">{item.slug}</small>
                      <Status value={item.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty text={ar ? 'لا توجد تصنيفات محملة.' : 'No categories loaded.'} />
              )}
            </Panel>
            <Panel title={ar ? 'الوسوم' : 'Tags'} icon={<FolderTree size={20} />}>
              {w.tags.length ? (
                <ul className="cms-taxonomy-list">
                  {w.tags.map((item) => (
                    <li key={item.id}>
                      <strong>{ar ? item.labelAr : item.labelEn}</strong>
                      <small>{item.normalizedValue}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty text={ar ? 'لا توجد وسوم محملة.' : 'No tags loaded.'} />
              )}
            </Panel>
          </div>
          {w.canAuthor && (
            <TaxonomyPanel
              taxonomy={w.taxonomy}
              setTaxonomy={w.setTaxonomy}
              createTaxonomy={w.createTaxonomy}
              busy={w.busy}
            />
          )}
        </>
      )}
      {w.actionDialog}
    </>
  );
}

function CmsContentLibrary({ w }: { w: CmsWorkspace }) {
  const ar = w.uiLanguage === 'ar';
  return (
    <>
      <div className="cms-toolbar">
        <h2>
          <Files size={20} />
          {ar ? 'مكتبة المحتوى' : 'Content library'}
        </h2>
        <div className="cms-actions">
          <Action disabled={w.loading} onClick={() => void w.loadDashboard()}>
            <RefreshCw size={17} />
            {ar ? 'تحديث' : 'Refresh'}
          </Action>
          {w.canAuthor && (
            <Action
              onClick={() =>
                w.go('/cms/content/new?return=' + encodeURIComponent(w.listUrl.split('?')[1] ?? ''))
              }
            >
              <Plus size={17} />
              {ar ? 'إضافة محتوى' : 'Add content'}
            </Action>
          )}
        </div>
      </div>
      <section className="cms-filters" aria-label={ar ? 'البحث والتصفية' : 'Search and filters'}>
        <label className="cms-search">
          <span>
            <Search size={17} />
            {ar ? 'البحث في المحتوى' : 'Search content'}
          </span>
          <input
            maxLength={200}
            value={w.query}
            onChange={(event) => w.setQuery(event.target.value)}
            placeholder={ar ? 'العنوان أو الرابط أو الرقم…' : 'Title, slug or public ID…'}
          />
        </label>
        <label>
          {ar ? 'نوع المحتوى' : 'Content type'}
          <select value={w.typeFilter} onChange={(event) => w.setTypeFilter(event.target.value)}>
            <option value="">{ar ? 'كل الأنواع' : 'All types'}</option>
            {contentTypes.map((type) => (
              <option key={type} value={type}>
                {labelOf(type, w.uiLanguage)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {ar ? 'الحالة' : 'Status'}
          <select value={w.status} onChange={(event) => w.setStatus(event.target.value)}>
            <option value="">{ar ? 'كل الحالات' : 'All statuses'}</option>
            {['DRAFT', 'IN_REVIEW', 'READY_TO_PUBLISH', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'].map(
              (status) => (
                <option key={status} value={status}>
                  {labelOf(status, w.uiLanguage)}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          {ar ? 'التصنيف' : 'Category'}
          <select
            value={w.categoryFilter}
            onChange={(event) => w.setCategoryFilter(event.target.value)}
          >
            <option value="">{ar ? 'كل التصنيفات' : 'All categories'}</option>
            {w.categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {ar ? category.nameAr : category.nameEn}
              </option>
            ))}
          </select>
        </label>
        <Action disabled={w.loading} onClick={() => w.go('/cms/content')}>
          {ar ? 'مسح الفلاتر' : 'Clear filters'}
        </Action>
      </section>
      {w.catalogError && (
        <Alert tone="error">
          {w.catalogError}
          <Action onClick={() => void w.loadCatalogs()}>{ar ? 'إعادة المحاولة' : 'Retry'}</Action>
        </Alert>
      )}
      {w.loading ? (
        <Loading />
      ) : w.listError ? (
        <Alert tone="error">
          {w.listError}
          <Action onClick={() => void w.loadDashboard()}>{ar ? 'إعادة المحاولة' : 'Retry'}</Action>
        </Alert>
      ) : !w.list?.data.length ? (
        <Empty
          text={ar ? 'لا توجد مواد مطابقة للفلاتر الحالية.' : 'No content matches these filters.'}
        />
      ) : (
        <>
          <div className="cms-content-table">
            <table>
              <thead>
                <tr>
                  {[
                    ar ? 'المادة' : 'Content',
                    ar ? 'النوع والتصنيف' : 'Type and category',
                    ar ? 'العربية' : 'Arabic',
                    'English',
                    ar ? 'آخر تعديل' : 'Updated',
                    ar ? 'الإجراء' : 'Action',
                  ].map((label, index) => (
                    <th key={index}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {w.list.data.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                      <small dir="ltr">
                        {item.publicId} · /{item.slug}
                      </small>
                    </td>
                    <td>
                      {labelOf(item.contentType, w.uiLanguage)}
                      <small>
                        {w.categories.find((category) => category.id === item.categoryId)?.[
                          ar ? 'nameAr' : 'nameEn'
                        ] ?? '—'}
                      </small>
                    </td>
                    {['ar', 'en'].map((locale) => (
                      <td key={locale}>
                        <Status
                          value={
                            item.localizedStates?.find((entry) => entry.locale === locale)?.state ??
                            'MISSING'
                          }
                        />
                      </td>
                    ))}
                    <td>
                      <time dateTime={item.updatedAt}>
                        {new Date(item.updatedAt).toLocaleDateString(w.uiLanguage)}
                      </time>
                    </td>
                    <td>
                      <Action onClick={() => w.chooseContent(item.id)}>
                        {ar ? 'التفاصيل' : 'Details'}
                      </Action>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cms-mobile-records">
            {w.list.data.map((item) => (
              <article key={item.id}>
                <div>
                  <h3>{item.title}</h3>
                  <Status value={item.status} />
                </div>
                <p>
                  {labelOf(item.contentType, w.uiLanguage)} · {item.publicId}
                </p>
                <div>
                  {['ar', 'en'].map((locale) => (
                    <span key={locale}>
                      {locale.toUpperCase()}{' '}
                      <Status
                        value={
                          item.localizedStates?.find((entry) => entry.locale === locale)?.state ??
                          'MISSING'
                        }
                      />
                    </span>
                  ))}
                </div>
                <Action onClick={() => w.chooseContent(item.id)}>
                  {ar ? 'التفاصيل' : 'Details'}
                </Action>
              </article>
            ))}
          </div>
        </>
      )}
      {w.list && !w.loading && (
        <footer className="cms-pagination">
          <p>
            {ar ? 'نتائج البحث' : 'Search results'}: <strong>{w.list.total}</strong>
          </p>
          <Action disabled={w.page <= 1} onClick={() => w.setPage(w.page - 1)}>
            {ar ? 'السابق' : 'Previous'}
          </Action>
          <span>
            {w.page} / {Math.max(1, w.list.totalPages)}
          </span>
          <Action disabled={w.page >= w.list.totalPages} onClick={() => w.setPage(w.page + 1)}>
            {ar ? 'التالي' : 'Next'}
          </Action>
        </footer>
      )}
    </>
  );
}
