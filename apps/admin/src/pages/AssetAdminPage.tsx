import { useSearchParams } from 'react-router-dom';
import { FolderGit2, Library, UploadCloud, Link2, Copyright, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../i18n/I18nProvider';
import {
  OperationsHeading,
  OperationsNavigation,
} from '../features/operations/OperationsWorkspace';
import { AssetLibraryWorkspace } from './assets/AssetLibraryWorkspace';
import { AssetSecurityWorkspace } from './assets/AssetSecurityWorkspace';
export function AssetAdminPage() {
  const { language, dir } = useTranslation(),
    [params] = useSearchParams(),
    c = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const entries = [
    {
      id: 'library' as const,
      label: c('مكتبة الملفات', 'File library'),
      description: c('بحث وتصفية وتفاصيل', 'Search, filters and details'),
      icon: Library,
    },
    {
      id: 'processing' as const,
      label: c('الرفع والمعالجة', 'Upload and processing'),
      description: c('الحجر ومراحل الفحص', 'Quarantine and security stages'),
      icon: UploadCloud,
    },
    {
      id: 'relationships' as const,
      label: c('الارتباطات والاستخدام', 'Relationships and usage'),
      description: c('مراجع الأقسام وأثر التغيير', 'Owner references and impact'),
      icon: Link2,
    },
    {
      id: 'rights' as const,
      label: c('الحقوق والنسخ المشتقة', 'Rights and renditions'),
      description: c('المصدر والإتاحة وإثبات النسخ', 'Attribution, delivery and evidence'),
      icon: Copyright,
    },
    {
      id: 'security' as const,
      label: c('الأمان والتخزين', 'Security and storage'),
      description: c('المزود والأدلة والاسترداد', 'Provider, evidence and recovery'),
      icon: ShieldCheck,
    },
  ];
  const active = entries.find((e) => e.id === params.get('tab'))?.id ?? 'library';
  return (
    <div className="operations-workspace" dir={dir}>
      <OperationsHeading
        title={c('الأصول والملفات', 'Assets and files')}
        description={c(
          'ملفات الأقسام المشتركة، مع حماية ملفات الطلاب الخاصة والحفاظ على ارتباطات المحتوى.',
          'Shared owner assets with private student files isolated and content references preserved.',
        )}
        icon={FolderGit2}
      />
      <OperationsNavigation
        label={c('مساحات الملفات', 'Asset workspaces')}
        active={active}
        items={entries.map((item) => ({
          ...item,
          to: '/assets?' + new URLSearchParams({ tab: item.id }),
        }))}
      />
      {active === 'security' && <AssetSecurityWorkspace />}
      <p className="operations-notice">
        {active === 'relationships'
          ? c(
              'افحص الاستخدام من سجل الملف. عدم توفر الفحص يعني حالة مجهولة ويمنع الحذف؛ تغيير مرجع الصورة يتم من القسم المالك.',
              'Inspect usage per asset. An unavailable check means unknown usage and blocks deletion; replace references from the owner section.',
            )
          : active === 'rights'
            ? c(
                'اختر ملفًا لعرض حقوقه ونسخه. لا يمكن إعلان نسخة جاهزة دون إثبات مصدرها وفحصها.',
                'Choose an asset for rights and renditions. Ready renditions require source and security evidence.',
              )
            : active === 'processing'
              ? c(
                  'الرفع ثم التثبيت والفحص والتنقية ثم التفعيل مراحل مستقلة. غياب المزود يوقف المرحلة ولا يعني نجاحها.',
                  'Upload, finalization, scanning, sanitization and activation are separate stages; missing providers block the corresponding stage.',
                )
              : c(
                  'المكتبة تعرض الملفات المشتركة العامة والداخلية فقط؛ ملفات الطلاب والمرفقات الخاصة تُدار من أقسامها.',
                  'The library contains shared public and internal assets only. Private student files remain in their owner workflows.',
                )}
      </p>
      <AssetLibraryWorkspace key={active} view={active} />
    </div>
  );
}
