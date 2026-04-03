#!/usr/bin/env python3
"""Fix literal newlines in JS string literals in ITEM_DB"""

with open('/home/user/webapp/public/static/app.js', 'r', encoding='utf-8') as f:
    code = f.read()

orig = len(code)

# Find the ITEM_DB block and fix newlines in single-quoted strings
# The issue is literal \n in single-quoted strings within ITEM_DB
# We need to replace them with \\n

import re

# Find start and end of ITEM_DB
start_marker = "  const ITEM_DB = {"
end_marker = "  };\n\n  // 低スコア順に並べる"

start = code.find(start_marker)
end = code.find(end_marker)

if start < 0 or end < 0:
    print(f"ERROR: Could not find ITEM_DB block. start={start}, end={end}")
    exit(1)

item_db_block = code[start:end + len(end_marker)]
print(f"Found ITEM_DB block: {len(item_db_block)} chars")

# Fix: replace literal newlines inside single-quoted strings with \n
# We'll process char by char
fixed_chars = []
in_single_quote = False
i = 0
fixes = 0
while i < len(item_db_block):
    c = item_db_block[i]
    if c == "'" and (i == 0 or item_db_block[i-1] != '\\'):
        in_single_quote = not in_single_quote
        fixed_chars.append(c)
    elif c == '\n' and in_single_quote:
        fixed_chars.append('\\n')
        fixes += 1
    else:
        fixed_chars.append(c)
    i += 1

fixed_block = ''.join(fixed_chars)
code = code[:start] + fixed_block + code[end + len(end_marker):]

print(f"Fixed {fixes} literal newlines in ITEM_DB strings")
print(f"Size: {orig:,} → {len(code):,}")

with open('/home/user/webapp/public/static/app.js', 'w', encoding='utf-8') as f:
    f.write(code)
print("Done.")
