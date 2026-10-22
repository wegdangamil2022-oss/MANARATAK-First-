# Managed database identity connection boundary

The reference operator stopped before writes with `POST28_IDENTITY_READ_FAILED`
on 2026-10-22. The previous wrapper intentionally discarded all driver details,
so that failure does not establish a specific network or server cause.

Establish the authenticated connection explicitly before the identity transaction.
Keep its existing 15-second transaction budget, 10-second statement timeout,
READ ONLY mode, exact identity SQL, role checks and unconditional disconnect.
Expose only an enumerated phase and a Prisma `Pdddd` code on the stable redacted
error; neither the driver message nor its cause is retained. The reference
operator includes that phase in its private failure evidence.

Validation: six focused identity-reader tests passed, including connection
failure redaction and disconnect cleanup. Targeted ESLint and diff checks passed.
This is not evidence that a remote connection succeeded or that reference
bootstrap completed. Recovery still requires a fresh identity and bound snapshot.
