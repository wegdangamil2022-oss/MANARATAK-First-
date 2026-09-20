import { z } from 'zod';
import { CourseAccessType } from '../enums/CourseAccessType';
import { CourseOriginType } from '../enums/CourseOriginType';

const nonEmptyString = z.string().trim().min(1);
const optionalUrl = z.union([z.string().url(), z.literal('')]).optional();
const stringOrStringArray = z.union([nonEmptyString, z.array(nonEmptyString)]);

export const CourseImportPayloadSchema = z.object({
  courseName: nonEmptyString,
  accessType: z.nativeEnum(CourseAccessType),
  directCourseUrl: z.string().url(),

  originType: z.nativeEnum(CourseOriginType).optional().default(CourseOriginType.EXTERNAL_LINKED_COURSE),
  platformName: z.string().trim().optional(),
  providerName: z.string().trim().optional(),
  courseContent: z.string().trim().optional(),
  learningLanguage: z.string().trim().optional(),
  studyDuration: z.string().trim().optional(),
  certificateAvailable: z.boolean().optional(),
  category: z.string().trim().optional(),
  relatedMajorsOrFields: stringOrStringArray.optional(),
  acquiredSkills: z.array(nonEmptyString).optional(),
  difficultyLevel: z.string().trim().optional(),
  sourceUrl: optionalUrl,
  officialSourceUrl: optionalUrl,
  thumbnailAssetId: z.string().trim().optional(),
  localizedNames: z.record(z.string(), z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CourseImportPayload = z.infer<typeof CourseImportPayloadSchema>;
