import type { GovernedReferenceEntityType, ReferenceDataCollection } from '@manaratak/domain';
export type ReferenceRow = {
  id: string;
  name: string;
  nameAr?: string | null;
  versionNumber: number;
  lifecycleState: string;
  [key: string]: unknown;
};
export type ReferenceField = {
  key: string;
  label: [string, string];
  group: 'identity' | 'names' | 'location' | 'defaults';
  immutable?: boolean;
  numeric?: boolean;
  required?: boolean;
};
const field = (
  key: string,
  ar: string,
  en: string,
  group: ReferenceField['group'],
  extra: Partial<ReferenceField> = {},
): ReferenceField => ({ key, label: [ar, en], group, ...extra });
export const referenceDefinitions: Record<
  ReferenceDataCollection,
  {
    label: [string, string];
    type: GovernedReferenceEntityType;
    description: [string, string];
    fields: ReferenceField[];
    columns: string[];
  }
> = {
  countries: {
    label: ['الدول', 'Countries'],
    type: 'COUNTRY',
    description: ['الهويات والأكواد المعيارية', 'Canonical country identities'],
    fields: [
      field('iso2Code', 'رمز ISO2', 'ISO2', 'identity', { immutable: true, required: true }),
      field('iso3Code', 'رمز ISO3', 'ISO3', 'identity', { immutable: true, required: true }),
      field('name', 'الاسم المعتمد', 'Canonical name', 'names', { required: true }),
      field('nameAr', 'الاسم العربي', 'Arabic name', 'names'),
      field('officialName', 'الاسم الرسمي', 'Official name', 'names'),
      field('region', 'الإقليم النصي المرجعي', 'Reference region label', 'location'),
      field('subregion', 'الإقليم الفرعي النصي', 'Reference subregion label', 'location'),
      field('defaultCurrencyCode', 'العملة الافتراضية', 'Default currency', 'defaults'),
      field('defaultLanguageCode', 'اللغة الافتراضية', 'Default language', 'defaults'),
      field('callingCode', 'رمز الاتصال', 'Calling code', 'defaults'),
    ],
    columns: ['iso2Code', 'iso3Code', 'region', 'defaultCurrencyCode', 'defaultLanguageCode'],
  },
  currencies: {
    label: ['العملات', 'Currencies'],
    type: 'CURRENCY',
    description: ['هوية العملة وخصائص العرض', 'Currency identity and display'],
    fields: [
      field('isoCode', 'رمز ISO 4217', 'ISO 4217', 'identity', { immutable: true, required: true }),
      field('numericCode', 'الرمز الرقمي', 'Numeric code', 'identity', { immutable: true }),
      field('name', 'الاسم المعتمد', 'Canonical name', 'names', { required: true }),
      field('nameAr', 'الاسم العربي', 'Arabic name', 'names'),
      field('symbol', 'الرمز المطبوع', 'Display symbol', 'defaults'),
      field('minorUnit', 'الخانات العشرية', 'Minor unit', 'defaults', { numeric: true }),
    ],
    columns: ['isoCode', 'symbol', 'numericCode', 'minorUnit'],
  },
  languages: {
    label: ['اللغات', 'Languages'],
    type: 'LANGUAGE',
    description: ['هوية اللغة واتجاه الكتابة', 'Language identity and direction'],
    fields: [
      field('isoCode', 'رمز ISO 639', 'ISO 639', 'identity', { immutable: true, required: true }),
      field('name', 'الاسم المعتمد', 'Canonical name', 'names', { required: true }),
      field('nameAr', 'الاسم العربي', 'Arabic name', 'names'),
      field('nativeName', 'الاسم المحلي', 'Native name', 'names'),
      field('direction', 'اتجاه الكتابة', 'Writing direction', 'defaults', { required: true }),
    ],
    columns: ['isoCode', 'nativeName', 'direction'],
  },
  regions: {
    label: ['المناطق الإدارية', 'Administrative regions'],
    type: 'REGION',
    description: ['محافظات وولايات ومقاطعات', 'Provinces, states and districts'],
    fields: [
      field('countryIso2Code', 'الدولة المرجعية', 'Canonical country', 'location', {
        immutable: true,
        required: true,
      }),
      field('regionCode', 'رمز المنطقة', 'Region code', 'identity', {
        immutable: true,
        required: true,
      }),
      field('name', 'الاسم المعتمد', 'Canonical name', 'names', { required: true }),
      field('nameAr', 'الاسم العربي', 'Arabic name', 'names'),
      field('localName', 'الاسم المحلي', 'Local name', 'names'),
      field('regionType', 'نوع المنطقة', 'Region type', 'defaults'),
    ],
    columns: ['countryIso2Code', 'regionCode', 'regionType'],
  },
  cities: {
    label: ['المدن', 'Cities'],
    type: 'CITY',
    description: ['المدن وعلاقاتها الإدارية', 'Cities and administrative links'],
    fields: [
      field('countryIso2Code', 'الدولة المرجعية', 'Canonical country', 'location', {
        immutable: true,
        required: true,
      }),
      field('name', 'الاسم المعتمد', 'Canonical name', 'names', { required: true }),
      field('nameAr', 'الاسم العربي', 'Arabic name', 'names'),
      field(
        'region',
        'اسم المنطقة من المصدر (غير موثق)',
        'Source region label (unverified)',
        'location',
        { immutable: true },
      ),
      field(
        'administrativeRegionId',
        'المنطقة الإدارية المعتمدة',
        'Canonical administrative region',
        'location',
        { immutable: true },
      ),
      field('timezone', 'التوقيت IANA', 'IANA timezone', 'defaults'),
      field('latitude', 'خط العرض', 'Latitude', 'defaults', { numeric: true }),
      field('longitude', 'خط الطول', 'Longitude', 'defaults', { numeric: true }),
    ],
    columns: ['countryIso2Code', 'timezone'],
  },
};
export function referenceSection(
  params: URLSearchParams,
): ReferenceDataCollection | 'quality' | 'home' {
  const value = params.get('section') ?? params.get('p7Tab');
  return value === 'quality'
    ? 'quality'
    : value && Object.hasOwn(referenceDefinitions, value)
      ? (value as ReferenceDataCollection)
      : 'home';
}
export function referenceForm(
  row: ReferenceRow | null,
  collection: ReferenceDataCollection,
): Record<string, string> {
  return Object.fromEntries(
    referenceDefinitions[collection].fields.map((f) => [
      f.key,
      row?.[f.key] == null ? (f.key === 'direction' ? 'LTR' : '') : String(row[f.key]),
    ]),
  );
}
export function referencePayload(
  collection: ReferenceDataCollection,
  form: Record<string, string>,
  previous: ReferenceRow | null,
): Record<string, unknown> {
  const body: Record<string, unknown> = previous
    ? { id: previous.id, expectedVersion: previous.versionNumber }
    : {};
  for (const f of referenceDefinitions[collection].fields) {
    const value = f.immutable && previous ? previous[f.key] : form[f.key];
    if (f.numeric) {
      if (value == null || value === '') body[f.key] = null;
      else {
        const number = Number(value);
        if (!Number.isFinite(number)) throw Error('INVALID_REFERENCE_NUMBER');
        if (
          (f.key === 'latitude' && (number < -90 || number > 90)) ||
          (f.key === 'longitude' && (number < -180 || number > 180)) ||
          (f.key === 'minorUnit' && (!Number.isInteger(number) || number < 0 || number > 4))
        )
          throw Error('INVALID_REFERENCE_NUMBER_RANGE');
        body[f.key] = number;
      }
    } else body[f.key] = value || (f.required ? '' : null);
  }
  return body;
}
export function referenceState(params: URLSearchParams) {
  const raw = Number(params.get('p7Page'));
  return {
    q: params.get('p7Q') ?? '',
    status: ['active', 'nonactive', 'all'].includes(params.get('p7Status') ?? '')
      ? params.get('p7Status')!
      : 'all',
    page: Number.isSafeInteger(raw) && raw > 0 && raw <= 1000000 ? raw : 1,
    country: params.get('p7Country') ?? '',
    regionId: params.get('p7Region') ?? '',
    mappingStatus: params.get('p7MappingStatus') ?? '',
    updatedFrom: params.get('p7UpdatedFrom') ?? '',
    region: params.get('p7CountryRegion') ?? '',
  };
}
export function referenceStateParams(state: ReturnType<typeof referenceState>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({
    p7Q: state.q,
    p7Status: state.status,
    p7Page: String(state.page),
    p7Country: state.country,
    p7Region: state.regionId,
    p7MappingStatus: state.mappingStatus,
    p7UpdatedFrom: state.updatedFrom,
    p7CountryRegion: state.region,
  }))
    if (value) next.set(key, value);
  return next;
}
