import { PrismaClient } from '@prisma/client';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const iso31662 = require('iso-3166-2');

const { SQL_USER, SQL_PASSWORD, SQL_HOST, SQL_DB_NAME } = process.env;
let url = process.env.DATABASE_URL;

if (!url || url.includes('postgres-host') || url.includes('placeholder')) {
  if (SQL_USER && SQL_PASSWORD && SQL_HOST && SQL_DB_NAME) {
    const encodedPassword = encodeURIComponent(SQL_PASSWORD);
    url = `postgresql://${SQL_USER}:${encodedPassword}@localhost/${SQL_DB_NAME}?host=${SQL_HOST}`;
    process.env.DATABASE_URL = url;
  }
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

const cityArabicMap: Record<string, { nameAr: string; regionNameAr?: string; capitalRole?: string; cityType?: string }> = {
  // Saudi Arabia
  'Riyadh': { nameAr: 'الرياض', regionNameAr: 'منطقة الرياض', capitalRole: 'primary', cityType: 'NATIONAL_CAPITAL' },
  'Jeddah': { nameAr: 'جدة', regionNameAr: 'منطقة مكة المكرمة', capitalRole: 'commercial', cityType: 'MAJOR_CITY' },
  'Mecca': { nameAr: 'مكة المكرمة', regionNameAr: 'منطقة مكة المكرمة', cityType: 'HOLY_CITY' },
  'Medina': { nameAr: 'المدينة المنورة', regionNameAr: 'منطقة المدينة المنورة', cityType: 'HOLY_CITY' },
  'Dammam': { nameAr: 'الدمام', regionNameAr: 'المنطقة الشرقية', cityType: 'ADMIN_CAPITAL' },
  'Khobar': { nameAr: 'الخبر', regionNameAr: 'المنطقة الشرقية', cityType: 'MAJOR_CITY' },
  'Dhahran': { nameAr: 'الظهران', regionNameAr: 'المنطقة الشرقية', cityType: 'UNIVERSITY_CITY' },
  'Tabuk': { nameAr: 'تبوك', regionNameAr: 'منطقة تبوك', cityType: 'ADMIN_CAPITAL' },
  'Abha': { nameAr: 'أبها', regionNameAr: 'منطقة عسير', cityType: 'ADMIN_CAPITAL' },
  'Jizan': { nameAr: 'جيزان', regionNameAr: 'منطقة جازان', cityType: 'ADMIN_CAPITAL' },
  'Najran': { nameAr: 'نجران', regionNameAr: 'منطقة نجران', cityType: 'ADMIN_CAPITAL' },
  'Hail': { nameAr: 'حائل', regionNameAr: 'منطقة حائل', cityType: 'ADMIN_CAPITAL' },
  'Jubail': { nameAr: 'الجبيل', regionNameAr: 'المنطقة الشرقية', cityType: 'INDUSTRIAL_CITY' },
  'Yanbu': { nameAr: 'ينبع', regionNameAr: 'منطقة المدينة المنورة', cityType: 'INDUSTRIAL_CITY' },
  'Taif': { nameAr: 'الطائف', regionNameAr: 'منطقة مكة المكرمة', cityType: 'MAJOR_CITY' },
  'Buraidah': { nameAr: 'بريدة', regionNameAr: 'منطقة القصيم', cityType: 'ADMIN_CAPITAL' },
  'Unaizah': { nameAr: 'عنيزة', regionNameAr: 'منطقة القصيم', cityType: 'MAJOR_CITY' },

  // UAE
  'Abu Dhabi': { nameAr: 'أبو ظبي', regionNameAr: 'إمارة أبو ظبي', capitalRole: 'primary', cityType: 'NATIONAL_CAPITAL' },
  'Dubai': { nameAr: 'دبي', regionNameAr: 'إمارة دبي', capitalRole: 'commercial', cityType: 'MAJOR_CITY' },
  'Sharjah': { nameAr: 'الشارقة', regionNameAr: 'إمارة الشارقة', cityType: 'CULTURAL_CAPITAL' },
  'Ajman': { nameAr: 'عجمان', regionNameAr: 'إمارة عجمان', cityType: 'ADMIN_CAPITAL' },
  'Ras Al Khaimah': { nameAr: 'رأس الخيمة', regionNameAr: 'إمارة رأس الخيمة', cityType: 'ADMIN_CAPITAL' },
  'Fujairah': { nameAr: 'الفجيرة', regionNameAr: 'إمارة الفجيرة', cityType: 'ADMIN_CAPITAL' },
  'Umm Al Quwain': { nameAr: 'أم القيوين', regionNameAr: 'إمارة أم القيوين', cityType: 'ADMIN_CAPITAL' },
  'Al Ain': { nameAr: 'العين', regionNameAr: 'إمارة أبو ظبي', cityType: 'UNIVERSITY_CITY' },

  // Japan
  'Tokyo': { nameAr: 'طوكيو', capitalRole: 'primary', cityType: 'NATIONAL_CAPITAL' },
  'Osaka': { nameAr: 'أوساكا', cityType: 'MAJOR_CITY' },
  'Kyoto': { nameAr: 'كيوتو', cityType: 'CULTURAL_CAPITAL' },
  'Yokohama': { nameAr: 'يوكوهاما', cityType: 'MAJOR_CITY' },
  'Nagoya': { nameAr: 'ناغويا', cityType: 'MAJOR_CITY' },

  // China
  'Beijing': { nameAr: 'بكين', capitalRole: 'primary', cityType: 'NATIONAL_CAPITAL' },
  'Shanghai': { nameAr: 'شانغهاي', cityType: 'MAJOR_CITY' },
  'Guangzhou': { nameAr: 'غوانغتشو', cityType: 'MAJOR_CITY' },
  'Shenzhen': { nameAr: 'شنجن', cityType: 'MAJOR_CITY' },

  // India
  'New Delhi': { nameAr: 'نيودلهي', capitalRole: 'primary', cityType: 'NATIONAL_CAPITAL' },
  'Delhi': { nameAr: 'دلهي', cityType: 'MAJOR_CITY' },
  'Mumbai': { nameAr: 'بومباي (مومباي)', cityType: 'MAJOR_CITY' },

  // Qatar, Kuwait, Bahrain, Oman, Jordan, Lebanon, Iraq, Yemen, Syria, Palestine
  'Doha': { nameAr: 'الدوحة', capitalRole: 'primary', cityType: 'NATIONAL_CAPITAL' },
  'Kuwait City': { nameAr: 'مدينة الكويت', capitalRole: 'primary', cityType: 'NATIONAL_CAPITAL' },
  'Manama': { nameAr: 'المنامة', capitalRole: 'primary', cityType: 'NATIONAL_CAPITAL' },
  'Muscat': { nameAr: 'مسقط', capitalRole: 'primary', cityType: 'NATIONAL_CAPITAL' },
  'Amman': { nameAr: 'عمان', capitalRole: 'primary', cityType: 'NATIONAL_CAPITAL' },
  'Beirut': { nameAr: 'بيروت', capitalRole: 'primary', cityType: 'NATIONAL_CAPITAL' },
  'Baghdad': { nameAr: 'بغداد', capitalRole: 'primary', cityType: 'NATIONAL_CAPITAL' },
  'Sana\'a': { nameAr: 'صنعاء', capitalRole: 'primary', cityType: 'NATIONAL_CAPITAL' },
  'Aden': { nameAr: 'عدن', capitalRole: 'admin', cityType: 'ADMIN_CAPITAL' },
  'Taizz': { nameAr: 'تعز', cityType: 'MAJOR_CITY' },
  'Damascus': { nameAr: 'دمشق', capitalRole: 'primary', cityType: 'NATIONAL_CAPITAL' },
  'Jerusalem': { nameAr: 'القدس', capitalRole: 'primary', cityType: 'NATIONAL_CAPITAL' }
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function main() {
  console.log('--- STARTING ASIA CITIES IMPORT & LINKAGE ---');

  const asiaCountries = await prisma.referenceCountry.findMany({
    where: { region: 'Asia' }
  });

  console.log(`Found ${asiaCountries.length} Asia countries in DB.`);

  let totalUpserted = 0;
  let unmatchedRegionCount = 0;
  const processedCityIds = new Set<string>();
  const linkedCountryIsos = new Set<string>();

  for (const country of asiaCountries) {
    const iso2 = country.iso2Code;
    const iso3 = country.iso3Code;
    const countryNameEn = country.name;
    const countryNameAr = (country.metadata as any)?.nameAr || countryNameEn;

    const subData = iso31662.data[iso2];
    const subDict = subData?.sub || {};
    const subEntries = Object.entries(subDict);

    let rawCities: Array<{
      nameEn: string;
      regionCode?: string;
      regionType?: string;
      isUnmatched?: boolean;
    }> = [];

    if (subEntries.length > 0) {
      subEntries.forEach(([code, sub]: [string, any]) => {
        rawCities.push({
          nameEn: sub.name,
          regionCode: code,
          regionType: sub.type,
          isUnmatched: false
        });
      });
    }

    Object.keys(cityArabicMap).forEach(cityName => {
      const mapData = cityArabicMap[cityName];
      if (
        (iso2 === 'SA' && ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Dhahran', 'Tabuk', 'Abha', 'Jizan', 'Najran', 'Hail', 'Jubail', 'Yanbu', 'Taif', 'Buraidah', 'Unaizah'].includes(cityName)) ||
        (iso2 === 'AE' && ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain', 'Al Ain'].includes(cityName)) ||
        (iso2 === 'JP' && ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya'].includes(cityName)) ||
        (iso2 === 'CN' && ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen'].includes(cityName)) ||
        (iso2 === 'IN' && ['New Delhi', 'Delhi', 'Mumbai'].includes(cityName)) ||
        (iso2 === 'QA' && ['Doha'].includes(cityName)) ||
        (iso2 === 'KW' && ['Kuwait City'].includes(cityName)) ||
        (iso2 === 'BH' && ['Manama'].includes(cityName)) ||
        (iso2 === 'OM' && ['Muscat'].includes(cityName)) ||
        (iso2 === 'JO' && ['Amman'].includes(cityName)) ||
        (iso2 === 'LB' && ['Beirut'].includes(cityName)) ||
        (iso2 === 'IQ' && ['Baghdad'].includes(cityName)) ||
        (iso2 === 'YE' && ['Sana\'a', 'Aden', 'Taizz'].includes(cityName)) ||
        (iso2 === 'SY' && ['Damascus'].includes(cityName)) ||
        (iso2 === 'PS' && ['Jerusalem'].includes(cityName))
      ) {
        if (!rawCities.some(c => c.nameEn.toLowerCase() === cityName.toLowerCase())) {
          rawCities.unshift({
            nameEn: cityName,
            isUnmatched: false
          });
        }
      }
    });

    for (let i = 0; i < rawCities.length; i++) {
      const city = rawCities[i];
      const citySlug = slugify(city.nameEn) || `city_${i}`;
      const cityId = `city_${iso2.toLowerCase()}_${citySlug}`;

      if (processedCityIds.has(cityId)) continue;
      processedCityIds.add(cityId);

      const mapData = cityArabicMap[city.nameEn] || {};
      const cityNameAr = mapData.nameAr || city.nameEn;
      const isUnmatched = city.isUnmatched || (!city.regionCode && !mapData.regionNameAr);

      const regionMatchStatus = isUnmatched ? 'UNMATCHED_REGION_REVIEW' : 'MATCHED_BY_NORMALIZED_NAME';
      if (isUnmatched) {
        unmatchedRegionCount++;
      }

      const metadataObj = {
        cityId,
        cityNameEn: city.nameEn,
        cityNameAr,
        localName: cityNameAr,
        cityAscii: city.nameEn,
        countryIso2: iso2,
        countryIso3: iso3,
        countryNameEn,
        countryNameAr,
        continent: 'Asia',
        continentAr: 'آسيا',
        subregion: country.subregion || 'Asia',
        regionCode: city.regionCode || null,
        regionNameEn: city.regionType || null,
        regionNameAr: mapData.regionNameAr || null,
        regionMatchStatus,
        capitalRole: mapData.capitalRole || null,
        cityType: mapData.cityType || (city.regionType ? 'ADMIN_DIVISION' : 'MAJOR_CITY'),
        isCountryCapital: mapData.capitalRole === 'primary',
        isAdministrativeCapital: mapData.capitalRole === 'admin' || mapData.cityType === 'ADMIN_CAPITAL',
        isMajorCity: true,
        isStudyCityCandidate: true,
        verificationStatus: 'NEEDS_MANUAL_REVIEW',
        translationStatus: mapData.nameAr ? 'FULL_TRANSLATION' : 'NEEDS_AR_TRANSLATION',
        notes: 'Imported reference Asia city record linked to canonical country record.'
      };

      await prisma.referenceCity.upsert({
        where: { id: cityId },
        create: {
          id: cityId,
          countryIso2Code: iso2,
          name: city.nameEn,
          region: city.regionCode || null,
          isActive: true,
          metadata: metadataObj
        },
        update: {
          countryIso2Code: iso2,
          name: city.nameEn,
          region: city.regionCode || null,
          isActive: true,
          metadata: metadataObj
        }
      });

      totalUpserted++;
      linkedCountryIsos.add(iso2);
    }
  }

  console.log('--- ASIA CITIES IMPORT SUMMARY ---');
  console.log(`Total cities upserted: ${totalUpserted}`);
  console.log(`Distinct countries linked: ${linkedCountryIsos.size}`);
  console.log(`UNMATCHED_REGION_REVIEW cities: ${unmatchedRegionCount}`);
  console.log('Import completed successfully.');
}

main()
  .catch(e => {
    console.error('Import failed with error:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
