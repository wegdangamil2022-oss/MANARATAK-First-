import { PrismaClient } from '@prisma/client';
import { readXlsxWorkbook, spreadsheetRowsToObjects } from '@manaratak/shared';
import * as path from 'path';
import * as fs from 'fs';

const url = process.env.DATABASE_URL;
if (!url || url.includes('postgres-host') || url.includes('placeholder')) {
  console.error('CRITICAL: DATABASE_URL is not set or contains a placeholder. Please configure a valid DATABASE_URL environment variable.');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  const fileName = process.argv[2];
  if (!fileName) {
    console.error('Please provide an Excel file name as an argument.');
    process.exit(1);
  }

  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const buf = fs.readFileSync(filePath);
  const workbook = await readXlsxWorkbook(buf);
  const sheetName = workbook.sheetNames[0];
  const worksheet = workbook.sheets.get(sheetName);
  if (!worksheet) throw new Error('The workbook has no worksheets.');
  const rows: any[] = spreadsheetRowsToObjects(worksheet);

  console.log(`File: ${fileName}`);
  console.log(`Found ${rows.length} countries in Excel.`);

  let hasErrors = false;
  for (const row of rows) {
    const iso2Code = row['رمز ISO ALPHA-2'];
    const iso3Code = row['رمز ISO ALPHA-3'];
    
    if (!iso2Code || !iso3Code) {
      console.warn(`Skipping row due to missing ISO codes:`, row['اسم الدولة بالإنجليزية'] || row['اسم الدولة بالعربية'] || 'Unknown');
      hasErrors = true;
      continue;
    }

    const splitArray = (val: any) => {
      if (!val) return [];
      return String(val).split(',').map(s => s.trim()).filter(Boolean);
    };

    const regionFromFile = row['المنطقة'];
    const subregionFromFile = row['المنطقة الفرعية'];
    let regionToStore = regionFromFile;

    // Map Americas to North/South America for frontend tabs compatibility
    if (regionFromFile === 'Americas') {
      if (subregionFromFile === 'South America') {
        regionToStore = 'South America';
      } else {
        regionToStore = 'North America';
      }
    }

    const metadata = {
      nameAr: row['اسم الدولة بالعربية'],
      officialNameAr: row['الاسم الرسمي بالعربية'],
      nativeName: row['الاسم المحلي/الأصلي'],
      isoNumeric: String(row['رمز ISO الرقمي']),
      continent: regionToStore,
      capitalCity: row['العاصمة'],
      legalTenderCurrencies: splitArray(row['العملات الرسمية المتداولة']),
      officialLanguages: splitArray(row['اللغات الرسمية']),
      spokenLanguages: splitArray(row['اللغات المحلية']),
      primaryTimezone: row['النطاق الزمني الرئيسي'],
      timezones: splitArray(row['المناطق الزمنية']),
      flagEmoji: row['العلم'],
      slug: row['الرمز اللطيف (SLUG)'],
      publicId: row['المعرف العام (PUBLIC ID)'],
      destinationReviewStatus: row['حالة المراجعة المرجعية'] || 'UNREVIEWED',
      source: row['مصادر البيانات المرجعية'],
      notes: row['ملاحظات'],
      studyDestinationCandidate: true, // Mark as candidate for study destinations
    };

    const countryData = {
      iso2Code: iso2Code,
      iso3Code: iso3Code,
      name: row['اسم الدولة بالإنجليزية'] || row['اسم الدولة بالعربية'],
      officialName: row['الاسم الرسمي بالإنجليزية'] || row['الاسم الرسمي بالعربية'],
      region: regionToStore,
      subregion: subregionFromFile,
      defaultCurrencyCode: row['العملة الافتراضية'],
      defaultLanguageCode: row['اللغة الافتراضية'],
      callingCode: row['رمز الاتصال الدولي'] ? String(row['رمز الاتصال الدولي']) : null,
      metadata: metadata,
      isActive: true,
    };

    try {
      await prisma.referenceCountry.upsert({
        where: { iso2Code: iso2Code },
        update: countryData,
        create: countryData,
      });
      console.log(`Imported/Updated: ${countryData.name} (${iso2Code})`);
    } catch (error) {
      console.error(`Error importing ${countryData.name}:`, error);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error(`FAILED: Import for ${fileName} finished with errors.`);
    process.exitCode = 1;
  } else {
    console.log(`SUCCESS: Import for ${fileName} completed.`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    
  });
