import { describe, expect, it } from 'vitest';
import {
  StudentToolExecutionType,
  StudentToolImplementationPriority,
  StudentToolImplementationStatus,
  StudentToolLifecycleStatus,
  StudentToolPublicAccessPolicy,
  StudentToolVisibilityStatus,
  type StudentToolDefinition,
} from '../../src/student-tools';

const activeTool = (): StudentToolDefinition => ({
  toolKey: 'test-tool', nameAr: 'اختبار', nameEn: 'Test', descriptionAr: 'اختبار', descriptionEn: 'Test',
  category: 'TEST', executionType: StudentToolExecutionType.DETERMINISTIC,
  implementationPriority: StudentToolImplementationPriority.P1_CORE_LAUNCH,
  desiredLaunchVisibility: StudentToolVisibilityStatus.ACTIVE,
  visibility: StudentToolVisibilityStatus.ACTIVE,
  implementationStatus: StudentToolImplementationStatus.IMPLEMENTED,
  lifecycle: StudentToolLifecycleStatus.ACTIVE,
  availability: { publicEnabled: true, anonymousEnabled: true, authenticatedEnabled: true, adminOnly: false, allowedLocales: ['ar'], allowedRegions: [], maintenanceMode: false },
  featureFlags: { globallyEnabled: true, anonymousEnabled: true, authenticatedEnabled: true, maintenanceMode: false },
  rateLimitPolicy: { anonymousRequestsPerMinute: 5, authenticatedRequestsPerMinute: 10, adminTestRequestsPerMinute: 5 },
  outputType: 'STRUCTURED_RESULT', supportedLocales: ['ar'], estimatedMinutes: 1, tags: [], dependencies: [],
  currentVersion: { semanticVersion: '1.0.0', inputSchemaVersion: '1', outputSchemaVersion: '1', releaseDate: new Date(), changeNote: 'test', status: 'ACTIVE' },
  inputSchema: { version: '1', fields: [{ key: 'x', type: 'string', required: true, labelAr: 'س', labelEn: 'x' }] },
  outputSchema: { version: '1', fields: [{ key: 'y', type: 'string', required: true, labelAr: 'ص', labelEn: 'y' }] },
  owner: 'test', launchOrder: 1,
});

describe('StudentToolPublicAccessPolicy', () => {
  it('requires the complete executable public lifecycle', () => {
    expect(StudentToolPublicAccessPolicy.isDiscoverable(activeTool())).toBe(true);
    expect(StudentToolPublicAccessPolicy.isDiscoverable({ ...activeTool(), lifecycle: StudentToolLifecycleStatus.DRAFT })).toBe(false);
    expect(StudentToolPublicAccessPolicy.isDiscoverable({ ...activeTool(), featureFlags: { ...activeTool().featureFlags, maintenanceMode: true } })).toBe(false);
  });
});
