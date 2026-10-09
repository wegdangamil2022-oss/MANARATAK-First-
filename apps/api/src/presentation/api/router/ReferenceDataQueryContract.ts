import { z } from 'zod';

// Only the existing reference filters and explicit bounded pagination are accepted.
// No catchall/passthrough: misspelled or unsupported query keys remain HTTP 400.
export const referenceDataQueryShape = {
  region: z.string().optional(),
  countryIso2Code: z.string().regex(/^[A-Z]{2}$/).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).max(1_000_000).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
};

export const adminReferenceDataQuerySchema = z.object({
  ...referenceDataQueryShape,
  activeOnly: z.preprocess((value) => {
    if (value === undefined || typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (['true', '1'].includes(value.trim().toLowerCase())) return true;
      if (['false', '0'].includes(value.trim().toLowerCase())) return false;
    }
    return value;
  }, z.boolean().optional()),
  nonActiveOnly: z.preprocess((value) => {
      if (value === undefined || typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        if (['true', '1'].includes(value.trim().toLowerCase())) return true;
        if (['false', '0'].includes(value.trim().toLowerCase())) return false;
      }
      return value;
    }, z.boolean().optional()),
  
}).strict();

// Canonical region IDs are supported only by city collections, not every reference query.
export const cityReferenceDataQueryShape = {
  ...referenceDataQueryShape,
  administrativeRegionId: z.string().uuid().optional(),
};
export const adminCityReferenceDataQuerySchema = adminReferenceDataQuerySchema.extend({
  administrativeRegionId: cityReferenceDataQueryShape.administrativeRegionId,
}).strict();
