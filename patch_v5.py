import re

with open('public/static/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

original_size = len(content)
patches_applied = []

def apply_patch(name, old, new):
    global content
    if old not in content:
        print(f'  SKIP (not found): {name}')
        return False
    count = content.count(old)
    if count > 1:
        print(f'  WARN (multiple={count}): {name}')
    content = content.replace(old, new, 1)
    patches_applied.append(name)
    print(f'  OK: {name}')
    return True

# ============================================================
# PATCH 1: Expand detailNotes limit from 12 to 18
# ============================================================
apply_patch('P1-notes-limit',
    'detailNotes: notes.slice(0, 12)',
    'detailNotes: notes.slice(0, 18)'
)

# ============================================================
# PATCH 2: Enhanced diagnostic notes – add more analysis axes
# Add emotional-impact, authorial-voice, originality notes,
# and improve existing note text quality
# ============================================================

# Replace the existing notes block (after weaknesses/dialogue notes)
# We inject new notes after the existing "ト書き" note section
OLD_NOTES_END = '''  // ── ト書き診断
  if (scores[\'direction-clarity\'] <= 2) {
    const dirSample = (() => {
      const long = actionLines.filter(l => l.length > 90);
      if (!long.length) return null;
      const s = long.sort((a,b) => b.length-a.length)[0];
      return s.length > 100 ? s.slice(0, 100) + \'…\' : s;
    })();
    const noteObjDir = { type: \'bad\', text: \'ト書き：90字超の長いト書きが\' + longActionCount + \'箇所あります。ト書きに書くべきは「映像として見える最小限の情報」のみです。長い内面描写・感情説明は役者に任せましょう。理想は1〜3文、30〜50字\' };
    if (dirSample) noteObjDir.quote = dirSample;
    notes.push(noteObjDir);
  }'''

NEW_NOTES_END = '''  // ── ト書き診断
  if (scores['direction-clarity'] <= 2) {
    const dirSample = (() => {
      const long = actionLines.filter(l => l.length > 90);
      if (!long.length) return null;
      const s = long.sort((a,b) => b.length-a.length)[0];
      return s.length > 100 ? s.slice(0, 100) + '…' : s;
    })();
    const noteObjDir = { type: 'bad', text: 'ト書き：90字超の長いト書きが' + longActionCount + '箇所あります。ト書きに書くべきは「映像として見える最小限の情報」のみです。感情描写・内面説明は役者に委ねてください。理想：1〜2文・30〜50字。' };
    if (dirSample) noteObjDir.quote = dirSample;
    notes.push(noteObjDir);
  } else if (scores['direction-clarity'] >= 4 && actionLines.length >= 3) {
    notes.push({ type: 'good', text: 'ト書き：簡潔で映像的なト書きが書けています。平均' + Math.round(avgActionLen) + '字と適切な長さです。役者に「演じる余白」を与えるプロの書き方ができています。' });
  }

  // ── 情動的インパクト診断
  if (scores['emotional-impact'] >= 4) {
    notes.push({ type: 'good', text: '作品力：読者の感情を動かす力があります。' + (memorableCount > 0 ? '忘れられないシーンの予兆（' + memorableCount + '箇所）があり、' : '') + (hasCatharsis ? 'カタルシスの設計も確認できます。' : '') + '審査員の心に残る作品になっています。' });
  } else if (scores['emotional-impact'] <= 2) {
    const noEmotionNote = { type: 'bad', text: '作品力：感情的なピークシーンが弱い。「この場面で涙が出るか・鳥肌が立つか」を基準にクライマックスを再設計してください。感情表現密度' + Math.round(emotionDensity * 100) + '%・強い感情瞬間' + emotionStrongCount + '箇所。' };
    // Find a "flat" dialogue exchange to quote
    if (dialogueTexts.length >= 2) {
      const flatLines = dialogueTexts.filter(d => d.length > 5 && d.length < 30);
      if (flatLines.length >= 2) noEmotionNote.quote = '「' + flatLines[0] + '」「' + flatLines[1] + '」（感情的変化のない平板な交換）';
    }
    notes.push(noEmotionNote);
  }

  // ── オリジナリティ診断
  if (scores['originality'] <= 2 && totalChars > 200) {
    notes.push({ type: 'warn', text: 'オリジナリティ：ジャンルの独自性や切り口が薄い。「このシナリオでしか描けない何か」を一言で言えますか？ジャンルの定番を1つ裏切る要素、あるいは固有の体験から来る独自ディテールを追加してください。' });
  } else if (scores['originality'] >= 4) {
    notes.push({ type: 'good', text: 'オリジナリティ：' + (detectedGenres.length >= 2 ? detectedGenres.join('×') + 'のジャンル交差で独自性があります。' : '') + (poeticCount >= 2 ? '詩的・比喩的表現（' + poeticCount + '箇所）が文体に個性を与えています。' : '') + '書き手独自の視点が感じられます。' });
  }

  // ── 作家性診断
  if (scores['authorial-voice'] >= 4) {
    notes.push({ type: 'good', text: '作家性：文体に明確な個性があります。' + (repeatedMotifs >= 3 ? '繰り返しのモチーフ（' + repeatedMotifs + '語）が作品に統一感を与えています。' : '') + 'この書き手にしか書けない「声」が聞こえます。' });
  } else if (scores['authorial-voice'] <= 2) {
    notes.push({ type: 'warn', text: '作家性：文体の個性・一貫性が弱い。抽象語（「悲しい」「嬉しい」）を排し、固有の感覚的ディテール（「アスファルトの熱」「ガムの跡」）に置き換えてください。あなただけの観察眼を文体に注ぎ込む。' });
  }

  // ── テーマ診断
  if (scores['theme-clarity'] <= 2) {
    notes.push({ type: 'warn', text: 'テーマ：「この作品が言いたいこと」を一言で言えますか？テーマは台詞で語らせず、キャラクターの行動パターン・繰り返し・対比の中に埋め込んでください。テーマ的深度' + thematicDiversity + '概念。' });
  }

  // ── ビジュアル診断
  if (scores['visual'] <= 2 && actionLines.length < 3) {
    notes.push({ type: 'bad', text: 'ビジュアル：映像的な描写が不足しています。「カメラで撮れるか？」を基準にト書きを書き直してください。音・光・質感・空間の使い方で感情を表現する映像言語を意識してください。' });
  } else if (scores['visual'] >= 4) {
    notes.push({ type: 'good', text: 'ビジュアル：映像的描写が豊富です。' + (sensoryCount >= 2 ? '五感の描写（' + sensoryCount + '箇所）が読者の脳内に映像を生み出しています。' : '') + (memorableCount > 0 ? '忘れられないシーンの要素（' + memorableCount + '箇所）があります。' : '') });
  }

  // ── キャラクター固有性診断
  if (scores['char-unique'] >= 4) {
    notes.push({ type: 'good', text: 'キャラクター固有性：各キャラクターが固有の声・行動パターンを持っています。' + (charVocabUniqueness > 0.4 ? 'セリフの語彙差異が大きく（スコア' + Math.round(charVocabUniqueness * 100) + '%）、「誰のセリフか」が一目でわかります。' : '') });
  } else if (scores['char-unique'] <= 2 && uniqueChars >= 2) {
    const charUniqueNote = { type: 'warn', text: 'キャラクター固有性：' + uniqueChars + '人のキャラクターのセリフが似すぎています。各キャラに「語彙レベル・口癖・禁句」を設定し、声を差別化してください。' };
    // Quote least-speaking char
    if (Object.keys(charCounts).length >= 2) {
      const least = Object.entries(charCounts).sort((a,b) => a[1]-b[1])[0];
      const exD = (dialogueByChar[least[0]] || [])[0];
      if (exD) charUniqueNote.quote = least[0] + '「' + (exD.length > 50 ? exD.slice(0,50)+'…' : exD) + '」（最少発言キャラの例）';
    }
    notes.push(charUniqueNote);
  }

  // ── Want/Need 追加詳細（主人公名付き）
  if (scores['protag-want-need'] >= 4 && mainCharName) {
    notes.push({ type: 'good', text: 'Want/Need設計：「' + mainCharName + '」のWant（外的目標）とNeed（内的必要性）が明確で、ドラマの核として機能しています。この拮抗構造が物語の深みを生んでいます。' });
  }

  // ── フォーマット診断
  if (scores['format-correctness'] <= 2) {
    notes.push({ type: 'warn', text: '脚本フォーマット：柱書き（○場所・時間帯）・ト書き・台詞（キャラ名「台詞」）の基本三要素が不揃いです。プロ投稿ではシーン番号も必須。' + (!hasSceneNumbers && sceneCount > 0 ? 'シーン番号を追加してください。' : '') });
  }'''

apply_patch('P2-enhanced-notes', OLD_NOTES_END, NEW_NOTES_END)

# ============================================================
# PATCH 3: Add more quotes to itemDetails – emotional-impact,
#          visual, dialogue-dynamics, theme-clarity
# ============================================================

# After itemDetails['dialogue-dynamics']
OLD_DLGDYN_DETAIL = "    itemDetails['dialogue-dynamics'] = { reasons, issues };"
NEW_DLGDYN_DETAIL = """    // Quote a tension/conflict exchange
    const dlgDynQuote = (() => {
      const tensionKws = ['違う', 'やめろ', '頼む', 'なぜ', '嘘', '知らない', 'ふざけるな', '待って'];
      for (let i = 0; i < nonEmpty.length - 1; i++) {
        if (tensionKws.some(k => nonEmpty[i].includes(k) || (nonEmpty[i+1]||'').includes(k))) {
          const line1 = nonEmpty[i].slice(0, 50);
          const line2 = (nonEmpty[i+1] || '').slice(0, 50);
          if (line1 && line2) return line1 + '\\n' + line2;
        }
      }
      return null;
    })();
    itemDetails['dialogue-dynamics'] = { reasons, issues, quote: dlgDynQuote };"""

apply_patch('P3-dlg-dyn-quote', OLD_DLGDYN_DETAIL, NEW_DLGDYN_DETAIL)

# After itemDetails['visual']
OLD_VISUAL_DETAIL = "    itemDetails['visual'] = { reasons, issues };"
NEW_VISUAL_DETAIL = """    // Quote a strong visual action line
    const visualQuote = (() => {
      const strongVis = ['光', '影', '血', '涙', '炎', '雨', '音', '沈黙', '笑', '手', '目', '窓', '空'];
      const visCandidates = actionLines.filter(l => strongVis.some(kw => l.includes(kw)) && l.length >= 8 && l.length <= 80);
      return visCandidates.length > 0 ? visCandidates[0] : null;
    })();
    itemDetails['visual'] = { reasons, issues, quote: visualQuote };"""

apply_patch('P3-visual-quote', OLD_VISUAL_DETAIL, NEW_VISUAL_DETAIL)

# After itemDetails['emotional-impact']
OLD_EMOTION_DETAIL = "    itemDetails['emotional-impact'] = { reasons, issues };"
NEW_EMOTION_DETAIL = """    // Quote the most emotionally charged line
    const emotionQuote = (() => {
      const strongEmoPats = ['泣', '叫', '震', '息', '涙', '絶望', '抱', 'すまない', 'ごめん', '愛', '死', '怖'];
      const emoCandidates = [...dialogueTexts, ...actionLines].filter(l =>
        strongEmoPats.some(p => l.includes(p)) && l.length >= 5 && l.length <= 80
      );
      if (emoCandidates.length === 0) return null;
      const e = emoCandidates[0];
      return dialogueTexts.includes(e) ? '「' + e + '」' : e;
    })();
    itemDetails['emotional-impact'] = { reasons, issues, quote: emotionQuote };"""

apply_patch('P3-emotion-quote', OLD_EMOTION_DETAIL, NEW_EMOTION_DETAIL)

# After itemDetails['theme-clarity']
OLD_THEME_DETAIL = "    itemDetails['theme-clarity'] = { reasons, issues };"
NEW_THEME_DETAIL = """    // Quote a thematic keyword occurrence
    const themeQuote = (() => {
      const themeKws = ['愛', '正義', '孤独', '自由', '家族', '復讐', '赦し', '成長', '友情', '嘘', '真実', '信頼'];
      for (const d of dialogueTexts) {
        if (themeKws.some(k => d.includes(k)) && d.length >= 5) {
          return '「' + (d.length > 70 ? d.slice(0, 70) + '…' : d) + '」';
        }
      }
      return null;
    })();
    itemDetails['theme-clarity'] = { reasons, issues, quote: themeQuote };"""

apply_patch('P3-theme-quote', OLD_THEME_DETAIL, NEW_THEME_DETAIL)

# After itemDetails['protag-want-need']
OLD_WANT_DETAIL = "    itemDetails['protag-want-need'] = { reasons, issues };"
NEW_WANT_DETAIL = """    // Quote protagonist's goal-related line
    const wantQuote = (() => {
      const wantKws = ['欲しい', '手に入れ', '取り戻', '証明', '助け', '守', '勝ち', '成功', '見つけ', '逃げ', '殺', '探し'];
      if (!mainCharName) return null;
      const mainDlg = dialogueByChar[mainCharName] || [];
      for (const d of mainDlg) {
        if (wantKws.some(k => d.includes(k))) return mainCharName + '「' + (d.length > 60 ? d.slice(0,60)+'…' : d) + '」';
      }
      return null;
    })();
    itemDetails['protag-want-need'] = { reasons, issues, quote: wantQuote };"""

apply_patch('P3-want-quote', OLD_WANT_DETAIL, NEW_WANT_DETAIL)

# After itemDetails['char-arc']
OLD_ARC_DETAIL = "    itemDetails['char-arc'] = { reasons, issues };"
NEW_ARC_DETAIL = """    // Quote arc-related line (change/growth keyword)
    const arcQuote = (() => {
      const arcKws = ['変わった', '変われ', '変わる', '気づい', '認めた', '許せ', '決めた', 'もう戻れ', '一歩', '前に進'];
      for (const d of [...dialogueTexts, ...actionLines]) {
        if (arcKws.some(k => d.includes(k)) && d.length >= 5 && d.length <= 80) {
          return dialogueTexts.includes(d) ? '「' + d + '」' : d;
        }
      }
      return null;
    })();
    itemDetails['char-arc'] = { reasons, issues, quote: arcQuote };"""

apply_patch('P3-arc-quote', OLD_ARC_DETAIL, NEW_ARC_DETAIL)

# ============================================================
# PATCH 4: Improve suggestions tab – add Before/After quote blocks
# for each suggestion item in the UI rendering
# ============================================================
OLD_SUGGESTION_RENDER = """          <div id="sr-fb-suggestions-${s.id}" style="padding:12px 14px;display:none">
            ${(autoResult.suggestions||'').split('\\n').filter(l=>l.trim()).map(line => {
              const isItem = line.startsWith('・');
              const isSubItem = line.startsWith('  ') || line.startsWith('  （');
              if (isSubItem) return `<div style="padding:3px 0 3px 24px;font-size:10.5px;color:var(--text-secondary);line-height:1.7;font-family:'Noto Serif JP',serif">${esc(line.trim())}</div>`;
              if (!isItem) return `<div style="font-size:11.5px;line-height:1.9;color:var(--text-primary)">${esc(line)}</div>`;
              return `<div style="margin-bottom:2px;padding-top:6px">
                <div style="display:flex;gap:7px;align-items:flex-start">
                  <span style="flex-shrink:0;margin-top:3px;width:14px;height:14px;border-radius:50%;background:var(--kogane);display:inline-flex;align-items:center;justify-content:center;min-width:14px"><i class="fas fa-pen" style="font-size:6px;color:#fff"></i></span>
                  <span style="font-size:11.5px;line-height:1.75;color:var(--text-primary);font-weight:600">${esc(line.slice(1).trim())}</span>
                </div>
              </div>`;
            }).join('') || `<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:16px">自動採点後に生成されます</div>`}
          </div>"""

NEW_SUGGESTION_RENDER = """          <div id="sr-fb-suggestions-${s.id}" style="padding:12px 14px;display:none">
            ${(() => {
              const lines = (autoResult.suggestions||'').split('\\n').filter(l=>l.trim());
              if (!lines.length) return '<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:16px">自動採点後に生成されます</div>';
              let html = '';
              let currentItem = null;
              let subLines = [];
              const flushItem = () => {
                if (!currentItem) return;
                const bIdx = subLines.findIndex(l => l.includes('（改善前）') || l.includes('（Before）'));
                const aIdx = subLines.findIndex(l => l.includes('（改善後）') || l.includes('（After）'));
                if (bIdx >= 0 && aIdx >= 0) {
                  const beforeLines = [], afterLines = [], noteLines = [];
                  subLines.forEach((l, i) => {
                    if (i === bIdx) return;
                    if (i === aIdx) return;
                    if (bIdx < aIdx) {
                      if (i > bIdx && i < aIdx) beforeLines.push(l);
                      else if (i > aIdx) afterLines.push(l);
                      else noteLines.push(l);
                    } else {
                      if (i > aIdx && i < bIdx) afterLines.push(l);
                      else if (i > bIdx) beforeLines.push(l);
                      else noteLines.push(l);
                    }
                  });
                  const bText = beforeLines.map(l=>l.replace(/^→\s*/,'')).join('\\n').trim();
                  const aText = afterLines.map(l=>l.replace(/^→\s*/,'')).join('\\n').trim();
                  const nText = noteLines.join('\\n').trim();
                  html += '<div style="margin-bottom:12px;border:1px solid var(--border);border-radius:9px;overflow:hidden">' +
                    '<div style="padding:9px 13px;background:var(--bg-subtle);border-bottom:1px solid var(--border);display:flex;gap:7px;align-items:flex-start">' +
                    '<span style="flex-shrink:0;margin-top:2px;width:16px;height:16px;border-radius:50%;background:var(--kogane);display:inline-flex;align-items:center;justify-content:center;min-width:16px"><i class="fas fa-pen" style="font-size:7px;color:#fff"></i></span>' +
                    '<span style="font-size:12px;line-height:1.65;color:var(--text-primary);font-weight:700">' + esc(currentItem) + '</span></div>';
                  if (nText) html += '<div style="padding:7px 13px 0;font-size:10.5px;color:var(--text-secondary);line-height:1.7">' + esc(nText) + '</div>';
                  if (bText || aText) {
                    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px 13px 10px">';
                    if (bText) html += '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:7px 9px"><div style="font-size:8.5px;font-weight:800;color:#b91c1c;margin-bottom:4px;letter-spacing:.05em;display:flex;align-items:center;gap:3px"><span style="width:7px;height:7px;border-radius:50%;background:#b91c1c;flex-shrink:0;display:inline-block"></span>改善前</div><pre style="font-size:10px;color:#7f1d1d;line-height:1.7;white-space:pre-wrap;margin:0;font-family:\'Noto Serif JP\',serif">' + esc(bText) + '</pre></div>';
                    if (aText) html += '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:7px 9px"><div style="font-size:8.5px;font-weight:800;color:#15803d;margin-bottom:4px;letter-spacing:.05em;display:flex;align-items:center;gap:3px"><span style="width:7px;height:7px;border-radius:50%;background:#15803d;flex-shrink:0;display:inline-block"></span>改善後</div><pre style="font-size:10px;color:#14532d;line-height:1.7;white-space:pre-wrap;margin:0;font-family:\'Noto Serif JP\',serif">' + esc(aText) + '</pre></div>';
                    html += '</div>';
                  } else if (subLines.length) {
                    html += '<div style="padding:7px 13px 10px">' + subLines.map(l => '<div style="font-size:10.5px;color:var(--text-secondary);line-height:1.7;padding:1px 0 1px 6px;font-family:\'Noto Serif JP\',serif">' + esc(l.replace(/^（改善[前後]）\s*/,'').replace(/^（[BA][ea][f]fore[r]?）\s*/,'')) + '</div>').join('') + '</div>';
                  }
                  html += '</div>';
                } else {
                  html += '<div style="margin-bottom:10px;border:1px solid var(--border);border-radius:9px;overflow:hidden">' +
                    '<div style="padding:9px 13px;background:var(--bg-subtle);border-bottom:1px solid var(--border);display:flex;gap:7px;align-items:flex-start">' +
                    '<span style="flex-shrink:0;margin-top:2px;width:16px;height:16px;border-radius:50%;background:var(--kogane);display:inline-flex;align-items:center;justify-content:center;min-width:16px"><i class="fas fa-pen" style="font-size:7px;color:#fff"></i></span>' +
                    '<span style="font-size:12px;line-height:1.65;color:var(--text-primary);font-weight:700">' + esc(currentItem) + '</span></div>';
                  if (subLines.length) html += '<div style="padding:8px 13px 10px">' + subLines.map(l => '<div style="font-size:10.5px;color:var(--text-secondary);line-height:1.75;padding:2px 0 2px 6px">' + esc(l) + '</div>').join('') + '</div>';
                  html += '</div>';
                }
                currentItem = null; subLines = [];
              };
              for (const line of lines) {
                if (line.startsWith('・')) { flushItem(); currentItem = line.slice(1).trim(); subLines = []; }
                else { subLines.push(line.trim()); }
              }
              flushItem();
              return html;
            })()}
          </div>"""

apply_patch('P4-suggestion-render', OLD_SUGGESTION_RENDER, NEW_SUGGESTION_RENDER)

# ============================================================
# PATCH 5: Improve diagnostic note card – add section header
# showing category name for each note
# ============================================================
OLD_NOTE_CARD = """              <div style="border:1px solid ${n.type==='good'?'var(--matcha-border)':n.type==='warn'?'var(--kogane-border)':'var(--momo-border)'};border-radius:8px;overflow:hidden;border-left:3px solid ${n.type==='good'?'var(--matcha)':n.type==='warn'?'var(--kogane)':'var(--momo)'}">
                <div style="padding:9px 12px;background:${n.type==='good'?'var(--matcha-bg)':n.type==='warn'?'var(--kogane-bg)':'var(--momo-bg)'};display:flex;gap:8px;align-items:flex-start">
                  <span style="flex-shrink:0;margin-top:2px;width:16px;height:16px;border-radius:50%;background:${n.type==='good'?'var(--matcha)':n.type==='warn'?'var(--kogane)':'var(--momo)'};display:inline-flex;align-items:center;justify-content:center;min-width:16px">
                    <i class="fas ${n.type==='good'?'fa-check':n.type==='warn'?'fa-exclamation':'fa-times'}" style="font-size:8px;color:#fff"></i>
                  </span>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:11.5px;line-height:1.75;color:var(--text-primary)">${esc(n.text)}</div>
                    ${n.quote ? '<div style="margin-top:7px;padding:7px 11px;background:rgba(0,0,0,.04);border-radius:5px;border-left:2px solid ' + (n.type==='good'?'var(--matcha)':n.type==='warn'?'var(--kogane)':'var(--momo)') + ';font-size:11px;color:var(--text-secondary);line-height:1.8;white-space:pre-wrap;word-break:break-all">' + esc(n.quote) + '</div>' : ''}
                  </div>
                </div>
              </div>`).join('')}"""

NEW_NOTE_CARD = """              <div style="border:1px solid ${n.type==='good'?'var(--matcha-border)':n.type==='warn'?'var(--kogane-border)':'var(--momo-border)'};border-radius:9px;overflow:hidden;border-left:3px solid ${n.type==='good'?'var(--matcha)':n.type==='warn'?'var(--kogane)':'var(--momo)'}">
                <div style="padding:8px 12px 8px 11px;background:${n.type==='good'?'var(--matcha-bg)':n.type==='warn'?'var(--kogane-bg)':'var(--momo-bg)'};display:flex;gap:8px;align-items:flex-start">
                  <span style="flex-shrink:0;margin-top:2px;width:17px;height:17px;border-radius:50%;background:${n.type==='good'?'var(--matcha)':n.type==='warn'?'var(--kogane)':'var(--momo)'};display:inline-flex;align-items:center;justify-content:center;min-width:17px;box-shadow:0 1px 4px ${n.type==='good'?'rgba(34,197,94,.25)':n.type==='warn'?'rgba(234,179,8,.25)':'rgba(239,68,68,.25)'}">
                    <i class="fas ${n.type==='good'?'fa-check':n.type==='warn'?'fa-exclamation':'fa-times'}" style="font-size:8px;color:#fff"></i>
                  </span>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:11.5px;line-height:1.8;color:var(--text-primary);font-weight:500">${esc(n.text)}</div>
                    ${n.quote ? `<div style="margin-top:8px;padding:7px 11px 7px 10px;background:rgba(0,0,0,.035);border-radius:6px;border-left:2px solid ${n.type==='good'?'var(--matcha)':n.type==='warn'?'var(--kogane)':'var(--momo)'};font-size:10.5px;color:var(--text-secondary);line-height:1.85;white-space:pre-wrap;word-break:break-all;font-family:'Noto Serif JP',serif"><span style="font-size:9px;font-weight:700;color:${n.type==='good'?'var(--matcha)':n.type==='warn'?'var(--kogane)':'var(--momo)'};display:block;margin-bottom:3px;letter-spacing:.04em">${n.type==='good'?'引用（好例）':n.type==='warn'?'引用（注意箇所）':'引用（問題箇所）'}</span>${esc(n.quote)}</div>` : ''}
                  </div>
                </div>
              </div>`).join('')}"""

apply_patch('P5-note-card', OLD_NOTE_CARD, NEW_NOTE_CARD)

# ============================================================
# PATCH 6: Improve rubric item quote block styling
# ============================================================
OLD_QUOTE_BLOCK = """            ${autoQuote ? `
            <div style="margin-top:6px;padding:6px 10px;background:rgba(0,0,0,.03);border-radius:5px;border-left:2px solid var(--border);font-family:'Noto Serif JP',serif;font-size:10.5px;color:var(--text-secondary);line-height:1.75;word-break:break-all">${esc(autoQuote)}</div>` : ''}"""

NEW_QUOTE_BLOCK = """            ${autoQuote ? `
            <div style="margin-top:7px;padding:7px 10px 7px 9px;background:rgba(0,0,0,.028);border-radius:6px;border-left:2px solid ${scoreVal<=2?'var(--momo)':scoreVal>=4?'var(--matcha)':'var(--kogane)'};font-family:'Noto Serif JP',serif;font-size:10px;color:var(--text-secondary);line-height:1.85;word-break:break-all">
              <span style="font-size:8.5px;font-weight:700;color:${scoreVal<=2?'var(--momo)':scoreVal>=4?'var(--matcha)':'var(--kogane)'};display:block;margin-bottom:3px;letter-spacing:.04em">${scoreVal<=2?'問題箇所の引用':'脚本からの引用'}</span>${esc(autoQuote)}</div>` : ''}"""

apply_patch('P6-quote-block-style', OLD_QUOTE_BLOCK, NEW_QUOTE_BLOCK)

# ============================================================
# PATCH 7: Add voice/naturalness ITEM_DB tip (missing entries)
# Also add originality second tip
# ============================================================
OLD_VOICE_TIP = """    'voice': {
      label: 'キャラクターの声の固有性',
      tips: [
        { title: '同じ声のキャラクターを個性化する', bad: '田中「今日の打ち合わせはどうだった？」\\n花子「まあまあだったよ。うまくいったと思う」\\n上司「そうか。よかった」', good: '田中（早口・省略型）「打ち合わせ、どうだ」\\n花子（丁寧・間が長い）「……えーと、先方が、少し難しいとおっしゃって、いたんですが」\\n上司（直球・結論先行）「通ったか、通らなかったか」', tip: 'キャラごとに「話すスピード・語彙レベル・文末の癖・省略の有無・間の長さ」を設計する。声の設計書を作ってから台詞を書くと統一感が生まれます。' },
      ]
    },"""

NEW_VOICE_TIP = """    'voice': {
      label: 'キャラクターの声の固有性',
      tips: [
        { title: '同じ声のキャラクターを個性化する', bad: '田中「今日の打ち合わせはどうだった？」\\n花子「まあまあだったよ。うまくいったと思う」\\n上司「そうか。よかった」', good: '田中（早口・省略型）「打ち合わせ、どうだ」\\n花子（丁寧・間が長い）「……えーと、先方が、少し難しいとおっしゃって、いたんですが」\\n上司（直球・結論先行）「通ったか、通らなかったか」', tip: 'キャラごとに「話すスピード・語彙レベル・文末の癖・省略の有無・間の長さ」を設計する。声の設計書を作ってから台詞を書くと統一感が生まれます。' },
        { title: '「禁句（絶対言わない言葉）」を設定して声を強化する', bad: '田中「愛しているよ、花子」\\n（田中は直球で感情を言葉にする）', good: '田中「……傘、二本目買ったな」\\n花子「え？」\\n田中「（背を向けながら）晴れてる日は、貸し出し用に。（小声で）そういうことだ」\\n→ 「愛している」と絶対言わないキャラ。行動と代替物で愛情を示す。', tip: '「このキャラが絶対言わない言葉」を設定すると、台詞を書くときに自然に回り道をするようになります。その回り道が「声の個性」です。' },
      ]
    },"""

apply_patch('P7-voice-tips', OLD_VOICE_TIP, NEW_VOICE_TIP)

# ============================================================
# PATCH 8: Add emotional-impact to ITEM_DB (currently missing)
# ============================================================
OLD_EIMPACT_MISSING = """    'emotional-impact': {
      label: '情動的インパクト',
      tips: [
        { title: '感情を動かす「決定的瞬間」の挿入', bad: '田中「わかった。もう気にしない」\\n（田中は歩き去る）', good: 'しばらく沈黙。\\n田中、眼を細め、一歩だけ踏み出す——けれど止まる。\\nそのままゆっくりと踵を返す。\\n佐藤「……田中」\\n田中、振り返らない。', tip: '「感情を語らせず、行動と沈黙で見せる」。台詞で感情を説明するのではなく、キャラクターの身体的反応・間・行動で伝えましょう。' },
        { title: 'カタルシスのある最終シーンへの改稿', bad: '田中「ありがとう。君のおかげで変われた」\\n花子「いつでも来てね」', good: 'ゆっくり、田中の手が花子の手をにぎる。\\n花子、驚いて——でも手を離さない。\\n雨が止む音。\\n（二人、言葉なく）', tip: 'クライマックスは台詞より「動作・音・光」で締める。観客が「涙の理由」を自分で発見できる余白を作りましょう。' },
      ]
    },"""

NEW_EIMPACT = """    'emotional-impact': {
      label: '情動的インパクト',
      tips: [
        { title: '感情を動かす「決定的瞬間」の挿入', bad: '田中「わかった。もう気にしない」\\n（田中は歩き去る）', good: 'しばらく沈黙。\\n田中、眼を細め、一歩だけ踏み出す——けれど止まる。\\nそのままゆっくりと踵を返す。\\n佐藤「……田中」\\n田中、振り返らない。', tip: '「感情を語らせず、行動と沈黙で見せる」。台詞で感情を説明するのではなく、キャラクターの身体的反応・間・行動で伝えましょう。' },
        { title: 'カタルシスのある最終シーンへの改稿', bad: '田中「ありがとう。君のおかげで変われた」\\n花子「いつでも来てね」', good: 'ゆっくり、田中の手が花子の手をにぎる。\\n花子、驚いて——でも手を離さない。\\n雨が止む音。\\n（二人、言葉なく）', tip: 'クライマックスは台詞より「動作・音・光」で締める。観客が「涙の理由」を自分で発見できる余白を作りましょう。' },
        { title: '「最悪の瞬間」を設計して感情のピークを作る', bad: '田中は落ち込んでいた。\\n田中「うまくいかないな」\\n花子「大丈夫だよ」', good: '病室。父の手が——冷たい。\\n田中、謝ろうとした——間に合わなかった。\\n（長い沈黙）\\n田中の手から、書きかけの手紙がこぼれ落ちる。', tip: 'ドラマの感情ピークは「もう手遅れ」「間に合わなかった」「取り返しがつかない」瞬間に生まれます。最悪の状況を最大限に活用してください。' },
      ]
    },"""

apply_patch('P8-emotional-tips', OLD_EIMPACT_MISSING, NEW_EIMPACT)

# ============================================================
# PATCH 9: Improve the scoring rubric items display
# – Show "why this matters" tooltip-style for each item
# – Add a score trend indicator when score history exists
# ============================================================

# Add a stronger visual indicator for the category score bar
OLD_CAT_BAR = """        <div style="width:60px;height:4px;background:var(--border);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${catScore}%;background:${catScore>=80?'var(--matcha)':catScore>=60?'var(--kogane)':'var(--momo)'};border-radius:2px;transition:width .5s ease"></div>
          </div>"""

NEW_CAT_BAR = """        <div style="width:70px;height:5px;background:var(--border);border-radius:3px;overflow:hidden;margin-top:2px">
            <div style="height:100%;width:${catScore}%;background:${catScore>=80?'linear-gradient(90deg,var(--matcha),#4ade80)':catScore>=60?'linear-gradient(90deg,var(--kogane),#fbbf24)':'linear-gradient(90deg,var(--momo),#f87171)'};border-radius:3px;transition:width .6s ease"></div>
          </div>"""

apply_patch('P9-cat-bar', OLD_CAT_BAR, NEW_CAT_BAR)

# ============================================================
# PATCH 10: Add new sections to suggestions - character voice,
#           theme, pacing with more specific dialogue examples
# ============================================================
OLD_SUGGESTIONS_GEN = """  if (scores['authorial-voice'] <= 2) {
    suggestions_parts.push('・「自分にしか書けないシーン」を1つ作る。実体験・記憶・独自の観察から来る具体的なディテールを1シーンに注ぎ込む。比喩・反復・固有名詞を積極的に使い、文体に「あなたの声」を刻む。');
  }
  if (scores['emotional-impact'] <= 2) {
    suggestions_parts.push('・意外性・逆転の要素を1つ追加する。「実は○○だった」「まさか○○が」などの転換点を中盤〜後半に設け、読者の予想を裏切る展開を設計してください。');
  }"""

NEW_SUGGESTIONS_GEN = """  if (scores['authorial-voice'] <= 2) {
    suggestions_parts.push('・「自分にしか書けないシーン」を1つ作る。\n  具体例：\n  （改善前）夕暮れの街。田中は悲しそうに歩く。\n  （改善後）夕暮れ。アスファルトがじわじわと白くなる時間。\n  田中の靴底に、ガムの跡。（踏んでしまったのは、三歩前だった）\n  → 「悲しい」と書かず、固有の感覚的ディテールで語る');
  }
  if (scores['emotional-impact'] <= 2) {
    suggestions_parts.push('・感情のピークを「行動と沈黙」で設計する。\n  具体例：\n  （改善前）田中「悔しい……本当に悔しい」\n  （改善後）田中、机を一度だけ叩く——静かに。\n  そのまま立ち上がり、電気を消す。\n  暗闇の中、キーボードを打つ音だけが続く。\n  → 感情は「言わず、体の行動」で示す');
  }
  if (scores['theme-clarity'] <= 2) {
    suggestions_parts.push('・テーマを「繰り返し」と「対比」で物語に埋め込む。\n  具体例（テーマ：「一人では生きられない」）：\n  ・第1幕：主人公が何事も一人でやろうとして失敗する\n  ・第2幕：助けを求めることを拒否して最悪の状況になる\n  ・第3幕：初めて手を差し伸べられ受け入れる——成功する\n  → テーマは「主人公の行動の変化」で示す');
  }
  if (scores['voice'] <= 2 && uniqueChars >= 2) {
    suggestions_parts.push('・各キャラクターの「声の設計書」を作ってから書き直す。\n  設計書例：\n  田中：【語彙】短文・動詞省略　【癖】「……」多用　【禁句】感情の直接表現\n  花子：【語彙】丁寧語・回り道　【癖】話題をずらす　【禁句】断言・断定\n  → この設計書を元に全セリフを見直す');
  }"""

apply_patch('P10-suggestions-gen', OLD_SUGGESTIONS_GEN, NEW_SUGGESTIONS_GEN)

# ============================================================
# PATCH 11: Add "analysisStats extended" display in banner
# – show more metrics
# ============================================================
OLD_STATS_DISPLAY = """                  ${autoResult.analysisStats ? `<span style="font-size:10px;color:rgba(255,255,255,.4)">${autoResult.analysisStats.sceneCount||0}シーン · 人物${autoResult.analysisStats.uniqueChars||0}人 · セリフ${autoResult.analysisStats.dialogueRatio||0}% · 感情${autoResult.analysisStats.emotionDensity||0}% · 緊張${autoResult.analysisStats.tensionCount||0}</span>` : ''}"""

NEW_STATS_DISPLAY = """                  ${autoResult.analysisStats ? `<span style="font-size:9.5px;color:rgba(255,255,255,.45);line-height:1.6">${autoResult.analysisStats.sceneCount||0}シーン · ${autoResult.analysisStats.uniqueChars||0}人 · セリフ${autoResult.analysisStats.dialogueRatio||0}% · 感情${autoResult.analysisStats.emotionDensity||0}% · 緊張${autoResult.analysisStats.tensionCount||0}${autoResult.analysisStats.onTheNoseCount > 0 ? ' · 説明台詞'+autoResult.analysisStats.onTheNoseCount+'件' : ''}${autoResult.analysisStats.hasCatharsis ? ' · カタルシスあり' : ''}</span>` : ''}"""

apply_patch('P11-stats-display', OLD_STATS_DISPLAY, NEW_STATS_DISPLAY)

# ============================================================
# PATCH 12: Improve tutor panel header text
# ============================================================
OLD_TUTOR_HEADER = """            <span style="font-size:11px;font-weight:700;color:var(--text-primary)">AIチュータリング</span>
            <span style="font-size:9.5px;background:var(--fuji-bg,#f0eeff);color:var(--fuji);border:1px solid var(--fuji-border,#e0d0ff);padding:1px 7px;border-radius:8px;font-weight:600">優先課題の書き直し例</span>"""

NEW_TUTOR_HEADER = """            <span style="font-size:11px;font-weight:700;color:var(--text-primary)">改稿テクニック</span>
            <span style="font-size:9.5px;background:var(--fuji-bg,#f0eeff);color:var(--fuji);border:1px solid var(--fuji-border,#e0d0ff);padding:1px 7px;border-radius:8px;font-weight:600">弱点項目の書き直し例（脚本引用つき）</span>"""

apply_patch('P12-tutor-header', OLD_TUTOR_HEADER, NEW_TUTOR_HEADER)

# ============================================================
# PATCH 13: Add 'originality' second tip in ITEM_DB
# ============================================================
OLD_ORIGIN_TIP = """    'originality': {
      label: 'オリジナリティ',
      tips: [
        { title: '「よくある設定」に独自の反転を加える', bad: '（刑事が事件を解決するありきたりな話）', good: '（記憶を「売買」できる世界で、刑事が自分の記憶が犯人によって「書き換えられていた」と気づく話）', tip: '既存ジャンルに「一つだけ独自のルール」を加えると世界観が生まれます。「もし○○だったら？」の問いを起点に設定を反転させましょう。' },
      ]
    },"""

NEW_ORIGIN_TIP = """    'originality': {
      label: 'オリジナリティ',
      tips: [
        { title: '「よくある設定」に独自の反転を加える', bad: '（刑事が事件を解決するありきたりな話）', good: '（記憶を「売買」できる世界で、刑事が自分の記憶が犯人によって「書き換えられていた」と気づく話）', tip: '既存ジャンルに「一つだけ独自のルール」を加えると世界観が生まれます。「もし○○だったら？」の問いを起点に設定を反転させましょう。' },
        { title: '固有の体験を「普遍的な物語」に昇華する', bad: '（どこかで読んだような「感動系」の話）', good: '（書き手が実際に経験した「お葬式で誰も泣かなかった父の死」という体験を元に：\n葬儀屋が最高の演技で「泣かせ屋」として遺族を助ける話——\nだが主人公自身は、本物の悲しみを知らないことに気づく）', tip: '最もオリジナルな素材は「あなた自身の記憶・体験・違和感」の中にあります。そこから出発して、普遍的なテーマへ昇華させると唯一無二の作品になります。' },
      ]
    },"""

apply_patch('P13-origin-tip', OLD_ORIGIN_TIP, NEW_ORIGIN_TIP)

# ============================================================
# PATCH 14: Add 'protag-want-need' second tip in ITEM_DB
# ============================================================
OLD_WANT_TIPS = """    'protag-want-need': {
      label: 'Want/Need設計',
      tips: [
        { title: 'Want（外的目標）とNeed（内的必要性）を分離して設計する', bad: '（主人公は事件を解決したいだけで、内面的な成長がない）', good: 'Want（外的目標）: 失踪した娘を探し出す\\nNeed（内的必要性）: 娘に謝れなかった過去を受け入れる\\n→ 物語の終わりに、Wantを達成しても、Needを満たさなければ真の解決にならないことが明らかになる', tip: 'WantとNeedは「表の物語」と「裏の物語」を作ります。Wantが叶う/叶わないに関わらず、Needに向き合う瞬間がクライマックスになるよう設計しましょう。' },
      ]
    },"""

NEW_WANT_TIPS = """    'protag-want-need': {
      label: 'Want/Need設計',
      tips: [
        { title: 'Want（外的目標）とNeed（内的必要性）を分離して設計する', bad: '（主人公は事件を解決したいだけで、内面的な成長がない）', good: 'Want（外的目標）: 失踪した娘を探し出す\\nNeed（内的必要性）: 娘に謝れなかった過去を受け入れる\\n→ 物語の終わりに、Wantを達成しても、Needを満たさなければ真の解決にならないことが明らかになる', tip: 'WantとNeedは「表の物語」と「裏の物語」を作ります。Wantが叶う/叶わないに関わらず、Needに向き合う瞬間がクライマックスになるよう設計しましょう。' },
        { title: 'WantとNeedを「対立」させてドラマを深める', bad: '田中「証拠を見つけたい（Want）」——証拠を見つけることで成長もする。矛盾がない。', good: 'Want（外的目標）: 犯人を暴いて正義を実現したい\\nNeed（内的必要性）: 復讐心ではなく真実のために戦う自分になること\\n→ WantとNeedが対立している——犯人を暴こうとするほど、「正義」ではなく「復讐」になっていく。\\nクライマックスで「WantよりNeedを選ぶ」かどうかが問われる。', tip: 'WantとNeedが同じ方向を向いていると物語に葛藤が生まれません。WantとNeedを「対立する方向」に設計し、どちらを選ぶかがクライマックスになるよう作りましょう。' },
      ]
    },"""

apply_patch('P14-want-tips', OLD_WANT_TIPS, NEW_WANT_TIPS)

# ============================================================
# PATCH 15: Add 'char-arc' second tip
# ============================================================
OLD_ARC_TIP = """    'char-arc': {
      label: 'キャラクターアーク',
      tips: [
        { title: '変化前/変化後の「対比シーン」を設計', bad: '（主人公が変化したという説明台詞）\\n田中「昔の俺とは違う。変われた気がする」', good: '【第一幕・冒頭】田中、困っている老人を無視して通り過ぎる。\\n（中略）\\n【第三幕・終盤】田中、今度は立ち止まる——でも、何も言わずに老人の荷物を持ちあげる。', tip: '「変化は語るな、見せろ」。同じ状況を2回書き、行動の違いで変化を示す。これをブックエンド構造と言います。' },
      ]
    },"""

NEW_ARC_TIP = """    'char-arc': {
      label: 'キャラクターアーク',
      tips: [
        { title: '変化前/変化後の「対比シーン」を設計', bad: '（主人公が変化したという説明台詞）\\n田中「昔の俺とは違う。変われた気がする」', good: '【第一幕・冒頭】田中、困っている老人を無視して通り過ぎる。\\n（中略）\\n【第三幕・終盤】田中、今度は立ち止まる——でも、何も言わずに老人の荷物を持ちあげる。', tip: '「変化は語るな、見せろ」。同じ状況を2回書き、行動の違いで変化を示す。これをブックエンド構造と言います。' },
        { title: '「欠点がドラマを引き起こす」アーク設計', bad: '田中は正義感が強い——その正義感で事件を解決する。（欠点が物語に関与しない）', good: '田中の欠点：「白黒思考」（グレーが許せない）\\n→ 事件を追うほど「被疑者」が実は被害者だと判明していく\\n→ 田中の白黒思考が、真実を見えなくさせている\\n→ クライマックス：グレーを受け入れることで初めて真相が見える\\n→ これがアーク（欠点の克服）', tip: 'キャラクターの欠点が、ドラマの核心と直結している設計がベストです。欠点がなければ問題も起きない——欠点を克服することが物語の解決になる。' },
      ]
    },"""

apply_patch('P15-arc-tip', OLD_ARC_TIP, NEW_ARC_TIP)

# ============================================================
# PATCH 16: Add visual/authorial-voice second tip
# ============================================================
OLD_VISUAL_TIPS = """    'visual': {
      label: 'ビジュアルストーリーテリング',
      tips: [
        { title: '説明的ト書き → 映像的ト書きへの変換', bad: '田中は悲しんでいる。彼は友達を亡くしたことを後悔している。', good: '田中の机に、飲みかけのコーヒーカップが二つ。\\n片方はずっと冷めたまま。', tip: '感情・状況・バックストーリーを「具体的な物・光・空間」で表現。「キャラが何を感じているか」ではなく「カメラが何を映すか」を書きましょう。' },
        { title: '音と光でシーンを締める', bad: '二人は別れた。田中は一人になった。', good: 'ドアが閉まる。\\n部屋に残るのは、花子の香水の残り香と、止まった時計。', tip: '「聴覚・嗅覚・触覚」の感覚的ディテールを加えると読者の脳内で映像が動き出します。感情に「音・匂い・質感」を対応させましょう。' },
      ]
    },"""

NEW_VISUAL_TIPS = """    'visual': {
      label: 'ビジュアルストーリーテリング',
      tips: [
        { title: '説明的ト書き → 映像的ト書きへの変換', bad: '田中は悲しんでいる。彼は友達を亡くしたことを後悔している。', good: '田中の机に、飲みかけのコーヒーカップが二つ。\\n片方はずっと冷めたまま。', tip: '感情・状況・バックストーリーを「具体的な物・光・空間」で表現。「キャラが何を感じているか」ではなく「カメラが何を映すか」を書きましょう。' },
        { title: '音と光でシーンを締める', bad: '二人は別れた。田中は一人になった。', good: 'ドアが閉まる。\\n部屋に残るのは、花子の香水の残り香と、止まった時計。', tip: '「聴覚・嗅覚・触覚」の感覚的ディテールを加えると読者の脳内で映像が動き出します。感情に「音・匂い・質感」を対応させましょう。' },
        { title: '冒頭の「つかみ」を映像で設計する', bad: '1 ○オフィス・昼\\n田中、デスクで仕事をしている。電話が鳴る。田中、出る。', good: '1 ○オフィス・昼（退社時刻）\\n全員が帰り支度をする中——田中（32）の机だけ、電気がついている。\\n積み上げられた書類の山。\\n電話が鳴る。\\n田中、三コール待って——出る。「……はい」', tip: '最初の1シーンで「キャラの状況と問題」を映像で示す。見る人が「なぜ？」と思う画を冒頭に置く。説明セリフは不要——画が全てを語る。' },
      ]
    },"""

apply_patch('P16-visual-tips', OLD_VISUAL_TIPS, NEW_VISUAL_TIPS)

# Write back
with open('public/static/app.js', 'w', encoding='utf-8') as f:
    f.write(content)

new_size = len(content)
print(f'\nOriginal: {original_size:,} chars')
print(f'New:      {new_size:,} chars')
print(f'Delta:    +{new_size - original_size:,} chars')
print(f'Patches applied: {len(patches_applied)}')
for p in patches_applied:
    print(f'  [{p}]')
