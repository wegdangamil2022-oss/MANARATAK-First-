import json

with open('final_matching_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

old_49 = data['old_49']
matching_rows = data['matching_rows']
absent = data['absent_old_tests']

# Acronym mapping for Old 49
old_acronyms = {
    'ielts-academic': 'IELTS',
    'toefl-ibt': 'TOEFL iBT',
    'duolingo-english-test': 'DET',
    'dele-spanish': 'DELE',
    'delf-dalf-french': 'DELF / DALF',
    'hsk-chinese': 'HSK',
    'jlpt-japanese': 'JLPT',
    'itep-academic': 'iTEP',
    'languagecert-academic': 'LanguageCert',
    'celpe-bras-portuguese': 'Celpe-Bras',
    'cils-italian': 'CILS',
    'linguaskill': 'Linguaskill',
    'ote-english': 'OTE',
    'met-english': 'MET',
    'nt2-dutch': 'Nt2',
    'polish-state-cert': 'Certyfikat Polski',
    'pte-academic': 'PTE',
    'testdaf-german': 'TestDaF',
    'toeic-english': 'TOEIC',
    'topik-korean': 'TOPIK',
    'torfl-russian': 'TORFL / TRKI',
    'tomer-turkish': 'TÖMER',
    'ukbi-indonesian': 'UKBI',
    'test-sat-digital': 'SAT',
    'test-act-exam': 'ACT',
    'test-gre-general': 'GRE',
    'test-gmat-focus': 'GMAT',
    'test-abitur-germany': 'Abitur',
    'test-alevel-uk': 'A-Level',
    'test-ap-exams': 'AP',
    'test-cambridge-intl': 'Cambridge Intl',
    'test-clt-exam': 'CLT',
    'test-cuet-india': 'CUET',
    'test-dat-dental': 'DAT',
    'test-eju-japan': 'EJU',
    'test-gamsat-med': 'GAMSAT',
    'test-imat-italy': 'IMAT',
    'test-bmat-med': 'BMAT',
    'test-csat-korea': 'CSAT',
    'test-matura-poland': 'Matura',
    'test-mcat-med': 'MCAT',
    'test-ucat-med': 'UCAT',
    'test-yks-turkey': 'YKS',
    'test-yos-turkey': 'YÖS',
    'test-cpa-us': 'CPA',
    'test-csca-finance': 'CSCA',
    'test-plab-uk': 'PLAB',
    'test-pmp-pm': 'PMP',
    'test-usmle-med': 'USMLE'
}

print("=== TABLE 1: OLD 49 CANONICAL CATALOG ===")
print("| # | Existing ID | Slug | English Name | Acronym | Category | Content File |")
print("|---|-------------|------|--------------|---------|----------|--------------|")
for o in old_49:
    acr = old_acronyms.get(o['id'], '-')
    print(f"| {o['index']:02d} | `{o['id']}` | `{o['slug']}` | {o['name']} | {acr} | {o['category']} | `{o['content_file']}` |")

print("\n=== TABLE 2: FULL 56-ROW MATCHING TABLE ===")
print("| # | New Filename | Classification | Old Test Name | Existing ID | Existing Slug |")
print("|---|--------------|----------------|---------------|-------------|---------------|")
for r in matching_rows:
    old_id_str = f"`{r['old_id']}`" if r['old_id'] != '-' else "-"
    old_slug_str = f"`{r['old_slug']}`" if r['old_slug'] != '-' else "-"
    print(f"| {r['idx']:02d} | `{r['filename']}` | `{r['classification']}` | {r['old_name']} | {old_id_str} | {old_slug_str} |")
