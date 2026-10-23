interface MajorNames {
  nameAr?: string | null;
  nameEn?: string | null;
  localizedNameAr?: string | null;
  localizedNameEn?: string | null;
  displayName?: string | null;
  canonicalName?: string | null;
}

interface TaxonomyName {
  canonicalName?: string;
  localizedNames?: Record<string, unknown> | null;
}
export interface MajorProfileAcademicMetadata {
  id?: string;
  collegeContext?: string | null;
  academicField?: TaxonomyName | null;
  discipline?: TaxonomyName | null;
}
export interface MajorAcademicMetadata {
  profileId?: string;
  facultyName?: string | null;
  collegeOrFaculty?: string | null;
  academicFieldOrDiscipline?: string | null;
  academicField?: TaxonomyName | null;
  discipline?: TaxonomyName | null;
  profiles?: MajorProfileAcademicMetadata[];
}

/** Read the canonical relationships already included in the owner response. */
export function majorAcademicContext(major: MajorAcademicMetadata, profile?: MajorProfileAcademicMetadata | null) {
  const scope = profile ?? major.profiles?.find(item => item.id === major.profileId);
  const node = scope?.discipline || scope?.academicField || major.discipline || major.academicField;
  const arabic = node?.localizedNames?.ar;
  return {
    college: scope?.collegeContext || major.facultyName || major.collegeOrFaculty || undefined,
    field: (typeof arabic === 'string' && arabic.trim()) || node?.canonicalName || major.academicFieldOrDiscipline || undefined,
  };
}

/** Prefer recorded Arabic names; never generate a translation from a category. */
export function majorDisplayNames(major: MajorNames, profile?: MajorNames | null) {
  const candidates = [profile?.displayName, major.displayName, major.canonicalName];
  const arabic = profile?.localizedNameAr?.trim() || major.nameAr?.trim() || major.localizedNameAr?.trim()
    || candidates.find(value => value && /[\u0600-\u06ff]/.test(value))?.trim();
  const english = profile?.localizedNameEn?.trim() || major.nameEn?.trim() || major.localizedNameEn?.trim()
    || [major.canonicalName, ...candidates].find(value => value && /[a-z]/i.test(value) && !/[\u0600-\u06ff]/.test(value))?.trim();
  const primary = arabic || profile?.displayName || major.displayName || major.canonicalName || 'تخصص غير مسمى';
  return { primary, secondary: english && english !== primary ? english : undefined, arabic, english };
}
