// Diagnostic only: the API's runtime validation remains the authoritative gate.
// No client creation, network access, values or free-form error messages.
if (process.env.VERCEL_ENV === 'preview') {
  const { AppConfigSchema, ProductionReadinessValidator } = await import('../packages/config/dist/index.js');
  const result = AppConfigSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      field: typeof issue.path[0] === 'string' && /^[A-Z][A-Z0-9_]+$/.test(issue.path[0]) ? issue.path[0] : 'CONFIGURATION',
      code: issue.code,
    }));
    console.log('[Preview configuration] ' + JSON.stringify({ valid: false, issues }));
  } else {
    const report = ProductionReadinessValidator.validate(result.data);
    console.log('[Preview configuration] ' + JSON.stringify({ valid: true, ready: report.ready, blockers: report.findings.filter((item) => item.severity === 'BLOCKER').map((item) => item.id) }));
  }
}
