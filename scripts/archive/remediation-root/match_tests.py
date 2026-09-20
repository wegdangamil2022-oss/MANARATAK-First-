import json

with open('old_49.json', 'r', encoding='utf-8') as f:
    old_49 = json.load(f)

with open('manifest_56.json', 'r', encoding='utf-8') as f:
    new_56 = json.load(f)

# Map old tests by ID, slug, and normalized names/keywords
old_by_id = {item['id']: item for item in old_49}

print("=== STARTING DETAILED MATCHING ANALYSIS ===")

# Create mapping logic
mappings = []
matched_old_ids = set()

for n_idx, n in enumerate(new_56, 1):
    f_name = n['file']
    eng = n['eng']
    ar = n['ar']
    acr = n['acr']
    prov = n['prov']
    ctr = n['country']
    
    # Classification logic:
    classification = 'NEW_TEST'
    matched_old = None
    note = ''
    
    # Check specific matching candidates
    if 'Cambridge_English_Qualifications' in f_name:
        # Note: Old had test-cambridge-intl ("Cambridge International AS & A Levels") which is academic A-levels (05_National_International), whereas Cambridge English Qualifications is English language!
        # Wait, is Cambridge English Qualifications in old 49? Old 23 language tests didn't have Cambridge English Qualifications!
        classification = 'NEW_TEST'
        note = 'Cambridge English Qualifications (Language) vs Old test-cambridge-intl (AS & A Levels - Admission). This is a NEW_TEST.'
        
    elif 'Duolingo_English_Test' in f_name:
        matched_old = old_by_id['duolingo-english-test']
        classification = 'REPLACE_EXISTING'
        
    elif 'IELTS' in f_name:
        matched_old = old_by_id['ielts-academic']
        classification = 'REPLACE_EXISTING'
        
    elif 'LanguageCert_Academic' in f_name:
        matched_old = old_by_id['languagecert-academic']
        classification = 'REPLACE_EXISTING'
        
    elif 'Linguaskill' in f_name:
        matched_old = old_by_id['linguaskill']
        classification = 'REPLACE_EXISTING'
        
    elif 'Michigan_English_Test' in f_name:
        matched_old = old_by_id['met-english']
        classification = 'REPLACE_EXISTING'
        
    elif 'OET' in f_name:
        classification = 'NEW_TEST'
        note = 'Occupational English Test is new in English Language Tests.'
        
    elif 'Oxford_Test_of_English' in f_name:
        matched_old = old_by_id['ote-english']
        classification = 'REPLACE_EXISTING'
        
    elif 'PTE_Academic' in f_name:
        matched_old = old_by_id['pte-academic']
        classification = 'REPLACE_EXISTING'
        
    elif 'TOEFL_iBT' in f_name:
        matched_old = old_by_id['toefl-ibt']
        classification = 'REPLACE_EXISTING'
        
    elif 'TOEIC' in f_name:
        matched_old = old_by_id['toeic-english']
        classification = 'REPLACE_EXISTING'
        
    elif 'iTEP_Academic' in f_name:
        matched_old = old_by_id['itep-academic']
        classification = 'REPLACE_EXISTING'
        
    elif 'CILS_Italian' in f_name:
        matched_old = old_by_id['cils-italian']
        classification = 'REPLACE_EXISTING'
        
    elif 'Celpe_Bras' in f_name:
        matched_old = old_by_id['celpe-bras-portuguese']
        classification = 'REPLACE_EXISTING'
        
    elif 'DELE_Spanish' in f_name:
        matched_old = old_by_id['dele-spanish']
        classification = 'REPLACE_EXISTING'
        
    elif 'DELF_DALF' in f_name:
        matched_old = old_by_id['delf-dalf-french']
        classification = 'REPLACE_EXISTING'
        
    elif 'HSK_Chinese' in f_name:
        matched_old = old_by_id['hsk-chinese']
        classification = 'REPLACE_EXISTING'
        
    elif 'JLPT_Japanese' in f_name:
        matched_old = old_by_id['jlpt-japanese']
        classification = 'REPLACE_EXISTING'
        
    elif 'NT2_Netherlands' in f_name:
        matched_old = old_by_id['nt2-dutch']
        classification = 'REPLACE_EXISTING'
        
    elif 'Polish_State_Certificate' in f_name:
        matched_old = old_by_id['polish-state-cert']
        classification = 'REPLACE_EXISTING'
        
    elif 'TOMER_Turkey' in f_name:
        matched_old = old_by_id['tomer-turkish']
        classification = 'REPLACE_EXISTING'
        
    elif 'TOPIK_Korean' in f_name:
        matched_old = old_by_id['topik-korean']
        classification = 'REPLACE_EXISTING'
        
    elif 'TORFL_TRKI' in f_name:
        matched_old = old_by_id['torfl-russian']
        classification = 'REPLACE_EXISTING'
        
    elif 'TestDaF_German' in f_name:
        matched_old = old_by_id['testdaf-german']
        classification = 'REPLACE_EXISTING'
        
    elif 'UKBI_Indonesia' in f_name:
        matched_old = old_by_id['ukbi-indonesian']
        classification = 'REPLACE_EXISTING'
        
    elif 'ACT_2026' in f_name:
        matched_old = old_by_id['test-act-exam']
        classification = 'REPLACE_EXISTING'
        
    elif 'AP_Exams' in f_name:
        matched_old = old_by_id['test-ap-exams']
        classification = 'REPLACE_EXISTING'
        
    elif 'CLT_Classic_Learning' in f_name:
        matched_old = old_by_id['test-clt-exam']
        classification = 'REPLACE_EXISTING'
        
    elif 'SAT_2026' in f_name:
        matched_old = old_by_id['test-sat-digital']
        classification = 'REPLACE_EXISTING'
        
    elif 'GMAT_Exam' in f_name:
        matched_old = old_by_id['test-gmat-focus']
        classification = 'REPLACE_EXISTING'
        
    elif 'GRE_General' in f_name:
        matched_old = old_by_id['test-gre-general']
        classification = 'REPLACE_EXISTING'
        
    elif 'A_Level_UK' in f_name:
        matched_old = old_by_id['test-alevel-uk']
        classification = 'REPLACE_EXISTING'
        
    elif 'Abitur_Germany' in f_name:
        matched_old = old_by_id['test-abitur-germany']
        classification = 'REPLACE_EXISTING'
        
    elif 'CSAT_South_Korea' in f_name:
        matched_old = old_by_id['test-csat-korea']
        classification = 'REPLACE_EXISTING'
        
    elif 'CSCA_China' in f_name:
        # Check CSCA ambiguity!
        # Old 46: test-csca-finance = "CSCA (Certified in Strategy and Competitive Analysis)" in Professional!
        # New 35: CSCA_China = "China Scholastic Competency Assessment for Foreign Students" in 05_National_International_Admission_Tests_Qualifications_11!
        # This is a critical disambiguation!
        classification = 'REVIEW_REQUIRED'
        note = 'CRITICAL AMBIGUITY: Old test-csca-finance is CSCA (Certified in Strategy and Competitive Analysis) in Professional/Finance, whereas New CSCA_China is China Scholastic Competency Assessment for Foreign Students in Chinese National Admission.'
        
    elif 'CUET_India' in f_name:
        matched_old = old_by_id['test-cuet-india']
        classification = 'REPLACE_EXISTING'
        
    elif 'EJU_Japan' in f_name:
        matched_old = old_by_id['test-eju-japan']
        classification = 'REPLACE_EXISTING'
        
    elif 'Gaokao_China' in f_name:
        classification = 'NEW_TEST'
        note = 'China Gaokao is a new national university entrance test.'
        
    elif 'IB_Diploma_Programme' in f_name:
        classification = 'NEW_TEST'
        note = 'International Baccalaureate Diploma Programme (IBDP) is new.'
        
    elif 'Matura_Multiple_European' in f_name:
        matched_old = old_by_id['test-matura-poland']
        classification = 'REPLACE_EXISTING'
        note = 'Expanded from Matura (Poland) to Matura (Multiple European Countries).'
        
    elif 'TR_YOS_Turkiye' in f_name:
        # Check YÖS vs TR-YÖS
        # Old 44: test-yos-turkey = "YÖS (Turkey)"
        # New 41: TR_YOS_Turkiye = "Exam for Foreign Students in Türkiye (TR-YÖS)"
        matched_old = old_by_id['test-yos-turkey']
        classification = 'REPLACE_EXISTING'
        note = 'Replaces old YÖS (Turkey) with official centralized TR-YÖS.'
        
    elif 'YKS_Turkey' in f_name:
        matched_old = old_by_id['test-yks-turkey']
        classification = 'REPLACE_EXISTING'
        
    elif 'DAT_United_States' in f_name:
        matched_old = old_by_id['test-dat-dental']
        classification = 'REPLACE_EXISTING'
        
    elif 'GAMSAT' in f_name:
        matched_old = old_by_id['test-gamsat-med']
        classification = 'REPLACE_EXISTING'
        
    elif 'IMAT_Italy' in f_name:
        matched_old = old_by_id['test-imat-italy']
        classification = 'REPLACE_EXISTING'
        
    elif 'JEE_Advanced' in f_name:
        classification = 'NEW_TEST'
        note = 'JEE Advanced (India) is new.'
        
    elif 'JEE_Main' in f_name:
        classification = 'NEW_TEST'
        note = 'JEE Main (India) is new.'
        
    elif 'LNAT' in f_name:
        classification = 'NEW_TEST'
        note = 'National Admissions Test for Law (LNAT) is new.'
        
    elif 'LSAT' in f_name:
        classification = 'NEW_TEST'
        note = 'Law School Admission Test (LSAT) is new.'
        
    elif 'MCAT' in f_name:
        matched_old = old_by_id['test-mcat-med']
        classification = 'REPLACE_EXISTING'
        
    elif 'NEET_UG' in f_name:
        classification = 'NEW_TEST'
        note = 'NEET (UG) India Medical Entrance is new.'
        
    elif 'UCAT' in f_name:
        matched_old = old_by_id['test-ucat-med']
        classification = 'REPLACE_EXISTING'
        
    elif 'CPA_United_States' in f_name:
        matched_old = old_by_id['test-cpa-us']
        classification = 'REPLACE_EXISTING'
        
    elif 'PLAB_United_Kingdom' in f_name:
        matched_old = old_by_id['test-plab-uk']
        classification = 'REPLACE_EXISTING'
        
    elif 'PMP_Project_Management' in f_name:
        matched_old = old_by_id['test-pmp-pm']
        classification = 'REPLACE_EXISTING'
        
    elif 'USMLE_United_States' in f_name:
        matched_old = old_by_id['test-usmle-med']
        classification = 'REPLACE_EXISTING'

    if matched_old:
        matched_old_ids.add(matched_old['id'])
        mappings.append({
            'new_num': n_idx,
            'new_file': f_name,
            'new_eng': eng,
            'new_ar': ar,
            'new_folder': n['folder'],
            'classification': classification,
            'old_id': matched_old['id'],
            'old_slug': matched_old['slug'],
            'old_name': matched_old['name'],
            'old_category': matched_old['category'],
            'note': note
        })
    else:
        mappings.append({
            'new_num': n_idx,
            'new_file': f_name,
            'new_eng': eng,
            'new_ar': ar,
            'new_folder': n['folder'],
            'classification': classification,
            'old_id': '-',
            'old_slug': '-',
            'old_name': '-',
            'old_category': '-',
            'note': note
        })

# Check which old tests were NOT matched
unmatched_old = [item for item in old_49 if item['id'] not in matched_old_ids]

print(f"\nTotal new 56 mapped.")
print(f"Matched old IDs count: {len(matched_old_ids)}")
print(f"Unmatched old tests count: {len(unmatched_old)}")
print("\nUnmatched Old Tests:")
for u in unmatched_old:
    print(f"  - ID: {u['id']:<24} | Name: {u['name']:<35} | Cat: {u['category']}")

counts = {
    'REPLACE_EXISTING': sum(1 for m in mappings if m['classification'] == 'REPLACE_EXISTING'),
    'NEW_TEST': sum(1 for m in mappings if m['classification'] == 'NEW_TEST'),
    'REVIEW_REQUIRED': sum(1 for m in mappings if m['classification'] == 'REVIEW_REQUIRED')
}

print("\nSummary Counts:")
print(f"  REPLACE_EXISTING: {counts['REPLACE_EXISTING']}")
print(f"  NEW_TEST:         {counts['NEW_TEST']}")
print(f"  REVIEW_REQUIRED:  {counts['REVIEW_REQUIRED']}")
print(f"  TOTAL:            {sum(counts.values())}")

with open('mapping_results.json', 'w', encoding='utf-8') as fp:
    json.dump({
        'counts': counts,
        'mappings': mappings,
        'unmatched_old': unmatched_old
    }, fp, ensure_ascii=False, indent=2)
