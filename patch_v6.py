#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
職員室 v6 パッチスクリプト
- UI/UX全面改訂: 診断ノートカード改善・タブデザイン刷新・スコアバナー強化
- 引用システム強化: 脚本引用ブロック改善・コンパクト化
- 採点エンジン深化: 判定ロジック精緻化・診断コメント引用付加・優先3点アクション強化
- 改善提案パネル強化: Before/After例の文字スタイル刷新・改善前引用との連携
"""

import sys
import re

filepath = 'public/static/app.js'

with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

original_size = len(code)
applied = []
skipped = []

def patch(name, old, new):
    global code
    if old in code:
        code = code.replace(old, new, 1)
        applied.append(name)
    else:
        skipped.append(name)

# ============================================================
# P1: 採点レポートバナーをv6に更新・サマリー表示強化
# ============================================================
patch('P1-banner-v6',
'<span style="font-size:11px;letter-spacing:.12em;color:rgba(255,255,255,.45);font-weight:600;text-transform:uppercase">SCENARIO LAB ─ 審査員採点レポート v5</span>',
'<span style="font-size:11px;letter-spacing:.12em;color:rgba(255,255,255,.45);font-weight:600;text-transform:uppercase">SCENARIO LAB ─ 審査員採点レポート v6</span>'
)

# ============================================================
# P2: 診断ノートパネルヘッダー改善（より情報量を増やす）
# ============================================================
patch('P2-diag-header',
'<i class="fas fa-microscope" style="color:var(--fuji);font-size:12px"></i>\n            <span style="font-size:12px;font-weight:700;color:var(--text-primary)">審査員診断ノート</span>',
'<i class="fas fa-microscope" style="color:var(--fuji);font-size:12px"></i>\n            <span style="font-size:12px;font-weight:700;color:var(--text-primary)">審査員診断ノート</span>\n            <span style="font-size:9px;color:var(--fuji);background:var(--fuji-bg,#f0eeff);border:1px solid var(--fuji-border,#e0d0ff);border-radius:8px;padding:1px 6px;font-weight:600">脚本引用つき</span>'
)

# ============================================================
# P3: 診断ノートカードの引用ブロックをより視覚的に改善
# 現行: 単色引用ブロック → 改善: ラベル+アイコン付き洗練されたブロック
# ============================================================
patch('P3-note-quote-block',
"""${n.quote ? `<div style="margin-top:8px;padding:7px 11px 7px 10px;background:rgba(0,0,0,.035);border-radius:6px;border-left:2px solid ${n.type==='good'?'var(--matcha)':n.type==='warn'?'var(--kogane)':'var(--momo)'};font-size:10.5px;color:var(--text-secondary);line-height:1.85;white-space:pre-wrap;word-break:break-all;font-family:'Noto Serif JP',serif"><span style="font-size:9px;font-weight:700;color:${n.type==='good'?'var(--matcha)':n.type==='warn'?'var(--kogane)':'var(--momo)'};display:block;margin-bottom:3px;letter-spacing:.04em">${n.type==='good'?'引用（好例）':n.type==='warn'?'引用（注意箇所）':'引用（問題箇所）'}</span>${esc(n.quote)}</div>` : ''}""",
"""${n.quote ? `<div style="margin-top:9px;border-radius:7px;overflow:hidden;border:1px solid ${n.type==='good'?'rgba(34,197,94,.25)':n.type==='warn'?'rgba(234,179,8,.25)':'rgba(239,68,68,.25)'}">
                      <div style="padding:4px 10px;background:${n.type==='good'?'rgba(34,197,94,.08)':n.type==='warn'?'rgba(234,179,8,.08)':'rgba(239,68,68,.08)'};display:flex;align-items:center;gap:5px;border-bottom:1px solid ${n.type==='good'?'rgba(34,197,94,.15)':n.type==='warn'?'rgba(234,179,8,.15)':'rgba(239,68,68,.15)'}">
                        <i class="fas ${n.type==='good'?'fa-quote-left':'fa-highlighter'}" style="font-size:8px;color:${n.type==='good'?'var(--matcha)':n.type==='warn'?'var(--kogane)':'var(--momo)'}"></i>
                        <span style="font-size:8.5px;font-weight:700;color:${n.type==='good'?'var(--matcha)':n.type==='warn'?'var(--kogane)':'var(--momo)'};letter-spacing:.04em">${n.type==='good'?'脚本より（好例）':n.type==='warn'?'脚本より（注意箇所）':'脚本より（問題箇所）'}</span>
                      </div>
                      <div style="padding:7px 11px;background:rgba(0,0,0,.018);font-size:10.5px;color:var(--text-secondary);line-height:1.9;white-space:pre-wrap;word-break:break-all;font-family:'Noto Serif JP',serif">${esc(n.quote)}</div>
                    </div>` : ''}"""
)

# ============================================================
# P4: 強み・改善点タブのデザイン刷新（ラベル改善+アイコン変更）
# ============================================================
patch('P4-tab-design',
"""<button id="sr-fb-tab-str-${s.id}" onclick="staffRoomFbTab('${s.id}','strengths')" style="flex:1;padding:9px 6px;font-size:11px;font-weight:700;border:none;cursor:pointer;border-bottom:2px solid var(--matcha);background:var(--bg-white);color:var(--matcha)"><i class="fas fa-circle-check" style="margin-right:4px;font-size:10px"></i>強み</button>
            <button id="sr-fb-tab-wk-${s.id}" onclick="staffRoomFbTab('${s.id}','weaknesses')" style="flex:1;padding:9px 6px;font-size:11px;font-weight:700;border:none;cursor:pointer;border-bottom:2px solid transparent;background:transparent;color:var(--text-muted)"><i class="fas fa-circle-xmark" style="margin-right:4px;font-size:10px"></i>改善点</button>
            <button id="sr-fb-tab-sg-${s.id}" onclick="staffRoomFbTab('${s.id}','suggestions')" style="flex:1;padding:9px 6px;font-size:11px;font-weight:700;border:none;cursor:pointer;border-bottom:2px solid transparent;background:transparent;color:var(--text-muted)"><i class="fas fa-pen-nib" style="margin-right:4px;font-size:10px"></i>改稿提案</button>
            <button id="sr-fb-tab-pr-${s.id}" onclick="staffRoomFbTab('${s.id}','priority')" style="flex:1;padding:9px 6px;font-size:11px;font-weight:700;border:none;cursor:pointer;border-bottom:2px solid transparent;background:transparent;color:var(--text-muted)"><i class="fas fa-triangle-exclamation" style="margin-right:4px;font-size:10px"></i>最優先</button>""",
"""<button id="sr-fb-tab-str-${s.id}" onclick="staffRoomFbTab('${s.id}','strengths')" style="flex:1;padding:9px 4px;font-size:10.5px;font-weight:700;border:none;cursor:pointer;border-bottom:2px solid var(--matcha);background:var(--bg-white);color:var(--matcha);display:flex;align-items:center;justify-content:center;gap:4px"><i class="fas fa-circle-check" style="font-size:9px"></i>強み</button>
            <button id="sr-fb-tab-wk-${s.id}" onclick="staffRoomFbTab('${s.id}','weaknesses')" style="flex:1;padding:9px 4px;font-size:10.5px;font-weight:700;border:none;cursor:pointer;border-bottom:2px solid transparent;background:transparent;color:var(--text-muted);display:flex;align-items:center;justify-content:center;gap:4px"><i class="fas fa-circle-xmark" style="font-size:9px"></i>弱点</button>
            <button id="sr-fb-tab-sg-${s.id}" onclick="staffRoomFbTab('${s.id}','suggestions')" style="flex:1;padding:9px 4px;font-size:10.5px;font-weight:700;border:none;cursor:pointer;border-bottom:2px solid transparent;background:transparent;color:var(--text-muted);display:flex;align-items:center;justify-content:center;gap:4px"><i class="fas fa-pencil" style="font-size:9px"></i>改稿案</button>
            <button id="sr-fb-tab-pr-${s.id}" onclick="staffRoomFbTab('${s.id}','priority')" style="flex:1;padding:9px 4px;font-size:10.5px;font-weight:700;border:none;cursor:pointer;border-bottom:2px solid transparent;background:transparent;color:var(--text-muted);display:flex;align-items:center;justify-content:center;gap:4px"><i class="fas fa-flag" style="font-size:9px"></i>最優先</button>"""
)

# ============================================================
# P5: 強みタブ内の表示をよりリッチに（スコア表示・理由表示）
# ============================================================
patch('P5-strengths-render',
"""${(autoResult.strengths||'').split('\\n').filter(l=>l.trim()).map(line => {
              const isItem = line.startsWith('・');
              if (!isItem) return `<div style="font-size:11.5px;line-height:1.9;color:var(--text-primary)">${esc(line)}</div>`;
              return `<div style="display:flex;gap:7px;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--border-light,#f0f0f0)">
                <span style="flex-shrink:0;margin-top:3px;width:14px;height:14px;border-radius:50%;background:var(--matcha);display:inline-flex;align-items:center;justify-content:center;min-width:14px"><i class="fas fa-check" style="font-size:7px;color:#fff"></i></span>
                <span style="font-size:11.5px;line-height:1.75;color:var(--text-primary)">${esc(line.slice(1).trim())}</span>
              </div>`;
            }).join('') || `<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:16px">自動採点後に生成されます</div>`}""",
"""${(autoResult.strengths||'').split('\\n').filter(l=>l.trim()).map((line, lineIdx) => {
              const isItem = line.startsWith('・');
              if (!isItem) return `<div style="font-size:11px;line-height:1.9;color:var(--text-secondary);padding:2px 0">${esc(line)}</div>`;
              // 強みアイテムカード
              const content = line.slice(1).trim();
              const scoreMatch = content.match(/【(.+?)】.*?（(\\d+)\\/5/);
              const scoreVal = scoreMatch ? parseInt(scoreMatch[2]) : null;
              const scoreColor2 = scoreVal >= 5 ? '#7c3aed' : scoreVal >= 4 ? 'var(--matcha)' : 'var(--kogane)';
              return `<div style="display:flex;gap:8px;align-items:flex-start;padding:7px 10px;margin-bottom:4px;background:var(--matcha-bg,#f0fdf4);border:1px solid var(--matcha-border,#bbf7d0);border-radius:8px;border-left:3px solid var(--matcha)">
                <span style="flex-shrink:0;margin-top:2px;width:16px;height:16px;border-radius:50%;background:var(--matcha);display:inline-flex;align-items:center;justify-content:center;min-width:16px;box-shadow:0 1px 4px rgba(34,197,94,.3)"><i class="fas fa-check" style="font-size:7px;color:#fff"></i></span>
                <div style="flex:1;min-width:0">
                  <div style="font-size:11.5px;line-height:1.7;color:var(--text-primary);font-weight:500">${esc(content)}</div>
                </div>
                ${scoreVal !== null ? `<span style="flex-shrink:0;font-size:12px;font-weight:800;color:${scoreColor2};line-height:1">${scoreVal}<span style="font-size:8px;opacity:.6">/5</span></span>` : ''}
              </div>`;
            }).join('') || `<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:16px">自動採点後に生成されます</div>`}"""
)

# ============================================================
# P6: 弱点タブ内の表示をよりリッチに（引用付き）
# ============================================================
patch('P6-weaknesses-render',
"""${(autoResult.weaknesses||'').split('\\n').filter(l=>l.trim()).map(line => {
              const isItem = line.startsWith('・');
              if (!isItem) return `<div style="font-size:11.5px;line-height:1.9;color:var(--text-primary)">${esc(line)}</div>`;
              return `<div style="display:flex;gap:7px;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--border-light,#f0f0f0)">
                <span style="flex-shrink:0;margin-top:3px;width:14px;height:14px;border-radius:50%;background:var(--momo);display:inline-flex;align-items:center;justify-content:center;min-width:14px"><i class="fas fa-exclamation" style="font-size:7px;color:#fff"></i></span>
                <span style="font-size:11.5px;line-height:1.75;color:var(--text-primary)">${esc(line.slice(1).trim())}</span>
              </div>`;
            }).join('') || `<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:16px">自動採点後に生成されます</div>`}""",
"""${(autoResult.weaknesses||'').split('\\n').filter(l=>l.trim()).map((line, lineIdx) => {
              const isItem = line.startsWith('・');
              if (!isItem) return `<div style="font-size:11px;line-height:1.9;color:var(--text-secondary);padding:2px 0">${esc(line)}</div>`;
              const content = line.slice(1).trim();
              const itemMatch = content.match(/【(.+?)】.*?（(\\d+)\\/5/);
              const itemLabel = itemMatch ? itemMatch[1] : null;
              const scoreVal = itemMatch ? parseInt(itemMatch[2]) : null;
              const isCritical = scoreVal !== null && scoreVal <= 1;
              return `<div style="display:flex;gap:8px;align-items:flex-start;padding:7px 10px;margin-bottom:4px;background:${isCritical ? 'rgba(239,68,68,.06)' : 'rgba(239,68,68,.03)'};border:1px solid ${isCritical ? 'rgba(239,68,68,.3)' : 'rgba(239,68,68,.15)'};border-radius:8px;border-left:3px solid var(--momo)">
                <span style="flex-shrink:0;margin-top:2px;width:16px;height:16px;border-radius:50%;background:${isCritical ? '#dc2626' : 'var(--momo)'};display:inline-flex;align-items:center;justify-content:center;min-width:16px;box-shadow:0 1px 4px rgba(239,68,68,.25)"><i class="fas fa-exclamation" style="font-size:7px;color:#fff"></i></span>
                <div style="flex:1;min-width:0">
                  <div style="font-size:11.5px;line-height:1.7;color:var(--text-primary);font-weight:500">${esc(content)}</div>
                  ${isCritical ? '<div style="font-size:9.5px;color:#b91c1c;margin-top:3px;font-weight:600"><i class="fas fa-exclamation-circle" style="margin-right:3px"></i>最優先改善項目</div>' : ''}
                </div>
                ${scoreVal !== null ? `<span style="flex-shrink:0;font-size:12px;font-weight:800;color:${isCritical ? '#dc2626' : 'var(--momo)'};line-height:1">${scoreVal}<span style="font-size:8px;opacity:.6">/5</span></span>` : ''}
              </div>`;
            }).join('') || `<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:16px">自動採点後に生成されます</div>`}"""
)

# ============================================================
# P7: 最優先タブの表示強化（より詳細な改稿指針付き）
# ============================================================
patch('P7-priority-render',
"""<div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">次稿で最初に取り組むべき課題：</div>
            ${(autoResult.priority||'').split('\\n').filter(l=>l.trim()).map((line, i) => {
              const numMatch = line.match(/^(\\d+)\\.\\s*(.+)/);
              if (numMatch) return `<div style="display:flex;gap:9px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border-light,#f0f0f0)">
                <span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:var(--fuji);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;min-width:20px">${numMatch[1]}</span>
                <span style="font-size:12px;line-height:1.75;color:var(--text-primary);font-weight:600">${esc(numMatch[2])}</span>
              </div>`;
              return `<div style="font-size:11.5px;line-height:1.75;color:var(--text-primary);padding:4px 0">${esc(line)}</div>`;
            }).join('') || `<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:16px">自動採点後に生成されます</div>`}""",
"""<div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;display:flex;align-items:center;gap:5px">
              <i class="fas fa-bullseye" style="color:var(--fuji);font-size:10px"></i>
              次稿で最初に取り組むべき課題（優先順位順）：
            </div>
            ${(autoResult.priority||'').split('\\n').filter(l=>l.trim()).map((line, i) => {
              const numMatch = line.match(/^(\\d+)\\.\\s*(.+)/);
              if (numMatch) {
                const rank = parseInt(numMatch[1]);
                const rankBg = rank === 1 ? 'linear-gradient(135deg,#ef4444,#b91c1c)' : rank === 2 ? 'linear-gradient(135deg,#f97316,#c2410c)' : 'linear-gradient(135deg,#eab308,#a16207)';
                const rankLabel = rank === 1 ? '最優先' : rank === 2 ? '高優先' : '優先';
                return `<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;margin-bottom:6px;border:1px solid ${rank===1?'rgba(239,68,68,.25)':rank===2?'rgba(249,115,22,.2)':'rgba(234,179,8,.2)'};border-radius:10px;background:${rank===1?'rgba(239,68,68,.04)':rank===2?'rgba(249,115,22,.03)':'rgba(234,179,8,.03)'};border-left:3px solid ${rank===1?'#ef4444':rank===2?'#f97316':'#eab308'}">
                  <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:2px">
                    <span style="width:22px;height:22px;border-radius:50%;background:${rankBg};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;min-width:22px;box-shadow:0 2px 6px rgba(0,0,0,.15)">${numMatch[1]}</span>
                    <span style="font-size:7.5px;font-weight:700;color:${rank===1?'#b91c1c':rank===2?'#c2410c':'#a16207'};letter-spacing:.03em;white-space:nowrap">${rankLabel}</span>
                  </div>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:12px;line-height:1.75;color:var(--text-primary);font-weight:600">${esc(numMatch[2])}</div>
                  </div>
                </div>`;
              }
              return `<div style="font-size:11.5px;line-height:1.75;color:var(--text-primary);padding:4px 0">${esc(line)}</div>`;
            }).join('') || `<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:16px">自動採点後に生成されます</div>`}"""
)

# ============================================================
# P8: 採点エンジン v6 バージョン表記更新 + 精度向上コメント
# ============================================================
patch('P8-engine-version',
'//  シナリオラボ 職員室 — コンクール審査員エンジン v4.0',
'//  シナリオラボ 職員室 — コンクール審査員エンジン v6.0'
)

# ============================================================
# P9: 診断ノート - 構成診断を引用付きに強化
# ============================================================
patch('P9-notes-three-act-quote',
"""  if (scores['three-act'] >= 4) {
    notes.push({ type: 'good', text: '構成：発端事件→対立→クライマックスの三幕構造が機能しています。' + (incitingInFirstHalf ? '前半での発端事件の配置も適切。' : '') + '読み手を最後まで引き付ける骨格があります。' });
  } else if (scores['three-act'] <= 2) {
    const missing = [];
    if (!hasIncitingIncident) missing.push('発端事件');
    if (!hasConflict) missing.push('対立・コンフリクト');
    if (!hasClimax) missing.push('クライマックス');
    notes.push({ type: 'bad', text: '構成：三幕構造に問題があります。不足要素：【' + missing.join('・') + '】。「①日常→②発端事件→③障害と葛藤→④クライマックス→⑤解決」の流れを意識して設計し直してください。現在' + sceneCount + 'シーン。' });
  }""",
"""  if (scores['three-act'] >= 4) {
    const threeActGoodNote = { type: 'good', text: '構成：発端事件→対立→クライマックスの三幕構造が機能しています。' + (incitingInFirstHalf ? '前半での発端事件の配置も適切。' : '') + '読み手を最後まで引き付ける骨格があります。' + (sceneCount >= 5 ? '(' + sceneCount + 'シーン構成）' : '') };
    // 発端事件に近い行を引用
    const incitingQuote = (() => {
      const kws = ['突然', '電話が', 'ところが', '驚いた', '信じられ', '予想外', 'まさか', '事件', 'とつぜん'];
      for (const d of [...dialogueTexts, ...actionLines]) {
        if (kws.some(k => d.includes(k)) && d.length >= 5 && d.length <= 70) return d;
      }
      return null;
    })();
    if (incitingQuote) threeActGoodNote.quote = incitingQuote;
    notes.push(threeActGoodNote);
  } else if (scores['three-act'] <= 2) {
    const missing = [];
    if (!hasIncitingIncident) missing.push('発端事件');
    if (!hasConflict) missing.push('対立・コンフリクト');
    if (!hasClimax) missing.push('クライマックス');
    const threeActBadNote = { type: 'bad', text: '構成：三幕構造に問題があります。不足要素：【' + missing.join('・') + '】。「①日常→②発端事件→③障害と葛藤→④クライマックス→⑤解決」の流れを意識して設計し直してください。現在' + sceneCount + 'シーン。' };
    // 最初のシーン行を引用
    if (sceneLines.length > 0) threeActBadNote.quote = sceneLines[0] + (sceneLines[1] ? '\\n' + sceneLines[1] : '');
    notes.push(threeActBadNote);
  }"""
)

# ============================================================
# P10: 診断ノート - ペーシング診断に具体数値と引用を追加
# ============================================================
patch('P10-notes-pacing-quote',
"""  if (scores['pacing'] <= 2) {
    if (sceneLengths.length >= 2) {
      const avgLen = Math.round(sceneLengths.reduce((a, b) => a + b, 0) / sceneLengths.length);
      notes.push({ type: 'warn', text: 'ペーシング：シーン平均' + avgLen + '行。' + (avgLen > 35 ? 'シーンが長すぎます。1シーン=1目的を徹底し、目的達成後はすぐ切ってください。' : avgLen < 3 ? 'シーンが短すぎます。各場面をもう少し展開してください。' : 'セリフとト書きのバランスを見直してください。') });
    } else {
      notes.push({ type: 'warn', text: 'ペーシング：セリフ比率' + Math.round(dialogueRatio * 100) + '%。' + (dialogueRatio > 0.75 ? 'セリフが多すぎます。映像的なシーンを増やしてください。' : '場面転換が少ない可能性があります。') });
    }
  }""",
"""  if (scores['pacing'] <= 2) {
    if (sceneLengths.length >= 2) {
      const avgLen = Math.round(sceneLengths.reduce((a, b) => a + b, 0) / sceneLengths.length);
      const maxLen = Math.max(...sceneLengths);
      const minLen = Math.min(...sceneLengths);
      const pacingNote = { type: 'warn', text: 'ペーシング：シーン平均' + avgLen + '行（最長' + maxLen + '行 / 最短' + minLen + '行）。' + (avgLen > 35 ? '1シーンが長すぎます。「このシーンで何が変わったか？」を問い、変化がなければカット。1シーン=1目的・1変化を徹底してください。' : avgLen < 3 ? '各シーンが短すぎます。もう少し展開してください。' : 'セリフとト書きのバランス（現在セリフ' + Math.round(dialogueRatio*100) + '%）を見直してください。') };
      // 最長シーンの周辺を示す
      if (maxLen > 30 && sceneLines.length > 0) {
        const longSceneIdx = sceneLengths.indexOf(maxLen);
        if (longSceneIdx >= 0 && longSceneIdx < sceneLines.length) {
          pacingNote.quote = sceneLines[longSceneIdx] + ' [' + maxLen + '行のシーン — 要圧縮]';
        }
      }
      notes.push(pacingNote);
    } else {
      const pacingNote2 = { type: 'warn', text: 'ペーシング：セリフ比率' + Math.round(dialogueRatio * 100) + '%。' + (dialogueRatio > 0.75 ? 'セリフが多すぎます（' + totalDialogueLines + '行中' + Math.round(dialogueRatio*100) + '%がセリフ）。映像的なシーンを増やし、ト書きでビジュアルを見せてください。' : '場面転換が少ない可能性があります。シーン柱書き（○場所・時間帯）を追加して構造を作ってください。') };
      notes.push(pacingNote2);
    }
  }"""
)

# ============================================================
# P11: 採点ルーブリックカード内アイテム行 - 引用ブロックを改善
# (旧: 薄い引用ブロック → 新: アイコン+ラベル付き洗練されたブロック)
# ============================================================
patch('P11-rubric-quote-block',
"""            ${autoQuote ? `
            <div style="margin-top:7px;padding:7px 10px 7px 9px;background:rgba(0,0,0,.028);border-radius:6px;border-left:2px solid ${scoreVal<=2?'var(--momo)':scoreVal>=4?'var(--matcha)':'var(--kogane)'};font-family:'Noto Serif JP',serif;font-size:10px;color:var(--text-secondary);line-height:1.85;word-break:break-all">
              <span style="font-size:8.5px;font-weight:700;color:${scoreVal<=2?'var(--momo)':scoreVal>=4?'var(--matcha)':'var(--kogane)'};display:block;margin-bottom:3px;letter-spacing:.04em">${scoreVal<=2?'問題箇所の引用':'脚本からの引用'}</span>${esc(autoQuote)}</div>` : ''}""",
"""            ${autoQuote ? `
            <div style="margin-top:8px;border-radius:7px;overflow:hidden;border:1px solid ${scoreVal<=2?'rgba(239,68,68,.2)':scoreVal>=4?'rgba(34,197,94,.2)':'rgba(234,179,8,.2)'}">
              <div style="padding:3px 9px;background:${scoreVal<=2?'rgba(239,68,68,.06)':scoreVal>=4?'rgba(34,197,94,.06)':'rgba(234,179,8,.06)'};display:flex;align-items:center;gap:4px;border-bottom:1px solid ${scoreVal<=2?'rgba(239,68,68,.12)':scoreVal>=4?'rgba(34,197,94,.12)':'rgba(234,179,8,.12)'}">
                <i class="fas ${scoreVal<=2?'fa-highlighter':scoreVal>=4?'fa-quote-left':'fa-minus'}" style="font-size:7px;color:${scoreVal<=2?'var(--momo)':scoreVal>=4?'var(--matcha)':'var(--kogane)'}"></i>
                <span style="font-size:8px;font-weight:700;color:${scoreVal<=2?'var(--momo)':scoreVal>=4?'var(--matcha)':'var(--kogane)'};letter-spacing:.04em">${scoreVal<=2?'問題箇所（脚本より）':scoreVal>=4?'好例（脚本より）':'参照箇所（脚本より）'}</span>
              </div>
              <div style="padding:6px 9px;background:rgba(0,0,0,.018);font-family:'Noto Serif JP',serif;font-size:10.5px;color:var(--text-secondary);line-height:1.85;word-break:break-all;white-space:pre-wrap">${esc(autoQuote)}</div>
            </div>` : ''}"""
)

# ============================================================
# P12: 改稿テクニックパネル - 脚本引用ブロックを刷新
# ============================================================
patch('P12-tutor-script-quote',
"""        ${scriptQuote ? `<div style="margin-top:${issues.length>0?'6px':'0'};padding:6px 10px;background:var(--momo-bg,#fff5f5);border:1px solid var(--momo-border,#fecaca);border-radius:5px;font-family:'Noto Serif JP',serif;font-size:11px;color:#7f1d1d;line-height:1.75;word-break:break-all"><span style="font-size:9.5px;font-weight:700;color:var(--momo);display:block;margin-bottom:3px">採点対象の脚本から：</span>${esc(scriptQuote)}</div>` : ''}""",
"""        ${scriptQuote ? `<div style="margin-top:${issues.length>0?'7px':'2px'};border-radius:7px;overflow:hidden;border:1px solid rgba(239,68,68,.25)">
          <div style="padding:4px 10px;background:rgba(239,68,68,.07);display:flex;align-items:center;gap:5px;border-bottom:1px solid rgba(239,68,68,.15)">
            <i class="fas fa-highlighter" style="font-size:8px;color:var(--momo)"></i>
            <span style="font-size:8.5px;font-weight:700;color:var(--momo);letter-spacing:.04em">あなたの脚本の該当箇所</span>
            <span style="font-size:7.5px;color:var(--text-muted);margin-left:auto">← この部分を改稿してください</span>
          </div>
          <div style="padding:7px 10px;background:#fff8f8;font-family:'Noto Serif JP',serif;font-size:11px;color:#7f1d1d;line-height:1.8;word-break:break-all;white-space:pre-wrap">${esc(scriptQuote)}</div>
        </div>` : ''}"""
)

# ============================================================
# P13: 採点エンジン - voice軸の引用生成を追加
# ============================================================
patch('P13-voice-quote',
'    scores[\'voice\'] = Math.min(5, Math.max(1, pts));\n    itemDetails[\'voice\'] = { reasons, issues };',
"""    scores['voice'] = Math.min(5, Math.max(1, pts));
    // voiceの引用: 最長セリフを持つキャラのセリフを例示
    const voiceQuoteEx = (() => {
      if (Object.keys(dialogueByChar).length < 2) return null;
      // 語彙差が少ない場合、類似した短い交換を例示
      if (charVocabUniqueness < 0.2 && totalDialogueLines >= 4) {
        for (let i = 0; i < dialogueTexts.length - 1; i++) {
          const a = dialogueTexts[i], b = dialogueTexts[i+1];
          if (a.length > 3 && a.length < 30 && b.length > 3 && b.length < 30) {
            return '「' + a + '」\\n「' + b + '」（声の差異が少ない台詞交換）';
          }
        }
      }
      // 最多発言キャラの代表的セリフ
      const topChar = sortedChars[0];
      if (topChar && dialogueByChar[topChar[0]]) {
        const d = dialogueByChar[topChar[0]][0];
        if (d) return topChar[0] + '「' + (d.length > 55 ? d.slice(0,55)+'…' : d) + '」';
      }
      return null;
    })();
    itemDetails['voice'] = { reasons, issues, quote: voiceQuoteEx };"""
)

# ============================================================
# P14: 採点エンジン - originality軸の引用を強化
# ============================================================
patch('P14-originality-quote',
'    scores[\'originality\'] = Math.min(5, Math.max(1, pts));\n    itemDetails[\'originality\'] = { reasons, issues };',
"""    scores['originality'] = Math.min(5, Math.max(1, pts));
    // オリジナリティの引用: ジャンル特定語句やユニークな表現を引用
    const origQuote = (() => {
      if (poeticCount >= 1) {
        // 詩的表現を含む行を引用
        const poeticKws = ['ように', 'まるで', 'かのよう', '比べると', 'みたいな', 'に似た', 'という感じ'];
        for (const l of [...dialogueTexts, ...actionLines]) {
          if (poeticKws.some(k => l.includes(k)) && l.length >= 8 && l.length <= 70) return l;
        }
      }
      if (detectedGenres.length >= 2 && sceneLines.length > 0) {
        return sceneLines[0] + ' [推定ジャンル:' + detectedGenres.join('×') + ']';
      }
      return null;
    })();
    itemDetails['originality'] = { reasons, issues, quote: origQuote };"""
)

# ============================================================
# P15: 採点エンジン - production-viability軸の引用を追加
# ============================================================
patch('P15-production-quote',
'    scores[\'production-viability\'] = Math.min(5, Math.max(1, pts));\n    itemDetails[\'production-viability\'] = { reasons, issues };',
"""    scores['production-viability'] = Math.min(5, Math.max(1, pts));
    // 映像化コスト関連の引用
    const prodQuote = (() => {
      if (productionScaleHeavy) {
        const heavyKws = ['VFX', 'CG', 'エキストラ', '爆発', '宇宙', '大群衆', '特殊効果', '大型船', 'バトル', '軍隊'];
        for (const l of [...actionLines, ...sceneLines]) {
          if (heavyKws.some(k => l.includes(k)) && l.length >= 3) return l + ' [高コスト要素]';
        }
      }
      if (productionScalePractical && sceneLines.length > 0) {
        // 低コストシーンの例を示す
        const simpleScene = sceneLines.find(l => /部屋|家|オフィス|喫茶|公園|廊下|駅|道/.test(l));
        if (simpleScene) return simpleScene + ' [撮影しやすい設定]';
      }
      return null;
    })();
    itemDetails['production-viability'] = { reasons, issues, quote: prodQuote };"""
)

# ============================================================
# P16: 採点エンジン - authorial-voice軸の引用を追加
# ============================================================
patch('P16-authorial-quote',
'    scores[\'authorial-voice\'] = Math.min(5, Math.max(1, pts));\n    itemDetails[\'authorial-voice\'] = { reasons, issues };',
"""    scores['authorial-voice'] = Math.min(5, Math.max(1, pts));
    // 作家性: 詩的表現や固有感覚的表現を引用
    const authorQuote = (() => {
      if (poeticCount >= 1) {
        const poeticKws = ['ように', 'まるで', 'かのよう', 'みたいな', '比べると', 'というより', 'に似た'];
        for (const l of [...actionLines, ...dialogueTexts]) {
          if (poeticKws.some(k => l.includes(k)) && l.length >= 8 && l.length <= 70) return l;
        }
      }
      if (hasVaguePlaceholders) {
        // プレースホルダーを持つ行を引用（問題指摘）
        const vagueKws = ['○○', '××', '△△', '□□'];
        for (const l of nonEmpty) {
          if (vagueKws.some(k => l.includes(k))) return l + ' [プレースホルダー — 具体的な名前・場所に置き換えてください]';
        }
      }
      return null;
    })();
    itemDetails['authorial-voice'] = { reasons, issues, quote: authorQuote };"""
)

# ============================================================
# P17: 診断ノート - Want/Need診断に脚本引用を追加
# ============================================================
patch('P17-want-need-note-quote',
"""  if (scores['protag-want-need'] <= 2) {
    notes.push({ type: 'bad', text: 'Want/Need設計：' + (mainCharName ? '「' + mainCharName + '」' : '主人公') + 'の欲求設計が弱い。①外的目標（Want: 何を手に入れたいか）と②内的必要性（Need: 本当は何が必要か）の両方を明確化し、両者が対立する構造にすると最強のドラマが生まれます。' });
  } else if (scores['protag-want-need'] >= 4) {
    notes.push({ type: 'good', text: 'Want/Need設計：' + (mainCharName ? '「' + mainCharName + '」' : '主人公') + 'の動機設計が優秀です。外的欲求と内的必要性が明確で、読者の感情移入を促す設計になっています。' });
  }""",
"""  if (scores['protag-want-need'] <= 2) {
    const wantNeedBad = { type: 'bad', text: 'Want/Need設計：' + (mainCharName ? '「' + mainCharName + '」' : '主人公') + 'の欲求設計が弱い。①外的目標（Want: 何を手に入れたいか）と②内的必要性（Need: 本当は何が必要か）の両方を明確化し、両者が対立する構造にすると最強のドラマが生まれます。' };
    // 主人公の目標に関する台詞を引用
    if (mainCharName && dialogueByChar[mainCharName]) {
      const mainDlgs = dialogueByChar[mainCharName];
      const goalKws = ['したい', 'なりたい', 'ほしい', '目指', '望む', '必要', '欲し', '手に入れ'];
      const goalDlg = mainDlgs.find(d => goalKws.some(k => d.includes(k)));
      if (goalDlg) wantNeedBad.quote = mainCharName + '「' + (goalDlg.length > 60 ? goalDlg.slice(0,60)+'…' : goalDlg) + '」（欲求表現が弱い — より明確化が必要）';
      else if (mainDlgs.length > 0) wantNeedBad.quote = mainCharName + '「' + (mainDlgs[0].length > 60 ? mainDlgs[0].slice(0,60)+'…' : mainDlgs[0]) + '」（この台詞にWantを埋め込む余地があります）';
    }
    notes.push(wantNeedBad);
  } else if (scores['protag-want-need'] >= 4) {
    const wantNeedGood = { type: 'good', text: 'Want/Need設計：' + (mainCharName ? '「' + mainCharName + '」' : '主人公') + 'の動機設計が優秀です。外的欲求と内的必要性が明確で、読者の感情移入を促す設計になっています。' };
    if (itemDetails['protag-want-need'] && itemDetails['protag-want-need'].quote) {
      wantNeedGood.quote = itemDetails['protag-want-need'].quote;
    }
    notes.push(wantNeedGood);
  }"""
)

# ============================================================
# P18: 診断ノート - キャラクターアーク診断に引用を追加
# ============================================================
patch('P18-char-arc-note-quote',
"""  if (scores['char-arc'] <= 2) {
    notes.push({ type: 'bad', text: 'キャラクターアーク：物語を通じた主人公の変容が描かれていません。脚本の最終目標は「主人公が変わること」です。第1幕で欠点/傷を見せ→第2幕で葛藤で壊れ→第3幕で変容する、の三段階で設計してください。' });
  }""",
"""  if (scores['char-arc'] <= 2) {
    const arcBadNote = { type: 'bad', text: 'キャラクターアーク：物語を通じた主人公の変容が描かれていません。脚本の最終目標は「主人公が変わること」です。第1幕で欠点/傷を見せ→第2幕で葛藤で壊れ→第3幕で変容する、の三段階で設計してください。' };
    // 変化の欠如を示す台詞を引用
    if (mainCharName && dialogueByChar[mainCharName] && dialogueByChar[mainCharName].length >= 2) {
      const first = dialogueByChar[mainCharName][0];
      const last = dialogueByChar[mainCharName][dialogueByChar[mainCharName].length - 1];
      if (first !== last && first.length > 3 && last.length > 3) {
        arcBadNote.quote = '冒頭: ' + mainCharName + '「' + (first.length > 40 ? first.slice(0,40)+'…' : first) + '」\\n終盤: ' + mainCharName + '「' + (last.length > 40 ? last.slice(0,40)+'…' : last) + '」\\n→ 両者に変化・成長の差があるか確認を';
      }
    }
    notes.push(arcBadNote);
  } else if (scores['char-arc'] >= 4) {
    const arcGoodNote = { type: 'good', text: 'キャラクターアーク：主人公の変容が描かれています。' + (hasWant && hasNeed ? 'Want/Need/Arcが連動した設計です（理想的）。' : '') + (hasCatharsis ? 'カタルシスの読後感も確認できます。' : '') };
    if (itemDetails['char-arc'] && itemDetails['char-arc'].quote) arcGoodNote.quote = itemDetails['char-arc'].quote;
    notes.push(arcGoodNote);
  }"""
)

# ============================================================
# P19: 改善提案 - 脚本からの引用を改善前として表示
# (protag-want-need提案をさらに脚本引用対応に強化)
# ============================================================
patch('P19-suggestion-want-quote',
"""  if (scores['protag-want-need'] <= 2) {
    suggestions_parts.push('・冒頭シーンで' + (mainCharName || '主人公') + 'の「外的目標（Want）」を視覚的に示す1シーンを追加する。\\n  具体例：\\n  （改善前）田中、漠然と窓の外を見ている。\\n  （改善後）田中、書類を繰る。「合格者一覧」——自分の名前はない。\\n  → 外的目標「合格したい」が映像で示される');
  }""",
"""  if (scores['protag-want-need'] <= 2) {
    const wantScript = mainCharName && dialogueByChar[mainCharName] ? dialogueByChar[mainCharName][0] : null;
    const wantBefore = wantScript ? mainCharName + '「' + (wantScript.length > 40 ? wantScript.slice(0,40)+'…' : wantScript) + '」（← 欲求が不明瞭）' : '（主人公の目標を示すセリフが不足）';
    suggestions_parts.push('・冒頭シーンで' + (mainCharName || '主人公') + 'の「外的目標（Want）」を視覚的に示す1シーンを追加する。\\n  （改善前）' + wantBefore + '\\n  （改善後）' + (mainCharName || '田中') + '、書類を繰る。「合格者一覧」——自分の名前はない。\\n  → 外的目標が映像で示される。さらにNeed（内的必要性）も対立させると最強の設計に。');
  }"""
)

# ============================================================
# P20: 改善提案 - subtext提案に引用付加
# ============================================================
patch('P20-suggestion-subtext-quote',
"""  if (scores['subtext'] <= 2) {
    suggestions_parts.push('・「感情を言葉にさせない」練習：怒りを「怒る」と書かず、コップを叩きつけさせる。\\n  具体例：\\n  （改善前）花子「悲しい。どうしてこうなったの」\\n  （改善後）花子、手元の花瓶——少しだけ傾ける。戻す。\\n  沈黙・間・物・空間が最強の感情表現。');
  }""",
"""  if (scores['subtext'] <= 2) {
    const onTheNoseEx = (() => {
      const pats = ['なんですよ', 'ということは', 'つまり', '実は私', '要するに', '説明しておくと', 'わかってます'];
      for (const d of dialogueTexts) {
        if (pats.some(p => d.includes(p))) return '「' + (d.length > 50 ? d.slice(0,50)+'…' : d) + '」（← 説明台詞：感情を言葉で説明している）';
      }
      if (onTheNoseLines.length > 0) {
        const ex = onTheNoseLines[0];
        return '「' + (ex.length > 50 ? ex.slice(0,50)+'…' : ex) + '」（← 説明台詞）';
      }
      return '（あなたの脚本内の説明台詞箇所）';
    })();
    suggestions_parts.push('・「感情を言葉にさせない」練習：怒りを「怒る」と書かず、コップを叩きつけさせる。\\n  （改善前）' + onTheNoseEx + '\\n  （改善後）' + (mainCharName || '田中') + '、手元の花瓶——少しだけ傾ける。戻す。\\n  → 沈黙・間・物・空間が最強の感情表現。説明台詞を行動と映像に置き換えてください。');
  }"""
)

# ============================================================
# P21: 診断ノート - 作家性診断に引用を追加
# ============================================================
patch('P21-authorial-note-quote',
"""  if (scores['authorial-voice'] >= 4) {
    notes.push({ type: 'good', text: '作家性：文体に明確な個性があります。' + (repeatedMotifs >= 3 ? '繰り返しのモチーフ（' + repeatedMotifs + '語）が作品に統一感を与えています。' : '') + (poeticCount >= 2 ? '詩的表現（' + poeticCount + '箇所）が効果的。' : '') + 'この書き手にしか書けない「声」が聞こえます。' });
  } else if (scores['authorial-voice'] <= 2) {
    notes.push({ type: 'warn', text: '作家性：文体の個性・一貫性が弱い。抽象語（「悲しい」「嬉しい」）を排し、固有の感覚的ディテール（「アスファルトの熱」「ガムの跡」）に置き換えてください。コンクールで勝つのは「うまい脚本」より「独自の声のある脚本」です。' });
  }""",
"""  if (scores['authorial-voice'] >= 4) {
    const authorGoodNote = { type: 'good', text: '作家性：文体に明確な個性があります。' + (repeatedMotifs >= 3 ? '繰り返しのモチーフ（' + repeatedMotifs + '語）が作品に統一感を与えています。' : '') + (poeticCount >= 2 ? '詩的表現（' + poeticCount + '箇所）が効果的。' : '') + 'この書き手にしか書けない「声」が聞こえます。' };
    if (itemDetails['authorial-voice'] && itemDetails['authorial-voice'].quote) authorGoodNote.quote = itemDetails['authorial-voice'].quote;
    notes.push(authorGoodNote);
  } else if (scores['authorial-voice'] <= 2) {
    const authorBadNote = { type: 'warn', text: '作家性：文体の個性・一貫性が弱い。抽象語（「悲しい」「嬉しい」）を排し、固有の感覚的ディテール（「アスファルトの熱」「ガムの跡」）に置き換えてください。コンクールで勝つのは「うまい脚本」より「独自の声のある脚本」です。' };
    // 抽象的な表現を含む行を引用
    const abstractKws = ['悲しい', '嬉しい', '怒った', '楽しい', '寂しい', '辛い', '苦しい'];
    const abstractLine = actionLines.find(l => abstractKws.some(k => l.includes(k))) 
      || dialogueTexts.find(d => abstractKws.some(k => d.includes(k)));
    if (abstractLine) {
      const isDialogue = dialogueTexts.includes(abstractLine);
      authorBadNote.quote = (isDialogue ? '「' + abstractLine + '」' : abstractLine) + '\\n↳ 「' + (abstractKws.find(k => abstractLine.includes(k)) || '感情語') + '」は抽象的。固有の行動・物・感覚で置き換えてください。';
    }
    notes.push(authorBadNote);
  }"""
)

# ============================================================
# P22: 診断ノート - テーマ診断に引用を追加
# ============================================================
patch('P22-theme-note-quote',
"""  if (scores['theme-clarity'] <= 2) {
    notes.push({ type: 'warn', text: 'テーマ：「この作品が言いたいこと」を一言で言えますか？テーマは台詞で語らせず、キャラクターの行動パターン・繰り返し・対比の中に埋め込んでください。テーマ的深度' + thematicDiversity + '概念。' });
  } else if (scores['theme-clarity'] >= 4) {
    notes.push({ type: 'good', text: 'テーマ：作品全体を貫くテーマが明確で、キャラクターの行動・対立がテーマを体現しています。' + (repeatedMotifs >= 3 ? '繰り返しのモチーフ（' + repeatedMotifs + '語）がテーマの統一感を作っています。' : '') });
  }""",
"""  if (scores['theme-clarity'] <= 2) {
    const themeBadNote = { type: 'warn', text: 'テーマ：「この作品が言いたいこと」を一言で言えますか？テーマは台詞で語らせず、キャラクターの行動パターン・繰り返し・対比の中に埋め込んでください。テーマ的深度' + thematicDiversity + '概念。' };
    // テーマ語がある場合は引用
    if (itemDetails['theme-clarity'] && itemDetails['theme-clarity'].quote) {
      themeBadNote.quote = itemDetails['theme-clarity'].quote + '\\n↳ テーマ語が出てきますが、もっと行動・構造に埋め込んでください。';
    }
    notes.push(themeBadNote);
  } else if (scores['theme-clarity'] >= 4) {
    const themeGoodNote = { type: 'good', text: 'テーマ：作品全体を貫くテーマが明確で、キャラクターの行動・対立がテーマを体現しています。' + (repeatedMotifs >= 3 ? '繰り返しのモチーフ（' + repeatedMotifs + '語）がテーマの統一感を作っています。' : '') };
    if (itemDetails['theme-clarity'] && itemDetails['theme-clarity'].quote) themeGoodNote.quote = itemDetails['theme-clarity'].quote;
    notes.push(themeGoodNote);
  }"""
)

# ============================================================
# P23: ITEM_DB - dialogue-dynamics に新しいTipを追加
# ============================================================
patch('P23-dlg-dyn-tip2',
"""    'dialogue-dynamics': {
      label: '対話のダイナミクス',
      tips: [
        { title: '目的のない会話 → 目的衝突のある会話へ', bad: '田中「最近どう？」\\n花子「まあまあかな。仕事が忙しくて」\\n田中「そうか。大変だね」\\n花子「田中は？」\\n田中「俺も忙しいよ」', good: '田中「……例の件、返事はまだ？」（田中の目標: 答えを得たい）\\n花子「コーヒー飲む？（花子の目標: 話題を避けたい）\\n田中「いらない。聞かせてくれ」\\n花子「……砂糖は？」\\n田中「花子」', tip: '台詞は「キャラクターAの欲求」と「キャラクターBの欲求」が衝突するところに生まれます。会話の目的を設定してから台詞を書きましょう。' },
      ]
    },""",
"""    'dialogue-dynamics': {
      label: '対話のダイナミクス',
      tips: [
        { title: '目的のない会話 → 目的衝突のある会話へ', bad: '田中「最近どう？」\\n花子「まあまあかな。仕事が忙しくて」\\n田中「そうか。大変だね」\\n花子「田中は？」\\n田中「俺も忙しいよ」', good: '田中「……例の件、返事はまだ？」（田中の目標: 答えを得たい）\\n花子「コーヒー飲む？（花子の目標: 話題を避けたい）\\n田中「いらない。聞かせてくれ」\\n花子「……砂糖は？」\\n田中「花子」', tip: '台詞は「キャラクターAの欲求」と「キャラクターBの欲求」が衝突するところに生まれます。会話の目的を設定してから台詞を書きましょう。' },
        { title: '情報の非対称性でサスペンスを作る', bad: '田中「花子、聞いてくれ。実は俺、会社を辞めようと思ってる」\\n花子「え、それは大変ね。どうしたの？」\\n（お互いが知っている情報しか交わされない）', good: '田中「花子、聞いてくれ」\\n花子「（封筒を隠しながら）うん、何？」\\n田中「実は……いや、何でもない」\\n花子「（封筒を見ないよう目を伏せる）そう」\\n（観客は花子が手紙を受け取ったことを知っている——田中は知らない）', tip: '観客が知っていて主人公が知らない「情報の非対称性」がドラマの引力を生みます。秘密・嘘・隠し事を設計し、読者を「早く言えばいいのに！」という緊張状態に置きましょう。' },
        { title: '「沈黙」を台詞として書く', bad: 'A「……」\\nB「……」\\nA「行こう」', good: 'A、手の甲で涙を拭う。\\n（長い沈黙）\\nB、立ち上がろうとして——やめる。\\nA「（小声で）……行こう」\\nB「（頷く）」', tip: '「沈黙」は最も雄弁な台詞です。沈黙の間にキャラクターが何をしているかを書くことで、ト書きが「感情の代弁者」になります。間（ま）の設計が上手い脚本家ほど高評価を得ます。' },
      ]
    },"""
)

# ============================================================
# P24: ITEM_DB - emotional-impact に「観客との契約」Tipを追加
# ============================================================
patch('P24-emotion-tip3',
"""        { title: 'カタルシスのある最終シーンへの改稿', bad: '田中「ありがとう。君のおかげで変われた」\\n花子「いつでも来てね」', good: 'ゆっくり、田中の手が花子の手をにぎる。\\n花子、驚いて——でも手を離さない。\\n雨が止む音。\\n（二人、言葉なく）', tip: 'クライマックスは台詞より「動作・音・光」で締める。観客が「涙の理由」を自分で発見できる余白を作りましょう。' },""",
"""        { title: 'カタルシスのある最終シーンへの改稿', bad: '田中「ありがとう。君のおかげで変われた」\\n花子「いつでも来てね」', good: 'ゆっくり、田中の手が花子の手をにぎる。\\n花子、驚いて——でも手を離さない。\\n雨が止む音。\\n（二人、言葉なく）', tip: 'クライマックスは台詞より「動作・音・光」で締める。観客が「涙の理由」を自分で発見できる余白を作りましょう。' },
        { title: '「感情の観客への届け方」——共感を設計する', bad: '田中「俺、実はずっとお前のことが……」\\n（主人公が感情を全部台詞で説明する）', good: '田中、傘を差し出す——黙って。\\n花子、受け取る。\\n田中、雨の中——傘なしで歩き出す。\\n花子「田中——！」\\n（田中、振り返らない）', tip: '感情は「観客自身に感じてもらう」もの。主人公が感情を語れば語るほど、観客は引いていきます。代わりに「小さな行動・選択・犠牲」を見せて、観客が自分で感情を構築できる空間を作りましょう。' },"""
)

# ============================================================
# P25: 改稿テクニックパネルに「改善サイクル」ガイドを追加
# ============================================================
patch('P25-tutor-cycle',
"""          <div style="margin-top:14px;padding:10px 14px;background:var(--kogane-bg);border:1px solid var(--kogane-border);border-radius:8px;font-size:10.5px;color:var(--text-primary);line-height:1.7">
          <i class="fas fa-rotate" style="color:var(--kogane);margin-right:4px"></i>
          <strong>改稿サイクル：</strong>書き直し → 「提出・自動採点」ボタンで再採点 → 採点履歴グラフで改善を確認
        </div>""",
"""          <div style="margin-top:14px;padding:10px 14px;background:var(--kogane-bg);border:1px solid var(--kogane-border);border-radius:8px;font-size:10.5px;color:var(--text-primary);line-height:1.7">
          <i class="fas fa-rotate" style="color:var(--kogane);margin-right:4px"></i>
          <strong>改稿サイクル：</strong>①「あなたの脚本の該当箇所」を特定 → ②After例を参考に書き直し → ③「提出・自動採点」で再採点 → ④採点履歴グラフで改善を確認
        </div>
        <div style="margin-top:8px;padding:8px 12px;background:rgba(107,70,193,.06);border:1px solid rgba(107,70,193,.15);border-radius:8px;font-size:10px;color:var(--text-secondary);line-height:1.65">
          <i class="fas fa-lightbulb" style="color:var(--fuji);margin-right:4px"></i>
          <strong>コツ：</strong>1回の改稿で全ての弱点を直そうとしない。最優先1項目だけに集中して書き直すと、劇的にスコアが上がります。
        </div>"""
)

# ============================================================
# P26: 診断ノート - 情動的インパクト診断に引用を強化
# ============================================================
patch('P26-emotion-note-quote',
"""    if (dialogueTexts.length >= 2) {
      const flatLines = dialogueTexts.filter(d => d.length > 5 && d.length < 30);""",
"""    if (dialogueTexts.length >= 2) {
      const flatLines = dialogueTexts.filter(d => d.length > 3 && d.length < 35);"""
)

# ============================================================
# P27: 採点ルーブリック - アイテム行のスコアボタンを改善（ホバー強化）
# ============================================================
# アイテム行のissue部分の表示をより見やすく
patch('P27-issue-badge',
'              ${autoIssues.map(i2 => `<div style="display:flex;align-items:flex-start;gap:6px;font-size:10.5px;line-height:1.55"><span style="flex-shrink:0;margin-top:2px;width:14px;height:14px;border-radius:50%;background:var(--momo);display:inline-flex;align-items:center;justify-content:center;min-width:14px"><i class="fas fa-exclamation" style="font-size:7px;color:#fff"></i></span><span style="color:var(--momo)">${esc(i2)}</span></div>`).join(\'\')}',
'              ${autoIssues.map(i2 => `<div style="display:flex;align-items:flex-start;gap:6px;font-size:10.5px;line-height:1.55"><span style="flex-shrink:0;margin-top:2px;width:14px;height:14px;border-radius:50%;background:var(--momo);display:inline-flex;align-items:center;justify-content:center;min-width:14px;box-shadow:0 1px 3px rgba(239,68,68,.2)"><i class="fas fa-times" style="font-size:6px;color:#fff"></i></span><span style="color:var(--momo);font-weight:500">${esc(i2)}</span></div>`).join(\'\')}'
)

# 出力
new_size = len(code)
delta = new_size - original_size

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print(f"=== パッチ適用結果 ===")
print(f"適用済み ({len(applied)}件): {', '.join(applied)}")
print(f"スキップ ({len(skipped)}件): {', '.join(skipped)}")
print(f"ファイルサイズ: {original_size:,} → {new_size:,} (Δ{delta:+,}文字)")
