import { useCallback, useRef, useState } from 'react';
import { canonicalPickerApi } from '../api/canonicalPickers';
import { reviewCityLabel } from '../api/citySelection';
import { CanonicalPicker } from './CanonicalPicker';

export function CanonicalCityPicker({ countryIso2Code, regionId, value, rawLabel = '', onChange, disabled = false }: {
  countryIso2Code: string;
  regionId: string | null;
  value: string | null;
  rawLabel?: string;
  onChange: (id: string | null) => void;
  disabled?: boolean;
}) {
  const scope = `${countryIso2Code}:${regionId ?? ''}:${rawLabel}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const [review, setReview] = useState<{ scope: string; result: ReturnType<typeof reviewCityLabel> } | null>(null);
  const load = useCallback(async () => {
    const options = await canonicalPickerApi.cities(countryIso2Code || undefined, regionId);
    if (currentScope.current === scope) setReview({ scope, result: reviewCityLabel(rawLabel, options) });
    return options.map((item) => ({ ...item, label: `${item.label} · ${item.metadata?.rawRegionLabel || item.metadata?.administrativeRegionId || 'No region'} · ${item.id}` }));
  }, [countryIso2Code, regionId, rawLabel, scope]);
  const currentReview = review?.scope === scope ? review.result : null;
  return <div className="space-y-2">
    <CanonicalPicker label="City" value={value} onChange={onChange} load={load} reloadKey={scope} optional disabled={disabled || !countryIso2Code} />
    {rawLabel ? <p className="text-xs text-slate-600">Original city label: {rawLabel}</p> : null}
    {rawLabel && !value && currentReview ? <p role="status" className="text-xs text-amber-800">
      {currentReview.state === 'AMBIGUOUS_REVIEW_REQUIRED' ? 'REVIEW_REQUIRED: multiple cities match this source label. Review the region and canonical ID before selecting.' : currentReview.state === 'UNMATCHED_REVIEW_REQUIRED' ? 'REVIEW_REQUIRED: no active city matches this source label in the selected scope.' : 'Review the candidate and explicitly select its canonical ID.'}
    </p> : null}
  </div>;
}
