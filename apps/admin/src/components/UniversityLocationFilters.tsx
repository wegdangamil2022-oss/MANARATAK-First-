import { useEffect, useRef, useState } from 'react';
import { Globe2, MapPin, Map } from 'lucide-react';
import { canonicalPickerApi } from '../api/canonicalPickers';
import { CanonicalPicker } from './CanonicalPicker';

export function UniversityLocationFilters({countryId,regionId,cityId,continent='',onChange,ar}:{
  countryId:string;regionId:string;cityId:string;continent?:string;ar:boolean;
  onChange:(key:'continent'|'countryReferenceId'|'regionReferenceId'|'cityReferenceId',value:string)=>void;
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
      const options=await canonicalPickerApi.filterCountries();
      if(!active)return;
      const selected=options.find(option=>option.id===countryId);
      if(selected){selectedCountry.current=countryId;setCountryCode(selected.code??'');return;}
      if(active)setError(ar?'تعذر تحديد الدولة المحفوظة؛ اختر الدولة لإتاحة مناطقها ومدنها.':'Choose a country to resolve regions and cities.');
    })().catch(()=>{if(active)setError(ar?'تعذر تحميل مرجع الدولة.':'Country reference unavailable.');});
    return()=>{active=false;};
  },[countryId,ar]);
  return <>
    <label className="min-w-0 space-y-2 text-xs"><span className="flex min-h-5 items-center gap-1.5"><Globe2 aria-hidden="true" className="h-3.5 w-3.5" />{ar?'القارة':'Continent'}</span><select aria-label={ar?'القارة':'Continent'} value={continent} onChange={event=>onChange('continent',event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">{ar?'كل القارات':'All continents'}</option>{[['Africa','أفريقيا'],['Asia','آسيا'],['Europe','أوروبا'],['North America','أمريكا الشمالية'],['South America','أمريكا الجنوبية'],['Oceania','أوقيانوسيا'],['UNSPECIFIED','غير محددة في المرجع']].map(([id,name])=><option key={id} value={id}>{ar?name:id}</option>)}</select></label>
    <CanonicalPicker label={ar?'الدولة':'Country'} icon={<Globe2 aria-hidden="true" className="h-3.5 w-3.5" />} value={countryId} onChange={(id,option)=>{selectedCountry.current=id??'';setCountryCode(option?.code??'');setError('');onChange('countryReferenceId',id??'');}} load={async query=>(await canonicalPickerApi.filterCountries(query)).filter(option=>!continent||(continent==='UNSPECIFIED'?!option.metadata?.region:option.metadata?.region===continent))} reloadKey={`university-filter-countries:${continent}`} compact optional allowInactive />
    <CanonicalPicker label={ar?'المنطقة':'Region'} icon={<Map aria-hidden="true" className="h-3.5 w-3.5" />} value={regionId} onChange={id=>onChange('regionReferenceId',id??'')} load={(query,page)=>canonicalPickerApi.regions(countryCode,query,page)} reloadKey={`university-filter-regions:${countryCode}`} disabled={!countryCode} compact paged optional allowInactive />
    <CanonicalPicker label={ar?'المدينة':'City'} icon={<MapPin aria-hidden="true" className="h-3.5 w-3.5" />} value={cityId} onChange={id=>onChange('cityReferenceId',id??'')} load={(query,page)=>canonicalPickerApi.cities(countryCode,regionId||undefined,query,page)} reloadKey={`university-filter-cities:${countryCode}:${regionId}`} disabled={!countryCode} compact paged optional allowInactive />
    {error&&<p role="status" className="col-span-full text-xs text-amber-800">{error}</p>}
  </>;
}
