import os
import zlib

def search_objects():
    for root, dirs, files in os.walk('.git/objects'):
        for file in files:
            if root.endswith('pack') or root.endswith('info'): continue
            path = os.path.join(root, file)
            with open(path, 'rb') as f:
                compressed = f.read()
            try:
                data = zlib.decompress(compressed)
                if b'export function AdminDomainImportCenterPage' in data:
                    print('Found in', path)
            except Exception as e:
                pass

search_objects()
