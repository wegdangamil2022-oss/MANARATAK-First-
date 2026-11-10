import {Globe2,MapPin,Map} from 'lucide-react';
import {RelatedCatalogPicker} from './RelatedCatalogPicker';
export function UniversityLocationFilters({countryId,regionId,cityId,continent='',context={},onChange,ar}:{
  countryId:string;regionId:string;cityId:string;continent?:string;context?:URLSearchParams|Record<string,string>;ar:boolean;
  onChange:(key:'continent'|'countryReferenceId'|'regionReferenceId'|'cityReferenceId',value:string)=>void;
}){
  const scope={...(context instanceof URLSearchParams?Object.fromEntries(context):context),continent,countryReferenceId:countryId,regionReferenceId:regionId,cityReferenceId:cityId};
  return <>
    <RelatedCatalogPicker catalog="universities" facet="continent" context={scope} ar={ar} label={ar?'القارة':'Continent'} value={continent} onChange={value=>onChange('continent',value)} icon={<Globe2 size={14}/>}/>
    <RelatedCatalogPicker catalog="universities" facet="countryReferenceId" context={scope} ar={ar} label={ar?'الدولة':'Country'} value={countryId} onChange={value=>onChange('countryReferenceId',value)} icon={<Globe2 size={14}/>}/>
    <RelatedCatalogPicker catalog="universities" facet="regionReferenceId" context={scope} ar={ar} label={ar?'المنطقة':'Region'} value={regionId} onChange={value=>onChange('regionReferenceId',value)} disabled={!countryId} icon={<Map size={14}/>}/>
    <RelatedCatalogPicker catalog="universities" facet="cityReferenceId" context={scope} ar={ar} label={ar?'المدينة':'City'} value={cityId} onChange={value=>onChange('cityReferenceId',value)} disabled={!countryId} icon={<MapPin size={14}/>}/>
  </>;
}
