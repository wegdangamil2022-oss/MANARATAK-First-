#!/usr/bin/env python3
"""Read-only audit: every active university matches a same-country city and region."""
import csv
import hashlib
import io
import json
import subprocess
import argparse
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / 'workspace/reports/active-geography-alignment/2026-10-13'

def check(ok, reason):
    if not ok:
        raise ValueError(reason)

def rows(raw):
    workbook = openpyxl.load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
    result = {}
    for sheet in workbook:
        headers = None
        for values in sheet.values:
            if 'Reference ID' in values:
                headers = list(values)
                continue
            if headers is None:
                continue
            row = dict(zip(headers, values))
            ref = row.get('Reference ID')
            if ref:
                check(ref not in result, 'Duplicate university identity')
                result[ref] = (sheet.title, row)
    workbook.close()
    return result

def verify(snapshot=None):
    def read(path):
        return subprocess.check_output(['git', 'show', snapshot + ':' + str(path.relative_to(ROOT))], cwd=ROOT) if snapshot else path.read_bytes()
    summary = json.loads((REPORT / 'summary.json').read_text())
    country_workbook = openpyxl.load_workbook(io.BytesIO(read(ROOT / 'workspace/reference-data/countries/MANARATAK_All_Continents_Country_Records_CLEAN_IMPORT_READY.xlsx')), read_only=True, data_only=True)
    country_rows = iter(country_workbook['Countries'].values)
    country_headers = next(country_rows)
    countries = {row[country_headers.index('iso_alpha3')]: row[country_headers.index('iso_alpha2')] for row in country_rows if row[country_headers.index('iso_alpha3')]}
    country_workbook.close()
    regions, cities = {}, {}
    for path in (ROOT / 'workspace/reference-data/regions').glob('*/*.csv'):
        for row in csv.DictReader(io.StringIO(read(path).decode('utf-8-sig'))):
            check(row['regionCode'] not in regions, 'Duplicate region code')
            regions[row['regionCode']] = row
    for path in (ROOT / 'workspace/reference-data/cities').glob('*/*.csv'):
        baseline = subprocess.check_output(['git', 'show', summary['baseCommit'] + ':' + str(path.relative_to(ROOT))], cwd=ROOT)
        check(baseline == read(path), 'Unrecorded city change')
        for row in csv.DictReader(io.StringIO(read(path).decode('utf-8-sig'))):
            check(row['cityId'] not in cities, 'Duplicate city identity')
            region = regions.get(row['regionCode'])
            check(region and all(region[k] == row[k] for k in ('countryIso2', 'countryIso3')), 'City country/region mismatch')
            check(countries.get(row['countryIso3']) == row['countryIso2'], 'City country registry mismatch')
            cities[row['cityId']] = row
    receipts = [json.loads(line) for line in (REPORT / 'excluded-universities.jsonl').read_text().splitlines()]
    excluded = {r['referenceId']: r for r in receipts}
    check(len(excluded) == len(receipts), 'Duplicate exclusion receipt')
    accepted, archived, all_baseline = set(), set(), set()
    active_paths = {str(p.relative_to(ROOT)) for p in (ROOT / 'workspace/import-sources/universities/stage-1').glob('*.xlsx')}
    check(active_paths == {a['path'] for a in summary['universityFiles']}, 'Untracked active workbook')
    for artifact in summary['universityFiles']:
        baseline = subprocess.check_output(['git', 'show', summary['baseCommit'] + ':' + artifact['path']], cwd=ROOT)
        current = read(ROOT / artifact['path'])
        archive = (ROOT / artifact['archivePath']).read_bytes()
        for raw, key in ((baseline, 'beforeSha256'), (current, 'afterSha256'), (archive, 'archiveSha256')):
            check(hashlib.sha256(raw).hexdigest() == artifact[key], 'Workbook checksum mismatch')
        before, after, removed = rows(baseline), rows(current), rows(archive)
        check(not set(after) & set(removed) and set(before) == set(after) | set(removed), 'University identity conservation')
        check(len(removed) == artifact['excludedRows'], 'Archive count mismatch')
        for ref, (sheet, row) in after.items():
            check(ref not in accepted and ref not in archived, 'Duplicate active university')
            check(before[ref] == (sheet, row) and sheet != 'Geography Review', 'Unexpected active university edit')
            city = cities.get(row['City Source ID'])
            check(city and city['cityNameEn'] == row['City'] and city['countryIso3'] == row['ISO3']
                  and city['regionCode'] == row['City Region Code'], 'University city/country/region mismatch')
            check(row['Geography Status'] == 'SOURCE_MATCHED', 'Unresolved active university')
            accepted.add(ref)
        for ref, (sheet, row) in removed.items():
            check(ref not in archived and ref not in accepted, 'Duplicate archived university')
            check(sheet == 'Geography Review' and before[ref] == (sheet, row), 'Archive data loss')
            receipt = excluded.get(ref)
            check(receipt and receipt['originalRow'] == row and receipt['sourcePath'] == artifact['path']
                  and receipt['reason'] == row['Geography Review Reason'], 'Missing exclusion provenance')
            archived.add(ref)
        check(not all_baseline & set(before), 'Duplicate baseline institution')
        all_baseline.update(before)
    check(archived == set(excluded) and len(archived) == summary['excludedUniversities'], 'Excluded identity mismatch')
    check(len(accepted) + len(archived) == len(all_baseline), 'Institution loss')
    result = {'result': 'PASS', 'activeCities': len(cities), 'activeUniversities': len(accepted),
              'archivedUniversities': len(archived), 'universityCityMismatches': 0,
              'cityRegionMismatches': 0, 'databaseWrites': 0}
    print(json.dumps(result))
    return result

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--snapshot')
    verify(parser.parse_args().snapshot)
