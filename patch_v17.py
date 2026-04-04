#!/usr/bin/env python3
"""
シナリオラボ v17 パッチ
1. 添削エラー修正: modal-overlayを自前で作成するよう修正
2. 採点エンジン精密化: 脚本固有テキストの深部引用・キャラ別分析
3. アノテーション強化: 文脈依存検出・より精密な行単位指摘
4. 評価フィードバックの脱テンプレート化
"""
import re, sys

TARGET = 'public/static/app.js'
with open(TARGET, 'r', encoding='utf-8') as f:
    src = f.read()

orig_len = len(src)
patches = []

# ════════════════════════════════════════════════════════════════
# PATCH 1: [重要] modal-overlay エラー修正
# staffRoomGenerateAnnotatedScript が getElementById('modal-overlay')
# でnullを得てreturnしてしまう問題を修正
# → closeModal()後に新規作成してappendする方式に変更
# ════════════════════════════════════════════════════════════════
old1 = """  const modalEl = document.getElementById('modal-overlay');
  if (!modalEl) return;
  modalEl.innerHTML = `"""

new1 = """  // v17: Always create fresh modal overlay (closeModal removes it)
  closeModal();
  const modalEl = document.createElement('div');
  modalEl.id = 'modal-overlay';
  modalEl.className = 'modal-overlay';
  modalEl.style.cssText = 'display:flex;align-items:center;justify-content:center;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);backdrop-filter:blur(4px)';
  modalEl.addEventListener('click', (e) => { if (e.target === modalEl) closeModal(); });
  document.body.appendChild(modalEl);
  modalEl.innerHTML = `"""

if old1 in src:
    src = src.replace(old1, new1, 1)
    patches.append('1) FIXED: modal-overlay self-creation (critical bug)')
else:
    patches.append('1) SKIP: modal creation block not found')

# ════════════════════════════════════════════════════════════════
# PATCH 2: modal close ボタンも closeModal() を使うよう修正
# ════════════════════════════════════════════════════════════════
old2 = """          <button onclick=\"document.getElementById('modal-overlay').style.display='none'\" style=\"background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.7);border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center\"><i class=\"fas fa-times\" style=\"font-size:11px\"></i></button>"""

new2 = """          <button onclick=\"closeModal()\" style=\"background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.7);border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center\"><i class=\"fas fa-times\" style=\"font-size:11px\"></i></button>"""

if old2 in src:
    src = src.replace(old2, new2, 1)
    patches.append('2) Fixed close button to use closeModal()')
else:
    patches.append('2) SKIP: close button not found')

# ════════════════════════════════════════════════════════════════
# PATCH 3: modal display は createElement後は不要なので削除/修正
# ════════════════════════════════════════════════════════════════
old3 = """  modalEl.style.display = 'flex';
  modalEl.style.alignItems = 'center';
  modalEl.style.justifyContent = 'center';
  // Scroll to top of annotation body
  setTimeout(()=>{const ab=modalEl.querySelector('.sr-annotated-body');if(ab)ab.parentElement.scrollTop=0;},50);
}

function staffRoomDownloadAnnotated"""

new3 = """  // v17: Already appended to body with correct display style
  // Scroll to top of annotation body
  setTimeout(()=>{const ab=modalEl.querySelector('.sr-annotated-body');if(ab)ab.parentElement.scrollTop=0;},50);
}

function staffRoomDownloadAnnotated"""

if old3 in src:
    src = src.replace(old3, new3, 1)
    patches.append('3) Removed redundant modal display assignment')
else:
    patches.append('3) SKIP: modal display block not found')

# ════════════════════════════════════════════════════════════════
# PATCH 4: エンジンバナーをv17に更新
# ════════════════════════════════════════════════════════════════
old4 = '//  シナリオラボ 職員室 — 精密採点エンジン v16.0'
new4 = '//  シナリオラボ 職員室 — 精密採点エンジン v17.0'
if old4 in src:
    src = src.replace(old4, new4, 1)
    patches.append('4) Engine banner v16→v17')
else:
    patches.append('4) SKIP')

old4b = '//  8カテゴリ・24項目・評価モード対応多軸モデル（v16: 精密引用・展開コメント・審査員コメント保存）'
new4b = '//  8カテゴリ・24項目・評価モード対応多軸モデル（v17: 脚本固有深部引用・キャラ別声分析・精密脱テンプレ）'
if old4b in src:
    src = src.replace(old4b, new4b, 1)
    patches.append('4b) Updated engine description')

# ════════════════════════════════════════════════════════════════
# PATCH 5: アノテーション検出エンジンの強化
# キャラクター名の特定・対話パートナー分析を追加
# ════════════════════════════════════════════════════════════════
old5 = """  let prevLineA = '';
  let prevPrevLineA = '';
  let consecutiveDlgChar = '';
  let consecutiveDlgCount = 0;
  const seenCharsA = new Set();
  let currentSceneCharCount = 0;
  let inNewScene = false;"""

new5 = """  let prevLineA = '';
  let prevPrevLineA = '';
  let consecutiveDlgChar = '';
  let consecutiveDlgCount = 0;
  const seenCharsA = new Set();
  let currentSceneCharCount = 0;
  let inNewScene = false;

  // v17: キャラクター固有の台詞収集 (声のパターン分析用)
  const charDialoguesA = {};  // {charName: [dialogueText, ...]}
  const charFirstAppearA = {};  // {charName: lineIndex}
  let currentCharA = '';
  let sceneIdxA = 0;
  // キャラ名パターン（全角・半角大文字、漢字、ひらがな可）
  const charNamePatA = /^[　\s]*([A-ZＡ-Ｚ一-龯ぁ-ん]{1,15})[　\s]*$/;"""

if old5 in src:
    src = src.replace(old5, new5, 1)
    patches.append('5) Added character dialogue tracking for voice analysis')
else:
    patches.append('5) SKIP: tracking variables not found')

# ════════════════════════════════════════════════════════════════
# PATCH 6: rawLines.forEach ループ内でキャラ台詞収集
# isChar検出後にcharDialoguesA更新
# ════════════════════════════════════════════════════════════════
old6 = """    if (isChar) {
      // Track consecutive dialogue by same character
      if (l === consecutiveDlgChar) {"""

new6 = """    // v17: Track char name and collect dialogues
    if (isSceneLineA(l)) { sceneIdxA++; currentCharA = ''; }
    if (isCharNameA(l)) {
      currentCharA = l.trim();
      if (!charFirstAppearA[currentCharA]) charFirstAppearA[currentCharA] = ri;
      if (!charDialoguesA[currentCharA]) charDialoguesA[currentCharA] = [];
    } else if (currentCharA && !isSceneLineA(l) && !isCharNameA(l) && l.length > 0) {
      // This is dialogue for currentChar
      if (charDialoguesA[currentCharA]) charDialoguesA[currentCharA].push(l);
      currentCharA = ''; // reset after dialogue collected
    }

    if (isChar) {
      // Track consecutive dialogue by same character
      if (l === consecutiveDlgChar) {"""

if old6 in src:
    src = src.replace(old6, new6, 1)
    patches.append('6) Added character dialogue collection in annotation loop')
else:
    patches.append('6) SKIP: isChar block not found')

# ════════════════════════════════════════════════════════════════
# PATCH 7: キャラ声分析 - 台詞ループ後に声の均一性チェック
# 複数キャラの台詞を比較して「声が似ている」場合に警告
# ════════════════════════════════════════════════════════════════
old7 = """  // ── Build annotated HTML ───────────────────────────────────────────"""

new7 = """  // ── v17: Post-loop: character voice uniformity check ──────────────
  {
    const charNames = Object.keys(charDialoguesA).filter(c => (charDialoguesA[c]||[]).length >= 2);
    if (charNames.length >= 2) {
      // Check if multiple chars use very similar sentence patterns
      const getPatterns = (dlgs) => {
        const endings = dlgs.map(d => d.slice(-4)).filter(Boolean);
        const starters = dlgs.map(d => d.slice(0, 4)).filter(Boolean);
        return { endings, starters };
      };
      // Find chars with very uniform endings (sign of "same voice")
      const charPatterns = {};
      charNames.forEach(cn => {
        charPatterns[cn] = getPatterns(charDialoguesA[cn]);
      });
      // Count shared ending patterns between chars
      for (let i = 0; i < charNames.length; i++) {
        for (let j = i+1; j < charNames.length; j++) {
          const cn1 = charNames[i], cn2 = charNames[j];
          const e1 = new Set(charPatterns[cn1].endings);
          const e2 = charPatterns[cn2].endings;
          const shared = e2.filter(e => e1.has(e)).length;
          const similarity = shared / Math.max(e1.size, 1);
          if (similarity > 0.6 && e1.size >= 2) {
            // Flag first appearance of both chars
            const ri1 = charFirstAppearA[cn1];
            const ri2 = charFirstAppearA[cn2];
            if (ri1 !== undefined) {
              addAnnot(ri1, '声の類似', 'warn',
                `${cn1}と${cn2}の台詞パターンが似ています（語尾・語調）。\\n各キャラ固有の話し方を設計してください。\\n例: ${cn1}は体言止め多用、${cn2}は疑問形多用など。`, 'voice-analysis');
            }
          }
        }
      }
    }
  }

  // ── Build annotated HTML ───────────────────────────────────────────"""

if old7 in src:
    src = src.replace(old7, new7, 1)
    patches.append('7) Added character voice uniformity post-loop analysis')
else:
    patches.append('7) SKIP: annotated HTML comment not found')

# ════════════════════════════════════════════════════════════════
# PATCH 8: より精密な脚本固有台詞引用
# onTheNoseの検出時に「そのキャラの実際の台詞」を引用
# ════════════════════════════════════════════════════════════════
old8 = """      // On-the-nose detection with rewrite hint
      if (onTheNosePats.some(p => l.includes(p))) {
        addAnnot(ri, '説明台詞', 'bad', buildOnTheNoseHint(l), 'auto');
      }"""

new8 = """      // On-the-nose detection with rewrite hint — v17: use actual line text
      const foundOtn = onTheNosePats.find(p => l.includes(p));
      if (foundOtn) {
        const charName = isCharNameA(prevLineA) ? prevLineA.trim() : '';
        const namePrefix = charName ? `【${charName}の台詞】` : '';
        const hint = buildOnTheNoseHintV17(l, charName);
        addAnnot(ri, '説明台詞', 'bad', namePrefix + hint, 'auto');
      }"""

if old8 in src:
    src = src.replace(old8, new8, 1)
    patches.append('8) Enhanced on-the-nose detection with character name context')
else:
    patches.append('8) SKIP: onTheNose detection not found')

# ════════════════════════════════════════════════════════════════
# PATCH 9: buildOnTheNoseHintV17 関数を追加
# キャラ名と実際の台詞テキストを使った精密ヒント
# ════════════════════════════════════════════════════════════════
old9 = """  // Helper: build rewrite hint for on-the-nose dialogue
  const buildOnTheNoseHint = (line) => {"""

new9 = """  // v17: Enhanced on-the-nose hint with character-aware rewriting
  const buildOnTheNoseHintV17 = (line, charName) => {
    const shortLine = line.slice(0, 35) + (line.length > 35 ? '…' : '');
    const cn = charName || 'キャラクター';
    const emoMap = {
      '悲し': { before: `「${shortLine}」`, after: `（${cn}はテーブルの縁を指でなぞる。何も言わない）` },
      '嬉し': { before: `「${shortLine}」`, after: `（${cn}は財布から古い写真を取り出し、しばらく見つめる）` },
      '怒':   { before: `「${shortLine}」`, after: `（${cn}はコップを置く。水がこぼれる。拭かない）` },
      '心配': { before: `「${shortLine}」`, after: `（${cn}のスマホの画面が、また暗くなる）` },
      'つらい': { before: `「${shortLine}」`, after: `（${cn}は一度深呼吸する。それでも立てない）` },
      'つまり': { before: `「${shortLine}」`, after: `（セリフを削除。${cn}の行動だけで情報を示す）` },
      '実は':  { before: `「${shortLine}」`, after: `（情報を台詞で言わせず、小道具・手紙・画面表示で見せる）` },
    };
    for (const [k, ex] of Object.entries(emoMap)) {
      if (line.includes(k)) {
        return `「言わせずに見せる」変換が必要です。\\nBefore: ${ex.before}\\nAfter例: ${ex.after}`;
      }
    }
    // Generic fallback with actual line
    return `説明的台詞を行動・物・沈黙に置換してください。\\nBefore: 「${shortLine}」\\nAfter例: （${cn}の[具体的な行動]で、台詞の代わりに感情を示す）`;
  };

  // Helper: build rewrite hint for on-the-nose dialogue
  const buildOnTheNoseHint = (line) => {"""

if old9 in src:
    src = src.replace(old9, new9, 1)
    patches.append('9) Added buildOnTheNoseHintV17 with character-aware hints')
else:
    patches.append('9) SKIP: buildOnTheNoseHint not found')

# ════════════════════════════════════════════════════════════════
# PATCH 10: 長台詞検出の精密化 (キャラ名 + 実際の台詞引用)
# ════════════════════════════════════════════════════════════════
old10 = """      // Long dialogue warning with specific rewrite hint
      if (l.length > 80) {
        const hint = 'セリフが' + l.length + '字（目安60字以内）。\\n分割例:\\n' +
          '  Before: ' + l.slice(0,40) + '…\\n' +
          '  After①: ' + l.slice(0,30) + '\\n' +
          '  After②: （間）' + l.slice(30,55).trim() + '…';
        addAnnot(ri, '長台詞(' + l.length + '字)', 'bad', hint, 'auto');
      }"""

new10 = """      // v17: Long dialogue — character-aware split suggestion
      if (l.length > 80) {
        const charName = isCharNameA(prevLineA) ? prevLineA.trim() : 'キャラクター';
        const part1 = l.slice(0, Math.floor(l.length * 0.45));
        const part2 = l.slice(Math.floor(l.length * 0.45));
        const hint = `${charName}の台詞が${l.length}字（目安60字以内）。\\n` +
          `分割・圧縮してください。\\n` +
          `Before: 「${l.slice(0,50)}${l.length>50?'…':''}」\\n` +
          `After例:\\n` +
          `  ${charName}「${part1.trim().slice(0,35)}」\\n` +
          `  （間 / 相手の反応を挟む）\\n` +
          `  ${charName}「${part2.trim().slice(0,35)}${part2.length>35?'…':''}」`;
        addAnnot(ri, '長台詞(' + l.length + '字)', 'bad', hint, 'auto');
      }"""

if old10 in src:
    src = src.replace(old10, new10, 1)
    patches.append('10) Enhanced long dialogue hint with character name and actual text split')
else:
    patches.append('10) SKIP: long dialogue block not found')

# ════════════════════════════════════════════════════════════════
# PATCH 11: 常套句検出の精密化 (実際の台詞を引用)
# ════════════════════════════════════════════════════════════════
old11 = """      // Cliché dialogue detection
      if (clisheKws.some(p => l.includes(p)) && l.length < 25) {
        addAnnot(ri, '常套句', 'warn',
          '頻出の常套句です。そのキャラクターだけが言う固有の言い方に変えてください。\\n例: 「頑張ります」→「……もう一度、やってみます」', 'auto');
      }"""

new11 = """      // v17: Cliché dialogue — use actual line and character name
      const foundClishe = clisheKws.find(p => l.includes(p));
      if (foundClishe && l.length < 35) {
        const charName = isCharNameA(prevLineA) ? prevLineA.trim() : 'このキャラ';
        const altMap = {
          '頑張ります':       `「……もう一度だけ、やってみます」（${charName}らしい弱さを含んだ言葉に）`,
          'よろしくお願いします': `（頭を下げる。言葉は出ない）（台詞を行動に変換）`,
          '気をつけて':       `「……帰ってきてくれ」（感情を正確に言う言葉に）`,
          '心配しないで':     `「なんでもない」（逆説的な言葉で本音を示す）`,
          '大丈夫':          `（首を振るだけ。声が出ない）（行動で表現）`,
          '任せてください':   `「私が、やります」（能動的で固有の言い方に）`,
          '信じて':          `「……お願いだ」（弱さを見せる、固有の言葉に）`,
          '絶対に諦めない':   `「もうやめる気はない」（固有の強さの表現に）`,
          '必ず帰ってくる':   `（${charName}は何も言わず、ドアを閉める）`,
        };
        const alt = altMap[foundClishe] || `${charName}だけが言える言い回しに変えてください`;
        addAnnot(ri, '常套句', 'warn',
          `「${l.slice(0,25)}」は頻出表現です。\\n${charName}固有の言い方に変えてください。\\nAfter例: ${alt}`, 'auto');
      }"""

if old11 in src:
    src = src.replace(old11, new11, 1)
    patches.append('11) Enhanced cliche detection with character name and alternatives')
else:
    patches.append('11) SKIP: cliche detection not found')

# ════════════════════════════════════════════════════════════════
# PATCH 12: 感情語ト書き検出の精密化 (実際のト書きテキスト引用)
# ════════════════════════════════════════════════════════════════
old12 = """      // Abstract emotion in direction with concrete replacement
      const foundEmotion = emotionAbstractPats.find(p => l.includes(p));
      if (foundEmotion) {
        const emoReplace = {
          '悲しい': '（椅子を引く。座らない。窓を見る）',
          '悲しそう': '（口元を手で押さえ、目線を落とす）',
          '嬉しい': '（ポケットに手を入れたまま、少し笑う）',
          '嬉しそう': '（唇が動くが、声は出ない）',
          '怒っ': '（テーブルを手で叩く。水が揺れる）',
          'つらい': '（目をつぶる。長い間、開かない）',
          '苦しい': '（息を止める。また吸う。また止める）',
          '淋しい': '（手が止まる。もう一度、同じ動作をする）',
          '心配そう': '（時計を見る。また見る。席を立てない）',
        };
        const replace = emoReplace[foundEmotion] || '（具体的な行動・物・空間に置き換えてください）';
        addAnnot(ri, '感情語(ト書き)', 'warn',
          'ト書きに感情語は書かない。行動で見せてください。\\nBefore: ' + l.slice(0,40) +
          '\\nAfter例: ' + replace, 'auto');
      }"""

new12 = """      // v17: Emotion in action — use actual text, nearby char context
      const foundEmotion = emotionAbstractPats.find(p => l.includes(p));
      if (foundEmotion) {
        const shortAct = l.slice(0, 45) + (l.length > 45 ? '…' : '');
        const emoReplace = {
          '悲しい':   '（椅子を引く。座らない。窓だけを見る）',
          '悲しそう': '（口元を手で押さえ、目線を床に落とす）',
          '嬉しい':   '（財布の中の古い写真を、一度だけ見る）',
          '嬉しそう': '（唇が動くが、声は出ない。また動く）',
          '怒っ':     '（テーブルに手をつく。水がこぼれる。拭かない）',
          'つらい':   '（目をつぶる。ずっと開かない）',
          '苦しい':   '（息を止める。また吸う。また止める。繰り返す）',
          '淋しい':   '（手が止まる。もう一度、同じ動作をする）',
          '心配そう': '（スマホを見る。また見る。置く。また取る）',
          '焦っている': '（引き出しを開ける。閉める。また開ける）',
        };
        const replace = emoReplace[foundEmotion] || `（${foundEmotion}→具体的な物・動作・空間描写に置き換え）`;
        addAnnot(ri, '感情語(ト書き)', 'warn',
          `ト書きに感情語（「${foundEmotion}」）は書かない——行動で見せてください。\\nBefore: 「${shortAct}」\\nAfter例: ${replace}`, 'auto');
      }"""

if old12 in src:
    src = src.replace(old12, new12, 1)
    patches.append('12) Enhanced emotion-in-direction detection with actual text citation')
else:
    patches.append('12) SKIP: emotion detection not found')

# ════════════════════════════════════════════════════════════════
# PATCH 13: 高コスト要素の精密化
# ════════════════════════════════════════════════════════════════
old13 = """      // High-cost VFX with alternative suggestion
      const foundVFX = vfxPats.find(p => l.includes(p));
      if (foundVFX) {
        addAnnot(ri, '高コスト要素', 'warn',
          'VFX・大規模セット要素（「' + foundVFX + '」）。\\n低コスト代替案: 音響効果+登場人物の反応で表現する、またはカットして後の台詞で示唆する。', 'auto');
      }"""

new13 = """      // v17: High-cost VFX — cite actual line and suggest concrete low-cost alternatives
      const foundVFX = vfxPats.find(p => l.includes(p));
      if (foundVFX) {
        const shortL = l.slice(0, 50) + (l.length > 50 ? '…' : '');
        const vfxAlts = {
          '爆発':   '爆音SE + 窓ガラスが振動するショット',
          '宇宙':   '星空の画像/プロジェクション + キャラの表情',
          '空を飛ぶ': '影だけ、または台詞で「飛んでた」と示唆',
          '変身':   '衣装替え + 照明変化で表現',
          '大群衆': '群衆音SE + 主人公の顔アップ',
          'VFX':   '音響・照明・役者の演技で代替',
          '大津波': '浸水した室内 + キャラの証言',
          '隕石':   '閃光 + 揺れ + 反応ショットで表現',
          '龍が':   '影・炎の光 + 恐怖する人物で示唆',
        };
        const alt = vfxAlts[foundVFX] || '音響+照明+役者反応で代替表現可能';
        addAnnot(ri, '高コスト要素', 'warn',
          `「${foundVFX}」を含む高コスト描写:\\n「${shortL}」\\n低コスト代替案: ${alt}`, 'auto');
      }"""

if old13 in src:
    src = src.replace(old13, new13, 1)
    patches.append('13) Enhanced VFX detection with actual line citation and specific alternatives')
else:
    patches.append('13) SKIP: VFX detection not found')

# ════════════════════════════════════════════════════════════════
# PATCH 14: 独話過多の検出精密化 (キャラ名を引用)
# ════════════════════════════════════════════════════════════════
old14 = """        if (consecutiveDlgCount >= 3) {
          addAnnot(ri, '独話過多', 'warn',
            `${l}が${consecutiveDlgCount}回連続発言。他のキャラクターや行動を挟んで対話リズムを作ってください。`, 'auto');
        }"""

new14 = """        if (consecutiveDlgCount >= 3) {
          // v17: Suggest inserting other char or action between monologues
          const partner = Object.keys(charDialoguesA).find(c => c !== l.trim() && (charDialoguesA[c]||[]).length > 0);
          const suggestion = partner
            ? `他のキャラ（例: ${partner}）の反応や行動を${consecutiveDlgCount}発言の間に挟んでください。\\n例: ${partner}「……」（無言で${l.trim()}を見る）`
            : `${consecutiveDlgCount}連続発言の間に（間）や相手の行動・表情を1行挿入してください。`;
          addAnnot(ri, '独話過多', 'warn',
            `【${l.trim()}】が${consecutiveDlgCount}回連続発言中。\\n${suggestion}`, 'auto');
        }"""

if old14 in src:
    src = src.replace(old14, new14, 1)
    patches.append('14) Enhanced monologue detection with partner suggestion')
else:
    patches.append('14) SKIP: consecutiveDlgCount check not found')

# ════════════════════════════════════════════════════════════════
# PATCH 15: 採点結果保存時に judgesComments も保存
# ════════════════════════════════════════════════════════════════
old15 = """      const newAutoResult = {
        totalScore: result.totalScore,
        grade: result.grade,
        gradeLabel: result.gradeLabel,
        summary: result.summary,
        categoryScores: result.categoryScores,
        detailNotes: result.detailNotes,
        itemDetails: result.itemDetails || {},
        itemScores: { ...result.itemScores },  // 差分ハイライト用にAIスコアを保持
        analysisStats: result.analysisStats || {},
        strengths: result.strengths || '',
        weaknesses: result.weaknesses || '',
        suggestions: result.suggestions || '',
        priority: result.priority || '',
        scoredAt: Date.now(),
      };"""

new15 = """      const newAutoResult = {
        totalScore: result.totalScore,
        grade: result.grade,
        gradeLabel: result.gradeLabel,
        summary: result.summary,
        categoryScores: result.categoryScores,
        detailNotes: result.detailNotes,
        itemDetails: result.itemDetails || {},
        itemScores: { ...result.itemScores },  // 差分ハイライト用にAIスコアを保持
        analysisStats: result.analysisStats || {},
        judgesComments: result.judgesComments || result.analysisStats?.judgesComments || [],
        strengths: result.strengths || '',
        weaknesses: result.weaknesses || '',
        suggestions: result.suggestions || '',
        priority: result.priority || '',
        scoredAt: Date.now(),
      };"""

if old15 in src:
    src = src.replace(old15, new15, 1)
    patches.append('15) Added judgesComments to autoScoreResult save')
else:
    patches.append('15) SKIP: newAutoResult not found')

# ════════════════════════════════════════════════════════════════
# PATCH 16: エクスポートフッターのバージョンをv17に更新
# ════════════════════════════════════════════════════════════════
old16 = 'Generated by シナリオラボ 職員室 自動採点システム v16'
new16 = 'Generated by シナリオラボ 職員室 自動採点システム v17'
if old16 in src:
    src = src.replace(old16, new16, 1)
    patches.append('16) Export footer v16→v17')
else:
    patches.append('16) SKIP')

# ════════════════════════════════════════════════════════════════
# PATCH 17: アノテーション数がゼロでも採点なしで利用できるよう改善
# 採点なしでもauto-detectionだけで動くようにすること
# ════════════════════════════════════════════════════════════════
# Find the annotation modal header subtitle and update it
old17 = '          <div style="font-size:10px;color:rgba(255,255,255,.5);margin-top:2px">採点結果を脚本上に直接マッピング · 問題箇所と好評価箇所を行単位で表示</div>'
new17 = '          <div style="font-size:10px;color:rgba(255,255,255,.5);margin-top:2px">v17精密行単位添削 · 採点結果＋自動検出を脚本上にマッピング · クリックで改稿ヒント展開</div>'

if old17 in src:
    src = src.replace(old17, new17, 1)
    patches.append('17) Updated annotation modal subtitle for v17')
else:
    patches.append('17) SKIP')

# ════════════════════════════════════════════════════════════════
# PATCH 18: ページタイトルと審査員コメントバッジをv17に更新
# ════════════════════════════════════════════════════════════════
old18 = '            <span class="sr-v13-badge" style="margin-left:auto">v16</span>'
new18 = '            <span class="sr-v13-badge" style="margin-left:auto">v17</span>'
if old18 in src:
    src = src.replace(old18, new18, 1)
    patches.append('18) Updated judge badge to v17')
else:
    patches.append('18) SKIP')

# ════════════════════════════════════════════════════════════════
# WRITE
# ════════════════════════════════════════════════════════════════
with open(TARGET, 'w', encoding='utf-8') as f:
    f.write(src)

new_len = len(src)
print(f'Original: {orig_len:,} → New: {new_len:,} (delta: {new_len-orig_len:+,})')
print()
print('Applied patches:')
for p in patches:
    print(f'  {p}')
