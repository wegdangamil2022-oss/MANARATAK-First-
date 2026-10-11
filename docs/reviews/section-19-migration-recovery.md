# Section 19 migration and recovery — SOURCE ONLY

Both additive migrations are **UNAPPLIED**. All behavior using these columns is **NOT_RUNTIME_SAFE** until approved deployment applies the reviewed expand migrations. No database was connected or mutated during this work.

- P15: saved private artifacts use a separate runtime key `STUDENT_PRIVATE_RESULT_KEY`; at most three previous keys are accepted with `STUDENT_PRIVATE_RESULT_KEY_PREVIOUS`. P18 transient keys use `STUDENT_TOOL_RESULT_KEY` and `_PREVIOUS` independently.
- P18: revision, last editor and proposal/review evidence are added to the owner definition. Legacy rows have no known author. An operator must make a reviewed versioned edit and propose an independent review before activation. The retired coarse permission is not automatically expanded into capabilities.
- Preserve pre-change database and encrypted key-management backups. Rehearse restore on a disposable target after section 28. Keep API stopped during activation; verify exact schema and manifests before restart.
- Inventory legacy `StudentSavedItem.metadata.privateResult` without copying contents into logs/events. Approved runtime remediation must encrypt legacy contents under the student's identity and P15 purpose, verify authorized retrieval, then remove the old plaintext. Restrict old backup access and observe existing retention; adding ciphertext cannot retroactively encrypt existing backups.
- Source has no automatic backfill or data mutation. No down SQL is asserted. Roll back application only with the API stopped and preserve ciphertext/key custody; use the pre-change backup if schema recovery is required, never drop ciphertext columns to simplify a rollback.
- Durable saves have a 90-day expiry bound inside authenticated ciphertext. Removal deletes the saved row and envelope together. Expired read clears its envelope. Global physical retention must be run under the existing approved P15 retention operation after section 28.
