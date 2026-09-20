const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'packages/infrastructure/tests/reference-data/PrismaReferenceDataRepository.spec.ts');
let content = fs.readFileSync(filePath, 'utf8');

// listCities findMany
content = content.replace(
  /expect\(mockPrisma\.referenceCity\.findMany\)\.toHaveBeenCalledWith\(\{([\s\S]*?)orderBy: \{ name: 'asc' \}\n      \}\);/,
  "expect(mockPrisma.referenceCity.findMany).toHaveBeenCalledWith({$1include: { administrativeRegion: true },\n        orderBy: { name: 'asc' }\n      });"
);

// upsertCity findFirst (region undefined)
content = content.replace(
  /expect\(mockPrisma\.referenceCity\.findFirst\)\.toHaveBeenCalledWith\(\{([\s\S]*?)name: 'Cairo'\n        \}\n      \}\);/,
  "expect(mockPrisma.referenceCity.findFirst).toHaveBeenCalledWith({$1name: 'Cairo'\n        },\n        include: { administrativeRegion: true }\n      });"
);

// upsertCity findFirst (region defined)
content = content.replace(
  /expect\(mockPrisma\.referenceCity\.findFirst\)\.toHaveBeenCalledWith\(\{([\s\S]*?)region: 'Giza'\n        \}\n      \}\);/,
  "expect(mockPrisma.referenceCity.findFirst).toHaveBeenCalledWith({$1region: 'Giza'\n        },\n        include: { administrativeRegion: true }\n      });"
);

// upsertCity update
content = content.replace(
  /expect\(mockPrisma\.referenceCity\.update\)\.toHaveBeenCalledWith\(\{\n        where: \{ id: 'city-existing' \},\n        data: \{/,
  "expect(mockPrisma.referenceCity.update).toHaveBeenCalledWith({\n        where: { id: 'city-existing' },\n        include: { administrativeRegion: true },\n        data: {"
);

// upsertCity create
content = content.replace(
  /expect\(mockPrisma\.referenceCity\.create\)\.toHaveBeenCalledWith\(\{\n        data: \{/,
  "expect(mockPrisma.referenceCity.create).toHaveBeenCalledWith({\n        include: { administrativeRegion: true },\n        data: {"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed tests.');
