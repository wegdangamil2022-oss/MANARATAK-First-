import re
import json

with open('scripts/import_unified_tests.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Extract TESTS array definition
tests_match = re.search(r'const TESTS = \[\s*(.*?)\s*\];', code, re.DOTALL)
if not tests_match:
    print('TESTS array not found!')
    exit(1)

tests_str = tests_match.group(1)

# Find all test blocks in array
# Each entry is like: { id: '...', slug: '...', name: '...', category: '...', ts/md: '...' }
entries = re.findall(r'\{[^}]+\}', tests_str)

old_49 = []
for idx, entry in enumerate(entries, 1):
    id_m = re.search(r"id:\s*['\"]([^'\"]+)['\"]", entry)
    slug_m = re.search(r"slug:\s*['\"]([^'\"]+)['\"]", entry)
    name_m = re.search(r"name:\s*['\"]([^'\"]+)['\"]", entry)
    cat_m = re.search(r"category:\s*['\"]([^'\"]+)['\"]", entry)
    ts_m = re.search(r"ts:\s*['\"]([^'\"]+)['\"]", entry)
    md_m = re.search(r"md:\s*['\"]([^'\"]+)['\"]", entry)
    
    file_val = ts_m.group(1) if ts_m else (md_m.group(1) if md_m else '-')
    
    old_49.append({
        'index': idx,
        'id': id_m.group(1) if id_m else '-',
        'slug': slug_m.group(1) if slug_m else '-',
        'name': name_m.group(1) if name_m else '-',
        'category': cat_m.group(1) if cat_m else '-',
        'content_file': file_val
    })

print(f'Total old canonical tests extracted: {len(old_49)}')
with open('old_49.json', 'w', encoding='utf-8') as fp:
    json.dump(old_49, fp, ensure_ascii=False, indent=2)

for item in old_49:
    print(f"{item['index']:02d} | ID: {item['id']:<24} | Slug: {item['slug']:<24} | Cat: {item['category']:<12} | Name: {item['name']}")
