#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scenario Lab v11 — 根本的エンジン再設計パッチ
- 採点/添削エンジンの全面的な高度化
- 脚本固有の引用を全フィードバックに埋め込む
- UIの大幅刷新（カード・タイポグラフィ・色）
- Before/After例の更なる具体化
- 診断ノートのテンプレート脱却
"""

import re

def patch(filepath, old, new, label=""):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if old not in content:
        print(f"  SKIP [{label}]: not found")
        return False
    content = content.replace(old, new, 1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  OK   [{label}]")
    return True

JS = 'public/static/app.js'
CSS = 'public/static/app.css'

ok_count = 0
skip_count = 0

def do_patch(filepath, old, new, label):
    global ok_count, skip_count
    if patch(filepath, old, new, label):
        ok_count += 1
    else:
        skip_count += 1

print("=== v11 パッチ開始 ===")

# ─────────────────────────────────────────────────────────────────
# [1] バナーバージョン更新
# ─────────────────────────────────────────────────────────────────
do_patch(JS,
    'SCENARIO LAB ─ 審査員採点レポート v10',
    'SCENARIO LAB ─ 審査員採点レポート v11',
    'banner-version')

do_patch(JS,
    '18項目・7軸・実脚本引用 v10',
    '18項目・7軸・脚本固有分析 v11',
    'badge-version')

# ─────────────────────────────────────────────────────────────────
# [2] フッターバージョン更新 (v10 → v11)
# ─────────────────────────────────────────────────────────────────
do_patch(JS,
    'シナリオラボ 職員室 v10.0',
    'シナリオラボ 職員室 v11.0',
    'engine-version-comment')

do_patch(JS,
    '//  シナリオラボ 職員室 — コンクール審査員エンジン v10.0',
    '//  シナリオラボ 職員室 — コンクール審査員エンジン v11.0',
    'engine-comment-v11')

# ─────────────────────────────────────────────────────────────────
# [3] CSS: カード・タイポグラフィ・色の刷新
# ─────────────────────────────────────────────────────────────────

# sr-cite-block の改善 — 引用部の視認性を上げる
do_patch(CSS,
    '.sr-cite-block {',
    '''.sr-cite-block {
  /* v11: script-quote card — sharper, more readable */''',
    'cite-block-comment')

# sr-cite-text の改善
do_patch(CSS,
    '.sr-cite-text {',
    '''.sr-cite-text {
  /* v11: improved quote readability */''',
    'cite-text-comment')

# Note card の色改善を末尾に追加
v11_css = """

/* ══════════════════════════════════════════════════════
   Scenario Lab v11 — UI/UX 刷新スタイル
   ══════════════════════════════════════════════════════ */

/* ── v11: 引用ブロック — 改訂版 */
.sr-cite-block {
  position: relative;
  border-radius: 6px;
  padding: 8px 12px 8px 14px;
  margin-top: 8px;
  border-left-width: 3px;
  border-left-style: solid;
  font-size: 11px;
  line-height: 1.85;
  background: rgba(0,0,0,.025);
  border-top: 1px solid rgba(0,0,0,.06);
  border-right: 1px solid rgba(0,0,0,.06);
  border-bottom: 1px solid rgba(0,0,0,.06);
  overflow-wrap: break-word;
  word-break: break-all;
}
.sr-cite-block.cite-bad  { border-left-color: #dc2626; background: rgba(220,38,38,.035); }
.sr-cite-block.cite-good { border-left-color: #16a34a; background: rgba(22,163,74,.035); }
.sr-cite-block.cite-warn { border-left-color: #d97706; background: rgba(217,119,6,.035); }

.sr-cite-label {
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  margin-bottom: 4px;
  opacity: .7;
  display: flex;
  align-items: center;
  gap: 4px;
}
.cite-bad  .sr-cite-label { color: #b91c1c; }
.cite-good .sr-cite-label { color: #15803d; }
.cite-warn .sr-cite-label { color: #b45309; }

.sr-cite-text {
  font-family: 'Noto Serif JP', 'Yu Mincho', '游明朝', Georgia, serif;
  font-size: 11.5px;
  line-height: 2.0;
  white-space: pre-wrap;
  word-break: break-all;
  color: inherit;
}
.cite-bad  .sr-cite-text { color: #7f1d1d; }
.cite-good .sr-cite-text { color: #14532d; }
.cite-warn .sr-cite-text { color: #78350f; }

.sr-cite-arrow {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 700;
  color: #b91c1c;
  margin-top: 5px;
  padding-top: 5px;
  border-top: 1px dashed rgba(220,38,38,.2);
  letter-spacing: .02em;
}

/* ── v11: 診断ノートカード */
.sr-diag-note {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-light, #f0f0f0);
  transition: background .15s;
}
.sr-diag-note:last-child { border-bottom: none; }
.sr-diag-note.note-good { background: rgba(22,163,74,.025); }
.sr-diag-note.note-bad  { background: rgba(220,38,38,.025); }
.sr-diag-note.note-warn { background: rgba(217,119,6,.02); }
.sr-diag-note:hover { background: rgba(0,0,0,.02); }

.sr-diag-note-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  margin-top: 1px;
  font-size: 8px;
  color: #fff;
}
.note-good .sr-diag-note-icon { background: #16a34a; box-shadow: 0 1px 4px rgba(22,163,74,.3); }
.note-bad  .sr-diag-note-icon { background: #dc2626; box-shadow: 0 1px 4px rgba(220,38,38,.3); }
.note-warn .sr-diag-note-icon { background: #d97706; box-shadow: 0 1px 4px rgba(217,119,6,.3); }

/* ── v11: 強みカード */
.sr-strength-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 8px 11px;
  margin-bottom: 5px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  border-left: 3px solid #16a34a;
  transition: transform .15s, box-shadow .15s;
}
.sr-strength-item:hover { transform: translateX(2px); box-shadow: 0 2px 8px rgba(22,163,74,.1); }

/* ── v11: 弱点カード */
.sr-weakness-item {
  margin-bottom: 7px;
  border: 1px solid rgba(220,38,38,.2);
  border-radius: 9px;
  overflow: hidden;
  border-left: 3px solid #dc2626;
  transition: box-shadow .15s;
}
.sr-weakness-item:hover { box-shadow: 0 3px 12px rgba(220,38,38,.12); }
.sr-weakness-item.critical {
  border-color: rgba(220,38,38,.4);
  border-left-color: #b91c1c;
}

/* ── v11: 改稿提案カード */
.sr-suggestion-card {
  margin-bottom: 13px;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  transition: box-shadow .2s;
}
.sr-suggestion-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }
.sr-suggestion-header {
  padding: 9px 13px;
  background: var(--bg-subtle);
  border-bottom: 1px solid var(--border);
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.sr-suggestion-number {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--kogane);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 800;
  color: #fff;
  min-width: 18px;
  margin-top: 2px;
}
.sr-ba-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border-top: 1px solid var(--border);
}
@media (max-width: 520px) { .sr-ba-grid { grid-template-columns: 1fr; } }
.sr-ba-before {
  padding: 10px 12px;
  background: rgba(220,38,38,.03);
  border-right: 1px solid var(--border);
}
.sr-ba-after {
  padding: 10px 12px;
  background: rgba(22,163,74,.03);
}
.sr-ba-label {
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: .08em;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 3px;
}
.sr-ba-before .sr-ba-label { color: #b91c1c; }
.sr-ba-after  .sr-ba-label { color: #15803d; }
.sr-ba-text {
  font-family: 'Noto Serif JP', 'Yu Mincho', Georgia, serif;
  font-size: 10.5px;
  line-height: 1.9;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  overflow-wrap: break-word;
}
.sr-ba-before .sr-ba-text { color: #7f1d1d; }
.sr-ba-after  .sr-ba-text { color: #14532d; }

/* ── v11: 優先タスクカード */
.sr-priority-card {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 11px 13px;
  margin-bottom: 8px;
  border-radius: 9px;
  border: 1px solid transparent;
  transition: transform .15s;
}
.sr-priority-card:hover { transform: translateX(2px); }
.sr-priority-card.rank-1 { background: linear-gradient(135deg,rgba(220,38,38,.07),rgba(239,68,68,.02)); border-color: rgba(220,38,38,.2); }
.sr-priority-card.rank-2 { background: linear-gradient(135deg,rgba(249,115,22,.05),transparent); border-color: rgba(249,115,22,.2); }
.sr-priority-card.rank-3 { background: linear-gradient(135deg,rgba(234,179,8,.04),transparent); border-color: rgba(234,179,8,.2); }

/* ── v11: feedback tabs */
.sr-fb-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
  scrollbar-width: none;
  background: var(--bg-white);
}
.sr-fb-tabs::-webkit-scrollbar { display: none; }
.sr-fb-tab {
  flex-shrink: 0;
  padding: 8px 14px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all .15s;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}
.sr-fb-tab:hover { color: var(--text-primary); background: var(--bg-subtle); }
.sr-fb-tab.active {
  color: var(--fuji, #7c3aed);
  border-bottom-color: var(--fuji, #7c3aed);
  background: var(--bg-white);
  font-weight: 700;
}

/* ── v11: rubric item */
.sr-rubric-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-light, #f2f2f2);
}
.sr-rubric-item:last-child { border-bottom: none; }

/* ── v11: score buttons */
.sr-score-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: transparent;
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-light);
  transition: all .15s;
}
.sr-score-btn:hover { transform: scale(1.12); }
.sr-score-btn.active { box-shadow: 0 2px 6px rgba(0,0,0,.15); }

/* ── v11: script stats chip row */
.sr-stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}
.sr-stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 9px;
  background: rgba(255,255,255,.1);
  border: 1px solid rgba(255,255,255,.15);
  border-radius: 12px;
  padding: 2px 7px;
  color: rgba(255,255,255,.65);
  font-weight: 600;
}
.sr-stat-chip.alert { background: rgba(248,113,113,.15); border-color: rgba(248,113,113,.3); color: rgba(248,113,113,.9); }
.sr-stat-chip.good  { background: rgba(74,222,128,.12); border-color: rgba(74,222,128,.25); color: rgba(74,222,128,.9); }

/* ── v11: section header */
.sr-section-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: .01em;
}
.sr-section-subtitle {
  font-size: 10px;
  color: var(--text-muted);
}
"""

# append new CSS
with open(CSS, 'r', encoding='utf-8') as f:
    css_content = f.read()
css_content += v11_css
with open(CSS, 'w', encoding='utf-8') as f:
    f.write(css_content)
print("  OK   [v11-css-append]")
ok_count += 1

# ─────────────────────────────────────────────────────────────────
# [4] エンジン v11: 診断ノート生成の根本的強化
# ─────────────────────────────────────────────────────────────────
# 三幕構成の診断ノートをより脚本固有に
do_patch(JS,
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
  }""",
    """  if (scores['three-act'] >= 4) {
    // v11: 脚本固有の発端事件を引用する
    const incitingQuote = (() => {
      const incKws = ['突然', '電話が', 'ところが', '驚いた', '信じられ', '予想外', 'まさか', '事件', 'とつぜん',
                      '報告', '連絡', '知らせ', '呼び出', 'なぜ', 'どうして', '説明して', '教えて'];
      // まずアクションラインから探す
      for (const l of actionLines) {
        if (incKws.some(k => l.includes(k)) && l.length >= 8 && l.length <= 75) return l;
      }
      // 次にセリフから探す
      for (const d of dialogueTexts) {
        if (incKws.some(k => d.includes(k)) && d.length >= 5 && d.length <= 70) return '「' + d + '」';
      }
      // 最初のシーンの最初のト書きを引用
      if (sceneLines.length > 0) {
        const firstScene = sceneLines[0];
        const fsi = nonEmpty.indexOf(firstScene);
        if (fsi >= 0) {
          const nextLine = nonEmpty.slice(fsi+1, fsi+4).find(l => l.length > 5 && !isSceneLine(l));
          if (nextLine) return firstScene + '\n' + nextLine;
        }
        return firstScene;
      }
      return null;
    })();
    const threeActGoodNote = {
      type: 'good',
      text: '構成：発端事件→対立→クライマックスの三幕構造が機能しています。'
        + (incitingInFirstHalf ? '発端事件が前半（' + Math.round(scenePositions[0]?.pct*100||0) + '〜30%）に配置されており、理想的なテンポです。' : '発端事件あり。前半への再配置でテンポが改善します。')
        + (sceneCount >= 5 ? sceneCount + 'シーン構成で物語の起伏が十分に描けています。' : '')
        + (hasArc ? ' キャラクターの変化弧も確認できます。' : '')
    };
    if (incitingQuote) threeActGoodNote.quote = incitingQuote;
    notes.push(threeActGoodNote);
  } else if (scores['three-act'] <= 2) {
    const missing = [];
    if (!hasIncitingIncident) missing.push('発端事件');
    if (!hasConflict) missing.push('対立・コンフリクト');
    if (!hasClimax) missing.push('クライマックス');
    // v11: 実際の冒頭シーンを引用して具体的に指摘
    const openingExcerpt = (() => {
      if (sceneLines.length === 0) {
        // シーン行なしの場合、冒頭の5行を引用
        const openingLines = nonEmpty.slice(0, Math.min(5, nonEmpty.length));
        return openingLines.join('\n');
      }
      const firstScene = sceneLines[0];
      const fsi = nonEmpty.indexOf(firstScene);
      if (fsi >= 0) {
        const excerpt = nonEmpty.slice(fsi, Math.min(fsi+6, nonEmpty.length));
        return excerpt.join('\n');
      }
      return firstScene;
    })();
    const threeActBadNote = {
      type: 'bad',
      text: '構成：三幕構造の要素が不足しています。'
        + (missing.length > 0 ? '不足要素→【' + missing.join('】【') + '】。' : '')
        + '現在' + sceneCount + 'シーン。'
        + (!hasIncitingIncident ? '冒頭に「日常→非日常への転換点（発端事件）」を設けてください。主人公の世界が変わる瞬間です。' : '')
        + (!hasConflict ? '主人公が何かを求め、それを阻む力（対立）が物語を動かします。' : '')
        + (!hasClimax ? '終盤に最大の対立・決断シーンを配置してください。' : '')
        + '設計テンプレート → ①日常（5%）→ ②発端事件（10〜15%）→ ③上昇する障害（15〜75%）→ ④クライマックス（75〜90%）→ ⑤余韻（90〜100%）'
    };
    if (openingExcerpt) threeActBadNote.quote = openingExcerpt + '\n↳ この冒頭に「発端事件」はありますか？主人公の日常が壊れる瞬間を設計してください。';
    notes.push(threeActBadNote);
  }""",
    'three-act-diagnostic-v11')

# ─────────────────────────────────────────────────────────────────
# [5] エンジン v11: キャラクターアーク診断を強化
# ─────────────────────────────────────────────────────────────────
do_patch(JS,
    """  if (scores['char-arc'] <= 2) {
    const arcBadNote = { type: 'bad', text: 'キャラクターアーク：主人公の内的変化が見えません。設計テンプレート→①冒頭：主人公の誤信・欠点を行動で見せる ②第二幕：その欠点が原因で最悪の状況になる ③終盤：欠点を手放す行動が変化を示す。変化を「台詞で宣言」させず「行動の差」で見せてください。' };
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
    notes.push(arcBadNote);
  } else if (scores['char-arc'] >= 4) {
    const arcGoodNote = { type: 'good', text: 'キャラクターアーク：主人公の変容が描かれています。' + (hasWant && hasNeed ? 'Want/Need/Arcが連動した設計です（理想的）。' : '') + (hasCatharsis ? 'カタルシスの読後感も確認できます。' : '') };
    if (itemDetails['char-arc'] && itemDetails['char-arc'].quote) arcGoodNote.quote = itemDetails['char-arc'].quote;
    notes.push(arcGoodNote);
  }""",
    """  if (scores['char-arc'] <= 2) {
    // v11: 主人公の冒頭vs終盤の台詞を並べて「変化がないこと」を具体的に指摘
    const arcBadNote = {
      type: 'bad',
      text: 'キャラクターアーク：' + (mainCharName ? '「' + mainCharName + '」の' : '主人公の')
        + '内的変化が見えません。'
        + (!hasArc ? 'アークを示すキーワード（変わった・気づいた・決めた等）が検出されません。' : '')
        + 'アーク設計の三段階 → ①冒頭：主人公の「誤信・欠点・傷」を行動で示す '
        + '②中盤：その欠点が原因で最悪の局面に追い込まれる '
        + '③終盤：欠点を手放す具体的な「行動」が変化を証明する。'
        + '変化を台詞で語らせず、行動の「前後の差」で示してください。'
    };
    if (mainCharName && dialogueByChar[mainCharName] && dialogueByChar[mainCharName].length >= 2) {
      const allMainDlgs = dialogueByChar[mainCharName];
      const first = allMainDlgs[0];
      const last = allMainDlgs[allMainDlgs.length - 1];
      // 変化の指標：感情語・姿勢語・動詞の変化を探す
      const changeKws = ['決めた', '気づいた', '変わった', '許す', '認めた', '手放す', '前に進', 'もういい', 'ありがとう', '終わった'];
      const hasChangeInLast = changeKws.some(k => last.includes(k));
      if (first !== last && first.length > 3 && last.length > 3) {
        const diff = hasChangeInLast ? '\\n  ↑ 終盤に変化の萌芽あり。さらに「行動の差」として視覚化してください。'
                                     : '\\n  → この2台詞の感情・姿勢・言葉遣いに差がありますか？'
                                      + '\\n    差がなければ主人公は変化していません（=平坦なキャラクター）。'
                                      + '\\n    改稿ヒント：終盤の台詞を「冒頭と逆の立場・価値観」から書き直してください。';
        arcBadNote.quote = '冒頭: ' + mainCharName + '「' + (first.length > 48 ? first.slice(0,48)+'…' : first) + '」'
          + '\\n終盤: ' + mainCharName + '「' + (last.length > 48 ? last.slice(0,48)+'…' : last) + '」' + diff;
      } else if (allMainDlgs.length >= 1 && first.length > 3) {
        arcBadNote.quote = mainCharName + '（全台詞' + allMainDlgs.length + '行）'
          + '\\n最初の台詞: 「' + (first.length > 55 ? first.slice(0,55)+'…' : first) + '」'
          + '\\n→ ここから終盤にかけて、この人物はどう変わりますか？変化の設計図を描いてください。';
      }
    } else if (!mainCharName) {
      // 主人公が特定できない場合
      const firstDialogue = dialogueTexts[0];
      const lastDialogue = dialogueTexts[dialogueTexts.length - 1];
      if (firstDialogue && lastDialogue && firstDialogue !== lastDialogue) {
        arcBadNote.quote = '冒頭の台詞: 「' + (firstDialogue.length > 48 ? firstDialogue.slice(0,48)+'…' : firstDialogue) + '」'
          + '\\n終盤の台詞: 「' + (lastDialogue.length > 48 ? lastDialogue.slice(0,48)+'…' : lastDialogue) + '」'
          + '\\n→ これらの台詞に発話者の「変化」が感じられますか？';
      }
    }
    notes.push(arcBadNote);
  } else if (scores['char-arc'] >= 4) {
    // v11: アーク成功例の具体的引用
    const arcGoodNote = {
      type: 'good',
      text: 'キャラクターアーク：'
        + (mainCharName ? '「' + mainCharName + '」の' : '主人公の')
        + '変容が描かれています。'
        + (hasWant && hasNeed ? 'Want（外的目標）とNeed（内的必要性）がアークと連動した理想的な設計です。' : '')
        + (hasCatharsis ? 'カタルシスの読後感も確認できます。' : '')
        + (hasArc ? '変化を示すキーワードが' + (subtextHardCount + subtextSoftCount) + '箇所確認できます。' : '')
    };
    if (itemDetails['char-arc'] && itemDetails['char-arc'].quote) arcGoodNote.quote = itemDetails['char-arc'].quote;
    else if (mainCharName && dialogueByChar[mainCharName]) {
      const allMainDlgs = dialogueByChar[mainCharName];
      if (allMainDlgs.length >= 2) {
        const first = allMainDlgs[0];
        const last = allMainDlgs[allMainDlgs.length - 1];
        if (first !== last) {
          arcGoodNote.quote = '冒頭: ' + mainCharName + '「' + (first.length > 45 ? first.slice(0,45)+'…' : first) + '」'
            + '\\n終盤: ' + mainCharName + '「' + (last.length > 45 ? last.slice(0,45)+'…' : last) + '」'
            + '\\n↑ この2台詞の差がアークを証明しています。';
        }
      }
    }
    notes.push(arcGoodNote);
  }""",
    'char-arc-diagnostic-v11')

# ─────────────────────────────────────────────────────────────────
# [6] エンジン v11: サブテキスト診断の強化（脚本実例引用強化）
# ─────────────────────────────────────────────────────────────────
do_patch(JS,
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
    notes.push(noteObjSubtext);
  } else if (scores['subtext'] >= 4) {
    notes.push({ type: 'good', text: 'サブテキスト：説明台詞を排し、行間で感情・意図を表現できています。プロの書き方ができています。' + (subtextHardCount >= 2 ? '特に沈黙・間の使い方が効果的です。' : '') });
  }""",
    """  if (scores['subtext'] <= 2 && onTheNoseCount >= 3) {
    // v11: オン・ザ・ノーズ台詞を実際に引用し、具体的改稿案を自動生成
    const noteObjSubtext = {
      type: 'bad',
      text: '説明台詞（オン・ザ・ノーズ）：解説的セリフが' + onTheNoseCount + '箇所（全台詞の' + Math.round(onTheNoseRatio*100) + '%）。'
        + '「感情・意図を言葉で語らせる」のがコンクール審査員の手を最も止める要因です。'
        + '置き換えの5択：① 身体の行動（手が止まる・目をそらす・立ち上がる）'
        + ' ② 小道具（コップを握る・書類を伏せる・窓を閉める）'
        + ' ③ 沈黙・間（「…」「（沈黙）」「（長い間）」）'
        + ' ④ 視線・表情の変化（ト書きで）'
        + ' ⑤ 台詞の量を半分に削り、言いかけて止める（「……」）'
    };
    if (onTheNoseSample) {
      const subtextCharGuess = mainCharName || '田中';
      // 感情語から置き換えを自動推論
      const feelingMatch = onTheNoseSample.match(/悲しい|辛い|怖い|怒っ|嬉しい|悔しい|寂しい|苦しい|困っ|つらい/);
      const hasFeelingKw = feelingMatch;
      let afterGuess;
      if (hasFeelingKw) {
        const fw = hasFeelingKw[0];
        afterGuess = (fw.includes('悲') || fw.includes('寂') || fw.includes('辛'))
          ? subtextCharGuess + '、窓の外を向く。\\n  （長い沈黙）\\n  そのまま、動かない。'
          : fw.includes('怒')
          ? subtextCharGuess + '、コップをゆっくり置く——一度だけ。\\n  立ち上がる。窓。'
          : fw.includes('怖')
          ? subtextCharGuess + '、一歩だけ後退する。ドアノブに手がかかる。'
          : fw.includes('嬉') || fw.includes('楽')
          ? subtextCharGuess + '、思わず足が速くなる。\\n  （止まる）……（また歩く）'
          : subtextCharGuess + '、手が止まる。机の上。\\n  （沈黙）';
      } else if (onTheNoseSample.includes('つまり') || onTheNoseSample.includes('要するに')) {
        afterGuess = '（台詞を削除 → 代わりにト書き）\\n  ' + subtextCharGuess + '、書類を静かに閉じる。';
      } else {
        afterGuess = subtextCharGuess + '、黙って立ち上がる。窓に近づく。背を向けたまま。';
      }
      noteObjSubtext.quote = '問題の台詞: 「' + (onTheNoseSample.length > 72 ? onTheNoseSample.slice(0,72)+'…' : onTheNoseSample) + '」'
        + '\\n\\n↳ 置き換え例（感情を言わず、行動で見せる）:'
        + '\\n  ' + afterGuess
        + (onTheNoseCount > 1 ? '\\n\\n  ※ 他にも' + (onTheNoseCount-1) + '箇所あります。全て同様に変換してください。' : '');
    }
    notes.push(noteObjSubtext);
  } else if (scores['subtext'] >= 4) {
    // v11: サブテキスト良例を脚本から引用
    const subtextGoodExample = (() => {
      // ハードサブテキスト（沈黙・間）の実例を引用
      const hardPats = ['…', '沈黙', '（間）', '（長い沈黙）', '——', '──'];
      for (const l of [...actionLines, ...nonEmpty]) {
        if (hardPats.some(p => l.includes(p)) && l.length >= 3 && l.length <= 70) return l;
      }
      // ソフトサブテキスト（動作・表情）の実例
      const softPats = subtextIndicators_soft;
      for (const l of actionLines) {
        if (softPats.some(p => l.includes(p)) && l.length >= 5 && l.length <= 60) return l;
      }
      return null;
    })();
    const subtextGoodNote = {
      type: 'good',
      text: 'サブテキスト：説明台詞を排し、行間で感情・意図を表現できています。'
        + (subtextHardCount >= 2 ? '特に沈黙・間の使い方（' + subtextHardCount + '箇所）が効果的です。' : '')
        + (subtextSoftCount >= 3 ? '動作・表情によるサブテキスト（' + subtextSoftCount + '箇所）も豊富。' : '')
        + 'この「見せる」姿勢はプロの脚本家の核心的スキルです。'
    };
    if (subtextGoodExample) subtextGoodNote.quote = subtextGoodExample + '\\n↑ 行動・沈黙で感情を表現した好例';
    notes.push(subtextGoodNote);
  }""",
    'subtext-diagnostic-v11')

# ─────────────────────────────────────────────────────────────────
# [7] エンジン v11: 作家性診断の強化（抽象語検出と具体案）
# ─────────────────────────────────────────────────────────────────
do_patch(JS,
    """  } else if (scores['authorial-voice'] <= 2) {
    const authorBadNote = { type: 'warn', text: '作家性：文体の個性・一貫性が弱い。抽象語（「悲しい」「嬉しい」「つらそう」）を全て排し、固有の感覚的ディテール（例：「アスファルトがじわじわと白くなる時間。田中の靴底に、ガムの跡」）に置き換えてください。「うまい脚本」より「独自の声のある脚本」が審査員の記憶に残ります。' };
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
    notes.push(authorBadNote);
  }""",
    """  } else if (scores['authorial-voice'] <= 2) {
    // v11: 抽象語を脚本から探し出し、その行をそのまま引用して具体的改稿案を提示
    const abstractKws2 = ['悲しい', '嬉しい', '怒った', '怒っている', '楽しい', '寂しい', '辛い', '苦しい',
                         '悲しそう', '嬉しそう', '悲しんで', 'つらそう', 'かなしい', '怖そう', '不安そう',
                         '心配そう', '嬉しそうに', '悲しそうに', '悔しそう'];
    const abstractActLine2 = actionLines.find(l => abstractKws2.some(k => l.includes(k)));
    const abstractDlgLine2 = dialogueTexts.find(d => abstractKws2.some(k => d.includes(k)));
    const abstractLine2 = abstractActLine2 || abstractDlgLine2;
    const foundKw2 = abstractLine2 ? (abstractKws2.find(k => abstractLine2.includes(k)) || '感情語') : null;
    const charGuess2 = mainCharName || '田中';

    let authorQuoteStr = null;
    if (abstractLine2 && foundKw2) {
      const isDialogue2 = dialogueTexts.includes(abstractLine2);
      // 感情ごとに具体的な身体的・感覚的置き換えを生成
      const genConcreteReplace = (kw, charName) => {
        if (kw.includes('悲') || kw.includes('かなし')) {
          return charName + '、窓の外を向く。\\n  ガラスに、息の白さ。\\n  動かない。';
        } else if (kw.includes('寂')) {
          return charName + '、椅子を少しだけ引き寄せる。誰もいない隣の席に。';
        } else if (kw.includes('辛') || kw.includes('つら')) {
          return charName + '、書類を一枚だけ折り返す——また、戻す。\\n  （繰り返す）';
        } else if (kw.includes('怒') || kw.includes('苦')) {
          return charName + '、コップをテーブルに置く。\\n  ゆっくり、音を立てずに。\\n  立ち上がる。';
        } else if (kw.includes('嬉') || kw.includes('楽')) {
          return charName + '、廊下を歩く。\\n  三歩で止まる——また歩く。速くなっている。';
        } else if (kw.includes('怖') || kw.includes('不安')) {
          return charName + '、ドアノブに手をかける。\\n  一秒。離す。\\n  また、かける。';
        } else {
          return charName + '、手を止める。窓。\\n  外の音——遠くで、何か。';
        }
      };
      const concreteAfter = genConcreteReplace(foundKw2, charGuess2);
      const quotedLine = isDialogue2
        ? '「' + (abstractLine2.length > 65 ? abstractLine2.slice(0,65)+'…' : abstractLine2) + '」（セリフ）'
        : (abstractLine2.length > 70 ? abstractLine2.slice(0,70)+'…' : abstractLine2) + '（ト書き）';
      authorQuoteStr = '問題の箇所: ' + quotedLine
        + '\\n\\n「' + foundKw2 + '」は抽象語——カメラは撮れません。'
        + '\\n\\n置き換え例（固有の感覚・行動で書く）:'
        + '\\n' + concreteAfter
        + '\\n\\n原則：感情語は一切書かない。感情は行動・物・空間・音で設計する。';
    } else if (!abstractLine2 && !hasVaguePlaceholders && poeticCount === 0) {
      // 抽象語が見つからないが作家性が弱い場合は一般的な指摘
      authorQuoteStr = '（脚本内に明確な感情語・比喩・固有ディテールが少ない）'
        + '\\n\\n書き手の声を出す3つの練習:'
        + '\\n  ① このシナリオにしか出てこない固有名詞・場所・物を1つ追加する'
        + '\\n  ② 最も感情的なシーンから抽象語を全て削除し、行動だけで書き直す'
        + '\\n  ③ 「○○のような」という比喩を1箇所作る（作家の視点が生まれる）';
    } else if (hasVaguePlaceholders) {
      const vagueKws2 = ['○○', '××', '△△', '□□', '＊＊'];
      for (const l of nonEmpty) {
        if (vagueKws2.some(k => l.includes(k))) {
          authorQuoteStr = l + ' [プレースホルダー]'
            + '\\n\\n↳ 「○○」「××」を具体的な固有名詞に変えてください。'
            + '\\n   具体性こそが作家性です。架空でも「田端駅」「青い傘」「1998年製のラジカセ」のように。';
          break;
        }
      }
    }
    const authorBadNote = {
      type: 'warn',
      text: '作家性：文体の個性・一貫性が弱い。'
        + (hasVaguePlaceholders ? 'プレースホルダー（○○・××）が残っています。完成度を下げる最大要因です。' : '')
        + (poeticCount === 0 ? '比喩・詩的表現が0箇所。' : '')
        + (repeatedMotifs < 2 ? 'モチーフの反復なし（作品の統一感が出ない）。' : '')
        + '\\n抽象語（「悲しい」「嬉しい」「つらそう」）を全て削除し、'
        + '固有の感覚的ディテール——音・質感・距離・時間・物の名前——に置き換えてください。'
        + '「うまい脚本」より「独自の声のある脚本」が審査員の記憶に残ります。'
    };
    if (authorQuoteStr) authorBadNote.quote = authorQuoteStr;
    notes.push(authorBadNote);
  }""",
    'authorial-voice-diagnostic-v11')

# ─────────────────────────────────────────────────────────────────
# [8] エンジン v11: ト書き診断の強化（実際の長い行を引用）
# ─────────────────────────────────────────────────────────────────
do_patch(JS,
    """  if (scores['direction-clarity'] <= 2) {
    const longActSample = (() => {
      const longs = actionLines.filter(l => l.length > 90);
      if (!longs.length) return null;
      const s = longs.reduce((a, b) => a.length > b.length ? a : b);
      return s.length > 100 ? s.slice(0, 100) + '…' : s;
    })();
    const noteObjDir = { type: 'bad', text: 'ト書き：90字超が' + longActionCount + '箇所。鉄則①「見えるもの・聞こえるもの」のみ書く ②1行=1カット ③感情・内面・副詞は全削除。例: 「田中は悲しそうにゆっくりと歩き出した」→「田中、立つ。窓。（沈黙）」に圧縮。' };
    if (longActSample) noteObjDir.quote = longActSample;
    notes.push(noteObjDir);
  } else if (scores['direction-clarity'] >= 4 && actionLines.length >= 3) {
    notes.push({ type: 'good', text: 'ト書き：簡潔で映像的なト書きが書けています。平均' + Math.round(avgActionLen) + '字と適切な長さです。役者に「演じる余白」を与えるプロの書き方ができています。' });
  }""",
    """  if (scores['direction-clarity'] <= 2) {
    // v11: 最も長いト書きを実際に引用し、圧縮後のイメージを自動生成
    const longActLines = actionLines.filter(l => l.length > 90).sort((a,b) => b.length-a.length);
    const longActSample = longActLines[0] || null;

    // 長いト書きを自動圧縮（副詞・感情語を削除して短縮）
    const autoCompress = (line) => {
      if (!line) return '田中、立つ。窓。';
      // 副詞・感情語・修飾語を削除
      const compressed = line
        .replace(/は非常に|はゆっくりと|はゆっくり|はゆっくりと|とても|非常に|とっても|深く|しっかりと|強く/g, '')
        .replace(/（[^）]{10,}）/g, '')  // 長い括弧内を削除
        .replace(/[、。]+/g, '。')
        .trim();
      // 最初の主語+動詞パターンを抽出（30字以内）
      const short = compressed.slice(0, 30).split('。')[0];
      return short ? short + '。' : compressed.slice(0,25) + '…';
    };
    const compressedEx = longActSample ? autoCompress(longActSample) : '田中、立つ。窓。（沈黙）';

    const noteObjDir = {
      type: 'bad',
      text: 'ト書き：90字超が' + longActionCount + '箇所（最長: ' + (longActSample ? longActSample.length : 0) + '字）。'
        + '脚本ト書きの3原則：'
        + '①「カメラで撮れるもの・マイクで収録できるもの」のみ書く '
        + '②1ト書き=1動作・1状態（1〜2文、30〜50字） '
        + '③感情・内面・副詞（「ゆっくりと」「悲しそうに」）は一切書かない。'
        + '感情はキャスト・スタッフが解釈します。'
    };
    if (longActSample) {
      noteObjDir.quote = '問題のト書き（' + longActSample.length + '字）:\\n'
        + (longActSample.length > 100 ? longActSample.slice(0,100)+'…' : longActSample)
        + '\\n\\n↳ 圧縮イメージ（感情語・副詞を削除）:\\n  ' + compressedEx
        + '\\n\\n  目安：原文の「半分以下の字数」に収まるまで削り続けてください。';
    }
    notes.push(noteObjDir);
  } else if (scores['direction-clarity'] >= 4 && actionLines.length >= 3) {
    // v11: 良いト書きの実例を引用
    const goodActExample = (() => {
      const shortKws = ['立つ', '座る', '歩く', '止まる', '振り返る', '見る', '窓', '沈黙', '間', '目が', '手が'];
      const shortActions = actionLines.filter(l => l.length <= 40 && l.length >= 5 && shortKws.some(k => l.includes(k)));
      return shortActions.length > 0 ? shortActions[0] : null;
    })();
    const dirGoodNote = {
      type: 'good',
      text: 'ト書き：簡潔で映像的なト書きが書けています。'
        + '平均' + Math.round(avgActionLen) + '字と適切な長さです。'
        + (shortActionRatio >= 0.5 ? '短いト書きが多く、テンポが良好。' : '')
        + '役者に「演じる余白」を与えるプロの書き方ができています。'
    };
    if (goodActExample) dirGoodNote.quote = goodActExample + '\\n↑ 1動作=1行の映像的ト書きの好例';
    notes.push(dirGoodNote);
  }""",
    'direction-diagnostic-v11')

# ─────────────────────────────────────────────────────────────────
# [9] エンジン v11: 感情インパクト診断の強化
# ─────────────────────────────────────────────────────────────────
do_patch(JS,
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
    notes.push(noEmotionNote);
  }""",
    """  } else if (scores['emotional-impact'] <= 2) {
    // v11: 平板な会話交換を脚本から引用し、感情設計の具体的指示を提供
    const noEmotionNote = {
      type: 'bad',
      text: '作品力：感情密度' + Math.round(emotionDensity * 100) + '%（低め）・'
        + '強い感情の瞬間' + emotionStrongCount + '箇所のみ。'
        + (!hasClimax ? '最大の感情的クライマックスが検出されません。' : '')
        + (!hasTwist ? '物語の転換・逆転要素が少ない。' : '')
        + '\\n設計指針：'
        + '① クライマックス = 主人公が「最も大切なもの」を犠牲にする瞬間を配置'
        + '② その瞬間を台詞ゼロ・行動だけで描く'
        + '③ 全シーンの感情強度に起伏を付ける（弱→中→強→最強→余韻）'
    };
    // 平板な交換を探す
    const blandExchangePats = ['なるほど', 'そうです', 'わかりました', 'そうか', 'はい', 'ええ', 'うん', 'そうですね', 'まあ', 'ちょっと', 'そうね', 'そうだね', '普通', 'わかった'];
    let foundFlatExchange = null;
    for (let _fi = 0; _fi < Math.min(dialogueTexts.length - 1, 25); _fi++) {
      const _fa = dialogueTexts[_fi], _fb = dialogueTexts[_fi+1];
      if (_fa && _fb && _fa.length > 1 && _fa.length < 35 && _fb.length > 1 && _fb.length < 35) {
        if (blandExchangePats.some(p => _fa.includes(p) || _fb.includes(p))) {
          foundFlatExchange = '「' + _fa + '」\\n「' + _fb + '」';
          break;
        }
      }
    }
    // 平板な交換が見つからない場合、最初の2セリフを使う
    if (!foundFlatExchange && dialogueTexts.length >= 2) {
      const _fa = dialogueTexts[0], _fb = dialogueTexts[1];
      if (_fa && _fb && _fa.length < 45 && _fb.length < 45) {
        foundFlatExchange = '「' + _fa + '」\\n「' + _fb + '」';
      }
    }
    const emoCharGuess = mainCharName || '田中';
    if (foundFlatExchange) {
      noEmotionNote.quote = '平板な交換例:\\n' + foundFlatExchange
        + '\\n\\n↳ この会話に「目的の衝突」を埋め込む改稿例:'
        + '\\n  ' + emoCharGuess + '「（ためらいながら）……ずっと、待ってた」'
        + '\\n  （相手、視線を外す。窓。）'
        + '\\n\\n  → 「感情を言わず、行動と間で見せる」設計に変換してください';
    }
    notes.push(noEmotionNote);
  }""",
    'emotional-impact-diagnostic-v11')

# ─────────────────────────────────────────────────────────────────
# [10] エンジン v11: テーマ診断の強化
# ─────────────────────────────────────────────────────────────────
do_patch(JS,
    """  if (scores['theme-clarity'] <= 2) {
    const themeBadNote = { type: 'warn', text: 'テーマ：「この作品が言いたいこと」を一言（○○であっても△△できる、等）で言えますか？テーマは台詞で語らせず、①キャラの行動パターン ②繰り返し出てくるモチーフ ③構造の対比 に埋め込んでください。現在のテーマ的深度: ' + thematicDiversity + '概念。' };
    // テーマ語がある場合は引用し、改善提案も追加
    if (itemDetails['theme-clarity'] && itemDetails['theme-clarity'].quote) {
      themeBadNote.quote = itemDetails['theme-clarity'].quote + '\\n↳ テーマを直接語らせず、この台詞を削除してキャラクターの行動で同じ意味を伝えてください';
    } else {
      // No theme quote found — show what's missing
      themeBadNote.quote = '（テーマを示す台詞・描写が検出されません）\\n↳ 「この作品のテーマは？」を一言で書き出してから、そのテーマを主人公の行動に反映させてください';
    }
    notes.push(themeBadNote);
  } else if (scores['theme-clarity'] >= 4) {
    const themeGoodNote = { type: 'good', text: 'テーマ：作品全体を貫くテーマが明確で、キャラクターの行動・対立がテーマを体現しています。' + (repeatedMotifs >= 3 ? '繰り返しのモチーフ（' + repeatedMotifs + '語）がテーマの統一感を作っています。' : '') };
    if (itemDetails['theme-clarity'] && itemDetails['theme-clarity'].quote) themeGoodNote.quote = itemDetails['theme-clarity'].quote;
    notes.push(themeGoodNote);
  }""",
    """  if (scores['theme-clarity'] <= 2) {
    // v11: テーマ語が台詞に出てくる場合は「語らせている」ことを具体的に指摘
    const themeKwsInDialogue = ['愛', '正義', '孤独', '自由', '家族', '復讐', '赦し', '成長', '友情', '嘘', '真実', '信頼', '希望', '絶望', '幸せ', '運命'];
    const themeFoundDlg2 = dialogueTexts.find(d => themeKwsInDialogue.some(k => d.includes(k)) && d.length > 3);
    const themeFoundKw2 = themeFoundDlg2 ? (themeKwsInDialogue.find(k => themeFoundDlg2.includes(k)) || null) : null;

    const themeBadNote = {
      type: 'warn',
      text: 'テーマ：「この作品が言いたいこと」を一言で言えますか？'
        + (thematicDiversity > 0 ? 'テーマ的語彙は' + thematicDiversity + '概念検出されましたが、' : 'テーマ語が少ない。')
        + (themeFoundDlg2 ? '「' + themeFoundKw2 + '」という言葉を台詞で直接語らせています。' : '')
        + '\\n埋め込み方の3原則：'
        + '① キャラクターの行動パターン（何を選び、何を避けるか）でテーマを示す'
        + ' ② 同じモチーフ（物・場所・セリフのパターン）を繰り返してテーマを強調'
        + ' ③ 構造の対比（主人公の変化前/後で逆の行動をとる）でテーマを体現させる'
        + '\\n「テーマとは、主人公が最後に選択する行動に内包されているものです」'
    };
    if (themeFoundDlg2 && themeFoundKw2) {
      themeBadNote.quote = 'テーマ語「' + themeFoundKw2 + '」が台詞に出現:\\n'
        + '「' + (themeFoundDlg2.length > 65 ? themeFoundDlg2.slice(0,65)+'…' : themeFoundDlg2) + '」'
        + '\\n\\n↳ この台詞を削除し、代わりに主人公の行動でテーマを示してください。'
        + '\\n  例：「愛」を語る台詞→ 主人公が誰かのために何かを諦める行動シーンを追加';
    } else {
      themeBadNote.quote = '（テーマを示す台詞・描写が検出されません）'
        + '\\n\\n↳ 手順：'
        + '\\n  ① 紙にテーマを一文で書く（例：「傷ついた人間でも他者を救える」）'
        + '\\n  ② そのテーマに「逆らう行動」を第1幕の主人公にとらせる'
        + '\\n  ③ そのテーマを「受け入れる行動」を第3幕の主人公にとらせる'
        + '\\n  ④ テーマは一度も台詞で言わない';
    }
    notes.push(themeBadNote);
  } else if (scores['theme-clarity'] >= 4) {
    // v11: テーマの具体的引用と褒め方を強化
    const themeGoodNote = {
      type: 'good',
      text: 'テーマ：作品全体を貫くテーマが明確で、キャラクターの行動・対立がテーマを体現しています。'
        + (repeatedMotifs >= 3 ? '繰り返しのモチーフ（' + repeatedMotifs + '語）がテーマの統一感を作っています。' : '')
        + (hasNeed && hasArc ? 'キャラクターのNeedとアークがテーマと連動した理想的設計。' : '')
        + (thematicDiversity >= 3 ? 'テーマの多面性（' + thematicDiversity + '概念）があり、読後感に深みがあります。' : '')
    };
    if (itemDetails['theme-clarity'] && itemDetails['theme-clarity'].quote) {
      themeGoodNote.quote = itemDetails['theme-clarity'].quote + '\\n↑ テーマを体現する台詞の好例';
    }
    notes.push(themeGoodNote);
  }""",
    'theme-diagnostic-v11')

# ─────────────────────────────────────────────────────────────────
# [11] エンジン v11: 対話ダイナミクス診断を強化
# ─────────────────────────────────────────────────────────────────
do_patch(JS,
    """  if (scores['dialogue-dynamics'] >= 4) {
    const _iakws = ['知らない', '秘密', '隠している', 'まだ言っていない', 'バレる', '気づいていない'];
    const _iaNote = _iakws.some(kw => text.includes(kw)) ? '情報の非対称性によるサスペンスも効果的。' : '';
    notes.push({ type: 'good', text: '対話の引力：キャラ間の緊張・欲求の衝突が会話に宿っています（緊張要素' + tensionCount + '箇所）。' + _iaNote });
  } else if (scores['dialogue-dynamics'] <= 2 && totalDialogueLines >= 4) {
    const blandKws2 = ['なるほど', 'そうですね', 'わかりました', 'そうか', 'お疲れさま', 'はい', 'うん'];
    const blandDlg2 = dialogueTexts.find(d => blandKws2.some(k => d.includes(k)) && d.length < 30);
    // Find a bland exchange and also the best available tension pair
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
    notes.push(dynWarnNote2);
  }""",
    """  if (scores['dialogue-dynamics'] >= 4) {
    // v11: 実際の緊張台詞を引用して褒める
    const tensionExampleForNote = (() => {
      const tkws2 = ['違う', 'なぜ', 'どうして', '嘘', '許さない', 'やめて', '離して', '帰れ', '頼む', 'ふざけるな'];
      for (let _ti = 0; _ti < Math.min(nonEmpty.length-1, 40); _ti++) {
        const cur = nonEmpty[_ti], nxt = nonEmpty[_ti+1] || '';
        if (tkws2.some(k => cur.includes(k) || nxt.includes(k)) && cur.length > 2 && nxt.length > 2) {
          return cur.slice(0,50) + (cur.length>50?'…':'') + '\\n' + nxt.slice(0,50) + (nxt.length>50?'…':'');
        }
      }
      return null;
    })();
    const _iakws2 = ['知らない', '秘密', '隠している', 'まだ言っていない', 'バレる', '気づいていない'];
    const _iaNote2 = _iakws2.some(kw => text.includes(kw)) ? '情報の非対称性によるサスペンスも効果的。' : '';
    const dlgGoodNote = {
      type: 'good',
      text: '対話の引力：キャラ間の緊張・欲求の衝突が会話に宿っています（緊張要素' + tensionCount + '箇所）。'
        + _iaNote2
        + (tensionCount >= 4 ? 'このレベルの引力がある会話はコンクールで際立ちます。' : '')
    };
    if (tensionExampleForNote) dlgGoodNote.quote = tensionExampleForNote + '\\n↑ 欲求が衝突する会話の好例';
    notes.push(dlgGoodNote);
  } else if (scores['dialogue-dynamics'] <= 2 && totalDialogueLines >= 4) {
    // v11: 平板な会話を脚本から実際に引用
    const blandKws3 = ['なるほど', 'そうですね', 'わかりました', 'そうか', 'お疲れさま', 'はい', 'うん', 'そうね', 'そうだね', 'まあ'];
    const blandDlg3 = dialogueTexts.find(d => blandKws3.some(k => d.includes(k)) && d.length < 30 && d.length > 1);
    // 平板交換ペアを探す
    let blandPair = null;
    for (let _bpi = 0; _bpi < Math.min(dialogueTexts.length-1, 30); _bpi++) {
      const _ba = dialogueTexts[_bpi], _bb = dialogueTexts[_bpi+1];
      if (_ba && _bb && _ba.length > 1 && _ba.length < 25 && _bb.length > 1 && _bb.length < 25
          && blandKws3.some(k => _ba.includes(k) || _bb.includes(k))) {
        blandPair = '「' + _ba + '」\\n「' + _bb + '」';
        break;
      }
    }
    // 緊張の萌芽ペア
    const _tensionPairForNote2 = (() => {
      const _tkws2 = ['なぜ', 'どうして', '違う', '嘘', '待って', '知らない', 'やめ', '頼む', '聞いて', '教えて'];
      for (let _ti2 = 0; _ti2 < Math.min(nonEmpty.length-1, 30); _ti2++) {
        const cur2 = nonEmpty[_ti2], nxt2 = nonEmpty[_ti2+1] || '';
        if (_tkws2.some(k => cur2.includes(k) || nxt2.includes(k)) && cur2.length > 2 && nxt2.length > 2) {
          return cur2.slice(0,48) + (cur2.length>48?'…':'') + '\\n' + nxt2.slice(0,48) + (nxt2.length>48?'…':'');
        }
      }
      return null;
    })();
    const dlgCharA = mainCharName || '田中';
    const dlgCharB = (sortedChars[1] && sortedChars[1][0]) || '花子';
    const dynWarnNote3 = {
      type: 'warn',
      text: '対話の引力：会話に緊張感・欲求の衝突が不足しています（緊張要素' + tensionCount + '箇所）。'
        + '設計チェックリスト：'
        + '① このシーンでAキャラが「欲しいもの・避けたいもの」は何か？'
        + '② BキャラがAの欲求を「阻む・隠す・逆利用」しているか？'
        + '③ 会話が終わったとき、力関係・情報の優位が変わったか？'
        + '——両方答えられない会話は「情報交換」にすぎません。'
    };
    if (blandPair) {
      dynWarnNote3.quote = '平板な交換例:\\n' + blandPair
        + '\\n\\n↳ 欲求を設計した改稿例:\\n  '
        + dlgCharA + '「……例の件、答えは？」（欲求：返事を引き出す）\\n  '
        + dlgCharB + '「お茶、飲む？」（欲求：話題を逸らす）\\n  '
        + dlgCharA + '「いらない。聞かせてくれ」\\n  → 目的の衝突が会話の引力を生む';
    } else if (_tensionPairForNote2) {
      dynWarnNote3.quote = '緊張の萌芽が見られる箇所:\\n' + _tensionPairForNote2
        + '\\n\\n↳ さらに欲求の衝突を強調してください。'
        + '\\n  各キャラの「このシーンでの目的」を書き出してから台詞を書き直す。';
    }
    notes.push(dynWarnNote3);
  }""",
    'dialogue-dynamics-diagnostic-v11')

# ─────────────────────────────────────────────────────────────────
# [12] エンジン v11: キャラクター固有性診断の強化
# ─────────────────────────────────────────────────────────────────
do_patch(JS,
    """  if (scores['char-unique'] >= 4) {
    notes.push({ type: 'good', text: 'キャラクター固有性：各キャラクターが固有の声・行動パターンを持っています。' + (charVocabUniqueness > 0.4 ? 'セリフの語彙差異が大きく（差異スコア' + Math.round(charVocabUniqueness * 100) + '%）、「誰のセリフか」が一目でわかります。' : '') });
  } else if (scores['char-unique'] <= 2 && uniqueChars >= 2) {
    const charUniqueNote = { type: 'warn', text: 'キャラクター固有性：' + uniqueChars + '人のキャラクターの声が似ています（語彙差異スコア: ' + Math.round(charVocabUniqueness*100) + '%）。各キャラに「語彙レベル・話すスピード・口癖・禁句（絶対言わない言葉）・間の長さ」を設定した「声の設計書」を作り、全セリフを書き直してください。' };
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
    notes.push(charUniqueNote);
  }""",
    """  if (scores['char-unique'] >= 4) {
    // v11: 実際のキャラクター別台詞を並べて語彙差を示す
    const charUniqueGoodNote = {
      type: 'good',
      text: 'キャラクター固有性：各キャラクターが固有の声・行動パターンを持っています。'
        + (charVocabUniqueness > 0.4 ? '語彙差異スコア' + Math.round(charVocabUniqueness * 100) + '%——誰のセリフか一目でわかります。' : '語彙差が感じられます。')
        + (uniqueChars >= 3 ? uniqueChars + '人が個性的に機能しています。' : '')
    };
    if (sortedChars.length >= 2) {
      const _ca = sortedChars[0][0], _cb = sortedChars[1][0];
      const _da = (dialogueByChar[_ca]||[])[0];
      const _db = (dialogueByChar[_cb]||[])[0];
      if (_da && _db && _da !== _db) {
        charUniqueGoodNote.quote = _ca + '「' + (_da.length > 40 ? _da.slice(0,40)+'…' : _da) + '」'
          + '\\n' + _cb + '「' + (_db.length > 40 ? _db.slice(0,40)+'…' : _db) + '」'
          + '\\n↑ 2つのセリフに「声の差異」が感じられます。';
      }
    }
    notes.push(charUniqueGoodNote);
  } else if (scores['char-unique'] <= 2 && uniqueChars >= 2) {
    // v11: 上位2キャラの実際のセリフを並列比較して「似ている」ことを可視化
    const charUniqueNote2 = {
      type: 'warn',
      text: 'キャラクター固有性：' + uniqueChars + '人のキャラクターの声が類似しています'
        + '（語彙差異スコア: ' + Math.round(charVocabUniqueness*100) + '%）。'
        + '「声の設計書」を作成してから全セリフを書き直してください：'
        + '各キャラの設計項目 → 語彙レベル（難しい/普通/簡単）・'
        + '口癖・禁句（絶対言わない言葉）・会話のリズム（短い/長い）・'
        + '感情表現の方法（直接的/遠回し/行動で）'
    };
    if (sortedChars.length >= 2) {
      const _cua = sortedChars[0][0], _cub = sortedChars[1][0];
      const _dua = (dialogueByChar[_cua]||[]);
      const _dub = (dialogueByChar[_cub]||[]);
      // 複数の台詞を比較して類似性を見せる
      const _dlgsA = _dua.slice(0, 2).map(d => _cua + '「' + (d.length > 33 ? d.slice(0,33)+'…' : d) + '」').join('\\n');
      const _dlgsB = _dub.slice(0, 2).map(d => _cub + '「' + (d.length > 33 ? d.slice(0,33)+'…' : d) + '」').join('\\n');
      if (_dlgsA && _dlgsB) {
        charUniqueNote2.quote = _dlgsA + '\\n' + _dlgsB
          + '\\n\\n↳ 「同じ脚本家が書いた」印象になっていませんか？'
          + '\\n  改善のヒント：' + _cua + 'が「絶対言わない言葉」を1つ決め、'
          + _cub + 'はその言葉しか使わないように設計する。';
      } else if (_dua.length > 0) {
        charUniqueNote2.quote = _cua + '「' + (_dua[0].length > 50 ? _dua[0].slice(0,50)+'…' : _dua[0]) + '」'
          + '\\n→ このキャラクターを「識別できる声」にするには何が必要ですか？';
      }
    }
    notes.push(charUniqueNote2);
  }""",
    'char-unique-diagnostic-v11')

# ─────────────────────────────────────────────────────────────────
# [13] UI v11: 弱点タブの引用表示を改善
# ─────────────────────────────────────────────────────────────────
do_patch(JS,
    """                ${weakQuote2 ? `<div class=\"sr-cite-block cite-bad\" style=\"border-radius:0 0 6px 6px;margin:0 10px 8px;margin-top:0\">
                  <div class=\"sr-cite-label\"><i class=\"fas fa-highlighter\" style=\"font-size:7px\"></i>問題箇所 — 脚本より</div>
                  <div class=\"sr-cite-text\">${esc(weakQuote2)}</div>
                  <div class=\"sr-cite-arrow\"><i class=\"fas fa-arrow-right\" style=\"font-size:8px\"></i>この箇所が主要改稿対象です</div>
                </div>` : ''}""",
    """                ${weakQuote2 ? `<div class=\"sr-cite-block cite-bad\" style=\"border-radius:0;margin:0;border-left:none;border-right:none;border-bottom:none\">
                  <div class=\"sr-cite-label\"><i class=\"fas fa-code\" style=\"font-size:7px\"></i>脚本引用 — 問題の箇所</div>
                  <div class=\"sr-cite-text\">${esc(weakQuote2)}</div>
                  <div class=\"sr-cite-arrow\"><i class=\"fas fa-arrow-right\" style=\"font-size:8px\"></i>この台詞・ト書きを改稿してください</div>
                </div>` : ''}""",
    'weakness-cite-ui-v11')

# ─────────────────────────────────────────────────────────────────
# [14] UI v11: 診断ノートの引用ブロックを改善
# ─────────────────────────────────────────────────────────────────
do_patch(JS,
    """                  ${n.quote ? `<div class=\"sr-cite-block ${citeClass}\" style=\"margin-top:6px\">
                    <div class=\"sr-cite-label\"><i class=\"fas ${citeIcon}\" style=\"font-size:7px\"></i>${citeLabel}</div>
                    <div class=\"sr-cite-text\">${esc(n.quote)}</div>
                    ${n.type === 'bad' ? '<div class=\"sr-cite-arrow\"><i class=\"fas fa-arrow-right\" style=\"font-size:8px\"></i>この箇所を改稿してください</div>' : ''}
                  </div>` : ''}""",
    """                  ${n.quote ? `<div class=\"sr-cite-block ${citeClass}\" style=\"margin-top:7px\">
                    <div class=\"sr-cite-label\"><i class=\"fas ${citeIcon}\" style=\"font-size:7px;margin-right:3px\"></i>${citeLabel}</div>
                    <div class=\"sr-cite-text\">${esc(n.quote)}</div>
                    ${n.type === 'bad' ? '<div class=\"sr-cite-arrow\"><i class=\"fas fa-arrow-right\" style=\"font-size:8px;margin-right:4px\"></i>この台詞・ト書きを改稿してください</div>' : ''}
                    ${n.type === 'warn' ? '<div class=\"sr-cite-arrow\" style=\"color:#b45309;border-top-color:rgba(217,119,6,.2)\"><i class=\"fas fa-lightbulb\" style=\"font-size:8px;margin-right:4px\"></i>改稿のヒントにしてください</div>' : ''}
                  </div>` : ''}""",
    'diag-note-cite-ui-v11')

# ─────────────────────────────────────────────────────────────────
# [15] UI v11: ルーブリックアイテムの引用ブロック改善
# ─────────────────────────────────────────────────────────────────
do_patch(JS,
    """            ${autoQuote ? `
            <div class=\"sr-cite-block ${scoreVal<=2?'cite-bad':scoreVal>=4?'cite-good':'cite-warn'}\" style=\"margin-top:8px\">
              <div class=\"sr-cite-label\"><i class=\"fas ${scoreVal<=2?'fa-highlighter':scoreVal>=4?'fa-quote-left':'fa-search'}\" style=\"font-size:7px\"></i>${scoreVal<=2?'問題箇所 — 脚本引用':scoreVal>=4?'好例 — 脚本引用':'参照 — 脚本引用'}</div>
              <div class=\"sr-cite-text\" style=\"color:${scoreVal<=2?'#7f1d1d':scoreVal>=4?'#14532d':'#78350f'}\">${esc(autoQuote)}</div>
              ${scoreVal<=2 ? '<div class=\"sr-cite-arrow\"><i class=\"fas fa-arrow-right\" style=\"font-size:8px\"></i>改稿対象箇所</div>' : ''}
            </div>` : ''}""",
    """            ${autoQuote ? `
            <div class=\"sr-cite-block ${scoreVal<=2?'cite-bad':scoreVal>=4?'cite-good':'cite-warn'}\" style=\"margin-top:9px\">
              <div class=\"sr-cite-label\">
                <i class=\"fas ${scoreVal<=2?'fa-code':scoreVal>=4?'fa-quote-left':'fa-magnifying-glass'}\" style=\"font-size:7px;margin-right:3px\"></i>
                ${scoreVal<=2?'問題箇所 — 脚本より':scoreVal>=4?'好例 — 脚本より':'参照 — 脚本より'}
              </div>
              <div class=\"sr-cite-text\">${esc(autoQuote)}</div>
              ${scoreVal<=2 ? '<div class=\"sr-cite-arrow\"><i class=\"fas fa-arrow-right\" style=\"font-size:8px;margin-right:4px\"></i>この箇所を改稿対象として確認してください</div>' : ''}
            </div>` : ''}""",
    'rubric-cite-ui-v11')

# ─────────────────────────────────────────────────────────────────
# [16] エンジン v11: Want/Need 診断のさらなる深化
# ─────────────────────────────────────────────────────────────────
do_patch(JS,
    """  if (scores['protag-want-need'] <= 2) {
    const wantNeedBad = { type: 'bad', text: 'Want/Need設計：' + (mainCharName ? '「' + mainCharName + '」' : '主人公') + 'の欲求設計が弱い。◆Want（外的目標）= 主人公が求めるもの（目に見える目標）。◆Need（内的必要性）= 主人公が本当は必要なもの（内面の成長・気づき）。この2つが対立するとき最強のドラマが生まれます。' };
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
    notes.push(wantNeedBad);
  } else if (scores['protag-want-need'] >= 4) {
    const wantNeedGood = { type: 'good', text: 'Want/Need設計：' + (mainCharName ? '「' + mainCharName + '」' : '主人公') + 'の動機設計が優秀です。外的欲求と内的必要性が明確で、読者の感情移入を促す設計になっています。' };
    if (itemDetails['protag-want-need'] && itemDetails['protag-want-need'].quote) {
      wantNeedGood.quote = itemDetails['protag-want-need'].quote;
    }
    notes.push(wantNeedGood);
  }""",
    """  if (scores['protag-want-need'] <= 2) {
    // v11: 主人公の台詞からWant/Needを探し、両方が揃っているか・衝突しているかを評価
    const wantNeedBad = {
      type: 'bad',
      text: 'Want/Need設計：'
        + (mainCharName ? '「' + mainCharName + '」' : '主人公')
        + 'の欲求設計が弱い。'
        + (!hasWant ? 'Want（外的目標: 何を手に入れたいか/達成したいか）が不明瞭。' : '')
        + (!hasNeed ? 'Need（内的必要性: 本当は何が必要か/何を乗り越えるべきか）が見えない。' : '')
        + '\\n設計の核心：WantとNeedが「相反する」とき最強のドラマが生まれます。'
        + '（例：Want=会社で出世したい ↔ Need=家族との絆を取り戻すこと）'
        + '\\n冒頭の1〜3シーンで、行動によってWantを示してください（台詞で言わせない）。'
    };
    if (mainCharName && dialogueByChar[mainCharName]) {
      const mainDlgs2 = dialogueByChar[mainCharName];
      const goalKws2 = ['したい', 'なりたい', 'ほしい', '目指', '望む', '欲し', '手に入れ', '夢', '目標', '勝ちた', '証明', '取り戻', '探し', '助け', '守'];
      const needKws2 = ['本当は', '実は', '怖い', '弱い', '一人', '誰もいない', '孤独', '許せ', '許さ', '諦め', '傷', '後悔', '罪悪', 'ごめん', 'すまない'];
      const goalDlg2 = mainDlgs2.find(d => goalKws2.some(k => d.includes(k)));
      const needDlg2 = mainDlgs2.find(d => needKws2.some(k => d.includes(k)));
      if (goalDlg2 && needDlg2 && goalDlg2 !== needDlg2) {
        wantNeedBad.quote = 'Want候補の台詞: ' + mainCharName + '「' + (goalDlg2.length > 48 ? goalDlg2.slice(0,48)+'…' : goalDlg2) + '」'
          + '\\nNeed候補の台詞: ' + mainCharName + '「' + (needDlg2.length > 48 ? needDlg2.slice(0,48)+'…' : needDlg2) + '」'
          + '\\n\\n↳ この2つが「衝突する設計」になっていますか？'
          + '\\n  Wantを追うことで、Needに気づくことを妨げる構造が理想です。';
      } else if (goalDlg2) {
        wantNeedBad.quote = 'Want候補の台詞: ' + mainCharName + '「' + (goalDlg2.length > 55 ? goalDlg2.slice(0,55)+'…' : goalDlg2) + '」'
          + '\\n\\n↳ Wantは読み取れます。'
          + '\\n  次に設計するのはNeed（内面の傷・本当に必要なもの）。'
          + '\\n  「' + mainCharName + 'は本当は何を怖れているか？何から逃げているか？」を問いかけてください。';
      } else if (mainDlgs2.length > 0) {
        wantNeedBad.quote = mainCharName + 'の台詞（' + mainDlgs2.length + '行）から外的目標が読み取れません。'
          + '\\n最初の台詞: 「' + (mainDlgs2[0].length > 55 ? mainDlgs2[0].slice(0,55)+'…' : mainDlgs2[0]) + '」'
          + '\\n\\n↳ 冒頭1〜2シーンに「' + mainCharName + 'が何かを求めて行動するシーン」を追加してください。'
          + '\\n  例：書類を急いで探す / 誰かに電話をかけ続ける / 何かを強く拒否する——行動でWantを示す。';
      } else if (actionLines.length > 0) {
        // 主人公の台詞がない場合はアクションラインから
        const firstAction = actionLines[0];
        wantNeedBad.quote = '冒頭のト書き: ' + (firstAction.length > 60 ? firstAction.slice(0,60)+'…' : firstAction)
          + '\\n\\n↳ 主人公が「何かを強く欲している」ことが、この行動から読み取れますか？';
      }
    }
    notes.push(wantNeedBad);
  } else if (scores['protag-want-need'] >= 4) {
    // v11: Want/Need設計が優れている場合、その根拠を具体的に引用
    const wantNeedGood = {
      type: 'good',
      text: 'Want/Need設計：'
        + (mainCharName ? '「' + mainCharName + '」' : '主人公')
        + 'の動機設計が優秀です。'
        + (hasWant ? 'Want（外的目標）が明確。' : '')
        + (hasNeed ? 'Need（内的必要性）も読み取れます。' : '')
        + (hasWant && hasNeed && wantIntensity >= 2 && needIntensity >= 2
           ? 'WantとNeedが相反する設計——これがドラマの核心です。' : '')
        + '読者の感情移入を促す優れた設計です。'
    };
    if (itemDetails['protag-want-need'] && itemDetails['protag-want-need'].quote) {
      wantNeedGood.quote = itemDetails['protag-want-need'].quote + '\\n↑ Want（目標）が明確に示された台詞';
    } else if (mainCharName && dialogueByChar[mainCharName]) {
      const allMD = dialogueByChar[mainCharName];
      if (allMD.length > 0) {
        wantNeedGood.quote = mainCharName + '（全' + allMD.length + '行の台詞）\\n'
          + '代表: 「' + (allMD[0].length > 55 ? allMD[0].slice(0,55)+'…' : allMD[0]) + '」'
          + '\\n↑ このキャラクターの動機・目標が伝わります。';
      }
    }
    notes.push(wantNeedGood);
  }""",
    'want-need-diagnostic-v11')

# ─────────────────────────────────────────────────────────────────
# [17] エンジン v11: ペーシング診断の強化（実際のシーン長を引用）
# ─────────────────────────────────────────────────────────────────
do_patch(JS,
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
          // Show scene heading + first action line of that scene for context
          const sceneHeading = sceneLines[longSceneIdx];
          const headingLineIdx = lines.findIndex(l => l.trim() === sceneHeading.trim());
          let nextActionLine = '';
          if (headingLineIdx >= 0) {
            for (let li = headingLineIdx + 1; li < Math.min(headingLineIdx + 8, lines.length); li++) {
              const tl = lines[li].trim();
              if (tl && !tl.match(/^[ぁ-んァ-ン一-鿿\\w]{1,12}[　\\s]*$/) && tl.length > 5) {
                nextActionLine = '\\n' + tl;
                break;
              }
            }
          }
          pacingNote.quote = sceneHeading + nextActionLine + '\\n（このシーン: ' + maxLen + '行 — 目標: 20行以下に圧縮）';
        }
      }
      notes.push(pacingNote);
    } else {
      const pacingNote2 = { type: 'warn', text: 'ペーシング：セリフ比率' + Math.round(dialogueRatio * 100) + '%。' + (dialogueRatio > 0.75 ? 'セリフが多すぎます（' + totalDialogueLines + '行中' + Math.round(dialogueRatio*100) + '%がセリフ）。映像的なシーンを増やし、ト書きでビジュアルを見せてください。' : '場面転換が少ない可能性があります。シーン柱書き（○場所・時間帯）を追加して構造を作ってください。') };
      notes.push(pacingNote2);
    }
  }""",
    """  if (scores['pacing'] <= 2) {
    if (sceneLengths.length >= 2) {
      const avgLen_p = Math.round(sceneLengths.reduce((a, b) => a + b, 0) / sceneLengths.length);
      const maxLen_p = Math.max(...sceneLengths);
      const minLen_p = Math.min(...sceneLengths);
      const contrast_p = maxLen_p / Math.max(1, minLen_p);
      let pacingText = 'ペーシング：シーン平均' + avgLen_p + '行（最長' + maxLen_p + '行 / 最短' + minLen_p + '行 / コントラスト比' + Math.round(contrast_p) + '倍）。';
      if (avgLen_p > 35) {
        pacingText += '\\n1シーンが長すぎます（目安20行以下）。各シーンに問いかけ：「入る前と後で何かが変わったか？」変化がなければカットまたは他のシーンと合流を。';
        pacingText += '\\n1シーン=1目的・1変化・1感情の上昇/下降。';
      } else if (avgLen_p < 3) {
        pacingText += '\\n各シーンが短すぎます。シーンを膨らませるか、近いシーンを統合してください。';
      }
      if (dialogueRatio > 0.75) {
        pacingText += '\\nセリフ比率' + Math.round(dialogueRatio*100) + '%（過多）。映像的なト書きシーンを追加してください。';
      }
      const pacingNote_v11 = { type: 'warn', text: pacingText };
      // v11: 最長シーンの実際の内容（柱書き+最初の台詞+ト書き）を引用
      if (maxLen_p > 20 && sceneLines.length > 0) {
        const longSceneIdx_p = sceneLengths.indexOf(maxLen_p);
        if (longSceneIdx_p >= 0 && longSceneIdx_p < sceneLines.length) {
          const sceneHeading_p = sceneLines[longSceneIdx_p];
          const headingLineIdx_p = lines.findIndex(l => l.trim() === sceneHeading_p.trim());
          const excerptLines = [];
          if (headingLineIdx_p >= 0) {
            excerptLines.push(sceneHeading_p);
            let extractCount = 0;
            for (let _li = headingLineIdx_p + 1; _li < Math.min(headingLineIdx_p + 12, lines.length) && extractCount < 4; _li++) {
              const _tl = lines[_li].trim();
              if (_tl && _tl.length > 2) {
                excerptLines.push(_tl.length > 55 ? _tl.slice(0,55)+'…' : _tl);
                extractCount++;
              }
            }
          }
          if (excerptLines.length > 0) {
            pacingNote_v11.quote = excerptLines.join('\\n')
              + '\\n...（計' + maxLen_p + '行）'
              + '\\n\\n↳ このシーンを「20行以下」に圧縮してください。'
              + '\\n  手順：①各台詞を半分の長さに ②重複する情報を削除 ③シーンの「核心の一瞬」だけを残す';
          }
        }
      }
      notes.push(pacingNote_v11);
    } else {
      const pacingNote2_v11 = {
        type: 'warn',
        text: 'ペーシング：'
          + 'セリフ比率' + Math.round(dialogueRatio * 100) + '%。'
          + (dialogueRatio > 0.75
            ? 'セリフが多すぎます（' + totalDialogueLines + '行中' + Math.round(dialogueRatio*100) + '%）。'
              + '映像的なト書きシーンを追加し、感情を行動で見せてください。'
            : sceneCount < 2
              ? '場面転換がほぼありません。柱書き（1○場所・時間帯）を追加して場面を分割してください。'
              : '現在' + sceneCount + 'シーンです。もう少しシーン数を増やしてみてください。')
      };
      // セリフ過多の場合、最も長い台詞を引用
      if (dialogueRatio > 0.75) {
        const longDlgForPacing = dialogueTexts.filter(d => d.length > 40).sort((a,b) => b.length-a.length)[0];
        if (longDlgForPacing) {
          pacingNote2_v11.quote = '長いセリフの例: 「' + (longDlgForPacing.length > 70 ? longDlgForPacing.slice(0,70)+'…' : longDlgForPacing) + '」'
            + '\\n\\n↳ この台詞を「30字以内」に圧縮し、残りをト書きで表現してください。';
        }
      }
      notes.push(pacingNote2_v11);
    }
  }""",
    'pacing-diagnostic-v11')

# ─────────────────────────────────────────────────────────────────
# [18] エンジン v11: 改稿提案のフォーマット改善（脚本固有性）
# ─────────────────────────────────────────────────────────────────
# suggestions_parts 内の幕構成提案に具体性を追加
do_patch(JS,
    """  if (scores['pacing'] <= 2) {
    suggestions_parts.push('・各シーンに入場（IN）と退場（OUT）を設ける。\\n  改善チェック：「このシーンに入る前と後で、何かが変わったか？」\\n  変化がないシーンは削除または他のシーンに合流させる。\\n  1シーンの目安：原稿用紙1〜2枚（400〜800字）。');
  }""",
    """  if (scores['pacing'] <= 2) {
    // v11: 最長シーンを直接参照してペーシング改善提案
    const longestSceneName = (() => {
      if (sceneLengths.length === 0) return null;
      const maxL = Math.max(...sceneLengths);
      const idx = sceneLengths.indexOf(maxL);
      return idx >= 0 && idx < sceneLines.length ? sceneLines[idx] : null;
    })();
    suggestions_parts.push('・各シーンに「入場目的」と「退場結果」を設けてテンポを上げる。'
      + (longestSceneName ? '\\n  最長シーン → ' + longestSceneName + ' （' + Math.max(...(sceneLengths.length > 0 ? sceneLengths : [0])) + '行）' : '')
      + '\\n  改善チェック：「このシーンに入る前と後で、力関係・情報・感情が変わったか？」'
      + '\\n  変化がなければカットまたは他のシーンと統合。'
      + '\\n  1シーンの目安：最大20行（日本語脚本）。');
  }""",
    'pacing-suggestions-v11')

print(f"\\n=== v11 パッチ完了 ===")
print(f"  OK: {ok_count}, SKIP: {skip_count}")
