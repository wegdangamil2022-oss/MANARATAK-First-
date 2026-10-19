import type { AssetStorageLocator } from '@absheer/domain';

/** All bytes are verified before the first yield. A partial or mismatched artifact cannot stage rows. */
export interface IVerifiedImportArtifactGateway {
  readVerified(input: { locator: AssetStorageLocator; expectedSha256: string;
    expectedByteSize: number; maxBytes: number }): AsyncIterable<Uint8Array>;
}
