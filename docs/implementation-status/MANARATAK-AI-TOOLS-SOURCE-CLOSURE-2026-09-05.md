# MANARATAK AI + Student Tools — source closure

Date: 2026-09-05  
Scope: Phase 17 Enterprise AI Platform + Phase 18 Enterprise Student Tools  
Mode: source-only; no database, migration, backfill, provider call, paid inference, or production mutation.

## Product decision

MANARATAK has one AI authority and one student-tool authority:

- **Phase 17** owns providers, models, capabilities, routing, prompts, guardrails, quotas/cost, evaluation, execution telemetry, async AI work, knowledge indexes and incidents.
- **Phase 18** owns the student-tool catalog, availability, schemas, tool execution policy, transient protected results and explicit save-to-workspace flow.
- Universities, scholarships and student workspace remain owners of their own canonical data. Phase 18 reads them through gateways/read boundaries and does not duplicate their truth.

The launch set remains intentionally small: GPA calculator, university comparison, motivation-letter generator and scholarship recommendation. The remaining registry entries stay planned/admin-visible; no fake implementation was added to increase tool count.

## Closure changes

1. Removed the legacy `AIToolsModal` and all `/api/gemini/*` shadow calls. Public AI entry points now route to the Phase 18 catalog/tool experiences only.
2. Connected `/tools/:toolKey` to the already implemented server-backed `StudentToolPage` instead of rendering a non-executable public preview.
3. Replaced the stale “API will be connected later” message with a real Phase 18 execution CTA. Planned tools never receive a demo execution fallback.
4. Removed the duplicate Web AI admin preview and dead StudentToolsList; legacy Web admin paths now redirect to the canonical Admin application.
5. AI provider status is truthful: no secret = `NOT_CONFIGURED`; secret present but unverified = `RUNTIME_PENDING`; a successful provider response in the running process establishes `READY`.
6. AI idempotency is requester-scoped and stores a request fingerprint. Reusing the same key with a different governed request fails with `AI_IDEMPOTENCY_KEY_REUSED`.
7. Student-tool idempotency similarly fingerprints tool/version/consumer/input/locale and rejects mismatched replay with `TOOL_IDEMPOTENCY_KEY_REUSED`.
8. Phase 18 activation readiness and health now include the transient-result encryption dependency. An implemented tool cannot appear operationally healthy when `STUDENT_TOOL_RESULT_KEY` is absent.
9. Anonymous tool sessions now survive across browser requests using only the opaque server-signed token. CORS explicitly allows the request header and exposes the issued response headers.
10. Saving a result sends only the execution ID. The server recovers the protected result it already owns; the browser cannot replace a result during save.
11. University comparison and scholarship recommendation results deep-link to the canonical public records. Public university slug hydration was completed so those links resolve from the owner API.
12. The public tool category mapper now recognizes the actual Phase 18 registry category keys instead of silently collapsing them into a generic category.
13. AI/Tools Admin and live tool execution surfaces were aligned to the MANARATAK identity (`#044A37`, `#235D4E`, `#E3B04B`, `#FBFCFB`, Cairo) while retaining semantic warning/error colors.
14. AI Admin overview now derives provider runtime counts from the live provider adapters rather than trusting persisted provider status from an earlier process; a process restart therefore returns configured-but-unverified providers to `RUNTIME_PENDING` until fresh runtime evidence exists.
15. The Phase 23 preview backlog was marked historical/superseded for AI and Student Tools so deleted preview control planes are not reintroduced by future work.

## Security / governance position

- The browser never chooses provider, model, prompt or route.
- AI output is advisory and cannot mutate university/scholarship truth or grant access by itself.
- Private tool results are transiently encrypted and saved to the student workspace only after explicit user action.
- Prompt input and system instructions remain separated; structured output, guardrails, PII redaction, circuit state, quotas and cost accounting stay in Phase 17.
- No provider SDK or provider secret ownership was added to Phase 18.

## Runtime pending

Source closure does not claim live provider readiness. Production still requires valid provider secrets/configuration, `STUDENT_TOOL_RESULT_KEY`, database/runtime services, approved active AI registry records and live provider/API verification. Runtime failures must surface as `NOT_CONFIGURED`, `RUNTIME_PENDING`, `DEGRADED` or unavailable states; no green fallback is permitted.

## Database discipline

Prisma schema changed: **0**  
Existing migration source changed: **0**  
Migration source added/removed: **0**  
Database executions: **0**  
Migration executions: **0**  
Backfill executions: **0**

## Source closure evidence

AI + Tools closure gate: **64/64 PASS**  
Modified TS/TSX source syntax: **18/18 PASS**  
Phase 17 verifier: **PASS**  
Phase 18 verifier: **PASS**  
Source architecture guard: **PASS**  
Source quality: **PASS** (`package cycles = 0`, `file cycles = 0`, `accessibility findings = 0`)  
Regression suite: Finance, Health & Readiness, Jobs, Universities P9, Scholarships P12, W2, Courses, International Tests, Study Destinations, Certificates, Import Foundation, P13, Phase 15/16 and P8 all **PASS**.

Dependency-backed full TypeScript/Prisma runtime validation was not forced because this source archive does not contain installed project dependencies. No dependency installation was performed solely for validation.
