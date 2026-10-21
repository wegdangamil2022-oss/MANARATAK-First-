import { test } from 'node:test';
import assert from 'node:assert/strict';
import { R14_ADMIN_CMS_APPLICATION_TABLES } from '../../scripts/database/post28-transaction-provisioning.mjs';

test('R14 optional grants enable MFA and editorial writes without adding financial or schema owners', () => {
  assert.deepEqual([...R14_ADMIN_CMS_APPLICATION_TABLES].sort(), ['CredentialRecord', 'CmsCategory', 'CmsLocalizedContent', 'CmsContentTag', 'CmsContentAttachment', 'CmsWorkflowReview', 'CmsContentRevision', 'CmsEditorialLedger', 'CmsRedirect', 'CmsScheduledJob'].sort());
  assert.equal(Object.isFrozen(R14_ADMIN_CMS_APPLICATION_TABLES), true);
  assert.equal(R14_ADMIN_CMS_APPLICATION_TABLES.some(name => /Finance|Financial|Consent|Binding|Certificate|_prisma/.test(name)), false);
});
