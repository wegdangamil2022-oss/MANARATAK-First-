# R10 local synthetic authority and review contract

The owner explicitly authorized starting R10, then authorized an independent technical reviewer and delegated project authority: «نعم لك كل الصلاحيات بحكم انك مدير المشروع». This record documents that conversation authorization; it is not a fabricated human cryptographic signature.

The delegated implementation/owner representative is `/root`. The separately assigned technical reviewer is `/root/r10_independent_review`. The initial independent decision at `1442a3c` is REQUEST CHANGES and remains historical evidence. A positive final decision on the corrected source and precise local target is required before restore.

The owner delegate approves only a fresh, synthetic, loopback PostgreSQL 16 drill after the independent reviewer approves the corrected implementation and the target/input guards pass. This permits no existing database, external service, Neon, production operation, main merge, or deployment.

For this explicitly separate `LOCAL_SYNTHETIC_LOOPBACK` contract:

- An ephemeral local authorization authority attests two actual decisions, each with distinct reviewer identity, role, decision and SHA-256 of its recorded evidence. It does not claim that the owner or reviewer held or used separate signing keys. The authority public key is pinned by the invoking operator outside the submitted envelope; private keys remain in the ACL-protected lab outside Git.
- A separately pinned bootstrap attestation key signs actual creator state, producer/binary hashes, resolved data-directory identity, system identifier, run ID, source/target identities and TLS root. Only the known `create-post28-native-lab.mjs` producer, a fresh native disposable cluster, exact loopback address, and the intended new target namespace are admitted. No production identity is invented; the existing production-shaped authorization contract remains intact.
- Both envelopes bind the exact reviewed source SHA and expire. The restore envelope additionally binds dump/manifest/snapshot and approval evidence. Input hashes and verified TLS are required before any target SQL. The sentinel remains independently owned, read-only to the restore role and rechecked after restore; excessive role privileges and membership are rejected.
- A successful run proves only its recorded local scope. Full operational RPO/RTO, actual hosting recovery, PITR, WORM/KMS/audit and cross-region evidence remain separate.

The reviewed harness and retained results must identify actual approval evidence and every remaining limitation. No placeholder reviewer IDs, fabricated production deny identities or invented PASS receipts may be used in a real run.
