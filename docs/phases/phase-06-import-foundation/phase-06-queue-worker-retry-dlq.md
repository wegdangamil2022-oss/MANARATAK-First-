# Phase 06 P2B: Queue Contracts, State Machine, Checkpoint, Retry, DLQ Documentation

## 1. Purpose of P2
Phase 06 P2 aims to define and eventually implement the robust asynchronous execution environment for import ingestion processing. The P2B phase focuses entirely on documenting and standardizing the contracts, dtos, value objects, and state machine transitions, acting as a blueprint before implementing Redis, BullMQ, or any physical queue persistence layer in P2D.

## 2. State Machine & Job Status
The import jobs pass through a defined set of states represented by `ImportJobStatus`:
- **CREATED**: Job has been requested but not yet placed in the queue.
- **QUEUED**: Job is resting in the queue awaiting a worker.
- **RUNNING**: Worker has picked up the job and is actively processing.
- **PAUSED**: Job execution is paused (often requested by an admin).
- **RESUMING**: Job is being unpaused and returning to QUEUED/RUNNING.
- **CANCELLING**: Job cancellation requested, waiting for worker to safely halt.
- **CANCELLED**: Job execution completely halted by a user.
- **COMPLETED**: All records processed successfully or safely.
- **PARTIALLY_COMPLETED**: Batch completed but encountered some failed records.
- **FAILED_RETRYABLE**: Job failed temporarily (e.g. network timeout), can be retried automatically.
- **FAILED_PERMANENT**: Job failed fatally (e.g. invalid schema), no auto-retry.
- **DLQ**: Job or Record moved to Dead Letter Queue after max retries.

## 3. Allowed Transitions
- `CREATED` -> `QUEUED`
- `QUEUED` -> `RUNNING`
- `RUNNING` -> `COMPLETED`, `PARTIALLY_COMPLETED`, `FAILED_RETRYABLE`, `FAILED_PERMANENT`, `PAUSED`, `CANCELLING`
- `PAUSED` -> `RESUMING`, `CANCELLING`
- `RESUMING` -> `QUEUED`, `RUNNING`
- `CANCELLING` -> `CANCELLED`
- `FAILED_RETRYABLE` -> `QUEUED` (after backoff delay), `DLQ` (after max attempts)
- `FAILED_PERMANENT` -> `DLQ`
- `CANCELLED`, `COMPLETED`, `PARTIALLY_COMPLETED`, `DLQ` are terminal states (unless replayed).

## 4. Retry and Backoff Rules
Defined by `ImportRetryPolicy`:
- Includes `maxAttempts`, `initialDelayMs`, `maxDelayMs`.
- Supports `fixed` or `exponential` backoff.
- Specifies `retryableErrorCodes` (e.g., timeouts, rate limits).
- Non-retryable errors move straight to `FAILED_PERMANENT`.

## 5. DLQ Rules
- Records or batches that fail beyond `dlqAfterAttempts` are moved to the DLQ.
- Dead Letter entries must store a permanent failure reason, original payload, timestamp, and batch context for administrative analysis.

## 6. Checkpoint and Replay Behavior
Defined by `ImportCheckpoint`:
- Jobs process in chunks and periodically save a checkpoint.
- Checkpoints store `batchId`, `chunkIndex`, `recordOffset`, `processedRecords`, `failedRecords`, and `acceptedRecordKeys`.
- If a worker crashes, the job is retried and resumes from the last known checkpoint offset, bypassing already successfully inserted records.
- **Idempotent Retry Rule:** A retry MUST NOT duplicate accepted records. The presence of `acceptedRecordKeys` helps enforce this boundary alongside database constraints.

## 7. Worker Crash Acceptance Criteria
- A worker crash does not lose the job (queue durability).
- The job is automatically requeued for a retry.
- Execution resumes safely from the last checkpoint to prevent data duplication.

## 8. Implementation Constraints (P2B)
- **No BullMQ / Redis Dependency:** Phase P2B specifies these domain objects and application gateways ONLY. It does NOT implement physical adapters or install Redis/BullMQ.
- **No Domain Promotion/Publication:** Phase 06 P2 handles only the generic staging and queuing of import records. Final promotion and publication are delegated to Phase 09-13.
