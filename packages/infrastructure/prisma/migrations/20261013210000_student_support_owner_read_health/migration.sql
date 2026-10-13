-- SOURCE ONLY. No existing database is changed by checking in this file.
CREATE TABLE "StudentSupportOwnerReadObservation" (
  "studentReferenceId" TEXT NOT NULL,
  "ownerDomain" TEXT NOT NULL CHECK ("ownerDomain" IN ('learning','certificates','services')),
  "status" TEXT NOT NULL CHECK ("status" IN ('AVAILABLE','DEGRADED')),
  "checkedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentSupportOwnerReadObservation_pkey" PRIMARY KEY ("studentReferenceId","ownerDomain"),
  CONSTRAINT "StudentSupportOwnerReadObservation_studentReferenceId_fkey"
    FOREIGN KEY ("studentReferenceId") REFERENCES "StudentWorkspace"("studentReferenceId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "StudentSupportOwnerReadObservation_ownerDomain_status_checkedAt_idx"
  ON "StudentSupportOwnerReadObservation"("ownerDomain","status","checkedAt");
