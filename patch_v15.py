import re

with open('public/static/app.js', 'r', encoding='utf-8') as f:
    src = f.read()

original_len = len(src)
patches_applied = []

# ═══════════════════════════════════════════════════════════════════════
# PATCH 1: Fix duplicate judge block (remove the second copy)
# ═══════════════════════════════════════════════════════════════════════
DUP_JUDGE = '''  // 障壁・テンポ担当（v14追加: 全モード共通）
  {
    const obstSc14 = scores['obstacle-strength'] || 0;
    const tempoSc14 = scores['tempo-rhythm'] || 0;
    const typeLabel14 = {'tv-drama':'TVドラマ','film':'映画','stage':'舞台','web':'WEB/配信','competition':'コンクール','short':'短編'}[sType] || sType;
    judgesCommentsV13.push({
      judge: '構成・障壁分析',
      score: Math.round((obstSc14 + tempoSc14) / 2),
      comment: obstSc14 >= 4 && tempoSc14 >= 4
        ? `障壁の設計とテンポのリズムが高水準です。${typeLabel14}として必要な「主人公を阻む力」と「読者を引き込むリズム」が機能しています。`
        : obstSc14 <= 2
        ? `障壁強度が不足しています（${obstSc14}/5）。${typeLabel14}として主人公をもっと追い詰める設計を。葛藤・裏切り・情報非対称の3層を重ねてください。`
        : `テンポに改善余地があります（${tempoSc14}/5）。シーンを短くし、ト書きを1行=1動作に分解することでリズムが生まれます。`
    });
  }
  // 障壁・テンポ担当（v14追加: 全モード共通）
  {
    const obstSc14 = scores['obstacle-strength'] || 0;
    const tempoSc14 = scores['tempo-rhythm'] || 0;
    const typeLabel14 = {'tv-drama':'TVドラマ','film':'映画','stage':'舞台','web':'WEB/配信','competition':'コンクール','short':'短編'}[sType] || sType;
    judgesCommentsV13.push({
      judge: '構成・障壁分析',
      score: Math.round((obstSc14 + tempoSc14) / 2),
      comment: obstSc14 >= 4 && tempoSc14 >= 4
        ? `障壁の設計とテンポのリズムが高水準です。${typeLabel14}として必要な「主人公を阻む力」と「読者を引き込むリズム」が機能しています。`
        : obstSc14 <= 2
        ? `障壁強度が不足しています（${obstSc14}/5）。${typeLabel14}として主人公をもっと追い詰める設計を。葛藤・裏切り・情報非対称の3層を重ねてください。`
        : `テンポに改善余地があります（${tempoSc14}/5）。シーンを短くし、ト書きを1行=1動作に分解することでリズムが生まれます。`
    });
  }'''

FIXED_JUDGE = '''  // ── v15: 障壁・テンポ担当（全モード共通）
  {
    const obstSc = scores['obstacle-strength'] || 0;
    const tempoSc = scores['tempo-rhythm'] || 0;
    const charSc = scores['char-arc'] || 0;
    const commSc = scores['commercial-fit'] || 0;
    const typeLabel = {'tv-drama':'TVドラマ','film':'映画','stage':'舞台','web':'WEB/配信','competition':'コンクール','short':'短編'}[sType] || sType;
    // Obstacle judge comment
    const obstComment = (() => {
      if (obstSc >= 4) {
        const ex = itemDetails['obstacle-strength']?.quote;
        return `障壁の設計が優れています（${obstSc}/5）。${typeLabel}として主人公を十分に追い詰める構造が機能しています。` +
               (ex ? `\n引用: 「${ex.slice(0,60)}」——この対立が脚本の引力を生んでいます。` : '');
      }
      if (obstSc <= 2) {
        return `障壁強度が不足しています（${obstSc}/5）。${typeLabel}として主人公をもっと追い詰める設計を。\n` +
               `3層の障壁を設計してください:\n` +
               `① 外的障壁（人物・環境・社会の壁）\n② 内的障壁（主人公の恐れ・誤信・弱さ）\n③ 状況障壁（時間切れ・情報不足・選択の罠）`;
      }
      return `障壁設計に改善余地あり（${obstSc}/5）。外的×内的の組み合わせでさらに追い詰めてください。`;
    })();
    judgesCommentsV13.push({
      judge: '構成・障壁分析',
      score: obstSc,
      comment: obstComment
    });
    // Tempo judge comment
    const tempoComment = (() => {
      if (tempoSc >= 4) {
        return `テンポ・リズムが秀逸です（${tempoSc}/5）。シーンの緩急・ト書きの長短・セリフのリズム——${typeLabel}として読み手を飽きさせない構成です。`;
      }
      if (tempoSc <= 2) {
        const ex = itemDetails['tempo-rhythm']?.quote;
        return `テンポに課題があります（${tempoSc}/5）。\n` +
               (ex ? `引用: 「${ex.slice(0,70)}」——このシーンを半分に圧縮することを推奨します。\n` : '') +
               `改善法: ① シーンを「入るのは遅く、出るのは早く」の原則で再編集\n② ト書きは1行=1動作に分解\n③ 会話シーンに沈黙や小道具の動作を挿入して緩急をつける`;
      }
      return `テンポに改善余地があります（${tempoSc}/5）。シーンを短くし、ト書きを1行=1動作に分解することでリズムが生まれます。`;
    })();
    judgesCommentsV13.push({
      judge: 'テンポ・リズム分析',
      score: tempoSc,
      comment: tempoComment
    });
    // Commercial fit judge comment (adaptation/general only)
    if (evalModeV13 === 'adaptation' || evalModeV13 === 'general') {
      const commComment = commSc >= 4
        ? `商業適合度が高い作品です（${commSc}/5）。ターゲット層・ジャンル・キャスト規模——${typeLabel}として企画が通る力があります。`
        : `商業適合度を見直してください（${commSc}/5）。ターゲット視聴者・ジャンル・放送媒体を明確に設定し、コンパクトなキャスト（3〜5人）と撮影しやすいロケーションで再設計することを推奨します。`;
      judgesCommentsV13.push({
        judge: '商業性・企画適合',
        score: commSc,
        comment: commComment
      });
    }
  }'''

if DUP_JUDGE in src:
    src = src.replace(DUP_JUDGE, FIXED_JUDGE, 1)
    patches_applied.append('PATCH 1: Fixed duplicate judge block + enhanced judge comments')
else:
    patches_applied.append('PATCH 1 SKIPPED: duplicate judge block not found')

# ═══════════════════════════════════════════════════════════════════════
# PATCH 2: Enhance annotation - improve addAnnot to include placement 
#          hints and example rewrites
# ═══════════════════════════════════════════════════════════════════════
OLD_ANNOTATE_AUTO = '''  // 2. Auto-detect common issues on every line (v14 enhancement)
  const isSceneLineA = l =>
    /^[０-９0-9]+[○◎●]/.test(l) || /^[○◎●]/.test(l) ||
    /^【.{1,30}】/.test(l) || /^INT\\.|^EXT\\./.test(l.toUpperCase()) ||
    /^シーン[０-９0-9]|^#[0-9]/.test(l);
  const isCharNameA = l => /^[　\\s]*[A-ZＡ-Ｚぁ-ん一-龯]{1,15}[　\\s]*$/.test(l.trim()) && l.trim().length < 16;

  const onTheNosePats = ['なんですよ', 'ということは', 'つまり', '実は私', '要するに', '説明しておくと', 'ということで', 'わかってます'];
  const subtextHardPats = ['…', '——', '沈黙', '（間）', '（長い沈黙）', '（ためらう）'];
  const emotionAbstractPats = ['悲しい', '嬉しい', '怒っ', 'つらい', '苦しい', '悲しそう', '嬉しそう'];
  const vfxPats = ['爆発', '宇宙', '空を飛ぶ', '変身', '大群衆', 'VFX', 'CG特殊'];

  let prevLineA = '';
  rawLines.forEach((rl, ri) => {
    const l = rl.trim();
    if (!l) { prevLineA = ''; return; }
    const isScene = isSceneLineA(l);
    const isChar = isCharNameA(l);
    const isDlg = !isScene && !isChar && isCharNameA(prevLineA);
    const isAct = !isScene && !isChar && !isDlg && l.length > 0;

    if (isDlg) {
      // Long dialogue warning
      if (l.length > 80) addAnnot(ri, '長台詞(' + l.length + '字)', 'bad', 'セリフが長すぎます。60字以内を目安に分割してください。', 'auto');
      // On-the-nose detection
      if (onTheNosePats.some(p => l.includes(p))) addAnnot(ri, '説明台詞', 'bad', '「言わせずに見せる」に変換推奨。行動・沈黙・小道具で置き換えてください。', 'auto');
    }
    if (isAct) {
      // Long action warning
      if (l.length > 100) addAnnot(ri, '長ト書き(' + l.length + '字)', 'bad', '90字以内に圧縮してください。感情語・副詞を削除。', 'auto');
      // Abstract emotion in direction
      if (emotionAbstractPats.some(p => l.includes(p))) addAnnot(ri, '感情語(ト書き)', 'warn', 'ト書きに感情語は書かない。行動・物・空間に置き換えてください。', 'auto');
      // High-cost VFX
      if (vfxPats.some(p => l.includes(p))) addAnnot(ri, '高コスト要素', 'warn', 'VFX・大規模セット要素。低コスト化の検討を。', 'auto');
      // Good: subtext / visual
      if (subtextHardPats.some(p => l.includes(p))) addAnnot(ri, 'サブテキスト✓', 'good', '沈黙・間の活用——行間で感情を伝える好例です。', 'auto');
    }
    prevLineA = l;
  });'''

NEW_ANNOTATE_AUTO = '''  // 2. Auto-detect issues on every line (v15: precision + placement + rewrite hints)
  const isSceneLineA = l =>
    /^[０-９0-9]+[○◎●]/.test(l) || /^[○◎●]/.test(l) ||
    /^【.{1,30}】/.test(l) || /^INT\\.|^EXT\\./.test(l.toUpperCase()) ||
    /^シーン[０-９0-9]|^#[0-9]/.test(l);
  const isCharNameA = l => /^[　\\s]*[A-ZＡ-Ｚぁ-ん一-龯]{1,15}[　\\s]*$/.test(l.trim()) && l.trim().length < 16;

  const onTheNosePats = ['なんですよ', 'ということは', 'つまり', '実は私', '要するに', '説明しておくと', 'ということで', 'わかってます', 'ご存知の通り', 'すでにお伝えした', '覚えているよね', 'というのも'];
  const subtextHardPats = ['…', '——', '沈黙', '（間）', '（長い沈黙）', '（ためらう）', '（言葉が出ない）', '（目を合わせない）'];
  const subtextSoftPats = ['（笑いをこらえながら）', '（平静を装いながら）', '（遠くを見ながら）', '（手元を見ながら）', '（何かを探すように）'];
  const emotionAbstractPats = ['悲しい', '嬉しい', '怒っ', 'つらい', '苦しい', '悲しそう', '嬉しそう', '淋しい', '焦っている', '心配そう'];
  const vfxPats = ['爆発', '宇宙', '空を飛ぶ', '変身', '大群衆', 'VFX', 'CG特殊', '大津波', '隕石', '龍が'];
  const obstacleKws = ['だめだ','無理だ','できない','拒否','拒絶','阻む','裏切','危機','絶体絶命','追い詰め'];
  const visualKws = ['光','影','炎','靄','血','煙','波','色','輪郭','シルエット','砂埃','水面','蒸気'];
  const clisheKws = ['頑張ります','よろしくお願いします','気をつけて','心配しないで','大丈夫','任せてください','信じて'];
  const tensionKws = ['違う','やめろ','なぜ','嘘だ','ふざけるな','待ってくれ','頼む','絶対に','許せない','裏切り'];

  // Helper: build rewrite hint for on-the-nose dialogue
  const buildOnTheNoseHint = (line) => {
    const emoMap = {
      '悲し': 'Before: 「私は悲しい」\nAfter: （テーブルの端を握りしめたまま、返事をしない）',
      '嬉し': 'Before: 「嬉しいです」\nAfter: （財布の中の古い写真を、何度も見る）',
      '怒': 'Before: 「怒っています」\nAfter: （コップを置く。水がこぼれる。拭かない）',
      '心配': 'Before: 「心配しています」\nAfter: （スマホを見る。また見る。置く。また取る）',
    };
    for (const [k, ex] of Object.entries(emoMap)) {
      if (line.includes(k)) return '説明台詞を行動に変換してください。\n例: ' + ex;
    }
    return '「言わせずに見せる」変換推奨。\nBefore: ' + line.slice(0,30) + (line.length>30?'…':'') +
           '\nAfter: （何か具体的な行動・物・沈黙で感情を示す）';
  };

  // Helper: compress long action line
  const buildLongActionHint = (line) => {
    // Remove adverbs and abstract adjectives
    const compressed = line
      .replace(/とても|非常に|大変|すごく|少し|ゆっくりと|静かに|慌てて/g, '')
      .replace(/（.*?）/g, '')
      .trim();
    return '90字以内に圧縮してください。\nBefore: ' + line.slice(0,50) + '…\nAfter例: ' +
           (compressed.slice(0,60) || line.slice(0,40));
  };

  let prevLineA = '';
  let prevPrevLineA = '';
  let consecutiveDlgChar = '';
  let consecutiveDlgCount = 0;

  rawLines.forEach((rl, ri) => {
    const l = rl.trim();
    if (!l) { prevPrevLineA = prevLineA; prevLineA = ''; consecutiveDlgCount = 0; return; }
    const isScene = isSceneLineA(l);
    const isChar = isCharNameA(l);
    const isDlg = !isScene && !isChar && isCharNameA(prevLineA);
    const isAct = !isScene && !isChar && !isDlg && l.length > 0;

    if (isChar) {
      // Track consecutive dialogue by same character
      if (l === consecutiveDlgChar) {
        consecutiveDlgCount++;
        if (consecutiveDlgCount >= 3) {
          addAnnot(ri, '独話過多', 'warn',
            `${l}が${consecutiveDlgCount}回連続発言。他のキャラクターや行動を挟んで対話リズムを作ってください。`, 'auto');
        }
      } else {
        consecutiveDlgChar = l;
        consecutiveDlgCount = 1;
      }
    }

    if (isDlg) {
      // Long dialogue warning with specific rewrite hint
      if (l.length > 80) {
        const hint = 'セリフが' + l.length + '字（目安60字以内）。\n分割例:\n' +
          '  Before: ' + l.slice(0,40) + '…\n' +
          '  After①: ' + l.slice(0,30) + '\n' +
          '  After②: （間）' + l.slice(30,55).trim() + '…';
        addAnnot(ri, '長台詞(' + l.length + '字)', 'bad', hint, 'auto');
      }
      // On-the-nose detection with rewrite hint
      if (onTheNosePats.some(p => l.includes(p))) {
        addAnnot(ri, '説明台詞', 'bad', buildOnTheNoseHint(l), 'auto');
      }
      // Cliché dialogue detection
      if (clisheKws.some(p => l.includes(p)) && l.length < 25) {
        addAnnot(ri, '常套句', 'warn',
          '頻出の常套句です。そのキャラクターだけが言う固有の言い方に変えてください。\n例: 「頑張ります」→「……もう一度、やってみます」', 'auto');
      }
      // Tension/conflict detection (good)
      if (tensionKws.some(p => l.includes(p))) {
        addAnnot(ri, '緊張・対立✓', 'good',
          'コンフリクトのある台詞です。この緊張感を維持・発展させてください。', 'auto');
      }
    }
    if (isAct) {
      // Long action warning with compression hint
      if (l.length > 100) {
        addAnnot(ri, '長ト書き(' + l.length + '字)', 'bad', buildLongActionHint(l), 'auto');
      }
      // Abstract emotion in direction with concrete replacement
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
          'ト書きに感情語は書かない。行動で見せてください。\nBefore: ' + l.slice(0,40) +
          '\nAfter例: ' + replace, 'auto');
      }
      // High-cost VFX with alternative suggestion
      const foundVFX = vfxPats.find(p => l.includes(p));
      if (foundVFX) {
        addAnnot(ri, '高コスト要素', 'warn',
          'VFX・大規模セット要素（「' + foundVFX + '」）。\n低コスト代替案: 音響効果+登場人物の反応で表現する、またはカットして後の台詞で示唆する。', 'auto');
      }
      // Good: subtext (hard)
      if (subtextHardPats.some(p => l.includes(p))) {
        addAnnot(ri, 'サブテキスト✓', 'good',
          '沈黙・間の活用——行間で感情を伝える好例。この手法を他の感情的場面にも展開してください。', 'auto');
      }
      // Good: subtext (soft)
      if (subtextSoftPats.some(p => l.includes(p))) {
        addAnnot(ri, '演技的サブテキスト✓', 'good',
          '行動による心理表現——俳優が演じやすく観客が感情を読み取れる優れた演出です。', 'auto');
      }
      // Good: strong visual
      const foundVisual = visualKws.find(p => l.includes(p));
      if (foundVisual && l.length >= 8) {
        addAnnot(ri, '映像的✓', 'good',
          '視覚的キーワード「' + foundVisual + '」を含む映像的なト書きです。カメラを意識した演出が効果的。', 'auto');
      }
      // Good: obstacle/conflict in action
      if (obstacleKws.some(p => l.includes(p))) {
        addAnnot(ri, '障壁描写✓', 'good',
          '障壁・葛藤を描く行動描写です。主人公を阻む力が視覚化されています。', 'auto');
      }
    }
    prevPrevLineA = prevLineA;
    prevLineA = l;
  });'''

if OLD_ANNOTATE_AUTO in src:
    src = src.replace(OLD_ANNOTATE_AUTO, NEW_ANNOTATE_AUTO, 1)
    patches_applied.append('PATCH 2: Enhanced auto-annotation with rewrite hints and placement suggestions')
else:
    patches_applied.append('PATCH 2 SKIPPED: auto-annotate block not found')

# ═══════════════════════════════════════════════════════════════════════
# PATCH 3: Enhance staffRoomDownloadAnnotated to include full detail
# ═══════════════════════════════════════════════════════════════════════
OLD_DOWNLOAD = '''  rawLines.forEach((rl, ri) => {
    out += `${String(ri+1).padStart(4,' ')} | ${rl}\\n`;
    if (issueMap[ri]) {
      issueMap[ri].forEach(note => {
        const mark = note.type === 'bad' ? '⚠' : note.type === 'good' ? '✓' : 'ℹ';
        out += `       ${mark} [${note.label||''}] ${(note.text||'').slice(0,80)}\\n`;
      });
    }
  });

  out += `\\n${bar}\\n  診断ノート一覧 (${detailNotes.length}件)\\n${bar}\\n`;
  detailNotes.forEach((n,i) => {
    out += `\\n[${i+1}] ${n.label||''}\\n${n.text||''}\\n`;
    if (n.quote) out += `  引用: ${n.quote.slice(0,100)}\\n`;
  });'''

NEW_DOWNLOAD = '''  // v15: Also build auto-annotation map for TXT download
  const autoAnnotMapTxt = {};
  const addAutoAnnotTxt = (ri, label, type, comment) => {
    if (!autoAnnotMapTxt[ri]) autoAnnotMapTxt[ri] = [];
    autoAnnotMapTxt[ri].push({ label, type, comment });
  };
  const onTheNosePatsTxt = ['なんですよ','ということは','つまり','実は私','要するに','説明しておくと','わかってます'];
  const emotionAbsPats = ['悲しい','嬉しい','怒っ','つらい','苦しい','悲しそう','嬉しそう'];
  const subtextPatsTxt = ['…','沈黙','（間）','（長い沈黙）'];
  const vfxPatsTxt = ['爆発','宇宙','空を飛ぶ','VFX','大群衆'];
  let prevL3 = '';
  rawLines.forEach((rl3, ri3) => {
    const l3 = rl3.trim();
    if (!l3) { prevL3=''; return; }
    const isSc3 = /^[０-９0-9○◎●]|^【.{1,30}】|^INT\\./.test(l3);
    const isCh3 = /^[　\s]*[A-ZＡ-Ｚぁ-ん一-龯]{1,15}[　\s]*$/.test(l3) && l3.trim().length < 16;
    const isDl3 = !isSc3 && !isCh3 && /^[　\s]*[A-ZＡ-Ｚぁ-ん一-龯]{1,15}[　\s]*$/.test(prevL3.trim()) && prevL3.trim().length < 16;
    const isAc3 = !isSc3 && !isCh3 && !isDl3;
    if (isDl3) {
      if (l3.length > 80) addAutoAnnotTxt(ri3,'長台詞('+l3.length+'字)','bad','60字以内に分割。例: 前半30字で止めて「（間）」を挿入し、後半を別セリフに。');
      if (onTheNosePatsTxt.some(p=>l3.includes(p))) addAutoAnnotTxt(ri3,'説明台詞','bad','行動・沈黙・小道具で置き換えてください。Before: このセリフ / After: （具体的な行動）');
    }
    if (isAc3) {
      if (l3.length > 100) addAutoAnnotTxt(ri3,'長ト書き('+l3.length+'字)','bad','副詞・感情形容詞を削除。90字以内に。');
      if (emotionAbsPats.some(p=>l3.includes(p))) addAutoAnnotTxt(ri3,'感情語','warn','感情語→行動変換: 例「悲しい」→「テーブルの縁を指でなぞる」');
      if (vfxPatsTxt.some(p=>l3.includes(p))) addAutoAnnotTxt(ri3,'高コスト','warn','低コスト代替案を検討: 音響+反応 or 台詞での示唆');
      if (subtextPatsTxt.some(p=>l3.includes(p))) addAutoAnnotTxt(ri3,'サブテキスト✓','good','沈黙・間の好例。この手法を展開して。');
    }
    prevL3 = l3;
  });

  rawLines.forEach((rl, ri) => {
    out += `${String(ri+1).padStart(4,' ')} | ${rl}\\n`;
    // Diagnostic notes first
    if (issueMap[ri]) {
      issueMap[ri].forEach(note => {
        const mark = note.type === 'bad' ? '⚠ 要修正' : note.type === 'good' ? '✓ 好評価' : 'ℹ 注意';
        out += `         ${mark}: [${note.label||''}]\\n`;
        out += `           ${(note.text||'').slice(0,120)}\\n`;
        if (note.quote) out += `           引用根拠: 「${note.quote.slice(0,60)}」\\n`;
      });
    }
    // Auto-annotations
    if (autoAnnotMapTxt[ri]) {
      autoAnnotMapTxt[ri].forEach(ann => {
        const mark2 = ann.type === 'bad' ? '⚠ 要修正' : ann.type === 'good' ? '✓ 好例' : '△ 注意';
        out += `         ${mark2}: [${ann.label}]\\n`;
        out += `           ${ann.comment.replace(/\\n/g,'\\n           ')}\\n`;
      });
    }
  });

  out += `\\n${bar}\\n  診断ノート詳細 (${detailNotes.length}件)\\n${bar}\\n`;
  detailNotes.forEach((n,i) => {
    out += `\\n[${i+1}] ${n.type === 'bad' ? '⚠ 要修正' : n.type === 'good' ? '✓ 好評価' : 'ℹ 参考'}: ${n.label||''}\\n`;
    out += `${n.text||''}\\n`;
    if (n.quote) out += `  脚本引用: 「${n.quote.slice(0,100)}」\\n`;
    if (n.suggestion) out += `  改善提案: ${n.suggestion}\\n`;
  });'''

if OLD_DOWNLOAD in src:
    src = src.replace(OLD_DOWNLOAD, NEW_DOWNLOAD, 1)
    patches_applied.append('PATCH 3: Enhanced TXT download with auto-annotation + detailed notes')
else:
    patches_applied.append('PATCH 3 SKIPPED: download block not found')

# ═══════════════════════════════════════════════════════════════════════
# PATCH 4: Update engine version banner + export footer
# ═══════════════════════════════════════════════════════════════════════
OLD_VERSION_COMMENT = '//  シナリオラボ 職員室 — 精密採点エンジン v13.0'
NEW_VERSION_COMMENT = '//  シナリオラボ 職員室 — 精密採点エンジン v15.0'
if OLD_VERSION_COMMENT in src:
    src = src.replace(OLD_VERSION_COMMENT, NEW_VERSION_COMMENT, 1)
    patches_applied.append('PATCH 4a: Engine banner v13→v15')

OLD_EXPORT_FOOTER = 'Generated by シナリオラボ 職員室 自動採点システム v13\n  24項目・8軸・評価モード対応エンジン'
NEW_EXPORT_FOOTER = 'Generated by シナリオラボ 職員室 自動採点システム v15\n  21項目・8軸・脚本タイプ対応 精密採点エンジン\n  行単位アノテーション・審査員6名・改稿ヒント付'
if OLD_EXPORT_FOOTER in src:
    src = src.replace(OLD_EXPORT_FOOTER, NEW_EXPORT_FOOTER, 1)
    patches_applied.append('PATCH 4b: Export footer v13→v15')

# ═══════════════════════════════════════════════════════════════════════
# PATCH 5: Enhance tutor card - add placement suggestion to Before/After
# ═══════════════════════════════════════════════════════════════════════
OLD_TUTOR_CITE = '''        ${scriptQuote ? `<div class="sr-cite-block cite-bad" style="margin-top:${issues.length>0?'7px':'2px'}">
          <div class="sr-cite-label"><i class="fas fa-highlighter" style="font-size:7px"></i>あなたの脚本の該当箇所 — 改稿対象</div>
          <div class="sr-cite-text" style="color:#7f1d1d">${esc(scriptQuote)}</div>
          <div class="sr-cite-arrow"><i class="fas fa-arrow-right" style="font-size:8px"></i>この台詞・ト書きを下の「After」例に近づけてください</div>
        </div>` : ''}'''

NEW_TUTOR_CITE = '''        ${scriptQuote ? `<div class="sr-cite-block cite-bad" style="margin-top:${issues.length>0?'7px':'2px'}">
          <div class="sr-cite-label" style="display:flex;align-items:center;justify-content:space-between">
            <span><i class="fas fa-highlighter" style="font-size:7px;margin-right:4px"></i>あなたの脚本の該当箇所 — 改稿対象</span>
            <span style="font-size:8.5px;color:#9ca3af;font-weight:400">↑ この行を修正してください</span>
          </div>
          <div class="sr-cite-text" style="color:#7f1d1d;font-size:11.5px;line-height:1.7;background:#fff8f8;padding:6px 8px;border-radius:4px;border-left:3px solid #fca5a5;white-space:pre-wrap">${esc(scriptQuote)}</div>
          <div class="sr-cite-arrow" style="margin-top:5px;display:flex;align-items:flex-start;gap:5px">
            <i class="fas fa-arrow-down" style="font-size:8px;margin-top:3px;color:#9ca3af"></i>
            <span style="font-size:10px;color:#6b7280">この台詞・ト書きを下の「After」参考例に近づけてください。そのまま使うのではなく、脚本のキャラクターと文脈に合わせて応用してください。</span>
          </div>
        </div>` : ''}'''

if OLD_TUTOR_CITE in src:
    src = src.replace(OLD_TUTOR_CITE, NEW_TUTOR_CITE, 1)
    patches_applied.append('PATCH 5: Enhanced tutor card citation block')
else:
    patches_applied.append('PATCH 5 SKIPPED: tutor cite block not found')

# ═══════════════════════════════════════════════════════════════════════
# PATCH 6: Enhance annotated HTML modal - add summary panel before script
# ═══════════════════════════════════════════════════════════════════════
OLD_MODAL_LEGEND = '''      <div style="flex:1;overflow-y:auto">
        <div class="sr-annotated-body" style="padding:8px 0">
          <div style="font-size:10px;color:var(--text-muted);padding:6px 12px 10px;border-bottom:1px solid var(--border);display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <span><span style="display:inline-block;width:8px;height:8px;background:#fef2f2;border:1px solid #fecaca;border-radius:2px;margin-right:3px"></span>要修正</span>
            <span><span style="display:inline-block;width:8px;height:8px;background:#fffbeb;border:1px solid #fde68a;border-radius:2px;margin-right:3px"></span>注意</span>
            <span><span style="display:inline-block;width:8px;height:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:2px;margin-right:3px"></span>好評価</span>
            <span><span style="display:inline-block;width:8px;height:8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:2px;margin-right:3px"></span>情報</span>
            <span style="margin-left:auto;font-size:9px">バッジにカーソルを当てると詳細を確認できます</span>
          </div>
          ${annotHtml || '<div style="color:var(--text-muted);padding:20px;text-align:center">脚本テキストがありません</div>'}
        </div>
      </div>'''

NEW_MODAL_LEGEND = '''      <div style="flex:1;overflow-y:auto">
        <div class="sr-annotated-body" style="padding:8px 0">
          <!-- v15: Summary panel -->
          <div style="padding:10px 14px;background:linear-gradient(135deg,#0f0a2a,#1a1040);border-bottom:1px solid rgba(255,255,255,.08)">
            <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.7);margin-bottom:8px;letter-spacing:.5px">
              <i class="fas fa-chart-bar" style="margin-right:5px;color:#a78bfa"></i>採点サマリー
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${ar ? `
                <div style="background:rgba(167,139,250,.15);border:1px solid rgba(167,139,250,.25);border-radius:7px;padding:5px 10px;font-size:10px;color:rgba(255,255,255,.8)">
                  <span style="font-size:15px;font-weight:900;color:#a78bfa">${ar.totalScore||'—'}</span>
                  <span style="font-size:9px;opacity:.6">/100点</span>
                  <span style="font-size:9px;background:rgba(167,139,250,.3);border-radius:3px;padding:1px 4px;margin-left:4px">${ar.grade||''}</span>
                </div>
                ${(ar.itemScores||{})['emotional-impact'] ? `<div style="background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);border-radius:7px;padding:5px 10px;font-size:9px;color:rgba(255,255,255,.7)"><i class="fas fa-heart" style="font-size:7px;margin-right:3px;color:#f87171"></i>感情 ${ar.itemScores['emotional-impact']}/5</div>` : ''}
                ${(ar.itemScores||{})['three-act'] ? `<div style="background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.2);border-radius:7px;padding:5px 10px;font-size:9px;color:rgba(255,255,255,.7)"><i class="fas fa-layer-group" style="font-size:7px;margin-right:3px;color:#60a5fa"></i>構成 ${ar.itemScores['three-act']}/5</div>` : ''}
                ${(ar.itemScores||{})['obstacle-strength'] ? `<div style="background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.2);border-radius:7px;padding:5px 10px;font-size:9px;color:rgba(255,255,255,.7)"><i class="fas fa-shield-halved" style="font-size:7px;margin-right:3px;color:#fbbf24"></i>障壁 ${ar.itemScores['obstacle-strength']}/5</div>` : ''}
                ${(ar.itemScores||{})['subtext'] ? `<div style="background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.2);border-radius:7px;padding:5px 10px;font-size:9px;color:rgba(255,255,255,.7)"><i class="fas fa-comment-dots" style="font-size:7px;margin-right:3px;color:#4ade80"></i>サブテキスト ${ar.itemScores['subtext']}/5</div>` : ''}
              ` : '<div style="font-size:10px;color:rgba(255,255,255,.4)">採点後に詳細が表示されます</div>'}
            </div>
            <!-- Top issues summary -->
            ${ar && ar.detailNotes && ar.detailNotes.filter(n=>n.type==='bad').length > 0 ? `
            <div style="margin-top:8px;font-size:9.5px;color:rgba(248,113,113,.8);font-weight:600">
              <i class="fas fa-triangle-exclamation" style="font-size:8px;margin-right:3px"></i>
              最優先改稿箇所 (${ar.detailNotes.filter(n=>n.type==='bad').length}件):
              ${ar.detailNotes.filter(n=>n.type==='bad').slice(0,3).map(n=>
                `<span style="background:rgba(248,113,113,.12);border-radius:4px;padding:1px 5px;margin-left:3px">${(n.text||'').slice(0,25)}…</span>`
              ).join('')}
            </div>` : ''}
          </div>
          <!-- Legend -->
          <div style="font-size:10px;color:var(--text-muted);padding:6px 12px 8px;border-bottom:1px solid var(--border);display:flex;gap:12px;align-items:center;flex-wrap:wrap;background:var(--bg-subtle)">
            <span><span style="display:inline-block;width:8px;height:8px;background:#fef2f2;border:1px solid #fecaca;border-radius:2px;margin-right:3px"></span>要修正</span>
            <span><span style="display:inline-block;width:8px;height:8px;background:#fffbeb;border:1px solid #fde68a;border-radius:2px;margin-right:3px"></span>注意</span>
            <span><span style="display:inline-block;width:8px;height:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:2px;margin-right:3px"></span>好評価</span>
            <span><span style="display:inline-block;width:8px;height:8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:2px;margin-right:3px"></span>情報</span>
            <span style="margin-left:auto;font-size:9px">バッジにカーソルを当てると詳細コメント・改稿ヒントを確認できます</span>
          </div>
          ${annotHtml || '<div style="color:var(--text-muted);padding:20px;text-align:center">脚本テキストがありません</div>'}
        </div>
      </div>'''

if OLD_MODAL_LEGEND in src:
    src = src.replace(OLD_MODAL_LEGEND, NEW_MODAL_LEGEND, 1)
    patches_applied.append('PATCH 6: Enhanced annotation modal with summary panel')
else:
    patches_applied.append('PATCH 6 SKIPPED: modal legend block not found')

# ═══════════════════════════════════════════════════════════════════════
# PATCH 7: Enhance annotation badge tooltips with full comment text
# ═══════════════════════════════════════════════════════════════════════
OLD_BADGE_HTML = '''        badgeHtml += '<span class="sr-ann-badge ' + badgeType + '" title="' + esc(ann.comment.slice(0,80)) + '">' +
          '<i class="fas ' + icon + '" style="font-size:7px"></i>' +
          esc(ann.label.slice(0,16)) + '</span>';'''

NEW_BADGE_HTML = '''        // Build rich tooltip: label + full comment
        const tooltipText = ann.label + ': ' + ann.comment.replace(/\\n/g,' | ').slice(0,160);
        badgeHtml += '<span class="sr-ann-badge ' + badgeType + '" title="' + esc(tooltipText) + '" style="cursor:help">' +
          '<i class="fas ' + icon + '" style="font-size:7px"></i>' +
          esc(ann.label.slice(0,18)) + '</span>';'''

if OLD_BADGE_HTML in src:
    src = src.replace(OLD_BADGE_HTML, NEW_BADGE_HTML, 1)
    patches_applied.append('PATCH 7: Enhanced badge tooltips with full comment')
else:
    patches_applied.append('PATCH 7 SKIPPED: badge html not found')

# ═══════════════════════════════════════════════════════════════════════
# PATCH 8: Enhance judges comments for school mode and add v15 character 
#          depth + theme judge
# ═══════════════════════════════════════════════════════════════════════
OLD_SCHOOL_JUDGE = '''  if (evalModeV13 === 'school' || evalModeV13 === 'general') {
    const fmtSc = scores['format-correctness'] || 0;
    const threeActSc = scores['three-act'] || 0;
    judgesCommentsV13.push({
      judge: '講師・添削担当',
      score: Math.round((fmtSc + threeActSc) / 2),
      comment: fmtSc >= 4 && threeActSc >= 4
        ? `基礎が完全に身についています。フォーマット・三幕構成・因果関係——プロの読み手が違和感なく読める脚本です。次のステップは「個性」の確立です。`
        : `まずは基礎の徹底を。脚本フォーマット（柱書き・ト書き・台詞の配置）と三幕構成（発端事件・対立・クライマックスの位置）を正確に実装してください。審査員はフォーマットの乱れで読む気を失います。`
    });
  }'''

NEW_SCHOOL_JUDGE = '''  if (evalModeV13 === 'school' || evalModeV13 === 'general') {
    const fmtSc = scores['format-correctness'] || 0;
    const threeActSc = scores['three-act'] || 0;
    const natSc = scores['naturalness'] || 0;
    const charUniSc = scores['char-unique'] || 0;
    const schoolComment = (() => {
      if (fmtSc >= 4 && threeActSc >= 4) {
        const nextStep = natSc <= 2
          ? 'セリフの自然さ（長台詞・説明台詞の削減）に集中してください。'
          : charUniSc <= 2
          ? 'キャラクターの声の固有性を高めてください。誰が話しているか台詞だけで分かる設計を目指して。'
          : '次のステップは「個性」の確立です。あなたにしか書けないシーンを1つ作ることを目標に。';
        return `基礎が完全に身についています。フォーマット（${fmtSc}/5）・三幕構成（${threeActSc}/5）——プロの読み手が違和感なく読める脚本です。${nextStep}`;
      }
      const missing = [];
      if (fmtSc <= 2) missing.push(`フォーマット（柱書き・ト書き・台詞の配置）が不正確（${fmtSc}/5）`);
      if (threeActSc <= 2) missing.push(`三幕構成（発端事件・対立・クライマックスの位置）が不明確（${threeActSc}/5）`);
      const fmtHint = fmtSc <= 2
        ? '\n\n【フォーマット修正例】\n① 柱書き: 「○1　室内　居間　昼」の形式を統一\n② ト書き: 1文1動作、50字以内\n③ 台詞: キャラ名→改行→セリフの順で配置'
        : '';
      const structHint = threeActSc <= 2
        ? '\n\n【構成修正チェック】\n① 発端事件は冒頭15〜25%に配置しましたか？\n② 第二幕に最大の障壁（壁）はありますか？\n③ クライマックスは終盤80〜90%にありますか？'
        : '';
      return `基礎の徹底が優先事項です。${missing.join('、')}。${fmtHint}${structHint}`;
    })();
    judgesCommentsV13.push({
      judge: '講師・添削担当',
      score: Math.round((fmtSc + threeActSc) / 2),
      comment: schoolComment
    });
  }
  // v15: テーマ・キャラクター担当（全モード）
  {
    const themeSc = scores['theme-clarity'] || 0;
    const arcSc = scores['char-arc'] || 0;
    const origSc = scores['originality'] || 0;
    const mainChar = itemDetails['protag-want-need']?.quote || null;
    const themeComment = (() => {
      if (themeSc >= 4 && arcSc >= 4) {
        return `テーマとキャラクター変化が高水準です（テーマ${themeSc}/5・アーク${arcSc}/5）。\n` +
               `作品の核心となるメッセージが脚本全体に貫通し、主人公の変化がそのテーマを体現しています。` +
               (origSc >= 4 ? '\n独自性も高く、審査員の記憶に残る作品です。' : '\n独自性（${origSc}/5）をさらに高めることで、唯一無二の作品になります。');
      }
      const issues2 = [];
      if (themeSc <= 2) {
        issues2.push(`テーマの明確さ（${themeSc}/5）: このシナリオで「何を伝えたいか」を一文で言えますか？\n  改善: 主人公の台詞か行動に、テーマを体現する瞬間を1シーン追加してください。`);
      }
      if (arcSc <= 2) {
        issues2.push(`キャラクターアーク（${arcSc}/5）: 主人公は冒頭と結末で何が変わりましたか？\n  改善: 「変化前の台詞」と「変化後の台詞」を並べて、変化が見えるか確認してください。`);
        if (mainChar) issues2.push(`  主人公の最初の台詞: 「${mainChar.slice(0,50)}」\n  ——この言い方・考え方が終盤どう変わるかを設計してください。`);
      }
      return issues2.join('\n\n') || `テーマ・アークに改善余地があります（テーマ${themeSc}/5・アーク${arcSc}/5）。テーマと主人公の変化を直結させてください。`;
    })();
    judgesCommentsV13.push({
      judge: 'テーマ・キャラクター担当',
      score: Math.round((themeSc + arcSc) / 2),
      comment: themeComment
    });
  }'''

if OLD_SCHOOL_JUDGE in src:
    src = src.replace(OLD_SCHOOL_JUDGE, NEW_SCHOOL_JUDGE, 1)
    patches_applied.append('PATCH 8: Enhanced school judge + theme/character judge v15')
else:
    patches_applied.append('PATCH 8 SKIPPED: school judge block not found')

# ═══════════════════════════════════════════════════════════════════════
# PATCH 9: Enhance the sr-cite-block in the axes grid (score display)
# ═══════════════════════════════════════════════════════════════════════
OLD_AXES_CITE = '''            ${weakQuote2 ? `<div class="sr-cite-block cite-bad" style="border-radius:0;margin:0;border-left:none;border-right:none;border-bottom:none">'''
NEW_AXES_CITE = '''            ${weakQuote2 ? `<div class="sr-cite-block cite-bad" style="border-radius:0;margin:0;border-left:none;border-right:none;border-bottom:none;background:#fffaf9">'''

if OLD_AXES_CITE in src:
    src = src.replace(OLD_AXES_CITE, NEW_AXES_CITE, 1)
    patches_applied.append('PATCH 9: Subtle color tweak for axes cite block')

# ═══════════════════════════════════════════════════════════════════════
# PATCH 10: Add CSS for new annotation features
# ═══════════════════════════════════════════════════════════════════════
# Find the sr-ann-badge CSS and enhance it
OLD_ANN_CSS_MARKER = '.sr-ann-badge.warn { background:#fef3c7;'
NEW_ANN_CSS_BLOCK = '''.sr-ann-badge { cursor:help; }
.sr-ann-badge.warn { background:#fef3c7;'''

if OLD_ANN_CSS_MARKER in src and '.sr-ann-badge { cursor:help; }' not in src:
    src = src.replace(OLD_ANN_CSS_MARKER, NEW_ANN_CSS_BLOCK, 1)
    patches_applied.append('PATCH 10: Added cursor:help to annotation badges CSS')
else:
    patches_applied.append('PATCH 10 SKIPPED: CSS marker not found or already patched')

# ═══════════════════════════════════════════════════════════════════════
# Write output
# ═══════════════════════════════════════════════════════════════════════
with open('public/static/app.js', 'w', encoding='utf-8') as f:
    f.write(src)

new_len = len(src)
print(f'v15 patch complete.')
print(f'  Original length: {original_len:,} chars')
print(f'  New length:      {new_len:,} chars')
print(f'  Delta:           +{new_len - original_len:,} chars')
print()
print('Patches applied:')
for p in patches_applied:
    print(' ', p)
