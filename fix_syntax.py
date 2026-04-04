#!/usr/bin/env python3
"""
Fix all invalid multiline single-quoted strings in app.js.
Pattern: 
  Line N:   c += '
  Line N+1: some text';
  
Replace with:
  Line N:   c += '\nsome text';
  (remove line N+1 content by merging)
"""

import re

with open('public/static/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

original = content

# Also fix template literals that start with backtick but have newline issues
# Fix pattern: c += '\n (next line) text';
# The pattern in the file is literally:
# c += '
# text';
# We need to convert to: c += '\ntext';

# Split into lines
lines = content.split('\n')

fixed_lines = []
i = 0
fixes = 0

while i < len(lines):
    line = lines[i]
    # Check if this line ends with an unclosed single-quoted string starting with c +=
    # Pattern: ends with c += '  (no closing quote)
    if (re.search(r"c \+= '$", line.rstrip()) or 
        re.search(r"c = '$", line.rstrip())) and i + 1 < len(lines):
        # Check if next line ends with '; (closing the string)
        next_line = lines[i + 1]
        if next_line.rstrip().endswith("';"):
            # Merge: replace the pair with a single line using \n
            indent = re.match(r'^(\s*)', line).group(1)
            # Extract the text after c += '
            prefix_match = re.match(r'^(\s*c\s*\+=\s*)\'', line)
            text_content = next_line.rstrip()[:-2]  # Remove trailing ';
            # Text content might have leading spaces - preserve just the text
            text_content = text_content.lstrip()
            
            if prefix_match:
                new_line = prefix_match.group(1) + "'\\n" + text_content + "';"
            else:
                new_line = line.rstrip() + "\\n" + next_line.rstrip()
            
            fixed_lines.append(new_line)
            i += 2  # Skip next line
            fixes += 1
            print(f"Fixed line {i}: merged multiline string")
            continue
    
    fixed_lines.append(line)
    i += 1

content = '\n'.join(fixed_lines)

with open('public/static/app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal fixes: {fixes}")
print(f"Size change: {len(original)} -> {len(content)}")
