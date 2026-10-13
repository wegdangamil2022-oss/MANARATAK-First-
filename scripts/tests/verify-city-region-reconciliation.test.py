"""Negative integrity checks using disposable copies, never original source files."""
import csv
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "verify-city-region-reconciliation.py"
spec = importlib.util.spec_from_file_location("city_integrity", SCRIPT)
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)
ORIGINAL_ROOT, ORIGINAL_REPORT = checker.ROOT, checker.REPORT


class CityIntegrityNegativeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        checker.ROOT = Path(self.temp.name)
        checker.REPORT = checker.ROOT / "workspace/reports/city-region-reconciliation/2026-10-13"
        (checker.ROOT / ".git").symlink_to(ORIGINAL_ROOT / ".git", target_is_directory=True)
        shutil.copytree(ORIGINAL_ROOT / "workspace/reference-data", checker.ROOT / "workspace/reference-data")
        shutil.copytree(ORIGINAL_REPORT, checker.REPORT)

    def tearDown(self):
        checker.ROOT, checker.REPORT = ORIGINAL_ROOT, ORIGINAL_REPORT
        self.temp.cleanup()

    def edit(self, edit, addition=True):
        summary = json.loads((checker.REPORT / "summary.json").read_text())
        records = checker.jsonl("added-cities.jsonl")
        record = records[0]
        path = checker.ROOT / record["file"]
        rows = checker.read_csv(path.read_bytes())
        row = next(r for r in rows if r["cityId"] == record["cityId"]) if addition else rows[0]
        edit(row)
        if addition:
            record["row"] = row
            (checker.REPORT / "added-cities.jsonl").write_text("".join(json.dumps(r) + "\n" for r in records))
        buffer = io.StringIO(newline="")
        writer = csv.DictWriter(buffer, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
        path.write_text(buffer.getvalue())
        # Update the checksum as well, proving semantic checks catch the defect.
        for file in summary["files"]:
            if file["path"] == record["file"]:
                file["afterSha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
        (checker.REPORT / "summary.json").write_text(json.dumps(summary))

    def test_rejects_cross_country_region_code(self):
        self.edit(lambda row: row.update(regionCode="US-CA"))
        with self.assertRaisesRegex(ValueError, "cross-country region"):
            checker.verify()

    def test_rejects_unreviewed_verified_city(self):
        self.edit(lambda row: row.update(verificationStatus="VERIFIED"))
        with self.assertRaisesRegex(ValueError, "promoted without review"):
            checker.verify()

    def test_rejects_false_import_timestamp(self):
        self.edit(lambda row: row.update(lastImportedAt="2026-10-13"))
        with self.assertRaisesRegex(ValueError, "False database import timestamp"):
            checker.verify()

    def test_rejects_unrelated_original_record_change(self):
        self.edit(lambda row: row.update(latitude="0"), addition=False)
        with self.assertRaisesRegex(ValueError, "Unexpected original record edit"):
            checker.verify()


if __name__ == "__main__":
    unittest.main()
