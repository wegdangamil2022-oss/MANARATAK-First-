# International Test Reference Contract v1

## Ownership

Phase 9 owns international-test definitions, versions, delivery metadata, centers, and test availability. It does not own university or program acceptance decisions.

Reference identities are resolved through the Phase 7 `IReferenceResolver`. Degree relationships use the Phase 8 `DegreeLevel` identity contract. Phase 9 must not create a second country, language, currency, city, or degree-level source of truth.

## Authoritative Relationships

| Concern | Authoritative representation | Compatibility-only representation |
| --- | --- | --- |
| Availability | `availableCountryIds` and `availableCityIds` containing canonical Phase 7 IDs | Country relationship rows and display-only center address text |
| Country/language targeting | `canonicalReferenceId` resolved by Phase 7 | `referenceCode` for legacy reads and later backfill |
| Fee currency | Canonical Phase 7 currency resolved before persistence | `currencyCode` persisted by the current schema |
| Degree applicability | `degreeLevelId` resolved through Phase 8 | `canonicalCode` as stable descriptive metadata |

Writes fail closed when a required resolver is unavailable or a reference is missing/inactive. Legacy rows that have only codes remain readable, but are not evidence of resolved canonical identity.

## Version And Cycle Identity

Imported or maintained versions may carry a source-cycle reference:

```text
cycleKey     stable source cycle identity
versionKey   stable source version identity within the cycle
displayLabel human-readable label only
```

These values are contract metadata until the Greenfield Database Provisioning and Mutation Safety gate authorizes the reviewed schema/data operation. They do not replace the existing numeric `versionNumber`.

## Publication And Acceptance

Publication readiness may require active canonical references, but Draft records may remain incomplete. University/program acceptance is supplied by its owning domain and must not be inferred from Phase 9 cross-phase navigation IDs.

## Database Closure

Required schema constraints, backfills, duplicate reconciliation, and database counts are tracked in `docs/remediation/wp5/WP5_DATABASE_CLOSURE_REGISTER.md`. None are executed while database mutations are blocked.
