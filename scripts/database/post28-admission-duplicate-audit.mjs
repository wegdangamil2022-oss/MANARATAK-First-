// Read-only query. Call only after the official target identity preflight.
export const ADMISSION_DUPLICATE_AUDIT_SQL = `
SELECT "academicProgramId", "internationalTestId", "testVariantId", "testVersionId",
       count(*)::text AS "count", array_agg(id ORDER BY id) AS ids
FROM "UniversityProgramAdmissionRequirement"
GROUP BY "academicProgramId", "internationalTestId", "testVariantId", "testVersionId"
HAVING count(*) > 1
ORDER BY "academicProgramId", "internationalTestId", "testVariantId", "testVersionId"`;
