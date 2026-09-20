-- CreateTable
CREATE TABLE "DegreeLevel" (
    "id" TEXT NOT NULL,
    "canonicalCode" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "displayRank" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "aliases" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DegreeLevel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DegreeLevel_canonicalCode_key" ON "DegreeLevel"("canonicalCode");

-- AlterTable
ALTER TABLE "MajorLevelProfile" ADD COLUMN "degreeLevelId" TEXT;

-- AddForeignKey
ALTER TABLE "MajorLevelProfile" ADD CONSTRAINT "MajorLevelProfile_degreeLevelId_fkey" FOREIGN KEY ("degreeLevelId") REFERENCES "DegreeLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestDegreeRelationship" ADD CONSTRAINT "InternationalTestDegreeRelationship_degreeLevelCode_fkey" FOREIGN KEY ("degreeLevelCode") REFERENCES "DegreeLevel"("canonicalCode") ON DELETE RESTRICT ON UPDATE CASCADE;
