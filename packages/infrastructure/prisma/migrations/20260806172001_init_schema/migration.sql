-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettingDefinitionRecord" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueType" TEXT NOT NULL,
    "description" TEXT,
    "defaultValue" JSONB,
    "isFeatureFlag" BOOLEAN NOT NULL DEFAULT false,
    "isDeprecated" BOOLEAN NOT NULL DEFAULT false,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettingDefinitionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettingAssignmentRecord" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "scopeLevel" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "currentVersionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettingAssignmentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettingVersionRecord" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "valueType" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rollbackOfVersionId" TEXT,

    CONSTRAINT "SettingVersionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "batchStatus" TEXT NOT NULL,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "processedRecords" INTEGER NOT NULL DEFAULT 0,
    "failedRecords" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRecord" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "validationErrors" JSONB,
    "processingNotes" TEXT,
    "sourceDedupKey" TEXT,
    "promotedEntityId" TEXT,
    "chunkIndex" INTEGER,
    "recordOffset" INTEGER,
    "sourceRowNumber" INTEGER,
    "retentionExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "University" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "canonicalDedupKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "institutionType" TEXT,
    "officialWebsite" TEXT,
    "status" TEXT NOT NULL,
    "completenessStatus" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "officialSourceUrl" TEXT,
    "logoAssetId" TEXT,
    "foundedYear" INTEGER,
    "sourceImportRecordId" TEXT,
    "optionalFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "University_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scholarship" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "canonicalDedupKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "providerName" TEXT,
    "status" TEXT NOT NULL,
    "completenessStatus" TEXT NOT NULL,
    "amountMinorUnits" TEXT,
    "amountCurrencyCode" TEXT,
    "isFullyFunded" BOOLEAN NOT NULL DEFAULT false,
    "applicationDeadline" TIMESTAMP(3),
    "officialWebsite" TEXT,
    "sourceUrl" TEXT,
    "optionalFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scholarship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Major" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "canonicalDedupKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "completenessStatus" TEXT NOT NULL,
    "facultyName" TEXT,
    "academicFieldId" TEXT,
    "disciplineId" TEXT,
    "currentPublishedVersionId" TEXT,
    "optionalFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Major_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MajorVersion" (
    "id" TEXT NOT NULL,
    "majorId" TEXT NOT NULL,
    "profileId" TEXT,
    "versionNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "sourceImportRecordId" TEXT,
    "sourceFileName" TEXT,
    "sourceUri" TEXT,
    "sourceHash" TEXT,
    "importedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "supersededAt" TIMESTAMP(3),
    "changeSummary" JSONB,
    "rawContentBlocks" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MajorVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MajorLevelProfile" (
    "id" TEXT NOT NULL,
    "majorId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "code" TEXT,
    "profileType" TEXT,
    "displayName" TEXT,
    "localizedNameAr" TEXT,
    "localizedNameEn" TEXT,
    "collegeContext" TEXT,
    "academicFieldId" TEXT,
    "disciplineId" TEXT,
    "currentPublishedVersionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'READY_TO_REVIEW',
    "completenessStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MajorLevelProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MajorContentSection" (
    "id" TEXT NOT NULL,
    "profileId" TEXT,
    "versionId" TEXT,
    "sectionKey" TEXT NOT NULL,
    "title" TEXT,
    "locale" TEXT,
    "content" TEXT NOT NULL,
    "sourceSectionPath" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MajorContentSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MajorAlias" (
    "id" TEXT NOT NULL,
    "majorId" TEXT NOT NULL,
    "locale" TEXT,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "aliasType" TEXT NOT NULL DEFAULT 'ALIAS',
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MajorAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MajorRelationship" (
    "id" TEXT NOT NULL,
    "sourceMajorId" TEXT,
    "targetMajorId" TEXT,
    "sourceProfileId" TEXT,
    "targetProfileId" TEXT,
    "relationshipType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MajorRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MajorClassificationMapping" (
    "id" TEXT NOT NULL,
    "majorId" TEXT,
    "profileId" TEXT,
    "taxonomyNodeId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "standardType" TEXT,
    "standardCode" TEXT,
    "confidence" DOUBLE PRECISION,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MajorClassificationMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MajorSource" (
    "id" TEXT NOT NULL,
    "majorId" TEXT,
    "profileId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUri" TEXT,
    "sourceHash" TEXT,
    "importedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MajorSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FellowshipDefinition" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "canonicalDedupKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "fellowshipType" TEXT NOT NULL,
    "professionalDomain" TEXT,
    "status" TEXT NOT NULL DEFAULT 'READY_TO_REVIEW',
    "completenessStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
    "linkedMajorId" TEXT,
    "linkedProfileId" TEXT,
    "optionalFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FellowshipDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTest" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "canonicalDedupKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "completenessStatus" TEXT NOT NULL,
    "testCategory" TEXT,
    "providerName" TEXT,
    "familyId" TEXT,
    "providerId" TEXT,
    "currentPublishedVersionId" TEXT,
    "optionalFields" JSONB,
    "sourceImportRecordId" TEXT,
    "localizedNameAr" TEXT,
    "localizedNameEn" TEXT,
    "abbreviation" TEXT,
    "isPubliclyVisible" BOOLEAN NOT NULL DEFAULT false,
    "isSourceVerified" BOOLEAN NOT NULL DEFAULT false,
    "registrationRequirements" TEXT,
    "identificationRequirements" TEXT,
    "retakePolicy" TEXT,
    "cancellationReschedulingNotes" TEXT,
    "accessibilityNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestFamily" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "localizedNameAr" TEXT,
    "localizedNameEn" TEXT,
    "category" TEXT NOT NULL,
    "profileType" TEXT NOT NULL,
    "defaultSectionModel" TEXT NOT NULL,
    "allowsCustomContentBlocks" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestProvider" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "localizedNameAr" TEXT,
    "localizedNameEn" TEXT,
    "providerType" TEXT,
    "officialWebsite" TEXT,
    "countryIso2Code" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestVersion" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "sourceImportRecordId" TEXT,
    "sourceFileName" TEXT,
    "sourceUri" TEXT,
    "sourceHash" TEXT,
    "importedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "supersededAt" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "changeSummary" JSONB,
    "rawContentBlocks" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestDeliveryModeProfile" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "registrationUrl" TEXT,
    "administrationNotes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestDeliveryModeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestVariant" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "variantName" TEXT NOT NULL,
    "deliveryMode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "specificOfficialUrl" TEXT,
    "administrativeNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestSection" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    "order" INTEGER NOT NULL,
    "questionTypes" JSONB,
    "scoreMinimum" DOUBLE PRECISION,
    "scoreMaximum" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestScoreScale" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "overallMinimum" DOUBLE PRECISION NOT NULL,
    "overallMaximum" DOUBLE PRECISION NOT NULL,
    "scoreIncrement" DOUBLE PRECISION,
    "bandsOrLevels" JSONB,
    "passFailRules" TEXT,
    "cefrEquivalency" TEXT,
    "crossTestEquivalency" TEXT,
    "resultValidityDurationMonths" INTEGER,
    "resultDeliveryTimeDays" INTEGER,
    "scoreReportingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestScoreScale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestFeeMetadata" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "feeType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "hasRegionalVariation" BOOLEAN NOT NULL DEFAULT false,
    "validityWindowNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestFeeMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestOfficialLink" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestOfficialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestAvailability" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "availableCountryIds" JSONB NOT NULL,
    "availableCityIds" JSONB,
    "onlineAvailabilityRegions" JSONB,
    "testingWindowsNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestPreparationMaterial" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "materialType" TEXT NOT NULL,
    "url" TEXT,
    "assetId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestPreparationMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestEvidence" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "originalImportedName" TEXT,
    "normalizedCanonicalName" TEXT,
    "deterministicKey" TEXT,
    "sourceId" TEXT,
    "sourceUrl" TEXT,
    "contentHash" TEXT,
    "retrievedAt" TIMESTAMP(3),
    "evidenceSnippet" TEXT,
    "duplicateStatus" TEXT,
    "conflictingFields" JSONB,
    "mergeSuggestions" JSONB,
    "sourceTrustLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestVersionScoreScale" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "scaleName" TEXT NOT NULL,
    "overallMinimum" DOUBLE PRECISION,
    "overallMaximum" DOUBLE PRECISION,
    "scoreIncrement" DOUBLE PRECISION,
    "bandsOrLevels" JSONB,
    "passFailRules" TEXT,
    "cefrEquivalency" TEXT,
    "crossTestEquivalency" TEXT,
    "resultValidityDurationMonths" INTEGER,
    "resultDeliveryTimeDays" INTEGER,
    "scoreReportingUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestVersionScoreScale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestSession" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "versionId" TEXT,
    "deliveryModeId" TEXT,
    "sessionCode" TEXT,
    "title" TEXT NOT NULL,
    "registrationOpensAt" TIMESTAMP(3),
    "registrationClosesAt" TIMESTAMP(3),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "timezone" TEXT,
    "capacity" INTEGER,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestCenter" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "deliveryModeId" TEXT,
    "centerCode" TEXT,
    "displayName" TEXT NOT NULL,
    "countryIso2Code" TEXT,
    "cityName" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "officialUrl" TEXT,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestRequirement" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "versionId" TEXT,
    "requirementType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "appliesTo" JSONB,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestPolicy" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "versionId" TEXT,
    "policyType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceUrl" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestCountryRelationship" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "countryIso2Code" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestCountryRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestLanguageRelationship" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "languageIsoCode" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestLanguageRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestAcademicTaxonomyRelationship" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "taxonomyNodeId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestAcademicTaxonomyRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestDegreeRelationship" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "degreeLevelCode" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestDegreeRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestEquivalencyMapping" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "sourceScale" TEXT NOT NULL,
    "sourceValue" TEXT NOT NULL,
    "targetScale" TEXT NOT NULL,
    "targetValue" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestEquivalencyMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalTestContentBlock" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "blockKey" TEXT NOT NULL,
    "blockType" TEXT NOT NULL,
    "title" TEXT,
    "locale" TEXT,
    "content" TEXT NOT NULL,
    "sourceSectionPath" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternationalTestContentBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetRecord" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "lifecycleState" TEXT NOT NULL,
    "securityClassification" TEXT NOT NULL,
    "retentionCategory" TEXT NOT NULL,
    "retentionExpiresAt" TIMESTAMP(3),
    "quarantineStorageLocator" TEXT,
    "cleanStorageLocator" TEXT,
    "checksumAlgorithm" TEXT,
    "checksumHash" TEXT,
    "metadata" JSONB NOT NULL,
    "versionChain" JSONB,
    "sanitizationMetadata" JSONB,
    "malwareScanStatus" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "purgedAt" TIMESTAMP(3),

    CONSTRAINT "AssetRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentWorkspace" (
    "id" TEXT NOT NULL,
    "studentReferenceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "displayName" TEXT,
    "preferredLanguage" TEXT,
    "avatarAssetId" TEXT,
    "layoutPreferences" JSONB,
    "notificationMatrix" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSavedItem" (
    "id" TEXT NOT NULL,
    "studentReferenceId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entitySlug" TEXT,
    "displayName" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSavedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityRecord" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "IdentityRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRecord" (
    "identityId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "preferredLanguage" TEXT,
    "timeZone" TEXT,
    "primaryEmail" TEXT NOT NULL,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "primaryPhone" TEXT,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "alternativeContacts" JSONB,

    CONSTRAINT "UserRecord_pkey" PRIMARY KEY ("identityId")
);

-- CreateTable
CREATE TABLE "AccountRecord" (
    "identityId" TEXT NOT NULL,
    "accessState" TEXT NOT NULL,
    "storageQuotaBytes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rateLimitMax" INTEGER NOT NULL DEFAULT 100,
    "rateLimitWindowMs" INTEGER NOT NULL DEFAULT 60000,
    "configurationFlags" JSONB,

    CONSTRAINT "AccountRecord_pkey" PRIMARY KEY ("identityId")
);

-- CreateTable
CREATE TABLE "RoleRecord" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "policyIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyRecord" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "ruleConfiguration" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAssignmentRecord" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleAssignmentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditRecord" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "contextMetadata" JSONB NOT NULL,
    "complianceMetadata" JSONB,
    "correlationReference" TEXT,
    "traceReference" TEXT,
    "chainReference" TEXT,
    "retentionPeriodInDays" INTEGER,
    "retentionExpiresAt" TIMESTAMP(3),
    "lifecycleState" TEXT NOT NULL DEFAULT 'RECORDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceCountry" (
    "id" TEXT NOT NULL,
    "iso2Code" TEXT NOT NULL,
    "iso3Code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "officialName" TEXT,
    "region" TEXT,
    "subregion" TEXT,
    "defaultCurrencyCode" TEXT,
    "defaultLanguageCode" TEXT,
    "callingCode" TEXT,
    "flagAssetId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceCurrency" (
    "id" TEXT NOT NULL,
    "isoCode" TEXT NOT NULL,
    "numericCode" TEXT,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "minorUnit" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceCurrency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceLanguage" (
    "id" TEXT NOT NULL,
    "isoCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nativeName" TEXT,
    "direction" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceCity" (
    "id" TEXT NOT NULL,
    "countryIso2Code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "timezone" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceCity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicTaxonomyNode" (
    "id" TEXT NOT NULL,
    "deterministicKey" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "canonicalCode" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "standardType" TEXT NOT NULL DEFAULT 'CUSTOM_NATIONAL',
    "standardCode" TEXT,
    "localizedNames" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicTaxonomyNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicTaxonomyEdge" (
    "id" TEXT NOT NULL,
    "parentNodeId" TEXT NOT NULL,
    "childNodeId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicTaxonomyEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicTaxonomyAlias" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "locale" TEXT,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicTaxonomyAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicStandardMapping" (
    "id" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "sourceStandard" TEXT NOT NULL,
    "targetStandard" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicStandardMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SettingDefinitionRecord_key_key" ON "SettingDefinitionRecord"("key");

-- CreateIndex
CREATE INDEX "SettingAssignmentRecord_key_idx" ON "SettingAssignmentRecord"("key");

-- CreateIndex
CREATE INDEX "SettingAssignmentRecord_scopeLevel_scopeId_idx" ON "SettingAssignmentRecord"("scopeLevel", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "SettingAssignmentRecord_key_scopeLevel_scopeId_key" ON "SettingAssignmentRecord"("key", "scopeLevel", "scopeId");

-- CreateIndex
CREATE INDEX "SettingVersionRecord_assignmentId_createdAt_idx" ON "SettingVersionRecord"("assignmentId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportBatch_batchStatus_idx" ON "ImportBatch"("batchStatus");

-- CreateIndex
CREATE INDEX "ImportBatch_dataType_idx" ON "ImportBatch"("dataType");

-- CreateIndex
CREATE INDEX "ImportBatch_batchStatus_dataType_idx" ON "ImportBatch"("batchStatus", "dataType");

-- CreateIndex
CREATE INDEX "ImportRecord_batchId_idx" ON "ImportRecord"("batchId");

-- CreateIndex
CREATE INDEX "ImportRecord_batchId_status_idx" ON "ImportRecord"("batchId", "status");

-- CreateIndex
CREATE INDEX "ImportRecord_batchId_chunkIndex_idx" ON "ImportRecord"("batchId", "chunkIndex");

-- CreateIndex
CREATE INDEX "ImportRecord_batchId_sourceDedupKey_idx" ON "ImportRecord"("batchId", "sourceDedupKey");

-- CreateIndex
CREATE INDEX "ImportRecord_retentionExpiresAt_idx" ON "ImportRecord"("retentionExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "University_publicId_key" ON "University"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "University_slug_key" ON "University"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "University_canonicalDedupKey_key" ON "University"("canonicalDedupKey");

-- CreateIndex
CREATE UNIQUE INDEX "Scholarship_publicId_key" ON "Scholarship"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Scholarship_slug_key" ON "Scholarship"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Scholarship_canonicalDedupKey_key" ON "Scholarship"("canonicalDedupKey");

-- CreateIndex
CREATE UNIQUE INDEX "Major_publicId_key" ON "Major"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Major_slug_key" ON "Major"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Major_canonicalDedupKey_key" ON "Major"("canonicalDedupKey");

-- CreateIndex
CREATE INDEX "Major_status_idx" ON "Major"("status");

-- CreateIndex
CREATE INDEX "Major_completenessStatus_idx" ON "Major"("completenessStatus");

-- CreateIndex
CREATE INDEX "Major_academicFieldId_idx" ON "Major"("academicFieldId");

-- CreateIndex
CREATE INDEX "Major_disciplineId_idx" ON "Major"("disciplineId");

-- CreateIndex
CREATE INDEX "Major_currentPublishedVersionId_idx" ON "Major"("currentPublishedVersionId");

-- CreateIndex
CREATE INDEX "Major_displayName_idx" ON "Major"("displayName");

-- CreateIndex
CREATE INDEX "MajorVersion_majorId_idx" ON "MajorVersion"("majorId");

-- CreateIndex
CREATE INDEX "MajorVersion_profileId_idx" ON "MajorVersion"("profileId");

-- CreateIndex
CREATE INDEX "MajorVersion_status_idx" ON "MajorVersion"("status");

-- CreateIndex
CREATE INDEX "MajorVersion_sourceHash_idx" ON "MajorVersion"("sourceHash");

-- CreateIndex
CREATE INDEX "MajorVersion_sourceImportRecordId_idx" ON "MajorVersion"("sourceImportRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "MajorVersion_majorId_profileId_versionNumber_key" ON "MajorVersion"("majorId", "profileId", "versionNumber");

-- CreateIndex
CREATE INDEX "MajorLevelProfile_majorId_idx" ON "MajorLevelProfile"("majorId");

-- CreateIndex
CREATE INDEX "MajorLevelProfile_level_idx" ON "MajorLevelProfile"("level");

-- CreateIndex
CREATE INDEX "MajorLevelProfile_status_idx" ON "MajorLevelProfile"("status");

-- CreateIndex
CREATE INDEX "MajorLevelProfile_completenessStatus_idx" ON "MajorLevelProfile"("completenessStatus");

-- CreateIndex
CREATE INDEX "MajorLevelProfile_academicFieldId_idx" ON "MajorLevelProfile"("academicFieldId");

-- CreateIndex
CREATE INDEX "MajorLevelProfile_disciplineId_idx" ON "MajorLevelProfile"("disciplineId");

-- CreateIndex
CREATE INDEX "MajorLevelProfile_currentPublishedVersionId_idx" ON "MajorLevelProfile"("currentPublishedVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "MajorLevelProfile_majorId_level_code_key" ON "MajorLevelProfile"("majorId", "level", "code");

-- CreateIndex
CREATE INDEX "MajorContentSection_profileId_idx" ON "MajorContentSection"("profileId");

-- CreateIndex
CREATE INDEX "MajorContentSection_versionId_idx" ON "MajorContentSection"("versionId");

-- CreateIndex
CREATE INDEX "MajorContentSection_sectionKey_idx" ON "MajorContentSection"("sectionKey");

-- CreateIndex
CREATE INDEX "MajorContentSection_reviewStatus_idx" ON "MajorContentSection"("reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "MajorContentSection_profileId_versionId_sectionKey_locale_key" ON "MajorContentSection"("profileId", "versionId", "sectionKey", "locale");

-- CreateIndex
CREATE INDEX "MajorAlias_majorId_idx" ON "MajorAlias"("majorId");

-- CreateIndex
CREATE INDEX "MajorAlias_normalizedAlias_idx" ON "MajorAlias"("normalizedAlias");

-- CreateIndex
CREATE INDEX "MajorAlias_locale_normalizedAlias_idx" ON "MajorAlias"("locale", "normalizedAlias");

-- CreateIndex
CREATE INDEX "MajorAlias_aliasType_idx" ON "MajorAlias"("aliasType");

-- CreateIndex
CREATE UNIQUE INDEX "MajorAlias_majorId_locale_normalizedAlias_aliasType_key" ON "MajorAlias"("majorId", "locale", "normalizedAlias", "aliasType");

-- CreateIndex
CREATE INDEX "MajorRelationship_sourceMajorId_idx" ON "MajorRelationship"("sourceMajorId");

-- CreateIndex
CREATE INDEX "MajorRelationship_targetMajorId_idx" ON "MajorRelationship"("targetMajorId");

-- CreateIndex
CREATE INDEX "MajorRelationship_sourceProfileId_idx" ON "MajorRelationship"("sourceProfileId");

-- CreateIndex
CREATE INDEX "MajorRelationship_targetProfileId_idx" ON "MajorRelationship"("targetProfileId");

-- CreateIndex
CREATE INDEX "MajorRelationship_relationshipType_idx" ON "MajorRelationship"("relationshipType");

-- CreateIndex
CREATE UNIQUE INDEX "MajorRelationship_sourceMajorId_targetMajorId_sourceProfile_key" ON "MajorRelationship"("sourceMajorId", "targetMajorId", "sourceProfileId", "targetProfileId", "relationshipType");

-- CreateIndex
CREATE INDEX "MajorClassificationMapping_majorId_idx" ON "MajorClassificationMapping"("majorId");

-- CreateIndex
CREATE INDEX "MajorClassificationMapping_profileId_idx" ON "MajorClassificationMapping"("profileId");

-- CreateIndex
CREATE INDEX "MajorClassificationMapping_taxonomyNodeId_idx" ON "MajorClassificationMapping"("taxonomyNodeId");

-- CreateIndex
CREATE INDEX "MajorClassificationMapping_relationshipType_idx" ON "MajorClassificationMapping"("relationshipType");

-- CreateIndex
CREATE UNIQUE INDEX "MajorClassificationMapping_majorId_profileId_taxonomyNodeId_key" ON "MajorClassificationMapping"("majorId", "profileId", "taxonomyNodeId", "relationshipType");

-- CreateIndex
CREATE INDEX "MajorSource_majorId_idx" ON "MajorSource"("majorId");

-- CreateIndex
CREATE INDEX "MajorSource_profileId_idx" ON "MajorSource"("profileId");

-- CreateIndex
CREATE INDEX "MajorSource_sourceType_idx" ON "MajorSource"("sourceType");

-- CreateIndex
CREATE INDEX "MajorSource_sourceHash_idx" ON "MajorSource"("sourceHash");

-- CreateIndex
CREATE UNIQUE INDEX "FellowshipDefinition_publicId_key" ON "FellowshipDefinition"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "FellowshipDefinition_slug_key" ON "FellowshipDefinition"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FellowshipDefinition_canonicalDedupKey_key" ON "FellowshipDefinition"("canonicalDedupKey");

-- CreateIndex
CREATE INDEX "FellowshipDefinition_status_idx" ON "FellowshipDefinition"("status");

-- CreateIndex
CREATE INDEX "FellowshipDefinition_fellowshipType_idx" ON "FellowshipDefinition"("fellowshipType");

-- CreateIndex
CREATE INDEX "FellowshipDefinition_professionalDomain_idx" ON "FellowshipDefinition"("professionalDomain");

-- CreateIndex
CREATE INDEX "FellowshipDefinition_linkedMajorId_idx" ON "FellowshipDefinition"("linkedMajorId");

-- CreateIndex
CREATE INDEX "FellowshipDefinition_linkedProfileId_idx" ON "FellowshipDefinition"("linkedProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "InternationalTest_publicId_key" ON "InternationalTest"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "InternationalTest_slug_key" ON "InternationalTest"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "InternationalTest_canonicalDedupKey_key" ON "InternationalTest"("canonicalDedupKey");

-- CreateIndex
CREATE INDEX "InternationalTest_status_idx" ON "InternationalTest"("status");

-- CreateIndex
CREATE INDEX "InternationalTest_testCategory_idx" ON "InternationalTest"("testCategory");

-- CreateIndex
CREATE INDEX "InternationalTest_providerName_idx" ON "InternationalTest"("providerName");

-- CreateIndex
CREATE INDEX "InternationalTest_familyId_idx" ON "InternationalTest"("familyId");

-- CreateIndex
CREATE INDEX "InternationalTest_providerId_idx" ON "InternationalTest"("providerId");

-- CreateIndex
CREATE INDEX "InternationalTest_currentPublishedVersionId_idx" ON "InternationalTest"("currentPublishedVersionId");

-- CreateIndex
CREATE INDEX "InternationalTest_completenessStatus_idx" ON "InternationalTest"("completenessStatus");

-- CreateIndex
CREATE INDEX "InternationalTest_status_testCategory_idx" ON "InternationalTest"("status", "testCategory");

-- CreateIndex
CREATE INDEX "InternationalTest_status_completenessStatus_idx" ON "InternationalTest"("status", "completenessStatus");

-- CreateIndex
CREATE INDEX "InternationalTest_providerName_canonicalName_idx" ON "InternationalTest"("providerName", "canonicalName");

-- CreateIndex
CREATE UNIQUE INDEX "InternationalTestFamily_key_key" ON "InternationalTestFamily"("key");

-- CreateIndex
CREATE INDEX "InternationalTestFamily_category_idx" ON "InternationalTestFamily"("category");

-- CreateIndex
CREATE INDEX "InternationalTestFamily_displayName_idx" ON "InternationalTestFamily"("displayName");

-- CreateIndex
CREATE UNIQUE INDEX "InternationalTestProvider_key_key" ON "InternationalTestProvider"("key");

-- CreateIndex
CREATE INDEX "InternationalTestProvider_providerType_idx" ON "InternationalTestProvider"("providerType");

-- CreateIndex
CREATE INDEX "InternationalTestProvider_countryIso2Code_idx" ON "InternationalTestProvider"("countryIso2Code");

-- CreateIndex
CREATE INDEX "InternationalTestProvider_displayName_idx" ON "InternationalTestProvider"("displayName");

-- CreateIndex
CREATE INDEX "InternationalTestVersion_testId_idx" ON "InternationalTestVersion"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestVersion_status_idx" ON "InternationalTestVersion"("status");

-- CreateIndex
CREATE INDEX "InternationalTestVersion_sourceImportRecordId_idx" ON "InternationalTestVersion"("sourceImportRecordId");

-- CreateIndex
CREATE INDEX "InternationalTestVersion_sourceHash_idx" ON "InternationalTestVersion"("sourceHash");

-- CreateIndex
CREATE UNIQUE INDEX "InternationalTestVersion_testId_versionNumber_key" ON "InternationalTestVersion"("testId", "versionNumber");

-- CreateIndex
CREATE INDEX "InternationalTestDeliveryModeProfile_versionId_idx" ON "InternationalTestDeliveryModeProfile"("versionId");

-- CreateIndex
CREATE INDEX "InternationalTestDeliveryModeProfile_mode_idx" ON "InternationalTestDeliveryModeProfile"("mode");

-- CreateIndex
CREATE UNIQUE INDEX "InternationalTestDeliveryModeProfile_versionId_mode_display_key" ON "InternationalTestDeliveryModeProfile"("versionId", "mode", "displayName");

-- CreateIndex
CREATE INDEX "InternationalTestVariant_testId_idx" ON "InternationalTestVariant"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestVariant_deliveryMode_idx" ON "InternationalTestVariant"("deliveryMode");

-- CreateIndex
CREATE INDEX "InternationalTestSection_testId_idx" ON "InternationalTestSection"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestSection_testId_order_idx" ON "InternationalTestSection"("testId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "InternationalTestScoreScale_testId_key" ON "InternationalTestScoreScale"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestScoreScale_testId_idx" ON "InternationalTestScoreScale"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestFeeMetadata_testId_idx" ON "InternationalTestFeeMetadata"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestFeeMetadata_currencyCode_idx" ON "InternationalTestFeeMetadata"("currencyCode");

-- CreateIndex
CREATE INDEX "InternationalTestOfficialLink_testId_idx" ON "InternationalTestOfficialLink"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestOfficialLink_linkType_idx" ON "InternationalTestOfficialLink"("linkType");

-- CreateIndex
CREATE UNIQUE INDEX "InternationalTestAvailability_testId_key" ON "InternationalTestAvailability"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestAvailability_testId_idx" ON "InternationalTestAvailability"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestPreparationMaterial_testId_idx" ON "InternationalTestPreparationMaterial"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestPreparationMaterial_assetId_idx" ON "InternationalTestPreparationMaterial"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "InternationalTestEvidence_testId_key" ON "InternationalTestEvidence"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestEvidence_testId_idx" ON "InternationalTestEvidence"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestEvidence_deterministicKey_idx" ON "InternationalTestEvidence"("deterministicKey");

-- CreateIndex
CREATE INDEX "InternationalTestEvidence_contentHash_idx" ON "InternationalTestEvidence"("contentHash");

-- CreateIndex
CREATE INDEX "InternationalTestVersionScoreScale_versionId_idx" ON "InternationalTestVersionScoreScale"("versionId");

-- CreateIndex
CREATE UNIQUE INDEX "InternationalTestVersionScoreScale_versionId_scaleName_key" ON "InternationalTestVersionScoreScale"("versionId", "scaleName");

-- CreateIndex
CREATE INDEX "InternationalTestSession_testId_idx" ON "InternationalTestSession"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestSession_versionId_idx" ON "InternationalTestSession"("versionId");

-- CreateIndex
CREATE INDEX "InternationalTestSession_deliveryModeId_idx" ON "InternationalTestSession"("deliveryModeId");

-- CreateIndex
CREATE INDEX "InternationalTestSession_status_idx" ON "InternationalTestSession"("status");

-- CreateIndex
CREATE INDEX "InternationalTestSession_startsAt_idx" ON "InternationalTestSession"("startsAt");

-- CreateIndex
CREATE INDEX "InternationalTestCenter_testId_idx" ON "InternationalTestCenter"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestCenter_deliveryModeId_idx" ON "InternationalTestCenter"("deliveryModeId");

-- CreateIndex
CREATE INDEX "InternationalTestCenter_countryIso2Code_idx" ON "InternationalTestCenter"("countryIso2Code");

-- CreateIndex
CREATE INDEX "InternationalTestCenter_cityName_idx" ON "InternationalTestCenter"("cityName");

-- CreateIndex
CREATE INDEX "InternationalTestCenter_status_idx" ON "InternationalTestCenter"("status");

-- CreateIndex
CREATE INDEX "InternationalTestRequirement_testId_idx" ON "InternationalTestRequirement"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestRequirement_versionId_idx" ON "InternationalTestRequirement"("versionId");

-- CreateIndex
CREATE INDEX "InternationalTestRequirement_requirementType_idx" ON "InternationalTestRequirement"("requirementType");

-- CreateIndex
CREATE INDEX "InternationalTestRequirement_isMandatory_idx" ON "InternationalTestRequirement"("isMandatory");

-- CreateIndex
CREATE INDEX "InternationalTestPolicy_testId_idx" ON "InternationalTestPolicy"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestPolicy_versionId_idx" ON "InternationalTestPolicy"("versionId");

-- CreateIndex
CREATE INDEX "InternationalTestPolicy_policyType_idx" ON "InternationalTestPolicy"("policyType");

-- CreateIndex
CREATE INDEX "InternationalTestPolicy_effectiveFrom_idx" ON "InternationalTestPolicy"("effectiveFrom");

-- CreateIndex
CREATE INDEX "InternationalTestCountryRelationship_testId_idx" ON "InternationalTestCountryRelationship"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestCountryRelationship_countryIso2Code_idx" ON "InternationalTestCountryRelationship"("countryIso2Code");

-- CreateIndex
CREATE INDEX "InternationalTestCountryRelationship_relationshipType_idx" ON "InternationalTestCountryRelationship"("relationshipType");

-- CreateIndex
CREATE UNIQUE INDEX "InternationalTestCountryRelationship_testId_countryIso2Code_key" ON "InternationalTestCountryRelationship"("testId", "countryIso2Code", "relationshipType");

-- CreateIndex
CREATE INDEX "InternationalTestLanguageRelationship_testId_idx" ON "InternationalTestLanguageRelationship"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestLanguageRelationship_languageIsoCode_idx" ON "InternationalTestLanguageRelationship"("languageIsoCode");

-- CreateIndex
CREATE INDEX "InternationalTestLanguageRelationship_relationshipType_idx" ON "InternationalTestLanguageRelationship"("relationshipType");

-- CreateIndex
CREATE UNIQUE INDEX "InternationalTestLanguageRelationship_testId_languageIsoCod_key" ON "InternationalTestLanguageRelationship"("testId", "languageIsoCode", "relationshipType");

-- CreateIndex
CREATE INDEX "InternationalTestAcademicTaxonomyRelationship_testId_idx" ON "InternationalTestAcademicTaxonomyRelationship"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestAcademicTaxonomyRelationship_taxonomyNodeI_idx" ON "InternationalTestAcademicTaxonomyRelationship"("taxonomyNodeId");

-- CreateIndex
CREATE INDEX "InternationalTestAcademicTaxonomyRelationship_relationshipT_idx" ON "InternationalTestAcademicTaxonomyRelationship"("relationshipType");

-- CreateIndex
CREATE UNIQUE INDEX "InternationalTestAcademicTaxonomyRelationship_testId_taxono_key" ON "InternationalTestAcademicTaxonomyRelationship"("testId", "taxonomyNodeId", "relationshipType");

-- CreateIndex
CREATE INDEX "InternationalTestDegreeRelationship_testId_idx" ON "InternationalTestDegreeRelationship"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestDegreeRelationship_degreeLevelCode_idx" ON "InternationalTestDegreeRelationship"("degreeLevelCode");

-- CreateIndex
CREATE INDEX "InternationalTestDegreeRelationship_relationshipType_idx" ON "InternationalTestDegreeRelationship"("relationshipType");

-- CreateIndex
CREATE UNIQUE INDEX "InternationalTestDegreeRelationship_testId_degreeLevelCode__key" ON "InternationalTestDegreeRelationship"("testId", "degreeLevelCode", "relationshipType");

-- CreateIndex
CREATE INDEX "InternationalTestEquivalencyMapping_testId_idx" ON "InternationalTestEquivalencyMapping"("testId");

-- CreateIndex
CREATE INDEX "InternationalTestEquivalencyMapping_sourceScale_idx" ON "InternationalTestEquivalencyMapping"("sourceScale");

-- CreateIndex
CREATE INDEX "InternationalTestEquivalencyMapping_targetScale_idx" ON "InternationalTestEquivalencyMapping"("targetScale");

-- CreateIndex
CREATE UNIQUE INDEX "InternationalTestEquivalencyMapping_testId_sourceScale_sour_key" ON "InternationalTestEquivalencyMapping"("testId", "sourceScale", "sourceValue", "targetScale");

-- CreateIndex
CREATE INDEX "InternationalTestContentBlock_versionId_idx" ON "InternationalTestContentBlock"("versionId");

-- CreateIndex
CREATE INDEX "InternationalTestContentBlock_blockType_idx" ON "InternationalTestContentBlock"("blockType");

-- CreateIndex
CREATE INDEX "InternationalTestContentBlock_reviewStatus_idx" ON "InternationalTestContentBlock"("reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "InternationalTestContentBlock_versionId_blockKey_locale_key" ON "InternationalTestContentBlock"("versionId", "blockKey", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "AssetRecord_reference_key" ON "AssetRecord"("reference");

-- CreateIndex
CREATE INDEX "AssetRecord_ownerId_ownerType_idx" ON "AssetRecord"("ownerId", "ownerType");

-- CreateIndex
CREATE INDEX "AssetRecord_lifecycleState_idx" ON "AssetRecord"("lifecycleState");

-- CreateIndex
CREATE UNIQUE INDEX "StudentWorkspace_studentReferenceId_key" ON "StudentWorkspace"("studentReferenceId");

-- CreateIndex
CREATE INDEX "RoleAssignmentRecord_identityId_idx" ON "RoleAssignmentRecord"("identityId");

-- CreateIndex
CREATE INDEX "RoleAssignmentRecord_roleId_idx" ON "RoleAssignmentRecord"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditRecord_reference_key" ON "AuditRecord"("reference");

-- CreateIndex
CREATE INDEX "AuditRecord_actorId_idx" ON "AuditRecord"("actorId");

-- CreateIndex
CREATE INDEX "AuditRecord_targetId_idx" ON "AuditRecord"("targetId");

-- CreateIndex
CREATE INDEX "AuditRecord_action_idx" ON "AuditRecord"("action");

-- CreateIndex
CREATE INDEX "AuditRecord_category_idx" ON "AuditRecord"("category");

-- CreateIndex
CREATE INDEX "AuditRecord_severity_idx" ON "AuditRecord"("severity");

-- CreateIndex
CREATE INDEX "AuditRecord_correlationReference_idx" ON "AuditRecord"("correlationReference");

-- CreateIndex
CREATE INDEX "AuditRecord_timestamp_idx" ON "AuditRecord"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceCountry_iso2Code_key" ON "ReferenceCountry"("iso2Code");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceCountry_iso3Code_key" ON "ReferenceCountry"("iso3Code");

-- CreateIndex
CREATE INDEX "ReferenceCountry_region_idx" ON "ReferenceCountry"("region");

-- CreateIndex
CREATE INDEX "ReferenceCountry_isActive_idx" ON "ReferenceCountry"("isActive");

-- CreateIndex
CREATE INDEX "ReferenceCountry_name_idx" ON "ReferenceCountry"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceCurrency_isoCode_key" ON "ReferenceCurrency"("isoCode");

-- CreateIndex
CREATE INDEX "ReferenceCurrency_isActive_idx" ON "ReferenceCurrency"("isActive");

-- CreateIndex
CREATE INDEX "ReferenceCurrency_name_idx" ON "ReferenceCurrency"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceLanguage_isoCode_key" ON "ReferenceLanguage"("isoCode");

-- CreateIndex
CREATE INDEX "ReferenceLanguage_isActive_idx" ON "ReferenceLanguage"("isActive");

-- CreateIndex
CREATE INDEX "ReferenceLanguage_name_idx" ON "ReferenceLanguage"("name");

-- CreateIndex
CREATE INDEX "ReferenceLanguage_direction_idx" ON "ReferenceLanguage"("direction");

-- CreateIndex
CREATE INDEX "ReferenceCity_countryIso2Code_idx" ON "ReferenceCity"("countryIso2Code");

-- CreateIndex
CREATE INDEX "ReferenceCity_countryIso2Code_name_idx" ON "ReferenceCity"("countryIso2Code", "name");

-- CreateIndex
CREATE INDEX "ReferenceCity_region_idx" ON "ReferenceCity"("region");

-- CreateIndex
CREATE INDEX "ReferenceCity_isActive_idx" ON "ReferenceCity"("isActive");

-- CreateIndex
CREATE INDEX "ReferenceCity_timezone_idx" ON "ReferenceCity"("timezone");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicTaxonomyNode_deterministicKey_key" ON "AcademicTaxonomyNode"("deterministicKey");

-- CreateIndex
CREATE INDEX "AcademicTaxonomyNode_nodeType_idx" ON "AcademicTaxonomyNode"("nodeType");

-- CreateIndex
CREATE INDEX "AcademicTaxonomyNode_status_idx" ON "AcademicTaxonomyNode"("status");

-- CreateIndex
CREATE INDEX "AcademicTaxonomyNode_standardType_standardCode_idx" ON "AcademicTaxonomyNode"("standardType", "standardCode");

-- CreateIndex
CREATE INDEX "AcademicTaxonomyNode_canonicalCode_idx" ON "AcademicTaxonomyNode"("canonicalCode");

-- CreateIndex
CREATE INDEX "AcademicTaxonomyNode_canonicalName_idx" ON "AcademicTaxonomyNode"("canonicalName");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicTaxonomyNode_nodeType_canonicalCode_standardType_key" ON "AcademicTaxonomyNode"("nodeType", "canonicalCode", "standardType");

-- CreateIndex
CREATE INDEX "AcademicTaxonomyEdge_parentNodeId_idx" ON "AcademicTaxonomyEdge"("parentNodeId");

-- CreateIndex
CREATE INDEX "AcademicTaxonomyEdge_childNodeId_idx" ON "AcademicTaxonomyEdge"("childNodeId");

-- CreateIndex
CREATE INDEX "AcademicTaxonomyEdge_isPrimary_idx" ON "AcademicTaxonomyEdge"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicTaxonomyEdge_parentNodeId_childNodeId_key" ON "AcademicTaxonomyEdge"("parentNodeId", "childNodeId");

-- CreateIndex
CREATE INDEX "AcademicTaxonomyAlias_nodeId_idx" ON "AcademicTaxonomyAlias"("nodeId");

-- CreateIndex
CREATE INDEX "AcademicTaxonomyAlias_normalizedAlias_idx" ON "AcademicTaxonomyAlias"("normalizedAlias");

-- CreateIndex
CREATE INDEX "AcademicTaxonomyAlias_locale_normalizedAlias_idx" ON "AcademicTaxonomyAlias"("locale", "normalizedAlias");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicTaxonomyAlias_nodeId_locale_normalizedAlias_key" ON "AcademicTaxonomyAlias"("nodeId", "locale", "normalizedAlias");

-- CreateIndex
CREATE INDEX "AcademicStandardMapping_sourceNodeId_idx" ON "AcademicStandardMapping"("sourceNodeId");

-- CreateIndex
CREATE INDEX "AcademicStandardMapping_targetNodeId_idx" ON "AcademicStandardMapping"("targetNodeId");

-- CreateIndex
CREATE INDEX "AcademicStandardMapping_sourceStandard_targetStandard_idx" ON "AcademicStandardMapping"("sourceStandard", "targetStandard");

-- CreateIndex
CREATE INDEX "AcademicStandardMapping_strength_idx" ON "AcademicStandardMapping"("strength");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicStandardMapping_sourceNodeId_targetNodeId_sourceSta_key" ON "AcademicStandardMapping"("sourceNodeId", "targetNodeId", "sourceStandard", "targetStandard");

-- AddForeignKey
ALTER TABLE "SettingVersionRecord" ADD CONSTRAINT "SettingVersionRecord_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "SettingAssignmentRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRecord" ADD CONSTRAINT "ImportRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Major" ADD CONSTRAINT "Major_academicFieldId_fkey" FOREIGN KEY ("academicFieldId") REFERENCES "AcademicTaxonomyNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Major" ADD CONSTRAINT "Major_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "AcademicTaxonomyNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Major" ADD CONSTRAINT "Major_currentPublishedVersionId_fkey" FOREIGN KEY ("currentPublishedVersionId") REFERENCES "MajorVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MajorVersion" ADD CONSTRAINT "MajorVersion_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MajorVersion" ADD CONSTRAINT "MajorVersion_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MajorLevelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MajorLevelProfile" ADD CONSTRAINT "MajorLevelProfile_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MajorLevelProfile" ADD CONSTRAINT "MajorLevelProfile_academicFieldId_fkey" FOREIGN KEY ("academicFieldId") REFERENCES "AcademicTaxonomyNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MajorLevelProfile" ADD CONSTRAINT "MajorLevelProfile_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "AcademicTaxonomyNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MajorLevelProfile" ADD CONSTRAINT "MajorLevelProfile_currentPublishedVersionId_fkey" FOREIGN KEY ("currentPublishedVersionId") REFERENCES "MajorVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MajorContentSection" ADD CONSTRAINT "MajorContentSection_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MajorLevelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MajorContentSection" ADD CONSTRAINT "MajorContentSection_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "MajorVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MajorAlias" ADD CONSTRAINT "MajorAlias_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MajorRelationship" ADD CONSTRAINT "MajorRelationship_sourceMajorId_fkey" FOREIGN KEY ("sourceMajorId") REFERENCES "Major"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MajorRelationship" ADD CONSTRAINT "MajorRelationship_targetMajorId_fkey" FOREIGN KEY ("targetMajorId") REFERENCES "Major"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MajorRelationship" ADD CONSTRAINT "MajorRelationship_sourceProfileId_fkey" FOREIGN KEY ("sourceProfileId") REFERENCES "MajorLevelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MajorRelationship" ADD CONSTRAINT "MajorRelationship_targetProfileId_fkey" FOREIGN KEY ("targetProfileId") REFERENCES "MajorLevelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MajorClassificationMapping" ADD CONSTRAINT "MajorClassificationMapping_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MajorClassificationMapping" ADD CONSTRAINT "MajorClassificationMapping_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MajorLevelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MajorClassificationMapping" ADD CONSTRAINT "MajorClassificationMapping_taxonomyNodeId_fkey" FOREIGN KEY ("taxonomyNodeId") REFERENCES "AcademicTaxonomyNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MajorSource" ADD CONSTRAINT "MajorSource_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MajorSource" ADD CONSTRAINT "MajorSource_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MajorLevelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FellowshipDefinition" ADD CONSTRAINT "FellowshipDefinition_linkedMajorId_fkey" FOREIGN KEY ("linkedMajorId") REFERENCES "Major"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FellowshipDefinition" ADD CONSTRAINT "FellowshipDefinition_linkedProfileId_fkey" FOREIGN KEY ("linkedProfileId") REFERENCES "MajorLevelProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTest" ADD CONSTRAINT "InternationalTest_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "InternationalTestFamily"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTest" ADD CONSTRAINT "InternationalTest_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "InternationalTestProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTest" ADD CONSTRAINT "InternationalTest_currentPublishedVersionId_fkey" FOREIGN KEY ("currentPublishedVersionId") REFERENCES "InternationalTestVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestVersion" ADD CONSTRAINT "InternationalTestVersion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "InternationalTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestDeliveryModeProfile" ADD CONSTRAINT "InternationalTestDeliveryModeProfile_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "InternationalTestVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestVariant" ADD CONSTRAINT "InternationalTestVariant_testId_fkey" FOREIGN KEY ("testId") REFERENCES "InternationalTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestSection" ADD CONSTRAINT "InternationalTestSection_testId_fkey" FOREIGN KEY ("testId") REFERENCES "InternationalTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestScoreScale" ADD CONSTRAINT "InternationalTestScoreScale_testId_fkey" FOREIGN KEY ("testId") REFERENCES "InternationalTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestFeeMetadata" ADD CONSTRAINT "InternationalTestFeeMetadata_testId_fkey" FOREIGN KEY ("testId") REFERENCES "InternationalTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestOfficialLink" ADD CONSTRAINT "InternationalTestOfficialLink_testId_fkey" FOREIGN KEY ("testId") REFERENCES "InternationalTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestAvailability" ADD CONSTRAINT "InternationalTestAvailability_testId_fkey" FOREIGN KEY ("testId") REFERENCES "InternationalTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestPreparationMaterial" ADD CONSTRAINT "InternationalTestPreparationMaterial_testId_fkey" FOREIGN KEY ("testId") REFERENCES "InternationalTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestEvidence" ADD CONSTRAINT "InternationalTestEvidence_testId_fkey" FOREIGN KEY ("testId") REFERENCES "InternationalTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestVersionScoreScale" ADD CONSTRAINT "InternationalTestVersionScoreScale_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "InternationalTestVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestSession" ADD CONSTRAINT "InternationalTestSession_testId_fkey" FOREIGN KEY ("testId") REFERENCES "InternationalTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestSession" ADD CONSTRAINT "InternationalTestSession_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "InternationalTestVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestSession" ADD CONSTRAINT "InternationalTestSession_deliveryModeId_fkey" FOREIGN KEY ("deliveryModeId") REFERENCES "InternationalTestDeliveryModeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestCenter" ADD CONSTRAINT "InternationalTestCenter_testId_fkey" FOREIGN KEY ("testId") REFERENCES "InternationalTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestCenter" ADD CONSTRAINT "InternationalTestCenter_deliveryModeId_fkey" FOREIGN KEY ("deliveryModeId") REFERENCES "InternationalTestDeliveryModeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestRequirement" ADD CONSTRAINT "InternationalTestRequirement_testId_fkey" FOREIGN KEY ("testId") REFERENCES "InternationalTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestRequirement" ADD CONSTRAINT "InternationalTestRequirement_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "InternationalTestVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestPolicy" ADD CONSTRAINT "InternationalTestPolicy_testId_fkey" FOREIGN KEY ("testId") REFERENCES "InternationalTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestPolicy" ADD CONSTRAINT "InternationalTestPolicy_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "InternationalTestVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestCountryRelationship" ADD CONSTRAINT "InternationalTestCountryRelationship_testId_fkey" FOREIGN KEY ("testId") REFERENCES "InternationalTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestLanguageRelationship" ADD CONSTRAINT "InternationalTestLanguageRelationship_testId_fkey" FOREIGN KEY ("testId") REFERENCES "InternationalTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestAcademicTaxonomyRelationship" ADD CONSTRAINT "InternationalTestAcademicTaxonomyRelationship_testId_fkey" FOREIGN KEY ("testId") REFERENCES "InternationalTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestAcademicTaxonomyRelationship" ADD CONSTRAINT "InternationalTestAcademicTaxonomyRelationship_taxonomyNode_fkey" FOREIGN KEY ("taxonomyNodeId") REFERENCES "AcademicTaxonomyNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestDegreeRelationship" ADD CONSTRAINT "InternationalTestDegreeRelationship_testId_fkey" FOREIGN KEY ("testId") REFERENCES "InternationalTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestEquivalencyMapping" ADD CONSTRAINT "InternationalTestEquivalencyMapping_testId_fkey" FOREIGN KEY ("testId") REFERENCES "InternationalTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestContentBlock" ADD CONSTRAINT "InternationalTestContentBlock_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "InternationalTestVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSavedItem" ADD CONSTRAINT "StudentSavedItem_studentReferenceId_fkey" FOREIGN KEY ("studentReferenceId") REFERENCES "StudentWorkspace"("studentReferenceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRecord" ADD CONSTRAINT "UserRecord_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "IdentityRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRecord" ADD CONSTRAINT "AccountRecord_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "IdentityRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicTaxonomyEdge" ADD CONSTRAINT "AcademicTaxonomyEdge_parentNodeId_fkey" FOREIGN KEY ("parentNodeId") REFERENCES "AcademicTaxonomyNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicTaxonomyEdge" ADD CONSTRAINT "AcademicTaxonomyEdge_childNodeId_fkey" FOREIGN KEY ("childNodeId") REFERENCES "AcademicTaxonomyNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicTaxonomyAlias" ADD CONSTRAINT "AcademicTaxonomyAlias_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "AcademicTaxonomyNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicStandardMapping" ADD CONSTRAINT "AcademicStandardMapping_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "AcademicTaxonomyNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicStandardMapping" ADD CONSTRAINT "AcademicStandardMapping_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "AcademicTaxonomyNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
