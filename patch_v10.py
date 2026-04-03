#!/usr/bin/env python3
# patch_v10.py  — v10 overhaul: UI/UX + engine precision
# Targets: public/static/app.js  public/static/app.css

import re, sys

# ── helpers ───────────────────────────────────────────────────────
def patch_file(path, patches):
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()
    orig_len = len(src)
    applied = skipped = 0
    for tag, old, new in patches:
        if old in src:
            src = src.replace(old, new, 1)
            applied += 1
            print(f'  [OK] {tag}')
        else:
            skipped += 1
            print(f'  [SKIP] {tag}')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(src)
    print(f'  => {path}: {orig_len} → {len(src)} chars  ({applied} applied, {skipped} skipped)')
    return applied

# ═══════════════════════════════════════════════════════════════════
#  CSS PATCHES — UI/UX overhaul
# ═══════════════════════════════════════════════════════════════════
css_patches = [

# ── 1: Enhanced cite block — slightly larger text, smoother radius ──
(
  'cite-block improve',
  '''.sr-cite-block {
  margin-top: 7px;
  border-left: 3px solid var(--cite-accent, #7c3aed);
  background: var(--cite-bg, rgba(124,58,237,.04));
  border-radius: 0 7px 7px 0;
  padding: 7px 12px 8px;
}''',
  '''.sr-cite-block {
  margin-top: 8px;
  border-left: 3px solid var(--cite-accent, #7c3aed);
  background: var(--cite-bg, rgba(124,58,237,.03));
  border-radius: 0 8px 8px 0;
  padding: 6px 11px 8px;
  position: relative;
}'''
),

# ── 2: cite-text improved readability ──
(
  'cite-text readability',
  '''.sr-cite-text {
  font-family: 'Noto Serif JP', serif;
  font-size: 11px;
  line-height: 1.9;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-primary);
}''',
  '''.sr-cite-text {
  font-family: 'Noto Serif JP', 'Yu Mincho', serif;
  font-size: 11.5px;
  line-height: 1.95;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-secondary);
  letter-spacing: .01em;
}'''
),

# ── 3: cite-label cleaner ──
(
  'cite-label cleaner',
  '''.sr-cite-label {
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--cite-accent, #7c3aed);
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 4px;
}''',
  '''.sr-cite-label {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--cite-accent, #7c3aed);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 5px;
  opacity: .85;
}'''
),

# ── 4: tutor card — richer hover ──
(
  'tutor-card hover',
  '''.sr-tutor-card:hover {
  box-shadow: 0 4px 18px rgba(0,0,0,.09);
  transform: translateY(-1px);
}''',
  '''.sr-tutor-card:hover {
  box-shadow: 0 6px 24px rgba(0,0,0,.11);
  transform: translateY(-1px);
}'''
),

# ── 5: ba-text slightly larger ──
(
  'ba-text size',
  '''.sr-ba-text {
  font-size: 10.5px;
  line-height: 1.8;
  white-space: pre-wrap;
  font-family: 'Noto Serif JP', serif;
  margin: 0;
}''',
  '''.sr-ba-text {
  font-size: 11px;
  line-height: 1.85;
  white-space: pre-wrap;
  font-family: 'Noto Serif JP', 'Yu Mincho', serif;
  margin: 0;
  letter-spacing: .008em;
}'''
),

# ── 6: fb-tab improved active indicator ──
(
  'fb-tab active',
  '''.sr-fb-tab.active {
  color: var(--text-primary);
  border-bottom-color: var(--fuji);
  background: var(--bg-white);
  font-weight: 700;
}''',
  '''.sr-fb-tab.active {
  color: var(--fuji);
  border-bottom-color: var(--fuji);
  background: var(--bg-white);
  font-weight: 700;
  letter-spacing: .005em;
}'''
),

# ── 7: diag-note compact — reduce visual noise ──
(
  'diag-note gap',
  '''.sr-notes-container {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}''',
  '''.sr-notes-container {
  padding: 8px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}'''
),

# ── 8: weakness card hover ──
(
  'weakness-card hover',
  '''.sr-weakness-card {
  margin-bottom: 7px; border-radius: 9px;
  overflow: hidden; transition: box-shadow .15s;
}
.sr-weakness-card:hover { box-shadow: 0 2px 10px rgba(239,68,68,.1); }''',
  '''.sr-weakness-card {
  margin-bottom: 8px; border-radius: 10px;
  overflow: hidden; transition: box-shadow .18s, transform .15s;
  border: 1px solid rgba(239,68,68,.08);
}
.sr-weakness-card:hover {
  box-shadow: 0 3px 14px rgba(239,68,68,.12);
  transform: translateX(1px);
}'''
),

# ── 9: priority card font weight ──
(
  'priority-card rank-1 weight',
  '''.sr-priority-card.rank-1 {
  background: rgba(239,68,68,.04);
  border-color: rgba(239,68,68,.2);
  border-left-color: #ef4444;
}''',
  '''.sr-priority-card.rank-1 {
  background: rgba(239,68,68,.05);
  border-color: rgba(239,68,68,.22);
  border-left-color: #dc2626;
}'''
),

# ── 10: engine badge refinement ──
(
  'engine-badge refine',
  '''.sr-engine-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 8.5px; font-weight: 700; padding: 2px 8px;
  border-radius: 10px;
  background: linear-gradient(90deg,rgba(109,40,217,.1),rgba(59,130,246,.1));
  color: #4c1d95; border: 1px solid rgba(109,40,217,.2);
  letter-spacing: .04em; margin-left: 4px;
}''',
  '''.sr-engine-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 8px; font-weight: 700; padding: 2px 7px;
  border-radius: 8px;
  background: linear-gradient(90deg,rgba(109,40,217,.08),rgba(59,130,246,.07));
  color: #5b21b6; border: 1px solid rgba(109,40,217,.18);
  letter-spacing: .05em; margin-left: 5px; opacity: .9;
}'''
),

# ── 11: new CSS additions at end ──
(
  'add new CSS v10',
  '''.sr-notes-container {
  padding: 8px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}''',
  '''.sr-notes-container {
  padding: 8px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* ── v10: script quote "arrow" annotation ─────────────────────── */
.sr-cite-arrow {
  font-size: 9.5px;
  color: var(--cite-accent, #7c3aed);
  margin-top: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  letter-spacing: .01em;
  opacity: .8;
}

/* ── v10: stat chips inside banner ───────────────────────────── */
.sr-stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  padding: 3px 9px;
  border-radius: 20px;
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.12);
  color: rgba(255,255,255,.7);
  white-space: nowrap;
}

/* ── v10: rubric item improved border ────────────────────────── */
.sr-rubric-item-border {
  border-bottom: 1px solid var(--border-light, #f4f4f6);
  padding-bottom: 10px;
  margin-bottom: 10px;
}

/* ── v10: improvement arrow block ───────────────────────────── */
.sr-improve-arrow {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
  color: var(--fuji);
  font-weight: 600;
  padding: 4px 0 2px;
  opacity: .85;
}

/* ── v10: two-col strength grid ─────────────────────────────── */
.sr-strength-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  padding: 10px 14px 14px;
}
@media (max-width: 480px) {
  .sr-strength-grid { grid-template-columns: 1fr; }
}
.sr-strength-chip {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 7px 10px;
  border-radius: 8px;
  background: var(--matcha-bg, #f0fdf4);
  border: 1px solid var(--matcha-border, #d1fae5);
  font-size: 10.5px;
  line-height: 1.55;
  color: var(--text-secondary);
  transition: transform .12s;
}
.sr-strength-chip:hover { transform: translateY(-1px); }
.sr-strength-chip-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--matcha);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}

/* ── v10: collapsible detail section ────────────────────────── */
.sr-collapse-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  padding: 7px 12px;
  border-radius: 7px;
  transition: background .15s;
  font-size: 10.5px;
  color: var(--text-muted);
  font-weight: 600;
}
.sr-collapse-trigger:hover { background: var(--bg-subtle); }

/* ── v10: weakness item header gradient ─────────────────────── */
.sr-weak-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(90deg,rgba(239,68,68,.06),transparent);
  border-bottom: 1px solid rgba(239,68,68,.1);
}
.sr-weak-header.critical {
  background: linear-gradient(90deg,rgba(220,38,38,.10),rgba(239,68,68,.04));
  border-bottom-color: rgba(220,38,38,.15);
}'''
),

]

# ═══════════════════════════════════════════════════════════════════
#  JS PATCHES
# ═══════════════════════════════════════════════════════════════════
js_patches = [

# ── J1: Update banner version text ──
(
  'banner version v10',
  'SCENARIO LAB ─ 審査員採点レポート v9',
  'SCENARIO LAB ─ 審査員採点レポート v10'
),
(
  'banner badge v10',
  '18項目・7軸・実脚本引用 v9',
  '18項目・7軸・実脚本引用 v10'
),
(
  'footer version v10',
  'Generated by シナリオラボ 職員室 自動採点システム v4.1',
  'Generated by シナリオラボ 職員室 自動採点システム v4.2'
),

# ── J2: Engine version comment ──
(
  'engine version comment',
  'シナリオラボ 職員室 — コンクール審査員エンジン v9.0',
  'シナリオラボ 職員室 — コンクール審査員エンジン v10.0'
),

# ── J3: Improve strength tab rendering (two-column grid) ──
# Find the strengths rendering and improve it
(
  'strengths grid render',
  """              const strLines = (ar.strengths || '').split('\\n').filter(l => l.trim());
              const strHtml = strLines.map(line => {
                if (line.startsWith('・')) {
                  const txt = line.slice(1).trim();
                  return `<div class="sr-strength-card">
                  <div style="flex-shrink:0;width:18px;height:18px;border-radius:50%;background:var(--matcha);display:flex;align-items:center;justify-content:center;margin-top:1px"><i class="fas fa-check" style="font-size:8px;color:#fff"></i></div>
                  <div style="font-size:10.5px;color:var(--text-secondary);line-height:1.6">${esc(txt)}</div>
                </div>`;
                }
                return `<div style="font-size:10.5px;color:var(--text-muted);padding:3px 0;line-height:1.6">${esc(line)}</div>`;
              }).join('');""",
  """              const strLines = (ar.strengths || '').split('\\n').filter(l => l.trim());
              const strChips = strLines.filter(l => l.startsWith('・')).map(line => {
                const txt = line.slice(1).trim();
                // Extract score badge if present e.g. 【label】（4/5）
                const scoreM = txt.match(/（([0-9]+)\\/5）/);
                const scoreN = scoreM ? parseInt(scoreM[1]) : 0;
                const scoreColor = scoreN >= 5 ? '#15803d' : scoreN >= 4 ? '#16a34a' : 'var(--matcha)';
                const bodyTxt = txt.replace(/（[0-9]+\\/5[^）]*）/, '').trim();
                return `<div class="sr-strength-chip">
                  <div class="sr-strength-chip-icon"><i class="fas fa-check" style="font-size:7px;color:#fff"></i></div>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:10.5px;color:var(--text-secondary);line-height:1.55">${esc(bodyTxt)}</div>
                    ${scoreN > 0 ? `<div style="font-size:9px;color:${scoreColor};font-weight:700;margin-top:2px">${scoreN}/5点</div>` : ''}
                  </div>
                </div>`;
              }).join('');
              const strMiscLines = strLines.filter(l => !l.startsWith('・')).map(l =>
                `<div style="font-size:10.5px;color:var(--text-muted);padding:3px 0;line-height:1.6">${esc(l)}</div>`
              ).join('');
              const strHtml = (strChips ? `<div class="sr-strength-grid">${strChips}</div>` : '') + strMiscLines;"""
),

# ── J4: Improve weakness tab rendering ──
(
  'weakness render improvement',
  """              const wkLines = (ar.weaknesses || '').split('\\n').filter(l => l.trim());
              const wkHtml = wkLines.map(line => {
                if (line.startsWith('・')) {
                  const txt = line.slice(1).trim();
                  const isCritical = txt.includes('(1/5)') || txt.includes('（1/5）') || txt.includes('1点');
                  const itemNameM = txt.match(/【([^】]+)】/);
                  const itemName = itemNameM ? itemNameM[1] : '';
                  const weakKey = Object.entries(nameMap2).find(([,v]) => v === itemName)?.[0] || null;
                  const weakQuote2 = weakKey && ar.itemDetails && ar.itemDetails[weakKey] ? ar.itemDetails[weakKey].quote : null;
                  return `<div class="sr-weakness-card">
                  <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:${isCritical?'rgba(220,38,38,.07)':'rgba(239,68,68,.04)'};border-bottom:1px solid rgba(239,68,68,.1)">
                    <div style="flex-shrink:0;width:18px;height:18px;border-radius:50%;background:${isCritical?'#dc2626':'var(--momo)'};display:flex;align-items:center;justify-content:center">
                      <i class="fas ${isCritical?'fa-triangle-exclamation':'fa-circle-xmark'}" style="font-size:8px;color:#fff"></i>
                    </div>
                    <div style="font-size:11px;font-weight:700;color:${isCritical?'#b91c1c':'var(--text-primary)'};flex:1">${esc(txt)}</div>
                    ${isCritical?'<span style="font-size:8px;background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;border-radius:4px;padding:1px 6px;font-weight:700;flex-shrink:0">最優先改善</span>':''}
                  </div>
                  ${weakQuote2 ? `<div class="sr-cite-block cite-bad" style="border-radius:0 0 6px 6px;margin:0 10px 8px;margin-top:0">
                    <div class="sr-cite-label"><i class="fas fa-highlighter" style="font-size:7px"></i>問題箇所 — 脚本より</div>
                    <div class="sr-cite-text">${esc(weakQuote2)}</div>
                  </div>` : ''}
                </div>`;
                }
                return `<div style="font-size:10.5px;color:var(--text-muted);padding:3px 0">${esc(line)}</div>`;
              }).join('');""",
  """              const wkLines = (ar.weaknesses || '').split('\\n').filter(l => l.trim());
              const wkHtml = wkLines.map(line => {
                if (line.startsWith('・')) {
                  const txt = line.slice(1).trim();
                  const scoreM = txt.match(/（([0-9]+)\\/5）/);
                  const scoreN = scoreM ? parseInt(scoreM[1]) : 3;
                  const isCritical = scoreN <= 1;
                  const isWeak = scoreN <= 2;
                  const itemNameM = txt.match(/【([^】]+)】/);
                  const itemName = itemNameM ? itemNameM[1] : '';
                  const weakKey = Object.entries(nameMap2).find(([,v]) => v === itemName)?.[0] || null;
                  const weakQuote2 = weakKey && ar.itemDetails && ar.itemDetails[weakKey] ? ar.itemDetails[weakKey].quote : null;
                  const issueStr = weakKey && ar.itemDetails && ar.itemDetails[weakKey] ? (ar.itemDetails[weakKey].issues || []).slice(0,1).join('') : '';
                  const headerBg = isCritical ? 'rgba(220,38,38,.09)' : isWeak ? 'rgba(239,68,68,.05)' : 'rgba(239,68,68,.03)';
                  const headerBorder = isCritical ? 'rgba(220,38,38,.18)' : 'rgba(239,68,68,.1)';
                  const iconColor = isCritical ? '#dc2626' : 'var(--momo)';
                  return `<div class="sr-weakness-card">
                  <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 12px 7px;background:${headerBg};border-bottom:1px solid ${headerBorder}">
                    <div style="flex-shrink:0;width:18px;height:18px;border-radius:50%;background:${iconColor};display:flex;align-items:center;justify-content:center;margin-top:1px">
                      <i class="fas ${isCritical?'fa-triangle-exclamation':'fa-circle-xmark'}" style="font-size:7px;color:#fff"></i>
                    </div>
                    <div style="flex:1;min-width:0">
                      <div style="font-size:11px;font-weight:700;color:${isCritical?'#991b1b':'var(--text-primary)'};line-height:1.4">${esc(txt)}</div>
                      ${issueStr ? `<div style="font-size:9.5px;color:var(--text-muted);margin-top:2px;line-height:1.5">${esc(issueStr)}</div>` : ''}
                    </div>
                    ${isCritical?'<span style="font-size:8px;background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;border-radius:4px;padding:1px 5px;font-weight:700;flex-shrink:0;white-space:nowrap">最優先</span>':''}
                  </div>
                  ${weakQuote2 ? `<div class="sr-cite-block cite-bad" style="border-radius:0 0 8px 8px;margin:0 10px 8px;margin-top:0">
                    <div class="sr-cite-label"><i class="fas fa-highlighter" style="font-size:7px"></i>問題箇所 — 脚本より</div>
                    <div class="sr-cite-text">${esc(weakQuote2)}</div>
                    <div class="sr-cite-arrow"><i class="fas fa-arrow-right" style="font-size:8px"></i>この箇所を改稿対象として優先してください</div>
                  </div>` : ''}
                </div>`;
                }
                return `<div style="font-size:10.5px;color:var(--text-muted);padding:3px 0">${esc(line)}</div>`;
              }).join('');"""
),

# ── J5: Improve diagnostic note rendering with better arrow annotations ──
# Find the notes rendering block inside renderActiveSession
(
  'diag-note quote arrow',
  """                  ${n.quote ? `<div class="sr-cite-block ${citeClass}" style="margin-top:6px">
                    <div class="sr-cite-label"><i class="fas ${citeIcon}" style="font-size:7px"></i>${citeLabel}</div>
                    <div class="sr-cite-text">${esc(n.quote)}</div>
                  </div>` : ''}""",
  """                  ${n.quote ? `<div class="sr-cite-block ${citeClass}" style="margin-top:6px">
                    <div class="sr-cite-label"><i class="fas ${citeIcon}" style="font-size:7px"></i>${citeLabel}</div>
                    <div class="sr-cite-text">${esc(n.quote)}</div>
                    ${n.type === 'bad' ? '<div class="sr-cite-arrow"><i class="fas fa-arrow-right" style="font-size:8px"></i>この箇所を改稿してください</div>' : ''}
                  </div>` : ''}"""
),

# ── J6: Improve priority card rendering ──
(
  'priority card render',
  """                return `<div class="sr-priority-card rank-${Math.min(rank,3)}">""",
  """                const rankColors = ['#dc2626','#f97316','#eab308'];
                const rankLabels = ['最優先','高優先','中優先'];
                const rankGrad = rank===1?'linear-gradient(135deg,rgba(220,38,38,.06),rgba(239,68,68,.02))':rank===2?'linear-gradient(135deg,rgba(249,115,22,.05),transparent)':'linear-gradient(135deg,rgba(234,179,8,.04),transparent)';
                return `<div class="sr-priority-card rank-${Math.min(rank,3)}" style="background:${rankGrad}">"""
),

# ── J7: Improve tutor card script quote display — add "→ 改稿ポイント" label ──
(
  'tutor scriptQuote arrow',
  """        ${scriptQuote ? `<div class="sr-cite-block cite-bad" style="margin-top:${issues.length>0?'7px':'2px'}">
          <div class="sr-cite-label"><i class="fas fa-highlighter" style="font-size:7px"></i>あなたの脚本の該当箇所 — 改稿対象</div>
          <div class="sr-cite-text" style="color:#7f1d1d">${esc(scriptQuote)}</div>
        </div>` : ''}""",
  """        ${scriptQuote ? `<div class="sr-cite-block cite-bad" style="margin-top:${issues.length>0?'7px':'2px'}">
          <div class="sr-cite-label"><i class="fas fa-highlighter" style="font-size:7px"></i>あなたの脚本の該当箇所 — 改稿対象</div>
          <div class="sr-cite-text" style="color:#7f1d1d">${esc(scriptQuote)}</div>
          <div class="sr-cite-arrow"><i class="fas fa-arrow-right" style="font-size:8px"></i>この台詞・ト書きを下の「After」例に近づけてください</div>
        </div>` : ''}"""
),

# ── J8: Improve "After" section in tutor card ──
(
  'tutor ba-after label',
  """          <div class="sr-ba-after"><div class="sr-ba-label"><i class="fas fa-check-circle" style="font-size:8px;margin-right:3px"></i>After — 書き直し例</div><pre class="sr-ba-text">${esc(tip.good)}</pre></div>""",
  """          <div class="sr-ba-after"><div class="sr-ba-label"><i class="fas fa-check-circle" style="font-size:8px;margin-right:3px"></i>After — 参考リライト例</div><pre class="sr-ba-text">${esc(tip.good)}</pre></div>"""
),

# ── J9: Improve tip box design ──
(
  'tutor tip box design',
  """        <div style="background:var(--fuji-bg,#f5f0ff);border:1px solid var(--fuji-border,#e0d0ff);border-radius:8px;padding:9px 12px;display:flex;gap:8px;align-items:flex-start">
          <i class="fas fa-lightbulb" style="color:var(--fuji);font-size:11px;margin-top:2px;flex-shrink:0"></i>
          <div style="font-size:10.5px;color:var(--text-primary);line-height:1.75"><strong style="color:var(--fuji)">コツ:</strong> ${esc(tip.tip)}</div>
        </div>""",
  """        <div style="background:var(--fuji-bg,#f5f0ff);border:1px solid var(--fuji-border,#e0d0ff);border-radius:9px;padding:10px 13px;display:flex;gap:9px;align-items:flex-start;margin-top:1px">
          <i class="fas fa-lightbulb" style="color:var(--fuji);font-size:11px;margin-top:2px;flex-shrink:0"></i>
          <div style="font-size:10.5px;color:var(--text-primary);line-height:1.8"><strong style="color:var(--fuji);font-size:11px">コツ:</strong> ${esc(tip.tip)}</div>
        </div>"""
),

# ── J10: Improve rubric item cite block with "→" annotation ──
(
  'rubric cite-block arrow',
  """            ${autoQuote ? `
            <div class="sr-cite-block ${scoreVal<=2?'cite-bad':scoreVal>=4?'cite-good':'cite-warn'}" style="margin-top:8px">
              <div class="sr-cite-label"><i class="fas ${scoreVal<=2?'fa-highlighter':scoreVal>=4?'fa-quote-left':'fa-search'}\" style="font-size:7px"></i>${scoreVal<=2?'問題箇所 — 脚本引用':scoreVal>=4?'好例 — 脚本引用':'参照 — 脚本引用'}</div>
              <div class="sr-cite-text" style="color:${scoreVal<=2?'#7f1d1d':scoreVal>=4?'#14532d':'#78350f'}">${esc(autoQuote)}</div>
            </div>` : ''}""",
  """            ${autoQuote ? `
            <div class="sr-cite-block ${scoreVal<=2?'cite-bad':scoreVal>=4?'cite-good':'cite-warn'}" style="margin-top:8px">
              <div class="sr-cite-label"><i class="fas ${scoreVal<=2?'fa-highlighter':scoreVal>=4?'fa-quote-left':'fa-search'}" style="font-size:7px"></i>${scoreVal<=2?'問題箇所 — 脚本引用':scoreVal>=4?'好例 — 脚本引用':'参照 — 脚本引用'}</div>
              <div class="sr-cite-text" style="color:${scoreVal<=2?'#7f1d1d':scoreVal>=4?'#14532d':'#78350f'}">${esc(autoQuote)}</div>
              ${scoreVal<=2 ? '<div class="sr-cite-arrow"><i class="fas fa-arrow-right" style="font-size:8px"></i>改稿対象箇所</div>' : ''}
            </div>` : ''}"""
),

# ── J11: Improve character arc note — more specific diagnostic ──
(
  'char-arc bad note improved',
  """    const arcBadNote = { type: 'bad', text: 'キャラクターアーク：主人公の内的変化が見えません。設計テンプレート→「①変化前の誤信（例: 一人でいい）→②転機（信頼した人が去る）→③変化後の行動（初めて助けを求める）」。変化は台詞宣言ではなく行動で見せてください。' };
    // 変化の欠如を示す台詞を引用
    if (mainCharName && dialogueByChar[mainCharName] && dialogueByChar[mainCharName].length >= 2) {
      const first = dialogueByChar[mainCharName][0];
      const last = dialogueByChar[mainCharName][dialogueByChar[mainCharName].length - 1];
      if (first !== last && first.length > 3 && last.length > 3) {
        arcBadNote.quote = '冒頭: ' + mainCharName + '「' + (first.length > 40 ? first.slice(0,40)+'…' : first) + '」\\n終盤: ' + mainCharName + '「' + (last.length > 40 ? last.slice(0,40)+'…' : last) + '」\\n→ この2台詞の間に「行動・態度の変化」は見えますか？ なければアークを設計し直してください。';
      }
    }
    notes.push(arcBadNote);""",
  """    const arcBadNote = { type: 'bad', text: 'キャラクターアーク：主人公の内的変化が見えません。設計テンプレート→①冒頭：主人公の誤信・欠点を行動で見せる ②第二幕：その欠点が原因で最悪の状況になる ③終盤：欠点を手放す行動が変化を示す。変化を「台詞で宣言」させず「行動の差」で見せてください。' };
    // 変化の欠如を示す台詞を引用 — 冒頭vs終盤
    if (mainCharName && dialogueByChar[mainCharName] && dialogueByChar[mainCharName].length >= 2) {
      const allMainDlgs = dialogueByChar[mainCharName];
      const first = allMainDlgs[0];
      const last = allMainDlgs[allMainDlgs.length - 1];
      if (first !== last && first.length > 3 && last.length > 3) {
        arcBadNote.quote = '冒頭: ' + mainCharName + '「' + (first.length > 45 ? first.slice(0,45)+'…' : first) + '」\\n終盤: ' + mainCharName + '「' + (last.length > 45 ? last.slice(0,45)+'…' : last) + '」\\n→ この2台詞の姿勢・態度に差がありますか？\\n  差がなければ「同じ感情・同じ論理」で物語が終わっています。\\n  ⚑ 終盤の台詞を「冒頭と逆の立場」から言い直すと変化が生まれます。';
      } else if (first.length > 3) {
        arcBadNote.quote = mainCharName + '「' + (first.length > 55 ? first.slice(0,55)+'…' : first) + '」\\n→ この台詞からどう変わりますか？アークの終着点を設計してください。';
      }
    }
    notes.push(arcBadNote);"""
),

# ── J12: Improve subtext note ──
(
  'subtext bad note improved',
  """  if (scores['subtext'] <= 2 && onTheNoseCount >= 3) {
    const noteObjSubtext = { type: 'bad', text: '説明台詞：解説的セリフが' + onTheNoseCount + '箇所。「感情/意図を言葉で語る」のがNG。代わりに行動・沈黙・物・視線で表現してください。コンクール審査員は1ページ目の説明台詞で手が止まります。' };
    if (onTheNoseSample) noteObjSubtext.quote = '「' + onTheNoseSample + '」\\n→ この台詞を「行動・沈黙・物」に置き換えてください';
    notes.push(noteObjSubtext);""",
  """  if (scores['subtext'] <= 2 && onTheNoseCount >= 3) {
    const noteObjSubtext = { type: 'bad', text: '説明台詞（オン・ザ・ノーズ）：解説的セリフが' + onTheNoseCount + '箇所。「感情・意図を言葉で語らせる」のが最もコンクール審査員の手を止めます。代わりに①行動 ②物（小道具）③沈黙・間 ④視線・表情 ⑤空間の変化 で表現してください。' };
    if (onTheNoseSample) {
      // Try to auto-generate a before→after suggestion based on the found line
      const subtextCharGuess = mainCharName || '田中';
      const hasFeelingKw = onTheNoseSample.match(/悲|辛|怖|怒|嬉|悔|寂|苦|辛|困/);
      const afterGuess = hasFeelingKw
        ? subtextCharGuess + '、' + (hasFeelingKw[0].includes('悲')||hasFeelingKw[0].includes('寂') ? '窓の外を向く。長い沈黙。' : hasFeelingKw[0].includes('怒') ? 'コップを静かに置く。一度だけ。' : '手が止まる。机の上。')
        : subtextCharGuess + '、黙って立ち上がる。窓に近づく。背を向けたまま。';
      noteObjSubtext.quote = '「' + (onTheNoseSample.length > 75 ? onTheNoseSample.slice(0,75)+'…' : onTheNoseSample) + '」\\n↳ 改稿ヒント: ' + afterGuess;
    }
    notes.push(noteObjSubtext);"""
),

# ── J13: Improve emotional-impact bad note ──
(
  'emotional-impact bad note',
  """  } else if (scores['emotional-impact'] <= 2) {
    const noEmotionNote = { type: 'bad', text: '作品力：感情密度' + Math.round(emotionDensity * 100) + '%（低め）・強い感情瞬間' + emotionStrongCount + '箇所。クライマックス近くで「主人公が最も傷つく／最も勇気を出す」シーンを行動・沈黙・物で表現してください。感情を語らせず、「観客自身が気づく」空間を設計するのが鍵です。' };
    if (dialogueTexts.length >= 2) {
      const flatLines = dialogueTexts.filter(d => d.length > 3 && d.length < 35);
      if (flatLines.length >= 2) noEmotionNote.quote = '「' + flatLines[0] + '」「' + flatLines[1] + '」（感情的変化のない平板な交換）';
    }
    notes.push(noEmotionNote);""",
  """  } else if (scores['emotional-impact'] <= 2) {
    const noEmotionNote = { type: 'bad', text: '作品力：感情密度' + Math.round(emotionDensity * 100) + '%（低め）・強い感情の瞬間' + emotionStrongCount + '箇所のみ。「この場面で涙が出るか、鳥肌が立つか」を基準に感情ピークを設計してください。クライマックスは「主人公が最も大切なものを犠牲にする瞬間」に配置し、その行動を台詞ゼロで見せましょう。' };
    // Extract a flat dialogue exchange as evidence
    const flatExchanges = [];
    for (let _fi = 0; _fi < Math.min(dialogueTexts.length - 1, 20); _fi++) {
      const _fa = dialogueTexts[_fi], _fb = dialogueTexts[_fi+1];
      const blandPats = ['なるほど', 'そうです', 'わかりました', 'そうか', 'はい', 'ええ', 'うん', 'そうですね', 'ちょっと', 'まあ'];
      if (_fa.length > 2 && _fa.length < 30 && _fb.length > 2 && _fb.length < 30 && blandPats.some(p => _fa.includes(p) || _fb.includes(p))) {
        flatExchanges.push('「' + _fa + '」\\n「' + _fb + '」');
        break;
      }
    }
    if (flatExchanges.length === 0 && dialogueTexts.length >= 2) {
      const _fa = dialogueTexts[0], _fb = dialogueTexts[1];
      if (_fa.length < 40 && _fb.length < 40) flatExchanges.push('「' + _fa + '」\\n「' + _fb + '」');
    }
    if (flatExchanges.length > 0) noEmotionNote.quote = flatExchanges[0] + '\\n（感情的起伏の少ない交換 — ここに「目的の衝突」か「感情のピーク」を埋め込んでください）';
    notes.push(noEmotionNote);"""
),

# ── J14: Improve authorial-voice bad note with concrete example extraction ──
(
  'authorial-voice bad note improved',
  """    const authorBadNote = { type: 'warn', text: '作家性：文体の個性・一貫性が弱い。抽象語（「悲しい」「嬉しい」）を排し、固有の感覚的ディテール（「アスファルトの熱」「ガムの跡」）に置き換えてください。コンクールで勝つのは「うまい脚本」より「独自の声のある脚本」です。' };
    // 抽象的な表現を含む行を引用
    const abstractKws = ['悲しい', '嬉しい', '怒った', '楽しい', '寂しい', '辛い', '苦しい'];
    const abstractLine = actionLines.find(l => abstractKws.some(k => l.includes(k))) 
      || dialogueTexts.find(d => abstractKws.some(k => d.includes(k)));
    if (abstractLine) {
      const isDialogue = dialogueTexts.includes(abstractLine);
      authorBadNote.quote = (isDialogue ? '「' + abstractLine + '」' : abstractLine) + '\\n↳ 「' + (abstractKws.find(k => abstractLine.includes(k)) || '感情語') + '」は抽象的。固有の行動・物・感覚で置き換えてください。';
    }
    notes.push(authorBadNote);""",
  """    const authorBadNote = { type: 'warn', text: '作家性：文体の個性・一貫性が弱い。抽象語（「悲しい」「嬉しい」「つらそう」）を全て排し、固有の感覚的ディテール（例：「アスファルトがじわじわと白くなる時間。田中の靴底に、ガムの跡」）に置き換えてください。「うまい脚本」より「独自の声のある脚本」が審査員の記憶に残ります。' };
    // Find abstract emotional description lines — both in action and dialogue
    const abstractKws = ['悲しい', '嬉しい', '怒った', '怒っ', '楽しい', '寂しい', '辛い', '苦しい', '悲しそう', '嬉しそう', '悲しんで', 'つらそう', 'かなしい'];
    const abstractActLine = actionLines.find(l => abstractKws.some(k => l.includes(k)));
    const abstractDlgLine = dialogueTexts.find(d => abstractKws.some(k => d.includes(k)));
    const abstractLine = abstractActLine || abstractDlgLine;
    if (abstractLine) {
      const isDialogue = dialogueTexts.includes(abstractLine);
      const foundKw = abstractKws.find(k => abstractLine.includes(k)) || '感情語';
      const replacedEx = foundKw.includes('悲') || foundKw.includes('寂') || foundKw.includes('辛')
        ? (mainCharName||'田中') + 'の手が、一度だけ止まる。\\n  → 「悲しさ」を行動の一時停止で見せる'
        : foundKw.includes('嬉') || foundKw.includes('楽')
        ? (mainCharName||'田中') + '、思わず足取りが速くなる。\\n  → 「嬉しさ」を体の変化で見せる'
        : (mainCharName||'田中') + '、窓に背を向ける。\\n  → 感情語を身体の向きで表現';
      authorBadNote.quote = (isDialogue ? '「' + (abstractLine.length > 60 ? abstractLine.slice(0,60)+'…' : abstractLine) + '」' : (abstractLine.length > 65 ? abstractLine.slice(0,65)+'…' : abstractLine)) + '\\n↳ 「' + foundKw + '」は抽象語。置き換え例：\\n  ' + replacedEx;
    }
    notes.push(authorBadNote);"""
),

# ── J15: Want/Need bad note — more actionable ──
(
  'want-need bad note improved',
  """    const wantNeedBad = { type: 'bad', text: 'Want/Need設計：' + (mainCharName ? '「' + mainCharName + '」' : '主人公') + 'の欲求設計が弱い。①外的目標（Want: 何を手に入れたいか）と②内的必要性（Need: 本当は何が必要か）の両方を明確化し、両者が対立する構造にすると最強のドラマが生まれます。' };
    // 主人公の目標に関する台詞を引用
    if (mainCharName && dialogueByChar[mainCharName]) {
      const mainDlgs = dialogueByChar[mainCharName];
      const goalKws = ['したい', 'なりたい', 'ほしい', '目指', '望む', '必要', '欲し', '手に入れ'];
      const goalDlg = mainDlgs.find(d => goalKws.some(k => d.includes(k)));
      if (goalDlg) wantNeedBad.quote = mainCharName + '「' + (goalDlg.length > 60 ? goalDlg.slice(0,60)+'…' : goalDlg) + '」（欲求表現が弱い — より明確化が必要）';
      else if (mainDlgs.length > 0) wantNeedBad.quote = mainCharName + '「' + (mainDlgs[0].length > 60 ? mainDlgs[0].slice(0,60)+'…' : mainDlgs[0]) + '」（この台詞にWantを埋め込む余地があります）';
    }
    notes.push(wantNeedBad);""",
  """    const wantNeedBad = { type: 'bad', text: 'Want/Need設計：' + (mainCharName ? '「' + mainCharName + '」' : '主人公') + 'の欲求設計が弱い。◆Want（外的目標）= 主人公が求めるもの（目に見える目標）。◆Need（内的必要性）= 主人公が本当は必要なもの（内面の成長・気づき）。この2つが対立するとき最強のドラマが生まれます。' };
    // Find protagonist's goal-related line — prioritize lines with goal keywords
    if (mainCharName && dialogueByChar[mainCharName]) {
      const mainDlgs = dialogueByChar[mainCharName];
      const goalKws = ['したい', 'なりたい', 'ほしい', '目指', '望む', '欲し', '手に入れ', '夢', '目標', '勝ちた', '証明', '取り戻'];
      const needKws_dlg = ['本当は', '実は', '怖い', '弱い', '一人', '誰もいない', '孤独', '許せ', '許さ', '諦め'];
      const goalDlg = mainDlgs.find(d => goalKws.some(k => d.includes(k)));
      const needDlg = mainDlgs.find(d => needKws_dlg.some(k => d.includes(k)));
      if (goalDlg && needDlg && goalDlg !== needDlg) {
        wantNeedBad.quote = 'Want候補: ' + mainCharName + '「' + (goalDlg.length > 45 ? goalDlg.slice(0,45)+'…' : goalDlg) + '」\\nNeed候補: ' + mainCharName + '「' + (needDlg.length > 45 ? needDlg.slice(0,45)+'…' : needDlg) + '」\\n→ この2つが「衝突する構造」になっていますか？';
      } else if (goalDlg) {
        wantNeedBad.quote = mainCharName + '「' + (goalDlg.length > 60 ? goalDlg.slice(0,60)+'…' : goalDlg) + '」\\n→ Wantは読み取れます。Needを設計してください（内面の傷・成長すべき点）';
      } else if (mainDlgs.length > 0) {
        wantNeedBad.quote = mainCharName + '「' + (mainDlgs[0].length > 60 ? mainDlgs[0].slice(0,60)+'…' : mainDlgs[0]) + '」\\n→ この台詞にWant（外的目標）が見えません。冒頭シーンで行動で示してください';
      }
    }
    notes.push(wantNeedBad);"""
),

# ── J16: Improve dialogue dynamics bad note ──
(
  'dialogue dynamics bad improved',
  """    const dynWarnNote2 = { type: 'warn', text: '対話の引力：会話に緊張感・欲求の衝突が不足しています。設計問い：「Aは何を得たがっているか」「Bは何を隠したがっているか」——両方答えられない会話はインフォ交換です。各キャラに「相手との関係の中で追いかける欲求」を設計してください。' };
    if (blandDlg2) dynWarnNote2.quote = '「' + blandDlg2 + '」\\n→ この交換に「追う欲求」を追加してください';
    notes.push(dynWarnNote2);""",
  """    // Find a bland exchange and also the best available tension pair
    const _tensionPairForNote = (() => {
      const _tkws = ['なぜ', 'どうして', '違う', '嘘', '待って', '知らない', 'やめ', '頼む', '聞いて'];
      for (let _ti = 0; _ti < Math.min(nonEmpty.length-1, 30); _ti++) {
        if (_tkws.some(k => nonEmpty[_ti].includes(k) || (nonEmpty[_ti+1]||'').includes(k))) {
          return nonEmpty[_ti].slice(0,45) + (nonEmpty[_ti].length>45?'…':'') + '\\n' + (nonEmpty[_ti+1]||'').slice(0,45) + (((nonEmpty[_ti+1]||'').length>45)?'…':'');
        }
      }
      return null;
    })();
    const dynWarnNote2 = { type: 'warn', text: '対話の引力：会話に緊張感・欲求の衝突が不足しています。設計チェック：① Aは何を求めてこのシーンにいる？ ② Bは何を隠したい/避けたい？ — 両方答えられない会話はインフォ交換です。各台詞に「追う欲求」を設計してください。' };
    if (blandDlg2) {
      dynWarnNote2.quote = '「' + blandDlg2 + '」\\n→ この交換に「目的・秘密・欲求」を追加してください';
    } else if (_tensionPairForNote) {
      dynWarnNote2.quote = _tensionPairForNote + '\\n（緊張の萌芽あり — さらに欲求の衝突を強調してください）';
    }
    notes.push(dynWarnNote2);"""
),

# ── J17: Add new ITEM_DB entries for 'pacing' and 'format-correctness' ──
(
  'item-db pacing add',
  """    'format-correctness': {
      label: '脚本フォーマット',
      tips: [
        { title: '日本語脚本の正式フォーマットを整える', bad: '場面1\\n田中が歩いています。花子に会います。\\n花子：こんにちは\\n田中：やあ', good: '1○商店街・日\\n\\n田中（30）、人混みの中をゆっくり歩く。\\n\\n花子（28）が向こうから現れる。田中に気づき——\\n\\n花子「……久しぶり」\\n田中「（止まる）……うん」', tip: '日本語脚本の基本形式：①柱書き（番号＋○＋場所・時間帯）②ト書き（3行以内）③キャラ名＋「台詞」。この三要素のリズムを整えるだけで読みやすさが格段に向上します。' },
      ]
    },""",
  """    'pacing': {
      label: 'ペーシング（緩急）',
      tips: [
        { title: 'シーンの「入場・目的・退場」を明確化する', bad: 'シーン5: 田中と花子が喫茶店で話す。\\nシーン6: 田中と花子がまだ話している。\\nシーン7: 話が終わって花子が帰る。\\n（シーンの目的が曖昧で、ダレる）', good: '【シーン5: 秘密の暴露】\\n田中「昨日、嘘をついたよね」（IN = 直球の疑問）\\n花子「……（立ち上がり、コートを手にとる）」（OUT = 逃走）\\n→ 1シーン = 1目的 = 1変化。入場時と退場時で何かが変わること。', tip: '「このシーンに入る前と後で何かが変わったか？」を問う。変わっていなければそのシーンはカットか他のシーンに合流させましょう。1シーン=1目的の原則がペーシングを劇的に改善します。' },
        { title: 'テンション曲線を「波」にする', bad: '（全シーンが同じ感情温度で続く——山も谷もない平坦な展開）', good: '【緩】日常の会話→【急】突然の告白→【緩】静かな回想→【急】直接対決\\n→ 緩急のリズムが読者に「呼吸」を与え、急のシーンをより印象的にする', tip: 'テンション低いシーンは高いシーンの「前フリ」。「山→谷→山→山（クライマックス）」のリズムを意識して配置しましょう。緩の直後の急が最も効果的です。' },
      ]
    },
    'format-correctness': {
      label: '脚本フォーマット',
      tips: [
        { title: '日本語脚本の正式フォーマットを整える', bad: '場面1\\n田中が歩いています。花子に会います。\\n花子：こんにちは\\n田中：やあ', good: '1○商店街・日\\n\\n田中（30）、人混みの中をゆっくり歩く。\\n\\n花子（28）が向こうから現れる。田中に気づき——\\n\\n花子「……久しぶり」\\n田中「（止まる）……うん」', tip: '日本語脚本の基本形式：①柱書き（番号＋○＋場所・時間帯）②ト書き（3行以内）③キャラ名＋「台詞」。この三要素のリズムを整えるだけで読みやすさが格段に向上します。' },
      ]
    },"""
),

# ── J18: Improve the tip selection logic in staffRoomGenerateTutoringExamples ──
(
  'tip selection expand keywords',
  """        if (itemIssues && t.title && (
          (itemIssues.includes('説明') && t.title.includes('説明')) ||
          (itemIssues.includes('アーク') && t.title.includes('アーク')) ||
          (itemIssues.includes('変容') && t.title.includes('変化')) ||
          (itemIssues.includes('サブテキスト') && t.title.includes('サブテキスト')) ||
          (itemIssues.includes('発端') && t.title.includes('発端')) ||
          (itemIssues.includes('Want') && t.title.includes('Want')) ||
          (itemIssues.includes('映像') && t.title.includes('映像')) ||
          (itemIssues.includes('目的') && t.title.includes('目的'))
        )) return ti;""",
  """        if (itemIssues && t.title && (
          (itemIssues.includes('説明') && t.title.includes('説明')) ||
          (itemIssues.includes('アーク') && t.title.includes('アーク')) ||
          (itemIssues.includes('変容') && t.title.includes('変化')) ||
          (itemIssues.includes('サブテキスト') && t.title.includes('サブテキスト')) ||
          (itemIssues.includes('発端') && t.title.includes('発端')) ||
          (itemIssues.includes('Want') && t.title.includes('Want')) ||
          (itemIssues.includes('映像') && t.title.includes('映像')) ||
          (itemIssues.includes('目的') && t.title.includes('目的')) ||
          (itemIssues.includes('テンション') && t.title.includes('緩急')) ||
          (itemIssues.includes('緊張') && t.title.includes('目的衝突')) ||
          (itemIssues.includes('フォーマット') && t.title.includes('フォーマット')) ||
          (itemIssues.includes('変化') && t.title.includes('変化')) ||
          (itemIssues.includes('固有') && t.title.includes('固有')) ||
          (itemIssues.includes('声') && t.title.includes('声'))
        )) return ti;"""
),

# ── J19: Add 'naturalness' entry to ITEM_DB ──
(
  'item-db naturalness add',
  """    'authorial-voice': {
      label: '作家性・文体の独自性',
      tips: [
        { title: '抽象的な描写 → 固有の感覚的ディテールへ', bad: '夕暮れの街。田中は哀しそうに歩く。', good: '夕暮れ。アスファルトがじわじわと白くなる時間。\\n田中の靴底に、ガムの跡。\\n（踏んでしまったのは、三歩前だった）', tip: '「哀しい」は書かず、「哀しさを感じさせる具体的なもの」を書く。固有名詞・身体感覚・時間の感じ方——これがあなただけの文体になります。' },
      ]
    },""",
  """    'naturalness': {
      label: 'セリフの自然さ・リズム',
      tips: [
        { title: '長すぎるセリフを「呼吸できる長さ」に切る', bad: '田中「私は長年この会社で働いてきて、それなりに頑張ってきたつもりだけど、なかなか上司に認めてもらえなくて、正直もう限界かなと感じているところです」\\n（60字超 — 一息で言えない → 実際の会話ではない）', good: '田中「……もう、限界かも」\\n（間）\\n田中「ずっと頑張ってきたんだけどな」\\n（分割することで感情に間が生まれる）', tip: 'セリフを声に出して読み、一息で自然に言えない長さなら分割しましょう。台詞の「切れ目」が感情の「間（ま）」になります。60字を超えたら必ず短くする習慣を。' },
        { title: '情報説明のセリフ → 行動・状況に置き換える', bad: '花子「田中さん、ご存知でしょうが、この建物は三十年前に亡くなった山田社長が建てたものです」\\n（キャラが「情報を口から出すロボット」になっている）', good: '（机の上に古い写真。田中、手に取る）\\n花子「……懐かしいでしょう」\\n田中「山田さんか。俺が入社した頃は……」\\n（状況と行動が情報を自然に引き出す）', tip: '「誰もが知っているはずのことを説明させる」のが最も不自然なセリフです。情報はキャラクターの「行動・疑問・反応」に埋め込みましょう。' },
      ]
    },
    'authorial-voice': {
      label: '作家性・文体の独自性',
      tips: [
        { title: '抽象的な描写 → 固有の感覚的ディテールへ', bad: '夕暮れの街。田中は哀しそうに歩く。', good: '夕暮れ。アスファルトがじわじわと白くなる時間。\\n田中の靴底に、ガムの跡。\\n（踏んでしまったのは、三歩前だった）', tip: '「哀しい」は書かず、「哀しさを感じさせる具体的なもの」を書く。固有名詞・身体感覚・時間の感じ方——これがあなただけの文体になります。' },
        { title: '「あなたにしか書けないシーン」を1つ作る', bad: '（どこかで読んだことのあるような感動シーン）\\n田中「ありがとう。生きていてよかった」\\n（普遍的すぎてどの作品でも使える）', good: '（書き手自身の記憶から来た固有の細部）\\n田中、古い折り畳み傘を開く——骨が1本折れている。\\n雨の中。ずっとそれを使い続けてきた。\\n（固有のディテールが感情を担う）', tip: '最もオリジナルな素材はあなた自身の記憶・体験・違和感の中にあります。「私だけが知っているこの感覚」を脚本の中に1シーンだけ入れてみてください。それがあなたの「声」の核になります。' },
      ]
    },"""
),

# ── J20: Add 'plot-logic' entry to ITEM_DB ──
(
  'item-db plot-logic add',
  """    'production-viability': {
      label: '映像化実現可能性',
      tips: [
        { title: '大規模設定を日常的な設定に転換する', bad: '宇宙ステーション内。巨大なモンスターとの死闘が繰り広げられる。', good: '（同じテーマを）古いアパートの一室。光の届かない廊下。\\n田中は出口を探して走り続けるが——部屋が全て同じに見える。', tip: 'ドラマコンクールでは「限られた予算で撮れるか」も評価基準の一つです。大規模なVFXや多数のエキストラが必要な設定は、より日常的な舞台に置き換えても物語は伝わります。' },
      ]
    },""",
  """    'plot-logic': {
      label: 'プロットの論理的一貫性',
      tips: [
        { title: '「偶然」を「必然」に変換する', bad: 'たまたま田中がそこを通りかかり、ちょうど事件を目撃した。\\n（偶然に頼った展開——読者の信頼を失う）', good: '田中が帰宅ルートを変えたのには理由があった。昨夜の花子の一言——「東口から来て」。\\nその一言が、田中をあの路地に向かわせた。\\n（前のシーンに「必然性」を仕込む）', tip: '「たまたま・ちょうど・偶然・都合よく」を脚本から全て削除する。代わりにその「偶然」の前のシーンに「なぜ主人公がそこにいるか」の理由を仕込む。これが脚本技術の核です。' },
        { title: '因果連鎖を「なぜ→だから→しかし」で確認する', bad: 'シーン1: 田中が走る。\\nシーン2: 花子が泣く。\\nシーン3: 二人が話す。\\n（シーンの繋がりに因果関係がない）', good: '（なぜ）田中が秘密を暴こうとした\\n（だから）花子は嘘をついて隠し通そうとした\\n（しかし）その嘘が、さらに深い真実を示唆していた\\n→ 各シーンが「なぜ→だから→しかし」で繋がる', tip: '各シーンの繋がりを「なぜ→だから→しかし」で説明できるか確認する。説明できなければシーン順序か内容に問題があります。この3語がプロットの骨格を作ります。' },
      ]
    },
    'production-viability': {
      label: '映像化実現可能性',
      tips: [
        { title: '大規模設定を日常的な設定に転換する', bad: '宇宙ステーション内。巨大なモンスターとの死闘が繰り広げられる。', good: '（同じテーマを）古いアパートの一室。光の届かない廊下。\\n田中は出口を探して走り続けるが——部屋が全て同じに見える。', tip: 'ドラマコンクールでは「限られた予算で撮れるか」も評価基準の一つです。大規模なVFXや多数のエキストラが必要な設定は、より日常的な舞台に置き換えても物語は伝わります。' },
        { title: '少人数・限定ロケーションで最大の物語を作る', bad: '23ヶ所のロケーション。30人の登場人物。海外シーン含む。\\n（制作予算が膨大になる）', good: '（同じ物語を）マンションの1室と廊下だけで展開。\\n登場人物は田中と花子の2人のみ。\\n→ 制約が創意工夫を生む。少ないほど深くなる。', tip: 'コンクール評価者（多くはプロデューサーやディレクター）は「これを実際に制作できるか」で判断します。3場所・5人以内で成立する物語は通過率が上がります。' },
      ]
    },"""
),

# ── J21: Improve visual quote extraction ──
(
  'visual quote improve',
  """    // Quote a strong visual action line
    const visualQuote = (() => {
      const strongVis = ['光', '影', '血', '涙', '炎', '雨', '音', '沈黙', '笑', '手', '目', '窓', '空'];
      const visCandidates = actionLines.filter(l => strongVis.some(kw => l.includes(kw)) && l.length >= 8 && l.length <= 80);
      return visCandidates.length > 0 ? visCandidates[0] : null;
    })();""",
  """    // Quote a strong visual action line — prefer strong visual keywords
    const visualQuote = (() => {
      const strongVisKws = ['光', '影', '涙', '血', '炎', '雨', '霧', '煙', '沈黙', '目が', '手が', '窓', '空', '暗', '白', '赤'];
      const basicVisKws = ['歩', '立つ', '止まる', '見る', '振り返', '走る', '座る'];
      // Prefer lines with strong visual keywords and medium length
      const strongCands = actionLines.filter(l => strongVisKws.some(kw => l.includes(kw)) && l.length >= 8 && l.length <= 80);
      if (strongCands.length > 0) return strongCands[0];
      const basicCands = actionLines.filter(l => basicVisKws.some(kw => l.includes(kw)) && l.length >= 8 && l.length <= 60);
      return basicCands.length > 0 ? basicCands[0] : null;
    })();"""
),

# ── J22: Improve theme bad note ──
(
  'theme bad note improved',
  """  if (scores['theme-clarity'] <= 2) {
    const themeBadNote = { type: 'warn', text: 'テーマ：「この作品が言いたいこと」を一言で言えますか？テーマは台詞で語らせず、キャラクターの行動パターン・繰り返し・対比の中に埋め込んでください。テーマ的深度' + thematicDiversity + '概念。' };
    // テーマ語がある場合は引用
    if (itemDetails['theme-clarity'] && itemDetails['theme-clarity'].quote) {
      themeBadNote.quote = itemDetails['theme-clarity'].quote + '\\n↳ テーマ語が出てきますが、もっと行動・構造に埋め込んでください。';
    }
    notes.push(themeBadNote);""",
  """  if (scores['theme-clarity'] <= 2) {
    const themeBadNote = { type: 'warn', text: 'テーマ：「この作品が言いたいこと」を一言（○○であっても△△できる、等）で言えますか？テーマは台詞で語らせず、①キャラの行動パターン ②繰り返し出てくるモチーフ ③構造の対比 に埋め込んでください。現在のテーマ的深度: ' + thematicDiversity + '概念。' };
    // テーマ語がある場合は引用し、改善提案も追加
    if (itemDetails['theme-clarity'] && itemDetails['theme-clarity'].quote) {
      themeBadNote.quote = itemDetails['theme-clarity'].quote + '\\n↳ テーマを直接語らせず、この台詞を削除してキャラクターの行動で同じ意味を伝えてください';
    } else {
      // No theme quote found — show what's missing
      themeBadNote.quote = '（テーマを示す台詞・描写が検出されません）\\n↳ 「この作品のテーマは？」を一言で書き出してから、そのテーマを主人公の行動に反映させてください';
    }
    notes.push(themeBadNote);"""
),

# ── J23: Improve char-unique bad note ──
(
  'char-unique bad improved',
  """    const charUniqueNote = { type: 'warn', text: 'キャラクター固有性：' + uniqueChars + '人のキャラクターのセリフが似すぎています。各キャラに「語彙レベル・口癖・禁句（絶対言わない言葉）」を設定し、声を差別化してください。' };
    if (Object.keys(charCounts).length >= 2) {
      const least = Object.entries(charCounts).sort((a,b) => a[1]-b[1])[0];
      const exD = (dialogueByChar[least[0]] || [])[0];
      if (exD) charUniqueNote.quote = least[0] + '「' + (exD.length > 50 ? exD.slice(0,50)+'…' : exD) + '」（最少発言キャラの例）';
    }
    notes.push(charUniqueNote);""",
  """    const charUniqueNote = { type: 'warn', text: 'キャラクター固有性：' + uniqueChars + '人のキャラクターの声が似ています（語彙差異スコア: ' + Math.round(charVocabUniqueness*100) + '%）。各キャラに「語彙レベル・話すスピード・口癖・禁句（絶対言わない言葉）・間の長さ」を設定した「声の設計書」を作り、全セリフを書き直してください。' };
    // Show parallel dialogue comparison from top 2 characters
    if (sortedChars.length >= 2) {
      const charA = sortedChars[0][0], charB = sortedChars[1][0];
      const dlgA = (dialogueByChar[charA]||[])[0];
      const dlgB = (dialogueByChar[charB]||[])[0];
      if (dlgA && dlgB) {
        charUniqueNote.quote = charA + '「' + (dlgA.length > 35 ? dlgA.slice(0,35)+'…' : dlgA) + '」\\n' +
                               charB + '「' + (dlgB.length > 35 ? dlgB.slice(0,35)+'…' : dlgB) + '」\\n→ この2つのセリフに「声の差異」はありますか？ 誰でも言えるセリフなら差別化が必要です';
      } else if (dlgA) {
        charUniqueNote.quote = charA + '「' + (dlgA.length > 50 ? dlgA.slice(0,50)+'…' : dlgA) + '」\\n→ 他のキャラクターと区別できる声になっていますか？';
      }
    }
    notes.push(charUniqueNote);"""
),

# ── J24: Improve format note ──
(
  'format bad note improved',
  """  if (scores['format-correctness'] <= 2) {
    notes.push({ type: 'warn', text: '脚本フォーマット：柱書き（○場所・時間帯）・ト書き・台詞（キャラ名「台詞」）の基本三要素が不揃いです。プロ投稿ではシーン番号も必須。' + (!hasSceneNumbers && sceneCount > 0 ? 'シーン番号を追加してください。' : '') });""",
  """  if (scores['format-correctness'] <= 2) {
    const fmtNote = { type: 'warn', text: '脚本フォーマット：①柱書き（番号＋○＋場所・時間帯）②ト書き（3行以内）③台詞（キャラ名「台詞」）の基本三要素が不揃いです。' + (!hasSceneNumbers && sceneCount > 0 ? 'シーン番号を追加してください（例: 1○教室・昼）。' : '') + 'プロ投稿ではフォーマットが審査対象です。' };
    if (!hasSceneNumbers && sceneLines.length > 0) {
      fmtNote.quote = sceneLines[0] + '\\n↳ この柱書きにシーン番号（1○ 2○ ...）を付けてください';
    } else if (!hasProperJapFormat) {
      const firstLine = nonEmpty[0] || '';
      fmtNote.quote = firstLine.slice(0,60) + (firstLine.length>60?'…':'') + '\\n↳ 柱書き形式（例: 1○場所・時間帯）が見当たりません';
    }
    notes.push(fmtNote);"""
),

]

# ── run ──────────────────────────────────────────────────────────────
print('=== patch_v10.py ===')
print('CSS patches:')
css_ok = patch_file('/home/user/webapp/public/static/app.css', css_patches)
print()
print('JS patches:')
js_ok = patch_file('/home/user/webapp/public/static/app.js', js_patches)
print()
print(f'Total: CSS {css_ok} ok, JS {js_ok} ok')
print('Patch v10 complete.')
