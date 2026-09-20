import json

with open('old_49.json', 'r', encoding='utf-8') as f:
    old_49 = json.load(f)

with open('manifest_56.json', 'r', encoding='utf-8') as f:
    new_56 = json.load(f)

# Explicit map of New Filename -> Old Test ID (or None if NEW_TEST or REVIEW_REQUIRED)
# Let's inspect all 56 new files one by one.

explicit_matches = {
    "Cambridge_English_Qualifications_2026_Complete_Data_AR.md": None, # NEW_TEST (Language)
    "Duolingo_English_Test_2026_Complete_Data_AR.md": "duolingo-english-test",
    "IELTS_2026_Complete_Data_AR.md": "ielts-academic",
    "LanguageCert_Academic_2026_Complete_Data_AR.md": "languagecert-academic",
    "Linguaskill_2026_Complete_Data_AR.md": "linguaskill",
    "Michigan_English_Test_MET_2026_Complete_Data_AR.md": "met-english",
    "OET_2026_Complete_Data_AR.md": None, # NEW_TEST
    "Oxford_Test_of_English_OTE_2026_Complete_Data_AR.md": "ote-english",
    "PTE_Academic_2026_Complete_Data_AR.md": "pte-academic",
    "TOEFL_iBT_2026_Complete_Data_AR.md": "toefl-ibt",
    "TOEIC_2026_Complete_Data_AR.md": "toeic-english",
    "iTEP_Academic_2026_Complete_Data_AR.md": "itep-academic",
    "CILS_Italian_2026_Complete_Data_AR.md": "cils-italian",
    "Celpe_Bras_2026_Complete_Data_AR.md": "celpe-bras-portuguese",
    "DELE_Spanish_2026_Complete_Data_AR.md": "dele-spanish",
    "DELF_DALF_2026_Complete_Data_AR.md": "delf-dalf-french",
    "HSK_Chinese_2026_Complete_Data_AR.md": "hsk-chinese",
    "JLPT_Japanese_2026_Complete_Data_AR.md": "jlpt-japanese",
    "NT2_Netherlands_2026_Complete_Data_AR.md": "nt2-dutch",
    "Polish_State_Certificate_2026_Complete_Data_AR.md": "polish-state-cert",
    "TOMER_Turkey_2026_Complete_Data_AR.md": "tomer-turkish",
    "TOPIK_Korean_2026_Complete_Data_AR.md": "topik-korean",
    "TORFL_TRKI_2026_Complete_Data_AR.md": "torfl-russian",
    "TestDaF_German_2026_Complete_Data_AR.md": "testdaf-german",
    "UKBI_Indonesia_2026_Complete_Data_AR.md": "ukbi-indonesian",
    "ACT_2026_Complete_Data_AR.md": "test-act-exam",
    "AP_Exams_2026_Complete_Data_AR.md": "test-ap-exams",
    "CLT_Classic_Learning_Test_2026_Complete_Data_AR.md": "test-clt-exam",
    "SAT_2026_Complete_Data_AR.md": "test-sat-digital",
    "GMAT_Exam_2026_Complete_Data_AR.md": "test-gmat-focus",
    "GRE_General_2026_Complete_Data_AR.md": "test-gre-general",
    "A_Level_UK_2026_Complete_Data_AR.md": "test-alevel-uk",
    "Abitur_Germany_2026_Complete_Data_AR.md": "test-abitur-germany",
    "CSAT_South_Korea_2026_Complete_Data_AR.md": "test-csat-korea",
    "CSCA_China_2026_Unified_AR.md": "REVIEW_REQUIRED", # CSCA China vs CSCA Finance
    "CUET_India_2026_Complete_Data_AR.md": "test-cuet-india",
    "EJU_Japan_2026_Complete_Data_AR.md": "test-eju-japan",
    "Gaokao_China_2026_Unified_AR.md": None, # NEW_TEST
    "IB_Diploma_Programme_2026_Complete_Data_AR.md": None, # NEW_TEST
    "Matura_Multiple_European_2026_Complete_Data_AR.md": "test-matura-poland",
    "TR_YOS_Turkiye_2026_Complete_Data_AR.md": "test-yos-turkey",
    "YKS_Turkey_2026_Complete_Data_AR.md": "test-yks-turkey",
    "DAT_United_States_2026_Complete_Data_AR.md": "test-dat-dental",
    "GAMSAT_2026_Complete_Data_AR.md": "test-gamsat-med",
    "IMAT_Italy_2026_Complete_Data_AR.md": "test-imat-italy",
    "JEE_Advanced_2026_Unified_AR.md": None, # NEW_TEST
    "JEE_Main_2026_Unified_AR.md": None, # NEW_TEST
    "LNAT_2026_Complete_Data_AR.md": None, # NEW_TEST
    "LSAT_2026_Complete_Data_AR.md": None, # NEW_TEST
    "MCAT_2026_Complete_Data_AR.md": "test-mcat-med",
    "NEET_UG_2026_Unified_AR.md": None, # NEW_TEST
    "UCAT_2026_Complete_Data_AR.md": "test-ucat-med",
    "CPA_United_States_2026_Complete_Data_AR.md": "test-cpa-us",
    "PLAB_United_Kingdom_2026_Complete_Data_AR.md": "test-plab-uk",
    "PMP_Project_Management_2026_Complete_Data_AR.md": "test-pmp-pm",
    "USMLE_United_States_2026_Complete_Data_AR.md": "test-usmle-med",
}

old_by_id = {item['id']: item for item in old_49}

rows = []
matched_old_ids = set()

for idx, n in enumerate(new_56, 1):
    f_name = n['file']
    match_val = explicit_matches.get(f_name)
    
    if match_val == "REVIEW_REQUIRED":
        classification = "REVIEW_REQUIRED"
        old_id = "-"
        old_slug = "-"
        old_name = "-"
        old_cat = "-"
        note = "CSCA China (University Admission) vs Old CSCA Finance (Professional Certification). Disambiguation review required."
    elif match_val is not None:
        classification = "REPLACE_EXISTING"
        old_item = old_by_id[match_val]
        matched_old_ids.add(match_val)
        old_id = old_item['id']
        old_slug = old_item['slug']
        old_name = old_item['name']
        old_cat = old_item['category']
        note = f"Preserves ID '{old_id}' and slug '{old_slug}'"
        if f_name == "TR_YOS_Turkiye_2026_Complete_Data_AR.md":
            note += " (YÖS centralized into TR-YÖS)"
        elif f_name == "Matura_Multiple_European_2026_Complete_Data_AR.md":
            note += " (Expanded Matura Poland to European Matura)"
    else:
        classification = "NEW_TEST"
        old_id = "-"
        old_slug = "-"
        old_name = "-"
        old_cat = "-"
        note = "New test added in 2026 catalog"
        if f_name == "Cambridge_English_Qualifications_2026_Complete_Data_AR.md":
            note = "New language test suite (CEQ A2-C2); distinct from old academic AS & A Levels"
            
    rows.append({
        'num': idx,
        'new_file': f_name,
        'new_eng': n['eng'],
        'new_acr': n['acr'],
        'folder': n['folder'],
        'classification': classification,
        'old_id': old_id,
        'old_slug': old_slug,
        'old_name': old_name,
        'old_category': old_cat,
        'note': note
    })

absent_old = [item for item in old_49 if item['id'] not in matched_old_ids]

print("SUMMARY OF MATCHING:")
print(f"Total New Tests: {len(rows)}")
print(f"REPLACE_EXISTING count: {sum(1 for r in rows if r['classification'] == 'REPLACE_EXISTING')}")
print(f"NEW_TEST count:         {sum(1 for r in rows if r['classification'] == 'NEW_TEST')}")
print(f"REVIEW_REQUIRED count:  {sum(1 for r in rows if r['classification'] == 'REVIEW_REQUIRED')}")
print(f"Absent Old Tests count: {len(absent_old)}")

print("\nABSENT OLD TESTS:")
for a in absent_old:
    print(f"  - ID: {a['id']:<24} | Name: {a['name']:<42} | File: {a['content_file']}")

with open('full_matching_analysis.json', 'w', encoding='utf-8') as fp:
    json.dump({
        'rows': rows,
        'absent_old': absent_old
    }, fp, ensure_ascii=False, indent=2)
