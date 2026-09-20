import json

with open('old_49.json', 'r', encoding='utf-8') as f:
    old_49 = json.load(f)

with open('manifest_56.json', 'r', encoding='utf-8') as f:
    new_56 = json.load(f)

old_by_id = {item['id']: item for item in old_49}

# Print exact filenames in manifest_56.json
for idx, n in enumerate(new_56, 1):
    print(f"{idx:02d}: {n['file']}")
