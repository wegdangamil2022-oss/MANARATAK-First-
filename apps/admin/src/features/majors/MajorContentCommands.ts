import { selectMajorWorkingVersion, type MajorContentSectionEdit } from '@manaratak/domain';
import { adminApiClient } from '../../api/client';
export { selectMajorWorkingVersion };

export async function saveMajorContent(input: {
  majorId: string;
  profileId: string;
  versionId: string;
  revision: number;
  reason: string;
  sections: MajorContentSectionEdit[];
}) {
  if (!input.reason.trim()) throw Error('سبب التعديل مطلوب قبل الحفظ.');
  if (!Number.isSafeInteger(input.revision))
    throw Error('حدّث هوية التخصص للحصول على رقم مراجعة موثوق.');
  const path = '/admin/majors/' + encodeURIComponent(input.majorId) + '/content-sections';
  const response = await adminApiClient.request<{
    success: boolean;
    profileId: string;
    versionId: string;
  }>(path, {
    method: 'PUT',
    headers: { 'If-Match': `"${input.revision}"` },
    body: JSON.stringify({
      profileId: input.profileId,
      versionId: input.versionId,
      reason: input.reason.trim(),
      sections: input.sections,
    }),
  });
  if (
    !response.success ||
    response.profileId !== input.profileId ||
    response.versionId !== input.versionId
  )
    throw Error('لم يثبت الخادم حفظ المحتوى في الملف والنسخة المحددين. بقيت مسودتك محفوظة.');
  const params = new URLSearchParams({ profileId: input.profileId, versionId: input.versionId });
  const readback = await adminApiClient.request<{
    data: Array<
      MajorContentSectionEdit & {
        profileId?: string;
        versionId?: string;
        metadata?: Record<string, unknown>;
      }
    >;
  }>(path + '?' + params, { cache: 'no-store' });
  for (const expected of input.sections) {
    const actual = readback.data.find(
      (row) =>
        row.sectionKey === expected.sectionKey &&
        (row.locale ?? 'ar') === (expected.locale ?? 'ar'),
    );
    const evidence = actual?.metadata?.authoringEvidence as { sourceUri?: string } | undefined;
    const history = actual?.metadata?.groupAssignmentHistory as
      Array<{ sourceUri?: string }> | undefined;
    const verifiedSource = expected.id ? history?.at(-1)?.sourceUri : evidence?.sourceUri;
    if (
      !actual ||
      actual.profileId !== input.profileId ||
      actual.versionId !== input.versionId ||
      (expected.id && actual.id !== expected.id) ||
      actual.content !== expected.content ||
      actual.title !== (expected.title ?? '') ||
      actual.reviewStatus !== (expected.reviewStatus ?? 'NEEDS_REVIEW') ||
      (expected.groupNumber !== undefined &&
        actual.metadata?.manualGroupNumber !== expected.groupNumber) ||
      (expected.sourceUri !== undefined && verifiedSource !== expected.sourceUri)
    )
      throw Error(
        'تعذر التحقق من مطابقة المحتوى بعد الحفظ. بقيت مسودتك محفوظة؛ راجع النسخة قبل إعادة الإرسال.',
      );
  }
  return readback.data;
}
