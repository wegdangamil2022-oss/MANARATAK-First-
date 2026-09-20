import json

with open('old_49.json', 'r', encoding='utf-8') as f:
    old_49 = json.load(f)

with open('manifest_56.json', 'r', encoding='utf-8') as f:
    new_56 = json.load(f)

old_by_id = {item['id']: item for item in old_49}

# Detailed mapping dictionary from new filename to old_id or status
map_dict = {
    "Cambridge_English_Qualifications_2026_Complete_Data_AR.md": None,
    "Duolingo_English_Test_2026_Complete_Data_AR.md": "duolingo-english-test",
    "IELTS_2026_Complete_Data_AR.md": "ielts-academic",
    "LanguageCert_Academic_2026_Complete_Data_AR.md": "languagecert-academic",
    "Linguaskill_2026_Complete_Data_AR.md": "linguaskill",
    "Michigan_English_Test_MET_2026_Complete_Data_AR.md": "met-english",
    "OET_2026_Complete_Data_AR.md": None,
    "Oxford_Test_of_English_2026_Complete_Data_AR.md": "ote-english",
    "PTE_Academic_2026_Complete_Data_AR.md": "pte-academic",
    "TOEFL_iBT_2026_Complete_Data_AR.md": "toefl-ibt",
    "TOEIC_2026_Complete_Data_AR.md": "toeic-english",
    "iTEP_Academic_2026_Complete_Data_AR.md": "itep-academic",
    "CILS_Italian_2026_Complete_Data_AR.md": "cils-italian",
    "Celpe_Bras_Brazilian_Portuguese_2026_Complete_Data_AR.md": "celpe-bras-portuguese",
    "DELE_Spanish_2026_Complete_Data_AR.md": "dele-spanish",
    "DELF_DALF_French_2026_Complete_Data_AR.md": "delf-dalf-french",
    "HSK_Chinese_2026_Complete_Data_AR.md": "hsk-chinese",
    "JLPT_Japanese_2026_Complete_Data_AR.md": "jlpt-japanese",
    "NT2_Netherlands_Dutch_2026_Complete_Data_AR.md": "nt2-dutch",
    "Polish_State_Certificate_Poland_Polish_2026_Complete_Data_AR.md": "polish-state-cert",
    "TOMER_Turkey_Turkish_2026_Complete_Data_AR.md": "tomer-turkish",
    "TOPIK_Korean_2026_Complete_Data_AR.md": "topik-korean",
    "TORFL_TRKI_Russian_2026_Complete_Data_AR.md": "torfl-russian",
    "TestDaF_German_2026_Complete_Data_AR.md": "testdaf-german",
    "UKBI_Indonesia_Indonesian_2026_Complete_Data_AR.md": "ukbi-indonesian",
    "ACT_2026_Complete_Data_AR.md": "test-act-exam",
    "AP_Exams_2027_Complete_Data_AR.md": "test-ap-exams",
    "CLT_Classic_Learning_Test_2026_2027_Complete_Data_AR.md": "test-clt-exam",
    "SAT_2026_Complete_Data_AR.md": "test-sat-digital",
    "GMAT_Exam_2026_Complete_Data_AR.md": "test-gmat-focus",
    "GRE_General_Test_2026_Complete_Data_AR.md": "test-gre-general",
    "A_Level_UK_International_2026_Unified_AR.md": "test-alevel-uk",
    "Abitur_Germany_2026_Unified_AR.md": "test-abitur-germany",
    "CSAT_South_Korea_2027_Unified_AR.md": "test-csat-korea",
    "CSCA_China_2026_Unified_AR.md": "REVIEW_REQUIRED",
    "CUET_India_2026_Unified_AR.md": "test-cuet-india",
    "EJU_Japan_2026_Unified_AR.md": "test-eju-japan",
    "Gaokao_China_2026_Unified_AR.md": None,
    "IB_Diploma_Programme_2026_Unified_AR.md": None,
    "Matura_Multiple_European_Countries_2026_Unified_AR.md": "test-matura-poland",
    "TR_YOS_Turkiye_2026_Unified_AR_REVISED.md": "test-yos-turkey",
    "YKS_Turkey_2026_Unified_AR.md": "test-yks-turkey",
    "DAT_United_States_Dental_Admission_2026.md": "test-dat-dental",
    "GAMSAT_2026_Complete_Data_AR.md": "test-gamsat-med",
    "IMAT_Italy_Medicine_Admission_2026.md": "test-imat-italy",
    "JEE_Advanced_India_2026_Unified_AR.md": None,
    "JEE_Main_India_2026_Unified_AR.md": None,
    "LNAT_2026_2027_Unified_AR.md": None,
    "LSAT_2026_2027_Unified_AR.md": None,
    "MCAT_2026_Complete_Data_AR.md": "test-mcat-med",
    "NEET_UG_India_2026_Unified_AR.md": None,
    "UCAT_2026_Complete_Data_AR.md": "test-ucat-med",
    "CPA_United_States_Accounting_Licensure_2026_Unified_AR.md": "test-cpa-us",
    "PLAB_United_Kingdom_Medical_Licensing_2026_Unified_AR.md": "test-plab-uk",
    "PMP_Project_Management_Professional_2026_Unified_AR.md": "test-pmp-pm",
    "USMLE_United_States_Medical_Licensing_2026_Unified_AR.md": "test-usmle-med",
}

matched_old_ids = set()
matching_rows = []

for idx, n in enumerate(new_56, 1):
    fname = n['file']
    target = map_dict[fname]
    
    if target == "REVIEW_REQUIRED":
        classification = "REVIEW_REQUIRED"
        old_id = "-"
        old_slug = "-"
        old_name = "-"
        old_cat = "-"
    elif target is not None:
        classification = "REPLACE_EXISTING"
        old_obj = old_by_id[target]
        matched_old_ids.add(target)
        old_id = old_obj['id']
        old_slug = old_obj['slug']
        old_name = old_obj['name']
        old_cat = old_obj['category']
    else:
        classification = "NEW_TEST"
        old_id = "-"
        old_slug = "-"
        old_name = "-"
        old_cat = "-"
        
    matching_rows.append({
        'idx': idx,
        'filename': fname,
        'eng': n['eng'],
        'ar': n['ar'],
        'acr': n['acr'],
        'folder': n['folder'],
        'classification': classification,
        'old_id': old_id,
        'old_slug': old_slug,
        'old_name': old_name,
        'old_cat': old_cat
    })

absent_old_tests = [o for o in old_49 if o['id'] not in matched_old_ids]

replace_count = sum(1 for r in matching_rows if r['classification'] == 'REPLACE_EXISTING')
new_count = sum(1 for r in matching_rows if r['classification'] == 'NEW_TEST')
review_count = sum(1 for r in matching_rows if r['classification'] == 'REVIEW_REQUIRED')

print(f"=== VERIFICATION STATS ===")
print(f"Old Canonical Count: {len(old_49)}")
print(f"New Manifest Count: {len(new_56)}")
print(f"REPLACE_EXISTING: {replace_count}")
print(f"NEW_TEST: {new_count}")
print(f"REVIEW_REQUIRED: {review_count}")
print(f"Absent Old Tests Count: {len(absent_old_tests)}")

print("\n=== ABSENT OLD TESTS ===")
for a in absent_old_tests:
    print(f"ID: {a['id']:<24} | Name: {a['name']:<42} | Slug: {a['slug']}")

# ID and Slug Collisions Check
# For REPLACE_EXISTING tests, old_id and old_slug are used. Check if any duplicate old_ids or old_slugs exist.
assigned_ids = [r['old_id'] for r in matching_rows if r['old_id'] != '-']
assigned_slugs = [r['old_slug'] for r in matching_rows if r['old_slug'] != '-']

id_collisions = len(assigned_ids) - len(set(assigned_ids))
slug_collisions = len(assigned_slugs) - len(set(assigned_slugs))

print(f"\nID Collisions: {id_collisions}")
print(f"Slug Collisions: {slug_collisions}")

with open('final_matching_data.json', 'w', encoding='utf-8') as fp:
    json.dump({
        'old_49': old_49,
        'matching_rows': matching_rows,
        'absent_old_tests': absent_old_tests,
        'counts': {
            'old_count': len(old_49),
            'new_count': len(new_56),
            'replace_count': replace_count,
            'new_count_val': new_count,
            'review_count': review_count,
            'absent_count': len(absent_old_tests),
            'id_collisions': id_collisions,
            'slug_collisions': slug_collisions
        }
    }, fp, ensure_ascii=False, indent=2)
