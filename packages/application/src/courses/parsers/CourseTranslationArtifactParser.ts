import {readXlsxWorkbook} from '@manaratak/shared';
import {inspectXlsxArchive} from './CourseMasterArtifactParser';
export const COURSE_TRANSLATION_HEADERS=['الرقم','المنصة / الجامعة','اسم الدورة','الرابط المباشر للدورة','الدراسة مجانًا','الشهادة مجانية','نوع الشهادة','لغة الدورة','المستوى الدراسي','مدة الدورة','موضوعات الدورة المختصرة'] as const;
export interface CourseTranslationRow {sourceRow:number;sourceOrder:string;providerLabel:string;titleAr:string;url:string;studyFree:string;certificateFree:string;certificateTypeAr:string;learningLanguageLabelAr:string;studyLevelAr:string;durationAr:string;topicsAr:string}
export async function parseCourseTranslationArtifact(bytes:Uint8Array):Promise<CourseTranslationRow[]> {
  inspectXlsxArchive(bytes);
  const workbook=await readXlsxWorkbook(bytes,{maxBytes:25*1024*1024,maxSheets:64,maxRowsPerSheet:100001});
  if([...workbook.sheets.values()].some(sheet=>sheet.formulas.length))throw Error('COURSE_TRANSLATION_FORMULAS_FORBIDDEN');
  const sheet=workbook.sheets.get('الدورات');
  if(!sheet)throw Error('COURSE_TRANSLATION_SHEET_REQUIRED');
  return parseCourseTranslationMatrix(sheet.rawRows);
}
export function parseCourseTranslationMatrix(matrix:unknown[][]):CourseTranslationRow[] {
  const text=(value:unknown)=>String(value??'').trim();
  if(JSON.stringify((matrix[0]??[]).map(text))!==JSON.stringify(COURSE_TRANSLATION_HEADERS))throw Error('COURSE_TRANSLATION_HEADERS_INVALID');
  const rows:CourseTranslationRow[]=[],orders=new Set<string>();
  for(let i=1;i<matrix.length;i++){
    const values=matrix[i].map(text);
    if(values.every(value=>!value))continue;
    if(values.length!==11||values.some(value=>!value||value.length>10000)||values[2].length>500)throw Error(`COURSE_TRANSLATION_ROW_INVALID:${i+1}`);
    if(!/^\d+$/.test(values[0])||orders.has(values[0]))throw Error(`COURSE_TRANSLATION_ORDER_INVALID:${i+1}`);
    orders.add(values[0]);
    const url=new URL(values[3]);
    if(url.protocol!=='https:'||url.username||url.password)throw Error(`COURSE_TRANSLATION_URL_INVALID:${i+1}`);
    const [sourceOrder,providerLabel,titleAr,link,studyFree,certificateFree,certificateTypeAr,learningLanguageLabelAr,studyLevelAr,durationAr,topicsAr]=values;
    rows.push({sourceRow:i+1,sourceOrder,providerLabel,titleAr,url:link,studyFree,certificateFree,certificateTypeAr,learningLanguageLabelAr,studyLevelAr,durationAr,topicsAr});
  }
  if(!rows.length)throw Error('COURSE_TRANSLATION_EMPTY');
  return rows;
}
