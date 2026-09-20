import assert from 'node:assert/strict';
import test from 'node:test';
import {
  apiServiceListQuerySchema,
  backgroundJobEnqueueSchema,
  fileActivateSchema,
  parseStrict,
  studentToolAdminTestSchema,
  studentToolLifecycleParamSchema,
  workflowTransitionSchema,
} from '../../apps/api/src/presentation/validation/StrictControlPlaneSchemas';
import { ValidationException } from '@manaratak/core';

const expectValidation = (fn: () => unknown) => assert.throws(fn, ValidationException);

test('strict schemas reject unknown fields and wrong transport types', () => {
  expectValidation(() => parseStrict(workflowTransitionSchema, { toState: 'APPROVED', actorId: 'client-owned' }));
  expectValidation(() => parseStrict(apiServiceListQuerySchema, { ownerReference: 42 }));
  expectValidation(() => parseStrict(fileActivateSchema, { checksumAlgorithm: 'sha256', checksumHash: 'abc', fileId: 'body-id' }));
  expectValidation(() => parseStrict(studentToolLifecycleParamSchema, { toolKey: 'calculator', action: 'destroy' }));
});

test('bounded nested payloads fail closed', () => {
  expectValidation(() => parseStrict(studentToolAdminTestSchema, { input: { value: 'x'.repeat(100_100) }, locale: 'ar' }));
  expectValidation(() => parseStrict(backgroundJobEnqueueSchema, {
    jobType: 'rebuild-index',
    parameters: { value: 'x'.repeat(100_100) },
  }));
});
