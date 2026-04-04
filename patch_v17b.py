#!/usr/bin/env python3
"""
v17b: 審査員コメントの精密化
- 脚本固有のテキスト(実際のシーン・台詞)を審査員コメントに直接引用
- 委員長コメントに実際のシーン名・主人公名・台詞を埋め込む
- セリフ担当に実際の長台詞・説明台詞を引用
- プロデューサーコメントに実際のロケ・キャスト情報を反映
"""

TARGET = 'public/static/app.js'
with open(TARGET, 'r', encoding='utf-8') as f:
    src = f.read()

orig_len = len(src)
patches = []

# ════════════════════════════════════════════════════════════════
# PATCH A: 審査委員長コメントを脚本固有化
# 実際のシーン名・主人公名・強い台詞を引用
# ════════════════════════════════════════════════════════════════
old_a = """    judgesCommentsV13.push({
      judge: '審査委員長',
      score: eiSc,
      comment: eiSc >= 4
        ? `感情的インパクトが際立っています。コンクールの一次審査を通過するに十分な牽引力があります。${origSc >= 4 ? 'オリジナリティも高く、この書き手ならではの世界観が確立されています。次稿では「審査員の記憶に残るシーン」をさらに1つ追加することを目指してください。' : '次稿ではオリジナリティをさらに磨き、「この作家にしか書けない話」という確信を読み手に与えてください。'}`
        : `感情的インパクトが今一歩です。コンクール審査員は「続きを読みたい」と思わせる瞬間を探します。転換点・意外性・忘れられないシーン——3つのうち少なくとも1つを強化してください。読後に「何かが変わった」という感覚が残る脚本が一次通過します。`
    });"""

new_a = """    // v17: 審査委員長コメントに脚本固有テキストを埋め込む
    const chairComment = (() => {
      const mn = mainCharName || '主人公';
      const scnCount = sceneCount;
      const genreHint = genreStr ? `（推定ジャンル: ${genreStr}）` : '';
      // Find a memorable dialogue line for citation
      const memDlg = itemDetails['emotional-impact']?.quote ||
        dialogueTexts.filter(d => d.length >= 15 && d.length <= 60)
          .sort((a,b) => b.length - a.length)[0] || null;
      const memScene = sceneLines.length > 0 ? sceneLines[Math.floor(sceneLines.length * 0.7)] : null;

      if (eiSc >= 4) {
        let c = `感情的インパクトが際立っています${genreHint}。`;
        c += `${mn}を中心に${scnCount}シーンで構成されたこの脚本は、コンクール一次審査を通過するに十分な牽引力を持っています。`;
        if (memDlg) c += `\n特に「${memDlg.slice(0,50)}${memDlg.length>50?'…':''}」の台詞は審査員の印象に残るでしょう。`;
        if (memScene) c += `\n${memScene}付近のシーンが作品の情感的クライマックスとして機能しています。`;
        c += origSc >= 4
          ? '\nオリジナリティも高く、この書き手ならではの世界観が確立されています。次稿では「審査員の記憶に残るシーン」をさらに1つ追加することを目指してください。'
          : '\n次稿ではオリジナリティをさらに磨き、「この作家にしか書けない話」という確信を読み手に与えてください。';
        return c;
      } else {
        let c = `感情的インパクトが今一歩です${genreHint}。`;
        c += `現在${scnCount}シーン、${mn}を主軸とした構成ですが、コンクール審査員が「続きを読みたい」と思わせる決定的な瞬間が見当たりません。`;
        if (memDlg) {
          c += `\n「${memDlg.slice(0,45)}${memDlg.length>45?'…':''}」——この台詞の場面に、もう一段階の感情的緊張を加えてください。`;
        } else {
          c += '\n転換点・意外性・忘れられないシーン——3つのうち少なくとも1つを強化してください。';
        }
        c += '\n読後に「何かが変わった」という感覚が残る脚本が一次通過します。';
        return c;
      }
    })();
    judgesCommentsV13.push({
      judge: '審査委員長',
      score: eiSc,
      comment: chairComment
    });"""

if old_a in src:
    src = src.replace(old_a, new_a, 1)
    patches.append('A) Personalized chief judge comment with script-specific citations')
else:
    patches.append('A) SKIP: chief judge comment not found')

# ════════════════════════════════════════════════════════════════
# PATCH B: セリフ担当コメントを脚本固有化
# 実際のオン・ザ・ノーズ台詞・長台詞を引用
# ════════════════════════════════════════════════════════════════
old_b = """    const subtSc = scores['subtext'] || 0;
    const voiceSc = scores['voice'] || 0;
    judgesCommentsV13.push({
      judge: 'セリフ担当審査員',
      score: Math.round((subtSc + voiceSc) / 2),
      comment: subtSc >= 4
        ? `サブテキストの扱いが秀逸です。登場人物が本音を言わずに感情を伝える技術が確立されています。キャラクターの声も固有性があり、誰が話しているか台詞だけで分かります。`
        : `セリフに「説明」が多く見受けられます。登場人物は本音を言いません。「言いたいこと」の裏にある行動・沈黙・物で語る——サブテキスト技法を全セリフに適用してください。「悲しい」ではなく「コーヒーカップを洗い続ける手が止まらない」。`
    });"""

new_b = """    const subtSc = scores['subtext'] || 0;
    const voiceSc = scores['voice'] || 0;
    // v17: セリフ担当コメントに実際の台詞を引用
    const dlgJudgeComment = (() => {
      const longDlg = dialogueTexts.filter(d=>d.length>70).sort((a,b)=>b.length-a.length)[0];
      const otnDlg = dialogueTexts.find(d => ['なんですよ','ということは','つまり','実は私','要するに'].some(p=>d.includes(p)));
      const subtDlg = dialogueTexts.find(d => ['…','——'].some(p=>d.includes(p)) && d.length < 20);
      const charCount = Object.keys(dialogueByChar || {}).length;
      if (subtSc >= 4) {
        let c = `サブテキストの扱いが秀逸です（サブテキスト${subtSc}/5・声の固有性${voiceSc}/5）。`;
        c += `${charCount}人のキャラクターがそれぞれ固有の話し方を持ち、台詞だけで誰が話しているか判別できます。`;
        if (subtDlg) c += `\n例: 「${subtDlg}」——この沈黙・省略が感情の深さを語っています。`;
        c += '\n次稿でも、このサブテキスト技法を全シーンに貫徹してください。';
        return c;
      } else {
        let c = `セリフに「説明」が多く見受けられます（サブテキスト${subtSc}/5・声の固有性${voiceSc}/5）。`;
        if (otnDlg) c += `\n例: 「${otnDlg.slice(0,50)}${otnDlg.length>50?'…':''}」——登場人物がこの感情を直接言っています。`;
        c += '\n登場人物は本音を言いません。「言いたいこと」の裏にある行動・沈黙・物で語る——サブテキスト技法を適用してください。';
        if (longDlg) c += `\nまた「${longDlg.slice(0,40)}…」(${longDlg.length}字)は長すぎます。60字以内に分割してください。`;
        c += '\n「悲しい」ではなく「コーヒーカップを洗い続ける手が止まらない」。';
        return c;
      }
    })();
    judgesCommentsV13.push({
      judge: 'セリフ担当審査員',
      score: Math.round((subtSc + voiceSc) / 2),
      comment: dlgJudgeComment
    });"""

if old_b in src:
    src = src.replace(old_b, new_b, 1)
    patches.append('B) Personalized dialogue judge with actual line citations')
else:
    patches.append('B) SKIP: dialogue judge comment not found')

# ════════════════════════════════════════════════════════════════
# PATCH C: プロデューサーコメントを脚本固有化
# 実際のロケ数・キャスト数・推定コストを反映
# ════════════════════════════════════════════════════════════════
old_c = """    const prodSc  = scores['production-viability'] || 0;
    const visSc   = scores['visual'] || 0;
    judgesCommentsV13.push({
      judge: 'プロデューサー視点',
      score: Math.round((prodSc + visSc + commercialScoreV13) / 3),
      comment: prodSc >= 4
        ? `制作コスト観点で優れています。日常的な舞台設定・映像映えするト書き——放送・配信向けのパッケージとして企画を通す力があります。商業適合度: ${commercialScoreV13}/5。映像化適合スコア: ${adaptationScoreV13}%。`
        : `制作コストが心配です。VFX・大規模ロケ・多人数キャストは予算を圧迫します。同じ感情効果を「密室」「2人」「日常の道具」で表現できないか検討してください。予算内で作れる脚本が実際に映像化されます。`
    });"""

new_c = """    const prodSc  = scores['production-viability'] || 0;
    const visSc   = scores['visual'] || 0;
    // v17: プロデューサーコメントに実際の制作情報を反映
    const prodJudgeComment = (() => {
      const locCount = locationVariety || Math.min(sceneCount, 5);
      const castCount = uniqueChars;
      const typeL = {'tv-drama':'TVドラマ','film':'映画','stage':'舞台','web':'WEB/配信','competition':'コンクール','short':'短編'}[sType] || sType;
      const costLevel = prodSc >= 4 ? '低〜中' : prodSc >= 3 ? '中' : '中〜高';
      // Find any VFX or high-cost elements
      const vfxLine = actionLines.find(l => ['爆発','VFX','CG','宇宙','大群衆','空を飛ぶ'].some(k=>l.includes(k)));
      if (prodSc >= 4) {
        let c = `${typeL}として制作コスト観点で優れています（映像化適合度${adaptationScoreV13}%・商業適合度${commercialScoreV13}/5）。`;
        c += `\n推定制作規模: ロケ約${locCount}カ所・レギュラーキャスト${castCount}名・コストレベル${costLevel}。`;
        c += `\n${sceneCount}シーン構成で${typeL}としての放送尺（30〜60分）に適した構成です。`;
        c += '\n企画として通る力があります。次のステップは完成度の高いパイロット版の準備です。';
        return c;
      } else {
        let c = `${typeL}として制作コスト面に課題があります（映像化適合度${adaptationScoreV13}%・商業適合度${commercialScoreV13}/5）。`;
        c += `\n現在: ロケ約${locCount}カ所・レギュラーキャスト${castCount}名——`;
        c += castCount > 7 ? `キャスト数(${castCount}名)が多すぎます。メインキャラを5名以内に絞ってください。` : '';
        c += locCount > 8 ? `ロケ数(${locCount}カ所)が多すぎます。主要ロケ3〜5カ所に集中してください。` : '';
        if (vfxLine) c += `\n特に「${vfxLine.slice(0,45)}」のような場面は制作費が膨らみます。音響・照明・役者の演技で代替してください。`;
        c += '\n同じ感情効果を「密室」「2人」「日常の道具」で表現できないか検討してください。予算内で作れる脚本が実際に映像化されます。';
        return c;
      }
    })();
    judgesCommentsV13.push({
      judge: 'プロデューサー視点',
      score: Math.round((prodSc + visSc + commercialScoreV13) / 3),
      comment: prodJudgeComment
    });"""

if old_c in src:
    src = src.replace(old_c, new_c, 1)
    patches.append('C) Personalized producer comment with actual production stats')
else:
    patches.append('C) SKIP: producer comment not found')

# ════════════════════════════════════════════════════════════════
# PATCH D: 障壁・テンポ担当コメントの脚本固有化
# ════════════════════════════════════════════════════════════════
old_d = """      if (obstSc >= 4) {
        const ex = itemDetails['obstacle-strength']?.quote;
        return `障壁の設計が優れています（${obstSc}/5）。${typeLabel}として主人公を十分に追い詰める構造が機能しています。` +
               (ex ? `\n引用: 「${ex.slice(0,60)}」——この対立が脚本の引力を生んでいます。` : '');"""

new_d = """      if (obstSc >= 4) {
        const ex = itemDetails['obstacle-strength']?.quote ||
          actionLines.find(l => ['阻む','対立','裏切','危機','絶体絶命','追い詰め','拒否'].some(k=>l.includes(k)));
        const mn17 = mainCharName || '主人公';
        return `障壁の設計が優れています（${obstSc}/5）。${typeLabel}として${mn17}を十分に追い詰める構造が機能しています。` +
               (ex ? `\n引用: 「${ex.slice(0,65)}${ex.length>65?'…':''}」——この対立が脚本の引力を生んでいます。` : '');"""

if old_d in src:
    src = src.replace(old_d, new_d, 1)
    patches.append('D) Enhanced obstacle judge with mainCharName reference')
else:
    patches.append('D) SKIP')

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
