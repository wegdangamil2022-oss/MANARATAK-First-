import { z } from 'zod';
import { CourseAccessType, CourseOriginType } from '@manaratak/domain';
export const courseMetadataUpdateSchema = z
  .object({
    withdrawalAccessPolicy: z.enum(['REVOKE', 'HONOR_ENROLLED_VERSION']).nullable().optional(),
    displayName: z.string().optional(),
    accessType: z.nativeEnum(CourseAccessType).optional(),
    originType: z.nativeEnum(CourseOriginType).optional(),
    directCourseUrl: z
      .string()
      .refine(
        (value) => value.startsWith('/') || z.string().url().safeParse(value).success,
        'Must be an internal path or absolute URL',
      )
      .optional(),
    platformName: z.string().nullable().optional(),
    providerName: z.string().nullable().optional(),
    learningLanguage: z.string().nullable().optional(),
    studyDuration: z.string().nullable().optional(),
    certificateAvailable: z.boolean().nullable().optional(),
    category: z.string().nullable().optional(),
    difficultyLevel: z.string().nullable().optional(),
    sourceUrl: z
      .union([z.string().url(), z.literal('')])
      .nullable()
      .optional(),
    officialSourceUrl: z
      .union([z.string().url(), z.literal('')])
      .nullable()
      .optional(),
    thumbnailAssetId: z
      .string()
      .refine((value) => !/^https?:\/\//i.test(value), 'thumbnailAssetId must be an EAP handle')
      .nullable()
      .optional(),
    courseContent: z.string().optional(),
    description: z.string().optional(),
    instructor: z.string().optional(),
    prerequisites: z.array(z.string()).optional(),
    targetAudience: z.array(z.string()).optional(),
    learningOutcomes: z.array(z.string()).optional(),
    promotionalVideoAssetId: z
      .string()
      .refine(
        (value) => !/^https?:\/\//i.test(value),
        'promotionalVideoAssetId must be an EAP handle',
      )
      .optional(),
    completionCriteria: z.record(z.string(), z.unknown()).optional(),
    relatedMajorsOrFields: z.union([z.string(), z.array(z.string())]).optional(),
    acquiredSkills: z.array(z.string()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
