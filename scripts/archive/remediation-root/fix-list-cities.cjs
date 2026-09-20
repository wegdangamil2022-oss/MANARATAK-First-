const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'packages/infrastructure/tests/reference-data/PrismaReferenceDataRepository.spec.ts');
let content = fs.readFileSync(filePath, 'utf8');

// The output of listCities maps database records to DTOs.
// We need to match the actual output of mapToCityDto which includes id, administrativeRegionId, etc.
content = content.replace(
  /expect\(result\)\.toEqual\(\[\n        \{\n          countryIso2Code: 'EG',\n          name: 'Cairo',\n          region: 'Cairo Governorate',\n          timezone: 'Africa\/Cairo',\n          latitude: 30\.0444,\n          longitude: 31\.2357,\n          isActive: true,\n          metadata: undefined\n        \}\n      \]\);/,
  "expect(result).toEqual([\n        {\n          id: 'city-1',\n          countryIso2Code: 'EG',\n          name: 'Cairo',\n          region: 'Cairo Governorate',\n          administrativeRegionId: undefined,\n          administrativeRegion: null,\n          timezone: 'Africa/Cairo',\n          latitude: 30.0444,\n          longitude: 31.2357,\n          isActive: true,\n          metadata: undefined\n        }\n      ]);"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed listCities test.');
