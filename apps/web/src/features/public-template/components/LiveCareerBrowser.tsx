import { useEffect, useRef, useState } from 'react';
import { ApiClient, type PublicCareerJobDto, type ReferenceCountryDto } from '../../../api/client';
import { useTranslation } from '../../../i18n/I18nProvider';
export function LiveCareerBrowser({ detailId, onDetailChange, onBack, favoriteIds = [], onToggleFavorite }: { detailId?: string; onDetailChange?: (id:string)=>void; onBack?:()=>void; favoriteIds?: string[]; onToggleFavorite?: (id:string)=>void }) {
  const { language, dir } = useTranslation(), c = (ar:string,en:string)=>language==='ar'?ar:en;
  const [search,setSearch]=useState(''),[country,setCountry]=useState(''),[countrySearch,setCountrySearch]=useState('');
  const [type,setType]=useState(''),[employment,setEmployment]=useState(''),[remote,setRemote]=useState('');
  const [countries,setCountries]=useState<ReferenceCountryDto[]>([]),[jobs,setJobs]=useState<PublicCareerJobDto[]>([]);
  const [cursor,setCursor]=useState<string|null>(null),[total,setTotal]=useState(0),[loading,setLoading]=useState(false),[notice,setNotice]=useState(''),[reload,setReload]=useState(0);
  const [localDetail,setLocalDetail]=useState(''),[detail,setDetail]=useState<PublicCareerJobDto|null>(null);
  const sequence=useRef(0),detailSequence=useRef(0),loadingMore=useRef(false);
  const selected=detailId ?? localDetail;
  const open=(slug:string)=>onDetailChange?onDetailChange(slug):setLocalDetail(slug);
  const filters={search:search.trim()||undefined,countryReferenceId:country||undefined,opportunityType:type||undefined,employmentType:employment||undefined,remoteOption:remote?remote==='true':undefined,locale:language,limit:20};
  useEffect(()=>{
    const generation=++sequence.current;setLoading(true);setNotice('');setJobs([]);setCursor(null);
    const timer=setTimeout(()=>void ApiClient.getCareerJobs(filters).then(page=>{if(generation!==sequence.current)return;setJobs(page.data);setTotal(page.total);setCursor(page.nextCursor??null);}).catch(()=>{if(generation===sequence.current)setNotice(language==='ar'?'تعذر تحميل الفرص':'Could not load opportunities');}).finally(()=>{if(generation===sequence.current)setLoading(false);}),250);
    return()=>{clearTimeout(timer);++sequence.current;};
  },[search,country,type,employment,remote,language,reload]);
  useEffect(()=>{
    let active=true;const timer=setTimeout(()=>void ApiClient.getReferenceCountries({q:countrySearch||undefined,locale:language,page:1,pageSize:50}).then(rows=>{if(active)setCountries(rows);}).catch(()=>{if(active)setNotice(language==='ar'?'تعذر تحميل الدول':'Could not load countries');}),250);
    return()=>{active=false;clearTimeout(timer);};
  },[countrySearch,language]);
  useEffect(()=>{
    const generation=++detailSequence.current;setDetail(null);
    if(selected)void ApiClient.getCareerJobBySlug(selected,language).then(row=>{if(generation===detailSequence.current)setDetail(row);}).catch(()=>{if(generation===detailSequence.current)setNotice(language==='ar'?'الفرصة غير متاحة أو انتهت':'Opportunity unavailable or expired');});
    return()=>{++detailSequence.current;};
  },[selected,language]);
  const more=async()=>{
    if(!cursor||loadingMore.current||loading)return;loadingMore.current=true;setLoading(true);const generation=sequence.current;
    try{const page=await ApiClient.getCareerJobs({...filters,cursor});if(generation!==sequence.current)return;setJobs(previous=>[...previous,...page.data.filter(row=>!previous.some(old=>old.id===row.id))]);setCursor(page.nextCursor??null);}
    catch{if(generation===sequence.current)setNotice(c('تعذر تحميل الصفحة','Could not load this page'));}
    finally{loadingMore.current=false;if(generation===sequence.current)setLoading(false);}
  };
  const salary=(row:PublicCareerJobDto)=>{
    const value=row.salaryRange;
    if(!value||value.minMinorUnits==null)return c('الراتب غير معلن','Salary undisclosed');
    const number=(units:unknown)=>{
      const scale=Number(value.scale),text=String(units).padStart(scale+1,'0');
      return scale?text.slice(0,-scale)+'.'+text.slice(-scale):text;
    };
    const period=({HOUR:c('ساعة','hour'),MONTH:c('شهر','month'),YEAR:c('سنة','year')} as Record<string,string>)[String(value.period)];
    return `${number(value.minMinorUnits)}–${number(value.maxMinorUnits)} ${String(value.currencyCode)} / ${period} · ${value.basis==='NET'?c('صافي','net'):c('إجمالي','gross')}`;
  };
  if(selected)return <section dir={dir} className="mx-auto max-w-3xl space-y-4 p-4"><button onClick={()=>open('')}>{c('العودة للفرص','Back to opportunities')}</button>{notice&&<p role="alert">{notice}</p>}{detail?<><h1 className="text-2xl font-bold">{detail.title}</h1><p>{detail.employer?.displayName} · {detail.country} · {detail.city}</p><p>{salary(detail)}</p><p className="whitespace-pre-wrap">{detail.description}</p><p>{detail.requiredSkills?.join(' · ')}</p><p>{detail.educationRequirement}</p><p>{detail.applicationDeadline&&new Date(detail.applicationDeadline).toLocaleDateString(language)}</p>{detail.metadata?.sourceUrl&&<a href={String(detail.metadata.sourceUrl)} target="_blank" rel="noopener noreferrer">{c('المصدر الرسمي','Official source')}</a>}{detail.metadata?.applicationChannel==='INTERNAL'?<a className="block font-bold" href={`/student?tab=careers&jobId=${encodeURIComponent(detail.id)}&jobSlug=${encodeURIComponent(detail.slug)}`}>{c('التقديم من حسابي','Apply from my account')}</a>:detail.externalPostingUrl&&<div><a href={detail.externalPostingUrl} target="_blank" rel="noopener noreferrer">{c('التقديم لدى الجهة','Apply at employer website')}</a><p>{c('ستنتقل إلى موقع خارجي؛ لا تعني زيارة الرابط نجاح التقديم.','You will leave this site; opening the link does not submit an application.')}</p></div>}</>:<p>{c('جارٍ تحميل التفاصيل','Loading details')}</p>}</section>;
  return <section dir={dir} className="mx-auto max-w-4xl space-y-4 p-4"><button onClick={onBack}>{c('رجوع','Back')}</button><h1 className="text-2xl font-bold">{c('الفرص المهنية','Career opportunities')}</h1>
    <div className="flex flex-wrap gap-3"><input type="search" maxLength={120} value={search} placeholder={c('ابحث عن فرصة','Search opportunities')} onChange={event=>setSearch(event.target.value)} aria-label={c('بحث الفرص','Opportunity search')} className="rounded border p-2"/>
    <input type="search" value={countrySearch} maxLength={120} placeholder={c('ابحث عن دولة','Search countries')} onChange={event=>setCountrySearch(event.target.value)}/><select aria-label={c('الدولة','Country')} value={country} onChange={event=>setCountry(event.target.value)}><option value="">{c('كل الدول','All countries')}</option>{country&&!countries.some(row=>row.id===country)&&<option value={country}>{c('الدولة المحددة','Selected country')}</option>}{countries.map(row=><option key={row.id} value={row.id}>{language==='ar'?row.nameAr||row.name:row.name}</option>)}</select>
    <select aria-label={c('نوع الفرصة','Opportunity type')} value={type} onChange={event=>setType(event.target.value)}><option value="">{c('كل الفرص','All opportunity types')}</option>{['JOB','INTERNSHIP','GRADUATE_PROGRAM','MENTORSHIP','CAREER_EVENT'].map(value=><option key={value}>{value}</option>)}</select>
    <select aria-label={c('نوع العمل','Employment type')} value={employment} onChange={event=>setEmployment(event.target.value)}><option value="">{c('كل أنواع العمل','All employment types')}</option>{['FULL_TIME','PART_TIME','CONTRACT','INTERNSHIP','REMOTE','HYBRID'].map(value=><option key={value}>{value}</option>)}</select>
    <select aria-label={c('مكان العمل','Work mode')} value={remote} onChange={event=>setRemote(event.target.value)}><option value="">{c('كل المواقع','All work modes')}</option><option value="true">{c('عن بعد','Remote')}</option><option value="false">{c('غير البعيد','Non remote')}</option></select></div>
    <p>{c('النتائج','Results')}: {total}</p>{notice&&<p role="alert">{notice}</p>}{loading&&<p>{c('جارٍ التحميل','Loading')}</p>}
    {jobs.map(row=><article key={row.id} className="space-y-2 rounded-2xl border p-4"><button className="text-lg font-bold" onClick={()=>open(row.slug)}>{row.title}</button><p>{row.employer?.displayName} · {row.country} · {row.city}</p><p>{salary(row)}</p><p>{row.description.slice(0,240)}</p>{onToggleFavorite&&<button onClick={()=>onToggleFavorite(row.slug)}>{favoriteIds.includes(row.slug)?c('إزالة من المحفوظات','Remove from saved'):c('حفظ الفرصة','Save opportunity')}</button>}</article>)}
    {!loading&&!jobs.length&&<p>{c('لا توجد فرص مطابقة','No matching opportunities')}</p>}
    {cursor&&<button disabled={loading} onClick={()=>void more()}>{c('المزيد','Load more')}</button>}<button disabled={loading} onClick={()=>setReload(value=>value+1)}>{c('تحديث','Refresh')}</button>
  </section>;
}
