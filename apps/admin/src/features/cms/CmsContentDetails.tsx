import {
  FilePenLine,
  Eye,
  Search,
  Link2,
  Image,
  ShieldCheck,
  History,
  ArrowRight,
  Send,
  Clock3,
  Archive,
  CheckCircle2,
} from 'lucide-react';
import { CmsRichText } from '@manaratak/ui';
import { AssetPicker } from '../../components/AssetPicker';
import { CmsRevisionHistory } from './CmsRevisionHistory';
import { splitValues } from './cmsModels';
import { CmsWorkspace } from './useCmsWorkspace';
import {
  Panel,
  Field,
  TextArea,
  Check,
  PrimaryButton,
  Action,
  LocaleButton,
  Status,
  Alert,
  DomainLinksPanel,
} from './CmsControls';
export function CmsContentDetails({ workspace }: { workspace: CmsWorkspace }) {
  const {
    tr,
    uiLanguage,
    canAuthor,
    canReview,
    canPublish,
    selected,
    locale,
    setLocale,
    currentEditor,
    updateEditor,
    busy,
    dirty,
    dirtyLocales,
    linksDirty,
    editorLocked,
    localizedState,
    publicUrl,
    preview,
    readiness,
    tags,
    domainLinks,
    setDomainLinks,
    saveDomainLinks,
    saveLocale,
    runWorkflow,
    schedule,
    cancelSchedule,
    changeSlug,
    openContent,
    section,
    changeParam,
    listUrl,
    go,
    editing,
    setEditing,
    catalogError,
    loadCatalogs,
  } = workspace;
  if (!selected) return null;
  const ar = uiLanguage === 'ar';
  const editable =
    canAuthor && !editorLocked && (editing || localizedState === 'DRAFT' || !localizedState);
  const areas = [
    ['content', ar ? 'المحتوى' : 'Content', FilePenLine],
    ['media', ar ? 'الوسائط والتصنيف' : 'Media and classification', Image],
    ['links', ar ? 'علاقات منارتك' : 'Platform relationships', Link2],
    ['seo', ar ? 'الظهور وSEO' : 'Search and SEO', Search],
    ['preview', ar ? 'المعاينة والجاهزية' : 'Preview and readiness', ShieldCheck],
    ['history', ar ? 'النسخ والسجل' : 'Revisions and history', History],
  ] as const;
  return (
    <div className="cms-details">
      <div className="cms-detail-heading">
        <Action disabled={busy} onClick={() => go(listUrl)}>
          <ArrowRight size={17} />
          {ar ? 'جميع المواد' : 'All content'}
        </Action>
        <div className="cms-detail-title">
          <h2>{currentEditor.title || selected.title}</h2>
          <span>
            {selected.publicId} · {ar ? 'إصدار اللغة' : 'Locale version'}{' '}
            {currentEditor.version ?? '—'}
          </span>
        </div>
        <Status value={localizedState ?? 'MISSING'} />
        {!editable && canAuthor && !editorLocked && (
          <Action disabled={busy} onClick={() => setEditing(true)}>
            <FilePenLine size={17} />
            {ar ? 'تعديل' : 'Edit'}
          </Action>
        )}
        <Action disabled={busy} onClick={() => changeParam('section', 'preview')}>
          <Eye size={17} />
          {tr('المعاينة')}
        </Action>
        <Action
          disabled={busy}
          onClick={() => {
            if (
              !dirty ||
              window.confirm(ar ? 'تجاهل التعديلات وإعادة التحميل؟' : 'Discard changes and reload?')
            )
              void openContent(selected.id);
          }}
        >
          {tr('إعادة التحميل')}
        </Action>
      </div>
      <div className="cms-languages" aria-label={ar ? 'لغة المحتوى' : 'Content language'}>
        {(['ar', 'en'] as const).map((value) => (
          <LocaleButton key={value} active={locale === value} onClick={() => setLocale(value)}>
            {value === 'ar' ? tr('العربية') : 'English'} ·{' '}
            {selected.localizedPayloads.find((entry) => entry.locale === value)?.state ? (
              <Status
                value={selected.localizedPayloads.find((entry) => entry.locale === value)!.state}
              />
            ) : (
              '—'
            )}
          </LocaleButton>
        ))}
      </div>
      {dirty && (
        <Alert tone="error">
          {tr('توجد تعديلات غير محفوظة')} {dirtyLocales.ar ? tr('العربية') : ''}{' '}
          {dirtyLocales.en ? tr('الإنجليزية') : ''} {linksDirty ? tr('الروابط') : ''}
        </Alert>
      )}
      {catalogError && (
        <Alert tone="error">
          {catalogError}
          <Action onClick={() => void loadCatalogs()}>{ar ? 'إعادة المحاولة' : 'Retry'}</Action>
        </Alert>
      )}
      {locale === 'en' && (
        <p className="cms-note">
          {ar
            ? 'النسخة الإنجليزية متاحة للتحرير الإداري؛ العرض العام الإنجليزي غير مفعل حاليًا.'
            : 'English authoring is available; public English delivery remains disabled.'}
        </p>
      )}
      {(selected.publishedLocales?.includes(locale) || localizedState === 'PUBLISHED') &&
        locale === 'ar' && (
          <a className="cms-public-link" href={publicUrl} target="_blank" rel="noopener noreferrer">
            {tr('عرض المادة المنشورة في الصفحة العامة ↗')}
          </a>
        )}
      <nav className="cms-area-tabs" aria-label={ar ? 'أقسام المادة' : 'Content sections'}>
        {areas.map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            aria-current={section === value ? 'page' : undefined}
            onClick={() => changeParam('section', value)}
            disabled={busy}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
      {section === 'media' && (
        <Panel
          title={ar ? 'تصنيف المادة' : 'Content classification'}
          icon={<FilePenLine size={20} />}
        >
          <label>
            {ar ? 'التصنيف' : 'Category'}
            <select
              value={workspace.categoryId}
              disabled={
                !canAuthor ||
                busy ||
                Boolean(catalogError) ||
                Boolean(selected.publishedLocales?.length) ||
                selected.localizedPayloads.some((entry) =>
                  ['IN_REVIEW', 'READY_TO_PUBLISH', 'SCHEDULED'].includes(entry.state),
                )
              }
              onChange={(event) => workspace.setCategoryId(event.target.value)}
            >
              <option value="">{ar ? 'دون تصنيف' : 'No category'}</option>
              {workspace.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {ar ? category.nameAr : category.nameEn}
                </option>
              ))}
            </select>
          </label>
          <Action
            disabled={
              !canAuthor ||
              busy ||
              Boolean(catalogError) ||
              workspace.categoryId === (selected.categoryId ?? '')
            }
            onClick={() => void workspace.saveClassification()}
          >
            {ar ? 'حفظ التصنيف' : 'Save classification'}
          </Action>
          {Boolean(selected.publishedLocales?.length) && (
            <p className="cms-note">
              {ar
                ? 'تصنيف مادة لها نسخة منشورة محكوم بمراجعة بيانات المادة في الخادم.'
                : 'Root classification changes on published content require the governed root-review workflow.'}
            </p>
          )}
        </Panel>
      )}
      {['content', 'media', 'seo'].includes(section) && (
        <form onSubmit={saveLocale} noValidate>
          <fieldset disabled={!editable || busy}>
            {section === 'content' &&
              (editable ? (
                <Panel
                  title={`${tr('التحرير')} — ${locale === 'ar' ? tr('العربية') : tr('الإنجليزية')}`}
                  icon={<FilePenLine className="h-5 w-5" />}
                >
                  <div className="space-y-4">
                    <Field
                      label={tr('الرابط المحلي')}
                      dir="ltr"
                      value={currentEditor.localizedSlug}
                      onChange={(v) => updateEditor({ localizedSlug: v })}
                      required
                    />
                    <Field
                      label={tr('العنوان')}
                      dir={locale === 'ar' ? 'rtl' : 'ltr'}
                      value={currentEditor.title}
                      onChange={(v) => updateEditor({ title: v })}
                      required
                    />
                    <TextArea
                      label={tr('الملخص')}
                      dir={locale === 'ar' ? 'rtl' : 'ltr'}
                      value={currentEditor.summary}
                      onChange={(v) => updateEditor({ summary: v })}
                      rows={3}
                    />
                    <p className="text-xs text-slate-500">
                      {tr(
                        'يمكن كتابة نص عادي أو HTML للفقرات والعناوين والقوائم والروابط HTTPS. تُعرض المعاينة والعامة بنفس التنسيق الآمن.',
                      )}{' '}
                    </p>
                    <TextArea
                      label={tr('نص المحتوى')}
                      dir={locale === 'ar' ? 'rtl' : 'ltr'}
                      value={currentEditor.body}
                      onChange={(v) => updateEditor({ body: v })}
                      rows={15}
                      required
                    />
                    <Field
                      label={tr('مدة القراءة بالدقائق')}
                      dir="ltr"
                      value={currentEditor.readingTimeMinutes}
                      onChange={(v) => updateEditor({ readingTimeMinutes: v })}
                    />
                  </div>
                </Panel>
              ) : (
                <Panel title={ar ? 'المحتوى' : 'Content'} icon={<FilePenLine size={20} />}>
                  <article dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
                    <h3>{preview.title}</h3>
                    <p>{preview.summary}</p>
                    <CmsRichText body={preview.body} className="cms-rich-text" />
                  </article>
                </Panel>
              ))}
            {section === 'media' && (
              <Panel title={tr('الوسائط والتصنيف')} icon={<Eye className="h-5 w-5" />}>
                <div className="space-y-4">
                  <AssetPicker
                    label={tr('الصورة البارزة')}
                    purpose="CMS_LOCALIZED_FEATURED_ASSET"
                    mimeTypePrefix="image/"
                    value={currentEditor.featuredAssetId}
                    onChange={(featuredAssetId) => updateEditor({ featuredAssetId })}
                  />
                  <div className="space-y-2">
                    <AssetPicker
                      label={tr('إضافة مرفق من مكتبة الأصول')}
                      purpose="CMS_ATTACHMENT_ASSET"
                      value=""
                      onChange={(assetId) => {
                        if (!assetId) return;
                        const ids = splitValues(currentEditor.attachmentAssetIds);
                        if (!ids.includes(assetId))
                          updateEditor({ attachmentAssetIds: [...ids, assetId].join(', ') });
                      }}
                    />
                    <TextArea
                      label={tr('المرفقات المختارة')}
                      dir="ltr"
                      value={currentEditor.attachmentAssetIds}
                      onChange={(v) => updateEditor({ attachmentAssetIds: v })}
                      rows={2}
                    />
                  </div>
                  <fieldset>
                    <legend className="mb-2 text-sm font-bold"> {tr('الوسوم')} </legend>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <label
                          key={tag.id}
                          className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={currentEditor.tagIds.includes(tag.id)}
                            onChange={(e) =>
                              updateEditor({
                                tagIds: e.target.checked
                                  ? [...currentEditor.tagIds, tag.id]
                                  : currentEditor.tagIds.filter((id) => id !== tag.id),
                              })
                            }
                          />
                          {uiLanguage === 'ar' ? tag.labelAr : tag.labelEn}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </Panel>
            )}
            {section === 'seo' && (
              <Panel title={tr('تهيئة محركات البحث')} icon={<Search className="h-5 w-5" />}>
                <div className="space-y-4">
                  <Field
                    label={tr('عنوان SEO')}
                    value={currentEditor.seoTitle}
                    onChange={(v) => updateEditor({ seoTitle: v })}
                    required
                  />
                  <TextArea
                    label={tr('وصف SEO')}
                    value={currentEditor.seoDescription}
                    onChange={(v) => updateEditor({ seoDescription: v })}
                    rows={3}
                    required
                  />
                  <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                    {tr(
                      'Canonical URL يُولَّد تلقائيًا من نوع المحتوى واللغة والـslug ولا يمكن للناشر استبداله يدويًا.',
                    )}{' '}
                  </p>
                  <Field
                    label={tr('الكلمات المفتاحية')}
                    value={currentEditor.keywords}
                    onChange={(v) => updateEditor({ keywords: v })}
                  />
                  <Field
                    label={ar ? 'عنوان المشاركة' : 'Open Graph title'}
                    value={currentEditor.openGraphTitle}
                    onChange={(value) => updateEditor({ openGraphTitle: value })}
                  />
                  <TextArea
                    label={ar ? 'وصف المشاركة' : 'Open Graph description'}
                    value={currentEditor.openGraphDescription}
                    onChange={(value) => updateEditor({ openGraphDescription: value })}
                    rows={3}
                  />
                  <AssetPicker
                    label={tr('صورة Open Graph')}
                    purpose="CMS_OPEN_GRAPH_ASSET"
                    mimeTypePrefix="image/"
                    value={currentEditor.openGraphAssetId}
                    onChange={(openGraphAssetId) => updateEditor({ openGraphAssetId })}
                  />
                  <div className="flex gap-5 text-sm">
                    <Check
                      label={tr('منع الفهرسة')}
                      checked={currentEditor.noIndex}
                      onChange={(v) => updateEditor({ noIndex: v })}
                    />
                    <Check
                      label={tr('منع تتبع الروابط')}
                      checked={currentEditor.noFollow}
                      onChange={(v) => updateEditor({ noFollow: v })}
                    />
                  </div>
                </div>
              </Panel>
            )}
          </fieldset>
          {editable && (
            <div className="cms-save-bar">
              <p>
                {ar
                  ? 'يحفظ نسخة اللغة كاملة دون نشرها؛ العلاقات تُحفظ بشكل مستقل.'
                  : 'Saves the complete locale draft without publishing. Relationships save separately.'}
              </p>
              <PrimaryButton disabled={busy || !currentEditor.title || !currentEditor.body}>
                {busy ? tr('جارٍ الحفظ…') : tr('حفظ النسخة على الخادم')}
              </PrimaryButton>
              <Action
                disabled={busy}
                onClick={() => {
                  if (
                    !dirty ||
                    window.confirm(
                      ar ? 'إلغاء التعديلات غير المحفوظة؟' : 'Discard unsaved changes?',
                    )
                  ) {
                    void openContent(selected.id);
                    setEditing(false);
                  }
                }}
              >
                {ar ? 'إلغاء التعديل' : 'Cancel editing'}
              </Action>
            </div>
          )}
          {editorLocked && (
            <p className="cms-note">
              {tr('النسخة مقفلة للمراجعة أو النشر. أعدها للمحرر أو ألغِ الجدولة قبل تحريرها.')}
            </p>
          )}
        </form>
      )}
      {section === 'links' && (
        <DomainLinksPanel
          links={domainLinks}
          setLinks={setDomainLinks}
          busy={busy || !canAuthor || editorLocked}
          onSave={saveDomainLinks}
        />
      )}
      {section === 'seo' && canAuthor && currentEditor.version && (
        <Action disabled={busy || dirty || editorLocked} onClick={() => void changeSlug()}>
          {tr('تغيير الرابط بمراجعة جديدة')}
        </Action>
      )}
      {section === 'preview' && (
        <div className="cms-preview-layout">
          <Panel title={tr('المعاينة')} icon={<Eye className="h-5 w-5" />}>
            <article
              dir={locale === 'ar' ? 'rtl' : 'ltr'}
              lang={locale}
              className="rounded-2xl border bg-slate-50 p-6"
            >
              <p className="text-xs font-bold text-[#0E7C86]"> {tr('معاينة مسودة غير عامة')} </p>
              <h3 className="mt-3 text-3xl font-black">{preview.title || tr('العنوان')}</h3>
              {preview.summary && <p className="mt-3 text-slate-600">{preview.summary}</p>}
              <div className="mt-6 whitespace-pre-wrap leading-8 text-slate-800">
                <CmsRichText
                  body={preview.body || tr('اكتب المحتوى لتظهر المعاينة هنا.')}
                  className="cms-rich-text"
                />
              </div>
            </article>
          </Panel>
          <Panel title={tr('الجاهزية والمراجعة والنشر')} icon={<ShieldCheck size={20} />}>
            {readiness ? (
              <div className="cms-readiness">
                <strong>
                  {readiness.ready ? tr('جاهز للإرسال للمراجعة') : tr('توجد حقول مطلوبة')}
                </strong>
                {readiness.missing.length > 0 && (
                  <p>
                    {tr('الناقص:')} {readiness.missing.join(', ')}
                  </p>
                )}
                {readiness.warnings.length > 0 && (
                  <p>
                    {tr('تنبيهات:')} {readiness.warnings.join(', ')}
                  </p>
                )}
              </div>
            ) : (
              <p>{tr('احفظ هذه اللغة لإظهار فحص الجاهزية.')}</p>
            )}
            <div className="cms-actions">
              {canAuthor && localizedState === 'DRAFT' && (
                <Action
                  disabled={busy || dirty || !readiness?.ready}
                  onClick={() => void runWorkflow('submit-review')}
                >
                  <Send size={17} />
                  {tr('إرسال للمراجعة')}
                </Action>
              )}
              {canReview && localizedState === 'IN_REVIEW' && (
                <>
                  <Action disabled={busy || dirty} onClick={() => void runWorkflow('approve')}>
                    <CheckCircle2 size={17} />
                    {tr('اعتماد كناشر')}
                  </Action>
                  <Action disabled={busy || dirty} onClick={() => void runWorkflow('reject')}>
                    {tr('إعادة للمحرر')}
                  </Action>
                </>
              )}
              {canPublish && localizedState === 'READY_TO_PUBLISH' && (
                <>
                  <Action disabled={busy || dirty} onClick={() => void runWorkflow('publish')}>
                    <Send size={17} />
                    {tr('نشر الآن')}
                  </Action>
                  <Action disabled={busy || dirty} onClick={() => void schedule()}>
                    <Clock3 size={17} />
                    {tr('جدولة')}
                  </Action>
                </>
              )}
              {canPublish && localizedState === 'SCHEDULED' && (
                <Action disabled={busy || dirty} onClick={() => void cancelSchedule()}>
                  {tr('إلغاء الجدولة')}
                </Action>
              )}
              {canPublish &&
                (selected.publishedLocales?.includes(locale) || localizedState === 'PUBLISHED') && (
                  <Action disabled={busy || dirty} onClick={() => void runWorkflow('archive')}>
                    <Archive size={17} />
                    {tr('أرشفة')}
                  </Action>
                )}
            </div>
            <p className="cms-note">
              {tr(
                'لا يستطيع منشئ النسخة اعتمادها بنفسه. يلزم حساب ناشر آخر، ولا يحدث نشر تلقائي عند الحفظ أو المراجعة.',
              )}
            </p>
            {selected.localizedPayloads.find((entry) => entry.locale === locale)?.scheduledAt && (
              <p>
                {new Date(
                  selected.localizedPayloads.find((entry) => entry.locale === locale)!.scheduledAt!,
                ).toLocaleString(uiLanguage)}
              </p>
            )}
          </Panel>
        </div>
      )}
      {section === 'history' && (
        <Panel title={ar ? 'النسخ والسجل' : 'Revisions and history'} icon={<History size={20} />}>
          <CmsRevisionHistory
            key={selected.id + ':' + locale}
            contentId={selected.id}
            locale={locale}
            version={currentEditor.version}
            disabled={busy || dirty}
            onRestore={() => openContent(selected.id)}
          />
        </Panel>
      )}
    </div>
  );
}
