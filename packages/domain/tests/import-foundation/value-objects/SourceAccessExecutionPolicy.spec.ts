import { describe, expect, it } from 'vitest';
import {
  ImportSourceDefinition, SourceAccessExecutionPolicy,
  SourceAccessClassification, SourceConnectorCategory, SourceStatus,
} from '../../../src';

function source(
  classification: SourceAccessClassification,
  category: SourceConnectorCategory = SourceConnectorCategory.OFFICIAL_API,
  metadata: Record<string, unknown> = {},
) {
  return new ImportSourceDefinition({
    sourceId: 'policy-source', displayName: 'Policy source',
    baseUrl: 'https://example.com/feed', category,
    accessClassification: classification,
    status: classification === SourceAccessClassification.BLOCKED ? SourceStatus.BLOCKED : SourceStatus.ACTIVE,
    connectorId: category === SourceConnectorCategory.MANUAL_UPLOAD ? 'manual-upload' : 'official-api',
    connectorVersion: '2.0.0', metadata,
  });
}

describe('Import source execution access classification', () => {
  it('allows public network fetch and public/manual-only manual uploads', () => {
    expect(() => SourceAccessExecutionPolicy.assertNetworkAllowed(source(SourceAccessClassification.PUBLIC_ALLOWED))).not.toThrow();
    expect(() => SourceAccessExecutionPolicy.assertAllowed(
      source(SourceAccessClassification.PUBLIC_ALLOWED, SourceConnectorCategory.MANUAL_UPLOAD),
      SourceConnectorCategory.MANUAL_UPLOAD,
    )).not.toThrow();
    expect(() => SourceAccessExecutionPolicy.assertAllowed(
      source(SourceAccessClassification.MANUAL_ONLY, SourceConnectorCategory.MANUAL_UPLOAD),
      SourceConnectorCategory.MANUAL_UPLOAD,
    )).not.toThrow();
  });

  it.each([
    [SourceAccessClassification.MANUAL_ONLY, 'SOURCE_MANUAL_ONLY_NETWORK_FORBIDDEN'],
    [SourceAccessClassification.PUBLIC_ROBOTS_RESTRICTED, 'SOURCE_ROBOTS_POLICY_DECISION_REQUIRED'],
    [SourceAccessClassification.AUTHORIZED_ACCOUNT, 'SOURCE_AUTHORIZED_ACCOUNT_CAPABILITY_REQUIRED'],
    [SourceAccessClassification.DATA_AGREEMENT, 'SOURCE_DATA_AGREEMENT_APPROVAL_REQUIRED'],
  ])('blocks %s network access without authoritative runtime evidence', (classification, error) => {
    const configured = source(classification, SourceConnectorCategory.OFFICIAL_API,
      { approved: true, authorized: true, credentials: 'value', robotsPolicyApproved: true,
        compliance: { decision: 'allow' } });
    expect(() => SourceAccessExecutionPolicy.assertNetworkAllowed(configured)).toThrow(error);
    expect(() => SourceAccessExecutionPolicy.assertAllowed(
      configured, SourceConnectorCategory.OFFICIAL_API,
    )).toThrow(error);
  });

  it('blocks a nonmanual connector configured with MANUAL_ONLY and a manual connector configured with restricted access', () => {
    expect(() => SourceAccessExecutionPolicy.assertAllowed(
      source(SourceAccessClassification.MANUAL_ONLY),
      SourceConnectorCategory.OFFICIAL_API,
    )).toThrow('SOURCE_MANUAL_ONLY_NETWORK_FORBIDDEN');
    expect(() => SourceAccessExecutionPolicy.assertAllowed(
      source(SourceAccessClassification.DATA_AGREEMENT, SourceConnectorCategory.MANUAL_UPLOAD),
      SourceConnectorCategory.MANUAL_UPLOAD,
    )).toThrow('SOURCE_DATA_AGREEMENT_APPROVAL_REQUIRED');
  });

  it('rejects direct network access from a manual-upload source and inactive sources', () => {
    expect(() => SourceAccessExecutionPolicy.assertNetworkAllowed(
      source(SourceAccessClassification.MANUAL_ONLY, SourceConnectorCategory.MANUAL_UPLOAD),
    )).toThrow('SOURCE_MANUAL_CONNECTOR_NETWORK_FORBIDDEN');
    const inactive = new ImportSourceDefinition({
      ...source(SourceAccessClassification.PUBLIC_ALLOWED), status: SourceStatus.DISABLED,
    });
    expect(() => SourceAccessExecutionPolicy.assertNetworkAllowed(inactive)).toThrow('SOURCE_NOT_ACTIVE');
  });

  it('fails closed for unrecognized future source access classifications', () => {
    const configured = source(SourceAccessClassification.PUBLIC_ALLOWED);
    const forged = { ...configured, accessClassification: 'OPEN_ALL_NETWORKS' } as ImportSourceDefinition;
    expect(() => SourceAccessExecutionPolicy.assertNetworkAllowed(forged)).toThrow('SOURCE_ACCESS_CLASSIFICATION_UNRECOGNIZED');
  });
});
