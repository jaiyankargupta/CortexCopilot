import re

css_path = '/Users/jaiyankargupta/CortexCopilot/frontend/src/index.css'
with open(css_path, 'r') as f:
    css = f.read()

# 1. Add background variables to :root
def update_root(match):
    content = match.group(0)
    # Add variables just before closing brace if they don't exist
    if '--cortex-accent-bg' not in content:
        content = content.replace('}', '  --cortex-accent-bg: #F0F9FF;\n  --cortex-danger-bg: #FEF2F2;\n  --cortex-warning-bg: #FFFBEB;\n}')
    return content

css = re.sub(r':root, \[data-theme="light"\] \{[^}]+\}', update_root, css, count=1)

# 2. Add background variables to [data-theme="dark"]
def update_dark(match):
    content = match.group(0)
    if '--cortex-accent-bg' not in content:
        content = content.replace('}', '  --cortex-accent-bg: rgba(14, 165, 233, 0.15);\n  --cortex-danger-bg: rgba(239, 68, 68, 0.12);\n  --cortex-warning-bg: rgba(245, 158, 11, 0.12);\n}')
    return content

css = re.sub(r'\[data-theme="dark"\] \{[^}]+\}', update_dark, css, count=1)

# 3. Replace hardcoded backgrounds
replacements = [
    (r'\.sidebar-preview-card\.active-preview\s*\{[^}]*background:\s*#F0F9FF;[^}]*\}', 
     lambda m: m.group(0).replace('background: #F0F9FF;', 'background: var(--cortex-accent-bg);')),
     
    (r'\.rich-anomaly-card\.critical\s*\{[^}]*background:\s*#FEF2F2;[^}]*\}', 
     lambda m: m.group(0).replace('background: #FEF2F2;', 'background: var(--cortex-danger-bg);')),
     
    (r'\.rich-anomaly-card\.warning\s*\{[^}]*background:\s*#FFFBEB;[^}]*\}', 
     lambda m: m.group(0).replace('background: #FFFBEB;', 'background: var(--cortex-warning-bg);')),
     
    (r'\.nav-tab-item\.active-tab\s*\{[^}]*background:\s*#F0F9FF;[^}]*\}', 
     lambda m: m.group(0).replace('background: #F0F9FF;', 'background: var(--cortex-accent-bg);')),
]

for pattern, repl in replacements:
    css = re.sub(pattern, repl, css)

with open(css_path, 'w') as f:
    f.write(css)

print("Background colors fixed!")
