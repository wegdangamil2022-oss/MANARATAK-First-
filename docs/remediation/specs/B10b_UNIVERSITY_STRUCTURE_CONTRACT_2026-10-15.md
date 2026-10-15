# B10b — University campuses and units

Owner: UNIVERSITIES existing aggregate, UniversityCampus / UniversityOrganizationUnit IDs remain the same IDs used by program authoring and owner lists. No new store/schema. Existing PUT normalized-details is a bounded section upsert, not replacement-by-omission. No DELETE or cascade is exposed.

Authenticated admin:universities:manage, If-Match and review reason are mandatory through the owner use case. Only editable university aggregates accept structural changes; READY_TO_PUBLISH returns to review. Public projection remains publication-gated and exposes active rows only. Published university changes require the existing withdrawal/review lifecycle.

Lifecycle: new campus/unit ACTIVE under editable university; retirement is explicit ARCHIVED. Retirement rejects any linked program (including archived references), child units, or campus units. IDs/history are retained. Reparenting must resolve to a unit in the same owner, not a department, with no cycle and compatible campus. Program picks require ACTIVE owned campus/unit. Blank selection explicitly clears the optional reference; missing input preserves it. Text names are labels, not keys.

UI must hydrate existing campusId/parentOrganizationUnitId to owner references, preserve IDs on edit, select saved parents from the same owner, and refresh persisted rows after save. No publication or deletion rights are implied by table existence. Existing revision lock/audit/outbox boundary serializes structural and program writes, including two editors.

Light acceptance: cross-owner parent and cycle reject, stale revision rejects before write; referenced unit/campus retirement rejects without deleting; existing owner IDs appear unchanged in lists and program pickers; unchanged/cleared parent round trips explicitly. Runtime PostgreSQL locking and browser round trip remain pending.

Rollback: disable new retirement controls; preserve records and references. No migration, data scan or provider effects.
