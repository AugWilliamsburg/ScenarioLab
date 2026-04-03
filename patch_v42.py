#!/usr/bin/env python3
"""
職員室 v4.2 - 完全パッチスクリプト（書き込みあり）
"""

with open('/home/user/webapp/public/static/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)
print(f"Original: {original_len} chars")
errors = []

def patch(label, old, new):
    global content
    if old in content:
        content = content.replace(old, new, 1)
        print(f"OK [{label}]")
    else:
        errors.append(label)
        print(f"MISS [{label}]")

# ══════════════════════════════════════════════════════════════════
# P1: 診断ノートバッジ（絵文字→ドット）
# ══════════════════════════════════════════════════════════════════
patch("P1-badges",
'''            <span style="font-size:10px;color:var(--matcha);margin-left:4px">${(autoResult.detailNotes||[]).filter(n=>n.type==='good').length}✅</span>
            <span style="font-size:10px;color:var(--momo)">${(autoResult.detailNotes||[]).filter(n=>n.type==='bad').length}❌</span>
            <span style="font-size:10px;color:var(--kogane)">${(autoResult.detailNotes||[]).filter(n=>n.type==='warn').length}⚠</span>''',
'''            <span style="font-size:10px;color:var(--matcha);margin-left:4px;display:flex;align-items:center;gap:3px"><span style="width:6px;height:6px;border-radius:50%;background:var(--matcha);flex-shrink:0;display:inline-block"></span>${(autoResult.detailNotes||[]).filter(n=>n.type==='good').length} 良好</span>
            <span style="font-size:10px;color:var(--momo);display:flex;align-items:center;gap:3px"><span style="width:6px;height:6px;border-radius:50%;background:var(--momo);flex-shrink:0;display:inline-block"></span>${(autoResult.detailNotes||[]).filter(n=>n.type==='bad').length} 要修正</span>
            <span style="font-size:10px;color:var(--kogane);display:flex;align-items:center;gap:3px"><span style="width:6px;height:6px;border-radius:50%;background:var(--kogane);flex-shrink:0;display:inline-block"></span>${(autoResult.detailNotes||[]).filter(n=>n.type==='warn').length} 注意</span>''')

# ══════════════════════════════════════════════════════════════════
# P2: 診断ノートカード（絵文字アイコン → アイコンバッジ + 引用ブロック）
# ══════════════════════════════════════════════════════════════════
patch("P2-note-cards",
r"""              ${(autoResult.detailNotes||[]).map(n=>`
              <div style="display:flex;gap:10px;padding:10px 12px;background:${n.type==='good'?'var(--matcha-bg)':n.type==='warn'?'var(--kogane-bg)':'var(--momo-bg)'};border:1px solid ${n.type==='good'?'var(--matcha-border)':n.type==='warn'?'var(--kogane-border)':'var(--momo-border)'};border-radius:8px">
                <div style="font-size:13px;flex-shrink:0;margin-top:1px">${n.type==='good'?'✅':n.type==='warn'?'⚠️':'❌'}</div>
                <div style="font-size:11.5px;line-height:1.75;color:var(--text-primary)">${esc(n.text)}</div>
              </div>`).join('')}""",
r"""              ${(autoResult.detailNotes||[]).map(n=>`
              <div style="border:1px solid ${n.type==='good'?'var(--matcha-border)':n.type==='warn'?'var(--kogane-border)':'var(--momo-border)'};border-radius:8px;overflow:hidden;border-left:3px solid ${n.type==='good'?'var(--matcha)':n.type==='warn'?'var(--kogane)':'var(--momo)'}">
                <div style="padding:9px 12px;background:${n.type==='good'?'var(--matcha-bg)':n.type==='warn'?'var(--kogane-bg)':'var(--momo-bg)'};display:flex;gap:8px;align-items:flex-start">
                  <span style="flex-shrink:0;margin-top:2px;width:16px;height:16px;border-radius:50%;background:${n.type==='good'?'var(--matcha)':n.type==='warn'?'var(--kogane)':'var(--momo)'};display:inline-flex;align-items:center;justify-content:center;min-width:16px">
                    <i class="fas ${n.type==='good'?'fa-check':n.type==='warn'?'fa-exclamation':'fa-times'}" style="font-size:8px;color:#fff"></i>
                  </span>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:11.5px;line-height:1.75;color:var(--text-primary)">${esc(n.text)}</div>
                    ${n.quote ? '<div style="margin-top:7px;padding:7px 11px;background:rgba(0,0,0,.04);border-radius:5px;border-left:2px solid ' + (n.type==='good'?'var(--matcha)':n.type==='warn'?'var(--kogane)':'var(--momo)') + ';font-family:\\'Noto Serif JP\\',serif;font-size:11px;color:var(--text-secondary);line-height:1.8;white-space:pre-wrap;word-break:break-all">' + esc(n.quote) + '</div>' : ''}
                  </div>
                </div>
              </div>`).join('')}""")

# ══════════════════════════════════════════════════════════════════
# P3: ルーブリック reasons/issues 表示（アイコン改善 + 引用対応）
# ══════════════════════════════════════════════════════════════════
patch("P3-rubric-reasons",
"""            ${(autoReasons.length > 0 || autoIssues.length > 0) ? `
            <div style="display:flex;flex-direction:column;gap:3px">
              ${autoReasons.map(r => `<div style="display:flex;align-items:flex-start;gap:5px;font-size:10.5px;color:var(--matcha);line-height:1.5"><span style="flex-shrink:0;font-weight:700;margin-top:1px">✓</span><span>${esc(r)}</span></div>`).join('')}
              ${autoIssues.map(i2 => `<div style="display:flex;align-items:flex-start;gap:5px;font-size:10.5px;color:var(--momo);line-height:1.5"><span style="flex-shrink:0;font-weight:700;margin-top:1px">⚠</span><span>${esc(i2)}</span></div>`).join('')}
            </div>` : ''}""",
"""            ${(autoReasons.length > 0 || autoIssues.length > 0) ? `
            <div style="display:flex;flex-direction:column;gap:3px;margin-top:5px">
              ${autoReasons.map(r => `<div style="display:flex;align-items:flex-start;gap:6px;font-size:10.5px;line-height:1.55"><span style="flex-shrink:0;margin-top:2px;width:14px;height:14px;border-radius:50%;background:var(--matcha);display:inline-flex;align-items:center;justify-content:center;min-width:14px"><i class="fas fa-check" style="font-size:7px;color:#fff"></i></span><span style="color:var(--text-secondary)">${esc(r)}</span></div>`).join('')}
              ${autoIssues.map(i2 => `<div style="display:flex;align-items:flex-start;gap:6px;font-size:10.5px;line-height:1.55"><span style="flex-shrink:0;margin-top:2px;width:14px;height:14px;border-radius:50%;background:var(--momo);display:inline-flex;align-items:center;justify-content:center;min-width:14px"><i class="fas fa-exclamation" style="font-size:7px;color:#fff"></i></span><span style="color:var(--momo)">${esc(i2)}</span></div>`).join('')}
            </div>` : ''}""")

# ══════════════════════════════════════════════════════════════════
# P4: itemDetail の quote フィールド抽出
# ══════════════════════════════════════════════════════════════════
patch("P4-itemdetail-quote",
"""          const itemDetail = autoItemDetails[item.id] || {};
          const hasAutoScore = scores[item.id] !== undefined;
          const autoReasons = itemDetail.reasons || [];
          const autoIssues = itemDetail.issues || [];""",
"""          const itemDetail = autoItemDetails[item.id] || {};
          const hasAutoScore = scores[item.id] !== undefined;
          const autoReasons = itemDetail.reasons || [];
          const autoIssues = itemDetail.issues || [];
          const autoQuote = itemDetail.quote || null;""")

# P4b: autoQuote 引用ブロックを hasDiff より前に挿入
patch("P4b-quote-block",
"""            ${hasDiff ? `
            <div style="margin-top:5px;font-size:10px;color:${diffAmt>0?'#15803d':'#b91c1c'};font-weight:600">""",
"""            ${autoQuote ? `
            <div style="margin-top:6px;padding:6px 10px;background:rgba(0,0,0,.03);border-radius:5px;border-left:2px solid var(--border);font-family:'Noto Serif JP',serif;font-size:10.5px;color:var(--text-secondary);line-height:1.75;word-break:break-all">${esc(autoQuote)}</div>` : ''}
            ${hasDiff ? `
            <div style="margin-top:5px;font-size:10px;color:${diffAmt>0?'#15803d':'#b91c1c'};font-weight:600">""")

# ══════════════════════════════════════════════════════════════════
# P5: ヘルパー関数 + itemDetails への quote 追加（採点エンジン内）
# ══════════════════════════════════════════════════════════════════
patch("P5-helpers",
"function staffRoomGenerateTutoringExamples(session) {",
"""// ── 診断ノートテキスト整形ヘルパー ─────────────────────────────────
function staffRoomFormatNoteText(text) {
  return text.replace(/^[✅❌⚠️📝🎬🎭💡🔍🔧]+\s*/u, '');
}

""" + "function staffRoomGenerateTutoringExamples(session) {")

# ══════════════════════════════════════════════════════════════════
# P6: subtext itemDetails に quote 追加
# ══════════════════════════════════════════════════════════════════
patch("P6-subtext-quote",
"    itemDetails['subtext'] = { reasons, issues };",
"""    const subtextQuoteEx = (() => {
      const pats = ['なんですよ', 'ということは', 'つまり', '実は私', '要するに', '説明しておくと'];
      for (const d of dialogueTexts) {
        if (pats.some(p => d.includes(p))) return '「' + (d.length > 70 ? d.slice(0, 70) + '…' : d) + '」';
      }
      return null;
    })();
    itemDetails['subtext'] = { reasons, issues, quote: subtextQuoteEx };""")

# P6b: direction-clarity itemDetails に quote 追加
patch("P6b-direction-quote",
"    itemDetails['direction-clarity'] = { reasons, issues };",
"""    const dirQuoteEx = (() => {
      const long = actionLines.filter(l => l.length > 90);
      if (!long.length) return null;
      const s = long.sort((a,b) => b.length-a.length)[0];
      return s.length > 100 ? s.slice(0, 100) + '…' : s;
    })();
    itemDetails['direction-clarity'] = { reasons, issues, quote: dirQuoteEx };""")

# P6c: naturalness itemDetails に quote 追加
patch("P6c-naturalness-quote",
"    itemDetails['naturalness'] = { reasons, issues };",
"""    const naturalnessQuoteEx = (() => {
      const long = dialogueTexts.filter(d => d.length > 55);
      if (!long.length) return null;
      const s = long.sort((a,b) => b.length-a.length)[0];
      return '「' + (s.length > 80 ? s.slice(0, 80) + '…' : s) + '」';
    })();
    itemDetails['naturalness'] = { reasons, issues, quote: naturalnessQuoteEx };""")

# ══════════════════════════════════════════════════════════════════
# P7: チュータリングカード リデザイン
# ══════════════════════════════════════════════════════════════════
patch("P7-tutoring-card",
r"""    return `<div style="border:1px solid ${scoreColor}33;border-radius:10px;overflow:hidden;border-left:3px solid ${scoreColor}">
      <div style="padding:10px 14px;background:${scoreColor}08;display:flex;align-items:center;gap:8px">
        <span style="font-size:11px;background:${scoreColor};color:#fff;padding:1px 7px;border-radius:10px;font-weight:700;flex-shrink:0">${urgency}</span>
        <span style="font-size:12.5px;font-weight:700;color:var(--text-primary)">${esc(db.label)}</span>
        <span style="font-size:10px;color:${scoreColor};font-weight:700;margin-left:auto">${score}/5</span>
      </div>
      ${issues.length > 0 ? `
      <div style="padding:8px 14px;background:${scoreColor}06;border-bottom:1px dashed ${scoreColor}22">
        ${issues.map(i2 => `<div style="font-size:10.5px;color:var(--momo);display:flex;gap:5px;margin-bottom:2px"><span>⚠</span><span>${esc(i2)}</span></div>`).join('')}
      </div>` : ''}
      <div style="padding:12px 14px">
        <div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:8px;display:flex;align-items:center;gap:5px">
          <i class="fas fa-pen-ruler" style="color:var(--fuji);font-size:10px"></i>
          ${esc(tip.title)}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:7px;padding:9px 11px">
            <div style="font-size:9.5px;font-weight:700;color:#b91c1c;margin-bottom:5px;display:flex;align-items:center;gap:3px"><i class="fas fa-times-circle" style="font-size:9px"></i> 改善前（典型的パターン）</div>
            <pre style="font-size:10.5px;color:#7f1d1d;line-height:1.7;white-space:pre-wrap;margin:0;font-family:'Noto Serif JP',serif">${esc(tip.bad)}</pre>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:7px;padding:9px 11px">
            <div style="font-size:9.5px;font-weight:700;color:#15803d;margin-bottom:5px;display:flex;align-items:center;gap:3px"><i class="fas fa-check-circle" style="font-size:9px"></i> 改善後（推奨例）</div>
            <pre style="font-size:10.5px;color:#14532d;line-height:1.7;white-space:pre-wrap;margin:0;font-family:'Noto Serif JP',serif">${esc(tip.good)}</pre>
          </div>
        </div>
        <div style="background:var(--fuji-bg,#f5f0ff);border:1px solid var(--fuji-border,#e0d0ff);border-radius:7px;padding:8px 11px">
          <div style="font-size:10px;color:var(--fuji);font-weight:700;margin-bottom:3px"><i class="fas fa-lightbulb" style="margin-right:3px"></i>ポイント</div>
          <div style="font-size:10.5px;color:var(--text-primary);line-height:1.7">${esc(tip.tip)}</div>
        </div>
      </div>
    </div>`;""",
r"""    const scriptQuote = itemDetails[itemId] ? itemDetails[itemId].quote : null;
    return `<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;border-left:3px solid ${scoreColor};box-shadow:0 1px 4px rgba(0,0,0,.05)">
      <div style="padding:9px 13px;background:${scoreColor}08;display:flex;align-items:center;gap:8px;border-bottom:1px solid ${scoreColor}18">
        <span style="font-size:10px;background:${scoreColor};color:#fff;padding:1px 7px;border-radius:6px;font-weight:700;flex-shrink:0;letter-spacing:.04em">${urgency}</span>
        <span style="font-size:12.5px;font-weight:700;color:var(--text-primary)">${esc(db.label)}</span>
        <span style="font-size:11px;color:${scoreColor};font-weight:800;margin-left:auto">${score}<span style="font-size:9px;opacity:.6">/5</span></span>
      </div>
      ${(issues.length > 0 || scriptQuote) ? `
      <div style="padding:9px 13px;background:var(--bg-subtle);border-bottom:1px solid var(--border-light,#f0f0f0)">
        ${issues.map(i2 => `<div style="font-size:10.5px;color:var(--momo);display:flex;gap:6px;margin-bottom:3px;align-items:flex-start"><span style="flex-shrink:0;margin-top:2px;width:13px;height:13px;border-radius:50%;background:var(--momo);display:inline-flex;align-items:center;justify-content:center;min-width:13px"><i class="fas fa-exclamation" style="font-size:7px;color:#fff"></i></span><span>${esc(i2)}</span></div>`).join('')}
        ${scriptQuote ? `<div style="margin-top:${issues.length>0?'6px':'0'};padding:6px 10px;background:var(--momo-bg,#fff5f5);border:1px solid var(--momo-border,#fecaca);border-radius:5px;font-family:'Noto Serif JP',serif;font-size:11px;color:#7f1d1d;line-height:1.75;word-break:break-all"><span style="font-size:9.5px;font-weight:700;color:var(--momo);display:block;margin-bottom:3px">採点対象の脚本から：</span>${esc(scriptQuote)}</div>` : ''}
      </div>` : ''}
      <div style="padding:12px 13px">
        <div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:9px;display:flex;align-items:center;gap:5px">
          <i class="fas fa-pen-nib" style="color:var(--fuji);font-size:10px"></i>
          改稿テクニック：${esc(tip.title)}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:9px">
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:7px;padding:8px 10px">
            <div style="font-size:9px;font-weight:700;color:#b91c1c;margin-bottom:5px;display:flex;align-items:center;gap:3px;letter-spacing:.04em">
              <span style="width:8px;height:8px;border-radius:50%;background:#b91c1c;flex-shrink:0;display:inline-block"></span> Before（問題のあるパターン）
            </div>
            <pre style="font-size:10.5px;color:#7f1d1d;line-height:1.75;white-space:pre-wrap;margin:0;font-family:'Noto Serif JP',serif">${esc(tip.bad)}</pre>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:7px;padding:8px 10px">
            <div style="font-size:9px;font-weight:700;color:#15803d;margin-bottom:5px;display:flex;align-items:center;gap:3px;letter-spacing:.04em">
              <span style="width:8px;height:8px;border-radius:50%;background:#15803d;flex-shrink:0;display:inline-block"></span> After（推奨する書き方）
            </div>
            <pre style="font-size:10.5px;color:#14532d;line-height:1.75;white-space:pre-wrap;margin:0;font-family:'Noto Serif JP',serif">${esc(tip.good)}</pre>
          </div>
        </div>
        <div style="background:var(--fuji-bg,#f5f0ff);border:1px solid var(--fuji-border,#e0d0ff);border-radius:7px;padding:8px 11px;display:flex;gap:8px;align-items:flex-start">
          <i class="fas fa-lightbulb" style="color:var(--fuji);font-size:11px;margin-top:2px;flex-shrink:0"></i>
          <div style="font-size:10.5px;color:var(--text-primary);line-height:1.75">${esc(tip.tip)}</div>
        </div>
      </div>
    </div>`;""")

# Write back
with open('/home/user/webapp/public/static/app.js', 'w', encoding='utf-8') as f:
    f.write(content)

new_len = len(content)
print(f"\nWritten: {new_len} chars (delta: +{new_len - original_len})")
if errors:
    print(f"\nFailed patches: {errors}")
else:
    print("\nAll patches applied successfully!")
