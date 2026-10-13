#!/usr/bin/env python3
"""Offline integrity check for the reviewed 2026-10-13 city source changes.

Reads CSVs, frozen evidence and the recorded Git baseline. No network, database,
imports or publication. Run from any directory in a checkout with baseline history.
"""
import csv
import hashlib
import io
import json
import math
from pathlib import Path
import subprocess
import unicodedata
from collections import defaultdict
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "workspace/reports/city-region-reconciliation/2026-10-13"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def jsonl(name):
    return [json.loads(line) for line in (REPORT / name).read_text().splitlines() if line]


def read_csv(raw):
    rows = list(csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))))
    require(rows and all(None not in r and None not in r.values() for r in rows), "CSV column mismatch")
    return rows


def normalized(value):
    return " ".join("".join(c if unicodedata.category(c)[0] in "LNM" else " "
                            for c in unicodedata.normalize("NFKC", value).casefold()).split())


def collision_pairs(rows):
    groups = defaultdict(set)
    for row in rows:
        groups[(row["countryIso3"], row["regionCode"], normalized(row["cityNameEn"]))].add(row["cityId"])
    return {frozenset(ids) for ids in groups.values() if len(ids) > 1}


def verify():
    summary = json.loads((REPORT / "summary.json").read_text())
    changes = jsonl("region-changes.jsonl")
    holds = jsonl("unresolved-regions.jsonl")
    additions = jsonl("added-cities.jsonl")
    change_map = {c["cityId"]: c for c in changes}
    added_map = {a["cityId"]: a for a in additions}
    geo = {g["id"]: g for g in jsonl("geonames-excerpts.jsonl")}
    regions = defaultdict(list)
    for path in sorted((ROOT / "workspace/reference-data/regions").glob("*/*.csv")):
        for row in read_csv(path.read_bytes()):
            regions[(row["countryIso2"], row["regionCode"])].append(row)
    original = []
    current = []
    for artifact in summary["files"]:
        path = artifact["path"]
        old_bytes = subprocess.check_output(["git", "show", summary["baseCommit"] + ":" + path], cwd=ROOT)
        new_bytes = (ROOT / path).read_bytes()
        require(hashlib.sha256(old_bytes).hexdigest() == artifact["beforeSha256"], "Baseline hash changed: " + path)
        require(hashlib.sha256(new_bytes).hexdigest() == artifact["afterSha256"], "Source hash changed: " + path)
        old_rows, new_rows = read_csv(old_bytes), read_csv(new_bytes)
        require(list(old_rows[0]) == list(new_rows[0]), "CSV header changed")
        require([c["cityId"] for c in new_rows[:len(old_rows)]] == [c["cityId"] for c in old_rows], "Original identities/order changed")
        require(len(new_rows) - len(old_rows) == artifact["addedRows"], "Added count mismatch")
        for old, new in zip(old_rows, new_rows):
            expected = dict(old)
            change = change_map.get(old["cityId"])
            if change:
                require(not old["regionCode"], "Overwriting an existing region code")
                require({k: old[k] for k in change["before"]} == change["before"], "Stale change evidence")
                expected.update(change["after"])
            require(new == expected, "Unexpected original record edit: " + old["cityId"])
        for row in new_rows[len(old_rows):]:
            addition = added_map.get(row["cityId"])
            require(addition and addition["file"] == path and row == addition["row"], "Unrecorded addition")
            source = geo[addition["geonameId"]]
            require(source["country"] == row["countryIso2"], "GeoNames country mismatch")
            require(row["sourceCityId"] == "geonames:" + source["id"], "External source identity mismatch")
            require(row["verificationStatus"] == "NEEDS_MANUAL_REVIEW", "Source candidate promoted without review")
            require(row["lastImportedAt"] == "", "False database import timestamp")
            require(row["sourceUrl"] == "https://www.geonames.org/" + source["id"] + "/", "Missing source attribution")
            require(row["latitude"] == source["lat"] and row["longitude"] == source["lon"], "Source coordinates changed")
            require(row["timezone"] == source["timezone"], "Source timezone changed")
            for key, bound in [("latitude", 90), ("longitude", 180)]:
                coordinate = float(row[key])
                require(math.isfinite(coordinate) and abs(coordinate) <= bound, "Invalid coordinates")
            ZoneInfo(row["timezone"])
        for row in new_rows:
            if row["regionCode"]:
                candidates = regions[(row["countryIso2"], row["regionCode"])]
                require(len(candidates) == 1, "Missing/ambiguous/cross-country region: " + row["cityId"])
                require(candidates[0]["countryIso3"] == row["countryIso3"], "Country code disagreement")
        original.extend(old_rows)
        current.extend(new_rows)
    old_ids, new_ids = {r["cityId"] for r in original}, {r["cityId"] for r in current}
    require(len(new_ids) == len(current), "Duplicate city IDs")
    require(new_ids - old_ids == set(added_map), "Added identity set mismatch")
    require(len(changes) == len(change_map), "Duplicate changes")
    blank_before = {r["cityId"] for r in original if not r["regionCode"]}
    hold_ids = {h["cityId"] for h in holds}
    require(not (set(change_map) & hold_ids), "A city is both changed and held")
    require(blank_before == set(change_map) | hold_ids, "Incomplete accounting of original missing regions")
    require({r["cityId"] for r in current if not r["regionCode"]} == hold_ids, "Remaining missing region set mismatch")
    require(collision_pairs(current) <= collision_pairs(original), "New scoped city identity collision")
    require(len(original) == summary["baselineCities"] and len(current) == summary["totalCities"], "Total count mismatch")
    require(len(blank_before) == summary["baselineMissingRegionCodes"] == len(changes) + len(holds), "Missing-region count mismatch")
    require(len(changes) == summary["regionCodesFilled"] and len(holds) == summary["unresolvedRegionCodes"], "Region summary mismatch")
    require(len(additions) == summary["addedCities"], "Addition summary mismatch")
    return {"status": "PASS", "sourceOnly": True, "originalCities": len(original),
            "regionCodesFilled": len(changes), "remainingMissingCodes": len(holds),
            "newCityCandidates": len(additions), "totalCities": len(current),
            "remainingExistingCollisionGroups": len(collision_pairs(current))}


if __name__ == "__main__":
    print(json.dumps(verify(), indent=2))
