#!/usr/bin/env python3
"""Offline audit of source changes, country scopes and all university identities."""
import csv, io, json, hashlib, subprocess, collections, unicodedata, re
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / 'workspace/reports/geography-research-restoration/2026-10-13'

def check(ok, message):
    if not ok:
        raise ValueError(message)

def csvrows(raw):
    return list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))

def records(name):
    return [json.loads(line) for line in (REPORT / name).read_text().splitlines() if line]

def workbookrows(raw):
    workbook = openpyxl.load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
    result = {}
    for sheet in workbook:
        if sheet != workbook.worksheets[0] and sheet.title != 'Geography Review':
            continue
        headers = None
        for values in sheet.values:
            if 'Reference ID' in values:
                headers = list(values)
                continue
            if headers:
                row = dict(zip(headers, values))
                ref = row.get('Reference ID')
                if ref:
                    check(ref not in result, 'Duplicate university in workbook')
                    result[ref] = (sheet.title, row)
    workbook.close()
    return result

def verify():
    summary = json.loads((REPORT / 'summary.json').read_text())
    base = summary['baseCommit']
    country_path = ROOT / summary['countryRegistryPath']
    check(hashlib.sha256(country_path.read_bytes()).hexdigest() == summary['countryRegistrySha256'], 'Country registry checksum')
    workbook = openpyxl.load_workbook(country_path, read_only=True, data_only=True)
    iterator = iter(workbook['Countries'].values)
    headers = next(iterator)
    countries = {row[headers.index('iso_alpha3')]: dict(zip(headers, row)) for row in iterator if row[headers.index('iso_alpha3')]}
    workbook.close()
    expected = {'cities': {}, 'regions': {}}
    current = {'cities': {}, 'regions': {}}
    university_baseline = {}
    university_current = {}
    for artifact in summary['artifacts']:
        path = artifact['path']
        before = subprocess.check_output(['git', 'show', base + ':' + path], cwd=ROOT)
        after = (ROOT / path).read_bytes()
        check(hashlib.sha256(before).hexdigest() == artifact['beforeSha256'], 'Baseline artifact checksum')
        check(hashlib.sha256(after).hexdigest() == artifact['afterSha256'], 'Current artifact checksum')
        kind = artifact['kind']
        if kind == 'universities':
            old, new = workbookrows(before), workbookrows(after)
            check(not set(university_baseline) & set(old) and not set(university_current) & set(new), 'Duplicate university across files')
            university_baseline.update(old)
            university_current.update(new)
        else:
            key = 'cityId' if kind == 'cities' else 'regionCode'
            for raw, target in ((before, expected[kind]), (after, current[kind])):
                for row in csvrows(raw):
                    check(row[key] not in target, 'Duplicate geographic source identity')
                    target[row[key]] = row
    quarantine = {r['cityId']: r for r in csvrows((ROOT / 'workspace/reports/geography-closeout/2026-10-13/city-quarantine.csv').read_bytes())}
    for kind, receipt_name, key in (('cities', 'city-changes.jsonl', 'cityId'), ('regions', 'region-changes.jsonl', 'regionCode')):
        for receipt in records(receipt_name):
            identity = receipt[key]
            before = receipt.get('before')
            after = receipt.get('after')
            if receipt['action'] == 'RESTORE_CITY':
                check(identity not in expected[kind] and before == quarantine.get(identity), 'Restored city original data loss')
            elif before is not None:
                check(expected[kind].get(identity) == before, 'Broken geographic receipt chain')
            else:
                check(identity not in expected[kind], 'Duplicate geographic addition')
            check(receipt.get('sourceUrl'), 'Missing geographic evidence source')
            if after is None:
                expected[kind].pop(identity)
            else:
                expected[kind][identity] = after
        check(expected[kind] == current[kind], 'Unrecorded geographic edit')
    regions, cities = current['regions'], current['cities']
    region_ids = [r['regionId'] for r in regions.values()]
    check(len(region_ids) == len(set(region_ids)), 'Duplicate region identity')
    for code, region in regions.items():
        country = countries.get(region['countryIso3'])
        check(country and country['iso_alpha2'] == region['countryIso2'] and country['continent'] == region['continent'], 'Region country/continent mismatch')
        parent = region['parentRegionCode']
        if parent:
            check(parent in regions and regions[parent]['countryIso3'] == region['countryIso3'] and regions[parent]['nameEn'] == region['parentRegionNameEn'], 'Invalid region parent: ' + code + ' -> ' + parent)
        seen = set()
        current_code = code
        while current_code:
            check(current_code not in seen, 'Region parent cycle')
            seen.add(current_code)
            current_code = regions[current_code]['parentRegionCode']
        if code.endswith('-NATIONAL'):
            check(region['regionType'] == 'country_scope' and region['adminLevel'] == '0' and 'not an ISO' in region['notes'], 'Invented ISO subdivision')
    scoped_names = collections.defaultdict(list)
    for cid, city in cities.items():
        region = regions.get(city['regionCode'])
        country = countries.get(city['countryIso3'])
        check(region and country and country['iso_alpha2'] == city['countryIso2'] and country['continent'] == city['continent'], 'City country/continent mismatch')
        check(all(city[k] == region[k] for k in ('countryIso2', 'countryIso3')), 'City cross-country region')
        check(city['regionNameEn'] == region['nameEn'] and city['regionNameAr'] == region['nameAr'], 'City region label mismatch')
        check(city['regionMatchStatus'] in {'MATCHED_BY_CODE', 'MATCHED_BY_NORMALIZED_NAME', 'MATCHED'}, 'Unresolved city region status')
        check(bool(city['latitude']) == bool(city['longitude']), 'Incomplete coordinate pair')
        if city['latitude']:
            check(-90 <= float(city['latitude']) <= 90 and -180 <= float(city['longitude']) <= 180, 'Invalid coordinates')
        folded = re.sub(r'[^\w]+', ' ', ''.join(c for c in unicodedata.normalize('NFKD', city['cityNameEn']).casefold() if not unicodedata.combining(c))).strip()
        scoped_names[(city['countryIso3'], city['regionCode'], folded)].append(cid)
    check(not [ids for ids in scoped_names.values() if len(ids) > 1], 'Ambiguous scoped city identities')
    check(set(countries) == {r['countryIso3'] for r in cities.values()}, 'Country missing city coverage')
    # The original archive is an immutable historical source, including records restored later.
    archives = ROOT / 'workspace/reports/active-geography-alignment/2026-10-13'
    archive_summary = json.loads((archives / 'summary.json').read_text())
    for artifact in archive_summary['universityFiles']:
        raw = (ROOT / artifact['archivePath']).read_bytes()
        check(hashlib.sha256(raw).hexdigest() == artifact['archiveSha256'], 'Historical archive checksum')
        for ref, entry in workbookrows(raw).items():
            check(ref not in university_baseline, 'Duplicate original university identity')
            university_baseline[ref] = entry
    expected_universities = dict(university_baseline)
    for receipt in records('university-changes.jsonl'):
        ref = receipt['referenceId']
        check(ref in expected_universities and expected_universities[ref][1] == receipt['before'], 'Broken university receipt chain')
        expected_universities[ref] = (receipt['afterSheet'], receipt['after'])
    check(set(university_current) == set(university_baseline), 'University identity loss')
    for ref, (sheet, row) in university_current.items():
        check(expected_universities[ref] == (sheet, row), 'Unrecorded university edit')
        original = university_baseline[ref][1]
        geo_fields = {'City', 'City Source ID', 'City Region Code', 'Geography Status', 'Geography Review Reason'}
        check(all(row.get(k) == v for k, v in original.items() if k not in geo_fields), 'Unrelated university field edit')
        if sheet == 'Geography Review':
            check(not row['City Source ID'] and not row['City Region Code'] and row['Geography Status'] == 'REVIEW_REQUIRED', 'Guessed unresolved university city')
        else:
            city = cities.get(row['City Source ID'])
            check(city and city['cityNameEn'] == row['City'] and city['countryIso3'] == row['ISO3'] and city['regionCode'] == row['City Region Code'], 'University city/country/region mismatch')
            check(row['Geography Status'] == 'SOURCE_MATCHED', 'Invalid accepted geography status')
    counts = collections.Counter(sheet == 'Geography Review' for sheet, _ in university_current.values())
    result = {'result': 'PASS', 'countries': len(countries), 'regions': len(regions), 'cities': len(cities), 'universities': len(university_current), 'acceptedUniversities': counts[False], 'reviewUniversities': counts[True], 'countryCityCoverageGaps': 0, 'scopedCityCollisions': 0, 'fuzzyRegionLinks': 0, 'universityCityMismatches': 0, 'databaseWrites': 0}
    print(json.dumps(result))
    return result

if __name__ == '__main__':
    verify()
