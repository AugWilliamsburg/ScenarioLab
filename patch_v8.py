#!/usr/bin/env python3
"""
patch_v8.py — Scenario Lab Staff Room Comprehensive Upgrade
UI/UX overhaul + Engine precision + Citation improvements
"""

import re, sys

SRC = '/home/user/webapp/public/static/app.js'

with open(SRC, 'r', encoding='utf-8') as f:
    code = f.read()

orig_len = len(code)
patches = []

# ─────────────────────────────────────────────────────────────
# 0. Version bump
# ─────────────────────────────────────────────────────────────
patches.append((
    'SCENARIO LAB ─ 審査員採点レポート v8',
    'SCENARIO LAB ─ 審査員採点レポート v9'
))
patches.append((
    '18項目・7軸・実脚本引用 v8',
    '18項目・7軸・実脚本引用 v9'
))
patches.append((
    "// シナリオラボ 職員室 — コンクール審査員エンジン v7.0",
    "// シナリオラボ 職員室 — コンクール審査員エンジン v9.0"
))

# ─────────────────────────────────────────────────────────────
# 1. CSS OVERHAUL — Add at end of app.css block in app.js
#    (we inject new CSS into the existing sr- CSS block)
# ─────────────────────────────────────────────────────────────

# 1a. Upgrade sr-tutor-card for better visual hierarchy
patches.append((
    """.sr-tutor-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 10px;
}""",
    """.sr-tutor-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,.05);
  transition: box-shadow .2s;
}
.sr-tutor-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,.09);
}"""
))

# 1b. Upgrade sr-diag-note for compact readability
patches.append((
    """.sr-diag-note {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 9px 12px;
  border-radius: 9px;
  border: 1px solid transparent;
  margin-bottom: 5px;
}""",
    """.sr-diag-note {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 8px 11px;
  border-radius: 8px;
  border: 1px solid transparent;
  margin-bottom: 4px;
  transition: background .15s;
}
.sr-diag-note:hover { filter: brightness(.97); }"""
))

# 1c. Upgrade quote block for better typographic presentation
patches.append((
    """.sr-quote-body {
  padding: 8px 12px;
  font-family: 'Noto Serif JP', 'Yu Mincho', serif;
  font-size: 10.5px;
  line-height: 2;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-primary);
}""",
    """.sr-quote-body {
  padding: 9px 14px;
  font-family: 'Noto Serif JP', 'Yu Mincho', serif;
  font-size: 11px;
  line-height: 1.95;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-primary);
  letter-spacing: .01em;
}"""
))

# 1d. Enhance sr-rubric-item for visual clarity
patches.append((
    """.sr-rubric-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-light, #f0f0f0);
  transition: background .15s;
}""",
    """.sr-rubric-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 0;
  border-bottom: 1px solid var(--border-light, #f0f0f0);
  transition: background .15s;
}
.sr-rubric-item:hover > div:first-child { opacity: .97; }"""
))

# 1e. Improve sr-fb-tabs for modern look
patches.append((
    """.sr-fb-tab {
  flex: 1;
  min-width: 60px;
  padding: 10px 6px;
  font-size: 10.5px;
  font-weight: 600;
  border: none;
  border-bottom: 2.5px solid transparent;
  cursor: pointer;
  background: transparent;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  white-space: nowrap;
  transition: color .15s, border-color .15s;
}""",
    """.sr-fb-tab {
  flex: 1;
  min-width: 64px;
  padding: 10px 8px;
  font-size: 10.5px;
  font-weight: 600;
  border: none;
  border-bottom: 2.5px solid transparent;
  cursor: pointer;
  background: transparent;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  white-space: nowrap;
  transition: color .2s, border-color .2s, background .2s;
  letter-spacing: .01em;
}
.sr-fb-tab:hover:not(.active) { background: var(--bg-subtle); border-radius: 4px 4px 0 0; }"""
))

# 1f. Priority cards - enhanced
patches.append((
    """.sr-priority-card {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 13px;
  margin-bottom: 6px;
  border-radius: 10px;
  border: 1px solid transparent;
  border-left: 3px solid transparent;
}""",
    """.sr-priority-card {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 11px 14px;
  margin-bottom: 7px;
  border-radius: 10px;
  border: 1px solid transparent;
  border-left: 3px solid transparent;
  transition: transform .15s, box-shadow .15s;
}
.sr-priority-card:hover { transform: translateX(2px); box-shadow: 0 2px 8px rgba(0,0,0,.07); }"""
))

# 1g. Add new CSS classes for enhanced UI
patches.append((
    '.sr-tutor-urgency-badge.info { background: var(--fuji-bg,#f0eeff); color: var(--fuji); border: 1px solid var(--fuji-border,#e0d0ff); }',
    """.sr-tutor-urgency-badge.info { background: var(--fuji-bg,#f0eeff); color: var(--fuji); border: 1px solid var(--fuji-border,#e0d0ff); }

/* ── v9: 脚本引用ブロック — 縦一列・コンパクト ─────────── */
.sr-cite-block {
  margin-top: 8px;
  border-left: 3px solid var(--cite-accent, #7c3aed);
  background: var(--cite-bg, rgba(124,58,237,.04));
  border-radius: 0 6px 6px 0;
  padding: 7px 12px;
}
.sr-cite-block.cite-bad  { --cite-accent: #dc2626; --cite-bg: rgba(220,38,38,.04); }
.sr-cite-block.cite-good { --cite-accent: #16a34a; --cite-bg: rgba(22,163,74,.04); }
.sr-cite-block.cite-warn { --cite-accent: #d97706; --cite-bg: rgba(217,119,6,.04); }
.sr-cite-label {
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--cite-accent, #7c3aed);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.sr-cite-text {
  font-family: 'Noto Serif JP', serif;
  font-size: 11px;
  line-height: 1.9;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-primary);
}
/* ── v9: 改善前後カード（縦積みバリアント） ─────────────── */
.sr-ba-stack { display: flex; flex-direction: column; gap: 6px; padding: 8px 13px 11px; }
.sr-ba-stack .sr-ba-before,
.sr-ba-stack .sr-ba-after { border-radius: 7px; padding: 8px 10px; }
/* ── v9: スコア＆アイテム行 ─────────────────────────────── */
.sr-score-ring {
  width: 38px; height: 38px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; font-size: 14px; font-weight: 800; line-height: 1;
  border: 2.5px solid currentColor;
}
/* ── v9: 採点エンジン精度バッジ ────────────────────────── */
.sr-engine-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 10px;
  background: linear-gradient(90deg,rgba(109,40,217,.12),rgba(59,130,246,.12));
  color: #4c1d95; border: 1px solid rgba(109,40,217,.2);
  letter-spacing: .04em;
}"""
))

# ─────────────────────────────────────────────────────────────
# 2. TOP BANNER — version label refinement
# ─────────────────────────────────────────────────────────────

patches.append((
    """<span style="font-size:9px;background:rgba(168,85,247,.25);color:rgba(200,160,255,.9);border:1px solid rgba(168,85,247,.4);border-radius:4px;padding:1px 6px;font-weight:700;letter-spacing:.05em">18項目・7軸・実脚本引用 v9</span>""",
    """<span style="font-size:9px;background:rgba(168,85,247,.25);color:rgba(200,160,255,.9);border:1px solid rgba(168,85,247,.4);border-radius:4px;padding:1px 6px;font-weight:700;letter-spacing:.05em">18項目・7軸・実脚本引用 v9</span>
            <span class="sr-engine-badge"><i class="fas fa-microchip" style="font-size:7px"></i>精密解析エンジン</span>"""
))

# ─────────────────────────────────────────────────────────────
# 3. DIAGNOSTIC NOTES — compact cite block replaces old quote block
# ─────────────────────────────────────────────────────────────

patches.append((
    """              ${(autoResult.detailNotes||[]).map(n=>`
              <div class="sr-diag-note note-${n.type==='good'?'good':n.type==='warn'?'warn':'bad'}">
                <div class="sr-diag-note-icon"><i class="fas ${n.type==='good'?'fa-check':n.type==='warn'?'fa-exclamation':'fa-times'}"></i></div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:11.5px;line-height:1.75;color:var(--text-primary);font-weight:500">${esc(n.text)}</div>
                  ${n.quote ? `<div class="sr-quote-block quote-${n.type==='good'?'good':n.type==='warn'?'warn':'bad'}" style="margin-top:7px">
                    <div class="sr-quote-header">
                      <i class="fas ${n.type==='good'?'fa-quote-left':'fa-highlighter'}" style="font-size:8px;color:${n.type==='good'?'var(--matcha)':n.type==='warn'?'var(--kogane)':'var(--momo)'}"></i>
                      <span class="sr-quote-header-label" style="color:${n.type==='good'?'var(--matcha)':n.type==='warn'?'var(--kogane)':'var(--momo)'}">${n.type==='good'?'好例 — 脚本より':n.type==='warn'?'注意 — 脚本より':'問題箇所 — 脚本より'}</span>
                    </div>
                    <div class="sr-quote-body" style="color:${n.type==='good'?'#14532d':n.type==='warn'?'#78350f':'#7f1d1d'}">${esc(n.quote)}</div>
                  </div>` : ''}
                </div>
              </div>`).join('')}""",
    """              ${(autoResult.detailNotes||[]).map(n=>{
                const typeClass = n.type==='good'?'good':n.type==='warn'?'warn':'bad';
                const iconName = n.type==='good'?'fa-check':n.type==='warn'?'fa-exclamation':'fa-times';
                const citeClass = n.type==='good'?'cite-good':n.type==='warn'?'cite-warn':'cite-bad';
                const citeLabel = n.type==='good'?'好例 — 脚本より':n.type==='warn'?'参照 — 脚本より':'問題箇所 — 脚本より';
                const citeIcon = n.type==='good'?'fa-quote-left':'fa-highlighter';
                const citeColor = n.type==='good'?'#16a34a':n.type==='warn'?'#d97706':'#dc2626';
                return `
              <div class="sr-diag-note note-${typeClass}">
                <div class="sr-diag-note-icon"><i class="fas ${iconName}"></i></div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:11.5px;line-height:1.75;color:var(--text-primary);font-weight:500">${esc(n.text)}</div>
                  ${n.quote ? `<div class="sr-cite-block ${citeClass}" style="margin-top:6px">
                    <div class="sr-cite-label"><i class="fas ${citeIcon}" style="font-size:7px"></i>${citeLabel}</div>
                    <div class="sr-cite-text">${esc(n.quote)}</div>
                  </div>` : ''}
                </div>
              </div>`;}).join('')}"""
))

# ─────────────────────────────────────────────────────────────
# 4. WEAKNESS TAB — inline cite block (replace old quote-block)
# ─────────────────────────────────────────────────────────────

patches.append((
    """                ${weakQuote2 ? `<div class="sr-quote-block quote-bad" style="border-top:1px solid rgba(239,68,68,.15);border-radius:0">
                  <div class="sr-quote-header"><i class="fas fa-highlighter" style="font-size:7px;color:var(--momo)"></i><span class="sr-quote-header-label" style="color:var(--momo)">問題箇所 \\u2014 脚本より</span></div>
                  <div class="sr-quote-body" style="color:#7f1d1d">${esc(weakQuote2)}</div>
                </div>` : ''}""",
    """                ${weakQuote2 ? `<div class="sr-cite-block cite-bad" style="border-radius:0 0 6px 6px;margin:0 10px 8px;margin-top:0">
                  <div class="sr-cite-label"><i class="fas fa-highlighter" style="font-size:7px"></i>問題箇所 — 脚本より</div>
                  <div class="sr-cite-text">${esc(weakQuote2)}</div>
                </div>` : ''}"""
))

# ─────────────────────────────────────────────────────────────
# 5. RUBRIC ITEM QUOTE — upgrade inline quote to cite-block
# ─────────────────────────────────────────────────────────────

patches.append((
    """            ${autoQuote ? `
            <div class="sr-quote-block quote-${scoreVal<=2?'bad':scoreVal>=4?'good':'warn'}" style="margin-top:8px">
              <div class="sr-quote-header">
                <i class="fas ${scoreVal<=2?'fa-highlighter':scoreVal>=4?'fa-quote-left':'fa-minus'}" style="font-size:7px;color:${scoreVal<=2?'var(--momo)':scoreVal>=4?'var(--matcha)':'var(--kogane)'}"></i>
                <span class="sr-quote-header-label" style="color:${scoreVal<=2?'var(--momo)':scoreVal>=4?'var(--matcha)':'var(--kogane)'}">${scoreVal<=2?'問題箇所 \\u2014 脚本より':scoreVal>=4?'好例 \\u2014 脚本より':'参照 \\u2014 脚本より'}</span>
              </div>
              <div class="sr-quote-body" style="color:${scoreVal<=2?'#7f1d1d':scoreVal>=4?'#14532d':'#78350f'}">${esc(autoQuote)}</div>
            </div>` : ''}""",
    """            ${autoQuote ? `
            <div class="sr-cite-block ${scoreVal<=2?'cite-bad':scoreVal>=4?'cite-good':'cite-warn'}" style="margin-top:8px">
              <div class="sr-cite-label"><i class="fas ${scoreVal<=2?'fa-highlighter':scoreVal>=4?'fa-quote-left':'fa-search'}" style="font-size:7px"></i>${scoreVal<=2?'問題箇所 — 脚本引用':scoreVal>=4?'好例 — 脚本引用':'参照 — 脚本引用'}</div>
              <div class="sr-cite-text" style="color:${scoreVal<=2?'#7f1d1d':scoreVal>=4?'#14532d':'#78350f'}">${esc(autoQuote)}</div>
            </div>` : ''}"""
))

# ─────────────────────────────────────────────────────────────
# 6. SUGGESTIONS TAB — upgrade before/after labels & visual
# ─────────────────────────────────────────────────────────────

patches.append((
    """                  if (bText) html += '<div class="sr-ba-before"><div class="sr-ba-label"><span style="width:7px;height:7px;border-radius:50%;background:#b91c1c;flex-shrink:0;display:inline-block"></span>改善前</div><pre class="sr-ba-text">' + esc(bText) + '</pre></div>';
                    if (aText) html += '<div class="sr-ba-after"><div class="sr-ba-label"><span style="width:7px;height:7px;border-radius:50%;background:#15803d;flex-shrink:0;display:inline-block"></span>改善後</div><pre class="sr-ba-text">' + esc(aText) + '</pre></div>';""",
    """                  if (bText) html += '<div class="sr-ba-before"><div class="sr-ba-label"><i class="fas fa-times-circle" style="font-size:9px;margin-right:3px"></i>改善前 — 問題のあるパターン</div><pre class="sr-ba-text">' + esc(bText) + '</pre></div>';
                    if (aText) html += '<div class="sr-ba-after"><div class="sr-ba-label"><i class="fas fa-check-circle" style="font-size:9px;margin-right:3px"></i>改善後 — 書き直し例</div><pre class="sr-ba-text">' + esc(aText) + '</pre></div>';"""
))

# ─────────────────────────────────────────────────────────────
# 7. TUTORING PANEL — header refinement
# ─────────────────────────────────────────────────────────────

patches.append((
    """          <i class="fas fa-pen-ruler" style="color:var(--fuji);font-size:12px"></i>
          <span style="font-size:12px;font-weight:700;color:var(--text-primary)">改稿テクニック</span>
          <span style="font-size:9.5px;background:var(--fuji-bg,#f0eeff);color:var(--fuji);border:1px solid var(--fuji-border,#e0d0ff);border-radius:10px;padding:2px 8px;font-weight:700;letter-spacing:.02em">弱点項目の書き直し例</span>
          <span style="font-size:9.5px;color:var(--text-muted);margin-left:2px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:8px;padding:1px 6px">脚本引用つき</span>""",
    """          <i class="fas fa-pen-ruler" style="color:var(--fuji);font-size:12px"></i>
          <span style="font-size:12px;font-weight:700;color:var(--text-primary)">改稿テクニック</span>
          <span style="font-size:9px;background:var(--fuji-bg,#f0eeff);color:var(--fuji);border:1px solid var(--fuji-border,#e0d0ff);border-radius:10px;padding:2px 8px;font-weight:700;letter-spacing:.02em"><i class="fas fa-bullseye" style="font-size:7px;margin-right:3px"></i>弱点集中トレーニング</span>
          <span style="font-size:9px;color:var(--text-muted);background:var(--bg-subtle);border:1px solid var(--border);border-radius:8px;padding:2px 7px"><i class="fas fa-code-compare" style="font-size:7px;margin-right:3px"></i>Before→After付き</span>"""
))

# ─────────────────────────────────────────────────────────────
# 8. ENGINE: Add more precise quote extraction for pacing
#    (improves the pacing note to include both scene heading AND next action line)
# ─────────────────────────────────────────────────────────────

patches.append((
    """      if (maxLen > 30 && sceneLines.length > 0) {
        const longSceneIdx = sceneLengths.indexOf(maxLen);
        if (longSceneIdx >= 0 && longSceneIdx < sceneLines.length) {
          pacingNote.quote = sceneLines[longSceneIdx] + ' [' + maxLen + '行のシーン — 要圧縮]';
        }
      }""",
    """      if (maxLen > 30 && sceneLines.length > 0) {
        const longSceneIdx = sceneLengths.indexOf(maxLen);
        if (longSceneIdx >= 0 && longSceneIdx < sceneLines.length) {
          // Show scene heading + first action line of that scene for context
          const sceneHeading = sceneLines[longSceneIdx];
          const headingLineIdx = lines.findIndex(l => l.trim() === sceneHeading.trim());
          let nextActionLine = '';
          if (headingLineIdx >= 0) {
            for (let li = headingLineIdx + 1; li < Math.min(headingLineIdx + 8, lines.length); li++) {
              const tl = lines[li].trim();
              if (tl && !tl.match(/^[ぁ-んァ-ン一-鿿\w]{1,12}[　\s]*$/) && tl.length > 5) {
                nextActionLine = '\n' + tl;
                break;
              }
            }
          }
          pacingNote.quote = sceneHeading + nextActionLine + '\n（このシーン: ' + maxLen + '行 — 目標: 20行以下に圧縮）';
        }
      }"""
))

# ─────────────────────────────────────────────────────────────
# 9. ENGINE: Strengthen Want/Need bad note with more context
# ─────────────────────────────────────────────────────────────

patches.append((
    """      if (mainCharName && dialogueByChar[mainCharName]) {
      const mainDlgs = dialogueByChar[mainCharName];
      const goalKws = ['したい', 'なりたい', 'ほしい', '目指', '望む', '必要', '欲し', '手に入れ'];
      const goalDlg = mainDlgs.find(d => goalKws.some(k => d.includes(k)));
      if (goalDlg) wantNeedBad.quote = mainCharName + '「' + (goalDlg.length > 60 ? goalDlg.slice(0,60)+'…' : goalDlg) + '」（欲求表現が弱い — より明確化が必要）';
      else if (mainDlgs.length > 0) wantNeedBad.quote = mainCharName + '「' + (mainDlgs[0].length > 60 ? mainDlgs[0].slice(0,60)+'…' : mainDlgs[0]) + '」（この台詞にWantを埋め込む余地があります）';
    }""",
    """      if (mainCharName && dialogueByChar[mainCharName]) {
      const mainDlgs = dialogueByChar[mainCharName];
      const goalKws = ['したい', 'なりたい', 'ほしい', '目指', '望む', '必要', '欲し', '手に入れ', '夢', '願い', 'やりたい', '変えたい'];
      const goalDlg = mainDlgs.find(d => goalKws.some(k => d.includes(k)));
      if (goalDlg) {
        wantNeedBad.quote = mainCharName + '「' + (goalDlg.length > 60 ? goalDlg.slice(0,60)+'…' : goalDlg) + '」\n→ 欲求が曖昧。具体的な行動目標（Want）と内的成長テーマ（Need）に分けて設計してください。';
      } else if (mainDlgs.length > 0) {
        // Find first or most substantive line
        const subst = mainDlgs.find(d => d.length >= 10) || mainDlgs[0];
        wantNeedBad.quote = mainCharName + '「' + (subst.length > 60 ? subst.slice(0,60)+'…' : subst) + '」\n→ この台詞に「〜したい（Want）／〜が必要だ（Need）」を埋め込んでください。';
      }
    }"""
))

# ─────────────────────────────────────────────────────────────
# 10. ENGINE: Enhance subtext note with anti-explanation detection
# ─────────────────────────────────────────────────────────────

patches.append((
    """    const subtextNote = { type: 'bad', text: 'サブテキスト：説明台詞（「だから〜なんだ」「実は〜だったんだ」）が' + onTheNoseCount + '箇所あります。キャラの感情・意図をセリフで語らせず、行動・沈黙・視線・小道具で表現してください。' };""",
    """    const subtextNote = { type: 'bad', text: 'サブテキスト：説明台詞（「だから〜なんだ」「実は〜だったんだ」）が' + onTheNoseCount + '箇所あります。感情を言葉で語るのではなく、行動・沈黙・物・視線・間で表現するのがプロの書き方です。' };"""
))

# Enhance subtext quote extraction
patches.append((
    """    // オンザノーズ台詞を引用
    const onNoseDlg = dialogueTexts.find(d => onTheNosePhrases.some(p => d.includes(p)));
    if (onNoseDlg) subtextNote.quote = '「' + (onNoseDlg.length > 70 ? onNoseDlg.slice(0,70)+'…' : onNoseDlg) + '」（説明台詞 — 行動や沈黙に置き換えを）';""",
    """    // オンザノーズ台詞を引用（最もひどい事例を選択）
    const onNoseDlgs = dialogueTexts.filter(d => onTheNosePhrases.some(p => d.includes(p)));
    // Sort by number of on-the-nose phrases matched
    const onNoseDlg = onNoseDlgs.sort((a,b) => {
      const ca = onTheNosePhrases.filter(p=>a.includes(p)).length;
      const cb = onTheNosePhrases.filter(p=>b.includes(p)).length;
      return cb - ca;
    })[0];
    if (onNoseDlg) {
      const phrase = onTheNosePhrases.find(p => onNoseDlg.includes(p));
      subtextNote.quote = '「' + (onNoseDlg.length > 70 ? onNoseDlg.slice(0,70)+'…' : onNoseDlg) + '」\n→ 「' + phrase + '」が説明的。この感情を行動や物で見せてください。';
    }"""
))

# ─────────────────────────────────────────────────────────────
# 11. ENGINE: Improve emotional-impact note with stronger quote
# ─────────────────────────────────────────────────────────────

patches.append((
    """    const emoWarnNote = { type: 'warn', text: '感情インパクト：感情キーワード密度' + Math.round(emotionDensity*100) + '%（やや低め）。脚本中の感情的ピーク（クライマックス）を強化してください。登場人物の内的葛藤を行動で示すシーンを1つ加えるだけで劇的に変わります。' };""",
    """    const emoWarnNote = { type: 'warn', text: '感情インパクト：感情キーワード密度' + Math.round(emotionDensity*100) + '%（低め）。物語のクライマックス付近で、主人公が最も傷つくか・最も勇気を出すシーンを1つ明確に設けてください。感情は台詞で言わせず、沈黙・身体動作・小道具で表現するのが秘訣です。' };"""
))

# ─────────────────────────────────────────────────────────────
# 12. SUGGESTIONS — add script-specific quote to suggestion items
#     (inject actual script dialogue into suggestion before/after)
# ─────────────────────────────────────────────────────────────

# Improve the suggestions generation to include actual script lines
patches.append((
    """  // 改善提案（weaknessから自動生成、前後例つき）
  const suggestions = weakItems.reduce((acc, [id, detail]) => {""",
    """  // 改善提案（weaknessから自動生成、前後例つき・実脚本引用強化）
  const suggestions = weakItems.reduce((acc, [id, detail]) => {"""
))

# ─────────────────────────────────────────────────────────────
# 13. ITEM_DB: Expand plot-logic with richer before/after examples
# ─────────────────────────────────────────────────────────────

patches.append((
    """        tips: [
          {
            title: '因果連鎖を強化せよ：「なぜ→だから→しかし」で設計する',
            bad: '田中はたまたま通りかかり、その事件を目撃してしまった。',
            good: '昨夜の花子の一言が頭を離れず、田中はいつもと違う道を選んだ。その路地の先で——',
            advice: '「偶然/たまたま/ちょうど」を全て削除し、直前シーンにキャラの動機を埋め込む。'
          },
          {
            title: '「なぜ→だから→しかし」テンプレートで全シーンを点検せよ',
            bad: '（シーン: 田中が突然会社を辞める）',
            good: '（シーン直前: 田中は上司の不正を発見する）→（だから辞表を書く）→（しかし妻の病気で踏み出せない）',
            advice: '全シーンを「なぜ→だから→しかし」で説明できるか確認。できなければ再構成。'
          }
        ]""",
    """        tips: [
          {
            title: '因果連鎖を強化せよ：「なぜ→だから→しかし」で設計する',
            bad: '田中はたまたま通りかかり、その事件を目撃してしまった。\n（偶然の一致に依存した展開）',
            good: '昨夜の花子の一言が頭を離れず、田中はいつもと違う道を選んだ。\nその路地の先で——予感していた何かが、そこにあった。',
            advice: '「偶然/たまたま/ちょうど」を全て削除し、直前シーンにキャラの動機・伏線を埋め込む。「なぜ彼/彼女はここにいるのか？」が答えられなければ書き直し。'
          },
          {
            title: '「なぜ→だから→しかし」テンプレートで全シーンを点検せよ',
            bad: '（シーン: 田中が突然会社を辞める）\n→ 理由なく事態が進む、読者置いてけぼり型',
            good: '（前シーン: 田中は上司の不正書類を発見する）\n→（だから辞表を書く）\n→（しかし妻の入院費が払えなくなる——）',
            advice: '全シーンを3段論法で説明できるか確認。できなければ、前のシーンに「なぜ」の根拠を仕込む。'
          }
        ]"""
))

# ─────────────────────────────────────────────────────────────
# 14. ITEM_DB: Upgrade character-arc tips
# ─────────────────────────────────────────────────────────────

patches.append((
    """      'char-arc': {
        label: 'キャラクターアーク',
        tips: [
          {
            title: '「変化前→転機→変化後」の三点を設計せよ',
            bad: '主人公は最後に「わかった、俺が変わる」と言って終わる。',
            good: '序盤: 主人公は「一人でやる」と意地を張る。\\n転機: 最も信頼する人が去っていく。\\n終盤: 主人公は初めて「助けてくれ」と声を出す。',
            advice: '言葉で変化を語らせない。行動・選択・態度の変化として見せる。'
          }
        ]
      },""",
    """      'char-arc': {
        label: 'キャラクターアーク',
        tips: [
          {
            title: '「変化前→転機→変化後」の三点を設計せよ',
            bad: '（序盤）主人公「俺は一人でいい。誰も信用しない。」\n（終盤）主人公「…わかった、俺が変わる」\n→ 変化が台詞宣言だけで、行動で示されていない',
            good: '（序盤）主人公は差し出された手を振り払い、背を向ける。\n（転機）信頼した人が自分のせいで倒れる——長い沈黙。\n（終盤）主人公は初めて自分から手を伸ばす。台詞なし。',
            advice: 'アークの変化は「行動・選択・態度」で見せる。変化を言わせるのは最後の手段。最良のアークは台詞ゼロでも伝わる。'
          },
          {
            title: '変化の「コスト」を設けよ：何かを失うから変われる',
            bad: '特に失うものなく、主人公が成長して終わる。',
            good: '主人公が前進するために、最も大切にしていた「○○」を手放す瞬間を設ける。\n例: 夢を諦める、仲間を離れる、嘘をつく——それでも進む選択。',
            advice: 'コストなき変化は薄い。「何を失ったか」が変化の深さを決める。'
          }
        ]
      },"""
))

# ─────────────────────────────────────────────────────────────
# 15. ITEM_DB: Upgrade voice (声の固有性) tips
# ─────────────────────────────────────────────────────────────

patches.append((
    """      'voice': {
        label: 'セリフの声の固有性',
        tips: [
          {
            title: '各キャラに「語尾・語彙・禁止ワード」設計シートを作れ',
            bad: '（太郎）「そうですね、なるほど。」\\n（花子）「そうですね、わかりました。」',
            good: '（太郎: 短文・断定型）「違う。それじゃ足りない。」\\n（花子: 疑問形・やわらか型）「……でも、ほんとうに？ 足りない、って何が？」',
            advice: '名前を隠してもどのキャラか分かるセリフを目指す。語尾（〜だ/〜ですか/〜じゃん）・文長・省略パターンをキャラごとに固定する。'
          }
        ]
      },""",
    """      'voice': {
        label: 'セリフの声の固有性',
        tips: [
          {
            title: '各キャラに「語尾・語彙・禁止ワード」設計シートを作れ',
            bad: '（太郎）「そうですね、なるほど。わかりました。」\n（花子）「そうですね、なるほど。わかりました。」\n→ 名前を消すと誰が話しているか分からない',
            good: '（太郎: 短文・命令口調・断定型）\n「違う。それじゃ足りない。もう一度。」\n（花子: 疑問形・婉曲・言いかけ型）\n「……でも、ほんとうに？ 足りないって——何が、足りないの？」',
            advice: '名前を隠してもキャラが特定できるセリフを目指す。語尾パターン・文の長さ・省略の有無・禁止ワードをキャラごとに設計シートに書き出す。'
          },
          {
            title: 'キャラの「禁止ワード」を設けよ',
            bad: '全員が「すみません」「わかりました」「なるほど」を使う。',
            good: '太郎は絶対に「ごめん」と言わない（代わりに無言で行動する）。\n花子は「違う」と言えず「…そう、かもね」と濁す。\n→ 禁止ワードが性格の核心を示す。',
            advice: 'キャラが「言えないこと」「言わないこと」こそが最大の個性。禁止ワード設計は声の固有化の最短経路。'
          }
        ]
      },"""
))

# ─────────────────────────────────────────────────────────────
# 16. ITEM_DB: Upgrade subtext tips
# ─────────────────────────────────────────────────────────────

patches.append((
    """      'subtext': {
        label: 'サブテキストの活用',
        tips: [
          {
            title: '感情を行動・物・沈黙に置き換えよ',
            bad: '花子「私、あなたのこと好きなんです。ずっと想っていました。」',
            good: '花子はコーヒーを置く。カップの向きが、いつも太郎の方を向いている。',
            advice: 'セリフで言えることは、行動でも言える。どちらが映像的で記憶に残るか考えよ。'
          }
        ]
      },""",
    """      'subtext': {
        label: 'サブテキストの活用',
        tips: [
          {
            title: '感情を行動・物・沈黙に置き換えよ',
            bad: '花子「私、あなたのこと好きなんです。ずっと想っていました。」\n（感情を直接宣言する——説明台詞の典型）',
            good: '花子はコーヒーを置く。カップの向きが、いつも太郎の側を向いている。\n花子、それに気づき、そっとカップを正面に直す。\n（行動で感情を見せる——観客が自分で気づく）',
            advice: 'テスト: 台詞を消してト書きだけで感情が伝わるか確認せよ。伝わるなら台詞は不要。伝わらないならト書きを強化。'
          },
          {
            title: '「説明台詞」を「行動＋沈黙」に変換するトレーニング',
            bad: '太郎「俺、実は後悔してるんだ。あの時ああすれば良かったと、ずっと思ってた。」',
            good: '太郎、古びた写真を取り出す。しばらく見つめ——ゆっくりと引き出しの奥にしまう。\n花子「捨てないの？」\n太郎「（間）……捨てられない。」',
            advice: '「実は」「ずっと」「〜なんだ」で始まる台詞は全て説明台詞の候補。物・行動・一言に圧縮せよ。'
          }
        ]
      },"""
))

# ─────────────────────────────────────────────────────────────
# 17. ITEM_DB: Expand want/need tips
# ─────────────────────────────────────────────────────────────

patches.append((
    """      'protag-want-need': {
        label: '主人公のWant/Need',
        tips: [
          {
            title: '「冒頭シーン」でWantを映像で見せよ',
            bad: '主人公の独白：「私の夢は、作家になることだ。ずっとそれだけを目指してきた。」',
            good: '深夜。主人公はカーテンを閉め、原稿用紙に向かう。家族の声が廊下から聞こえ——構わず書き続ける。',
            advice: '冒頭3シーンでWantを行動で見せ、中盤でNeedを暗示し、クライマックスで両者を衝突させる。'
          }
        ]
      },""",
    """      'protag-want-need': {
        label: '主人公のWant/Need',
        tips: [
          {
            title: '「冒頭シーン」でWantを映像で見せよ（台詞禁止）',
            bad: '（冒頭: 主人公の独白）\n「私の夢は、作家になることだ。ずっとそれだけを目指してきた。」\n→ Wantを言葉で説明している——説明台詞の典型',
            good: '（冒頭: 深夜）\n主人公はカーテンを閉め、原稿用紙に向かう。\n廊下から家族の「もう寝なさい」——構わず書き続ける。\n→ 行動でWantが伝わる',
            advice: 'Want（外的目標）とNeed（内的課題）を設計表に書き出す。Wantは第1幕で行動で示し、Needはクライマックスで問われる。'
          },
          {
            title: 'Want vs Need の対立構造を設計せよ',
            bad: 'Want: 出世したい、Need: 家族を大切に——両方が自然に達成される。\n→ 葛藤なし、ドラマなし',
            good: 'Want: 出世（単身赴任が必要）\nNeed: 娘との時間（今しかない）\n→ クライマックス: 赴任の辞令を受けた夜、娘から「パパ、行かないで」\n→ どちらを選ぶかが物語の核心',
            advice: 'WantとNeedが衝突する瞬間がクライマックスになる。両者が衝突しないならNeedの設計を見直す。'
          }
        ]
      },"""
))

# ─────────────────────────────────────────────────────────────
# 18. ITEM_DB: Enhance visual storytelling tips
# ─────────────────────────────────────────────────────────────

patches.append((
    """      'visual': {
        label: 'ビジュアルストーリーテリング',
        tips: [
          {
            title: '「感情を映像で語れ」——視覚的シーン設計',
            bad: '太郎は悲しかった。花子のことを思い、涙を流した。',
            good: '太郎、花子が置いていったコーヒーカップを手に取る。まだ温かい。\\nゆっくり——床に置く。',
            advice: '感情語（悲しい・嬉しい・怒る）を使わず、視覚的描写だけで感情を伝える訓練をせよ。'
          }
        ]
      },""",
    """      'visual': {
        label: 'ビジュアルストーリーテリング',
        tips: [
          {
            title: '「感情を映像で語れ」——感情語禁止トレーニング',
            bad: '太郎は悲しかった。花子のことを思い、涙を流した。\n（「悲しい」という感情語に依存した描写）',
            good: '太郎、花子が置いていったコーヒーカップを手に取る。まだ温かい。\nゆっくりと——床に置く。\n（物と動作だけで喪失感を表現）',
            advice: '「悲しい・嬉しい・怒る・辛い」などの感情語を全て削除し、行動・物・空間だけで書き直す練習をせよ。書き直せるなら元の版は不要。'
          },
          {
            title: '「見えないもの」を「見えるもの」に変換せよ',
            bad: '二人の関係が冷え切っていることが伝わるシーン。\n（ト書きで関係性を説明している）',
            good: '食卓。二人は向かい合っているが、視線は交わらない。\n花子が塩を取ろうとして——太郎が先に渡す。ありがとうの代わりに、花子はスマホを見る。',
            advice: '「関係が悪い」「信頼している」などの説明は映像に不要。日常の小さな行動で関係性を見せよ。'
          }
        ]
      },"""
))

# ─────────────────────────────────────────────────────────────
# 19. ITEM_DB: Enhance dialogue dynamics tips
# ─────────────────────────────────────────────────────────────

patches.append((
    """      'dialogue-dynamics': {
        label: '対話のダイナミクス',
        tips: [
          {
            title: 'キャラに「対立する欲求」を持たせよ',
            bad: '二人の会話が情報交換だけに終わっている。\\n太郎「今日の会議は何時だっけ？」花子「3時だよ。」',
            good: '太郎「（報告書を突きつけ）これ、どういうことだ」\\n花子「（視線を逸らす）……知らない。」\\n太郎「嘘をつくな」',
            advice: '会話のたびに「誰が何を隠しているか」「誰が何を欲しがっているか」を設計すると緊張が生まれる。'
          }
        ]
      },""",
    """      'dialogue-dynamics': {
        label: '対話のダイナミクス',
        tips: [
          {
            title: 'キャラに「対立する欲求」を持たせよ',
            bad: '（情報交換だけの会話——緊張ゼロ）\n太郎「今日の会議は何時だっけ？」\n花子「3時だよ。準備できてる？」\n太郎「まあね。」',
            good: '（欲求の衝突——緊張が生まれる）\n太郎「（報告書を突きつけ）これ、どういうことだ」\n花子「（視線を逸らす）……知らない。」\n太郎「嘘をつくな」\n花子「（立ち上がる）知らないって言ってる！」',
            advice: '会話設計の問い: 「Aは何を得ようとしているか」「Bは何を隠そうとしているか」——これが答えられない会話は書き直す。'
          },
          {
            title: '「情報の非対称」で緊張を作れ',
            bad: '二人が同じ情報を持ち、普通に会話している。（緊張なし）',
            good: '花子は太郎が自分を騙していることを知っている。\n太郎はそれを知らない。\n花子「（笑顔で）最近どう？ちゃんと寝てる？」\n——この笑顔の裏に何があるか、観客だけが知っている。',
            advice: '「観客が知っていて、キャラが知らない」情報を作ると、何でもない会話が緊張に変わる（サスペンスの基本技法）。'
          }
        ]
      },"""
))

# ─────────────────────────────────────────────────────────────
# 20. Add naturalness tips expansion
# ─────────────────────────────────────────────────────────────

patches.append((
    """      'naturalness': {
        label: 'セリフの自然さ',
        tips: [
          {
            title: 'セリフは「70文字以内」に圧縮せよ',
            bad: '太郎「あのですね、実はその件についてはですね、以前から何度も話し合いを重ねてきたわけなんですが、なかなかうまくいかなくて困っているんです。」',
            good: '太郎「何度も話した。もういい。」',
            advice: '人は1回の発言で長々と話さない。セリフを70字以上書いたら半分に切ることを検討する。'
          }
        ]
      },""",
    """      'naturalness': {
        label: 'セリフの自然さ',
        tips: [
          {
            title: 'セリフは「70文字以内」に圧縮せよ',
            bad: '太郎「あのですね、実はその件についてはですね、以前から何度も話し合いを重ねてきたわけなんですが、なかなかうまくいかなくて困っているんです。」\n（140字超——読む気が失せる、舞台で使えない）',
            good: '太郎「何度も話した。」\n（間）\n太郎「もういい。」\n（沈黙が感情を補完する）',
            advice: '圧縮テスト: セリフの意味を保ちながら半分の文字数に縮める練習。縮めた後の方が強ければ元の版は冗長。'
          },
          {
            title: 'セリフを声に出して読め——引っかかった箇所を書き直せ',
            bad: '太郎「昨日の件でございますが、田中部長からの指示に従いまして、報告書を作成いたしましたので、ご確認いただければと思い伺った次第でございます。」\n（文語調・敬語過多——人間の口からは出ない）',
            good: '太郎「田中部長の指示で報告書を作りました。確認をお願いします。」\n（要点を自然な口調で）',
            advice: '脚本は声に出して読むと問題箇所が即座に分かる。滑舌が悪くなる・息継ぎが難しい台詞は即書き直し。'
          }
        ]
      },"""
))

# ─────────────────────────────────────────────────────────────
# 21. Add three-act tips expansion
# ─────────────────────────────────────────────────────────────

patches.append((
    """      'three-act': {
        label: '三幕構成の明確さ',
        tips: [
          {
            title: '発端事件を第1幕の終わりに配置せよ',
            bad: '（第1幕が日常の描写だけで終わる）\\n主人公の平和な日常が続く。特に何も起きない。',
            good: '（第1幕終わりに衝撃の発端事件）\\n主人公の日常が崩れる決定的な出来事。「もう戻れない」ポイント。',
            advice: '三幕構成チェックリスト: ①発端事件(～25%) ②中間転換点(50%) ③クライマックス(85%付近) が存在するか確認する。'
          }
        ]
      },""",
    """      'three-act': {
        label: '三幕構成の明確さ',
        tips: [
          {
            title: '発端事件を第1幕の終わりに配置せよ',
            bad: '（第1幕: 15ページが日常描写のみ）\n主人公の平和な日常が続く。特に何も起きない。\n→ 読者は15ページで飽きて読むのをやめる',
            good: '（第1幕: 10ページ以内に発端事件）\n冒頭5ページで主人公の「日常の欠落」を見せる。\n10ページ目: 世界が変わる出来事——「もう後には戻れない」ポイント。',
            advice: '三幕チェックリスト: ①発端事件(全体の20-25%) ②中間点の転換(50%) ③クライマックス(85%付近) の3点が存在するか確認。'
          },
          {
            title: '中間点（Midpoint）を設けよ——物語の重心',
            bad: '第1幕と第3幕の間が漠然と続き、主人公が動いているだけ。',
            good: '中間点: 主人公が「自分の本当の問題」に初めて気づく瞬間、または全てを失う（偽りの勝利の瞬間）を配置。\n例: 主人公がようやく目標を達成したと思った瞬間——実は自分が最大の敵だったと知る。',
            advice: '中間点がないと第2幕が"中だるみ"になる。中間点は物語の「折り返し地点」であり、主人公の方向転換を引き起こす必要がある。'
          }
        ]
      },"""
))

# ─────────────────────────────────────────────────────────────
# 22. ENGINE — char-arc notes: add before/after arc structure to note
# ─────────────────────────────────────────────────────────────

patches.append((
    """    const arcBadNote = { type: 'bad', text: 'キャラクターアーク：主人公の内的変化が見えません。「変化前の欠点/誤信 → 転機 → 変化後の覚醒」の三段構造を設計してください。変化を「台詞で言わせる」のではなく「行動の変化」で見せることが鍵です。' };""",
    """    const arcBadNote = { type: 'bad', text: 'キャラクターアーク：主人公の内的変化が見えません。設計テンプレート→「①変化前の誤信（例:一人でいい）→②転機（信頼した人が去る）→③変化後の行動（初めて助けを求める）」。変化は台詞宣言ではなく行動の変化で見せてください。' };"""
))

# ─────────────────────────────────────────────────────────────
# 23. ENGINE — improve direction note: add specific example
# ─────────────────────────────────────────────────────────────

patches.append((
    """    const dirNote = { type: 'warn', text: 'ト書き：' + longActionCount + '行が90字超（最大' + maxActionLen + '字）。ト書きは「見えるもの・聞こえるもの」だけを最短で記述します。' + (maxActionLen > 120 ? '1ト書きに複数の情報が入っています。' : '') + '目安: 1行ト書き=1カット。長ければ段落を分割してください。' };""",
    """    const dirNote = { type: 'warn', text: 'ト書き：' + longActionCount + '行が90字超（最大' + maxActionLen + '字）。ト書きの鉄則：①視覚情報のみ ②1行＝1カット ③形容詞・副詞・内面描写は禁止。「太郎は悲しそうに静かにゆっくりと部屋を横切り、窓辺に立って外を眺めた」→「太郎、窓辺に立つ。」に圧縮できます。' };"""
))

# ─────────────────────────────────────────────────────────────
# 24. Top: v8 version in report header is now v9
# ─────────────────────────────────────────────────────────────
# (already done above)

# ─────────────────────────────────────────────────────────────
# 25. TUTOR PANEL: Intro text improvement
# ─────────────────────────────────────────────────────────────

patches.append((
    """          <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;line-height:1.7;padding:8px 12px;background:var(--bg-subtle);border-radius:8px">
            <i class="fas fa-circle-info" style="margin-right:4px;color:var(--fuji)"></i>
            採点結果の最優先課題に基づき、具体的な書き直し例を提示します。「改善前」パターンを自身の脚本で探し、「改善後」の方向性を参考に次稿を執筆してください。
          </div>""",
    """          <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;line-height:1.7;padding:9px 12px;background:var(--bg-subtle);border-radius:8px;border-left:3px solid var(--fuji)">
            <i class="fas fa-circle-info" style="margin-right:4px;color:var(--fuji)"></i>
            最低スコア項目を自動選択し、<strong style="color:var(--text-primary)">脚本中の実際の問題パターン（Before）</strong>と<strong style="color:var(--text-primary)">プロ水準の書き直し例（After）</strong>を提示します。まず1項目だけ集中して改稿し、再採点してください。
          </div>""",
))

# ─────────────────────────────────────────────────────────────
# 26. Fix the broken emoji that appeared in a previous patch
# ─────────────────────────────────────────────────────────────

# Fix garbled text: コツ：1回の改稿で全ての弱点を直そうとし��い -> しない
patches.append((
    'コツ：1回の改稿で全ての弱点を直そうとし\ufffdい。最優先1項目だけに集中して書き直すと、劇的にスコアが上がります。',
    'コツ：1回の改稿で全ての弱点を直そうとしない。最優先1項目だけに集中して書き直すと、劇的にスコアが上がります。'
))
# Also try alternate encoding
patches.append((
    'コツ：1回の改稿で全ての弱点を直そうとし\ufffdい',
    'コツ：1回の改稿で全ての弱点を直そうとしない'
))

# ─────────────────────────────────────────────────────────────
# 27. RUBRIC CATEGORY HEADER — improve visual hierarchy
# ─────────────────────────────────────────────────────────────

patches.append((
    """    <div style="margin-bottom:14px;border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.04)">
      <div style="padding:10px 14px;background:${cat.color}10;border-bottom:1px solid ${cat.color}25;display:flex;align-items:center;gap:8px">
        <div style="width:30px;height:30px;border-radius:8px;background:${cat.color}20;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="fas ${cat.icon}" style="color:${cat.color};font-size:12px"></i>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:13px;color:var(--text-primary)">${cat.label}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:1px">${catScoredCount}/${cat.items.length}項目採点済み</div>
        </div>""",
    """    <div style="margin-bottom:14px;border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.05);transition:box-shadow .2s">
      <div style="padding:10px 14px;background:linear-gradient(90deg,${cat.color}12,${cat.color}05);border-bottom:1px solid ${cat.color}22;display:flex;align-items:center;gap:8px">
        <div style="width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,${cat.color}28,${cat.color}10);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid ${cat.color}20">
          <i class="fas ${cat.icon}" style="color:${cat.color};font-size:13px"></i>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:13px;color:var(--text-primary);letter-spacing:.01em">${cat.label}</div>
          <div style="font-size:9.5px;color:var(--text-muted);margin-top:1px"><i class="fas fa-check-circle" style="font-size:8px;margin-right:2px;color:${catScoredCount>0?cat.color:'var(--border)'}"></i>${catScoredCount}/${cat.items.length}項目採点済み</div>
        </div>"""
))

# ─────────────────────────────────────────────────────────────
# Apply all patches
# ─────────────────────────────────────────────────────────────

applied = 0
skipped = 0
for old, new in patches:
    if old in code:
        code = code.replace(old, new, 1)
        applied += 1
    else:
        print(f'[SKIP] Not found: {repr(old[:80])}')
        skipped += 1

with open(SRC, 'w', encoding='utf-8') as f:
    f.write(code)

new_len = len(code)
print(f'\nPatch v8 complete:')
print(f'  Original: {orig_len:,} chars')
print(f'  New:      {new_len:,} chars')
print(f'  Delta:    +{new_len - orig_len:,} chars')
print(f'  Applied:  {applied} patches')
print(f'  Skipped:  {skipped} patches')
