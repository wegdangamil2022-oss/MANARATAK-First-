import { z } from 'zod';
import { ValidationException } from '@manaratak/core';
import { IdentityType, LifeStatus, RetentionCategory, SecurityClassification } from '@manaratak/domain';

const shortId = z.string().trim().min(1).max(200);
const label = z.string().trim().min(1).max(240);
const freeText = z.string().max(10_000);
const boundedRecord = z.record(z.string().max(120), z.unknown()).refine(
  value => JSON.stringify(value).length <= 100_000,
  'Object payload exceeds the 100KB validation limit',
);
const stringArray = z.array(z.string().max(500)).max(200);
const boundedUnknown = z.unknown().superRefine((value, ctx) => {
  try {
    const serialized = JSON.stringify(value);
    if (serialized && serialized.length > 100_000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Payload exceeds the 100KB validation limit' });
    }
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Payload must be JSON-serializable' });
  }
});

export const emptyBodySchema = z.object({}).strict();
export const referenceParamSchema = z.object({ reference: shortId }).strict();
export const sharedRefParamSchema = z.object({ ref: shortId }).strict();
export const fileIdParamSchema = z.object({ fileId: shortId }).strict();
export const cacheKeyParamSchema = z.object({ scope: shortId, key: shortId }).strict();
export const jobReferenceParamSchema = z.object({ jobReference: shortId }).strict();

export const workflowCreateSchema = z.object({
  reference: shortId,
  ownerReference: shortId,
  definitionName: label,
  states: z.array(z.object({
    name: label,
    isInitial: z.boolean().optional(),
    isTerminal: z.boolean().optional(),
  }).strict()).min(1).max(100),
  transitions: z.array(z.object({
    fromState: label,
    toState: label,
    triggerCondition: freeText,
  }).strict()).max(300),
  version: z.number().int().nonnegative(),
  metadata: boundedRecord,
  executionIntent: freeText,
}).strict();

export const workflowTransitionSchema = z.object({ toState: label }).strict();

const endpointSchema = z.object({ name: label, purpose: freeText }).strict();
const operationSchema = z.object({
  endpointName: label,
  name: label,
  inputType: label,
  outputType: label,
  isIdempotent: z.boolean().optional(),
}).strict();
const versionSchema = z.object({ major: z.number().int().nonnegative(), minor: z.number().int().nonnegative(), patch: z.number().int().nonnegative() }).strict();
const contractMetadataSchema = z.object({ formatType: label, isStreaming: z.boolean().optional(), requestSchemaType: label.optional() }).strict();
const compatibilityMetadataSchema = z.object({ backwardCompatible: z.boolean(), forwardCompatible: z.boolean(), supportStatus: label }).strict();
const exposureIntentSchema = z.object({ exposePublicly: z.boolean(), environmentTarget: label, networkCategory: label }).strict();
const keyValueMetadataSchema = z.array(z.object({ key: label, value: z.string().max(10_000) }).strict()).max(200);

export const apiServiceCreateSchema = z.object({
  reference: shortId,
  ownerReference: shortId,
  endpoints: z.array(endpointSchema).max(200),
  operations: z.array(operationSchema).max(500),
  version: versionSchema,
  contractMetadata: contractMetadataSchema,
  compatibilityMetadata: compatibilityMetadataSchema,
  exposureIntent: exposureIntentSchema,
  metadata: keyValueMetadataSchema,
}).strict();

export const apiServicePublishVersionSchema = apiServiceCreateSchema.omit({ ownerReference: true, reference: true }).strict();
export const apiServiceListQuerySchema = z.object({ ownerReference: shortId.optional(), lifecycleState: label.optional() }).strict();

const propertySchema = z.object({ name: label, type: label, required: z.boolean() }).strict();
const slotSchema = z.object({ name: label, description: freeText }).strict();
const componentVersionSchema = versionSchema;
const renderingIntentSchema = z.object({ visualCategory: label, interactionModel: label }).strict();
export const sharedComponentCreateSchema = z.object({
  reference: shortId,
  ownerReference: shortId,
  properties: z.array(propertySchema).max(300),
  slots: z.array(slotSchema).max(100),
  version: componentVersionSchema,
  renderingIntent: renderingIntentSchema,
  metadata: z.record(z.string().max(120), z.string().max(10_000)).optional(),
}).strict();
export const sharedComponentVersionSchema = z.object({
  reference: shortId,
  properties: z.array(propertySchema).max(300),
  slots: z.array(slotSchema).max(100),
  version: componentVersionSchema,
}).strict();

export const notificationTemplateSchema = z.object({
  id: shortId,
  channels: stringArray,
  requiredVariables: stringArray,
  localizations: stringArray,
}).strict();
export const notificationIntentSchema = z.object({
  id: shortId,
  reference: shortId,
  templateId: shortId,
  recipientReference: shortId,
  variables: z.record(z.string().max(120), z.string().max(10_000)),
  scheduledAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  retryMaxRetries: z.number().int().min(0).max(100).optional(),
  retryBackoffMs: z.number().int().min(0).max(86_400_000).optional(),
}).strict();

export const cacheAllocateSchema = z.object({
  scope: shortId,
  key: shortId,
  payload: z.unknown(),
  ttlSeconds: z.number().int().positive().max(31_536_000),
  absoluteExpirationTime: z.string().datetime().optional(),
  invalidationTokens: stringArray.optional(),
  ownerReference: shortId.optional(),
  policyTags: stringArray.optional(),
}).strict();

export const backgroundJobEnqueueSchema = z.object({
  jobType: shortId,
  parameters: boundedRecord,
  priority: z.number().int().min(0).max(1000).optional(),
  runAt: z.string().datetime().optional(),
  cronExpression: z.string().max(500).optional(),
  timeoutSeconds: z.number().int().positive().max(86_400).optional(),
  concurrentLimits: z.number().int().positive().max(10_000).optional(),
  maxAttempts: z.number().int().positive().max(100).optional(),
  backoffType: label.optional(),
  ownerReference: shortId.optional(),
}).strict();

export const fileUploadLocatorSchema = z.object({ filename: z.string().trim().min(1).max(255) }).strict();
export const fileRegisterSchema = z.object({
  fileId: shortId,
  fileReference: shortId,
  originalFilename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(200),
  fileExtension: z.string().trim().min(1).max(30),
  byteSize: z.number().int().nonnegative().max(10_737_418_240),
  retentionCategory: z.nativeEnum(RetentionCategory),
  expiresAt: z.union([z.string().datetime(), z.date()]).optional(),
  ownerReference: shortId,
  classification: z.nativeEnum(SecurityClassification),
  storageLocator: z.string().trim().min(1).max(2048),
}).strict();
export const fileActivateSchema = z.object({
  checksumAlgorithm: z.string().trim().min(1).max(80),
  checksumHash: z.string().trim().min(1).max(512),
}).strict();


// Authorization / IAM edge contracts.
export const authorizationRoleCreateSchema = z.object({
  id: shortId,
  name: label,
  description: z.string().trim().min(1).max(2000),
  permissions: z.array(shortId).max(500),
  policyIds: z.array(shortId).max(500),
}).strict();
export const authorizationRoleAssignmentSchema = z.object({
  id: shortId,
  identityId: shortId,
  roleId: shortId,
}).strict();
export const authorizationEvaluateSchema = z.object({
  identityId: shortId,
  resourceUrn: z.string().trim().min(1).max(1000),
  action: shortId,
  contextAttributes: boundedRecord.optional(),
}).strict();

// Enterprise event control-plane edge contracts.
export const enterpriseEventRegisterSchema = z.object({
  reference: shortId,
  ownerReference: shortId,
  type: label,
  category: label,
  payloadMetadata: boundedRecord,
  version: z.string().trim().min(1).max(120),
  metadata: boundedRecord.optional(),
  correlationReference: shortId.optional(),
  causationReference: shortId.optional(),
}).strict();
export const enterpriseEventPublishSchema = z.object({ reference: shortId }).strict();

// Identity control-plane edge contracts. Resource identity always comes from the path,
// never from a mutable JSON body.
export const identityIdParamSchema = z.object({ id: shortId }).strict();
export const identityProvisionSchema = z.object({
  type: z.nativeEnum(IdentityType),
  displayName: z.string().trim().min(1).max(240).optional(),
  avatarUrl: z.string().trim().max(2048).optional(),
  preferredLanguage: z.string().trim().min(2).max(35).optional(),
  timeZone: z.string().trim().min(1).max(120).optional(),
  primaryEmail: z.string().trim().email().max(320).optional(),
  primaryPhone: z.string().trim().min(3).max(40).optional(),
}).strict();
export const identityLifecycleReasonSchema = z.object({
  reason: z.string().trim().min(3).max(2000),
}).strict();
export const identityProfileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(240),
  avatarUrl: z.string().trim().max(2048),
  preferredLanguage: z.string().trim().min(2).max(35),
  timeZone: z.string().trim().min(1).max(120),
}).strict();
export const identityContactUpdateSchema = z.object({
  email: z.string().trim().email().max(320).optional(),
  phone: z.string().trim().min(3).max(40).optional(),
  verifyEmail: z.boolean().optional(),
  verifyPhone: z.boolean().optional(),
}).strict().refine(value => Object.keys(value).length > 0, 'At least one contact update is required');
export const identityListQuerySchema = z.object({
  type: z.nativeEnum(IdentityType).optional(),
  status: z.nativeEnum(LifeStatus).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
}).strict();

export const toolKeyParamSchema = z.object({
  toolKey: z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9._-]+$/),
}).strict();

export const studentToolAdminListQuerySchema = z.object({
  category: label.optional(),
  visibility: z.enum(['ACTIVE', 'COMING_SOON', 'UNDER_DEVELOPMENT', 'HIDDEN_ADMIN_ONLY', 'DISABLED', 'RETIRED']).optional(),
  implementationStatus: z.enum(['PLANNED', 'IN_DEVELOPMENT', 'IMPLEMENTED', 'RUNTIME_BLOCKED']).optional(),
  lifecycle: z.enum(['DRAFT', 'TESTING', 'ACTIVE', 'DEPRECATED', 'RETIRED']).optional(),
  executionType: label.optional(),
  search: z.string().trim().max(240).optional(),
}).strict();

export const studentToolMetadataPatchSchema = z.object({
  nameAr: label.optional(),
  nameEn: label.optional(),
  descriptionAr: freeText.optional(),
  descriptionEn: freeText.optional(),
  category: label.optional(),
  implementationPriority: label.optional(),
  desiredLaunchVisibility: label.optional(),
  visibility: z.enum(['ACTIVE', 'COMING_SOON', 'UNDER_DEVELOPMENT', 'HIDDEN_ADMIN_ONLY', 'DISABLED', 'RETIRED']).optional(),
  implementationStatus: z.enum(['PLANNED', 'IN_DEVELOPMENT', 'IMPLEMENTED', 'RUNTIME_BLOCKED']).optional(),
  estimatedMinutes: z.number().int().min(0).max(100_000).optional(),
  tags: z.array(z.string().trim().min(1).max(120)).max(100).optional(),
  iconAssetId: z.union([shortId, z.null()]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one metadata field is required');

export const studentToolAvailabilitySchema = z.object({
  publicEnabled: z.boolean(),
  anonymousEnabled: z.boolean(),
  authenticatedEnabled: z.boolean(),
  adminOnly: z.boolean(),
  allowedLocales: z.array(z.string().trim().min(2).max(35)).max(50),
  allowedRegions: z.array(z.string().trim().min(2).max(80)).max(250),
  maintenanceMode: z.boolean(),
  semanticVersion: z.string().trim().regex(/^\d+\.\d+\.\d+$/),
  changeNote: z.string().trim().min(3).max(2000),
}).strict().superRefine((value, ctx) => {
  if (value.adminOnly && value.publicEnabled) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Admin-only tools cannot be publicly enabled' });
  }
  if (value.anonymousEnabled && !value.publicEnabled) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Anonymous access requires public access' });
  }
});

export const studentToolFlagsSchema = z.object({
  globallyEnabled: z.boolean(),
  anonymousEnabled: z.boolean(),
  authenticatedEnabled: z.boolean(),
  maintenanceMode: z.boolean(),
}).strict();

export const studentToolLifecycleParamSchema = z.object({
  toolKey: z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9._-]+$/),
  action: z.enum(['activate', 'testing', 'deprecate', 'retire']),
}).strict();

export const studentToolAdminTestSchema = z.object({
  input: boundedRecord,
  locale: z.enum(['ar', 'en']).default('ar'),
}).strict();

export function parseStrict<T>(schema: z.ZodType<T>, payload: unknown): T {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationException(
        'Transport validation failed',
        error.issues.map(issue => ({
          field: issue.path.join('.') || '$',
          message: issue.message,
        })),
      );
    }
    throw error;
  }
}
