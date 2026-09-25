import os

directory = 'frontend/src/app'

for root, _, files in os.walk(directory):
    for f in files:
        if f.endswith('page.tsx') or f.endswith('layout.tsx'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            if ('"no-store"' in content or "'no-store'" in content or 'headers()' in content or 'toolHeaders()' in content) and 'export const dynamic' not in content:
                new_content = 'export const dynamic = "force-dynamic";\n' + content
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                print(f'Fixed {path}')
