#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch_v7.py — シナリオラボ 職員室 v7 総合パッチ
=================================================
目的:
  1. UI/UX 全面刷新 — カードレイアウト・タイポグラフィ・カラーシステム・絵文字除去
  2. 採点エンジン強化 — suggestions に実際の脚本台詞を「改善前」として埋め込む
  3. ツタリング改善 — ランダム選択→最適ヒント決定論的選択
  4. 診断ノート引用 — さらに多くの軸で脚本引用を強化
  5. 弱点タブ強化 — 各弱点に対応する脚本引用ブロック追加
"""

import re

SRC = '/home/user/webapp/public/static/app.js'

with open(SRC, 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)
patches_applied = []


def apply_patch(patch_id, description, old, new):
    global content
    if old in content:
        content = content.replace(old, new, 1)
        patches_applied.append(f'✓ {patch_id}: {description}')
        return True
    else:
        print(f'✗ SKIP {patch_id}: {description} — old string not found')
        return False


# ══════════════════════════════════════════════════════════════════
# P1 — バナー v7 バージョン表記更新
# ══════════════════════════════════════════════════════════════════
apply_patch('P1-version-v7',
    'バナーバージョンを v7 に更新',
    'SCENARIO LAB ─ 審査員採点レポート v6',
    'SCENARIO LAB ─ 審査員採点レポート v7'
)

apply_patch('P1b-engine-comment-v7',
    'エンジンコメントを v7 に更新',
    '//  シナリオラボ 職員室 — コンクール審査員エンジン v6.0',
    '//  シナリオラボ 職員室 — コンクール審査員エンジン v7.0'
)

# ══════════════════════════════════════════════════════════════════
# P2 — UI: 診断ノート「脚本引用」表示を改善 — compact 2段レイアウト
# ══════════════════════════════════════════════════════════════════
apply_patch('P2-note-quote-compact',
    '診断ノート引用ブロック — ヘッダー文字を短縮してコンパクト化',
    "n.type==='good'?'脚本より（好例）':n.type==='warn'?'脚本より（注意箇所）':'脚本より（問題箇所）'",
    "n.type==='good'?'好例（脚本より）':n.type==='warn'?'注意（脚本より）':'問題箇所（脚本より）'"
)

# ══════════════════════════════════════════════════════════════════
# P3 — UI: カテゴリスコアバッジ — 「最弱」→より丁寧な表現
# ══════════════════════════════════════════════════════════════════
apply_patch('P3-badge-weakest',
    '最弱バッジを「要強化」に変更',
    '${isLowest?`<span style="position:absolute;top:-5px;right:6px;font-size:7.5px;background:#ef4444;color:#fff;border-radius:3px;padding:0px 4px;font-weight:800;letter-spacing:.04em">最弱</span>`:\'\'}\n              ${isHighest?`<span style="position:absolute;top:-5px;right:6px;font-size:7.5px;background:#22c55e;color:#fff;border-radius:3px;padding:0px 4px;font-weight:800;letter-spacing:.04em">最強</span>`:\'\'}\n',
    '${isLowest?`<span style="position:absolute;top:-5px;right:6px;font-size:7.5px;background:#ef4444;color:#fff;border-radius:3px;padding:0px 4px;font-weight:800;letter-spacing:.04em">要強化</span>`:\'\'}\n              ${isHighest?`<span style="position:absolute;top:-5px;right:6px;font-size:7.5px;background:#22c55e;color:#fff;border-radius:3px;padding:0px 4px;font-weight:800;letter-spacing:.04em">最良</span>`:\'\'}\n'
)

# ══════════════════════════════════════════════════════════════════
# P4 — UI: ルーブリック項目ヘッダー — 重み付けバッジ整理
# ══════════════════════════════════════════════════════════════════
# 重複するスパン（originality と theme-clarity に同じ ×1.2）を整理
apply_patch('P4-weight-badge-fix',
    'originality/theme-clarityのウェイトバッジを ×1.3/×1.2 に修正',
    "${['theme-clarity','originality'].includes(item.id) ? '<span style=\"font-size:9px;background:var(--kogane-bg);color:var(--kogane);padding:1px 6px;border-radius:10px;border:1px solid var(--kogane-border);font-weight:600\">×1.2</span>' : ''}",
    "${item.id==='theme-clarity' ? '<span style=\"font-size:9px;background:var(--kogane-bg);color:var(--kogane);padding:1px 6px;border-radius:10px;border:1px solid var(--kogane-border);font-weight:600\">×1.3</span>' : item.id==='originality' ? '<span style=\"font-size:9px;background:var(--kogane-bg);color:var(--kogane);padding:1px 6px;border-radius:10px;border:1px solid var(--kogane-border);font-weight:600\">×1.1</span>' : ''}"
)

# ══════════════════════════════════════════════════════════════════
# P5 — 採点エンジン: suggestions に実際の脚本台詞を埋め込む（Want/Need）
# ══════════════════════════════════════════════════════════════════
apply_patch('P5-suggestion-want-script',
    'Want/Need提案に実際の脚本台詞を埋め込む',
    """  if (scores['protag-want-need'] <= 2) {
    const wantScript = mainCharName && dialogueByChar[mainCharName] ? dialogueByChar[mainCharName][0] : null;
    const wantBefore = wantScript ? mainCharName + '「' + (wantScript.length > 40 ? wantScript.slice(0,40)+'…' : wantScript) + '」（← 欲求が不明瞭）' : '（主人公の目標を示すセリフが不足）';
    suggestions_parts.push('・冒頭シーンで' + (mainCharName || '主人公') + 'の「外的目標（Want）」を視覚的に示す1シーンを追加する。\\n  （改善前）' + wantBefore + '\\n  （改善後）' + (mainCharName || '田中') + '、書類を繰る。「合格者一覧」——自分の名前はない。\\n  → 外的目標が映像で示される。さらにNeed（内的必要性）も対立させると最強の設計に。');
  }""",
    """  if (scores['protag-want-need'] <= 2) {
    const wantScript = mainCharName && dialogueByChar[mainCharName] ? dialogueByChar[mainCharName][0] : null;
    // 目標キーワードを含む台詞を優先して選ぶ
    const goalKwsEx = ['したい', 'なりたい', 'ほしい', '目指', '望む', '必要', '欲し', '手に入れ', '夢', '目標', '証明'];
    const wantScriptGoal = (mainCharName && dialogueByChar[mainCharName]) ?
      (dialogueByChar[mainCharName].find(d => goalKwsEx.some(k => d.includes(k))) || dialogueByChar[mainCharName][0]) : null;
    const wantBefore = wantScriptGoal
      ? mainCharName + '「' + (wantScriptGoal.length > 50 ? wantScriptGoal.slice(0,50)+'…' : wantScriptGoal) + '」（← この台詞に外的目標が見えない）'
      : (wantScript ? mainCharName + '「' + (wantScript.length > 50 ? wantScript.slice(0,50)+'…' : wantScript) + '」（← Wantが不明瞭）' : '（主人公の目標を示すセリフが検出されませんでした）');
    const wantAfterEx = (mainCharName || '田中') + '、書類を繰る。「合格者一覧」——自分の名前はない。\\n' + (mainCharName || '田中') + '「（低く）……次こそ」\\n→ 外的Wantと内面の傷が1シーンで伝わる設計';
    suggestions_parts.push('・冒頭シーンで' + (mainCharName || '主人公') + 'の「外的目標（Want）」を映像で示す1シーンを追加する。\\n  （改善前）\\n  ' + wantBefore + '\\n  （改善後）\\n  ' + wantAfterEx);
  }"""
)

# ══════════════════════════════════════════════════════════════════
# P6 — 採点エンジン: suggestions — サブテキスト提案に実際の台詞引用
# ══════════════════════════════════════════════════════════════════
apply_patch('P6-suggestion-subtext-script',
    'サブテキスト提案に実際の説明台詞を引用',
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
  }""",
    """  if (scores['subtext'] <= 2) {
    // 説明台詞の実例を脚本から抽出
    const subtextOnTheNosePats = ['なんですよ', 'ということは', 'つまり', '実は私', '要するに', '説明しておくと', 'わかってます', 'というのは', 'ですよね', 'じゃないですか'];
    const subtextFoundLine = (() => {
      for (const d of dialogueTexts) {
        if (subtextOnTheNosePats.some(p => d.includes(p)) && d.length > 5) return d;
      }
      if (onTheNoseLines.length > 0) return onTheNoseLines[0];
      // 長台詞を探す（説明的な可能性が高い）
      const longDlg = dialogueTexts.filter(d => d.length > 40).sort((a,b) => b.length-a.length)[0];
      return longDlg || null;
    })();
    const onTheNoseExStr = subtextFoundLine
      ? '「' + (subtextFoundLine.length > 55 ? subtextFoundLine.slice(0,55)+'…' : subtextFoundLine) + '」'
      : '（脚本内の説明台詞箇所）';
    // キャラ名から置き換えAfterを作る
    const subtextCharName = mainCharName || '田中';
    const afterActionLine = subtextFoundLine && subtextFoundLine.includes('怒') ? subtextCharName + '、コップを叩きつける——静かに。' :
                           subtextFoundLine && subtextFoundLine.includes('悲') ? subtextCharName + '、窓の外を向いたまま。手だけが震える。' :
                           subtextCharName + '、手元の花瓶——少しだけ傾ける。戻す。';
    suggestions_parts.push('・「感情を言葉にさせない」改稿：感情を直接言わせず、行動・物・沈黙で表現する。\\n  （改善前）\\n  ' + onTheNoseExStr + ' ← 感情を台詞で説明\\n  （改善後）\\n  ' + afterActionLine + '\\n  → 沈黙・間・物・空間が最強の感情表現。脚本内の全説明台詞に同じ変換を');
  }"""
)

# ══════════════════════════════════════════════════════════════════
# P7 — 採点エンジン: suggestions — 対話ダイナミクスに実例台詞
# ══════════════════════════════════════════════════════════════════
apply_patch('P7-suggestion-dlgdyn-script',
    '対話ダイナミクス提案に実際の平板な台詞交換を引用',
    """  if (scores['dialogue-dynamics'] <= 2 && totalDialogueLines >= 3) {
    suggestions_parts.push('・各シーンのキャラクターに「異なる目的・秘密・感情」を持たせる。\\n  具体例：\\n  （改善前）田中「最近どう？」花子「普通だよ」田中「そうか」\\n  （改善後）田中「……例の件、返事は？」（目標：答えを得たい）\\n  花子「お茶飲む？」（目標：話題を逸らしたい）\\n  田中「いらない。聞かせてくれ」\\n  → 目的の衝突が会話の引力を生む');
  }""",
    """  if (scores['dialogue-dynamics'] <= 2 && totalDialogueLines >= 3) {
    // 平板な会話交換の実例を脚本から探す
    const flatExchangePair = (() => {
      const flatPats = ['どう？', 'そうか', '普通', 'まあまあ', 'そうだね', 'うん', 'そうですね', 'はい', 'ええ'];
      for (let i = 0; i < dialogueTexts.length - 1; i++) {
        const a = dialogueTexts[i], b = dialogueTexts[i+1];
        if (flatPats.some(p => a.includes(p) || b.includes(p)) && a.length < 30 && b.length < 30 && a.length > 1 && b.length > 1) {
          return '「' + a + '」\n  「' + b + '」';
        }
      }
      if (dialogueTexts.length >= 2) {
        const a = dialogueTexts[0], b = dialogueTexts[1];
        if (a.length < 35 && b.length < 35) return '「' + a + '」\n  「' + b + '」';
      }
      return null;
    })();
    const dlgDynBeforeStr = flatExchangePair ? flatExchangePair + ' ← 目的の衝突がない会話' : '（脚本内の平板な会話交換）';
    const dlgDynCharA = mainCharName || '田中';
    const dlgDynCharB = (sortedChars[1] && sortedChars[1][0]) || '花子';
    suggestions_parts.push('・各シーンのキャラクターに「異なる目的・秘密・感情」を持たせて会話に引力を作る。\\n  （改善前）\\n  ' + dlgDynBeforeStr + '\\n  （改善後）\\n  ' + dlgDynCharA + '「……例の件、返事は？」（目標：答えを得たい）\\n  ' + dlgDynCharB + '「お茶飲む？」（目標：話題を逸らしたい）\\n  ' + dlgDynCharA + '「いらない。聞かせてくれ」\\n  → 目的・欲求の衝突が会話の引力を生む');
  }"""
)

# ══════════════════════════════════════════════════════════════════
# P8 — 採点エンジン: suggestions — 作家性提案に実際の抽象語引用
# ══════════════════════════════════════════════════════════════════
apply_patch('P8-suggestion-authorial-script',
    '作家性提案に実際の抽象語句を引用',
    """  if (scores['authorial-voice'] <= 2) {
    suggestions_parts.push('・「自分にしか書けないシーン」を1つ作る。\\n  具体例：\\n  （改善前）夕暮れの街。田中は悲しそうに歩く。\\n  （改善後）夕暮れ。アスファルトがじわじわと白くなる時間。\\n  田中の靴底に、ガムの跡。（踏んでしまったのは、三歩前だった）\\n  → 「悲しい」と書かず、固有の感覚的ディテールで語る');
  }""",
    """  if (scores['authorial-voice'] <= 2) {
    // 抽象的な感情語句を含む行を実際に引用する
    const abstractKwsVoice = ['悲しい', '嬉しい', '怒った', '楽しい', '寂しい', '辛い', '苦しい', '悲しそう', '嬉しそう', '怒っている', '悲しんで'];
    const abstractActLine = actionLines.find(l => abstractKwsVoice.some(k => l.includes(k))) || null;
    const abstractDlgLine = dialogueTexts.find(d => abstractKwsVoice.some(k => d.includes(k))) || null;
    const abstractFoundLine = abstractActLine || abstractDlgLine;
    const abstractFoundKw = abstractFoundLine ? (abstractKwsVoice.find(k => abstractFoundLine.includes(k)) || '感情語') : null;
    const authBefore = abstractFoundLine
      ? (abstractDlgLine && abstractDlgLine === abstractFoundLine ? '「' + (abstractFoundLine.length > 50 ? abstractFoundLine.slice(0,50)+'…' : abstractFoundLine) + '」 ← 「' + abstractFoundKw + '」は抽象的'
         : (abstractFoundLine.length > 55 ? abstractFoundLine.slice(0,55)+'…' : abstractFoundLine) + ' ← 「' + abstractFoundKw + '」は抽象的')
      : '（脚本内の感情描写行）';
    suggestions_parts.push('・「感情語を排し、固有の感覚的ディテールで書く」練習：脚本内の抽象語を置き換える。\\n  （改善前）\\n  ' + authBefore + '\\n  （改善後）\\n  夕暮れ。アスファルトがじわじわと白くなる時間。\\n  ' + (mainCharName || '田中') + 'の靴底に、ガムの跡。（踏んだのは三歩前）\\n  → 「悲しい」「嬉しい」は書かない。固有の物・行動・感覚で感情を設計する');
  }"""
)

# ══════════════════════════════════════════════════════════════════
# P9 — 採点エンジン: suggestions — 感情的インパクト提案に実際の台詞
# ══════════════════════════════════════════════════════════════════
apply_patch('P9-suggestion-emotion-script',
    '感情的インパクト提案に実際の感情台詞を引用',
    """  if (scores['emotional-impact'] <= 2) {
    suggestions_parts.push('・感情のピークを「行動と沈黙」で設計する。\\n  具体例：\\n  （改善前）田中「悔しい……本当に悔しい」\\n  （改善後）田中、机を一度だけ叩く——静かに。\\n  そのまま立ち上がり、電気を消す。\\n  暗闇の中、キーボードを打つ音だけが続く。\\n  → 感情は「言わず、体の行動」で示す');
  }""",
    """  if (scores['emotional-impact'] <= 2) {
    // 感情を直接言葉で言っている台詞を脚本から抽出
    const emotionVerbPats = ['悔しい', '悲しい', '辛い', '怖い', 'ひどい', '嬉しい', 'うれしい', '寂しい', '苦しい', '悲しかった', '辛かった'];
    const emotionDirectLine = dialogueTexts.find(d => emotionVerbPats.some(p => d.includes(p)) && d.length > 3) || null;
    const emotionBefore = emotionDirectLine
      ? '「' + (emotionDirectLine.length > 55 ? emotionDirectLine.slice(0,55)+'…' : emotionDirectLine) + '」 ← 感情を台詞で直接説明'
      : '（脚本内の感情的な台詞を引用）';
    const emoCharName = mainCharName || '田中';
    const emoFoundKw = emotionDirectLine ? (emotionVerbPats.find(k => emotionDirectLine.includes(k)) || '感情') : '悔しさ';
    const emotionAfter = emoFoundKw.includes('悔') ? emoCharName + '、机を一度だけ叩く——静かに。\n  そのまま立ち上がり、電気を消す。\n  暗闇の中、キーボードを打つ音だけが続く。' :
                        emoFoundKw.includes('悲') || emoFoundKw.includes('寂') ? emoCharName + '、窓に額をつける。\n  ガラスが少しだけ曇る。\n  （長い沈黙）' :
                        emoFoundKw.includes('怖') ? emoCharName + '、後ずさり——ドアノブを探す手が震える。' :
                        emoCharName + '、机を一度だけ叩く——静かに。\n  そのまま立ち上がり、電気を消す。';
    suggestions_parts.push('・感情のピークを「行動と沈黙」で設計する（感情を言葉にさせない）。\\n  （改善前）\\n  ' + emotionBefore + '\\n  （改善後）\\n  ' + emotionAfter + '\\n  → 観客に感情を「発見させる」余白を作る。感情が言語化された瞬間、観客は引く');
  }"""
)

# ══════════════════════════════════════════════════════════════════
# P10 — 採点エンジン: suggestions — キャラアーク提案に実際の台詞比較
# ══════════════════════════════════════════════════════════════════
apply_patch('P10-suggestion-arc-script',
    'キャラアーク提案に冒頭/終盤台詞の実際の比較を埋め込む',
    """  if (scores['char-arc'] <= 2) {
    suggestions_parts.push('・主人公の変化を「ビフォー → 転機 → アフター」で設計し直す。\\n  第1幕：' + (mainCharName || '主人公') + 'の欠点・傷を見せる。\\n  第2幕：その欠点が原因で最悪の状況になる。\\n  第3幕：変容する瞬間を映像で見せる（台詞で語らない）。');
  }""",
    """  if (scores['char-arc'] <= 2) {
    const arcCharName = mainCharName || '主人公';
    const arcMainDlgs = (mainCharName && dialogueByChar[mainCharName]) ? dialogueByChar[mainCharName] : [];
    const arcFirst = arcMainDlgs.length > 0 ? arcMainDlgs[0] : null;
    const arcLast = arcMainDlgs.length > 1 ? arcMainDlgs[arcMainDlgs.length - 1] : null;
    const arcCompare = arcFirst && arcLast && arcFirst !== arcLast
      ? '  冒頭: ' + arcCharName + '「' + (arcFirst.length > 40 ? arcFirst.slice(0,40)+'…' : arcFirst) + '」\n  終盤: ' + arcCharName + '「' + (arcLast.length > 40 ? arcLast.slice(0,40)+'…' : arcLast) + '」\n  ↑ この2台詞に明確な感情・姿勢の変化がありますか？'
      : '  （主人公の冒頭と終盤の台詞を比較して変化を確認してください）';
    suggestions_parts.push('・主人公の変化を「ビフォー → 転機 → アフター」で設計し直す。\n' + arcCompare + '\n  第1幕：' + arcCharName + 'の欠点・傷を見せる（行動で）\n  第2幕：その欠点が原因で最悪の状況に追い込まれる\n  第3幕：変容する瞬間を映像で見せる（台詞で語らない）');
  }"""
)

# ══════════════════════════════════════════════════════════════════
# P11 — 採点エンジン: suggestions — ト書き長提案に最長行を引用
# ══════════════════════════════════════════════════════════════════
apply_patch('P11-suggestion-direction-script',
    'ト書き長提案に実際の最長行を引用',
    """  if (longActionCount >= 3) {
    suggestions_parts.push('・90字超のト書きを全て見直し「映像として撮れる最小情報」に圧縮する。\\n  具体例：\\n  （改善前）田中は非常に怒った表情で、両手を強く握りしめながら、ゆっくりと立ち上がり、窓の外を見つめた。\\n  （改善後）田中、立つ。窓。\\n  → 役者に「演じる余白」を与える');
  }""",
    """  if (longActionCount >= 3) {
    const longestActionLine = actionLines.filter(l => l.length > 90).sort((a,b) => b.length-a.length)[0] || null;
    const dirBefore = longestActionLine
      ? (longestActionLine.length > 90 ? longestActionLine.slice(0,90)+'…' : longestActionLine) + ' ← ' + longestActionLine.length + '字（90字超）'
      : '（90字超のト書き箇所）';
    // 最長行から圧縮後を機械的に生成: 動詞を抽出して短縮
    const dirAfterSuggestion = longestActionLine
      ? longestActionLine.replace(/は非常に|はゆっくりと|は深く|はしっかりと|はゆっくり|とても|非常に|とっても|強く/g, '').slice(0, 25) + '。'
      : '田中、立つ。窓。';
    suggestions_parts.push('・90字超のト書きを全て「映像として撮れる最小情報」に圧縮する（現在' + longActionCount + '箇所）。\\n  （改善前）\\n  ' + dirBefore + '\\n  （改善後のイメージ）\\n  ' + dirAfterSuggestion + ' ← 役者が演じる余白を残す\\n  目安：1ト書き=1〜2文・30〜50字。感情・内面描写は完全に削除');
  }"""
)

# ══════════════════════════════════════════════════════════════════
# P12 — 採点エンジン: suggestions — 声の固有性に実際のセリフ並列
# ══════════════════════════════════════════════════════════════════
apply_patch('P12-suggestion-voice-script',
    '声の固有性提案にキャラの実際のセリフを並列比較',
    """  if (scores['voice'] <= 2 && uniqueChars >= 2) {
    suggestions_parts.push('・各キャラクターの「声の設計書」を作ってから書き直す。\\n  設計書例：\\n  田中：【語彙】短文・動詞省略　【癖】「……」多用　【禁句】感情の直接表現\\n  花子：【語彙】丁寧語・回り道　【癖】話題をずらす　【禁句】断言・断定\\n  → この設計書を元に全セリフを見直す');
  }""",
    """  if (scores['voice'] <= 2 && uniqueChars >= 2) {
    // 各キャラの代表セリフを並列比較として表示
    const voiceCharSamples = sortedChars.slice(0, Math.min(3, sortedChars.length)).map(([cname]) => {
      const dlgs = dialogueByChar[cname] || [];
      if (!dlgs.length) return null;
      const d = dlgs[0];
      return cname + '「' + (d.length > 30 ? d.slice(0,30)+'…' : d) + '」';
    }).filter(Boolean);
    const voiceBeforeStr = voiceCharSamples.length > 1 ? voiceCharSamples.join('\n  ') + '\n  ← 各キャラのセリフが似ている（語彙・文体の差がない）' : '（複数キャラのセリフを比較）';
    const voiceCharA = sortedChars[0] ? sortedChars[0][0] : '田中';
    const voiceCharB = sortedChars[1] ? sortedChars[1][0] : '花子';
    suggestions_parts.push('・各キャラの「声の設計書」を作り、全セリフを書き直す。\\n  （現在の問題）\\n  ' + voiceBeforeStr + '\\n  （改善後のイメージ — 同じ質問への回答が全員違う）\\n  ' + voiceCharA + '（省略型）「会議——どうだった」\\n  ' + voiceCharB + '（回避型）「……先方が、少し、難しいと」\\n  設計書：キャラ名・語彙レベル・口癖・禁句（絶対言わない言葉）を書いてから台詞を書く');
  }"""
)

# ══════════════════════════════════════════════════════════════════
# P13 — staffRoomGenerateTutoringExamples: ランダム→決定論的選択
# ══════════════════════════════════════════════════════════════════
apply_patch('P13-tutor-deterministic',
    'チュータリングヒント選択をランダムから決定論的に変更',
    '    const tip = db.tips[Math.floor(Math.random() * db.tips.length)];',
    '''    // スコアと itemDetails から最も適切なヒントを決定論的に選択
    const itemIssues = (itemDetails[itemId]?.issues || []).join(' ');
    const tipIdx = (() => {
      if (db.tips.length <= 1) return 0;
      // issueテキストに基づいてヒントを選択
      for (let ti = 0; ti < db.tips.length; ti++) {
        const t = db.tips[ti];
        if (itemIssues && t.title && (
          (itemIssues.includes('説明') && t.title.includes('説明')) ||
          (itemIssues.includes('アーク') && t.title.includes('アーク')) ||
          (itemIssues.includes('変容') && t.title.includes('変化')) ||
          (itemIssues.includes('サブテキスト') && t.title.includes('サブテキスト')) ||
          (itemIssues.includes('発端') && t.title.includes('発端')) ||
          (itemIssues.includes('Want') && t.title.includes('Want')) ||
          (itemIssues.includes('映像') && t.title.includes('映像')) ||
          (itemIssues.includes('目的') && t.title.includes('目的'))
        )) return ti;
      }
      // スコアが1の場合は最初のヒント（基礎的なもの）を使用
      return score <= 1 ? 0 : (score === 2 ? Math.min(1, db.tips.length-1) : 0);
    })();
    const tip = db.tips[tipIdx];'''
)

# ══════════════════════════════════════════════════════════════════
# P14 — UI: 弱点タブ — 各弱点に対応するスクリプト引用を追加
# ══════════════════════════════════════════════════════════════════
apply_patch('P14-weakness-quote-block',
    '弱点タブの各項目にスクリプト引用ブロックを追加',
    """              return `<div style="display:flex;gap:8px;align-items:flex-start;padding:7px 10px;margin-bottom:4px;background:${isCritical ? 'rgba(239,68,68,.06)' : 'rgba(239,68,68,.03)'};border:1px solid ${isCritical ? 'rgba(239,68,68,.3)' : 'rgba(239,68,68,.15)'};border-radius:8px;border-left:3px solid var(--momo)">
                <span style="flex-shrink:0;margin-top:2px;width:16px;height:16px;border-radius:50%;background:${isCritical ? '#dc2626' : 'var(--momo)'};display:inline-flex;align-items:center;justify-content:center;min-width:16px;box-shadow:0 1px 4px rgba(239,68,68,.25)"><i class="fas fa-exclamation" style="font-size:7px;color:#fff"></i></span>
                <div style="flex:1;min-width:0">
                  <div style="font-size:11.5px;line-height:1.7;color:var(--text-primary);font-weight:500">${esc(content)}</div>
                  ${isCritical ? '<div style="font-size:9.5px;color:#b91c1c;margin-top:3px;font-weight:600"><i class="fas fa-exclamation-circle" style="margin-right:3px"></i>最優先改善項目</div>' : ''}
                </div>
                ${scoreVal !== null ? `<span style="flex-shrink:0;font-size:12px;font-weight:800;color:${isCritical ? '#dc2626' : 'var(--momo)'};line-height:1">${scoreVal}<span style="font-size:8px;opacity:.6">/5</span></span>` : ''}
              </div>`;""",
    """              // 弱点に対応するスクリプト引用を取得
              const weakItemMatch2 = content.match(/【(.+?)】/);
              const weakItemId2 = weakItemMatch2 ? Object.entries({
                '三幕構成の明確さ':'three-act','プロットの一貫性':'plot-logic','ペーシング（緩急）':'pacing',
                '主人公のWant/Need':'protag-want-need','キャラクターアーク':'char-arc','キャラクターの固有性':'char-unique',
                'サブテキストの活用':'subtext','セリフの声の固有性':'voice','セリフの自然さ':'naturalness',
                '対話のダイナミクス':'dialogue-dynamics','ビジュアルストーリーテリング':'visual','ト書きの簡潔さ':'direction-clarity',
                'テーマの一貫性':'theme-clarity','オリジナリティ':'originality','作家性・文体':'authorial-voice',
                '脚本フォーマット':'format-correctness','作品力・感情的インパクト':'emotional-impact','映像化実現可能性':'production-viability'
              }).find(([k]) => k === weakItemMatch2[1]) : null;
              const weakItemKey2 = weakItemId2 ? weakItemId2[1] : null;
              const weakItemDetail2 = weakItemKey2 && autoResult.itemDetails ? autoResult.itemDetails[weakItemKey2] : null;
              const weakQuote2 = weakItemDetail2 ? weakItemDetail2.quote : null;
              return `<div style="margin-bottom:6px;border:1px solid ${isCritical ? 'rgba(239,68,68,.3)' : 'rgba(239,68,68,.15)'};border-radius:8px;overflow:hidden;border-left:3px solid ${isCritical ? '#dc2626' : 'var(--momo)'}">
                <div style="display:flex;gap:8px;align-items:flex-start;padding:7px 10px;background:${isCritical ? 'rgba(239,68,68,.06)' : 'rgba(239,68,68,.03)'}">
                  <span style="flex-shrink:0;margin-top:2px;width:16px;height:16px;border-radius:50%;background:${isCritical ? '#dc2626' : 'var(--momo)'};display:inline-flex;align-items:center;justify-content:center;min-width:16px;box-shadow:0 1px 4px rgba(239,68,68,.25)"><i class="fas fa-exclamation" style="font-size:7px;color:#fff"></i></span>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:11.5px;line-height:1.7;color:var(--text-primary);font-weight:500">${esc(content)}</div>
                    ${isCritical ? '<div style="font-size:9.5px;color:#b91c1c;margin-top:3px;font-weight:600"><i class="fas fa-circle-exclamation" style="margin-right:3px"></i>最優先改善項目</div>' : ''}
                  </div>
                  ${scoreVal !== null ? `<span style="flex-shrink:0;font-size:12px;font-weight:800;color:${isCritical ? '#dc2626' : 'var(--momo)'};line-height:1;white-space:nowrap">${scoreVal}<span style="font-size:8px;opacity:.6">/5</span></span>` : ''}
                </div>
                ${weakQuote2 ? `<div style="border-top:1px solid rgba(239,68,68,.15);padding:5px 10px;background:rgba(239,68,68,.025)">
                  <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px">
                    <i class="fas fa-highlighter" style="font-size:7.5px;color:var(--momo)"></i>
                    <span style="font-size:7.5px;font-weight:700;color:var(--momo);letter-spacing:.04em">脚本該当箇所</span>
                  </div>
                  <div style="font-family:'Noto Serif JP',serif;font-size:10px;color:#7f1d1d;line-height:1.75;white-space:pre-wrap;word-break:break-all">${esc(weakQuote2)}</div>
                </div>` : ''}
              </div>`;"""
)

# ══════════════════════════════════════════════════════════════════
# P15 — UI: 改稿案タブ — テンプレ行のフォントを serif に統一
# ══════════════════════════════════════════════════════════════════
apply_patch('P15-suggestion-font-fix',
    '改稿案のリスト行フォントをNoto Serif JPに統一',
    "html += '<div style=\"padding:8px 13px 10px\">' + subLines.map(l => '<div style=\"font-size:10.5px;color:var(--text-secondary);line-height:1.75;padding:2px 0 2px 6px\">' + esc(l) + '</div>').join('') + '</div>';",
    "html += '<div style=\"padding:8px 13px 10px\">' + subLines.map(l => '<div style=\"font-size:10.5px;color:var(--text-secondary);line-height:1.75;padding:2px 0 2px 6px;font-family:\\'Noto Serif JP\\',serif\">' + esc(l) + '</div>').join('') + '</div>';"
)

# ══════════════════════════════════════════════════════════════════
# P16 — UI: チュータリングパネル — Before/After グリッドの gap を広げる
# ══════════════════════════════════════════════════════════════════
apply_patch('P16-tutor-grid-gap',
    'チュータリングBefore/Afterグリッドのgapを調整',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:9px">',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:10px">'
)

# ══════════════════════════════════════════════════════════════════
# P17 — UI: バナーのキャッチコピーバッジ更新
# ══════════════════════════════════════════════════════════════════
apply_patch('P17-banner-badge-v7',
    'バナーの機能バッジを v7 に更新',
    '<span style="font-size:9px;background:rgba(168,85,247,.25);color:rgba(200,160,255,.9);border:1px solid rgba(168,85,247,.4);border-radius:4px;padding:1px 6px;font-weight:700;letter-spacing:.05em">18項目・7軸・脚本引用</span>',
    '<span style="font-size:9px;background:rgba(168,85,247,.25);color:rgba(200,160,255,.9);border:1px solid rgba(168,85,247,.4);border-radius:4px;padding:1px 6px;font-weight:700;letter-spacing:.05em">18項目・7軸・実脚本引用 v7</span>'
)

# ══════════════════════════════════════════════════════════════════
# P18 — エンジン: ペーシング引用 — 最長シーンのラベル改善
# ══════════════════════════════════════════════════════════════════
apply_patch('P18-pacing-quote-detail',
    'ペーシング診断の最長シーン引用にセリフ情報も追加',
    "itemDetails['pacing'] = { reasons, issues };",
    """    // ペーシング: 最長シーンの柱書き行と最初のセリフを引用
    const pacingQuoteEx = (() => {
      if (sceneLengths.length === 0) return null;
      const maxLen2 = Math.max(...sceneLengths);
      const longSceneIdx2 = sceneLengths.indexOf(maxLen2);
      if (longSceneIdx2 >= 0 && longSceneIdx2 < sceneLines.length) {
        const sceneLine = sceneLines[longSceneIdx2];
        // このシーンの直後の最初のセリフを探す
        const sceneLinePos = nonEmpty.indexOf(sceneLine);
        if (sceneLinePos >= 0) {
          const nextDlg = nonEmpty.slice(sceneLinePos+1, sceneLinePos+8).find(l => {
            const m = l.match(charDialoguePatternA);
            return m && m[1].length >= 1;
          });
          if (nextDlg) return sceneLine + '\n' + nextDlg.slice(0, 60) + (nextDlg.length > 60 ? '…' : '') + '\n[最長シーン: ' + maxLen2 + '行 — 要圧縮/分割]';
        }
        return sceneLine + ' [最長シーン: ' + maxLen2 + '行 — 要圧縮/分割]';
      }
      return null;
    })();
    itemDetails['pacing'] = { reasons, issues, quote: pacingQuoteEx };"""
)

# ══════════════════════════════════════════════════════════════════
# P19 — エンジン: naturalness 引用 — 短い平板な台詞交換も引用
# ══════════════════════════════════════════════════════════════════
apply_patch('P19-naturalness-quote-pair',
    'セリフ自然さの引用に短い平板な台詞交換を追加',
    """    const naturalnessQuoteEx = (() => {
      const long = dialogueTexts.filter(d => d.length > 55);
      if (!long.length) return null;
      const s = long.sort((a,b) => b.length-a.length)[0];
      return '「' + (s.length > 80 ? s.slice(0, 80) + '…' : s) + '」';
    })();
    itemDetails['naturalness'] = { reasons, issues, quote: naturalnessQuoteEx };""",
    """    const naturalnessQuoteEx = (() => {
      // まず最長台詞を探す（90字超が最も問題）
      const long90 = dialogueTexts.filter(d => d.length > 90);
      if (long90.length > 0) {
        const s = long90.sort((a,b) => b.length-a.length)[0];
        return '「' + (s.length > 90 ? s.slice(0, 90) + '…' : s) + '」 [' + s.length + '字 — 90字超の長台詞]';
      }
      // 55字超の台詞
      const long55 = dialogueTexts.filter(d => d.length > 55);
      if (long55.length > 0) {
        const s = long55.sort((a,b) => b.length-a.length)[0];
        return '「' + (s.length > 80 ? s.slice(0, 80) + '…' : s) + '」 [' + s.length + '字]';
      }
      // 短すぎる台詞の連続（会話のテンポが単調な場合）
      const shortPair = dialogueTexts.filter(d => d.length >= 1 && d.length <= 3);
      if (shortPair.length >= 3) return '"' + shortPair.slice(0,3).join('" · "') + '" [超短台詞が' + shortPair.length + '箇所]';
      return null;
    })();
    itemDetails['naturalness'] = { reasons, issues, quote: naturalnessQuoteEx };"""
)

# ══════════════════════════════════════════════════════════════════
# P20 — エンジン: char-unique 引用 — 最多発言キャラの台詞で偏りを示す
# ══════════════════════════════════════════════════════════════════
apply_patch('P20-char-unique-quote-bias',
    'キャラクター固有性の引用に主人公偏重情報を追加',
    """    const charUniqueQuote = (() => {
      if (Object.keys(charCounts).length < 2) return null;
      // 最少発言キャラの台詞を一例表示
      const leastChar = Object.entries(charCounts).sort((a,b) => a[1]-b[1])[0];
      if (!leastChar || !dialogueByChar[leastChar[0]]) return null;
      const d = (dialogueByChar[leastChar[0]] || [])[0];
      return d ? leastChar[0] + '「' + (d.length > 50 ? d.slice(0,50) + '…' : d) + '」' : null;
    })();
    itemDetails['char-unique'] = { reasons, issues, quote: charUniqueQuote };""",
    """    const charUniqueQuote = (() => {
      if (Object.keys(charCounts).length < 2) return null;
      // 語彙差が少ない場合: 似た台詞ペアを引用
      if (charVocabUniqueness < 0.2 && sortedChars.length >= 2) {
        const charA = sortedChars[0][0], charB = sortedChars[1][0];
        const dlgA = (dialogueByChar[charA] || [])[0];
        const dlgB = (dialogueByChar[charB] || [])[0];
        if (dlgA && dlgB) {
          return charA + '「' + (dlgA.length > 30 ? dlgA.slice(0,30)+'…' : dlgA) + '」\n' +
                 charB + '「' + (dlgB.length > 30 ? dlgB.slice(0,30)+'…' : dlgB) + '」\n[語彙差スコア: ' + Math.round(charVocabUniqueness*100) + '% — 声の差別化が必要]';
        }
      }
      // 主人公偏重の場合: 主人公の台詞占有率を示す
      if (mainCharLineCount / Math.max(1, totalDialogueLines) > 0.75 && mainCharName) {
        const mainDlgEx = (dialogueByChar[mainCharName] || [])[0];
        return mainCharName + '（全台詞の' + Math.round(mainCharLineCount/Math.max(1,totalDialogueLines)*100) + '%を占める）\n' +
               (mainDlgEx ? '例: 「' + (mainDlgEx.length > 40 ? mainDlgEx.slice(0,40)+'…' : mainDlgEx) + '」' : '');
      }
      // 最少発言キャラの台詞
      const leastChar = Object.entries(charCounts).sort((a,b) => a[1]-b[1])[0];
      if (!leastChar || !dialogueByChar[leastChar[0]]) return null;
      const d = (dialogueByChar[leastChar[0]] || [])[0];
      return d ? leastChar[0] + '「' + (d.length > 50 ? d.slice(0,50) + '…' : d) + '」 [' + leastChar[1] + '行]' : null;
    })();
    itemDetails['char-unique'] = { reasons, issues, quote: charUniqueQuote };"""
)

# ══════════════════════════════════════════════════════════════════
# P21 — エンジン: detailNotes の上限を 18 → 20 に拡張
# ══════════════════════════════════════════════════════════════════
apply_patch('P21-notes-limit-20',
    '診断ノート上限を18→20件に拡張',
    'detailNotes: notes.slice(0, 18),',
    'detailNotes: notes.slice(0, 20),'
)

# ══════════════════════════════════════════════════════════════════
# P22 — UI: 改稿サイクルパネルヘッダー改善
# ══════════════════════════════════════════════════════════════════
apply_patch('P22-tutor-header',
    '改稿テクニックパネルの見出し改善',
    '<i class="fas fa-pen-nib" style="color:var(--fuji);font-size:10px"></i>\n          改稿テクニック：${esc(tip.title)}',
    '<i class="fas fa-pen-nib" style="color:var(--fuji);font-size:10px"></i>\n          <span style="color:var(--text-muted);font-weight:500">改稿テクニック </span>${esc(tip.title)}'
)

# ══════════════════════════════════════════════════════════════════
# P23 — UI: 強みタブ — スコア5に特別な紫スタイル
# ══════════════════════════════════════════════════════════════════
apply_patch('P23-strength-score5-style',
    '強みタブのスコア5に紫グラデーションバッジを追加',
    "const scoreColor2 = scoreVal >= 5 ? '#7c3aed' : scoreVal >= 4 ? 'var(--matcha)' : 'var(--kogane)';",
    "const scoreColor2 = scoreVal >= 5 ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : scoreVal >= 4 ? 'var(--matcha)' : 'var(--kogane)';\n              const scoreDisplay2 = scoreVal >= 5 ? '<span style=\"font-size:11px;font-weight:800;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;padding:1px 7px;border-radius:8px;letter-spacing:.03em\">★ 5/5</span>' : null;"
)

# ══════════════════════════════════════════════════════════════════
# P24 — UI: フィードバックタブボタン — より明確なラベル
# ══════════════════════════════════════════════════════════════════
apply_patch('P24-fb-tab-labels',
    'フィードバックタブのラベルをより分かりやすく更新',
    '<button id="sr-fb-tab-sg-${s.id}" onclick="staffRoomFbTab(\'${s.id}\',\'suggestions\')" style="flex:1;padding:9px 4px;font-size:10.5px;font-weight:700;border:none;cursor:pointer;border-bottom:2px solid transparent;background:transparent;color:var(--text-muted);display:flex;align-items:center;justify-content:center;gap:4px"><i class="fas fa-pencil" style="font-size:9px"></i>改稿案</button>',
    '<button id="sr-fb-tab-sg-${s.id}" onclick="staffRoomFbTab(\'${s.id}\',\'suggestions\')" style="flex:1;padding:9px 4px;font-size:10.5px;font-weight:700;border:none;cursor:pointer;border-bottom:2px solid transparent;background:transparent;color:var(--text-muted);display:flex;align-items:center;justify-content:center;gap:4px"><i class="fas fa-pencil" style="font-size:9px"></i>改稿提案</button>'
)

# ══════════════════════════════════════════════════════════════════
# P25 — エンジン: テーマ提案に実際のテーマ台詞を引用
# ══════════════════════════════════════════════════════════════════
apply_patch('P25-suggestion-theme-script',
    'テーマ提案に実際のテーマ台詞を引用',
    """  if (scores['theme-clarity'] <= 2) {
    suggestions_parts.push('・テーマを「繰り返し」と「対比」で物語に埋め込む。\\n  具体例（テーマ：「一人では生きられない」）：\\n  ・第1幕：主人公が何事も一人でやろうとして失敗する\\n  ・第2幕：助けを求めることを拒否して最悪の状況になる\\n  ・第3幕：初めて手を差し伸べられ受け入れる——成功する\\n  → テーマは「主人公の行動の変化」で示す');
  }""",
    """  if (scores['theme-clarity'] <= 2) {
    // テーマ語が出現する台詞を引用
    const themeKwsSug = ['愛', '正義', '孤独', '自由', '家族', '復讐', '赦し', '成長', '友情', '嘘', '真実', '運命'];
    const themeFoundDlg = dialogueTexts.find(d => themeKwsSug.some(k => d.includes(k)) && d.length > 3) || null;
    const themeFoundKw = themeFoundDlg ? (themeKwsSug.find(k => themeFoundDlg.includes(k)) || 'テーマ語') : null;
    const themeBefore2 = themeFoundDlg
      ? '「' + (themeFoundDlg.length > 55 ? themeFoundDlg.slice(0,55)+'…' : themeFoundDlg) + '」 ← テーマ語「' + themeFoundKw + '」を台詞で語らせている'
      : '（テーマ語が台詞の中に見当たらない — テーマが設計されていない可能性）';
    suggestions_parts.push('・テーマを「行動・対比・繰り返し」で物語に埋め込む（台詞で語らせない）。\\n  （現在の問題）\\n  ' + themeBefore2 + '\\n  （改善の考え方）\\n  ・テーマを一言で言える？（例：「一人では生きられない」「許すことで自分が救われる」）\\n  ・第1幕：主人公がテーマに逆らう行動をとり失敗する\\n  ・第2幕：逆らい続け最悪の状況になる\\n  ・第3幕：テーマを受け入れる行動が成功をもたらす\\n  → テーマは「台詞」でなく「主人公の行動パターンの変化」で示す');
  }"""
)

# ══════════════════════════════════════════════════════════════════
# P26 — ITEM_DB: plot-logic ヒントを追加
# ══════════════════════════════════════════════════════════════════
apply_patch('P26-itemdb-plotlogic',
    'ITEM_DBにplot-logicカテゴリを追加',
    "    'production-viability': {\n      label: '映像化実現可能性',",
    """    'plot-logic': {
      label: 'プロットの論理的一貫性',
      tips: [
        { title: '「偶然」を「必然」に変換する', bad: 'たまたま田中がそこを通りかかり、ちょうど事件を目撃した。', good: '田中が帰宅ルートを変えたのには理由があった。昨夜の花子の一言——「東口から来て」。\nその一言が、田中をあの路地に向かわせた。', tip: '「たまたま・ちょうど・偶然」を脚本から全て削除する。その代わり「なぜ主人公がそこにいるか」を前のシーンに仕込む。偶然を必然に変えることが脚本の技術です。' },
        { title: '因果連鎖の強化：「なぜ→だから→しかし」', bad: 'シーン1: 田中が走る。\nシーン2: 花子が泣く。\nシーン3: 二人が話す。\n（シーンの繋がりに因果関係がない）', good: '（なぜ）田中が秘密を暴こうとした\n（だから）花子は隠し通そうとして嘘をついた\n（しかし）その嘘がさらに深い真実を示唆していた', tip: '各シーンの繋がりを「なぜ→だから→しかし」で説明できるか確認する。説明できなければシーン順序か内容に問題があります。' },
      ]
    },
    'production-viability': {
      label: '映像化実現可能性',"""
)

# ══════════════════════════════════════════════════════════════════
# P27 — エンジン: suggestions — テーマ/声の提案後に sortedChars を参照できるよう修正確認
# ══════════════════════════════════════════════════════════════════
# sortedChars は analysis の最上部で既に定義されているので不要
# 確認のみ（パッチなし）

print(f'\n{"="*60}')
print(f'patch_v7.py — 結果')
print(f'{"="*60}')
print(f'元サイズ: {original_len:,} chars')
print(f'新サイズ: {len(content):,} chars')
print(f'差分: {len(content)-original_len:+,} chars')
print(f'\n適用パッチ ({len(patches_applied)}件):')
for p in patches_applied:
    print(f'  {p}')

with open(SRC, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\n✅ {SRC} に書き込み完了')
