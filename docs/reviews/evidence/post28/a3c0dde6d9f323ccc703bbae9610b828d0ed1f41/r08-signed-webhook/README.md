# R08 signed webhook and restricted Redis

Actual Linux job 118296822155 in run 39321618633 passed on this source. Two independent Node processes attempted the same signed webhook against the actual Redis replay store; one accepted it and one rejected replay. Tampered/stale signatures and Redis outage were rejected. This is verifier/store evidence, not a financial webhook endpoint or a whole API session deployment.

The source CI job in that run failed on stale environment references; its failure is retained separately. No whole-run PASS is claimed.
