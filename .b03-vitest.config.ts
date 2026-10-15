import { defineConfig } from 'vitest/config';
import base from './.section16-vitest.config';
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    maxWorkers: 1,
    include: [
      'apps/web/tests/remediation/B03*.spec.tsx',
      'apps/web/src/features/students/postLoginIntent.spec.ts',
      'packages/application/tests/courses/CourseProgressUseCases.spec.ts',
      'packages/application/tests/courses/Section12LearningVersions.spec.ts',
    ],
  },
});
