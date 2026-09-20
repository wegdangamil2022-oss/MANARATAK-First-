# Standard: API Interface Standards (STD-API-001)

## 1. Overview
Defines naming conventions, error structures, pagination formats, idempotency, and versioning standards for all APIs.

## 2. Standards
- **Naming**: RESTful nouns, kebab-case for URLs, camelCase for JSON properties.
- **Errors**: RFC 7807 Problem Details for HTTP APIs.
- **Pagination**: Cursor-based pagination for large datasets.
- **Idempotency**: `Idempotency-Key` headers required for all `POST` and `PUT` mutation endpoints.
- **Versioning**: URI-based versioning (e.g., `/api/v1/`).

## 3. Status
Approved.
