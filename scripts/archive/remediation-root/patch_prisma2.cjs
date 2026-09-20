const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../packages/infrastructure/prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

if (schema.includes('model InternationalTestDegreeRelationship {') && !schema.includes('degreeLevel       DegreeLevel?')) {
  schema = schema.replace(
    /model InternationalTestDegreeRelationship \{\s+id\s+String\s+@id @default\(uuid\(\)\)\s+testId\s+String\s+degreeLevelCode\s+String/,
    match => match + '\n  degreeLevel       DegreeLevel? @relation(fields: [degreeLevelCode], references: [canonicalCode], onDelete: Restrict)'
  );
  console.log("Added degreeLevel relation to InternationalTestDegreeRelationship.");
}

fs.writeFileSync(schemaPath, schema);
