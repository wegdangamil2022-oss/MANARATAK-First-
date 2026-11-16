import {expect,it} from 'vitest';
import {courseAdminErrorResponse} from '../../../../src/presentation/api/router/CourseAdminErrorPolicy';
it.each([
 ['Course with id private-id not found',404,'COURSE_NOT_FOUND'],
 ['LEARNING_PATH_NOT_FOUND',404,'LEARNING_PATH_NOT_FOUND'],
 ['COURSE_PUBLISHED_STRUCTURE_IMMUTABLE_UNPUBLISH_FIRST',409,'COURSE_PUBLISHED_STRUCTURE_IMMUTABLE_UNPUBLISH_FIRST'],
 ['COURSE_VERSION_PRECONDITION_REQUIRED',428,'COURSE_VERSION_PRECONDITION_REQUIRED'],
 ['COURSE_ATOMIC_TRANSACTION_CONTEXT_REQUIRED',503,'COURSE_ATOMIC_TRANSACTION_CONTEXT_REQUIRED'],
 ['SQL connection password=secret',500,'COURSE_OPERATION_FAILED'],
])('maps %s to safe owner response', (message,status,error)=>expect(courseAdminErrorResponse(new Error(message))).toEqual({status,error}));
