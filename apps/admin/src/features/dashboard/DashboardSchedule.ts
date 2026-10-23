/** Visible counters first; publication breakdowns are read when their section opens. */
export const dashboardInitialKeys = new Set([
  'health', 'universities:total', 'scholarships:total', 'majors:total',
  'courses:total', 'tests:total', 'careers:total', 'cms:total', 'identities',
  'imports', 'scholarships:quality',
]);
