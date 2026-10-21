# Specific CodeQL dispositions

The failed result and eight annotations belong to PR #34 source `6f9cae73dfad7a2886bb0f4225ca49cb256e6d05`. The analysis merge revision recorded by GitHub is `8ed5685e484ee9eb7ef316b0fbe53abdd49ef957`.

Five exact findings were individually dismissed after reviewing their actual source and call sites: 157/158/159 (`false positive`, random opaque session tokens or required Redis machine-secret protocol), 155/156 (`used in tests`, explicitly guarded synthetic DB-T fixtures). The receipts preserve GitHub's actual comments, actor and timestamps; they do not claim an independent human review. The repository owner's previously delegated technical scope authorized this work. No other alert, query, severity policy or workflow was disabled.

The three real ReDoS defects (135/136/80) were fixed in code at `1349371f29902857be7444cf89457e90a1d4b25d` and were not dismissed. Their subsequent analysis must be observed independently. Other pre-existing alert records remain outside these five dispositions. See `docs/remediation/POST28_R07_CODEQL_REVIEW_2026-10-19.md` for source evidence, targeted tests and limits.
