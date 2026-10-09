-- CreateIndex
CREATE UNIQUE INDEX "SettingAssignmentRecord_id_currentVersionId_key" ON "SettingAssignmentRecord"("id", "currentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "SettingVersionRecord_assignmentId_id_key" ON "SettingVersionRecord"("assignmentId", "id");

-- AddForeignKey
ALTER TABLE "SettingAssignmentRecord" ADD CONSTRAINT "SettingAssignmentRecord_id_currentVersionId_fkey" FOREIGN KEY ("id", "currentVersionId") REFERENCES "SettingVersionRecord"("assignmentId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

