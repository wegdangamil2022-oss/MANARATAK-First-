# Phase 06: Connector Versioning and Drift Detection

## Connector Versioning Requirements
Connectors are tightly coupled to the external structure of the sources they consume. To manage changes over time:
- Every connector implementation must expose a static `connectorVersion` (e.g., semantic version or timestamp).
- Any change to a connector's extraction logic, mapping rules, or selectors must result in a version increment.
- The `connectorVersion` must be recorded in the audit metadata of every import job to ensure traceability if historical data needs to be re-evaluated due to a parsing bug.

## Selector / Schema Signature
To detect when an external source changes unexpectedly, connectors must define a "signature" representing their expected input:
- **HTML Connectors**: A signature is a set of critical CSS selectors or XPath queries that must exist on the page.
- **API/JSON Connectors**: A signature is a simplified schema of the required JSON keys or data types.
- **Document Connectors**: A signature is the expected header row (CSV) or root structure (XML).

## Drift Detection Triggers
Drift detection monitors the health of a connector during execution. A drift event is triggered under the following conditions:
- **Selector Missing**: A critical CSS selector defined in the signature is not found on the target page.
- **Required Field Missing**: A mandatory data field is absent from the API response or document row.
- **Unexpected Schema Shape**: The structure of an API response has fundamentally changed (e.g., an array is now an object).
- **Sharp Drop in Extracted Row Count**: The number of extracted records falls significantly below historical averages for the source, indicating a potential pagination or rendering failure.
- **Content Hash / Source Structure Changed**: The overall structure of the source has mutated drastically, even if individual selectors still partially match.

## Drift Response
When drift is detected, the system must immediately halt ingestion to prevent data corruption:
- **Halt Execution**: Stop the current import job. Do not stage partial or corrupted data.
- **Update Source Status**: Mark the connector or source in the registry as `NEEDS_REVIEW` or temporarily disable it.
- **Produce Alert**: Generate a detailed drift alert for administrator review.
- **Prevent Staging**: Ensure no incorrect or malformed data enters the staging area.

## Drift Alert Fields
When a drift event occurs, the system must emit an alert containing the following fields:
- `sourceId`: The affected source.
- `connectorId`: The affected connector.
- `connectorVersion`: The version of the connector that failed.
- `detectedAt`: UTC timestamp of the detection.
- `driftType`: The category of drift (e.g., `SELECTOR_MISSING`, `SCHEMA_MISMATCH`, `LOW_YIELD`).
- `severity`: Impact level (e.g., `HIGH`, `CRITICAL`).
- `previousSignature`: The expected signature that the connector was designed for.
- `currentSignature`: The observed signature or structural summary of the failing response.
- `sampleEvidence`: A snippet of the problematic payload or HTML (truncated for size).
- `recommendedAction`: Suggested remediation (e.g., "Update CSS selectors", "Review API documentation").

## Required Tests (Future P4F)
The implementation of drift detection in Phase P4F must include tests that verify:
- Connectors successfully halt and throw `DriftDetectedError` when a required selector is removed from a mocked HTML payload.
- Connectors halt when a required field is dropped from a mocked JSON API response.
- Drift alerts are correctly formatted and emitted with all required fields.
- Staging repositories are not called when drift is detected during the parsing phase.
