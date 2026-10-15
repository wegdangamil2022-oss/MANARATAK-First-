import type { PublicScholarshipReferenceState } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
export function OwnerReferenceNotice({
  reference,
}: {
  reference: PublicScholarshipReferenceState | undefined;
}) {
  const { language } = useTranslation(),
    en = language === 'en';
  if (!reference) return null;
  const replacement = reference.replacement,
    slug = replacement?.slug?.trim(),
    safe = slug && slug.length <= 240 && !/[\\/\u0000-\u001f?#]/.test(slug);
  return (
    <p role="status">
      {reference.state === 'MERGED'
        ? en
          ? 'The owner retired this record in favor of a reviewed replacement. Your saved history and application cycle stay separate.'
          : 'تقاعد المالك بهذا السجل لصالح بديل مراجع. يبقى تاريخك ودورة تقديمك منفصلين.'
        : reference.state === 'TOMBSTONE'
          ? en
            ? 'The owner retired this record; your private history is preserved.'
            : 'تقاعد المالك بهذا السجل؛ تاريخك الخاص محفوظ.'
          : en
            ? 'The same owner identity was restored for review; publication is checked separately.'
            : 'استُعيدت هوية المالك نفسها للمراجعة؛ إتاحتها العامة تُفحص مستقلة.'}
      {safe && (
        <a href={`/${en ? 'en' : 'ar'}/scholarships/${encodeURIComponent(slug)}`}>
          {' '}
          {en ? 'View the published replacement' : 'عرض البديل المنشور'}: {replacement?.displayName}
        </a>
      )}
    </p>
  );
}
