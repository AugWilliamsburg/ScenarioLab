function generateExerciseFeedback(ex, answer) {
  const len = answer.length;
  const ans = answer;
  // ランダム問題が設定されている場合はそちらを使用
  const randomQ = DB.get(`ex_random_q_${ex.id}`, null);
  const effectiveQuestion = (randomQ && randomQ.question) ? randomQ.question : ex.question;

  // ── ヘルパー関数 ────────────────────────────────────────────
  const has = (...words) => words.some(w => ans.includes(w));
  const count = (word) => (ans.match(new RegExp(word, 'g')) || []).length;
  const lineCount = ans.split('\n').filter(l => l.trim()).length;
  const dialogCount = (ans.match(/「[^」]+」/g) || []).length;
  const hasScriptHeader = has('○内', '○外', '内・', '外・');
  const hasEllipsis = has('……', '…', '（間）', '（沈黙）', '（ポーズ）');
  const hasAction = has('止まる', '見る', '立つ', '座る', '振り返る', '手が', '目が', '背を', '視線', 'うなずく', '首を振る', '息を', '唇が', '肩が', '腕を', '顔を');
  const directEmotions = ['悲しい', '悲しかった', '嬉しい', 'うれしい', '怖い', 'つらい', '辛い', '心配', '不安', 'ショック', '怒っている', '怒った', '寂しい', 'さびしい', 'むなしい', '後悔'];
  const usedDirectEmotions = directEmotions.filter(w => ans.includes(w));
  const hasSubtext = hasEllipsis || (dialogCount >= 2 && dialogCount <= 8 && ans.length > 100);
  const specificSceneRef = has('シーン', '場面', '分', '秒', 'ページ', 'p.', 'Act', '幕');
  const hasWant = has('Want', 'ウォント', '外的', '目標', '望む', '目指す', '求める');
  const hasNeed = has('Need', 'ニード', '内的', '内面', '成長', '気づく', '変わる');
  const hasGhost = has('Ghost', 'ゴースト', '過去', '原体験', 'トラウマ', '幼少', '記憶', 'かつて', '子ども時代');
  const hasLie = has('Lie', '誤信念', '信じていた', '信念', '嘘', '思い込み');
  const hasConflict = has('葛藤', '対立', '板挟み', '矛盾', '衝突', '迷い', '選択');
  const hasChange = has('変化', '変わ', '決断', '選択', '気づ', '諦め', '立ち上がる', '認める', '受け入れる');
  const hasCataclism = has('クライマックス', 'クライマクス', '最高点', '対決', '決断');
  const minLen = ex.estimatedTime * 45; // プロ水準は長め

  // ── 演習ID別 プロレベル評価ロジック ─────────────────────────
  const PRO_EVALUATORS = {

    'ex-logline-01': [
      () => {
        // 主人公の欠如・固有性
        const hasProtagFlaw = has('欠如', '傷', '孤独', '罪', '後悔', '過去', '失') || len > 15;
        const isGeneric = !has('元刑事', '医師', '作家', '教師', '棋士', '検察', 'カメラマン', 'ピアニスト', '漁師') && len < 25;
        const pass = hasProtagFlaw && !isGeneric;
        const pts = pass ? 20 : (hasProtagFlaw ? 12 : (len > 10 ? 7 : 3));
        const msg = pass
          ? `主人公の「欠如」が言葉に滲み出ています。固有性のある造形です。`
          : isGeneric
            ? `主人公の造形が抽象的です。職業・年齢・内的傷を1語で凝縮した固有名詞的な表現（例：「冤罪に囚われた元刑事」）が必要です。`
            : `主人公の「欠如」をより明示してください。単なる職業紹介では観客の心を掴めません。`;
        return { pass, earnedPoints: pts, comment: msg };
      },
      () => {
        // 外的目標の明確性・具体性
        const hasSpecificGoal = has('見つける', '証明する', '取り戻す', '救う', '守る', '償う', '暴く', '勝つ', '立ち直る', '戻す') || (hasWant && len > 20);
        const isVague = has('何か', 'もの', 'こと') && !hasSpecificGoal;
        const pass = hasSpecificGoal && !isVague;
        const pts = pass ? 20 : (hasSpecificGoal ? 13 : 5);
        return { pass, earnedPoints: pts,
          comment: pass
            ? `外的目標が「動詞」で明確に表現されています。観客は主人公が「何をする物語か」を一文で理解できます。`
            : `外的目標が曖昧です。「〜する」という動詞で明確に定義してください。プロのログラインは「何をするか」を一語の動詞で示します（例：「真犯人を暴く」「息子を救う」）。` };
      },
      () => {
        // 障害の構造的質（内的障害か外的障害か、または両方か）
        const hasExternalObs = has('復讐', '追われ', '組織', '追手', '敵', '立ちはだかる', '妨げ', '反対', '対立');
        const hasInternalObs = has('信念', '恐れ', '罪悪感', 'できない', '迷い', '疑い', '矛盾');
        const hasBoth = hasExternalObs && hasInternalObs;
        const pass = hasExternalObs || hasInternalObs;
        const pts = hasBoth ? 20 : (pass ? 14 : 5);
        return { pass, earnedPoints: pts,
          comment: hasBoth
            ? `外的障害と内的葛藤の両方が示されています。最高水準のログライン構造です。`
            : hasExternalObs
              ? `外的障害は示されていますが、内的障害（主人公自身の弱さ・誤信念）も加えると深みが出ます。大河ドラマ水準では「外と内の二重の障壁」が求められます。`
              : hasInternalObs
                ? `内的葛藤は見えますが、外的な障害も具体化してください。物語を動かす「外からの力」が必要です。`
                : `障害が不明確です。主人公の目標を阻む「外的な力」と「内的な恐れ」を両方示してください。` };
      },
      () => {
        // 字数・密度・無駄のなさ
        const tooLong = len > 70;
        const tooShort = len < 18;
        const hasRedundancy = count('が') > 3 || count('の') > 4 || count('て') > 3;
        const pass = !tooLong && !tooShort && !hasRedundancy;
        const pts = pass ? 20 : (tooLong ? Math.floor(20 * 0.6) : (tooShort ? Math.floor(20 * 0.4) : 14));
        return { pass, earnedPoints: pts,
          comment: pass
            ? `字数（${len}字）と密度のバランスが優れています。無駄な修飾がなく、一文に情報が凝縮されています。`
            : tooLong
              ? `${len}字は長すぎます（目標60字以内）。助詞の重複（「〜が〜が」「〜の〜の」）を削り、修飾語を最小化してください。プロのログラインは「削れる言葉がない」状態が理想です。`
              : tooShort
                ? `${len}字は短すぎます。4要素（欠如・目標・障害・テーマ）を詰め込んだ上で60字以内に収める技術が必要です。`
                : `助詞の繰り返し（「〜が〜が」など）が多く、密度が下がっています。一度分解して再構成してください。` };
      },
      () => {
        // テーマの余韻・深み
        const themeWords = ['罪', '赦', '償', '許', '愛', '裏切', '孤独', '再生', '継承', '正義', '真実', '家族', '記憶', '喪失', '信頼'];
        const themeMatches = themeWords.filter(w => ans.includes(w));
        const hasImpliedTheme = themeMatches.length >= 1;
        const hasExplicitTheme = has('テーマは', 'テーマ：', '〜という物語');
        const pass = hasImpliedTheme && !hasExplicitTheme;
        const pts = pass ? 20 : (hasImpliedTheme ? 14 : (hasExplicitTheme ? 8 : 4));
        return { pass, earnedPoints: pts,
          comment: pass
            ? `テーマ（${themeMatches.slice(0,2).join('・')}）が言葉の余韻に滲み出ています。直接言わずに感じさせる高度な技術です。`
            : hasExplicitTheme
              ? `テーマを直接説明しています。プロのログラインでは「テーマは〜」と言わず、状況と選択の構造そのものでテーマを示します。`
              : `テーマが感じられません。ログラインの最後の一語にテーマの核心（罪・赦し・再生など）が響くよう調整してください。` };
      },
    ],

    'ex-scene-01': [
      () => {
        // 3要素の明確な分析
        const hasAllThree = has('目的', '目標', 'Want') && hasConflict && hasChange;
        const hasTwo = [has('目的', '目標', 'Want'), hasConflict, hasChange].filter(Boolean).length >= 2;
        const pts = hasAllThree ? 25 : (hasTwo ? 16 : 7);
        return { pass: hasAllThree, earnedPoints: pts,
          comment: hasAllThree
            ? `シーンの3要素（目的・葛藤・変化）を正確かつ具体的に特定できています。分析眼が鋭い。`
            : `3要素の分析が不完全です。「目的」（キャラクターが欲しいもの）「葛藤」（対立する力）「変化」（シーン前後の差分）を明示的に「目的:」「葛藤:」「変化:」とラベリングして整理してください。コンクール審査では各要素の「具体性と因果」が見られます。` };
      },
      () => {
        // 脚本形式の正確性
        const hasProperFormat = hasScriptHeader && dialogCount >= 2;
        const hasTonagaki = ans.split('\n').some(l => l.trim() && !l.includes('「') && !l.includes('○') && l.length < 40 && l.length > 2);
        const pts = (hasProperFormat && hasTonagaki) ? 20 : (hasProperFormat ? 14 : (hasScriptHeader ? 8 : 3));
        return { pass: hasProperFormat && hasTonagaki, earnedPoints: pts,
          comment: (hasProperFormat && hasTonagaki)
            ? `柱書き・ト書き・セリフの三層構造が正確に機能しています。脚本形式を完全に習得しています。`
            : !hasScriptHeader
              ? `柱書き（○内/外・場所・時間帯）がありません。脚本形式の最基本です。例：「○内・会議室・夜」`
              : !hasTonagaki
                ? `ト書きが不足しています。セリフだけでなく「登場人物の動作・視線・間（ま）」を1〜2行のト書きで描写してください。ト書きこそが映像イメージを生みます。`
                : `セリフが不足しています。15〜25行、セリフ最低4回以上が目安です。` };
      },
      () => {
        // 感情の「見せ方」——ショー・ドント・テル
        const usedBad = usedDirectEmotions.filter(w => ans.includes(w));
        const hasShowDontTell = hasAction && (hasEllipsis || dialogCount >= 3);
        const pts = (usedBad.length === 0 && hasShowDontTell) ? 25
          : (usedBad.length === 0 ? 18)
          : (usedBad.length === 1 ? 10 : 5);
        return { pass: usedBad.length === 0 && hasShowDontTell, earnedPoints: pts,
          comment: (usedBad.length === 0 && hasShowDontTell)
            ? `感情ラベリングを使わず、行動・間・視線で感情を「見せて」います。大河ドラマ水準の表現力です。`
            : usedBad.length > 0
              ? `「${usedBad[0]}」など感情を直接ラベリングしています（${usedBad.length}か所）。NHK大河・コンクール審査では感情の直接表現はほぼ必ず減点されます。その感情を「体の動き・視線・行動」に変換してください。例：「悲しい」→「箸が止まる。窓の外を見る。何も言わない。」`
              : `感情ラベリングは使っていませんが、感情を「見せる」描写が不足しています。動作描写（ト書き）を増やしてください。` };
      },
      () => {
        // サブテキストの質
        const hasGoodSubtext = hasEllipsis && dialogCount >= 2;
        const hasShortDialogue = (ans.match(/「[^」]{1,12}」/g) || []).length >= 1;
        const pts = (hasGoodSubtext && hasShortDialogue) ? 15 : (hasGoodSubtext ? 10 : (hasEllipsis ? 7 : 3));
        return { pass: hasGoodSubtext && hasShortDialogue, earnedPoints: pts,
          comment: (hasGoodSubtext && hasShortDialogue)
            ? `沈黙・間・短いセリフによる本音の「言いかけ」が機能しています。プロのサブテキスト技術です。`
            : !hasEllipsis
              ? `「……」や（間）がありません。セリフとセリフの間の「空白」こそが感情を伝えます。最低1か所、言葉が止まる瞬間を作ってください。`
              : `サブテキストの萌芽はありますが、短いセリフ（6字以内）やト書きの「行動」でより鮮明に示せます。` };
      },
      () => {
        // シーン前後の変化の質
        const hasConcreteChange = hasChange && (hasConflict || has('決め', '断り', '去る', '立つ', '手を', '目を'));
        const pts = hasConcreteChange ? 15 : (hasChange ? 10 : 4);
        return { pass: hasConcreteChange, earnedPoints: pts,
          comment: hasConcreteChange
            ? `シーンの前後で登場人物の「立場・態度・認識」が具体的に変化しています。このシーンは次のシーンを必然的に牽引します。`
            : `シーンの「変化」が弱いです。最後のト書きかセリフで「このシーンの前と何が違うか」を行動一つで示してください。変化のないシーンは脚本から削除すべき場面です。` };
      },
    ],

    'ex-subtext-01': [
      () => {
        const usedBad = directEmotions.filter(w => ans.includes(w));
        const pts = usedBad.length === 0 ? 25 : (usedBad.length === 1 ? 14 : 6);
        return { pass: usedBad.length === 0, earnedPoints: pts,
          comment: usedBad.length === 0
            ? `感情の直接表現を一切使わずに書き換えられています。「感情を言わずに伝える」技術の核心です。`
            : `「${usedBad.join('・')}」という感情ラベルが残っています。これがある限りサブテキストは成立しません。感情を「物・動作・速度・沈黙」に完全変換してください。` };
      },
      () => {
        const patternCount = (ans.match(/パターン[1-9１-９一二三]|【書き換え|▼書き換え|（案[1-9]）/g) || []).length;
        const hasMultipleVersions = patternCount >= 2 || (lineCount >= 8 && dialogCount >= 4);
        const pts = hasMultipleVersions ? 20 : (patternCount >= 1 ? 13 : 7);
        return { pass: hasMultipleVersions, earnedPoints: pts,
          comment: hasMultipleVersions
            ? `複数の書き換えパターンを提示できています。アプローチの多様性がプロの証です。`
            : `書き換えパターンが1通りしか確認できません。同じ感情を「異なる手法」で2〜3パターン書くことで、技術の幅が証明されます。` };
      },
      () => {
        const hasExplanation = ans.length > 200 && has('なぜ', '理由', '機能', 'サブテキスト', '本音', '言外', '行間', 'から', 'ため');
        const pts = hasExplanation ? 20 : (ans.length > 150 ? 13 : 6);
        return { pass: hasExplanation, earnedPoints: pts,
          comment: hasExplanation
            ? `書き換えの「なぜそれがサブテキストなのか」を説明できています。メタ認知力が高い。`
            : `書き換えたセリフが「なぜサブテキストとして機能するのか」の説明がありません。コンクール審査では「わかっているかどうか」を解説で証明します。` };
      },
      () => {
        const hasNaturalDialogue = dialogCount >= 2 && !has('（怒り）', '（悲しみ）', '（泣きながら）');
        const hasRealismMarker = hasEllipsis || has('（間）', 'ため息', '視線', 'うつむく', '背を向ける');
        const pts = (hasNaturalDialogue && hasRealismMarker) ? 20 : (hasNaturalDialogue ? 13 : 7);
        return { pass: hasNaturalDialogue && hasRealismMarker, earnedPoints: pts,
          comment: (hasNaturalDialogue && hasRealismMarker)
            ? `会話の自然さと「間」「動作」が一体となっています。俳優が演じたくなるセリフです。`
            : `ト書きに「（怒り）（悲しみ）」などの感情指示が残っている、または沈黙・間の表現がありません。俳優への演技指示は感情ではなく「動き」で書きます。` };
      },
      () => {
        const pts = hasEllipsis ? 15 : (has('間', '沈黙', '黙', 'ポーズ') ? 10 : 4);
        return { pass: hasEllipsis, earnedPoints: pts,
          comment: hasEllipsis
            ? `「……」や（間）を効果的に使用しています。「言わないこと」が最大の言葉になっています。`
            : `無言・間・沈黙の表現が見当たりません。サブテキストの究極は「何も言わないこと」です。最低1か所、セリフが止まる瞬間を作ってください。` };
      },
    ],

    'ex-arc-01': [
      () => {
        const hasDefFlaw = has('欠如', '不完全', '孤立', '閉', '恐れ', '拒む', '逃げ', '一人') && hasGhost;
        const pts = hasDefFlaw ? 20 : (has('欠如', '欠点', '弱さ') ? 12 : (hasGhost ? 10 : 4));
        return { pass: hasDefFlaw, earnedPoints: pts,
          comment: hasDefFlaw
            ? `Ghostと欠如が有機的に繋がっています。過去の傷が現在の行動パターンを作っているという因果が見えます。`
            : !hasGhost
              ? `Ghost（原体験・トラウマ）が不明確です。キャラクターの誤信念には必ず「根拠となる過去」があります。具体的なエピソード（何歳の時、何があったのか）を書いてください。`
              : `Ghostはありますが、「現在の欠如」への繋がりが見えません。Ghost→誤信念→現在の行動という因果の鎖を明示してください。` };
      },
      () => {
        const hasGoodLie = hasLie && hasGhost && has('から', 'ため', 'によって', 'ことで', 'その結果');
        const pts = hasGoodLie ? 20 : (hasLie ? 13 : (hasGhost ? 8 : 4));
        return { pass: hasGoodLie, earnedPoints: pts,
          comment: hasGoodLie
            ? `誤信念（Lie）がGhostから論理的に導かれています。「過去の経験→信念の歪み」という因果構造が完成しています。`
            : !hasLie
              ? `誤信念（Lie/間違った信念）が書かれていません。キャラクターアークの核心は「間違った信念を持って生きる人間が、その間違いに気づく旅」です。`
              : `誤信念はありますが、Ghostからの「なぜそう信じるようになったか」の因果説明が不足しています。` };
      },
      () => {
        const hasWantNeedTension = hasWant && hasNeed && has('対立', '葛藤', '矛盾', '妨げ', '阻む', '邪魔', 'ズレ', 'しかし', 'だが');
        const pts = hasWantNeedTension ? 20 : ((hasWant && hasNeed) ? 13 : ((hasWant || hasNeed) ? 8 : 3));
        return { pass: hasWantNeedTension, earnedPoints: pts,
          comment: hasWantNeedTension
            ? `WantとNeedの対立構造が明確です。Wantを追求するほどNeedから遠ざかるという逆説的設計が機能しています。`
            : !(hasWant && hasNeed)
              ? `WantとNeedの両方を設計してください。Want（外的・意識的な目標）とNeed（内的・無意識的な成長）は常に「対立または矛盾する関係」でなければなりません。`
              : `WantとNeedはありますが、「対立・葛藤・矛盾」の関係が明示されていません。なぜWantを追うことがNeedの獲得を妨げるのかを説明してください。` };
      },
      () => {
        const hasStrongClimax = hasCataclism && has('選択', '決断', '証明', '行動', '変わ', 'もう', '初めて', 'ついに');
        const hasOldNew = has('以前', '昔', '変わる前', '変化後', 'かつての', '今の', '対比');
        const pts = (hasStrongClimax && hasOldNew) ? 20 : (hasStrongClimax ? 14 : (hasCataclism ? 9 : 4));
        return { pass: hasStrongClimax && hasOldNew, earnedPoints: pts,
          comment: (hasStrongClimax && hasOldNew)
            ? `クライマックスの選択が「旧自己との決別」として機能しています。変化が行動で証明されています。`
            : !hasCataclism
              ? `クライマックスが設計されていません。アークの証明は「この選択をする前の自分なら絶対しなかった行動」でなければなりません。`
              : `クライマックスはありますが、「変化前の自分との対比」が弱いです。「以前ならば〜したはず。しかし今の○○は〜した」という構造で示してください。` };
      },
      () => {
        const hasClosing = has('クロージング', '結末', '最後', 'エンディング', '幕');
        const hasContrast = has('対比', '変わっている', '違う', '同じ場面', '冒頭', '冒頭と', '同じ');
        const pts = (hasClosing && hasContrast) ? 20 : (hasClosing ? 12 : (ans.length > 300 ? 8 : 4));
        return { pass: hasClosing && hasContrast, earnedPoints: pts,
          comment: (hasClosing && hasContrast)
            ? `クロージングイメージが冒頭と対比をなしています。「変化した世界」が映像的に示されています。これが観客の余韻を生みます。`
            : !hasClosing
              ? `クロージングイメージがありません。物語の最後の「映像」を書いてください。最も効果的なのは「冒頭と同じ場所・同じ行動」で「何が違うか」を示す方法です。`
              : `クロージングイメージはありますが、冒頭との対比が示されていません。「同じ空間・同じ行動・でも全く違う意味」という構造が大河ドラマの終幕に多用される手法です。` };
      },
    ],

    'ex-structure-01': [
      () => {
        const pts = specificSceneRef ? 25 : (ans.length > 400 ? 16 : 8);
        return { pass: specificSceneRef, earnedPoints: pts,
          comment: specificSceneRef
            ? `具体的なシーン・時間・ページを根拠として引用できています。批評の説得力があります。`
            : `抽象的な説明にとどまっています。「○○のシーン（第△話）」「開始後□分の場面」という具体的な根拠なしに構成分析は成立しません。NHKや映画祭の審査では必ず具体性を問われます。` };
      },
      () => {
        const hasActs = has('Act1', 'Act2', 'Act3', '第一幕', '第二幕', '第三幕', '1幕', '2幕', '3幕') && hasConflict;
        const pts = hasActs ? 20 : ((has('三幕', '構成') && ans.length > 200) ? 13 : 5);
        return { pass: hasActs, earnedPoints: pts,
          comment: hasActs
            ? `三幕の分割を具体的なシーンと対応させて説明できています。`
            : `三幕（Act1/2/3）の境界を「具体的なシーン名や時間」で示してください。「なんとなく三幕にわかれている」という説明では分析になりません。` };
      },
      () => {
        const hasWantNeedContrast = hasWant && hasNeed && has('対比', '対立', '違い', 'ズレ', '矛盾', '一方');
        const pts = hasWantNeedContrast ? 20 : ((hasWant && hasNeed) ? 13 : 6);
        return { pass: hasWantNeedContrast, earnedPoints: pts,
          comment: hasWantNeedContrast
            ? `WantとNeedの対立を明確に示せています。主人公分析の核心を押さえています。`
            : `WantとNeedをそれぞれ挙げるだけでなく、「なぜそれらが対立するのか」「Wantを追う過程でNeedがどう変化するか」を説明してください。` };
      },
      () => {
        const hasBeats = has('ビート', 'Save the Cat', 'Catalyst', 'Midpoint', 'All is Lost', 'Dark Night', 'Opening', 'Theme Stated') || (has('触媒', 'ミッドポイント', '最低点', '暗闇') && specificSceneRef);
        const pts = hasBeats ? 20 : (has('ビートシート') ? 12 : 5);
        return { pass: hasBeats, earnedPoints: pts,
          comment: hasBeats
            ? `Save the Catのビートポイントを正確にマッピングしています。`
            : `Save the Catのビート（Catalyst/Midpoint/All is Lostなど）を少なくとも3点、具体的なシーンにマッピングしてください。ビート名だけ書いてシーン根拠がないのは分析とは言えません。` };
      },
      () => {
        const hasPersonalVoice = has('なぜ', '理由は', '思う', '感じる', '考える', 'だから', 'このため', '機能している') && ans.length > 300;
        const pts = hasPersonalVoice ? 15 : (ans.length > 200 ? 10 : 5);
        return { pass: hasPersonalVoice, earnedPoints: pts,
          comment: hasPersonalVoice
            ? `自分の言葉で「なぜこの作品が機能するのか」を説明できています。批評家的視点を持っています。`
            : `分析の最後に「自分の見解」を必ず書いてください。事実の列挙では批評になりません。「なぜこれが観客の感情を動かすのか」を自分の言葉で説明することで、次の創作に繋がります。` };
      },
    ],
  };

  // ── ルーブリック評価実行 ─────────────────────────────────────
  const rubricFeedback = ex.rubric.map((r, i) => {
    if (PRO_EVALUATORS[ex.id] && PRO_EVALUATORS[ex.id][i]) {
      const result = PRO_EVALUATORS[ex.id][i]();
      return { pass: result.pass, comment: result.comment, earnedPoints: Math.min(result.earnedPoints, r.weight) };
    }
    // 汎用評価（未対応の演習IDやルーブリック超過分）
    const kw = r.point.replace(/[（）・、。？！「」]/g, ' ').split(/\s+/).filter(k => k.length >= 2);
    const matched = kw.filter(k => ans.includes(k)).length;
    const ratio = matched / Math.max(kw.length, 1);
    const pass = ratio >= 0.35 && len >= ex.estimatedTime * 25;
    const earnedPoints = Math.floor(r.weight * Math.min(1, ratio * 1.2 + (len >= ex.estimatedTime * 40 ? 0.25 : 0)));
    return { pass, comment: pass
      ? `この採点項目の要素が解答に含まれています。`
      : `「${kw.slice(0,3).join('・')}」などの要素が不足しています。問題の要件を再確認し、各項目を意識して書き直してください。`,
      earnedPoints: Math.min(earnedPoints, r.weight) };
  });

  const totalScore = rubricFeedback.reduce((s, r) => s + r.earnedPoints, 0);

  // ── プロ水準グレード判定 ──────────────────────────────────────
  const grade = totalScore >= 90 ? '師範代認定' : totalScore >= 80 ? '優秀（プロ水準）' : totalScore >= 65 ? '良好（上位）' : totalScore >= 50 ? '合格（基礎習得）' : '要修行';
  const scoreColor = totalScore >= 90 ? 'var(--matcha)' : totalScore >= 80 ? 'var(--asagi)' : totalScore >= 65 ? 'var(--kogane)' : totalScore >= 50 ? '#e67e22' : 'var(--accent)';

  // ── 改善提案（プロ水準の具体的指摘）──────────────────────────
  const failedItems = rubricFeedback.filter(r => !r.pass);
  const improvements = failedItems.slice(0, 5).map((r) => {
    const idx = rubricFeedback.indexOf(r);
    const rub = ex.rubric[idx];
    if (!rub) return null;
    return `【${rub.point}（${rub.weight}点）】 ${r.comment}`;
  }).filter(Boolean);

  // ── 演習別総合コメント（コンクール審査員水準）───────────────────
  const proComments = {
    'ex-logline-01': {
      s: `このログラインはコンクール一次審査を突破できる水準です。主人公の欠如が固有性を持ち、目標と障害が一文に凝縮されています。次のステップは「テーマの余韻をもう1語削ることで際立たせる」洗練です。`,
      a: `ログラインの骨格は完成しています。プロデューサーへのピッチで「もっと聞かせてください」を引き出すためには、主人公の「欠如」をより鋭い一語に圧縮してください。NHK大河の企画書に採用されるログラインは「その人物にしかできない物語」という固有性が際立っています。`,
      b: `基本は理解できていますが、字数・要素・テーマのバランスが崩れています。一度要素を分解して「主人公の欠如1語 → 外的目標1動詞 → 障害の本質 → テーマの余韻」の順に組み直してください。`,
      f: `ログラインの設計を根本から見直してください。まず問題文の4要素（欠如・目標・障害・テーマ）それぞれを箇条書きで整理し、その後で1文に統合する練習をしてください。`,
    },
    'ex-scene-01': {
      s: `このシーンはコンクール審査の観点から見て、分析と創作の両面で高い完成度があります。特に「感情を見せる」技術が機能しています。大河ドラマ水準に達するための最後の一歩は、ト書きの「映像密度」をさらに上げることです。`,
      a: `分析眼は鋭いですが、脚本として「書く」段階でまだ「説明」に頼っています。感情は一切書かず、行動と間と短いセリフだけで伝えてください。`,
      b: `シーン設計の理解はありますが、脚本形式と感情の「見せ方」の習得が必要です。まず柱書きとト書きの基本フォーマットを完全に習得することを優先してください。`,
      f: `シーンの目的・葛藤・変化の概念から再学習してください。関連記事「シーンの設計術」を読んでから再挑戦することを強くお勧めします。`,
    },
    'ex-arc-01': {
      s: `キャラクターアークの設計として最高水準です。Ghost→Lie→Want/Needの対立→クライマックスの選択という因果の連鎖が完璧に機能しています。このアーク設計で脚本を書けば、キャラクターが「生きている」と感じさせられます。`,
      a: `アークの骨格はできています。「誤信念がGhostから論理的に生まれているか」と「クライマックスの選択が変化の証明になっているか」の2点をさらに磨いてください。`,
      b: `アークの構成要素は揃い始めていますが、各要素間の「因果の鎖」が弱いです。Ghost→Lie→WantとNeedの矛盾→最低点→クライマックスの選択という流れを一本の「なぜなら」で繋げてください。`,
      f: `キャラクターアーク設計の基礎から始めてください。まず「主人公の誤信念は何か？」「その誤信念はいつ・どうやって生まれたか？」の2点だけに集中してください。`,
    },
  };

  const exCom = proComments[ex.id];
  let overallComment = '';
  if (totalScore >= 90) {
    overallComment = exCom?.s || `師範代認定水準の解答です。コンクール・大賞の一次審査を突破できる品質があります。`;
  } else if (totalScore >= 80) {
    overallComment = (exCom?.a || `プロ水準に近い解答です。`) + `\n\n【次の一手】${improvements.length > 0 ? improvements[0] : 'さらなる精度向上を目指してください。'}`;
  } else if (totalScore >= 65) {
    overallComment = (exCom?.b || `基礎が身についています。`) + `\n\n改善優先度：\n${improvements.slice(0,3).map((s,i)=>`${i+1}. ${s.slice(0,60)}…`).join('\n')}`;
  } else if (totalScore >= 50) {
    overallComment = (exCom?.f || `要修行レベルです。`) + `\n\nまず採点基準の上位2項目に集中して書き直してください。ヒントと模範解答を参照しながら、一度完全に解体して再構築することをお勧めします。`;
  } else {
    overallComment = `根本的な見直しが必要です。\n\n問題文の要件と採点基準を再度丁寧に読み直してください。コンクール・大賞の審査は「要件を満たしているか」の確認から始まります。\n\n【取り組み方】\n1. まず問題文の要件を箇条書きで整理する\n2. 採点基準の各項目を「できているか」確認する\n3. できていない項目から順番に直す\n4. ヒントを見て方向性を確認する\n5. 模範解答と照らし合わせる`;
  }

  return { score: totalScore, grade, scoreColor, rubricFeedback, overallComment, improvements };
}
