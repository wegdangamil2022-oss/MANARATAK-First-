#!/usr/bin/env python3
"""Read-only source integrity for official-address city corrections."""
import csv,hashlib,io,json,subprocess,collections,re
from pathlib import Path
import openpyxl
ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'workspace/reports/university-city-research/2026-10-13'
def check(ok,message):
 if not ok:raise ValueError(message)
def records(name):return [json.loads(row) for row in (REPORT/name).read_text().splitlines() if row]
def csv_rows(raw):return list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
def universities(raw):
 w=openpyxl.load_workbook(io.BytesIO(raw),read_only=True,data_only=True);result={}
 for sheet in [w.worksheets[0],w['Geography Review']]:
  header=None
  for values in sheet.values:
   if 'Reference ID' in values:header=list(values);continue
   if not header:continue
   row=dict(zip(header,values));ref=row.get('Reference ID')
   if ref:
    check(ref not in result,'Duplicate university identity');result[ref]=(sheet.title,row)
 w.close();return result
def verify():
 summary=json.loads((REPORT/'summary.json').read_text());decisions={r['referenceId']:r for r in records('decisions.jsonl')};unresolved={r['referenceId']:r for r in records('unresolved.jsonl')};added={r['cityId']:r for r in records('city-additions.jsonl')};aliases=records('city-aliases.jsonl');beforeCities={};cities={};regions={r['regionCode']:r for p in (ROOT/'workspace/reference-data/regions').glob('*/*.csv') for r in csv_rows(p.read_bytes())}
 for artifact in summary['cityFiles']:
  p=artifact['path'];old=subprocess.check_output(['git','show',summary['baseCommit']+':'+p],cwd=ROOT);new=(ROOT/p).read_bytes();check(hashlib.sha256(old).hexdigest()==artifact['beforeSha256'],'City baseline checksum');check(hashlib.sha256(new).hexdigest()==artifact['afterSha256'],'City current checksum')
  beforeCities.update({r['cityId']:r for r in csv_rows(old)})
  for r in csv_rows(new):
   check(r['cityId'] not in cities,'Duplicate city source identity');cities[r['cityId']]=r;region=regions.get(r['regionCode']);check(region and region['countryIso3']==r['countryIso3'] and region['countryIso2']==r['countryIso2'],'City country and region disagreement')
 check(set(cities)==set(beforeCities)|set(added),'Unexpected city addition or deletion')
 for cid,old in beforeCities.items():check(all(cities[cid][k]==v for k,v in old.items() if k!='cityAliases'),'Unrelated original city edit')
 expectedAliases={cid:row['cityAliases'] for cid,row in beforeCities.items()}
 for receipt in aliases:
  cid=receipt['cityId'];before=expectedAliases.get(cid,'');check(before==receipt['beforeAliases'],'Broken alias provenance chain');expectedAliases[cid]=receipt['afterAliases']
 for cid,c in cities.items():check(c['cityAliases']==expectedAliases.get(cid,''),'Unrecorded alias')
 for cid,receipt in added.items():
  c=cities[cid];check(c==receipt['row'],'New city receipt differs');check(c['verificationStatus']=='NEEDS_MANUAL_REVIEW' and not c['lastImportedAt'],'Unapproved source city promotion');check(receipt['officialEvidence']['url'].startswith('https://'),'Official city evidence URL required')
  g=receipt['geography']['geo'];check(c['countryIso2']==g['country'] and c['regionCode']==receipt['geography']['regionCode'],'New city geographical scope')
  check(c['latitude']==g['lat'] and c['longitude']==g['lon'],'Fabricated city coordinates')
  if g['feature']=='OFFICIAL_ADDRESS_LOCALITY':check(not c['latitude'] and not c['longitude'],'Official address must not invent coordinates')
 seen=set();matched=review=0;newMatches=set()
 geoFields={'City','City Source ID','City Region Code','Geography Status','Geography Review Reason'}
 for artifact in summary['universityFiles']:
  p=artifact['path'];old=subprocess.check_output(['git','show',summary['baseCommit']+':'+p],cwd=ROOT);new=(ROOT/p).read_bytes();check(hashlib.sha256(old).hexdigest()==artifact['beforeSha256'],'University baseline checksum');check(hashlib.sha256(new).hexdigest()==artifact['afterSha256'],'University current checksum');before=universities(old);after=universities(new);check(set(before)==set(after),'University identity loss')
  for ref,(sheet,r) in after.items():
   check(ref not in seen,'Duplicate university across workbooks');seen.add(ref);previousSheet,original=before[ref];check(all(r[k]==v for k,v in original.items() if k not in geoFields),'Unrelated university field edit')
   if sheet=='Geography Review':
    check(r['City']==original['City'] and not r['City Source ID'] and not r['City Region Code'] and r['Geography Status']=='REVIEW_REQUIRED','Unsafe review promotion');check(ref in unresolved,'Missing unresolved research receipt');review+=1
   else:
    c=cities.get(r['City Source ID']);check(c and c['countryIso3']==r['ISO3'] and c['regionCode']==r['City Region Code'] and c['cityNameEn']==r['City'],'University city/country/region disagreement');check(r['Geography Status']=='SOURCE_MATCHED','Invalid accepted university status');matched+=1
    if previousSheet=='Geography Review':
     d=decisions.get(ref);check(d and d['citySourceId']==r['City Source ID'] and d['cityName']==r['City'],'Missing correction evidence');check(d['source']['url'].startswith('https://') and re.fullmatch('[a-f0-9]{64}',d['source']['sha256']) and d['addressExcerpt'],'Official university address evidence required');newMatches.add(ref)
    else:check(all(r[k]==v for k,v in original.items()),'Previous accepted university unexpectedly changed')
 check(newMatches==set(decisions),'Unapplied university correction');check(matched==summary['matchedUniversityRows'] and review==summary['remainingReviewRows'] and len(seen)==10723,'University count mismatch');check(len(decisions)+len(unresolved)==1370,'Research coverage mismatch');print(json.dumps({'result':'PASS','matchedUniversities':matched,'reviewUniversities':review,'newlyResolved':len(decisions),'activeCities':len(cities),'addedCities':len(added),'databaseWrites':0}))
if __name__=='__main__':verify()
