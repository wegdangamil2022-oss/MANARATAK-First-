import type { Request } from 'express';

/** Use Express's matched declaration, preserving case-sensitive parameter values.
 * Never classify a capability using the spelling of static segments in req.path. */
export function matchedCapabilityPath(req: Request): string {
  const path: unknown = req.route?.path;
  if (typeof path !== 'string') throw new Error('MATCHED_CAPABILITY_ROUTE_REQUIRED');
  return path.replace(/:([A-Za-z0-9_]+)/g, (_match, name: string) =>
    encodeURIComponent(String(req.params[name])),
  );
}
