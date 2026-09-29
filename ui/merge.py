import re
import os

with open('modules/html/hardware-info.html', 'r', encoding='utf-8') as f:
    hw_html = f.read()

# Extract sections
sections = {}
for match in re.finditer(r'<section class="section" id="section-hw-(.*?)">(.*?)</section>', hw_html, re.DOTALL):
    tab_id = match.group(1)
    if tab_id == 'mobo': tab_id = 'motherboard'
    sections[tab_id] = match.group(2).strip()

with open('modules/html/diagnostics.html', 'r', encoding='utf-8') as f:
    diag_html = f.read()

# Replace each tab content
# Diagnostics tabs are formatted as: <div class="si-panel[ active]*" id="si-tab-NAME"> ... </div> (until the next tab or end of section)
for tab_id, content in sections.items():
    # Find start
    start_str = f'id="si-tab-{tab_id}">'
    start_idx = diag_html.find(start_str)
    if start_idx == -1:
        continue
    start_idx += len(start_str)
    
    # Find end (either next "<!-- ─── TAB:" or "</section>")
    end_idx1 = diag_html.find('<!-- ─── TAB:', start_idx)
    end_idx2 = diag_html.find('</section>', start_idx)
    
    end_idx = end_idx1 if end_idx1 != -1 else end_idx2
    # The panel div ends just before this, so we find the last </div> before end_idx
    last_div_idx = diag_html.rfind('</div>', start_idx, end_idx)
    
    if last_div_idx != -1:
        diag_html = diag_html[:start_idx] + '\n' + content + '\n    ' + diag_html[last_div_idx:]

with open('modules/html/diagnostics.html', 'w', encoding='utf-8') as f:
    f.write(diag_html)
print("Merge complete.")
