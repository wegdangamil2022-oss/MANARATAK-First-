import csv
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import tempfile
import subprocess
import unittest

script=Path(__file__).resolve().parents[1]/'verify-city-verification.py'
spec=importlib.util.spec_from_file_location('city_verification',script)
checker=importlib.util.module_from_spec(spec);spec.loader.exec_module(checker)
original_root,original_report=checker.ROOT,checker.REPORT

class CityVerificationNegativeTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();checker.ROOT=Path(self.temp.name)
        checker.REPORT=checker.ROOT/'workspace/reports/city-verification/2026-10-13'
        (checker.ROOT/'.git').symlink_to(original_root/'.git',target_is_directory=True)
        shutil.copytree(original_root/'workspace/reference-data',checker.ROOT/'workspace/reference-data')
        shutil.copytree(original_report,checker.REPORT)
        summary=json.loads((checker.REPORT/'summary.json').read_text())
        for artifact in summary['files']:
            (checker.ROOT/artifact['path']).write_bytes(subprocess.check_output(['git','show','32ad8354:'+artifact['path']],cwd=original_root))
    def tearDown(self):
        checker.ROOT,checker.REPORT=original_root,original_report;self.temp.cleanup()
    def edit(self,edit,original=False):
        additions=checker.records('additions.jsonl');a=additions[0];path=checker.ROOT/a['file']
        rows=checker.csv_rows(path.read_bytes());row=rows[0] if original else next(r for r in rows if r['cityId']==a['cityId'])
        edit(row,a)
        if not original:
            a['row']=row
            (checker.REPORT/'additions.jsonl').write_text(''.join(json.dumps(r)+'\n' for r in additions))
        stream=io.StringIO(newline='');writer=csv.DictWriter(stream,fieldnames=list(rows[0]),lineterminator='\n');writer.writeheader();writer.writerows(rows);path.write_text(stream.getvalue())
        summary=json.loads((checker.REPORT/'summary.json').read_text())
        for f in summary['files']:
            if f['path']==a['file']:f['afterSha256']=hashlib.sha256(path.read_bytes()).hexdigest()
        (checker.REPORT/'summary.json').write_text(json.dumps(summary))
    def test_foreign_region(self):
        self.edit(lambda r,a:r.update(regionCode='US-CA'))
        with self.assertRaisesRegex(ValueError,'Second source region'):checker.verify()
    def test_unreviewed_promotion(self):
        self.edit(lambda r,a:r.update(verificationStatus='VERIFIED'))
        with self.assertRaisesRegex(ValueError,'Unapproved runtime promotion'):checker.verify()
    def test_missing_university_evidence(self):
        self.edit(lambda r,a:a.update(universityReferences=[]))
        with self.assertRaisesRegex(ValueError,'Missing university source evidence'):checker.verify()
    def test_unrelated_coordinate_edit(self):
        self.edit(lambda r,a:r.update(latitude='0'),original=True)
        with self.assertRaisesRegex(ValueError,'Unrelated original record edit'):checker.verify()

if __name__=='__main__':unittest.main()
