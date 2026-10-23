import { useEffect, useRef, useState } from 'react';
import { Globe2, MapPin, Map } from 'lucide-react';
import { canonicalPickerApi } from '../api/canonicalPickers';
import { CanonicalPicker } from './CanonicalPicker';

export function UniversityLocationFilters({countryId,regionId,cityId,onChange,ar}:{
  countryId:string;regionId:string;cityId:string;ar:boolean;
  onChange:(key:'countryReferenceId'|'regionReferenceId'|'cityReferenceId',value:string)=>void;
}) {
  const [countryCode,setCountryCode]=useState('');
  const selectedCountry=useRef('');
  const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    if(selectedCountry.current===countryId)return;
    setCountryCode('');setError('');
    if(!countryId){selectedCountry.current='';return;}
    // Deep links may point beyond the first bounded page. Resolve the exact ID.
    void (async()=>{
      for(let page=1;page<=1000&&active;page++){
        const options=await canonicalPickerApi.countries('',page);
        if(!active)return;
        const selected=options.find(option=>option.id===countryId);
        if(selected){selectedCountry.current=countryId;setCountryCode(selected.code??'');return;}
        if(options.length<50)break;
      }
      if(active)setError(ar?'تعذر تحديد الدولة المحفوظة؛ اختر الدولة لإتاحة مناطقها ومدنها.':'Choose a country to resolve regions and cities.');
    })().catch(()=>{if(active)setError(ar?'تعذر تحميل مرجع الدولة.':'Country reference unavailable.');});
    return()=>{active=false;};
  },[countryId,ar]);
  return <>
    <CanonicalPicker label={ar?'الدولة':'Country'} icon={<Globe2 aria-hidden="true" className="h-3.5 w-3.5" />} value={countryId} onChange={(id,option)=>{selectedCountry.current=id??'';setCountryCode(option?.code??'');setError('');onChange('countryReferenceId',id??'');}} load={canonicalPickerApi.countries} reloadKey="university-filter-countries" compact paged optional allowInactive />
    <CanonicalPicker label={ar?'المنطقة':'Region'} icon={<Map aria-hidden="true" className="h-3.5 w-3.5" />} value={regionId} onChange={id=>onChange('regionReferenceId',id??'')} load={(query,page)=>canonicalPickerApi.regions(countryCode,query,page)} reloadKey={`university-filter-regions:${countryCode}`} disabled={!countryCode} compact paged optional allowInactive />
    <CanonicalPicker label={ar?'المدينة':'City'} icon={<MapPin aria-hidden="true" className="h-3.5 w-3.5" />} value={cityId} onChange={id=>onChange('cityReferenceId',id??'')} load={(query,page)=>canonicalPickerApi.cities(countryCode,regionId||undefined,query,page)} reloadKey={`university-filter-cities:${countryCode}:${regionId}`} disabled={!countryCode} compact paged optional allowInactive />
    {error&&<p role="status" className="col-span-full text-xs text-amber-800">{error}</p>}
  </>;
}
