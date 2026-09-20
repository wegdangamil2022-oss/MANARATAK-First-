const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../packages/infrastructure/prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

if (!schema.includes('model DegreeLevel')) {
  const degreeLevelModel = `
// --- Degree Level Foundation (Phase 08) ---
model DegreeLevel {
  id             String   @id @default(uuid())
  canonicalCode  String   @unique
  nameEn         String
  nameAr         String
  displayRank    Int      @default(0)
  status         String   @default("ACTIVE")
  aliases        Json?
  metadata       Json?
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  majorProfiles  MajorLevelProfile[]
  internationalTestDegreeRelationships InternationalTestDegreeRelationship[]
}

`;
  
  schema = schema.replace('// --- Academic Taxonomy Foundation (Phase 08) ---', degreeLevelModel + '// --- Academic Taxonomy Foundation (Phase 08) ---');
  console.log("Added DegreeLevel model.");
}

if (!schema.includes('degreeLevelId     String?')) {
  schema = schema.replace(
    /model MajorLevelProfile \{[\s\S]*?majorId\s+String\n\s+level\s+String/m,
    match => match + '\n  degreeLevelId     String?\n  degreeLevel       DegreeLevel? @relation(fields: [degreeLevelId], references: [id], onDelete: SetNull)'
  );
  console.log("Added degreeLevel relation to MajorLevelProfile.");
}

if (schema.includes('model InternationalTestDegreeRelationship {') && !schema.includes('degreeLevel       DegreeLevel?')) {
  schema = schema.replace(
    /model InternationalTestDegreeRelationship \{[\s\S]*?degreeLevelCode\s+String/m,
    match => match + '\n  degreeLevel       DegreeLevel? @relation(fields: [degreeLevelCode], references: [canonicalCode], onDelete: Restrict)'
  );
  console.log("Added degreeLevel relation to InternationalTestDegreeRelationship.");
}

fs.writeFileSync(schemaPath, schema);
console.log("Schema updated.");
