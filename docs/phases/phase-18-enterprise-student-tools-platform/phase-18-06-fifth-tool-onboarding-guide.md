# Adding the Fifth Student Tool

1. Select one existing planned `toolKey`; never create a duplicate identity or silently rename it.
2. Define typed input/output contracts and versioned public schemas in the Phase 18 domain.
3. Decide execution type. AI tools must request a Phase 17 capability and may not import a provider, model, prompt, SDK, or secret.
4. Add only anti-corruption gateways for canonical Phase 05/11/12/15 data. Do not copy canonical entities.
5. Implement one handler with strict validation and register it in `StudentToolHandlerRegistry`.
6. Add authorization, feature flags, production rate policy, dependency readiness, safe metadata persistence, Audit, Outbox, and telemetry.
7. Build a dedicated Arabic-first public workflow and the corresponding real admin controls. Never enable a placeholder form.
8. Add unit, contract, negative, privacy, authorization, lifecycle, rate-limit, dependency-failure, and API tests.
9. Change registry status to `IMPLEMENTED` only after the handler and tests exist. Activation remains a separate audited action and never auto-publishes.
10. Create additive migration source if required and complete Google Studio runtime proof before declaring the fifth tool live.
