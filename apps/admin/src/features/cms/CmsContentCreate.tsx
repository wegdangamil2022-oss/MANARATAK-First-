import { Plus } from 'lucide-react';
import { AssetPicker } from '../../components/AssetPicker';
import { CmsWorkspace } from './useCmsWorkspace';
import { contentTypes, labelOf } from './cmsModels';
import { Panel, Field, Select, PrimaryButton } from './CmsControls';
export function CmsContentCreate({ workspace }: { workspace: CmsWorkspace }) {
  const { tr, create, setCreate, createContent, uiLanguage, categories, canAuthor, busy } =
    workspace;
  return (
    <Panel title={tr('إنشاء مسودة')} icon={<Plus className="h-5 w-5" />}>
      <form onSubmit={createContent} className="space-y-3">
        <Field
          label={tr('العنوان العربي')}
          value={create.title}
          onChange={(v) => setCreate({ ...create, title: v })}
          required
        />
        <Field
          label={tr('الرابط الثابت بالإنجليزية')}
          dir="ltr"
          value={create.slug}
          onChange={(v) => setCreate({ ...create, slug: v })}
          required
        />
        <Select
          label={tr('نوع المحتوى')}
          value={create.contentType}
          onChange={(v) => setCreate({ ...create, contentType: v })}
          options={contentTypes.map((x) => ({ value: x, label: labelOf(x, uiLanguage) }))}
        />
        <Select
          label={tr('التصنيف')}
          value={create.categoryId}
          onChange={(v) => setCreate({ ...create, categoryId: v })}
          options={[
            { value: '', label: tr('اختر لاحقًا') },
            ...categories.map((x) => ({ value: x.id, label: x.nameAr })),
          ]}
        />
        <AssetPicker
          label={tr('الصورة البارزة')}
          purpose="CMS_FEATURED_ASSET"
          mimeTypePrefix="image/"
          value={create.featuredAssetId}
          onChange={(featuredAssetId) => setCreate({ ...create, featuredAssetId })}
        />
        <PrimaryButton disabled={!canAuthor || busy || !create.title || !create.slug}>
          <Plus className="h-4 w-4" />
          {tr('إنشاء المسودة')}{' '}
        </PrimaryButton>
      </form>
    </Panel>
  );
}
