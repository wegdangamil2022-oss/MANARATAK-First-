import { SourceAccessClassification } from '../enums/SourceAccessClassification';
import { SourceConnectorCategory } from '../enums/SourceConnectorCategory';
import { SourceStatus } from '../enums/SourceStatus';
import type { ImportSourceDefinition } from './ImportSourceDefinition';

/**
 * Phase-06 executable source-access boundary.
 *
 * A source registry entry is descriptive metadata, not proof of a provider's
 * robots grant, credential capability, or active data agreement. In particular,
 * an untrusted metadata JSON field must never enable those classifications.
 *
 * Until server-validated compliance/capability gateways are integrated, only
 * PUBLIC_ALLOWED network sources and explicitly MANUAL_ONLY/PUBLIC_ALLOWED
 * manual uploads can acquire bytes. All other classifications fail closed.
 */
export class SourceAccessExecutionPolicy {
  static assertAllowed(
    source: ImportSourceDefinition,
    connectorCategory: SourceConnectorCategory,
  ): void {
    this.assertActive(source);
    if (connectorCategory === SourceConnectorCategory.MANUAL_UPLOAD) {
      if (source.category !== SourceConnectorCategory.MANUAL_UPLOAD)
        throw new Error('SOURCE_MANUAL_CONNECTOR_CATEGORY_MISMATCH');
      if (source.accessClassification === SourceAccessClassification.PUBLIC_ALLOWED ||
          source.accessClassification === SourceAccessClassification.MANUAL_ONLY) return;
      this.rejectRestricted(source.accessClassification);
    }
    this.assertNetworkAllowed(source);
  }

  static assertNetworkAllowed(source: ImportSourceDefinition): void {
    this.assertActive(source);
    if (source.category === SourceConnectorCategory.MANUAL_UPLOAD)
      throw new Error('SOURCE_MANUAL_CONNECTOR_NETWORK_FORBIDDEN');
    if (source.accessClassification === SourceAccessClassification.PUBLIC_ALLOWED) return;
    this.rejectRestricted(source.accessClassification);
  }

  private static assertActive(source: ImportSourceDefinition): void {
    if (source.status !== SourceStatus.ACTIVE) throw new Error('SOURCE_NOT_ACTIVE');
  }

  private static rejectRestricted(classification: SourceAccessClassification): never {
    switch (classification) {
      case SourceAccessClassification.BLOCKED:
        throw new Error('SOURCE_ACCESS_BLOCKED');
      case SourceAccessClassification.MANUAL_ONLY:
        throw new Error('SOURCE_MANUAL_ONLY_NETWORK_FORBIDDEN');
      case SourceAccessClassification.PUBLIC_ROBOTS_RESTRICTED:
        throw new Error('SOURCE_ROBOTS_POLICY_DECISION_REQUIRED');
      case SourceAccessClassification.AUTHORIZED_ACCOUNT:
        throw new Error('SOURCE_AUTHORIZED_ACCOUNT_CAPABILITY_REQUIRED');
      case SourceAccessClassification.DATA_AGREEMENT:
        throw new Error('SOURCE_DATA_AGREEMENT_APPROVAL_REQUIRED');
      default:
        throw new Error('SOURCE_ACCESS_CLASSIFICATION_UNRECOGNIZED');
    }
  }
}
