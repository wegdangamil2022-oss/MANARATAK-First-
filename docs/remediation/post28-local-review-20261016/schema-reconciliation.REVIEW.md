# مقترح تعديل Prisma schema — غير مطبق

هذا توثيق مراجعة، وليس تغييرًا في schema المعتمدة. الكتلة التالية هي الـunified diff الذي اجتاز `git apply --check` خارجالمصدر، والمرشح الناتج اجتاز Prisma5.22 validate. التنفيذ وإعادة الترحيلات والـtypes/runtime ما زالت محجوبة حتى المراجعة.

```diff
--- a/packages/infrastructure/prisma/schema.prisma
+++ b/packages/infrastructure/prisma/schema.prisma
@@ -2047,6 +2047,10 @@
   @@index([disciplineId])
   @@index([currentPublishedVersionId])
   @@index([displayName])
+
+  publicationSnapshots MajorPublicationSnapshot[] @relation("MajorPublicationSnapshotMajor")
+
+  candidateDecisions NewMajorCandidateDecision[] @relation("NewMajorCandidateDecisionMajor")
 }

 model MajorVersion {
@@ -2081,6 +2085,8 @@
   @@index([status])
   @@index([sourceHash])
   @@index([sourceImportRecordId])
+
+  publicationSnapshot MajorPublicationSnapshot? @relation("MajorPublicationSnapshotVersion")
 }

 model MajorLevelProfile {
@@ -2125,6 +2131,8 @@
   @@index([academicFieldId])
   @@index([disciplineId])
   @@index([currentPublishedVersionId])
+
+  publicationSnapshots MajorPublicationSnapshot[] @relation("MajorPublicationSnapshotProfile")
 }

 model MajorContentSection {
@@ -2344,6 +2352,12 @@
   @@index([status, testCategory])
   @@index([status, completenessStatus])
   @@index([providerName, canonicalName])
+
+  evidenceHistory InternationalTestEvidenceHistory[] @relation("EvidenceHistoryTest")
+
+  governance InternationalTestGovernance? @relation("GovernanceTest")
+
+  publicationSnapshots InternationalTestPublicationSnapshot[] @relation("PublicationSnapshotTest")
 }

 model InternationalTestFamily {
@@ -2424,6 +2438,8 @@
   @@index([status])
   @@index([sourceImportRecordId])
   @@index([sourceHash])
+
+  publicationSnapshot InternationalTestPublicationSnapshot? @relation("PublicationSnapshotVersion")
 }

 model InternationalTestDeliveryModeProfile {
@@ -2944,7 +2960,7 @@
   workspace StudentWorkspace @relation(fields: [studentReferenceId], references: [studentReferenceId], onDelete: Cascade)

   @@id([studentReferenceId, ownerDomain])
-  @@index([ownerDomain, status, checkedAt])
+  @@index([ownerDomain, status, checkedAt], map:"StudentSupportOwnerReadObservation_ownerDomain_status_checkedAt")
 }

 model StudentSavedItem {
@@ -3258,6 +3274,14 @@
   @@index([authorId])
   @@index([ownerId])
   @@unique([siteIdentifier, slug])
+
+  @@index([publicId(ops: raw("gin_trgm_ops"))], type: Gin, map:"CmsContentNode_publicId_trgm")
+
+  @@index([slug(ops: raw("gin_trgm_ops"))], type: Gin, map:"CmsContentNode_slug_trgm")
+
+  @@index([summary(ops: raw("gin_trgm_ops"))], type: Gin, map:"CmsContentNode_summary_trgm")
+
+  @@index([title(ops: raw("gin_trgm_ops"))], type: Gin, map:"CmsContentNode_title_trgm")
 }


@@ -3310,6 +3334,12 @@
   @@unique([siteIdentifier, locale, localizedSlug])
   @@index([state, scheduledAt])
   @@index([contentId, state])
+
+  @@index([localizedSlug(ops: raw("gin_trgm_ops"))], type: Gin, map:"CmsLocalizedContent_slug_trgm")
+
+  @@index([summary(ops: raw("gin_trgm_ops"))], type: Gin, map:"CmsLocalizedContent_summary_trgm")
+
+  @@index([title(ops: raw("gin_trgm_ops"))], type: Gin, map:"CmsLocalizedContent_title_trgm")
 }

 model CmsCategory {
@@ -3432,6 +3462,12 @@
   @@index([siteIdentifier, locale, status, publishedAt], map: "CmsPublishedContent_siteIdentifier_locale_status_publishedAt_id")
   @@index([contentType, locale, status])
   @@index([categorySlug, locale, status])
+
+  @@index([body(ops: raw("gin_trgm_ops"))], type: Gin, map:"CmsPublishedContent_body_trgm")
+
+  @@index([summary(ops: raw("gin_trgm_ops"))], type: Gin, map:"CmsPublishedContent_summary_trgm")
+
+  @@index([title(ops: raw("gin_trgm_ops"))], type: Gin, map:"CmsPublishedContent_title_trgm")
 }

 model CmsEditorialLedger {
@@ -5156,6 +5192,8 @@
   @@index([studentReferenceId, status, updatedAt])
   @@index([serviceId, status])
   @@index([financeInvoiceId])
+
+  @@index([assignedStaffId,status,dueAt], map:"ServiceRequestRecord_staff_due")
 }


@@ -5699,7 +5737,7 @@
   attempts Int
   providerMessageId String?
   updatedAt DateTime @updatedAt
-  intent NotificationIntentRecord @relation(fields: [intentId], references: [id], onDelete: Cascade)
+  intent NotificationIntentRecord @relation(fields: [intentId], references: [id], onDelete: Cascade, onUpdate:NoAction)
   @@id([intentId, channel])
 }

@@ -5708,7 +5746,7 @@
   attempt Int
   recipientReference String
   reservedAt DateTime
-  intent NotificationIntentRecord @relation(fields: [intentId], references: [id], onDelete: Cascade)
+  intent NotificationIntentRecord @relation(fields: [intentId], references: [id], onDelete: Cascade, onUpdate:NoAction)
   @@id([intentId, attempt])
   @@index([recipientReference, reservedAt])
 }
@@ -5832,6 +5870,8 @@
   revision Int @default(0)
   approval Json?
   verification Json?
+
+  test InternationalTest @relation("GovernanceTest", fields:[testId], references:[id], onDelete:Restrict, onUpdate:NoAction, map:"InternationalTestGovernance_testId_fkey")
 }
 model InternationalTestPublicationSnapshot {
   id String @id
@@ -5841,6 +5881,10 @@
   reviewerId String
   publishedAt DateTime @default(now())
   @@index([testId, publishedAt])
+
+  version InternationalTestVersion @relation("PublicationSnapshotVersion", fields:[id], references:[id], onDelete:Restrict, onUpdate:NoAction, map:"InternationalTestPublicationSnapshot_id_fkey")
+
+  test InternationalTest @relation("PublicationSnapshotTest", fields:[testId], references:[id], onDelete:Restrict, onUpdate:NoAction, map:"InternationalTestPublicationSnapshot_testId_fkey")
 }
 model InternationalTestEvidenceHistory {
   id String @id
@@ -5849,6 +5893,8 @@
   actorId String
   capturedAt DateTime @default(now())
   @@index([testId, capturedAt])
+
+  test InternationalTest @relation("EvidenceHistoryTest", fields:[testId], references:[id], onDelete:Restrict, onUpdate:NoAction, map:"InternationalTestEvidenceHistory_testId_fkey")
 }

 // P10 governance; source-only activation. SQL supplies owner FKs and insert-only triggers.
@@ -5863,6 +5909,8 @@
   evidence Json
   createdAt DateTime @default(now())
   @@index([candidateKey, sourceDigest])
+
+  major Major? @relation("NewMajorCandidateDecisionMajor", fields:[majorId], references:[id], onDelete:Restrict, onUpdate:NoAction, map:"NewMajorCandidateDecision_majorId_fkey")
 }

 model MajorPublicationSnapshot {
@@ -5873,6 +5921,12 @@
   reviewerId String
   publishedAt DateTime @default(now())
   @@index([majorId, profileId])
+
+  major Major @relation("MajorPublicationSnapshotMajor", fields:[majorId], references:[id], onDelete:Restrict, onUpdate:NoAction, map:"MajorPublicationSnapshot_majorId_fkey")
+
+  profile MajorLevelProfile @relation("MajorPublicationSnapshotProfile", fields:[profileId], references:[id], onDelete:Restrict, onUpdate:NoAction, map:"MajorPublicationSnapshot_profileId_fkey")
+
+  version MajorVersion @relation("MajorPublicationSnapshotVersion", fields:[versionId], references:[id], onDelete:Restrict, onUpdate:NoAction, map:"MajorPublicationSnapshot_versionId_fkey")
 }

 // P19 source-only remediation. Deploy separately after legacy financial-state review.
@@ -6006,16 +6060,16 @@
   officialSourceUrl String?
   verifiedBy String?
   verifiedAt DateTime?
-  program UniversityAcademicProgram @relation(fields:[programId], references:[id], onDelete:Restrict)
+  program UniversityAcademicProgram @relation(fields:[programId], references:[id], onDelete:Restrict, onUpdate:NoAction)
   languages UniversityProgramStudyLanguage[]
 }
 model UniversityProgramStudyLanguage {
   programId String
   languageReferenceId String
-  profile UniversityProgramStudyProfile @relation(fields:[programId], references:[programId], onDelete:Restrict)
-  language ReferenceLanguage @relation(fields:[languageReferenceId], references:[id], onDelete:Restrict)
+  profile UniversityProgramStudyProfile @relation(fields:[programId], references:[programId], onDelete:Restrict, onUpdate:NoAction)
+  language ReferenceLanguage @relation(fields:[languageReferenceId], references:[id], onDelete:Restrict, onUpdate:NoAction)
   @@id([programId,languageReferenceId])
-  @@index([languageReferenceId,programId])
+  @@index([languageReferenceId,programId], map:"UniversityProgramStudyLanguage_languageReferenceId_programId_id")
 }
 model UniversityProgramIntake {
   id String @id
@@ -6031,8 +6085,8 @@
   verifiedBy String?
   verifiedAt DateTime?
   updatedAt DateTime @updatedAt
-  program UniversityAcademicProgram @relation(fields:[programId], references:[id], onDelete:Restrict)
-  @@index([programId,status,applicationClose,id])
+  program UniversityAcademicProgram @relation(fields:[programId], references:[id], onDelete:Restrict, onUpdate:NoAction)
+  @@index([programId,status,applicationClose,id], map:"UniversityProgramIntake_programId_status_applicationClose_id_id")
 }

 // Owner-scoped processing evidence, not a second canonical translation store.
@@ -6047,7 +6101,7 @@
   digest String
   outcome String
   createdAt DateTime @default(now())
-  @@unique([ownerDomain, targetId, handoffId])
+  @@unique([ownerDomain, targetId, handoffId], map:"OwnerTranslationTransferReceipt_ownerDomain_targetId_handoffId_")
   @@index([approvalId])
 }

```
