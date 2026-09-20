import re

with open('apps/web/dist/assets/admin-preview-data-hqqgA618.js', 'r') as f:
    content = f.read()

start_idx = content.find("const INTERNATIONAL_TEST_SOURCE_CARDS")
if start_idx != -1:
    end_idx = content.find("export", start_idx)
    with open('/tmp/extracted.js', 'w') as out:
        out.write(content[start_idx:start_idx+10000])

