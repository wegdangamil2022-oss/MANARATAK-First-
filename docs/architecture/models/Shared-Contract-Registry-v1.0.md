# Shared Contract Registry v1.0

## 1. Overview
Schema registry for validating all cross-domain event payloads across BullMQ.

## 2. Validation Rules
- All events MUST adhere to predefined JSON Schemas.
- Forward compatibility is strictly enforced (ignore unknown fields).
- Breaking changes require major version bumps in the schema.

## 3. Status
Approved.
