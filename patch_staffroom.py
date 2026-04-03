#!/usr/bin/env python3
"""
職員室 v4.2 - 包括的改善パッチ
1. UI/UX刷新: 絵文字削減、カードデザイン改善、引用ブロック
2. 脚本引用システム: 採点時に具体的箇所を引用
3. 採点エンジン強化: 引用ベース診断 + 改善案 + 具体例
4. 診断ノートUI改善: より読みやすいレイアウト
"""

import re

with open('/home/user/webapp/public/static/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)
print(f"Original: {original_len} chars")

# ══════════════════════════════════════════════════════════════════
# PATCH 1: 診断ノートのヘッダーバッジ - 絵文字削減
# ══════════════════════════════════════════════════════════════════

OLD1 = '''            <span style="font-size:10px;color:var(--matcha);margin-left:4px">${(autoResult.detailNotes||[]).filter(n=>n.type==='good').length}✅</span>
            <span style="font-size:10px;color:var(--momo)">${(autoResult.detailNotes||[]).filter(n=>n.type==='bad').length}❌</span>
            <span style="font-size:10px;color:var(--kogane)">${(autoResult.detailNotes||[]).filter(n=>n.type==='warn').length}⚠</span>'''

NEW1 = '''            <span style="font-size:10px;color:var(--matcha);margin-left:4px;display:flex;align-items:center;gap:3px"><span style="width:6px;height:6px;border-radius:50%;background:var(--matcha);flex-shrink:0"></span>${(autoResult.detailNotes||[]).filter(n=>n.type==='good').length} 良好</span>
            <span style="font-size:10px;color:var(--momo);display:flex;align-items:center;gap:3px"><span style="width:6px;height:6px;border-radius:50%;background:var(--momo);flex-shrink:0"></span>${(autoResult.detailNotes||[]).filter(n=>n.type==='bad').length} 要修正</span>
            <span style="font-size:10px;color:var(--kogane);display:flex;align-items:center;gap:3px"><span style="width:6px;height:6px;border-radius:50%;background:var(--kogane);flex-shrink:0"></span>${(autoResult.detailNotes||[]).filter(n=>n.type==='warn').length} 注意</span>'''

if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print("PATCH 1 applied: diagnostic badges updated")
else:
    print("PATCH 1 FAILED: string not found")

# ══════════════════════════════════════════════════════════════════
# PATCH 2: 診断ノートの各カード - 絵文字削減 + 引用ブロック対応
# ══════════════════════════════════════════════════════════════════

OLD2 = '''              ${(autoResult.detailNotes||[]).map(n=>`
              <div style="display:flex;gap:10px;padding:10px 12px;background:${n.type==='good'?'var(--matcha-bg)':n.type==='warn'?'var(--kogane-bg)':'var(--momo-bg)'};border:1px solid ${n.type==='good'?'var(--matcha-border)':n.type==='warn'?'var(--kogane-border)':'var(--momo-border)'};border-radius:8px">
                <div style="font-size:13px;flex-shrink:0;margin-top:1px">${n.type==='good'?'✅':n.type==='warn'?'⚠️':'❌'}</div>
                <div style="font-size:11.5px;line-height:1.75;color:var(--text-primary)">${esc(n.text)}</div>
              </div>`).join('')}'''

NEW2 = '''              ${(autoResult.detailNotes||[]).map(n=>`
              <div style="border:1px solid ${n.type==='good'?'var(--matcha-border)':n.type==='warn'?'var(--kogane-border)':'var(--momo-border)'};border-radius:8px;overflow:hidden;border-left:3px solid ${n.type==='good'?'var(--matcha)':n.type==='warn'?'var(--kogane)':'var(--momo)'}">
                <div style="padding:9px 13px;background:${n.type==='good'?'var(--matcha-bg)':n.type==='warn'?'var(--kogane-bg)':'var(--momo-bg)'};display:flex;gap:8px;align-items:flex-start">
                  <span style="flex-shrink:0;margin-top:2px;width:16px;height:16px;border-radius:50%;background:${n.type==='good'?'var(--matcha)':n.type==='warn'?'var(--kogane)':'var(--momo)'};display:flex;align-items:center;justify-content:center">
                    <i class="fas ${n.type==='good'?'fa-check':n.type==='warn'?'fa-exclamation':'fa-times'}" style="font-size:8px;color:#fff"></i>
                  </span>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:11.5px;line-height:1.75;color:var(--text-primary)">${staffRoomFormatNoteText(esc(n.text))}</div>
                    ${n.quote ? \`<div style="margin-top:7px;padding:7px 11px;background:rgba(0,0,0,.04);border-radius:5px;border-left:2px solid \${n.type==='good'?'var(--matcha)':n.type==='warn'?'var(--kogane)':'var(--momo)'};font-family:'Noto Serif JP',serif;font-size:11px;color:var(--text-secondary);line-height:1.8;white-space:pre-wrap">\${esc(n.quote)}</div>\` : ''}
                  </div>
                </div>
              </div>`).join('')}'''

if OLD2 in content:
    content = content.replace(OLD2, NEW2, 1)
    print("PATCH 2 applied: diagnostic note cards updated")
else:
    print("PATCH 2 FAILED: string not found")

# ══════════════════════════════════════════════════════════════════
# PATCH 3: autoIssues/reasonsの表示改善（採点ルーブリック内）
# ══════════════════════════════════════════════════════════════════

OLD3 = '''            ${(autoReasons.length > 0 || autoIssues.length > 0) ? `
            <div style="display:flex;flex-direction:column;gap:3px">
              ${autoReasons.map(r => `<div style="display:flex;align-items:flex-start;gap:5px;font-size:10.5px;color:var(--matcha);line-height:1.5"><span style="flex-shrink:0;font-weight:700;margin-top:1px">✓</span><span>${esc(r)}</span></div>`).join('')}
              ${autoIssues.map(i2 => `<div style="display:flex;align-items:flex-start;gap:5px;font-size:10.5px;color:var(--momo);line-height:1.5"><span style="flex-shrink:0;font-weight:700;margin-top:1px">⚠</span><span>${esc(i2)}</span></div>`).join('')}
            </div>` : ''}'''

NEW3 = '''            ${(autoReasons.length > 0 || autoIssues.length > 0) ? `
            <div style="display:flex;flex-direction:column;gap:3px;margin-top:5px">
              ${autoReasons.map(r => `<div style="display:flex;align-items:flex-start;gap:6px;font-size:10.5px;line-height:1.55"><span style="flex-shrink:0;margin-top:2px;width:14px;height:14px;border-radius:50%;background:var(--matcha);display:flex;align-items:center;justify-content:center"><i class="fas fa-check" style="font-size:7px;color:#fff"></i></span><span style="color:var(--text-secondary)">${esc(r)}</span></div>`).join('')}
              ${autoIssues.map(i2 => {
                const parts = i2.split('「');
                if (parts.length > 1) {
                  // セリフ引用がある場合は引用ブロックで表示
                  const mainText = parts[0];
                  const quoted = '「' + parts.slice(1).join('「');
                  return \`<div style="display:flex;flex-direction:column;gap:3px">
                    <div style="display:flex;align-items:flex-start;gap:6px;font-size:10.5px;line-height:1.55"><span style="flex-shrink:0;margin-top:2px;width:14px;height:14px;border-radius:50%;background:var(--momo);display:flex;align-items:center;justify-content:center"><i class="fas fa-exclamation" style="font-size:7px;color:#fff"></i></span><span style="color:var(--momo)">\${esc(mainText)}</span></div>
                    <div style="margin-left:20px;padding:5px 9px;background:var(--momo-bg,#fff5f5);border-left:2px solid var(--momo);border-radius:4px;font-family:'Noto Serif JP',serif;font-size:10.5px;color:var(--text-secondary);line-height:1.7">\${esc(quoted)}</div>
                  </div>\`;
                }
                return \`<div style="display:flex;align-items:flex-start;gap:6px;font-size:10.5px;line-height:1.55"><span style="flex-shrink:0;margin-top:2px;width:14px;height:14px;border-radius:50%;background:var(--momo);display:flex;align-items:center;justify-content:center"><i class="fas fa-exclamation" style="font-size:7px;color:#fff"></i></span><span style="color:var(--momo)">\${esc(i2)}</span></div>\`;
              }).join('')}
            </div>` : ''}'''

if OLD3 in content:
    content = content.replace(OLD3, NEW3, 1)
    print("PATCH 3 applied: rubric item reasons/issues display updated")
else:
    print("PATCH 3 FAILED: string not found")

# ══════════════════════════════════════════════════════════════════
# PATCH 4: staffRoomFormatNoteText ヘルパー関数を追加（診断テキスト整形）
# ══════════════════════════════════════════════════════════════════

OLD4 = 'function staffRoomGenerateTutoringExamples(session) {'

NEW4 = '''// ── 診断ノートテキストの整形（絵文字プレフィックス削除 + 引用強調）──
function staffRoomFormatNoteText(text) {
  // 先頭の絵文字アイコン（✅ ❌ ⚠️ 等）を削除
  return text.replace(/^[✅❌⚠️📝🎬🎭💡🔍🔧]+\\s*/u, '');
}

// ── 脚本テキストから引用抽出ヘルパー ────────────────────────────
function staffRoomExtractQuote(text, keyword, maxLen = 60) {
  if (!text || !keyword) return null;
  const lines = text.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
  for (const line of lines) {
    if (line.includes(keyword) && line.length <= maxLen + 20) {
      return line.length > maxLen ? line.slice(0, maxLen) + '…' : line;
    }
  }
  return null;
}

function staffRoomExtractOnTheNoseLine(dialogueTexts, patterns, maxLen = 70) {
  for (const d of dialogueTexts) {
    if (patterns.some(p => d.includes(p)) && d.length > 0) {
      return d.length > maxLen ? d.slice(0, maxLen) + '…' : d;
    }
  }
  return null;
}

function staffRoomExtractLongAction(actionLines, threshold = 90) {
  const long = actionLines.filter(l => l.length > threshold);
  if (long.length === 0) return null;
  // 最も長いものを抽出
  const longest = long.reduce((a, b) => a.length > b.length ? a : b);
  return longest.length > 100 ? longest.slice(0, 100) + '…' : longest;
}

function staffRoomExtractLongDialogue(dialogueTexts, threshold = 60) {
  const long = dialogueTexts.filter(d => d.length > threshold);
  if (long.length === 0) return null;
  const longest = long.reduce((a, b) => a.length > b.length ? a : b);
  return longest.length > 90 ? longest.slice(0, 90) + '…' : longest;
}

'''

if OLD4 in content:
    content = content.replace(OLD4, NEW4 + OLD4, 1)
    print("PATCH 4 applied: helper functions added")
else:
    print("PATCH 4 FAILED: anchor not found")

# ══════════════════════════════════════════════════════════════════
# PATCH 5: staffRoomRunAnalysis の itemDetails に quote フィールド追加
# 具体的なセリフ・ト書きの引用を itemDetails に保存する
# ══════════════════════════════════════════════════════════════════

# C-subtext: 説明台詞の引用
OLD5a = '''    if (scores['subtext'] <= 2 && onTheNoseCount >= 3) {
    notes.push({ type: 'bad', text: '❌ 説明台詞：解説的・説明的なセリフが' + onTheNoseCount + '箇所検出されました。「なんですよ」「つまり」「実は私」で説明するセリフを削り、行動・映像・沈黙で感情を表現してください。コンクール審査員は第1ページから説明台詞があると減点します。' });
  } else if (scores['subtext'] >= 4) {
    notes.push({ type: 'good', text: '✅ サブテキスト：説明台詞を排し、行間で感情・意図を表現できています。プロの書き方ができています。' + (subtextHardCount >= 2 ? '特に沈黙・間の使い方が効果的です。' : '') });
  }'''

NEW5a = '''  // 説明台詞の具体的な引用を抽出
  const onTheNoseSample = (() => {
    const patterns = ['なんですよ', 'ということは', 'つまり', '実は私', '要するに', 'ご存知の通り', '説明しておくと'];
    for (const d of dialogueTexts) {
      if (patterns.some(p => d.includes(p))) {
        return d.length > 80 ? d.slice(0, 80) + '…' : d;
      }
    }
    return null;
  })();

  if (scores['subtext'] <= 2 && onTheNoseCount >= 3) {
    const noteObj = { type: 'bad', text: '説明台詞（オン・ザ・ノーズ）：解説的・説明的なセリフが' + onTheNoseCount + '箇所検出されました。感情や意図を直接言葉で説明するセリフを削り、行動・映像・沈黙で表現してください。コンクール審査員は最初のページから説明台詞があると減点します。' };
    if (onTheNoseSample) noteObj.quote = '例：「' + onTheNoseSample + '」';
    notes.push(noteObj);
  } else if (scores['subtext'] >= 4) {
    notes.push({ type: 'good', text: 'サブテキスト：説明台詞を排し、行間で感情・意図を表現できています。プロの書き方ができています。' + (subtextHardCount >= 2 ? '特に沈黙・間の使い方が効果的です。' : '') });
  }'''

if OLD5a in content:
    content = content.replace(OLD5a, NEW5a, 1)
    print("PATCH 5a applied: subtext note with quote")
else:
    print("PATCH 5a FAILED")

# C-direction: ト書き引用
OLD5b = '''  if (scores['direction-clarity'] <= 2) {
    notes.push({ type: 'bad', text: '❌ ト書き：90字超の長いト書きが' + longActionCount + '箇所あります。ト書きに書くべきは「映像として見える最小限の情報」のみです。感情状態（「悲しみに暮れる」）を書かず、行動（「窓の外を見つめる」）で表してください。理想は1〜3文、30〜50字。' });
  }'''

NEW5b = '''  // 長いト書きの引用を抽出
  const longActionSample = (() => {
    const longActs = actionLines.filter(l => l.length > 90);
    if (longActs.length === 0) return null;
    const sample = longActs.reduce((a, b) => a.length > b.length ? a : b);
    return sample.length > 100 ? sample.slice(0, 100) + '…' : sample;
  })();

  if (scores['direction-clarity'] <= 2) {
    const noteObj = { type: 'bad', text: 'ト書き：90字超の長いト書きが' + longActionCount + '箇所あります。ト書きに書くべきは「映像として見える最小限の情報」のみです。感情状態（「悲しみに暮れる」）を書かず、行動（「窓の外を見つめる」）で表してください。理想は1〜3文、30〜50字。' };
    if (longActionSample) noteObj.quote = longActionSample;
    notes.push(noteObj);
  }'''

if OLD5b in content:
    content = content.replace(OLD5b, NEW5b, 1)
    print("PATCH 5b applied: direction note with quote")
else:
    print("PATCH 5b FAILED")

# セリフ長の引用
OLD5c = '''  if (avgDialogueLen > 70 && totalDialogueLines >= 3) {
    notes.push({ type: 'warn', text: '⚠️ セリフ長：平均' + Math.round(avgDialogueLen) + '字と長すぎます。実際の会話は10〜30字程度が自然です。長いセリフは「演説」に見えます。1セリフ60字超えたら分割か削除を検討してください。' });
  }'''

NEW5c = '''  // 長いセリフの引用を抽出
  const longDialogueSample = (() => {
    const long = dialogueTexts.filter(d => d.length > 70);
    if (long.length === 0) return null;
    const sample = long.reduce((a, b) => a.length > b.length ? a : b);
    return sample.length > 90 ? sample.slice(0, 90) + '…' : sample;
  })();

  if (avgDialogueLen > 70 && totalDialogueLines >= 3) {
    const noteObj = { type: 'warn', text: 'セリフ長：平均' + Math.round(avgDialogueLen) + '字と長めです。実際の会話は10〜30字程度が自然です。長いセリフは「演説」に見えます。1セリフ60字超えたら分割か削除を検討してください。' };
    if (longDialogueSample) noteObj.quote = '「' + longDialogueSample + '」';
    notes.push(noteObj);
  }'''

if OLD5c in content:
    content = content.replace(OLD5c, NEW5c, 1)
    print("PATCH 5c applied: dialogue length note with quote")
else:
    print("PATCH 5c FAILED")

# Want/Need 主人公名引用
OLD5d = '''  if (scores['protag-want-need'] <= 2) {
    notes.push({ type: 'bad', text: '❌ Want/Need：' + (mainCharName ? '「' + mainCharName + '」' : '主人公') + 'の欲求設計が弱い。①外的目標（Want: 何を手に入れたいか）と②内的必要性（Need: 本当は何が必要か）の両方を明確化し、両者が対立する構造にすると最強のドラマが生まれます。' });
  } else if (scores['protag-want-need'] >= 4) {
    notes.push({ type: 'good', text: '✅ Want/Need：' + (mainCharName ? '「' + mainCharName + '」' : '主人公') + 'の動機設計が優秀です。外的欲求と内的必要性が明確で、読者の感情移入を促す設計になっています。' });
  }'''

NEW5d = '''  if (scores['protag-want-need'] <= 2) {
    notes.push({ type: 'bad', text: 'Want/Need設計：' + (mainCharName ? '主人公「' + mainCharName + '」' : '主人公') + 'の欲求設計が弱い。①外的目標（Want: 何を手に入れたいか）と②内的必要性（Need: 本当は何が必要か）の両方を明確化し、両者が対立する構造にすると最強のドラマが生まれます。' });
  } else if (scores['protag-want-need'] >= 4) {
    notes.push({ type: 'good', text: 'Want/Need設計：' + (mainCharName ? '主人公「' + mainCharName + '」' : '主人公') + 'の動機設計が優秀です。外的欲求と内的必要性が明確で、読者の感情移入を促す設計になっています。' });
  }'''

if OLD5d in content:
    content = content.replace(OLD5d, NEW5d, 1)
    print("PATCH 5d applied: want/need note text cleaned")
else:
    print("PATCH 5d FAILED")

# キャラクターアーク
OLD5e = '''  if (scores['char-arc'] <= 2) {
    notes.push({ type: 'bad', text: '❌ キャラクターアーク：物語を通じた主人公の変容が描かれていません。脚本の最終目標は「主人公が変わること」です。第1幕で欠点/傷を見せ→第2幕で葛藤で壊れ→第3幕で変容する、の三段階で設計してください。' });
  }'''

NEW5e = '''  if (scores['char-arc'] <= 2) {
    notes.push({ type: 'bad', text: 'キャラクターアーク：物語を通じた主人公の変容が描かれていません。脚本の最終目標は「主人公が変わること」です。第1幕で欠点/傷を見せ→第2幕で葛藤で壊れ→第3幕で変容する、の三段階で設計してください。' });
  }'''

if OLD5e in content:
    content = content.replace(OLD5e, NEW5e, 1)
    print("PATCH 5e applied: char-arc note text cleaned")
else:
    print("PATCH 5e FAILED")

# 構成診断
OLD5f = '''  if (scores['three-act'] >= 4) {
    notes.push({ type: 'good', text: '✅ 構成：発端事件→対立→クライマックスの三幕構造が機能しています。' + (incitingInFirstHalf ? '前半での発端事件の配置も適切。' : '') + '読み手を最後まで引き付ける骨格があります。' });
  } else if (scores['three-act'] <= 2) {
    const missing = [];
    if (!hasIncitingIncident) missing.push('発端事件');
    if (!hasConflict) missing.push('対立・コンフリクト');
    if (!hasClimax) missing.push('クライマックス');
    notes.push({ type: 'bad', text: '❌ 構成：三幕構造に問題があります。不足要素：【' + missing.join('・') + '】。「①日常→②発端事件→③障害と葛藤→④クライマックス→⑤解決」の流れを意識して設計し直してください。現在' + sceneCount + 'シーン。' });
  }'''

NEW5f = '''  if (scores['three-act'] >= 4) {
    notes.push({ type: 'good', text: '構成：発端事件→対立→クライマックスの三幕構造が機能しています。' + (incitingInFirstHalf ? '前半での発端事件の配置も適切。' : '') + '読み手を最後まで引き付ける骨格があります。' });
  } else if (scores['three-act'] <= 2) {
    const missing = [];
    if (!hasIncitingIncident) missing.push('発端事件');
    if (!hasConflict) missing.push('対立・コンフリクト');
    if (!hasClimax) missing.push('クライマックス');
    notes.push({ type: 'bad', text: '構成：三幕構造に問題があります。不足要素：【' + missing.join('・') + '】。「①日常→②発端事件→③障害と葛藤→④クライマックス→⑤解決」の流れを意識して設計し直してください。現在' + sceneCount + 'シーン。' });
  }'''

if OLD5f in content:
    content = content.replace(OLD5f, NEW5f, 1)
    print("PATCH 5f applied: three-act note cleaned")
else:
    print("PATCH 5f FAILED")

# 対話ダイナミクス
OLD5g = '''  if (scores['dialogue-dynamics'] >= 4) {
    const _iakws = ['知らない', '秘密', '隠している', 'まだ言っていない', 'バレる', '気づいていない'];
    const _iaNote = _iakws.some(kw => text.includes(kw)) ? '情報の非対称性によるサスペンスも効果的。' : '';
    notes.push({ type: 'good', text: '✅ 対話の引力：キャラ間の緊張・欲求の衝突が会話に宿っています（緊張要素' + tensionCount + '箇所）。' + _iaNote });
  } else if (scores['dialogue-dynamics'] <= 2 && totalDialogueLines >= 4) {
    notes.push({ type: 'warn', text: '⚠️ 対話の引力：キャラクター間の会話に緊張感・目的の衝突が不足しています。各キャラが「異なる目的・情報・感情」を持って同じシーンに入場する設計にしてください。' });
  }'''

NEW5g = '''  if (scores['dialogue-dynamics'] >= 4) {
    const _iakws = ['知らない', '秘密', '隠している', 'まだ言っていない', 'バレる', '気づいていない'];
    const _iaNote = _iakws.some(kw => text.includes(kw)) ? '情報の非対称性によるサスペンスも効果的。' : '';
    notes.push({ type: 'good', text: '対話の引力：キャラ間の緊張・欲求の衝突が会話に宿っています（緊張要素' + tensionCount + '箇所）。' + _iaNote });
  } else if (scores['dialogue-dynamics'] <= 2 && totalDialogueLines >= 4) {
    notes.push({ type: 'warn', text: '対話の引力：キャラクター間の会話に緊張感・目的の衝突が不足しています。各キャラが「異なる目的・情報・感情」を持って同じシーンに入場する設計にしてください。' });
  }'''

if OLD5g in content:
    content = content.replace(OLD5g, NEW5g, 1)
    print("PATCH 5g applied: dialogue-dynamics note cleaned")
else:
    print("PATCH 5g FAILED")

# 映像化・作家性・作品力の絵文字削除
replacements_simple = [
    ('✅ 映像化適性：', '映像化適性：'),
    ('⚠️ 映像化コスト：', '映像化コスト：'),
    ('✅ 作家性：', '作家性：'),
    ('⚠️ 作家性：', '作家性：'),
    ('✅ 作品力：', '作品力：'),
    ('❌ 作品力：', '作品力（要強化）：'),
    ('⚠️ ペーシング：', 'ペーシング：'),
    ('📝 分量：', '分量：'),
    ('📝 分析：', '分析情報：'),
]
for old, new in replacements_simple:
    if old in content:
        content = content.replace(old, new)
        print(f"PATCH emoji cleanup: '{old[:20]}' -> '{new[:20]}'")

# ══════════════════════════════════════════════════════════════════
# PATCH 6: itemDetails に quote フィールドを追加（採点エンジン内）
# 各採点項目で問題のある具体的な行を引用する
# ══════════════════════════════════════════════════════════════════

# C-8: サブテキスト採点 - 問題行の引用追加
OLD6a = '''    itemDetails['subtext'] = { reasons, issues };'''

NEW6a = '''    // 問題のある説明台詞を引用
    const subtextQuote = (() => {
      const pats = ['なんですよ', 'ということは', 'つまり', '実は私', '要するに', '説明しておくと'];
      for (const d of dialogueTexts) {
        if (pats.some(p => d.includes(p))) return d.length > 70 ? d.slice(0, 70) + '…' : d;
      }
      return null;
    })();
    itemDetails['subtext'] = { reasons, issues, quote: subtextQuote ? '「' + subtextQuote + '」' : null };'''

if OLD6a in content:
    content = content.replace(OLD6a, NEW6a, 1)
    print("PATCH 6a applied: subtext itemDetails with quote")
else:
    print("PATCH 6a FAILED")

# C-11: ト書き採点 - 問題行の引用追加
OLD6b = '''    itemDetails['direction-clarity'] = { reasons, issues };'''

NEW6b = '''    const dirQuote = (() => {
      const long = actionLines.filter(l => l.length > 90);
      if (!long.length) return null;
      const s = long.sort((a,b) => b.length-a.length)[0];
      return s.length > 100 ? s.slice(0, 100) + '…' : s;
    })();
    itemDetails['direction-clarity'] = { reasons, issues, quote: dirQuote };'''

if OLD6b in content:
    content = content.replace(OLD6b, NEW6b, 1)
    print("PATCH 6b applied: direction-clarity itemDetails with quote")
else:
    print("PATCH 6b FAILED")

# C-9: セリフの自然さ - 問題行の引用追加
OLD6c = '''    itemDetails['naturalness'] = { reasons, issues };'''

NEW6c = '''    const naturalnessQuote = (() => {
      const long = dialogueTexts.filter(d => d.length > 55);
      if (!long.length) return null;
      const s = long.sort((a,b) => b.length-a.length)[0];
      return '「' + (s.length > 80 ? s.slice(0, 80) + '…' : s) + '」';
    })();
    itemDetails['naturalness'] = { reasons, issues, quote: naturalnessQuote };'''

if OLD6c in content:
    content = content.replace(OLD6c, NEW6c, 1)
    print("PATCH 6c applied: naturalness itemDetails with quote")
else:
    print("PATCH 6c FAILED")

# ══════════════════════════════════════════════════════════════════
# PATCH 7: ルーブリック各アイテムに quote 表示を追加
# ══════════════════════════════════════════════════════════════════

OLD7 = '''          const itemDetail = autoItemDetails[item.id] || {};
          const hasAutoScore = scores[item.id] !== undefined;
          const autoReasons = itemDetail.reasons || [];
          const autoIssues = itemDetail.issues || [];'''

NEW7 = '''          const itemDetail = autoItemDetails[item.id] || {};
          const hasAutoScore = scores[item.id] !== undefined;
          const autoReasons = itemDetail.reasons || [];
          const autoIssues = itemDetail.issues || [];
          const autoQuote = itemDetail.quote || null;'''

if OLD7 in content:
    content = content.replace(OLD7, NEW7, 1)
    print("PATCH 7 applied: itemDetail quote field extracted")
else:
    print("PATCH 7 FAILED")

# autoQuote をアイテムの下部に表示（issues の後）
OLD7b = '''            ${hasDiff ? `
            <div style="margin-top:5px;font-size:10px;color:${diffAmt>0?'#15803d':'#b91c1c'};font-weight:600">'''

NEW7b = '''            ${autoQuote ? `
            <div style="margin-top:6px;padding:6px 10px;background:rgba(0,0,0,.03);border-radius:5px;border-left:2px solid var(--border);font-family:'Noto Serif JP',serif;font-size:10.5px;color:var(--text-secondary);line-height:1.75;word-break:break-all">${esc(autoQuote)}</div>` : ''}
            ${hasDiff ? `
            <div style="margin-top:5px;font-size:10px;color:${diffAmt>0?'#15803d':'#b91c1c'};font-weight:600">'''

if OLD7b in content:
    content = content.replace(OLD7b, NEW7b, 1)
    print("PATCH 7b applied: quote block in rubric item")
else:
    print("PATCH 7b FAILED")

# ══════════════════════════════════════════════════════════════════
# PATCH 8: チュータリングパネルの UI 改善
# - 「改善前」「改善後」をよりコンパクトに
# - 採点した脚本からの引用を優先表示
# ══════════════════════════════════════════════════════════════════

OLD8 = '''    return `<div style="border:1px solid ${scoreColor}33;border-radius:10px;overflow:hidden;border-left:3px solid ${scoreColor}">
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
    </div>`;'''

NEW8 = '''    // 採点した脚本から実際の引用を取得（あれば優先表示）
    const scriptQuote = itemDetails[itemId]?.quote || null;
    return `<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;border-left:3px solid ${scoreColor};box-shadow:0 1px 4px rgba(0,0,0,.05)">
      <!-- ヘッダー -->
      <div style="padding:9px 13px;background:${scoreColor}08;display:flex;align-items:center;gap:8px;border-bottom:1px solid ${scoreColor}18">
        <span style="font-size:10px;background:${scoreColor};color:#fff;padding:1px 7px;border-radius:6px;font-weight:700;flex-shrink:0;letter-spacing:.04em">${urgency}</span>
        <span style="font-size:12.5px;font-weight:700;color:var(--text-primary)">${esc(db.label)}</span>
        <span style="font-size:11px;color:${scoreColor};font-weight:800;margin-left:auto">${score}<span style="font-size:9px;opacity:.6">/5</span></span>
      </div>
      <!-- 採点指摘（あれば引用つき） -->
      ${(issues.length > 0 || scriptQuote) ? `
      <div style="padding:9px 13px;background:var(--bg-subtle);border-bottom:1px solid var(--border-light,#f0f0f0)">
        ${issues.map(i2 => `<div style="font-size:10.5px;color:var(--momo);display:flex;gap:5px;margin-bottom:3px;align-items:flex-start"><span style="flex-shrink:0;margin-top:2px;width:13px;height:13px;border-radius:50%;background:var(--momo);display:flex;align-items:center;justify-content:center"><i class="fas fa-exclamation" style="font-size:7px;color:#fff"></i></span><span>${esc(i2)}</span></div>`).join('')}
        ${scriptQuote ? `<div style="margin-top:${issues.length>0?'6px':'0'};padding:6px 10px;background:var(--momo-bg,#fff5f5);border:1px solid var(--momo-border,#fecaca);border-radius:5px;font-family:'Noto Serif JP',serif;font-size:11px;color:#7f1d1d;line-height:1.75;word-break:break-all"><span style="font-size:9.5px;font-weight:700;color:var(--momo);display:block;margin-bottom:3px">採点対象の脚本から引用：</span>${esc(scriptQuote)}</div>` : ''}
      </div>` : ''}
      <!-- 改稿テクニック -->
      <div style="padding:12px 13px">
        <div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:9px;display:flex;align-items:center;gap:5px">
          <i class="fas fa-pen-nib" style="color:var(--fuji);font-size:10px"></i>
          改稿テクニック：${esc(tip.title)}
        </div>
        <!-- Before / After -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:9px">
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:7px;padding:8px 10px">
            <div style="font-size:9px;font-weight:700;color:#b91c1c;margin-bottom:5px;display:flex;align-items:center;gap:3px;text-transform:uppercase;letter-spacing:.06em">
              <span style="width:8px;height:8px;border-radius:50%;background:#b91c1c;flex-shrink:0"></span> Before（問題のあるパターン）
            </div>
            <pre style="font-size:10.5px;color:#7f1d1d;line-height:1.75;white-space:pre-wrap;margin:0;font-family:'Noto Serif JP',serif">${esc(tip.bad)}</pre>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:7px;padding:8px 10px">
            <div style="font-size:9px;font-weight:700;color:#15803d;margin-bottom:5px;display:flex;align-items:center;gap:3px;text-transform:uppercase;letter-spacing:.06em">
              <span style="width:8px;height:8px;border-radius:50%;background:#15803d;flex-shrink:0"></span> After（推奨する書き方）
            </div>
            <pre style="font-size:10.5px;color:#14532d;line-height:1.75;white-space:pre-wrap;margin:0;font-family:'Noto Serif JP',serif">${esc(tip.good)}</pre>
          </div>
        </div>
        <!-- 編集メモ -->
        <div style="background:var(--fuji-bg,#f5f0ff);border:1px solid var(--fuji-border,#e0d0ff);border-radius:7px;padding:8px 11px;display:flex;gap:8px;align-items:flex-start">
          <i class="fas fa-lightbulb" style="color:var(--fuji);font-size:11px;margin-top:2px;flex-shrink:0"></i>
          <div style="font-size:10.5px;color:var(--text-primary);line-height:1.75">${esc(tip.tip)}</div>
        </div>
      </div>
    </div>`;'''

if OLD8 in content:
    content = content.replace(OLD8, NEW8, 1)
    print("PATCH 8 applied: tutoring card redesigned")
else:
    print("PATCH 8 FAILED")

# ══════════════════════════════════════════════════════════════════
# PATCH 9: チュータリングパネルのセクションヘッダー改善
# ══════════════════════════════════════════════════════════════════

# Find the tutoring section header in the renderActiveSession
OLD9 = '''      <!-- AIチュータリング：改稿例 -->
      ${autoResult ? `'''

NEW9 = '''      <!-- AIチュータリング：改稿例 -->
      ${autoResult && Object.keys((session && session.scores)||{}).length > 0 ? `'''

# This one might be different - let's check
idx9 = content.find('<!-- AIチュータリング：改稿例 -->')
print(f"Tutoring section found at: {idx9}")
if idx9 >= 0:
    print(repr(content[idx9:idx9+200]))

PYEOF
