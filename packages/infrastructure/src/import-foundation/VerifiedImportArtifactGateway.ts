import { createHash } from 'node:crypto';
import { mkdtemp, open, rm, writeFile } from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IAssetStorageGateway, AssetStorageLocator } from '@manaratak/domain';
import type { IVerifiedImportArtifactGateway } from '@manaratak/application';

let reservedBytes = 0;
let activeSpools = 0;
const SPOOL_BUDGET = 256 * 1024 * 1024;

/** Private bounded spool avoids both whole-artifact RAM buffering and staging unverified bytes. */
export class VerifiedImportArtifactGateway implements IVerifiedImportArtifactGateway {
  constructor(private readonly storage: IAssetStorageGateway) {}
  async *readVerified(input: { locator: AssetStorageLocator; expectedSha256: string;
    expectedByteSize: number; maxBytes: number }): AsyncIterable<Uint8Array> {
    if (!this.storage.openRead) throw new Error('IMPORT_ARTIFACT_STREAM_UNAVAILABLE');
    if (!/^[a-f0-9]{64}$/i.test(input.expectedSha256) ||
        !Number.isSafeInteger(input.expectedByteSize) || input.expectedByteSize < 1 ||
        !Number.isSafeInteger(input.maxBytes) || input.maxBytes < 1 || input.maxBytes > 64 * 1024 * 1024 ||
        input.expectedByteSize > input.maxBytes) throw new Error('IMPORT_ARTIFACT_EVIDENCE_INVALID');
    if (activeSpools >= 4 || reservedBytes + input.expectedByteSize > SPOOL_BUDGET)
      throw new Error('IMPORT_ARTIFACT_SPOOL_CAPACITY');
    activeSpools++; reservedBytes += input.expectedByteSize;
    let directory: string | undefined;
    let handle: Awaited<ReturnType<typeof open>> | undefined;
    try {
      directory = await mkdtemp(join(tmpdir(), 'manaratak-import-'));
      await writeFile(join(directory, 'owner.json'), JSON.stringify({ pid: process.pid, host: hostname(), createdAt: Date.now() }), { flag: 'wx', mode: 0o600 });
      handle = await open(join(directory, 'verified'), 'wx+', 0o600);
      let size = 0;
      const digest = createHash('sha256');
      for await (const chunk of this.storage.openRead(input.locator, input.maxBytes)) {
        size += chunk.byteLength;
        if (size > input.maxBytes || size > input.expectedByteSize) throw new Error('IMPORT_ARTIFACT_SIZE_MISMATCH');
        digest.update(chunk);
        let offset = 0;
        while (offset < chunk.byteLength) {
          const { bytesWritten } = await handle.write(chunk, offset, chunk.byteLength - offset);
          if (!bytesWritten) throw new Error('IMPORT_ARTIFACT_SPOOL_FAILED');
          offset += bytesWritten;
        }
      }
      if (size !== input.expectedByteSize || digest.digest('hex') !== input.expectedSha256.toLowerCase())
        throw new Error('IMPORT_ARTIFACT_CHECKSUM_MISMATCH');
      const stream = handle.createReadStream({ start: 0, highWaterMark: 64 * 1024, autoClose: false });
      try { for await (const chunk of stream) yield new Uint8Array(chunk); }
      finally { stream.destroy(); }
    } finally {
      try { await handle?.close(); }
      finally {
        try { if (directory) await rm(directory, { recursive: true, force: true }); }
        finally { activeSpools--; reservedBytes -= input.expectedByteSize; }
      }
    }
  }
}
