export async function resolve(specifier, context, nextResolve) {
  const resolved = await nextResolve(specifier, context);
  const url = resolved.url.replaceAll('\\', '/');
  if (/@prisma|\.prisma\/|\/apps\/api\/|\/packages\/(infrastructure|application|config|core)\/(src|dist)\/|\/node_modules\/(redis|awilix|bullmq)\//.test(url)) {
    throw new Error('AI_STUDIO_BACKEND_MODULE_FORBIDDEN');
  }
  return resolved;
}
