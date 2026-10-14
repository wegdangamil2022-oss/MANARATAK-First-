#!/usr/bin/env python3
"""Verify the frozen Batch 12 workbook and every source-only geography change."""
import collections
import csv
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys

import openpyxl

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / 'workspace/reports/university-location-workbook/2026-10-14-batch12'


def check(condition, message):
    if not condition:
        raise ValueError(message)


def verify():
    summary = json.loads((REPORT / 'summary.json').read_text())
    metadata = json.loads((REPORT / 'workbook-metadata.json').read_text())
    raw = (REPORT / 'user-location-review-batch12.xlsx').read_bytes()
    check(hashlib.sha256(raw).hexdigest() == metadata['sha256'], 'Uploaded workbook checksum')
    workbook = openpyxl.load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
    values = list(workbook['الجامعات 274'].values)
    uploaded = {row[0]: (number, dict(zip(values[0], row))) for number, row in enumerate(values[1:], 2)}
    check(len(values) == 275 and len(uploaded) == 274, 'Uploaded duplicate or missing identity')
    workbook.close()
    decisions = json.loads((REPORT / 'reviewed-decisions.json').read_text())
    dispositions = json.loads((REPORT / 'row-dispositions.json').read_text())
    check(len(dispositions) == len({row['referenceId'] for row in dispositions}) == 274, 'Disposition identity coverage')
    selected = {row['referenceId']: row for row in decisions}
    holds = {row['referenceId'] for row in dispositions if row['disposition'] == 'HOLD'}
    check(len(selected) == len(decisions) == summary['appliedSourceBindings'], 'Accepted decision identities')
    check(not set(selected) & holds and set(selected) | holds == set(uploaded), 'Applied/hold partition')
    for ref, decision in selected.items():
        number, fields = uploaded[ref]
        check(fields['حالة النتيجة'] == 'مؤكد' and fields['countryIso3 الأصلي'] != 'XKX', 'Unconfirmed/unsupported country promotion')
        source = decision['source']
        check(source['worksheetRow'] == number and source['workbookSha256'] == metadata['sha256'], 'Decision provenance')
        digest = hashlib.sha256(json.dumps(fields, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
        check(source['sha256'] == digest and source['url'] == fields['رابط المصدر الرسمي'], 'Altered evidence row')

    spec = importlib.util.spec_from_file_location('restoration_integrity', ROOT / 'scripts/verify-geography-research-restoration.py')
    audit = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(audit)
    before, after = {}, {}
    for path in (ROOT / 'workspace/import-sources/universities/stage-1').glob('*.xlsx'):
        baseline = subprocess.check_output(['git', 'show', summary['baselineCommit'] + ':' + str(path.relative_to(ROOT))], cwd=ROOT)
        before.update(audit.workbookrows(baseline))
        after.update(audit.workbookrows(path.read_bytes()))
    check(len(before) == len(after) == 10723 and set(before) == set(after), 'University identity preservation')
    baseline_review = {ref for ref, (sheet, _) in before.items() if sheet == 'Geography Review'}
    check(baseline_review == set(uploaded), 'Workbook does not identify the baseline review queue')
    receipts = [json.loads(line) for line in (REPORT / 'applied-university-changes.jsonl').read_text().splitlines() if line]
    check(len(receipts) == len({r['referenceId'] for r in receipts}) == 274, 'Incomplete batch receipts')
    for receipt in receipts:
        ref = receipt['referenceId']
        check(receipt['before'] == before[ref][1] and (receipt['afterSheet'], receipt['after']) == after[ref], 'Batch before/after mismatch')
    allowed_fields = {'City', 'City Source ID', 'City Region Code', 'Geography Status', 'Geography Review Reason'}
    for ref, (sheet, row) in after.items():
        original_sheet, original = before[ref]
        changed = {key for key in set(original) | set(row) if original.get(key) != row.get(key)}
        check(changed <= allowed_fields, 'Non-geography university edit: ' + ref)
        if ref not in uploaded:
            check(row == original and sheet == original_sheet, 'Unselected university edit')
        elif ref in holds:
            check(sheet == 'Geography Review' and not row['City Source ID'] and not row['City Region Code'] and row['Geography Status'] == 'REVIEW_REQUIRED', 'Held row promoted')
        else:
            check(sheet != 'Geography Review' and row['Geography Review Reason'] == 'USER_RESEARCH_ADDRESS_REQUIRES_OWNER_VERIFICATION', 'Lost owner review limitation')

    city_before, city_after = {}, {}
    for path in (ROOT / 'workspace/reference-data/cities').rglob('*.csv'):
        raw_before = subprocess.check_output(['git', 'show', summary['baselineCommit'] + ':' + str(path.relative_to(ROOT))], cwd=ROOT)
        for rows, target in ((csv.DictReader(io.StringIO(raw_before.decode('utf-8-sig'))), city_before), (csv.DictReader(path.open(encoding='utf-8-sig')), city_after)):
            for row in rows:
                check(row['cityId'] not in target, 'Duplicate city identity')
                target[row['cityId']] = row
    check(set(city_before) <= set(city_after), 'Deleted original city')
    city_receipts = [json.loads(line) for line in (REPORT / 'applied-city-changes.jsonl').read_text().splitlines() if line]
    expected = dict(city_before)
    for receipt in city_receipts:
        identity = receipt['cityId']
        check(receipt.get('before') == expected.get(identity), 'Broken batch city receipt')
        expected[identity] = receipt['after']
    check(expected == city_after, 'Unrecorded batch city edit')
    for identity, row in city_after.items():
        if identity not in city_before:
            check(row['verificationStatus'] == 'NEEDS_MANUAL_REVIEW' and not row['latitude'] and not row['longitude'], 'Invented coordinates or city approval')
        else:
            check(row['verificationStatus'] == city_before[identity]['verificationStatus'], 'Existing city verification upgraded')
    integrity = audit.verify()
    check(integrity['reviewUniversities'] == len(holds) == summary['retainedReviewRows'], 'Review count mismatch')
    check(integrity['acceptedUniversities'] == summary['sourceMatchedUniversities'] and integrity['cities'] == summary['cities'], 'Summary mismatch')
    result = {'result': 'PASS', 'uploadedRows': 274, 'applied': len(selected), 'held': len(holds), 'newCities': len(set(city_after) - set(city_before)), 'universityNonGeographyEdits': 0, 'inventedCoordinates': 0, 'verificationUpgrades': 0, 'holdReasons': dict(collections.Counter(r['reason'] for r in dispositions if r['disposition'] == 'HOLD'))}
    print(json.dumps(result))
    return result


if __name__ == '__main__':
    verify()
