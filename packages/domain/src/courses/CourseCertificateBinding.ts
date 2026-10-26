export interface CourseCertificateBinding {
  templateId: string;
  templateVersionId: string;
  issuerId: string;
}
export function normalizeCourseCertificateBinding(value: unknown): CourseCertificateBinding {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('COURSE_CERTIFICATE_BINDING_INVALID');
  const row = value as Record<string, unknown>;
  if (
    Object.keys(row).length !== 3 ||
    ['templateId', 'templateVersionId', 'issuerId'].some(
      (key) =>
        typeof row[key] !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          row[key] as string,
        ),
    )
  )
    throw Error('COURSE_CERTIFICATE_BINDING_INVALID');
  return {
    templateId: row.templateId as string,
    templateVersionId: row.templateVersionId as string,
    issuerId: row.issuerId as string,
  };
}
