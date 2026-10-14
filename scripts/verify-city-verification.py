#!/usr/bin/env python3
"""Read-only verification of the follow-up source changes and their evidence."""
import csv
import argparse
import hashlib
import io
import json
import math
from pathlib import Path
import subprocess
from collections import defaultdict
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / 'workspace/reports/city-verification/2026-10-13'


def check(ok, reason):
    if not ok:
        raise ValueError(reason)


def records(name):
    return [json.loads(line) for line in (REPORT / name).read_text().splitlines() if line]


def csv_rows(raw):
    rows = list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
    check(rows and all(None not in r and None not in r.values() for r in rows), 'CSV column mismatch')
    return rows


def distance(row, source):
    a, b = math.radians(float(row['latitude'])), math.radians(float(source['latitude']))
    lon = math.radians(float(row['longitude']) - float(source['longitude']))
    return 12742 * math.asin(min(1, math.sqrt(math.sin((a-b)/2)**2 + math.cos(a)*math.cos(b)*math.sin(lon/2)**2)))


def verify(snapshot=None):
    summary = json.loads((REPORT / 'summary.json').read_text())
    removed = {r['removedCityId']: r for r in records('removals.jsonl')}
    added = {r['cityId']: r for r in records('additions.jsonl')}
    alias_rows = records('aliases.jsonl')
    aliases = defaultdict(set)
    for row in alias_rows:
        aliases[row['cityId']].add(row['alias'])
    region_rows = [r for f in (ROOT / 'workspace/reference-data/regions').glob('*/*.csv') for r in csv_rows(f.read_bytes())]
    regions = {(r['countryIso2'], r['regionCode']): r for r in region_rows}
    parents = {r['regionCode']: r['parentRegionCode'] for r in region_rows if r['parentRegionCode']}

    def ancestors(code):
        result = {code}
        while code in parents and parents[code] not in result:
            code = parents[code]
            result.add(code)
        return result

    def related(a, b):
        return a in ancestors(b) or b in ancestors(a)

    before, after = {}, {}
    for artifact in summary['files']:
        path = artifact['path']
        original = subprocess.check_output(['git', 'show', summary['baseCommit'] + ':' + path], cwd=ROOT)
        current = subprocess.check_output(['git', 'show', snapshot + ':' + path], cwd=ROOT) if snapshot else (ROOT / path).read_bytes()
        check(hashlib.sha256(original).hexdigest() == artifact['beforeSha256'], 'Baseline hash mismatch')
        check(hashlib.sha256(current).hexdigest() == artifact['afterSha256'], 'Current hash mismatch')
        old, new = csv_rows(original), csv_rows(current)
        check(list(new[0]) == list(old[0]) + ['cityAliases'], 'Unexpected header change')
        check(len(old) == artifact['beforeRows'] and len(new) == artifact['afterRows'], 'File count mismatch')
        for row in old:
            check(row['cityId'] not in before, 'Duplicate original identity')
            before[row['cityId']] = row
        for row in new:
            cid = row['cityId']
            check(cid not in after, 'Duplicate current identity')
            after[cid] = row
            actual_aliases = row['cityAliases'].split('|') if row['cityAliases'] else []
            check(len(actual_aliases) == len(set(actual_aliases)) and set(actual_aliases) == aliases[cid], 'Unrecorded alias change')
            if cid in before:
                check({k: v for k, v in row.items() if k != 'cityAliases'} == before[cid], 'Unrelated original record edit')
            else:
                check(cid in added and row == added[cid]['row'], 'Unrecorded new city')
                evidence = added[cid]
                g = evidence['geonames']
                check(g['country'] == row['countryIso2'], 'GeoNames country mismatch')
                check(row['sourceCityId'] == 'geonames:' + g['id'], 'External identity mismatch')
                check(row['latitude'] == g['lat'] and row['longitude'] == g['lon'], 'GeoNames coordinate mismatch')
                check(row['timezone'] == g['timezone'], 'Timezone mismatch')
                ZoneInfo(row['timezone'])
                check(row['verificationStatus'] == 'NEEDS_MANUAL_REVIEW' and not row['lastImportedAt'], 'Unapproved runtime promotion')
                check(any(d['countryIso2'] == row['countryIso2'] and related(row['regionCode'], d.get('regionCode')) and distance(row, d) < 10 for d in evidence['stateCityEvidence']), 'Second source region/position disagreement')
                check(evidence['universityReferences'] and all(u['enrichment'] and u['enrichment']['countryIso3'] == row['countryIso3'] and u['enrichment']['officialSource'].startswith('https://') for u in evidence['universityReferences']), 'Missing university source evidence')
            if row['regionCode']:
                region = regions.get((row['countryIso2'], row['regionCode']))
                check(region and region['countryIso3'] == row['countryIso3'], 'Cross-country or absent region')
    check(set(before) - set(after) == set(removed), 'Unrecorded deletion')
    check(set(after) - set(before) == set(added), 'Unrecorded addition')
    for cid, deletion in removed.items():
        check(deletion['removedRow'] == before[cid], 'Deleted source archive changed')
        retained = after.get(deletion['retainedCityId'])
        check(retained and retained['countryIso2'] == before[cid]['countryIso2'] and retained['regionCode'] == before[cid]['regionCode'], 'Missing same-scope retained identity')
        check(deletion['geonames'] and deletion['reason'], 'Deletion without evidence')
    for alias in alias_rows:
        row = after[alias['cityId']]
        check(alias['countryIso2'] == row['countryIso2'] and alias['regionCode'] == row['regionCode'], 'Alias scope mismatch')
        check(alias['geonames']['country'] == row['countryIso2'], 'Foreign alias evidence')
        point = {'latitude': alias['geonames']['lat'], 'longitude': alias['geonames']['lon']}
        check(distance(row, point) < 10, 'Alias city position disagreement')
        check(any(related(row['regionCode'], d.get('regionCode')) and d['countryIso2'] == row['countryIso2'] for d in alias['stateCityEvidence']), 'Alias secondary region disagreement')
    check(len(before) == summary['baselineCityRows'] and len(after) == summary['finalCityRows'], 'Global count mismatch')
    check(len(added) == summary['addedCityRows'] and len(removed) == summary['removedCityRows'], 'Change count mismatch')
    check(len(alias_rows) == summary['aliasLabels'] and len({a['cityId'] for a in alias_rows}) == summary['aliasCityRows'], 'Alias count mismatch')
    return {'status': 'PASS', 'removed': len(removed), 'added': len(added), 'aliasLabels': len(alias_rows),
            'totalCityRows': len(after), 'remainingMissingRegionCodes': sum(not r['regionCode'] for r in after.values()), 'databaseWrites': 0}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--snapshot')
    print(json.dumps(verify(parser.parse_args().snapshot), indent=2))
