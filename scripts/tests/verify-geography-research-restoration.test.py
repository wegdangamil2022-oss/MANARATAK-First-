import importlib.util, json, hashlib, shutil, tempfile, unittest
from pathlib import Path
import openpyxl

script = Path(__file__).resolve().parents[1] / 'verify-geography-research-restoration.py'
spec = importlib.util.spec_from_file_location('restoration', script)
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)
original_root, original_report = checker.ROOT, checker.REPORT

class RestorationIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        checker.ROOT = Path(self.tmp.name)
        checker.REPORT = checker.ROOT / original_report.relative_to(original_root)
        (checker.ROOT / '.git').symlink_to(original_root / '.git', target_is_directory=True)
        for directory in ('workspace/reference-data', 'workspace/import-sources/universities/stage-1',
                          'workspace/reports/active-geography-alignment/2026-10-13', 'workspace/reports/geography-closeout/2026-10-13',
                          str(original_report.relative_to(original_root))):
            shutil.copytree(original_root / directory, checker.ROOT / directory)

    def tearDown(self):
        checker.ROOT, checker.REPORT = original_root, original_report
        self.tmp.cleanup()

    def edit_workbook(self, mutate):
        summary = json.loads((checker.REPORT / 'summary.json').read_text())
        artifact = next(a for a in summary['artifacts'] if a['kind'] == 'universities')
        path = checker.ROOT / artifact['path']
        workbook = openpyxl.load_workbook(path)
        sheet = workbook.worksheets[0]
        index = next(i for i, values in enumerate(sheet.values, 1) if 'Reference ID' in values)
        headers = [cell.value for cell in sheet[index]]
        mutate(sheet, index, headers)
        workbook.save(path)
        workbook.close()
        artifact['afterSha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
        (checker.REPORT / 'summary.json').write_text(json.dumps(summary))

    def test_deleting_institution_cannot_raise_matching_percentage(self):
        self.edit_workbook(lambda sheet, index, headers: sheet.delete_rows(index + 1))
        with self.assertRaisesRegex(ValueError, 'University identity loss'):
            checker.verify()

    def test_unrecorded_city_change_is_rejected_even_after_hash_update(self):
        self.edit_workbook(lambda sheet, index, headers: setattr(sheet.cell(index + 1, headers.index('City') + 1), 'value', 'Wrong locality'))
        with self.assertRaisesRegex(ValueError, 'Unrecorded university edit'):
            checker.verify()

    def test_immutable_original_archive_cannot_be_changed(self):
        summary = json.loads((checker.ROOT / 'workspace/reports/active-geography-alignment/2026-10-13/summary.json').read_text())
        path = checker.ROOT / summary['universityFiles'][0]['archivePath']
        path.write_bytes(path.read_bytes() + b'tampered')
        with self.assertRaisesRegex(ValueError, 'Historical archive checksum'):
            checker.verify()

if __name__ == '__main__':
    unittest.main()
