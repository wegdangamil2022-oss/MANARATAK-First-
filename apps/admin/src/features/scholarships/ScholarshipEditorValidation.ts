import type { ScholarshipCatalogUpdate } from '../../api/scholarshipCatalog';
import { scholarshipHttpUrl } from './ScholarshipPresentation';
import { scholarshipCriterionSections } from './ScholarshipCriteria';

export function scholarshipEditorValidation(
  input: ScholarshipCatalogUpdate,
  ar: boolean,
): string | null {
  const fail = (arabic: string, english: string) => (ar ? arabic : english);
  if (!input.displayName?.trim())
    return fail('اكتب اسم المنحة قبل الحفظ.', 'Enter the scholarship name before saving.');
  if (
    input.benefits?.some((item) => item.valueText === '') ||
    input.eligibilityItems?.some((item) =>
      scholarshipCriterionSections(item).some((section) =>
        section.parts.some((part) => !part.text.trim()),
      ),
    ) ||
    input.requiredDocumentItems?.some((item) => !item.displayName.trim())
  )
    return fail(
      'أكمل نص المربعات الجديدة أو احذف المربع الفارغ قبل الحفظ.',
      'Complete the new card text or remove the empty card before saving.',
    );
  const presentation = input.metadata?.adminPresentation as
    | {
        fundingGroups?: Array<{ title?: string }>;
        sourceGroups?: Array<{
          title?: string;
          links?: Array<{ title?: string; url?: string; field?: string }>;
        }>;
      }
    | undefined;
  if (
    presentation?.fundingGroups &&
    (!Array.isArray(presentation.fundingGroups) ||
      presentation.fundingGroups.some(
        (group) => typeof group?.title !== 'string' || !group.title.trim(),
      ))
  )
    return fail(
      'سمِّ كل مجموعة تمويل أو احذف المجموعة الفارغة.',
      'Name each funding group or remove the empty group.',
    );
  if (presentation?.sourceGroups && !Array.isArray(presentation.sourceGroups))
    return fail('أعد ترتيب أقسام الروابط قبل الحفظ.', 'Review the link sections before saving.');
  for (const group of presentation?.sourceGroups ?? []) {
    if (typeof group?.title !== 'string' || !group.title.trim())
      return fail(
        'اكتب عنوان كل قسم روابط أو احذف القسم الفارغ.',
        'Name each link section or remove the empty section.',
      );
    if (group.links && !Array.isArray(group.links))
      return fail('أعد ترتيب الروابط قبل الحفظ.', 'Review the links before saving.');
    for (const link of group.links ?? []) {
      if (!link) return fail('أكمل الروابط قبل الحفظ.', 'Complete the links before saving.');
      const url = link.field ? input[link.field as keyof ScholarshipCatalogUpdate] : link.url;
      if (typeof link.title !== 'string' || !link.title.trim() || !scholarshipHttpUrl(url))
        return fail(
          'أكمل عنوان الرابط وعنوانه الصحيح http أو https، أو احذف المربع الفارغ.',
          'Complete the link title and a valid HTTP(S) URL, or remove the empty card.',
        );
    }
  }
  return null;
}
