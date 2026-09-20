ALTER TABLE "StudentWorkspace"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "timezone" TEXT DEFAULT 'Asia/Aden',
ADD COLUMN "theme" TEXT DEFAULT 'SYSTEM',
ADD COLUMN "privacyPreferences" JSONB,
ADD COLUMN "accessibilityPreferences" JSONB,
ADD COLUMN "lastActiveAt" TIMESTAMP(3),
ADD COLUMN "suspendedAt" TIMESTAMP(3),
ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "StudentSavedItem" ADD COLUMN "collectionId" TEXT;

CREATE TABLE "StudentSavedCollection" (
    "id" TEXT NOT NULL,
    "studentReferenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PERSONAL',
    "color" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentSavedCollection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentTimelineEntry" (
    "id" TEXT NOT NULL,
    "studentReferenceId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceDomain" TEXT NOT NULL,
    "sourceReferenceId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentTimelineEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentRecentActivity" (
    "id" TEXT NOT NULL,
    "studentReferenceId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "entitySlug" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentRecentActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentSearchHistory" (
    "id" TEXT NOT NULL,
    "studentReferenceId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "normalizedQuery" TEXT NOT NULL,
    "searchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentSearchHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentWorkspaceSnapshot" (
    "id" TEXT NOT NULL,
    "studentReferenceId" TEXT NOT NULL,
    "label" TEXT,
    "workspaceVersion" INTEGER NOT NULL,
    "configuration" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentWorkspaceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentNotificationProjection" (
    "id" TEXT NOT NULL,
    "studentReferenceId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "sourceEventId" TEXT,
    "readAt" TIMESTAMP(3),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentNotificationProjection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentWorkspaceEventInbox" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "studentReferenceId" TEXT NOT NULL,
    "sourceDomain" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentWorkspaceEventInbox_pkey" PRIMARY KEY ("id")
);

DELETE FROM "StudentSavedItem" current_item
USING "StudentSavedItem" newer_item
WHERE current_item."studentReferenceId" = newer_item."studentReferenceId"
  AND current_item."entityType" = newer_item."entityType"
  AND current_item."entityId" = newer_item."entityId"
  AND (current_item."updatedAt", current_item."id") < (newer_item."updatedAt", newer_item."id");

INSERT INTO "StudentSavedCollection" ("id", "studentReferenceId", "name", "description", "type", "color", "icon", "createdAt", "updatedAt")
SELECT CONCAT('phase15-favorites-', workspace."id"), workspace."studentReferenceId", 'المفضلة', 'العناصر التي تريد الرجوع إليها بسرعة', 'FAVORITES', '#087A55', 'bookmark', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "StudentWorkspace" workspace
WHERE NOT EXISTS (
  SELECT 1 FROM "StudentSavedCollection" collection
  WHERE collection."studentReferenceId" = workspace."studentReferenceId"
    AND collection."type" = 'FAVORITES'
);

CREATE INDEX "StudentWorkspace_status_idx" ON "StudentWorkspace"("status");
CREATE INDEX "StudentWorkspace_lastActiveAt_idx" ON "StudentWorkspace"("lastActiveAt");
CREATE UNIQUE INDEX "StudentSavedItem_studentReferenceId_entityType_entityId_key" ON "StudentSavedItem"("studentReferenceId", "entityType", "entityId");
CREATE INDEX "StudentSavedItem_studentReferenceId_savedAt_idx" ON "StudentSavedItem"("studentReferenceId", "savedAt");
CREATE INDEX "StudentSavedItem_collectionId_idx" ON "StudentSavedItem"("collectionId");
CREATE UNIQUE INDEX "StudentSavedCollection_studentReferenceId_name_key" ON "StudentSavedCollection"("studentReferenceId", "name");
CREATE INDEX "StudentSavedCollection_studentReferenceId_type_idx" ON "StudentSavedCollection"("studentReferenceId", "type");
CREATE INDEX "StudentTimelineEntry_studentReferenceId_occurredAt_idx" ON "StudentTimelineEntry"("studentReferenceId", "occurredAt");
CREATE INDEX "StudentTimelineEntry_sourceDomain_sourceReferenceId_idx" ON "StudentTimelineEntry"("sourceDomain", "sourceReferenceId");
CREATE INDEX "StudentRecentActivity_studentReferenceId_occurredAt_idx" ON "StudentRecentActivity"("studentReferenceId", "occurredAt");
CREATE INDEX "StudentSearchHistory_studentReferenceId_searchedAt_idx" ON "StudentSearchHistory"("studentReferenceId", "searchedAt");
CREATE INDEX "StudentWorkspaceSnapshot_studentReferenceId_createdAt_idx" ON "StudentWorkspaceSnapshot"("studentReferenceId", "createdAt");
CREATE UNIQUE INDEX "StudentNotificationProjection_sourceEventId_key" ON "StudentNotificationProjection"("sourceEventId");
CREATE INDEX "StudentNotificationProjection_studentReferenceId_readAt_occurredAt_idx" ON "StudentNotificationProjection"("studentReferenceId", "readAt", "occurredAt");
CREATE UNIQUE INDEX "StudentWorkspaceEventInbox_eventId_key" ON "StudentWorkspaceEventInbox"("eventId");
CREATE INDEX "StudentWorkspaceEventInbox_studentReferenceId_receivedAt_idx" ON "StudentWorkspaceEventInbox"("studentReferenceId", "receivedAt");
CREATE INDEX "StudentWorkspaceEventInbox_processedAt_receivedAt_idx" ON "StudentWorkspaceEventInbox"("processedAt", "receivedAt");

ALTER TABLE "StudentSavedItem" ADD CONSTRAINT "StudentSavedItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "StudentSavedCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentSavedCollection" ADD CONSTRAINT "StudentSavedCollection_studentReferenceId_fkey" FOREIGN KEY ("studentReferenceId") REFERENCES "StudentWorkspace"("studentReferenceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentTimelineEntry" ADD CONSTRAINT "StudentTimelineEntry_studentReferenceId_fkey" FOREIGN KEY ("studentReferenceId") REFERENCES "StudentWorkspace"("studentReferenceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentRecentActivity" ADD CONSTRAINT "StudentRecentActivity_studentReferenceId_fkey" FOREIGN KEY ("studentReferenceId") REFERENCES "StudentWorkspace"("studentReferenceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentSearchHistory" ADD CONSTRAINT "StudentSearchHistory_studentReferenceId_fkey" FOREIGN KEY ("studentReferenceId") REFERENCES "StudentWorkspace"("studentReferenceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentWorkspaceSnapshot" ADD CONSTRAINT "StudentWorkspaceSnapshot_studentReferenceId_fkey" FOREIGN KEY ("studentReferenceId") REFERENCES "StudentWorkspace"("studentReferenceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentNotificationProjection" ADD CONSTRAINT "StudentNotificationProjection_studentReferenceId_fkey" FOREIGN KEY ("studentReferenceId") REFERENCES "StudentWorkspace"("studentReferenceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentWorkspaceEventInbox" ADD CONSTRAINT "StudentWorkspaceEventInbox_studentReferenceId_fkey" FOREIGN KEY ("studentReferenceId") REFERENCES "StudentWorkspace"("studentReferenceId") ON DELETE RESTRICT ON UPDATE CASCADE;
