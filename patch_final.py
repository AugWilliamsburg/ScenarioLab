#!/usr/bin/env python3
"""Final targeted patches using exact line content"""

with open('/home/user/webapp/public/static/app.js', 'r', encoding='utf-8') as f:
    code = f.read()

orig = len(code)
count = 0

def p(old, new):
    global code, count
    if old in code:
        code = code.replace(old, new, 1)
        count += 1
    else:
        print(f'[SKIP] {repr(old[:60])}')

# 1. セリフ長ノート改善
p(
    "    const noteObjDlgLen = { type: 'warn', text: 'セリフ長：平均' + Math.round(avgDialogueLen) + '字と長めです。実際の会話は10〜30字程度が自然です。長いセリフは「演説」に見えます。1セリフ60字超えたら分割か削除を検討してください。' };",
    "    const noteObjDlgLen = { type: 'warn', text: 'セリフ長：平均' + Math.round(avgDialogueLen) + '字（長め）。自然な会話は10〜35字。長いセリフは「演説・説明」に見えます。ぜひこ：60字超のセリフを半分に切ってみる。小さくできるほど原文が冗長だった証拠です。' };"
)

# 2. 対話ダイナミクス警告ノートに引用追加
p(
    """  if (scores['dialogue-dynamics'] <= 2 && totalDialogueLines >= 4) {
    notes.push({ type: 'warn', text: '対話の引力：キャラクター間の会話に緊張感・目的の衝突が不足しています。各キャラが「異なる目的・情報・感情」を持って同じシーンに入場する設計にしてください。' });
  }""",
    """  if (scores['dialogue-dynamics'] <= 2 && totalDialogueLines >= 4) {
    const blandKws = ['なるほど', 'そうですね', 'わかりました', 'そうか', 'お疲れさま'];
    const blandDlg = dialogueTexts.find(d => blandKws.some(k => d.includes(k)) && d.length < 30);
    const dynWarnNote = { type: 'warn', text: '対話の引力：会話に緊張感・欲求の衝突が不足しています。設計問い：「Aは何を得たがっているか」「Bは何を隠したがっているか」——両方答えられない会話はインフォ交換です。各キャラに「相手と環境の中で追いかける欲求」を設計してください。' };
    if (blandDlg) dynWarnNote.quote = '「' + blandDlg + '」\n→ この交換に「追う欲求」を追加してください';
    notes.push(dynWarnNote);
  }"""
)

# 3. 感情インパクト中程度ノートを改善
p(
    "感情インパクト：感情キーワード密度' + Math.round(emotionDensity*100) + '%（やや低め）。脚本中の感情的ピーク（クライマックス）を強化してください。登場人物の内的葛藤を行動で示すシーンを1つ加えるだけで劇的に変わります。",
    "感情インパクト：感情密度' + Math.round(emotionDensity*100) + '%（もう一歩）。クライマックスで「主人公が最も傷つく瞬間」か「最も勇気を出す瞬間」のどちらかを行動・沈黙・物で表現するシーンを1つ設けてください。感情は語らせず「観客自身が気づく」空間に。"
)

# 4. Notes container wrapper class  
p(
    '            <div style="padding:12px 16px;display:flex;flex-direction:column;gap:4px">',
    '            <div class="sr-notes-container">'
)

# 5. Tutor panel intro text improve
p(
    """          <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;line-height:1.7;padding:9px 12px;background:var(--bg-subtle);border-radius:8px;border-left:3px solid var(--fuji)">
            <i class="fas fa-circle-info" style="margin-right:4px;color:var(--fuji)"></i>
            最低スコア項目を自動選択し、<strong style="color:var(--text-primary)">脚本中の実際の問題パターン（Before）</strong>と<strong style="color:var(--text-primary)">プロ水準の書き直し例（After）</strong>を提示します。まず1項目だけ集中して改稿し、再採点してください。
          </div>""",
    """          <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;line-height:1.7;padding:9px 12px;background:var(--bg-subtle);border-radius:8px;border-left:3px solid var(--fuji)">
            <i class="fas fa-circle-info" style="margin-right:4px;color:var(--fuji)"></i>
            最低スコア項目を自動選択し、<strong style="color:var(--text-primary)">脚本中の実際の問題パターン（Before）</strong>と<strong style="color:var(--text-primary)">プロ水準の書き直し例（After）</strong>を提示します。<strong>1回の改稿で1項目だけ集中</strong>して改稿し、再採点してください。
          </div>"""
)

print(f'Final patch: applied={count}, size {orig:,} → {len(code):,} (+{len(code)-orig:,})')

with open('/home/user/webapp/public/static/app.js', 'w', encoding='utf-8') as f:
    f.write(code)
