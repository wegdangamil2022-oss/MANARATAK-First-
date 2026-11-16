import {describe,expect,it} from 'vitest';import {courseMetadataUpdateSchema} from '../../../../src/presentation/api/router/CourseMetadataUpdateContract';
describe('Section 13: explicit course metadata write contract',()=>{
 it('accepts explicit reviewed withdrawal entitlement as a first-class write field',()=>{expect(courseMetadataUpdateSchema.parse({withdrawalAccessPolicy:'HONOR_ENROLLED_VERSION'}).withdrawalAccessPolicy).toBe('HONOR_ENROLLED_VERSION');});
 it('rejects invented entitlement modes instead of silently ignoring them',()=>{expect(courseMetadataUpdateSchema.safeParse({withdrawalAccessPolicy:'KEEP_ALL_FOREVER'}).success).toBe(false);});
 it('rejects opaque fields that previously silently lost edited policy values',()=>{expect(courseMetadataUpdateSchema.safeParse({optionalFields:{withdrawalAccessPolicy:'REVOKE'}}).success).toBe(false);});
 it('allows explicit unconfigured policy without inventing a default',()=>{expect(courseMetadataUpdateSchema.parse({withdrawalAccessPolicy:null}).withdrawalAccessPolicy).toBeNull();});
});
