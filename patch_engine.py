#!/usr/bin/env python3
"""Direct engine text patches using Python unicode strings"""

with open('/home/user/webapp/public/static/app.js', 'r', encoding='utf-8') as f:
    code = f.read()

orig_len = len(code)
patches = []

# 1. noEmotionNote — more precise
patches.append((
    "    const noEmotionNote = { type: 'bad', text: '作品力：感情的なピークシーンが弱い。「この場面で涙が出るか・鳥肌が立つか」を基準にクライマックスを再設計してください。感情表現密度' + Math.round(emotionDensity * 100) + '%・強い感情瞬間' + emotionStrongCount + '箇所。' };",
    "    const noEmotionNote = { type: 'bad', text: '作品力：感情密度' + Math.round(emotionDensity * 100) + '%（低め）・強い感情瞬間' + emotionStrongCount + '箇所。クライマックス近くで「主人公が最も傷つく／最も勇気を出す」シーンを行動・沈黙・物で表現してください。感情を語らせず、「観客自身が気づく」空間を設計するのが鍵です。' };"
))

# 2. noteObjDlgLen — more actionable
patches.append((
    "    const noteObjDlgLen = { type: 'warn', text: 'セリフ長：平均' + Math.round(avgDialogueLen) + '字と長めです。実際の会話は10〜30字程度が自然です。長いセリフは「演説」に見えます。１セリフ60字超えたら分割か削除を検討してください。' };",
    "    const noteObjDlgLen = { type: 'warn', text: 'セリフ長：平均' + Math.round(avgDialogueLen) + '字（長め）。自然な会話は10〜35字程度。長いセリフは「演説・説明」に見えます。ぜびこ：60字超のセリフを半分に切る。小さくなるほど、原文が冗長だったということです。' };"
))

# 3. Dialogue dynamics warn note - add quote
old_dlg_warn = """  if (scores['dialogue-dynamics'] <= 2 && totalDialogueLines >= 4) {
    notes.push({ type: 'warn', text: '対話の引力：キャラクター間の会話に緊張感・目的の衝突が不足しています。各キャラが「異なる目的・情報・感情」を持って同じシーンに入場する設計にしてください。' });
  }"""
new_dlg_warn = """  if (scores['dialogue-dynamics'] <= 2 && totalDialogueLines >= 4) {
    // Find a bland dialogue exchange to quote
    const blandKws = ['なるほど', 'そうですね', 'わかりました', 'うん', 'そうか'];
    const blandDlg = dialogueTexts.find(d => blandKws.some(k => d.includes(k)) && d.length < 30);
    const dynWarnNote = { type: 'warn', text: '対話の引力：会話に緊張感・欲求の衝突が不足しています。設計問い：「Aは何を得たがっているか」「Bは何を隠したがっているか」——両方を答えられない会話はインフォ交換です。各キャラに「相手と環境の中で追いかける欲求」を設計してください。' };
    if (blandDlg) dynWarnNote.quote = '「' + blandDlg + '」\n→ この交換に「追う欲求」を追加してください';
    notes.push(dynWarnNote);
  }"""
patches.append((old_dlg_warn, new_dlg_warn))

# 4. The sr-fb-tab hover style was missed - apply directly
# Already applied via MultiEdit earlier

# 5. Direction note - improve 
old_dir = "    const noteObjDir = { type: 'bad', text: 'ト書き：90字超の長いト書きが' + longActionCount + '箇所あります。ト書きに書くべきは「映像として見える最小限の情報」のみです。感情描写・内面説明は役者に委ねてください。理想：1〜2文・30〜50字。' };"
new_dir = "    const noteObjDir = { type: 'bad', text: 'ト書き：90字超が' + longActionCount + '箇所。鉄則①「見えるもの・聞こえるもの」のみ書く ②1行=1カット ③感情・内面・副詞は全削除。例：「田中は悲しそうにゆっくり立ち上がった」→「田中、立つ。（間）」に圧縮。' };"
patches.append((old_dir, new_dir))

# 6. Improve the emoWarnNote (scores 2-3 range, if exists)
old_emo_warn = """  } else if (scores['emotional-impact'] === 3) {
    const emoWarnNote = { type: 'warn', text: '感情インパクト：感情キーワード密度' + Math.round(emotionDensity*100) + '%（やや低め）。脚本中の感情的ピーク（クライマックス）を強化してください。登場人物の内的葛藤を行動で示すシーンを1つ加えるだけで劇的に変わります。' };"""
# Try different possible existing string
old_emo_warn2 = "感情インパクト：感情キーワード密度' + Math.round(emotionDensity*100) + '%（やや低め）。脚本中の感情的ピーク（クライマックス）を強化してください。登場人物の内的葛藤を行動で示すシーンを1つ加えるだけで劇的に変わります。"
new_emo_warn2 = "感情インパクト：感情密度' + Math.round(emotionDensity*100) + '%（もう一歩）。クライマックスで「主人公が最も傷つく瞬間」か「最も勇気を出す瞬間」のどちらかをシーンとして設ければ感情密度が跳ね上がります。行動で表現するのが鍵です。"
patches.append((old_emo_warn2, new_emo_warn2))

# 7. ITEM_DB: three-act — expand tips with richer content 
old_three_act_tips = """    'three-act': {
      label: '三幕構成',
      tips: [
        { title: '発端事件（インサイティング・インシデント）の強化', bad: 'シーン1: 主人公の普通の朝。\\nシーン2: 会社に着く。\\nシーン3: 上司に呼ばれる。', good: 'シーン1（発端事件）:\\n電話が鳴る。真夜中。田中、出ると——電話口の声は10年前に失踪した兄だった。\\n「会いに来い。でも誰にも言うな」', tip: '第一幕の発端事件は「主人公の日常を壊す一撃」。観客が「これからどうなる？」と前のめりになる出来事を最初の15%に置きましょう。' },
        { title: '第二幕中盤の「中央の危機」を挿入', bad: 'シーン12: 捜索を続ける田中。\\nシーン13: ヒントを見つける。\\nシーン14: さらに追う。', good: 'シーン12（中央の危機）:\\n田中、ついに手がかりを掴む——しかし同時に、自分がずっと探していたものが「存在しない」かもしれないと悟る。\\n立ちすくむ田中。これまでの行動が全て崩れ落ちる瞬間。', tip: '第二幕中盤（全体の50%地点）に「最悪の瞬間・最大の誤解・信念の崩壊」を置くと構成が引き締まります。' },
      ]
    },"""
new_three_act_tips = """    'three-act': {
      label: '三幕構成',
      tips: [
        { title: '発端事件を最初の15%以内に配置せよ', bad: 'シーン1: 主人公の普通の朝。\nシーン2: 会社に着く。\nシーン3: 上司に呼ばれる。\n（15ページ経っても何も起きない——読者が離脱）', good: 'シーン1（発端事件: 冒頭2分）:\n電話が鳴る。真夜中。田中、出ると——電話口の声は10年前に失踪した兄だった。\n「会いに来い。でも誰にも言うな」\n→ 日常が壊れる一撃', tip: '発端事件のチェック：①主人公の日常が壊れるか ②「これからどうなる？」と読者が前のめりになるか ③主人公が「行動せざるを得ない状態」に追い込まれるか。全てYesなら合格。' },
        { title: '中間点（Midpoint）で物語を折り返せ', bad: '第1幕と第3幕の間が漠然と続く——主人公が動いているだけでドラマがない。', good: '中間点（全体の50%）:\n田中がようやく目標を達成したと思った瞬間——\n実は自分が最大の原因だったと知る。\n（偽りの勝利→崩壊→再起が構成の軸になる）', tip: '中間点がないと第2幕が「中だるみ」になる。主人公の「方向転換」を引き起こす決定的発見や崩壊をここに配置する。' },
      ]
    },"""
patches.append((old_three_act_tips, new_three_act_tips))

# 8. ITEM_DB: subtext - expand with richer examples
old_subtext = """    'subtext': {
      label: 'サブテキスト',
      tips: [
        { title: '説明台詞 → サブテキスト台詞への変換', bad: '田中「私はずっと君のことが好きだったけど、怖くて言えなかったんだ」', good: '田中「……傘、持ってきた。念のため」\\n花子「晴れてるけど」\\n田中「……そうだな」', tip: '「言いたいこと」を直接言わせず、「ちぐはぐな行動・回避・代替物」で表現。台詞の裏に別の感情が透けて見えるようにしましょう。' },
        { title: '過去の説明 → 現在のアクションで示す', bad: '田中「俺は昔、親父に捨てられて施設で育ったんだ」', good: '食堂の混雑。全員が椅子を取り合う中、田中だけが隅のパイプ椅子を選ぶ。\\n迷わず。習慣のように。', tip: 'バックストーリーは「説明」ではなく「行動パターンに埋め込む」。セリフの代わりに習慣・反射・空間の取り方で過去を示しましょう。' },
      ]
    },"""
new_subtext = """    'subtext': {
      label: 'サブテキスト',
      tips: [
        { title: '「言いたいこと」を行動・物・沈黙に変換せよ', bad: '田中「私はずっと君のことが好きだったけど、怖くて言えなかったんだ」\n（感情を直接宣言——サブテキストゼロ）', good: '田中「……傘、持ってきた。念のため」\n花子「晴れてるけど」\n田中「……そうだな」\n（傘という物が「好き」を代弁する——観客が自分で気づく）', tip: 'テスト：台詞を消してト書きだけで感情が伝わるか。伝わるなら台詞は不要。伝わらなければト書きを強化。「言いたいこと」≠「言うこと」が感情をつくる。' },
        { title: '「実は〜なんだ」台詞を全て行動に置き換えよ', bad: '田中「俺は昔、親父に捨てられて施設で育ったんだ」\n（過去を台詞で説明——映像的でない）', good: '食堂の混雑。全員が椅子を取り合う中、田中だけが隅のパイプ椅子を選ぶ。\n迷わず。習慣のように。\n（過去が行動パターンに宿っている）', tip: '「実は」「ずっと」「本当は」で始まる台詞は全て説明台詞の候補。その感情・過去を「習慣・反射・物との関係」に変換できるか試せ。' },
      ]
    },"""
patches.append((old_subtext, new_subtext))

# 9. ITEM_DB: visual - expand
old_visual = """    'visual': {
      label: 'ビジュアルストーリーテリング',
      tips: [
        { title: '説明的ト書き → 映像的ト書きへの変換', bad: '田中は悲しんでいる。彼は友達を亡くしたことを後悔している。', good: '田中の机に、飲みかけのコーヒーカップが二つ。\\n片方はずっと冷めたまま。', tip: '感情・状況・バックストーリーを「具体的な物・光・空間」で表現。「キャラが何を感じているか」ではなく「カメラが何を映すか」を書きましょう。' },
        { title: '音と光でシーンを締める', bad: '二人は別れた。田中は一人になった。', good: 'ドアが閉まる。\\n部屋に残るのは、花子の香水の残り香と、止まった時計。', tip: '「聴覚・嗅覚・触覚」の感覚的ディテールを加えると読者の脳内で映像が動き出します。感情に「音・匂い・質感」を対応させましょう。' },
        { title: '冒頭の「つかみ」を映像で設計する', bad: '1 ○オフィス・昼\\n田中、デスクで仕事をしている。電話が鳴る。田中、出る。', good: '1 ○オフィス・昼（退社時刻）\\n全員が帰り支度をする中——田中（32）の机だけ、電気がついている。\\n積み上げられた書類の山。\\n電話が鳴る。\\n田中、三コール待って——出る。「……はい」', tip: '最初の1シーンで「キャラの状況と問題」を映像で示す。見る人が「なぜ？」と思う画を冒頭に置く。説明セリフは不要——画が全てを語る。' },
      ]
    },"""
new_visual = """    'visual': {
      label: 'ビジュアルストーリーテリング',
      tips: [
        { title: '感情語を全て削除して映像だけで書き直せ', bad: '田中は悲しんでいる。彼は友達を亡くしたことを後悔している。\n（感情語に依存——映像にならない）', good: '田中の机に、飲みかけのコーヒーカップが二つ。\n片方はずっと冷めたまま。田中、それを手に取る——置けない。\n（物が悲しみを語る）', tip: '練習：「悲しい・嬉しい・怒る・辛い」を全削除して書き直す。書き直せるなら元の版は映像的でなかった証拠。' },
        { title: '五感（特に聴覚・嗅覚）でシーンを締めよ', bad: '二人は別れた。田中は一人になった。\n（状況の説明——感覚情報がない）', good: 'ドアが閉まる。\n部屋に残るのは、花子の香水の残り香——と、止まった時計の音が、しない。\n（聴覚×嗅覚×視覚の融合で喪失を表現）', tip: '映像だけでなく「音・匂い・温度・質感」を1シーンに1つ加えると、読者の脳内でシーンが立体的になります。' },
      ]
    },"""
patches.append((old_visual, new_visual))

# 10. ITEM_DB: want/need — richer tips
old_want_need = """    'protag-want-need': {
      label: 'Want/Need設計',
      tips: [
        { title: 'Want（外的目標）とNeed（内的必要性）を分離して設計する', bad: '（主人公は事件を解決したいだけで、内面的な成長がない）', good: 'Want（外的目標）: 失踪した娘を探し出す\\nNeed（内的必要性）: 娘に謝れなかった過去を受け入れる\\n→ 物語の終わりに、Wantを達成しても、Needを満たさなければ真の解決にならないことが明らかになる', tip: 'WantとNeedは「表の物語」と「裏の物語」を作ります。Wantが叶う/叶わないに関わらず、Needに向き合う瞬間がクライマックスになるよう設計しましょう。' },
        { title: 'WantとNeedを「対立」させてドラマを深める', bad: '田中「証拠を見つけたい（Want）」——証拠を見つけることで成長もする。矛盾がない。', good: 'Want（外的目標）: 犯人を暴いて正義を実現したい\\nNeed（内的必要性）: 復讐心ではなく真実のために戦う自分になること\\n→ WantとNeedが対立している——犯人を暴こうとするほど、「正義」ではなく「復讐」になっていく。\\nクライマックスで「WantよりNeedを選ぶ」かどうかが問われる。', tip: 'WantとNeedが同じ方向を向いていると物語に葛藤が生まれません。WantとNeedを「対立する方向」に設計し、どちらを選ぶかがクライマックスになるよう作りましょう。' },
      ]
    },"""
new_want_need = """    'protag-want-need': {
      label: 'Want/Need設計',
      tips: [
        { title: 'Want（外的目標）をシーン1で行動で見せよ', bad: '（冒頭で主人公が独白）「私の夢は作家になることだ。ずっとそれだけを目指してきた。」\n（Wantを言葉で説明——説明台詞の典型）', good: '（深夜: シーン1）\n主人公はカーテンを閉め、原稿用紙に向かう。\n廊下から「もう寝なさい」——構わず書き続ける。\n→ Wantが行動で伝わる', tip: 'Want設計3点確認：①行動で表現されているか ②Needと対立しているか ③クライマックスでWant vs Needの選択が問われるか。全てYesなら強い設計。' },
        { title: 'WantとNeedを「衝突」させよ——葛藤がドラマをつくる', bad: 'Want: 出世したい、Need: 家族を大切にしたい——両方が自然に達成される。\n→ 葛藤なし、ドラマなし', good: 'Want: 単身赴任で出世（今しかないチャンス）\nNeed: 娘との時間（今しかできない）\n→ クライマックス: 赴任辞令の夜、娘「パパ、行かないで」\n→ WantかNeedか——この選択が物語の核心', tip: 'WantとNeedが「同じ方向」を向いていると葛藤が生まれない。「WantとNeedが対立し、クライマックスでどちらを選ぶか問われる」設計が理想形。' },
      ]
    },"""
patches.append((old_want_need, new_want_need))

# Count and apply
applied = 0
skipped = 0
for old, new in patches:
    if old in code:
        code = code.replace(old, new, 1)
        applied += 1
    else:
        print(f'[SKIP] {repr(old[:70])}')
        skipped += 1

with open('/home/user/webapp/public/static/app.js', 'w', encoding='utf-8') as f:
    f.write(code)

print(f'\nEngine patch complete: applied={applied}, skipped={skipped}')
print(f'Size: {orig_len:,} → {len(code):,} (+{len(code)-orig_len:,})')
