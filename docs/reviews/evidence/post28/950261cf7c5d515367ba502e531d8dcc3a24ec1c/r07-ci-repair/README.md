# Failed artifact evidence — not acceptance

Run 39307051969, source 950261cf7c5d515367ba502e531d8dcc3a24ec1c.

The retained `INVALID-SOURCE_CI_CLOSURE.json` incorrectly reports artifact success because the shell step masked a builder failure. `INVALID-artifact-retrieval.txt` hashes legacy SOURCE_SHA_UNAVAILABLE files, not accepted source-bound candidate artifacts. Preserve these receipts for auditing the failure; they must never authorize promotion.

The job log independently confirms 1025 Node tests passed, zero failures, then the builder failed with RELEASE_FRESH_OUTPUT_REQUIRED. Linux failed before unpacking or starting services. See POST28_R07_CI_REPAIR_2026-10-19.md for the repair and targeted behavioral regression.
