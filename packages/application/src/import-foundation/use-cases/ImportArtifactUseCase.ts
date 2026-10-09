import type { ImportGovernanceUseCases } from './ImportGovernanceUseCases';
import type { IVerifiedImportArtifactGateway } from '../contracts/IVerifiedImportArtifactGateway';
import { AssetReferencePolicy } from '../../asset-platform/AssetReferencePolicy';
import { ImportAdminUseCases } from './ImportAdminUseCases';
import { ImportParserRegistry } from '../parsers/ImportParserRegistry';
import { ImportParseError, ParsedImportRow } from '@manaratak/domain';

export interface ImportArtifactInput {
  assetId: string; ownerDomain: string; expectedSha256: string; format: 'csv' | 'ndjson'; mappingProfileId?: string;
}
export class ImportArtifactUseCase {
  constructor(private readonly assets: AssetReferencePolicy, private readonly bytes: IVerifiedImportArtifactGateway,
    private readonly parsers: ImportParserRegistry, private readonly imports: ImportAdminUseCases, private readonly governance?: ImportGovernanceUseCases) {}

  capabilities() {
    return { formats: this.parsers.list().map(parser => parser.format), maxBytes: 64 * 1024 * 1024,
      maxRows: 100_000, chunkSize: 500, maxRowBytes: 1024 * 1024, canonicalMutation: false,
      provenance: 'MANUAL_EAP_UPLOAD', runtimeVerification: 'POST_28_PENDING' };
  }

  async inspect(assetId: string, actorId: string) {
    if (!actorId?.trim()) throw new Error('IMPORT_ACTOR_REQUIRED');
    const asset = await this.assets.assertUsable(assetId, { purpose: 'IMPORT_ARTIFACT', expectedOwnerId: actorId });
    if (!asset || asset.checksum?.algorithm.toUpperCase() !== 'SHA256' ||
        !/^[a-f0-9]{64}$/i.test(asset.checksum.hash)) throw new Error('IMPORT_ARTIFACT_EVIDENCE_INVALID');
    return { assetId, expectedSha256: asset.checksum.hash.toLowerCase(), byteSize: asset.metadata.byteSize };
  }

  private async prepare(input: ImportArtifactInput, actorId: string) {
    if (!actorId?.trim()) throw new Error('IMPORT_ACTOR_REQUIRED');
    if (!/^[a-f0-9]{64}$/i.test(input.expectedSha256)) throw new Error('IMPORT_ARTIFACT_EVIDENCE_INVALID');
    const parser = this.parsers.resolve({ formatHint: input.format });
    if (!parser) throw new Error('IMPORT_FORMAT_UNSUPPORTED');
    const asset = await this.assets.assertUsable(input.assetId, { purpose: 'IMPORT_ARTIFACT', expectedOwnerId: actorId });
    if (!asset || asset.checksum?.algorithm.toUpperCase() !== 'SHA256' ||
        asset.checksum.hash.toLowerCase() !== input.expectedSha256.toLowerCase())
      throw new Error('IMPORT_ARTIFACT_CHECKSUM_MISMATCH');
    const stream = this.bytes.readVerified({ locator: asset.locator, expectedSha256: input.expectedSha256,
      expectedByteSize: asset.metadata.byteSize, maxBytes: 64 * 1024 * 1024 });
    const rows = parser.parse(stream, { batchId: '', chunkSize: 500 });
    if (!input.mappingProfileId) return rows;
    if (!this.governance) throw new Error('IMPORT_MAPPING_UNAVAILABLE');
    const profile = await this.governance.pinnedProfile(input.mappingProfileId, 'MANUAL_EAP_UPLOAD', input.ownerDomain);
    return this.governance.mapRows(rows, profile);
  }

  async preflight(input: ImportArtifactInput, actorId: string) {
    let validRows = 0; let invalidRows = 0; const errors: Array<{ code: string; sourceRowNumber?: number }> = [];
    for await (const row of await this.prepare(input, actorId)) {
      if (validRows + invalidRows >= 100_000) throw new Error('IMPORT_ARTIFACT_ROW_LIMIT');
      if (row instanceof ImportParseError) {
        if (!row.recoverable) throw new Error(row.code);
        invalidRows++;
        if (errors.length < 20) errors.push({ code: row.code, sourceRowNumber: row.sourceRowNumber });
      } else {
        this.validateRow(row); validRows++;
      }
    }
    if (!validRows && !invalidRows) throw new Error('IMPORT_ARTIFACT_EMPTY');
    return { validRows, invalidRows, errors, truncatedErrors: invalidRows > errors.length,
      artifactId: input.assetId, sha256: input.expectedSha256.toLowerCase(), format: input.format };
  }

  private validateRow(row: ParsedImportRow) {
    if (Object.keys(row.raw).some(key => key.startsWith('_phase6') ||
        ['__proto__', 'constructor', 'prototype', '_domainHandoff', '_sourceRowNumber', '_payloadFingerprint', '_importProvenance', '_mappingOriginal', '_screeningReceiptId'].includes(key)))
      throw new Error('IMPORT_RESERVED_HANDOFF_METADATA_FORBIDDEN');
    if (Buffer.byteLength(JSON.stringify(row.raw), 'utf8') > 1024 * 1024) throw new Error('IMPORT_ROW_SIZE_LIMIT');
  }

  async stage(input: ImportArtifactInput, actorId: string) {
    const rows = await this.prepare(input, actorId);
    const profile = input.mappingProfileId ? await this.governance?.pinnedProfile(input.mappingProfileId, 'MANUAL_EAP_UPLOAD', input.ownerDomain) : null;
    return this.imports.stageNormalizedStream({ ownerDomain: input.ownerDomain,
      // Manual labels cannot impersonate registered official source provenance.
      sourceSystem: 'MANUAL_EAP_UPLOAD', rows,
      handoffContext: { artifactId: input.assetId, rawArtifactReference: `eap:${input.assetId}`,
        referenceMetadata: { artifactSha256: input.expectedSha256.toLowerCase(), acquisitionKind: 'MANUAL_EAP_UPLOAD', ...(profile ? { mappingProfileId: profile.id, mappingProfileHash: profile.definitionHash, mappingProfileVersion: String(profile.version) } : {}) } },
    });
  }
}
