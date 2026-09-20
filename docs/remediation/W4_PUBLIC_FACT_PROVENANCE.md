# W4 Public Fact Provenance — MNT-AUD-0024

Live P24 adapters may render only owner facts, deterministic transforms of owner facts, or explicitly unavailable values. Prototype fixtures remain isolated behind explicit prototype mode and are not evidence for live/API facts.

| Presentation field | Live classification | Rule |
|---|---|---|
| University global rank | owner-derived when an owner ranking record has a positive numeric rank | otherwise `null`; never sentinel rank |
| University scholarship count | unsupported until governed relationship aggregation supplies it | `null`; UI says unavailable |
| University acceptance rate | unsupported in current owner DTO | `null`; UI says unavailable |
| Major average scholarships | unsupported in current owner DTO | `null` |
| Major future demand | unsupported in current owner DTO | `null`; no fabricated "medium" demand |
| Course lessons/rating/student count | unsupported in current owner DTO | `null`; UI does not display zero as fact |
| Country scholarship/university counts | relationship-derived only when cross-domain graph supplies counts | initial owner map is `null`, never zero |
| Scholarship without-IELTS | requires explicit owner proof | unknown is `null`; `onlyWithoutIelts` matches only `=== true` |
| Empty image/flag presentation values | presentation-only absence | no business inference; UI may use visual fallback |
| Labels such as "published scholarship" | presentation-only | do not alter owner lifecycle/filter semantics |

A source guard rejects reintroduction of the synthetic live defaults named by the audit finding.
