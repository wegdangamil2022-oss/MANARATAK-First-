import {useEffect,useState} from 'react';
import {ApiClient} from '../../../api/client';
export function CountryCitiesPanel({slug,locale}:{slug:string;locale:'ar'|'en'}){
 const [page,setPage]=useState(1);const [result,setResult]=useState<{data:Array<{id:string;name:string;nameAr?:string|null}>;totalPages:number;total:number}|null>(null);const [error,setError]=useState('');
 useEffect(()=>{setPage(1);setResult(null);},[slug]);useEffect(()=>{let active=true;setError('');void ApiClient.getStudyDestinationCities(slug,page).then(value=>{if(active)setResult(value);}).catch(cause=>{if(active){setResult(null);setError(String(cause));}});return()=>{active=false;};},[slug,page]);
 return <section><h3 className="font-bold">{locale==='ar'?'مدن مرجعية نشطة':'Active canonical cities'}</h3>{error?<p role="alert">{error}</p>:result?<><ul className="flex flex-wrap gap-3">{result.data.map(city=><li key={city.id}>{locale==='ar'?(city.nameAr||city.name):city.name}</li>)}</ul><p>{result.total} · {page}/{Math.max(1,result.totalPages)}</p><button disabled={page===1} onClick={()=>setPage(page-1)}>{locale==='ar'?'السابق':'Previous'}</button><button disabled={page>=result.totalPages} onClick={()=>setPage(page+1)}>{locale==='ar'?'التالي':'Next'}</button></>:<p>{locale==='ar'?'تحميل المدن…':'Loading cities…'}</p>}</section>;
}
