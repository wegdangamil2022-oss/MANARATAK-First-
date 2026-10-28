-- CreateTable
CREATE TABLE "StudentSupportCaseRecord" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "origin" TEXT NOT NULL,
    "teamId" TEXT,
    "assigneeId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastStudentMessageAt" TIMESTAMP(3) NOT NULL,
    "lastPublicReplyAt" TIMESTAMP(3),
    "firstPublicReplyAt" TIMESTAMP(3),
    "firstReplyDueAt" TIMESTAMP(3),
    "resolutionDueAt" TIMESTAMP(3),
    "slaPausedAt" TIMESTAMP(3),
    "slaRemainingMinutes" DOUBLE PRECISION,
    "slaBreached" BOOLEAN NOT NULL DEFAULT false,
    "slaSnapshot" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSupportCaseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSupportMessageRecord" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorKind" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentSupportMessageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSupportEventRecord" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "commandKey" TEXT NOT NULL,
    "commandHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentSupportEventRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSupportTeamRecord" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSupportTeamRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSupportTeamMemberRecord" (
    "teamId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StudentSupportTeamMemberRecord_pkey" PRIMARY KEY ("teamId","identityId")
);

-- CreateTable
CREATE TABLE "StudentSupportPolicyRecord" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSupportPolicyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSupportMacroRecord" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSupportMacroRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSupportCaseLinkRecord" (
    "caseId" TEXT NOT NULL,
    "relatedCaseId" TEXT NOT NULL,
    "linkedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentSupportCaseLinkRecord_pkey" PRIMARY KEY ("caseId","relatedCaseId")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentSupportCaseRecord_publicId_key" ON "StudentSupportCaseRecord"("publicId");

-- CreateIndex
CREATE INDEX "StudentSupportCaseRecord_studentId_createdAt_id_idx" ON "StudentSupportCaseRecord"("studentId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "StudentSupportCaseRecord_status_assigneeId_updatedAt_id_idx" ON "StudentSupportCaseRecord"("status", "assigneeId", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "StudentSupportCaseRecord_teamId_updatedAt_id_idx" ON "StudentSupportCaseRecord"("teamId", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "StudentSupportCaseRecord_firstReplyDueAt_id_idx" ON "StudentSupportCaseRecord"("firstReplyDueAt", "id");

-- CreateIndex
CREATE INDEX "StudentSupportCaseRecord_resolutionDueAt_id_idx" ON "StudentSupportCaseRecord"("resolutionDueAt", "id");

-- CreateIndex
CREATE INDEX "StudentSupportMessageRecord_caseId_visibility_createdAt_id_idx" ON "StudentSupportMessageRecord"("caseId", "visibility", "createdAt", "id");

-- CreateIndex
CREATE INDEX "StudentSupportEventRecord_caseId_createdAt_id_idx" ON "StudentSupportEventRecord"("caseId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSupportEventRecord_actorId_commandKey_key" ON "StudentSupportEventRecord"("actorId", "commandKey");

-- CreateIndex
CREATE INDEX "StudentSupportTeamMemberRecord_identityId_active_idx" ON "StudentSupportTeamMemberRecord"("identityId", "active");

-- CreateIndex
CREATE INDEX "StudentSupportMacroRecord_status_locale_id_idx" ON "StudentSupportMacroRecord"("status", "locale", "id");

-- CreateIndex
CREATE INDEX "StudentSupportCaseLinkRecord_relatedCaseId_idx" ON "StudentSupportCaseLinkRecord"("relatedCaseId");

-- AddForeignKey
ALTER TABLE "StudentSupportCaseRecord" ADD CONSTRAINT "StudentSupportCaseRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentWorkspace"("studentReferenceId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StudentSupportCaseRecord" ADD CONSTRAINT "StudentSupportCaseRecord_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StudentSupportCaseRecord" ADD CONSTRAINT "StudentSupportCaseRecord_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "StudentSupportTeamRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSupportMessageRecord" ADD CONSTRAINT "StudentSupportMessageRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "StudentSupportCaseRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSupportMessageRecord" ADD CONSTRAINT "StudentSupportMessageRecord_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StudentSupportEventRecord" ADD CONSTRAINT "StudentSupportEventRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "StudentSupportCaseRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSupportEventRecord" ADD CONSTRAINT "StudentSupportEventRecord_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StudentSupportTeamMemberRecord" ADD CONSTRAINT "StudentSupportTeamMemberRecord_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "StudentSupportTeamRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSupportTeamMemberRecord" ADD CONSTRAINT "StudentSupportTeamMemberRecord_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StudentSupportCaseLinkRecord" ADD CONSTRAINT "StudentSupportCaseLinkRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "StudentSupportCaseRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSupportCaseLinkRecord" ADD CONSTRAINT "StudentSupportCaseLinkRecord_relatedCaseId_fkey" FOREIGN KEY ("relatedCaseId") REFERENCES "StudentSupportCaseRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Owner invariants; installation grants are intentionally a separate deployment decision.
ALTER TABLE "StudentSupportCaseRecord" ADD CONSTRAINT "support_case_state" CHECK (
  "status" IN ('NEW','OPEN','WAITING_ON_STUDENT','WAITING_ON_OWNER','RESOLVED','CLOSED','REOPENED','CANCELLED') AND
  "priority" IN ('LOW','NORMAL','HIGH','URGENT') AND "origin" IN ('STUDENT_PORTAL','ADMIN_PROXY') AND "version">0 AND
  char_length("title") BETWEEN 3 AND 160 AND ("slaRemainingMinutes" IS NULL OR "slaRemainingMinutes">=0));
ALTER TABLE "StudentSupportMessageRecord" ADD CONSTRAINT "support_message_visibility" CHECK (
  "visibility" IN ('PUBLIC','INTERNAL') AND "authorKind" IN ('STUDENT','AGENT') AND char_length("body") BETWEEN 1 AND 4000 AND
  NOT ("authorKind"='STUDENT' AND "visibility"='INTERNAL'));
ALTER TABLE "StudentSupportEventRecord" ADD CONSTRAINT "support_command_digest" CHECK ("commandKey" ~ '^[0-9a-f]{64}$' AND "commandHash" ~ '^[0-9a-f]{64}$');
CREATE UNIQUE INDEX "support_one_active_policy" ON "StudentSupportPolicyRecord" ((true)) WHERE active;
CREATE FUNCTION "support_reject_history_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'SUPPORT_HISTORY_IMMUTABLE' USING ERRCODE='23514'; END $$;
CREATE TRIGGER "support_message_immutable" BEFORE UPDATE OR DELETE ON "StudentSupportMessageRecord" FOR EACH ROW EXECUTE FUNCTION "support_reject_history_mutation"();
CREATE TRIGGER "support_event_immutable" BEFORE UPDATE OR DELETE ON "StudentSupportEventRecord" FOR EACH ROW EXECUTE FUNCTION "support_reject_history_mutation"();
CREATE FUNCTION "support_validate_case_link"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."caseId"=NEW."relatedCaseId" OR NOT EXISTS (
    SELECT 1 FROM "StudentSupportCaseRecord" a JOIN "StudentSupportCaseRecord" b ON a."studentId"=b."studentId"
    WHERE a.id=NEW."caseId" AND b.id=NEW."relatedCaseId"
  ) THEN RAISE EXCEPTION 'SUPPORT_DUPLICATE_LINK_INVALID' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "support_link_same_student" BEFORE INSERT OR UPDATE ON "StudentSupportCaseLinkRecord" FOR EACH ROW EXECUTE FUNCTION "support_validate_case_link"();
