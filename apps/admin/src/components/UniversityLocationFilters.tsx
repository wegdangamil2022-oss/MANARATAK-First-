import { useState } from 'react';
import { canonicalPickerApi, type CanonicalPickerOption } from '../api/canonicalPickers';
export function UniversityLocationFilters({
  countryId,
  regionId,
  cityId,
  onChange,
  ar,
}: {
  countryId: string;
  regionId: string;
  cityId: string;
  onChange: (
    key: 'countryReferenceId' | 'regionReferenceId' | 'cityReferenceId',
    value: string,
  ) => void;
  ar: boolean;
}) {
  const [options, setOptions] = useState<Record<string, CanonicalPickerOption[]>>({});
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    setError('');
    try {
      const countries = await canonicalPickerApi.countries(search);
      const country =
        countries.find((item) => item.id === countryId) ??
        options.countryReferenceId?.find((item) => item.id === countryId);
      const [regions, cities] = await Promise.all([
        canonicalPickerApi.regions(country?.code, search),
        canonicalPickerApi.cities(country?.code, regionId || undefined, search),
      ]);
      setOptions({
        countryReferenceId: countries,
        regionReferenceId: regions,
        cityReferenceId: cities,
      });
    } catch {
      setError(
        ar
          ? 'تعذر تحميل خيارات الجغرافيا من المالك؛ لا تخمّن المعرف.'
          : 'Owner geography options unavailable; do not guess an ID.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <label>
        {ar ? 'بحث الجغرافيا' : 'Geography search'}
        <input maxLength={200} value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      <button type="button" disabled={busy} onClick={() => void load()}>
        {ar ? 'تحميل خيارات الموقع' : 'Load location choices'}
      </button>
      {(
        [
          ['countryReferenceId', countryId, ar ? 'البلد' : 'Country'],
          ['regionReferenceId', regionId, ar ? 'المنطقة' : 'Region'],
          ['cityReferenceId', cityId, ar ? 'المدينة' : 'City'],
        ] as const
      ).map(([key, value, label]) => (
        <label key={key}>
          {label}
          <select
            value={value}
            disabled={busy}
            onChange={(event) => onChange(key, event.target.value)}
          >
            <option value="">—</option>
            {value && !options[key]?.some((item) => item.id === value) && (
              <option value={value}>{ar ? 'خيار غير محمل' : 'Unloaded selection'}</option>
            )}
            {options[key]
              ?.filter((item) => item.lifecycle === 'ACTIVE')
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
          </select>
        </label>
      ))}
      {error && <p role="status">{error}</p>}
    </div>
  );
}
