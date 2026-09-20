-- P8 source-only migration. Do not execute until the Runtime/DB gate is opened.
CREATE TABLE "ServiceCatalogRecord" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "canonicalName" TEXT NOT NULL,
  "canonicalDedupKey" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "completenessStatus" TEXT NOT NULL,
  "serviceCategory" TEXT NOT NULL,
  "fulfillmentType" TEXT NOT NULL,
  "serviceDescription" TEXT NOT NULL,
  "serviceAvailabilityStatus" TEXT NOT NULL,
  "requiredInputsOrDocuments" JSONB NOT NULL,
  "deliveryMode" TEXT NOT NULL,
  "responsibleServiceOwnerType" TEXT NOT NULL,
  "providerName" TEXT,
  "providerReferenceId" TEXT,
  "estimatedDeliveryTime" TEXT,
  "slaPolicy" JSONB,
  "appointmentRequired" BOOLEAN,
  "supportedCountryLabels" JSONB,
  "supportedLanguageLabels" JSONB,
  "servicePrerequisites" JSONB,
  "deliveryArtifactTypes" JSONB,
  "pricingReferenceId" TEXT,
  "thumbnailAssetId" TEXT,
  "publicDisplayMetadata" JSONB,
  "optionalFields" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceCatalogRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ServiceCatalogRecord_publicId_key" ON "ServiceCatalogRecord"("publicId");
CREATE UNIQUE INDEX "ServiceCatalogRecord_slug_key" ON "ServiceCatalogRecord"("slug");
CREATE UNIQUE INDEX "ServiceCatalogRecord_canonicalDedupKey_key" ON "ServiceCatalogRecord"("canonicalDedupKey");
CREATE INDEX "ServiceCatalogRecord_status_serviceCategory_idx" ON "ServiceCatalogRecord"("status", "serviceCategory");

CREATE TABLE "ServiceCatalogCountryRecord" (
  "serviceId" TEXT NOT NULL,
  "countryReferenceId" TEXT NOT NULL,
  CONSTRAINT "ServiceCatalogCountryRecord_pkey" PRIMARY KEY ("serviceId","countryReferenceId"),
  CONSTRAINT "ServiceCatalogCountryRecord_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalogRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ServiceCatalogCountryRecord_countryReferenceId_fkey" FOREIGN KEY ("countryReferenceId") REFERENCES "ReferenceCountry"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ServiceCatalogCountryRecord_countryReferenceId_idx" ON "ServiceCatalogCountryRecord"("countryReferenceId");

CREATE TABLE "ServiceCatalogLanguageRecord" (
  "serviceId" TEXT NOT NULL,
  "languageReferenceId" TEXT NOT NULL,
  CONSTRAINT "ServiceCatalogLanguageRecord_pkey" PRIMARY KEY ("serviceId","languageReferenceId"),
  CONSTRAINT "ServiceCatalogLanguageRecord_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalogRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ServiceCatalogLanguageRecord_languageReferenceId_fkey" FOREIGN KEY ("languageReferenceId") REFERENCES "ReferenceLanguage"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ServiceCatalogLanguageRecord_languageReferenceId_idx" ON "ServiceCatalogLanguageRecord"("languageReferenceId");

CREATE TABLE "ServiceRequestRecord" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "studentReferenceId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "requestParameters" JSONB NOT NULL,
  "providerReferenceId" TEXT,
  "financeInvoiceId" TEXT,
  "financeInvoicePublicId" TEXT,
  "fulfillmentMetadata" JSONB,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceRequestRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceRequestRecord_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalogRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ServiceRequestRecord_publicId_key" ON "ServiceRequestRecord"("publicId");
CREATE INDEX "ServiceRequestRecord_studentReferenceId_status_updatedAt_idx" ON "ServiceRequestRecord"("studentReferenceId","status","updatedAt");
CREATE INDEX "ServiceRequestRecord_serviceId_status_idx" ON "ServiceRequestRecord"("serviceId","status");
CREATE INDEX "ServiceRequestRecord_financeInvoiceId_idx" ON "ServiceRequestRecord"("financeInvoiceId");

CREATE TABLE "CareerEmployerRecord" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "canonicalName" TEXT NOT NULL,
  "canonicalDedupKey" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "employerType" TEXT NOT NULL,
  "industry" TEXT,
  "countryReferenceId" TEXT,
  "cityReferenceId" TEXT,
  "country" TEXT,
  "city" TEXT,
  "websiteUrl" TEXT,
  "logoAssetId" TEXT,
  "verificationStatus" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerEmployerRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CareerEmployerRecord_countryReferenceId_fkey" FOREIGN KEY ("countryReferenceId") REFERENCES "ReferenceCountry"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CareerEmployerRecord_cityReferenceId_fkey" FOREIGN KEY ("cityReferenceId") REFERENCES "ReferenceCity"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CareerEmployerRecord_publicId_key" ON "CareerEmployerRecord"("publicId");
CREATE UNIQUE INDEX "CareerEmployerRecord_slug_key" ON "CareerEmployerRecord"("slug");
CREATE UNIQUE INDEX "CareerEmployerRecord_canonicalDedupKey_key" ON "CareerEmployerRecord"("canonicalDedupKey");
CREATE INDEX "CareerEmployerRecord_countryReferenceId_idx" ON "CareerEmployerRecord"("countryReferenceId");

CREATE TABLE "CareerJobPostingRecord" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "canonicalTitle" TEXT NOT NULL,
  "canonicalDedupKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "opportunityType" TEXT NOT NULL,
  "employmentType" TEXT NOT NULL,
  "jobCategory" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "countryReferenceId" TEXT NOT NULL,
  "cityReferenceId" TEXT,
  "country" TEXT,
  "city" TEXT,
  "status" TEXT NOT NULL,
  "employerId" TEXT NOT NULL,
  "recruiterContactId" TEXT,
  "applicationDeadline" TIMESTAMP(3),
  "externalPostingUrl" TEXT,
  "salaryRange" JSONB,
  "requiredSkills" JSONB,
  "educationRequirement" TEXT,
  "languageRequirements" JSONB,
  "remoteOption" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerJobPostingRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CareerJobPostingRecord_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "CareerEmployerRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CareerJobPostingRecord_countryReferenceId_fkey" FOREIGN KEY ("countryReferenceId") REFERENCES "ReferenceCountry"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CareerJobPostingRecord_cityReferenceId_fkey" FOREIGN KEY ("cityReferenceId") REFERENCES "ReferenceCity"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CareerJobPostingRecord_publicId_key" ON "CareerJobPostingRecord"("publicId");
CREATE UNIQUE INDEX "CareerJobPostingRecord_slug_key" ON "CareerJobPostingRecord"("slug");
CREATE UNIQUE INDEX "CareerJobPostingRecord_canonicalDedupKey_key" ON "CareerJobPostingRecord"("canonicalDedupKey");
CREATE INDEX "CareerJobPostingRecord_status_updatedAt_idx" ON "CareerJobPostingRecord"("status","updatedAt");
CREATE INDEX "CareerJobPostingRecord_countryReferenceId_cityReferenceId_idx" ON "CareerJobPostingRecord"("countryReferenceId","cityReferenceId");
CREATE INDEX "CareerJobPostingRecord_employerId_status_idx" ON "CareerJobPostingRecord"("employerId","status");
