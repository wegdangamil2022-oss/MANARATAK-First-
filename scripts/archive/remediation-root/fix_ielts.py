import os
import re

directory = "apps/web/src/features/international-tests/ielts-sections"

for filename in os.listdir(directory):
    if not filename.endswith(".tsx"): continue
    path = os.path.join(directory, filename)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.split('\n')
    for i in range(len(lines)):
        # If the line has `descAr: '...',\n` but it misses a closing `}` for `{`
        if lines[i].strip().startswith('{') and lines[i].endswith(','):
            if lines[i].count('{') > lines[i].count('}'):
                lines[i] = lines[i][:-1] + ' },'
        elif lines[i].strip().startswith('{') and lines[i].endswith("'"):
            if lines[i].count('{') > lines[i].count('}'):
                lines[i] = lines[i] + ' }'
                
    content = '\n'.join(lines)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

