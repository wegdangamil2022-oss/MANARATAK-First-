#!/usr/bin/env python3
"""Offline integrity: active geography and lossless university source quarantine."""
import csv,io,json,hashlib,subprocess,collections,argparse
from pathlib import Path
import openpyxl
ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'workspace/reports/geography-closeout/2026-10-13'
def check(value,reason):
 if not value:raise ValueError(reason)
def records(name):return [json.loads(r) for r in (REPORT/name).read_text().splitlines() if r]
def csvrows(raw):return list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
def workbook_rows(raw):
 w=openpyxl.load_workbook(io.BytesIO(raw),read_only=True,data_only=True);result=[]
 for s in w:
  if s!=w.worksheets[0] and s.title!='Geography Review':continue
  headers=None
  for values in s.values:
   if 'Reference ID' in values:headers=list(values);continue
   if headers is None:continue
   row=dict(zip(headers,values))
   if row.get('Reference ID'):result.append((s.title,row))
 w.close();return result
def verify(snapshot=None):
 def read(path):return subprocess.check_output(['git','show',snapshot+':'+path],cwd=ROOT) if snapshot else (ROOT/path).read_bytes()
 summary=json.loads((REPORT/'summary.json').read_text());regions={r['regionCode']:r for f in (ROOT/'workspace/reference-data/regions').glob('*/*.csv') for r in csvrows(f.read_bytes())};cities={};before={}
 corrections={r['cityId']:r for r in records('city-region-corrections.jsonl')};quarantine={r['cityId']:r for r in csvrows((REPORT/'city-quarantine.csv').read_bytes())}
 for artifact in summary['cityFiles']:
  p=artifact['path'];old=subprocess.check_output(['git','show',summary['baseCommit']+':'+p],cwd=ROOT);new=read(p)
  check(hashlib.sha256(old).hexdigest()==artifact['beforeSha256'],'City baseline checksum');check(hashlib.sha256(new).hexdigest()==artifact['afterSha256'],'City current checksum')
  before.update({r['cityId']:r for r in csvrows(old)})
  for r in csvrows(new):
   cid=r['cityId'];check(cid not in cities,'Duplicate city');cities[cid]=r;region=regions.get(r['regionCode']);check(region and region['countryIso2']==r['countryIso2'] and region['countryIso3']==r['countryIso3'],'City country/region mismatch')
 check(set(before)==set(cities)|set(quarantine) and not set(cities)&set(quarantine),'City identity conservation')
 for cid,r in before.items():
  if cid in quarantine:check(r==quarantine[cid] and not r['regionCode'],'Quarantine must preserve full unresolved city')
  elif cid in corrections:
   changed={k for k in r if r[k]!=cities[cid][k]};check(changed<= {'regionCode','regionNameEn','regionNameAr','regionMatchStatus'} and changed,'Only region correction permitted')
   receipt=corrections[cid];check(all(r[k]==v for k,v in receipt['before'].items()) and all(cities[cid][k]==v for k,v in receipt['after'].items()),'Region correction receipt')
  else:check(r==cities[cid],'Unrecorded city edit')
 decisions={r['referenceId']:r for r in records('university-geography-decisions.jsonl')};seen=set();counts=collections.Counter()
 for artifact in summary['universities']['files']:
  p=artifact['path'];old=subprocess.check_output(['git','show',summary['baseCommit']+':'+p],cwd=ROOT);new=read(p);check(hashlib.sha256(old).hexdigest()==artifact['beforeSha256'],'University baseline checksum');check(hashlib.sha256(new).hexdigest()==artifact['afterSha256'],'University current checksum')
  originals={r['Reference ID']:r for _,r in workbook_rows(old)};current=workbook_rows(new);check(set(originals)=={r['Reference ID'] for _,r in current},'University identity conservation')
  for sheet,r in current:
   ref=r['Reference ID'];check(ref not in seen,'Duplicate university');seen.add(ref);original=originals[ref];d=decisions[ref];check(d['before']==original,'University original receipt')
   check(all(r[k]==v for k,v in original.items() if k!='City'),'Unrelated university edit')
   if sheet=='Geography Review':
    check(r['Geography Status']=='REVIEW_REQUIRED' and not r['City Source ID'] and not r['City Region Code'] and r['City']==original['City'],'Quarantined university cannot be promoted');counts['review']+=1
   else:
    c=cities.get(r['City Source ID']);check(c and c['countryIso3']==r['ISO3'] and c['regionCode']==r['City Region Code'] and c['cityNameEn']==r['City'],'University city/country/region mismatch');check(r['Geography Status']=='SOURCE_MATCHED' and d['citySourceId']==c['cityId'],'University binding receipt');counts['matched']+=1
 check(seen==set(decisions),'Missing university decision');check(counts['matched']==summary['universities']['matched'] and counts['review']==summary['universities']['review'],'University count mismatch');print(json.dumps({'result':'PASS','activeCities':len(cities),'quarantinedCities':len(quarantine),'universities':dict(counts),'databaseWrites':0}))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--snapshot');verify(parser.parse_args().snapshot)
