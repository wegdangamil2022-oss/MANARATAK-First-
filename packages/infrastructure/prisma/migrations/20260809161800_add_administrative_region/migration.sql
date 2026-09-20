-- CreateTable
CREATE TABLE "AdministrativeRegion" (
    "id" TEXT NOT NULL,
    "countryIso2Code" TEXT NOT NULL,
    "regionCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "localName" TEXT,
    "regionType" TEXT,
    "sourceType" TEXT,
    "verificationStatus" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdministrativeRegion_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ReferenceCity" ADD COLUMN "administrativeRegionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AdministrativeRegion_countryIso2Code_regionCode_key" ON "AdministrativeRegion"("countryIso2Code", "regionCode");

-- CreateIndex
CREATE INDEX "AdministrativeRegion_countryIso2Code_idx" ON "AdministrativeRegion"("countryIso2Code");

-- CreateIndex
CREATE INDEX "AdministrativeRegion_regionCode_idx" ON "AdministrativeRegion"("regionCode");

-- CreateIndex
CREATE INDEX "ReferenceCity_administrativeRegionId_idx" ON "ReferenceCity"("administrativeRegionId");

-- AddForeignKey
ALTER TABLE "ReferenceCity" ADD CONSTRAINT "ReferenceCity_administrativeRegionId_fkey" FOREIGN KEY ("administrativeRegionId") REFERENCES "AdministrativeRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
