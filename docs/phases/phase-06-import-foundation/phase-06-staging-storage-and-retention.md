# Phase 06: Staging Storage and Retention

## 1. Purpose of Staging Storage
The purpose of staging storage is to durably land imported rows in a raw or semi-structured state, decoupled from the final domain entities. This decoupling allows for asynchronous processing, validation, review, and safe retries without needing to re-read or retain the original raw import file in active memory.

## 2. Current Schema Limitations
The existing Prisma schema for import foundation lacks several key features needed for scalable bulk staging:
*   **No `artifactId`:** No linkage to a physical file asset.
*   **No `chunkIndex`:** Cannot track partial progress of large files.
*   **No `recordOffset`:** Cannot resume processing from a specific point in a file.
*   **No row-level parse error model:** Errors are currently limited to `validationErrors` JSON; parse failures lack a dedicated structural model.
*   **No `retentionExpiresAt`:** No built-in mechanism for expiring old staging records.
*   **No indexes/unique constraints for `sourceDedupKey`:** Deduplication is inefficient at scale.

## 3. Proposed Future Schema Concepts
To resolve these limitations, the following concepts will be introduced in future schema migrations:
*   `ImportArtifact`: A reference to the EAP `AssetRecord`/`AssetReference` representing the uploaded file.
*   `ImportChunk`: A grouping of staged records to manage commit boundaries and retries.
*   `ImportStagingRecord`: The updated entity for holding raw row data.
*   `recordOffset`: The physical byte or line offset in the source artifact.
*   `chunkIndex`: The sequential index of the chunk.
*   `sourceRowNumber`: The original line/row number for user-facing error reporting.
*   `parseErrorCode` & `parseErrorMessage`: Dedicated fields for row-level parse failures.
*   `retentionExpiresAt`: Timestamp indicating when the staging data can be purged.
*   `purgeStatus`: State of the data lifecycle (e.g., RETAINED, PURGED).

## 4. Bulk Staging Strategy
*   **Initial Implementation:** Use Prisma's `createMany` to stage records in chunks of 500-1000 rows. This provides a balance between memory usage and database insert performance.
*   **Deferred Implementation:** PostgreSQL `COPY` commands are deferred to a later enterprise scale milestone, as `createMany` is sufficient for immediate 10K-100K row targets.
*   **P2 Queue/Checkpoint Integration Note:** Chunk checkpoints must use `ImportCheckpoint` and replay must resume from the last committed chunk.
*   **`createMany` Limitation Note:** If record IDs are needed immediately, implementations must pre-generate deterministic IDs or use a `returning` strategy where supported by the database adapter.

## 5. Retention Strategy
The system must handle several distinct retention categories:
*   **Raw Artifacts:** The original uploaded files. Retained according to general system asset policies (e.g., 30 days, or based on tenant configuration).
*   **Staged Rows:** Unprocessed or temporarily staged data. Can expire and be purged after they are successfully reviewed, promoted, or explicitly rejected by the user.
*   **Parse Errors:** Temporary records reflecting syntax or parsing failures.
*   **DLQ Rows:** Processing failures. Retained longer than successful rows to allow for audit, debugging, and eventual replay.
*   **Evidence/Provenance Snippets:** Selected snippets of data retained permanently to prove origin.

## 6. Index Strategy
To support efficient processing and deduplication, the following indexes will be required (implemented in a later schema slice):
*   `ImportRecord`: `batchId` / `status`
*   `ImportRecord`: `batchId` / `sourceDedupKey`
*   `ImportBatch`: `batchStatus` / `dataType`

**Explicit Rule:** Schema changes and indexes require a separate implementation slice and are not implemented in P3B.

## 7. EAP Integration
*   **Large Files:** Should enter the system exclusively through the EAP artifact/asset flow, producing an `AssetReference` that the import system processes.
*   **Inline Data:** The existing `dataText` field remains strictly for small, manual imports or testing purposes.

## 8. Acceptance Criteria
*   A large import never depends on inline `dataText`.
*   Chunk retries do not duplicate already accepted records.
*   Row-level errors are reviewable by the user.
*   Data retention and purging are driven by explicit policies.

## 9. Forbidden Behavior
*   No Phase 25.
*   No domain promotion or publication in P3. Domain match/merge remains owned by downstream phases.
