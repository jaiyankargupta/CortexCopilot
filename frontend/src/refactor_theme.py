import re

css_path = '/Users/jaiyankargupta/CortexCopilot/frontend/src/index.css'
with open(css_path, 'r') as f:
    css = f.read()

# Replace the current :root block with Light/Dark themes
root_pattern = re.compile(r':root\s*\{[^}]+\}', re.MULTILINE)
theme_blocks = """
:root, [data-theme="light"] {
  --cortex-bg: #F8FAFC;
  --cortex-surface: #FFFFFF;
  --cortex-elevated: #F1F5F9;
  --cortex-border: #E2E8F0;
  --cortex-accent: #0EA5E9;
  --cortex-good: #10B981;
  --cortex-warning: #F59E0B;
  --cortex-danger: #EF4444;
  --cortex-text: #0F172A;
  --cortex-text-muted: #64748B;
  --cortex-font-main: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --cortex-font-mono: 'JetBrains Mono', monospace;
}

[data-theme="dark"] {
  --cortex-bg: #080C14;
  --cortex-surface: #0F1623;
  --cortex-elevated: #162032;
  --cortex-border: #1E2D44;
  --cortex-accent: #0EA5E9;
  --cortex-good: #10B981;
  --cortex-warning: #F59E0B;
  --cortex-danger: #EF4444;
  --cortex-text: #F8FAFC;
  --cortex-text-muted: #94A3B8;
  --cortex-font-main: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --cortex-font-mono: 'JetBrains Mono', monospace;
}
"""

css = root_pattern.sub(theme_blocks.strip(), css, count=1)

# Now, we do targeted replacements in specific blocks we hardcoded to Light mode earlier

replacements = [
    (r'background:\s*#F8FAFC;', 'background: var(--cortex-bg);'),
    (r'background-color:\s*#F8FAFC;', 'background-color: var(--cortex-bg);'),
    
    (r'background:\s*#FFFFFF;', 'background: var(--cortex-surface);'),
    (r'background-color:\s*#FFFFFF;', 'background-color: var(--cortex-surface);'),
    
    (r'background:\s*#F1F5F9;', 'background: var(--cortex-elevated);'),
    (r'background-color:\s*#F1F5F9;', 'background-color: var(--cortex-elevated);'),
    
    (r'border:\s*1px solid #E2E8F0;', 'border: 1px solid var(--cortex-border);'),
    (r'border-bottom:\s*1px solid #E2E8F0;', 'border-bottom: 1px solid var(--cortex-border);'),
    (r'border-top:\s*1px solid #E2E8F0;', 'border-top: 1px solid var(--cortex-border);'),
    (r'border-color:\s*#E2E8F0;', 'border-color: var(--cortex-border);'),
    
    (r'color:\s*#0F172A;', 'color: var(--cortex-text);'),
    (r'color:\s*#475569;', 'color: var(--cortex-text-muted);'),
    (r'color:\s*#64748B;', 'color: var(--cortex-text-muted);'),
    (r'color:\s*#334155;', 'color: var(--cortex-text-muted);'),
]

for pattern, repl in replacements:
    css = re.sub(pattern, repl, css)

with open(css_path, 'w') as f:
    f.write(css)

print("CSS variables refactored!")
