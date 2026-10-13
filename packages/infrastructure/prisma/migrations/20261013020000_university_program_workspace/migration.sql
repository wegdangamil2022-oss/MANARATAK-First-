-- Source only: no target database change or historical backfill.
CREATE TABLE "UniversityProgramStudyProfile" (
 "programId" TEXT PRIMARY KEY REFERENCES "UniversityAcademicProgram"("id") ON DELETE RESTRICT,
 "studyMode" TEXT NOT NULL DEFAULT 'UNKNOWN', "teachingDelivery" TEXT NOT NULL DEFAULT 'UNKNOWN',
 "durationValue" DOUBLE PRECISION, "durationUnit" TEXT, "entryEligibility" TEXT,
 "verificationStatus" TEXT NOT NULL DEFAULT 'UNKNOWN', "officialSourceUrl" TEXT, "verifiedBy" TEXT, "verifiedAt" TIMESTAMP(3),
 CHECK (("durationValue" IS NULL AND "durationUnit" IS NULL) OR ("durationValue" IS NOT NULL AND "durationUnit" IS NOT NULL AND "durationValue">0 AND "durationValue"<=1000 AND "durationUnit" IN ('MONTHS','YEARS')))
);
CREATE TABLE "UniversityProgramStudyLanguage" (
 "programId" TEXT NOT NULL REFERENCES "UniversityProgramStudyProfile"("programId") ON DELETE RESTRICT,
 "languageReferenceId" TEXT NOT NULL REFERENCES "ReferenceLanguage"("id") ON DELETE RESTRICT,
 PRIMARY KEY ("programId","languageReferenceId")
);
CREATE INDEX "UniversityProgramStudyLanguage_languageReferenceId_programId_idx" ON "UniversityProgramStudyLanguage"("languageReferenceId","programId");
CREATE TABLE "UniversityProgramIntake" (
 "id" TEXT PRIMARY KEY, "programId" TEXT NOT NULL REFERENCES "UniversityAcademicProgram"("id") ON DELETE RESTRICT,
 "intakeStart" TIMESTAMP(3) NOT NULL, "applicationOpen" TIMESTAMP(3) NOT NULL, "applicationClose" TIMESTAMP(3) NOT NULL,
 "applicantSegment" TEXT NOT NULL, "timezone" TEXT NOT NULL, "officialSourceUrl" TEXT NOT NULL,
 "verificationStatus" TEXT NOT NULL DEFAULT 'UNKNOWN', "status" TEXT NOT NULL DEFAULT 'DRAFT', "verifiedBy" TEXT,
 "verifiedAt" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL, CHECK ("applicationClose">"applicationOpen")
);
CREATE INDEX "UniversityProgramIntake_programId_status_applicationClose_id_idx" ON "UniversityProgramIntake"("programId","status","applicationClose","id");
