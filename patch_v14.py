#!/usr/bin/env python3
"""
Scenario Lab v14 patch — comprehensive overhaul of evaluation OS
Changes:
1. Script type input field (drama / film / stage / web / competition free) with tailored weight adjustments
2. Expanded mode-aware scoring: 5 modes including new "pro-drama" and "film" modes
3. New scoring items: obstacle strength C-19, tempo/rhythm C-20, commercial fit C-21 (fully integrated)
4. Deeper note generation with exact script quotes for ALL new axes
5. Annotated script: full-text analysis with sentence-level badges + detailed tooltip comments
6. Export: all new axes, script type, judge comments
7. Enhanced result banner: script type badge, new axes grid
8. Judge comment system: 5 judges, script-type-aware comments
9. CSS for new UI components
"""
import re, sys

SRC = 'public/static/app.js'
with open(SRC, encoding='utf-8') as f:
    code = f.read()

orig_len = len(code)

# ─────────────────────────────────────────────────────────
# 1. CSS additions for v14
# ─────────────────────────────────────────────────────────
CSS_V14 = """
/* ══════════ v14 CSS ══════════ */
.sr-script-type-bar{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-subtle);border-radius:10px;border:1px solid var(--border);margin-bottom:10px;flex-wrap:wrap}
.sr-script-type-btn{display:flex;align-items:center;gap:4px;padding:4px 10px;border:1px solid var(--border);border-radius:20px;font-size:10.5px;font-weight:600;cursor:pointer;background:#fff;color:var(--text-secondary);transition:all .15s;white-space:nowrap}
.sr-script-type-btn.active{background:var(--fuji);color:#fff;border-color:var(--fuji);box-shadow:0 2px 8px rgba(107,70,193,.35)}
.sr-new-axes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-top:10px}
.sr-axis-card{background:rgba(255,255,255,.05);border-radius:8px;padding:8px 10px;border:1px solid rgba(255,255,255,.06)}
.sr-axis-label{font-size:9px;color:rgba(255,255,255,.45);font-weight:600;margin-bottom:4px}
.sr-axis-val{font-size:16px;font-weight:900;line-height:1}
.sr-axis-bar{height:3px;background:rgba(255,255,255,.08);border-radius:2px;margin-top:4px}
.sr-ann-line2{display:flex;align-items:flex-start;gap:6px;padding:2px 0;min-height:20px;border-radius:4px;transition:background .1s}
.sr-ann-line2:hover{background:rgba(107,70,193,.06)}
.sr-ann-lnum2{font-size:9px;color:var(--text-muted);min-width:34px;text-align:right;padding-top:2px;flex-shrink:0;font-family:monospace;opacity:.6}
.sr-ann-text2{flex:1;font-size:12px;line-height:1.75;font-family:'Noto Serif JP',serif;white-space:pre-wrap;word-break:break-all}
.sr-ann-text2.scene-line{color:var(--fuji);font-weight:700;font-size:11px}
.sr-ann-text2.char-line{color:#d97706;font-weight:700;font-size:11px}
.sr-ann-text2.dialogue-line{color:var(--text-primary)}
.sr-ann-text2.direction-line{color:var(--text-secondary);font-size:11.5px}
.sr-ann-badges{display:flex;flex-wrap:wrap;gap:3px;flex-shrink:0;align-items:flex-start;padding-top:2px;max-width:180px}
.sr-ann-badge{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:700;padding:1px 6px;border-radius:10px;white-space:nowrap;cursor:default}
.sr-ann-badge.bad{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
.sr-ann-badge.good{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0}
.sr-ann-badge.warn{background:#fffbeb;color:#d97706;border:1px solid #fde68a}
.sr-ann-badge.info{background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe}
.sr-ann-comment-popup{display:none;position:absolute;z-index:200;background:#1e293b;color:#e2e8f0;border-radius:8px;padding:8px 10px;font-size:10.5px;line-height:1.7;max-width:280px;box-shadow:0 8px 24px rgba(0,0,0,.5);pointer-events:none;white-space:pre-wrap}
.sr-type-badge{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;background:rgba(107,70,193,.15);color:var(--fuji);border:1px solid rgba(107,70,193,.25)}
"""

# Insert CSS before closing </style> or before first function
CSS_MARKER = '/* ══════════ v13 CSS ══════════ */'
if CSS_MARKER in code:
    code = code.replace(CSS_MARKER, CSS_MARKER + '\n' + CSS_V14, 1)
else:
    # Insert near top after existing CSS block
    code = code.replace('/* ══════════ v12 CSS ══════════ */', '/* ══════════ v12 CSS ══════════ */\n' + CSS_V14, 1)
    if CSS_V14 not in code:
        # Fallback: insert after first style block marker
        fallback_marker = '.sr-engine-badge'
        if fallback_marker in code:
            idx = code.find(fallback_marker)
            code = code[:idx] + CSS_V14 + '\n' + code[idx:]

# ─────────────────────────────────────────────────────────
# 2. Add script type selector in session UI (after mode strip)
# ─────────────────────────────────────────────────────────
OLD_MODE_DESC_END = """      <div class=\"sr-mode-desc\" id=\"sr-mode-desc-${s.id}\">${{
        contest:    '<i class=\"fas fa-trophy\" style=\"color:var(--fuji);margin-right:4px\"></i><strong>コンクール審査モード</strong> — NHK・城戸賞・テレビ大賞基準。審査員視点で採点。コンクール通過力・感情インパクト・作家性を重視。',
        adaptation: '<i class=\"fas fa-video\" style=\"color:#2563eb;margin-right:4px\"></i><strong>映像化適合モード</strong> — 映像化・ドラマ化・映画化の実現可能性を重視。制作費効率・ロケ多様性・VFX依存度・放送枠適合を詳細評価。',
        school:     '<i class=\"fas fa-graduation-cap\" style=\"color:#16a34a;margin-right:4px\"></i><strong>シナリオ学校添削モード</strong> — 基礎技術・フォーマット・構成の正確さを丁寧に指摘。具体的な改稿提案と模範例付き。',
        general:    '<i class=\"fas fa-chart-bar\" style=\"color:#ca8a04;margin-right:4px\"></i><strong>総合評価モード</strong> — コンクール・映像化・教育的観点を全方位で評価。採点ヒストリー・比較分析付き。',
      }[(s.evalMode||'contest')]}</div>"""

NEW_MODE_DESC_AND_TYPE = """      <div class=\"sr-mode-desc\" id=\"sr-mode-desc-${s.id}\">${{
        contest:    '<i class=\"fas fa-trophy\" style=\"color:var(--fuji);margin-right:4px\"></i><strong>コンクール審査モード</strong> — NHK・城戸賞・テレビ大賞基準。審査員視点で採点。コンクール通過力・感情インパクト・作家性を重視。',
        adaptation: '<i class=\"fas fa-video\" style=\"color:#2563eb;margin-right:4px\"></i><strong>映像化適合モード</strong> — 映像化・ドラマ化・映画化の実現可能性を重視。制作費効率・ロケ多様性・VFX依存度・放送枠適合を詳細評価。',
        school:     '<i class=\"fas fa-graduation-cap\" style=\"color:#16a34a;margin-right:4px\"></i><strong>シナリオ学校添削モード</strong> — 基礎技術・フォーマット・構成の正確さを丁寧に指摘。具体的な改稿提案と模範例付き。',
        general:    '<i class=\"fas fa-chart-bar\" style=\"color:#ca8a04;margin-right:4px\"></i><strong>総合評価モード</strong> — コンクール・映像化・教育的観点を全方位で評価。採点ヒストリー・比較分析付き。',
      }[(s.evalMode||'contest')]}</div>

      <!-- 脚本タイプ選択 (v14) -->
      <div class=\"sr-script-type-bar\">
        <span style=\"font-size:10.5px;font-weight:700;color:var(--text-muted);white-space:nowrap\"><i class=\"fas fa-tags\" style=\"margin-right:4px\"></i>脚本タイプ:</span>
        ${[
          { id:'tv-drama',     icon:'fa-tv',         label:'TVドラマ' },
          { id:'film',         icon:'fa-film',        label:'映画' },
          { id:'stage',        icon:'fa-masks-theater',label:'舞台' },
          { id:'web',          icon:'fa-globe',       label:'WEB/配信' },
          { id:'competition',  icon:'fa-award',       label:'コンクール自由' },
          { id:'short',        icon:'fa-stopwatch',   label:'短編(<30分)' },
        ].map(t => `<button class=\"sr-script-type-btn ${(s.scriptType||'tv-drama')===t.id?'active':''}\" onclick=\"staffRoomSetScriptType('${s.id}','${t.id}',this)\">
          <i class=\"fas ${t.icon}\" style=\"font-size:9px\"></i>${t.label}
        </button>`).join('')}
      </div>"""

if OLD_MODE_DESC_END in code:
    code = code.replace(OLD_MODE_DESC_END, NEW_MODE_DESC_AND_TYPE, 1)
    print("[OK] Added script type selector UI")
else:
    print("[WARN] Script type selector insertion point not found - searching alternative...")

# ─────────────────────────────────────────────────────────
# 3. Add staffRoomSetScriptType function after staffRoomSetMode
# ─────────────────────────────────────────────────────────
OLD_SET_MODE_END = """  toast(`評価モードを「${btn.textContent.trim()}」に切り替えました`, 'info');
}"""

NEW_SET_MODE_AND_TYPE = """  toast(`評価モードを「${btn.textContent.trim()}」に切り替えました`, 'info');
}

function staffRoomSetScriptType(sessionId, type, btn) {
  const sessions = DB.get('staffroom_sessions', []);
  const idx = sessions.findIndex(s => s.id === sessionId);
  if (idx === -1) return;
  sessions[idx].scriptType = type;
  sessions[idx].updatedAt = Date.now();
  DB.set('staffroom_sessions', sessions);
  // Update UI
  const bar = btn.closest('.sr-script-type-bar');
  if (bar) bar.querySelectorAll('.sr-script-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const typeLabels = {
    'tv-drama': 'TVドラマ', 'film': '映画', 'stage': '舞台',
    'web': 'WEB/配信', 'competition': 'コンクール自由', 'short': '短編',
  };
  toast(`脚本タイプを「${typeLabels[type] || type}」に設定しました`, 'info');
}"""

if OLD_SET_MODE_END in code:
    code = code.replace(OLD_SET_MODE_END, NEW_SET_MODE_AND_TYPE, 1)
    print("[OK] Added staffRoomSetScriptType function")
else:
    print("[WARN] staffRoomSetMode end not found")

# ─────────────────────────────────────────────────────────
# 4. Pass scriptType to staffRoomRunAnalysis
# ─────────────────────────────────────────────────────────
OLD_ANALYSIS_CALL = "const result = staffRoomRunAnalysis(text, s.evalMode || 'contest');"
NEW_ANALYSIS_CALL = "const result = staffRoomRunAnalysis(text, s.evalMode || 'contest', s.scriptType || 'tv-drama');"

if OLD_ANALYSIS_CALL in code:
    code = code.replace(OLD_ANALYSIS_CALL, NEW_ANALYSIS_CALL, 1)
    print("[OK] Passed scriptType to staffRoomRunAnalysis")
else:
    print("[WARN] Analysis call not found")

# ─────────────────────────────────────────────────────────
# 5. Update staffRoomRunAnalysis signature to accept scriptType
# ─────────────────────────────────────────────────────────
OLD_FN_SIG = "function staffRoomRunAnalysis(text, evalMode) {"
NEW_FN_SIG = """function staffRoomRunAnalysis(text, evalMode, scriptType) {"""

if OLD_FN_SIG in code:
    code = code.replace(OLD_FN_SIG, NEW_FN_SIG, 1)
    print("[OK] Updated staffRoomRunAnalysis signature")

OLD_MODE_LINE = "  const mode = evalMode || 'contest';"
NEW_MODE_LINE = """  const mode = evalMode || 'contest';
  const sType = scriptType || 'tv-drama';
  // Script-type weight multipliers: adjust key axes based on target format
  const scriptTypeWeights = {
    'tv-drama':    { 'emotional-impact':1.7, 'dialogue-dynamics':1.3, 'char-arc':1.2, 'subtext':1.1, 'pacing':1.2, 'commercial-fit':1.2 },
    'film':        { 'emotional-impact':1.8, 'visual':1.4, 'authorial-voice':1.4, 'theme-clarity':1.3, 'originality':1.3, 'subtext':1.2 },
    'stage':       { 'dialogue-dynamics':1.6, 'subtext':1.4, 'voice':1.4, 'char-arc':1.3, 'production-viability':0.7 },
    'web':         { 'pacing':1.5, 'three-act':1.3, 'emotional-impact':1.3, 'originality':1.2, 'production-viability':1.2 },
    'competition': { 'emotional-impact':1.8, 'authorial-voice':1.5, 'originality':1.5, 'theme-clarity':1.4, 'subtext':1.2 },
    'short':       { 'pacing':1.6, 'emotional-impact':1.5, 'three-act':1.4, 'subtext':1.2 },
  };
  const stWeights = scriptTypeWeights[sType] || {};"""

if OLD_MODE_LINE in code:
    code = code.replace(OLD_MODE_LINE, NEW_MODE_LINE, 1)
    print("[OK] Added scriptType weight system")

# ─────────────────────────────────────────────────────────
# 6. Add C-19 (Obstacle Strength), C-20 (Tempo/Rhythm), C-21 (Commercial Fit)
#    as formal scored items right after C-18
# ─────────────────────────────────────────────────────────
OLD_RUBRIC_MAP = """  const RUBRIC_MAP_ANALYSIS = {
    'structure': ['three-act', 'plot-logic', 'pacing'],
    'character': ['protag-want-need', 'char-arc', 'char-unique'],
    'dialogue':  ['subtext', 'voice', 'naturalness', 'dialogue-dynamics'],
    'direction': ['visual', 'direction-clarity'],
    'theme':     ['theme-clarity', 'originality', 'authorial-voice'],
    'impact':    ['emotional-impact', 'format-correctness'],
    'production': ['production-viability'],
  };"""

NEW_RUBRIC_MAP = """  // ── C-19: 障壁強度（対立・葛藤の密度と多様性）
  {
    let pts = 1;
    const reasons = [], issues = [];
    const obstKws = ['だめだ','無理だ','できない','阻む','拒否','拒絶','邪魔','妨げ','追い込む','逃げ場','罠','裏切','誤解','嘘','秘密','危機','絶体絶命','どん底','失敗','挫折','壊れ','奪われ','失って','諦め','限界','脅迫','裏切り','妨害','圧力','制止','強制','奪う','奪われ','抵抗'];
    const obstCount19 = obstKws.reduce((n,kw)=>n+(text.match(new RegExp(kw,'g'))||[]).length,0);
    const obstPerScene = sceneCount > 0 ? obstCount19 / sceneCount : obstCount19;
    if (obstCount19 >= 10) { pts += 2; reasons.push('障壁・葛藤キーワード' + obstCount19 + '件（高密度の対立）'); }
    else if (obstCount19 >= 5) { pts++; reasons.push('障壁・葛藤要素' + obstCount19 + '件'); }
    else if (obstCount19 >= 2) { reasons.push('障壁要素あり（' + obstCount19 + '件）'); }
    else { issues.push('対立・葛藤が弱い（「何が主人公を阻んでいるか」が不明瞭）'); }
    if (obstPerScene >= 2) { pts++; reasons.push('シーン当たりの障壁密度が高い（' + Math.round(obstPerScene*10)/10 + '/シーン）'); }
    if (conflictIntensity >= 5) { pts++; reasons.push('多様な葛藤要素（' + conflictIntensity + '種類）が物語に厚みを与えている'); }
    if (obstCount19 < 2) { issues.push('より強力な障壁を設計：外的障壁（敵・環境）× 内的障壁（恐れ・誤信）を組み合わせる'); }
    scores['obstacle-strength'] = Math.min(5, Math.max(1, pts));
    const obstQuote = (() => {
      for (const l of [...nonEmpty]) {
        if (obstKws.some(k=>l.includes(k)) && l.length >= 5 && l.length <= 80) return l;
      }
      return null;
    })();
    itemDetails['obstacle-strength'] = { reasons, issues, quote: obstQuote };
  }

  // ── C-20: テンポ・リズム（映像的リズム感・緩急の精度）
  {
    let pts = 2;
    const reasons = [], issues = [];
    const avgSceneLenC20 = sceneCount > 0 ? Math.round(totalLines / sceneCount) : totalLines;
    const shortActRatioC20 = actionLines.length > 0 ? shortActionCount / actionLines.length : 0;
    if (avgSceneLenC20 < 15) { pts++; reasons.push('シーン平均' + avgSceneLenC20 + '行（テンポが速い）'); }
    else if (avgSceneLenC20 < 30) { pts++; reasons.push('シーン平均' + avgSceneLenC20 + '行（適切なテンポ）'); }
    else if (avgSceneLenC20 > 50) { pts = Math.max(1, pts-1); issues.push('シーン平均' + avgSceneLenC20 + '行（重い）'); }
    if (shortActRatioC20 >= 0.5) { pts++; reasons.push('短いト書き（40字以内）が' + Math.round(shortActRatioC20*100) + '%（映像的リズム）'); }
    if (dialogueLenStdDev >= 20) { pts++; reasons.push('セリフ長の多様性（σ=' + Math.round(dialogueLenStdDev) + '）——単調でない'); }
    else if (dialogueLenStdDev < 5 && totalDialogueLines >= 4) { issues.push('セリフ長の変化が少ない（σ=' + Math.round(dialogueLenStdDev) + '）——単調に感じられる'); }
    if (sceneCount >= 8) { reasons.push('シーン数' + sceneCount + '（豊富なカット数・テンポ感あり）'); }
    scores['tempo-rhythm'] = Math.min(5, Math.max(1, pts));
    const tempoQuote = (() => {
      // 最長シーンを引用（テンポ問題）
      if (avgSceneLenC20 > 40 && sceneLines.length > 0) {
        const lsi = sceneLengths.indexOf(Math.max(...sceneLengths));
        return sceneLines[lsi] ? sceneLines[lsi] + ' [' + Math.max(...sceneLengths) + '行 — 圧縮推奨]' : null;
      }
      return null;
    })();
    itemDetails['tempo-rhythm'] = { reasons, issues, quote: tempoQuote };
  }

  // ── C-21: 商業適合度（ターゲット・市場性・放送実現性）
  {
    let pts = 2;
    const reasons = [], issues = [];
    const popGenres = ['ミステリー','サスペンス','恋愛','ヒューマン','家族','青春','コメディ','医療','法廷','刑事'];
    const genreHitC21 = popGenres.filter(g => genreStr.includes(g)).length;
    if (genreHitC21 >= 2) { pts++; reasons.push('人気ジャンル複合（' + genreStr + '）——高い市場性'); }
    else if (genreHitC21 >= 1) { pts++; reasons.push('認知された人気ジャンル（' + genreStr + '）——市場性あり'); }
    else if (detectedGenres.length === 0) { issues.push('ジャンルが不明確——ターゲット視聴者の設定を'); }
    const castSize = uniqueChars;
    if (castSize >= 2 && castSize <= 6) { pts++; reasons.push('キャスト人数' + castSize + '人（コンパクト・予算収まりやすい）'); }
    else if (castSize > 10) { pts = Math.max(1, pts-1); issues.push('登場人物' + castSize + '人（多い——予算・ロケ管理が難しい）'); }
    if (indoorScenes > outdoorScenes * 2 || sceneCount === 0) { reasons.push('屋内シーン中心（スタジオ撮影向き・コスト効率良好）'); }
    if (productionScalePractical) { pts++; reasons.push('日常的・室内舞台中心（放送ドラマ向き）'); }
    if (productionScaleHeavy) { pts = Math.max(1, pts-1); issues.push('大規模VFX・ロケ要素が多い（制作費増大リスク）'); }
    if (sType === 'tv-drama' || sType === 'web') { reasons.push('ターゲット媒体（' + (sType==='tv-drama'?'TV':'WEB/配信') + '）に合った構成'); }
    scores['commercial-fit'] = Math.min(5, Math.max(1, pts));
    itemDetails['commercial-fit'] = { reasons, issues, quote: null };
  }

  const RUBRIC_MAP_ANALYSIS = {
    'structure': ['three-act', 'plot-logic', 'pacing'],
    'character': ['protag-want-need', 'char-arc', 'char-unique'],
    'dialogue':  ['subtext', 'voice', 'naturalness', 'dialogue-dynamics'],
    'direction': ['visual', 'direction-clarity'],
    'theme':     ['theme-clarity', 'originality', 'authorial-voice'],
    'impact':    ['emotional-impact', 'format-correctness'],
    'production': ['production-viability', 'obstacle-strength', 'tempo-rhythm', 'commercial-fit'],
  };"""

if OLD_RUBRIC_MAP in code:
    code = code.replace(OLD_RUBRIC_MAP, NEW_RUBRIC_MAP, 1)
    print("[OK] Added C-19/C-20/C-21 scoring items and updated RUBRIC_MAP")
else:
    print("[WARN] RUBRIC_MAP insertion point not found")

# ─────────────────────────────────────────────────────────
# 7. Update weight map to include new items + scriptType weights
# ─────────────────────────────────────────────────────────
OLD_WEIGHT_MAP = """  const weightMap = {
    'emotional-impact': 1.6,   // 最重要：審査員が最も重視
    'theme-clarity': 1.3,       // 作品の核心
    'authorial-voice': 1.2,     // 作家性（コンクールでの差別化）
    'three-act': 1.15,           // 構成の土台
    'protag-want-need': 1.15,   // キャラの動機
    'char-arc': 1.1,            // 変化・成長
    'subtext': 1.1,             // 説明台詞vs行間
    'originality': 1.1,         // 独自性
    'production-viability': 1.0, // 映像化適性（新軸）
    'dialogue-dynamics': 1.0,   // 対話ダイナミクス（新軸）
  };"""

NEW_WEIGHT_MAP = """  const baseWeightMap = {
    'emotional-impact': 1.6,   // 最重要：審査員が最も重視
    'theme-clarity': 1.3,       // 作品の核心
    'authorial-voice': 1.2,     // 作家性（コンクールでの差別化）
    'three-act': 1.15,           // 構成の土台
    'protag-want-need': 1.15,   // キャラの動機
    'char-arc': 1.1,            // 変化・成長
    'subtext': 1.1,             // 説明台詞vs行間
    'originality': 1.1,         // 独自性
    'production-viability': 1.0, // 映像化適性
    'dialogue-dynamics': 1.0,   // 対話ダイナミクス
    'obstacle-strength': 1.05,  // 障壁強度（v14新軸）
    'tempo-rhythm': 1.0,        // テンポ・リズム（v14新軸）
    'commercial-fit': 0.9,      // 商業適合度（v14新軸）
  };
  // Apply script-type weight multipliers
  const weightMap = Object.fromEntries(
    Object.entries(baseWeightMap).map(([k, v]) => [k, v * (stWeights[k] || 1.0)])
  );"""

if OLD_WEIGHT_MAP in code:
    code = code.replace(OLD_WEIGHT_MAP, NEW_WEIGHT_MAP, 1)
    print("[OK] Updated weight map with scriptType multipliers")
else:
    print("[WARN] Weight map not found")

# ─────────────────────────────────────────────────────────
# 8. Add detailed notes for C-19/C-20/C-21 after the existing notes section
# ─────────────────────────────────────────────────────────
OLD_PERF_NOTE_END = """  // ── ペーシング診断（v12拡張: 最長シーンの実際の内容を引用）
  if (scores['pacing'] <= 2 && sceneCount >= 2) {"""

NEW_OBSTACLE_NOTES = """  // ── 障壁強度診断（v14新軸）
  if (scores['obstacle-strength'] <= 2) {
    // 主人公の台詞から「諦め」「できない」「無理」を探し具体的に引用
    const weakObstKws = ['できない', 'どうしよう', 'むり', '無理', '諦め', 'もうだめ', '助けて', '困った', '難しい'];
    const strongObstKws = ['裏切', '罠', '追い込', '逃げ場', '嘘', '秘密', '奪われ', '壊れ', '崩れ', '絶望', '限界', '死', '敵', '邪魔'];
    const weakFound = nonEmpty.find(l => weakObstKws.some(k=>l.includes(k)) && l.length >= 3 && l.length <= 70);
    const strongMissing = strongObstKws.filter(k=>!text.includes(k));
    const obstacleMainChar = mainCharName || '主人公';
    const obstBadNote = {
      type: 'bad',
      text: '障壁強度：主人公を阻む力が弱い。ドラマは「欲求×障壁の衝突」で生まれます。' +
        '\\n障壁の3種類を揃えてください：' +
        '\\n① 外的障壁：別のキャラクター・組織・環境（嘘・秘密・裏切り・ルール）' +
        '\\n② 内的障壁：主人公自身の恐れ・欠点・誤信（Want≠Needの矛盾）' +
        '\\n③ 状況的障壁：時間・場所・情報の非対称（知らない・気づけない）' +
        '\\n——3種が重なるほど物語の密度が上がります。'
    };
    if (weakFound) {
      obstBadNote.quote = '主人公の台詞（弱い障壁）:\\n' +
        (dialogueTexts.includes(weakFound) ? '「' + weakFound + '」' : weakFound) +
        '\\n\\n↳ この「困難」をさらに強化する改稿例:' +
        '\\n  外的: ' + obstacleMainChar + 'の前に「協力者が裏切る」シーンを追加' +
        '\\n  内的: ' + obstacleMainChar + 'が「諦めようとする」瞬間と「それでも進む」決断を対置' +
        '\\n  状況: 重要な情報が「最後の最後まで隠される」構造に改稿';
    } else {
      obstBadNote.quote = '（障壁を示す明確な台詞・ト書きが検出されません）' +
        '\\n\\n↳ 設計チェック:' +
        '\\n  各シーンで「このシーン後に主人公の状況が悪化したか？」を問いかける' +
        '\\n  悪化していなければ、そのシーンに障壁を追加するか削除を検討する';
    }
    notes.push(obstBadNote);
  } else if (scores['obstacle-strength'] >= 4) {
    const obstGoodNote = {
      type: 'good',
      text: '障壁強度：主人公を阻む力が豊富に設計されています。' +
        (conflictIntensity >= 5 ? '多様な葛藤要素（' + conflictIntensity + '種類）が物語の密度を高めています。' : '') +
        'Want（欲求）とObstacle（障壁）が拮抗するほど、ドラマの引力が生まれます。'
    };
    if (itemDetails['obstacle-strength'] && itemDetails['obstacle-strength'].quote) {
      obstGoodNote.quote = itemDetails['obstacle-strength'].quote + '\\n↑ 主人公を阻む力の好例';
    }
    notes.push(obstGoodNote);
  }

  // ── テンポ・リズム診断（v14新軸）
  if (scores['tempo-rhythm'] <= 2) {
    const avgSceneLenTR = sceneCount > 0 ? Math.round(totalLines / sceneCount) : totalLines;
    const tempoNote = {
      type: 'warn',
      text: 'テンポ・リズム：映像的なリズム感に課題があります。' +
        (avgSceneLenTR > 40 ? 'シーン平均' + avgSceneLenTR + '行は長すぎます（目安: 15〜25行）。' : '') +
        (shortActionCount / Math.max(1, actionLines.length) < 0.3 ? '短いト書き（30字以内）が少ない——映像は「短い行の連続」でリズムを作ります。' : '') +
        '\\nリズム改善の3手順:' +
        '\\n① シーンを半分に切る（入り方を遅らせず、出口を早める）' +
        '\\n② ト書きを1行=1動作に分解する（改行でテンポを作る）' +
        '\\n③ セリフと沈黙を交互に配置し、「(間)」を意図的に配置する'
    };
    if (sceneLines.length > 0) {
      const longestIdx = sceneLengths.length > 0 ? sceneLengths.indexOf(Math.max(...sceneLengths)) : -1;
      if (longestIdx >= 0 && sceneLines[longestIdx]) {
        const lsLabel = sceneLines[longestIdx];
        const lsLen = sceneLengths[longestIdx];
        const lsLineIdx = nonEmpty.indexOf(lsLabel);
        const excerpt = lsLineIdx >= 0 ? nonEmpty.slice(lsLineIdx, Math.min(lsLineIdx+5, nonEmpty.length)).join('\\n') : lsLabel;
        tempoNote.quote = '最長シーン（' + lsLen + '行）:\\n' +
          (excerpt.length > 200 ? excerpt.slice(0,200)+'…' : excerpt) +
          '\\n\\n↳ このシーンを2つに分割 or 15行以内に圧縮してください。' +
          '\\n  「入り口を遅らせず、出口を早める」——シーンの最後2行をカットするだけでリズムが上がります。';
      }
    }
    notes.push(tempoNote);
  } else if (scores['tempo-rhythm'] >= 4) {
    const tempoGoodNote = {
      type: 'good',
      text: 'テンポ・リズム：映像的なリズム感が優れています。' +
        (sceneCount >= 8 ? sceneCount + 'シーン構成で豊富なカット感があります。' : '') +
        (shortActionCount / Math.max(1, actionLines.length) >= 0.5 ? '短いト書きの連続がリズムを生んでいます。' : '') +
        (dialogueLenStdDev >= 20 ? 'セリフ長の多様性（σ=' + Math.round(dialogueLenStdDev) + '）が読者を引きつけます。' : '')
    };
    if (actionLines.length > 0) {
      const shortActions = actionLines.filter(l=>l.length>3 && l.length<=25);
      if (shortActions.length > 2) {
        tempoGoodNote.quote = shortActions.slice(0,3).join('\\n') + '\\n↑ 短いト書きの連続がリズムを作る好例';
      }
    }
    notes.push(tempoGoodNote);
  }

  // ── 商業適合度診断（v14新軸）
  if (scores['commercial-fit'] <= 2 && (mode === 'adaptation' || mode === 'general')) {
    const commNote = {
      type: 'warn',
      text: '商業適合度：放送・配信・上映の企画通過に課題があります。' +
        (uniqueChars > 8 ? '登場人物が' + uniqueChars + '人（多い）——5〜6人に絞ることで予算・場面管理がしやすくなります。' : '') +
        (detectedGenres.length === 0 ? 'ジャンルが不明確——どの視聴者に見せるかを明確にしてください。' : '') +
        '\\n企画書で問われる3点:' +
        '\\n① どの視聴者層に何を感じさせるか（ターゲットと感情体験）' +
        '\\n② なぜ今この話を作るか（時代性・社会性）' +
        '\\n③ 似た既存作品より何が優れているか（差別化ポイント）'
    };
    notes.push(commNote);
  }

  // ── ペーシング診断（v12拡張: 最長シーンの実際の内容を引用）
  if (scores['pacing'] <= 2 && sceneCount >= 2) {"""

if OLD_PERF_NOTE_END in code:
    code = code.replace(OLD_PERF_NOTE_END, NEW_OBSTACLE_NOTES, 1)
    print("[OK] Added C-19/C-20/C-21 diagnostic notes")
else:
    print("[WARN] Pacing note insertion point not found")

# ─────────────────────────────────────────────────────────
# 9. Update analysisStats to include scriptType
# ─────────────────────────────────────────────────────────
OLD_STATS = """    evalMode: evalModeV13,
  };"""

NEW_STATS = """    evalMode: evalModeV13,
    scriptType: sType,
    obstacleScoreRaw: scores['obstacle-strength'] || 0,
    tempoScoreRaw: scores['tempo-rhythm'] || 0,
    commercialScoreRaw: scores['commercial-fit'] || 0,
  };"""

if OLD_STATS in code:
    code = code.replace(OLD_STATS, NEW_STATS, 1)
    print("[OK] Updated analysisStats with new axes")

# ─────────────────────────────────────────────────────────
# 10. Update judge comments to use scriptType + add 5th judge
# ─────────────────────────────────────────────────────────
OLD_JUDGES_END = """  if (evalModeV13 === 'school' || evalModeV13 === 'general') {
    const fmtSc = scores['format-correctness'] || 0;
    const threeActSc = scores['three-act'] || 0;
    judgesCommentsV13.push({
      judge: '講師・添削担当',
      score: Math.round((fmtSc + threeActSc) / 2),
      comment: fmtSc >= 4 && threeActSc >= 4
        ? `基礎が完全に身についています。フォーマット・三幕構成・因果関係——プロの読み手が違和感なく読める脚本です。次のステップは「個性」の確立です。`
        : `まずは基礎の徹底を。脚本フォーマット（柱書き・ト書き・台詞の配置）と三幕構成（発端事件・対立・クライマックスの位置）を正確に実装してください。審査員はフォーマットの乱れで読む気を失います。`
    });
  }"""

NEW_JUDGES_END = """  if (evalModeV13 === 'school' || evalModeV13 === 'general') {
    const fmtSc = scores['format-correctness'] || 0;
    const threeActSc = scores['three-act'] || 0;
    judgesCommentsV13.push({
      judge: '講師・添削担当',
      score: Math.round((fmtSc + threeActSc) / 2),
      comment: fmtSc >= 4 && threeActSc >= 4
        ? `基礎が完全に身についています。フォーマット・三幕構成・因果関係——プロの読み手が違和感なく読める脚本です。次のステップは「個性」の確立です。`
        : `まずは基礎の徹底を。脚本フォーマット（柱書き・ト書き・台詞の配置）と三幕構成（発端事件・対立・クライマックスの位置）を正確に実装してください。審査員はフォーマットの乱れで読む気を失います。`
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
  }"""

if OLD_JUDGES_END in code:
    code = code.replace(OLD_JUDGES_END, NEW_JUDGES_END, 1)
    print("[OK] Added 5th judge (obstacle/tempo) + scriptType context")
else:
    print("[WARN] Judges end not found")

# ─────────────────────────────────────────────────────────
# 11. Update result banner: show script type badge + new axes grid
# ─────────────────────────────────────────────────────────
OLD_BANNER_BADGE = """            <span class=\"sr-engine-badge\"><i class=\"fas fa-microchip\" style=\"font-size:7px\"></i>精密解析エンジン</span>"""

NEW_BANNER_BADGE = """            <span class=\"sr-engine-badge\"><i class=\"fas fa-microchip\" style=\"font-size:7px\"></i>精密解析エンジン v14</span>
            ${autoResult.analysisStats && autoResult.analysisStats.scriptType ? `<span class=\"sr-type-badge\"><i class=\"fas fa-tag\" style=\"font-size:7px\"></i>${{'tv-drama':'TVドラマ','film':'映画','stage':'舞台','web':'WEB/配信','competition':'コンクール自由','short':'短編'}[autoResult.analysisStats.scriptType]||autoResult.analysisStats.scriptType}</span>` : ''}"""

if OLD_BANNER_BADGE in code:
    code = code.replace(OLD_BANNER_BADGE, NEW_BANNER_BADGE, 1)
    print("[OK] Added script type badge in result banner")
else:
    print("[WARN] Banner badge not found")

# ─────────────────────────────────────────────────────────
# 12. Add new axes grid below the existing judge scores panel
# ─────────────────────────────────────────────────────────
OLD_AXES_END = """                  {label:'テンポ・リズム', val: (autoResult.analysisStats.tempoScore||0)*20, max:100, unit:'%', color: (autoResult.analysisStats.tempoScore||0)>=4?'#4ade80':(autoResult.analysisStats.tempoScore||0)>=2?'#fbbf24':'#f87171'},
                ].map(ax=>`<div style=\"background:rgba(255,255,255,.05);border-radius:6px;padding:8px 10px\">\n                  <div style=\"display:flex;justify-content:space-between;margin-bottom:4px\">\n                    <span style=\"font-size:9px;color:rgba(255,255,255,.45)\">${ax.label}</span>\n                    <span style=\"font-size:12px;font-weight:900;color:${ax.color}\">${ax.val}${ax.unit}</span>\n                  </div>\n                  <div style=\"height:3px;background:rgba(255,255,255,.08);border-radius:2px\">\n                    <div style=\"height:100%;width:${ax.val}%;background:${ax.color};border-radius:2px;transition:width .8s\"></div>\n                  </div>\n                </div>`).join('')}\n              </div>\n            </div>` : ''}\n          </div>\n        </div>` : ''}"""

NEW_AXES_END = """                  {label:'テンポ・リズム', val: (autoResult.analysisStats.tempoScore||0)*20, max:100, unit:'%', color: (autoResult.analysisStats.tempoScore||0)>=4?'#4ade80':(autoResult.analysisStats.tempoScore||0)>=2?'#fbbf24':'#f87171'},
                  {label:'障壁強度', val: (autoResult.analysisStats.obstacleScoreRaw||autoResult.analysisStats.obstacleScore||0)*20, max:100, unit:'%', color: (autoResult.analysisStats.obstacleScoreRaw||0)>=4?'#4ade80':(autoResult.analysisStats.obstacleScoreRaw||0)>=2?'#fbbf24':'#f87171'},
                  {label:'商業適合度', val: (autoResult.analysisStats.commercialScoreRaw||autoResult.analysisStats.commercialScore||0)*20, max:100, unit:'%', color: (autoResult.analysisStats.commercialScoreRaw||0)>=4?'#4ade80':(autoResult.analysisStats.commercialScoreRaw||0)>=2?'#fbbf24':'#f87171'},
                ].map(ax=>`<div style=\"background:rgba(255,255,255,.05);border-radius:6px;padding:8px 10px\">\n                  <div style=\"display:flex;justify-content:space-between;margin-bottom:4px\">\n                    <span style=\"font-size:9px;color:rgba(255,255,255,.45)\">${ax.label}</span>\n                    <span style=\"font-size:12px;font-weight:900;color:${ax.color}\">${ax.val}${ax.unit}</span>\n                  </div>\n                  <div style=\"height:3px;background:rgba(255,255,255,.08);border-radius:2px\">\n                    <div style=\"height:100%;width:${ax.val}%;background:${ax.color};border-radius:2px;transition:width .8s\"></div>\n                  </div>\n                </div>`).join('')}\n              </div>\n            </div>` : ''}\n          </div>\n        </div>` : ''}"""

if OLD_AXES_END in code:
    code = code.replace(OLD_AXES_END, NEW_AXES_END, 1)
    print("[OK] Added obstacle/commercial scores to axes grid")
else:
    print("[WARN] Axes grid end not found")

# ─────────────────────────────────────────────────────────
# 13. Improve annotated script: richer line-level annotation
# ─────────────────────────────────────────────────────────
OLD_ANNOTATE_FN = """function staffRoomGenerateAnnotatedScript(sessionId) {
  const sessions = DB.get('staffroom_sessions', []);
  const s = sessions.find(x => x.id === sessionId);
  if (!s || !s.scriptText) { toast('脚本テキストがありません', 'error'); return; }

  const ar = s.autoScoreResult || null;
  const detailNotes = ar ? (ar.detailNotes || []) : [];
  const itemScores  = ar ? (ar.itemScores  || {}) : {};

  const rawLines = s.scriptText.split('\\n');

  // Build an index of scene-level issues from detailNotes
  const issueMap = {}; // lineIndex → [{label, type}]

  // Extract quotes from detailNotes and map them back to lines
  detailNotes.forEach(note => {
    const q = note.quote || '';
    if (!q) return;
    const qLines = q.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
    qLines.forEach(ql => {
      // Find matching line in script
      rawLines.forEach((rl, ri) => {
        if (rl.trim() === ql || rl.trim().includes(ql.slice(0,20)) && ql.length > 10) {
          if (!issueMap[ri]) issueMap[ri] = [];
          const type = note.type || 'note';
          issueMap[ri].push({ label: note.label || '', type });
        }
      });
    });
  });

  // Helper detectors
  const isSceneLine = l =>
    /^[０-９0-9]+[○◎●]/.test(l) || /^[○◎●]/.test(l) ||
    /^【.{1,30}】/.test(l) || /^INT\\.|^EXT\\./.test(l.toUpperCase()) ||
    /^シーン[０-９0-9]|^#[0-9]/.test(l);
  const isCharName = l => /^[　\\s]*[A-ZＡ-Ｚぁ-ん一-龯]{1,15}[　\\s]*$/.test(l.trim()) && l.trim().length < 16;
  const isDialogue = (l, prev) => prev && isCharName(prev) && !isSceneLine(l);
  const isDirection = l => !isSceneLine(l) && !isCharName(l) && l.trim().length > 0;

  let annotHtml = '';
  let prevLine = '';
  let sceneIdx = 0;
  let longDialogueWarned = new Set();

  rawLines.forEach((rawLine, ri) => {
    const l = rawLine.trim();
    if (l === '') { annotHtml += '<div style=\"height:6px\"></div>'; prevLine = ''; return; }

    let lineClass = 'direction-line';
    let lineContent = esc(l);

    if (isSceneLine(l)) {
      sceneIdx++;
      lineClass = 'scene-line';
      lineContent = `<i class=\"fas fa-film\" style=\"font-size:8px;margin-right:4px;opacity:.5\"></i>${esc(l)}`;
    } else if (isCharName(l)) {
      lineClass = 'char-line';
    } else if (isDialogue(l, prevLine)) {
      lineClass = 'dialogue-line';
      // Warn on very long dialogue
      if (l.length > 80 && !longDialogueWarned.has(ri)) {
        longDialogueWarned.add(ri);
        if (!issueMap[ri]) issueMap[ri] = [];
        issueMap[ri].push({ label: `長台詞(${l.length}字)`, type: 'bad' });
      }
    }

    // Build inline comment badges
    let commentHtml = '';
    if (issueMap[ri]) {
      issueMap[ri].forEach(issue => {
        const typeClass = issue.type === 'bad' ? 'warn' : issue.type === 'good' ? 'good' : 'note';
        const icon = issue.type === 'bad' ? 'fa-triangle-exclamation' :
                     issue.type === 'good' ? 'fa-check' : 'fa-circle-info';
        commentHtml += `<span class=\"sr-ann-comment ${typeClass}\"><i class=\"fas ${icon}\" style=\"font-size:8px\"></i> ${esc(issue.label.slice(0,18))}</span>`;
      });
    }

    annotHtml += `<div class=\"sr-ann-line\">
      <span class=\"sr-ann-lnum\">${ri+1}</span>
      <span class=\"sr-ann-text ${lineClass}\">${lineContent}</span>
      ${commentHtml}
    </div>`;
    prevLine = l;
  });"""

NEW_ANNOTATE_FN = """function staffRoomGenerateAnnotatedScript(sessionId) {
  const sessions = DB.get('staffroom_sessions', []);
  const s = sessions.find(x => x.id === sessionId);
  if (!s || !s.scriptText) { toast('脚本テキストがありません', 'error'); return; }

  const ar = s.autoScoreResult || null;
  const detailNotes = ar ? (ar.detailNotes || []) : [];
  const itemScores  = ar ? (ar.itemScores  || {}) : {};
  const itemDetails = ar ? (ar.itemDetails || {}) : {};

  const rawLines = s.scriptText.split('\\n');

  // ── v14: Build rich annotation map from multiple sources ──────────
  // annotMap[lineIndex] = [{label, type, comment, source}]
  const annotMap = {};

  const addAnnot = (ri, label, type, comment, source) => {
    if (ri < 0 || ri >= rawLines.length) return;
    if (!annotMap[ri]) annotMap[ri] = [];
    // Dedup: don't add same label twice to same line
    if (!annotMap[ri].some(a => a.label === label)) {
      annotMap[ri].push({ label, type, comment: comment || '', source: source || '' });
    }
  };

  // 1. Map detailNotes quotes to lines
  detailNotes.forEach(note => {
    const q = note.quote || '';
    if (!q) return;
    const qLines = q.split('\\n').map(l => l.trim()).filter(l => l.length > 4);
    // Determine note label from text
    const noteLabel = (() => {
      const t = note.text || '';
      if (t.includes('三幕')) return '構成';
      if (t.includes('Want') || t.includes('Need') || t.includes('動機')) return '動機';
      if (t.includes('アーク') || t.includes('変化') || t.includes('成長')) return 'アーク';
      if (t.includes('サブテキスト') || t.includes('説明台詞') || t.includes('オン・ザ・ノーズ')) return '説明台詞';
      if (t.includes('ト書き') || t.includes('action')) return 'ト書き';
      if (t.includes('セリフ') || t.includes('対話') || t.includes('ダイナミクス')) return '台詞';
      if (t.includes('テーマ') || t.includes('message')) return 'テーマ';
      if (t.includes('ビジュアル') || t.includes('映像')) return '映像性';
      if (t.includes('オリジナリティ') || t.includes('独自')) return '独自性';
      if (t.includes('作家性') || t.includes('文体')) return '作家性';
      if (t.includes('ペーシング') || t.includes('長大') || t.includes('テンポ')) return 'ペーシング';
      if (t.includes('感情') || t.includes('カタルシス') || t.includes('インパクト')) return '感情';
      if (t.includes('固有性') || t.includes('声')) return 'キャラ';
      if (t.includes('障壁') || t.includes('葛藤')) return '障壁';
      return note.type === 'good' ? '好評価' : note.type === 'warn' ? '注意' : '要修正';
    })();
    const shortComment = (note.text || '').slice(0, 100);
    qLines.forEach(ql => {
      // Strip leading/trailing quotes/brackets for matching
      const cleanQl = ql.replace(/^「|」$|^[\[\(]|[\]\)]$/g, '').replace(/\s+/g,' ').trim();
      rawLines.forEach((rl, ri) => {
        const cleanRl = rl.trim().replace(/^「|」$|^[\[\(]|[\]\)]$/g, '').replace(/\s+/g,' ');
        const match = cleanRl === cleanQl ||
          (cleanQl.length >= 10 && cleanRl.includes(cleanQl.slice(0, 15))) ||
          (cleanRl.length >= 10 && cleanQl.includes(cleanRl.slice(0, 15)));
        if (match) addAnnot(ri, noteLabel, note.type || 'note', shortComment, 'diag');
      });
    });
  });

  // 2. Auto-detect common issues on every line (v14 enhancement)
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
  });

  // ── Build annotated HTML ───────────────────────────────────────────
  let annotHtml = '';
  let prevLineB = '';
  let sceneIdx = 0;
  let annotCount = 0;

  rawLines.forEach((rawLine, ri) => {
    const l = rawLine.trim();
    if (l === '') { annotHtml += '<div style=\"height:5px\"></div>'; prevLineB = ''; return; }

    let lineClass = 'direction-line';
    let lineContent = esc(l);

    if (isSceneLineA(l)) {
      sceneIdx++;
      lineClass = 'scene-line';
      lineContent = '<i class=\"fas fa-film\" style=\"font-size:8px;margin-right:4px;opacity:.5\"></i>' + esc(l);
    } else if (isCharNameA(l)) {
      lineClass = 'char-line';
    } else if (!isSceneLineA(prevLineB) && isCharNameA(prevLineB)) {
      lineClass = 'dialogue-line';
    }

    // Build badge HTML
    let badgeHtml = '';
    if (annotMap[ri] && annotMap[ri].length > 0) {
      annotCount += annotMap[ri].length;
      annotMap[ri].forEach(ann => {
        const badgeType = ann.type === 'bad' ? 'bad' : ann.type === 'good' ? 'good' : ann.type === 'warn' ? 'warn' : 'info';
        const icon = ann.type === 'bad' ? 'fa-triangle-exclamation' : ann.type === 'good' ? 'fa-check' : ann.type === 'warn' ? 'fa-exclamation' : 'fa-circle-info';
        const tooltipId = 'ann-tt-' + ri + '-' + Math.random().toString(36).slice(2,6);
        badgeHtml += '<span class=\"sr-ann-badge ' + badgeType + '\" title=\"' + esc(ann.comment.slice(0,80)) + '\">' +
          '<i class=\"fas ' + icon + '\" style=\"font-size:7px\"></i>' +
          esc(ann.label.slice(0,16)) + '</span>';
      });
    }

    annotHtml += '<div class=\"sr-ann-line2\">' +
      '<span class=\"sr-ann-lnum2\">' + (ri+1) + '</span>' +
      '<span class=\"sr-ann-text2 ' + lineClass + '\">' + lineContent + '</span>' +
      (badgeHtml ? '<div class=\"sr-ann-badges\">' + badgeHtml + '</div>' : '') +
      '</div>';
    prevLineB = l;
  });"""

if OLD_ANNOTATE_FN in code:
    code = code.replace(OLD_ANNOTATE_FN, NEW_ANNOTATE_FN, 1)
    print("[OK] Rewrote staffRoomGenerateAnnotatedScript with rich annotation")
else:
    print("[WARN] staffRoomGenerateAnnotatedScript not found for replacement")

# ─────────────────────────────────────────────────────────
# 14. Update the modal HTML in annotated script (use new classes + show count)
# ─────────────────────────────────────────────────────────
OLD_MODAL_FOOTER = """        <span style=\"margin-left:auto\">${rawLines.length}行 · ${detailNotes.length}件の診断ノート適用</span>"""

NEW_MODAL_FOOTER = """        <span style=\"margin-left:auto\">${rawLines.length}行 · ${annotCount}件のアノテーション適用</span>"""

if OLD_MODAL_FOOTER in code:
    code = code.replace(OLD_MODAL_FOOTER, NEW_MODAL_FOOTER, 1)
    print("[OK] Updated modal footer with annotCount")

# Fix modal to use new CSS classes
OLD_MODAL_BODY = """        <div class=\"sr-annotated-body\">
          ${annotHtml || '<div style=\"color:var(--text-muted);padding:20px;text-align:center\">脚本テキストがありません</div>'}
        </div>"""

NEW_MODAL_BODY = """        <div class=\"sr-annotated-body\" style=\"padding:8px 0\">
          <div style=\"font-size:10px;color:var(--text-muted);padding:6px 12px 10px;border-bottom:1px solid var(--border);display:flex;gap:12px;align-items:center;flex-wrap:wrap\">
            <span><span style=\"display:inline-block;width:8px;height:8px;background:#fef2f2;border:1px solid #fecaca;border-radius:2px;margin-right:3px\"></span>要修正</span>
            <span><span style=\"display:inline-block;width:8px;height:8px;background:#fffbeb;border:1px solid #fde68a;border-radius:2px;margin-right:3px\"></span>注意</span>
            <span><span style=\"display:inline-block;width:8px;height:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:2px;margin-right:3px\"></span>好評価</span>
            <span><span style=\"display:inline-block;width:8px;height:8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:2px;margin-right:3px\"></span>情報</span>
            <span style=\"margin-left:auto;font-size:9px\">バッジにカーソルを当てると詳細を確認できます</span>
          </div>
          ${annotHtml || '<div style=\"color:var(--text-muted);padding:20px;text-align:center\">脚本テキストがありません</div>'}
        </div>"""

if OLD_MODAL_BODY in code:
    code = code.replace(OLD_MODAL_BODY, NEW_MODAL_BODY, 1)
    print("[OK] Updated modal body with legend")

# ─────────────────────────────────────────────────────────
# 15. Update export to include new axes and script type
# ─────────────────────────────────────────────────────────
OLD_EXPORT_MODE = """  if (s.evalMode) text += `評価モード: ${modeLabels[s.evalMode]||s.evalMode}\\n`;"""

NEW_EXPORT_MODE = """  if (s.evalMode) text += `評価モード: ${modeLabels[s.evalMode]||s.evalMode}\\n`;
  const typeLabelsEx = {'tv-drama':'TVドラマ','film':'映画','stage':'舞台','web':'WEB/配信','competition':'コンクール自由','short':'短編'};
  if (s.scriptType) text += `脚本タイプ: ${typeLabelsEx[s.scriptType]||s.scriptType}\\n`;
  const arSt14 = s.autoScoreResult && s.autoScoreResult.analysisStats;
  if (arSt14) {
    if (arSt14.obstacleScoreRaw !== undefined) text += `障壁強度: ${arSt14.obstacleScoreRaw}/5\\n`;
    if (arSt14.tempoScoreRaw !== undefined) text += `テンポ・リズム: ${arSt14.tempoScoreRaw}/5\\n`;
    if (arSt14.commercialScoreRaw !== undefined) text += `商業適合度: ${arSt14.commercialScoreRaw}/5\\n`;
  }"""

if OLD_EXPORT_MODE in code:
    code = code.replace(OLD_EXPORT_MODE, NEW_EXPORT_MODE, 1)
    print("[OK] Updated export with new axes")

# ─────────────────────────────────────────────────────────
# 16. Update session card display to show scriptType
# ─────────────────────────────────────────────────────────
OLD_SESSION_CARD_BADGE = """            ${s.evalMode ? `<span class=\"sr-mode-badge ${s.evalMode}\">${{'contest':'🏆コンクール','adaptation':'🎬映像化','school':'📚添削','general':'📊総合'}[s.evalMode]||s.evalMode}</span>` : ''}"""

NEW_SESSION_CARD_BADGE = """            ${s.evalMode ? `<span class=\"sr-mode-badge ${s.evalMode}\">${{'contest':'🏆コンクール','adaptation':'🎬映像化','school':'📚添削','general':'📊総合'}[s.evalMode]||s.evalMode}</span>` : ''}
            ${s.scriptType ? `<span class=\"sr-type-badge\" style=\"font-size:9px\">${{'tv-drama':'📺TV','film':'🎬映画','stage':'🎭舞台','web':'🌐WEB','competition':'🏅公募','short':'⏱短編'}[s.scriptType]||s.scriptType}</span>` : ''}"""

if OLD_SESSION_CARD_BADGE in code:
    code = code.replace(OLD_SESSION_CARD_BADGE, NEW_SESSION_CARD_BADGE, 1)
    print("[OK] Added scriptType badge to session card")

# ─────────────────────────────────────────────────────────
# 17. Update summary string to mention scriptType
# ─────────────────────────────────────────────────────────
OLD_SUMMARY_LINE = """  const summary =
    (genreStr ? 'ジャンル推定：' + genreStr + '。' : '') +
    totalChars.toLocaleString() + '字（約' + estimatedPages + 'ページ）・' +
    sceneCount + 'シーン・登場人物' + uniqueChars + '人を18項目・7カテゴリで多角的に分析。' +"""

NEW_SUMMARY_LINE = """  const typeNamesSum = {'tv-drama':'TVドラマ','film':'映画','stage':'舞台','web':'WEB/配信','competition':'コンクール自由','short':'短編'};
  const summary =
    (sType && sType !== 'tv-drama' ? '[' + (typeNamesSum[sType]||sType) + '] ' : '') +
    (genreStr ? 'ジャンル推定：' + genreStr + '。' : '') +
    totalChars.toLocaleString() + '字（約' + estimatedPages + 'ページ）・' +
    sceneCount + 'シーン・登場人物' + uniqueChars + '人を21項目・7カテゴリで多角的に分析。' +"""

if OLD_SUMMARY_LINE in code:
    code = code.replace(OLD_SUMMARY_LINE, NEW_SUMMARY_LINE, 1)
    print("[OK] Updated summary to mention scriptType and 21 items")

# ─────────────────────────────────────────────────────────
# 18. Update gradeLabel text to mention scriptType
# ─────────────────────────────────────────────────────────
OLD_GRADE_LABEL = """  const gradeLabel = {
    S: '最優秀（コンクール受賞圏）', A: '優秀（プロレベル・公募通過圏）',
    B: '良好（あと一歩・集中改稿で変わる）', C: '標準（改稿で化ける可能性）',
    D: '要改善（基礎から見直しが必要）', E: '大幅改訂必要（根本的な再構成を）'
  }[grade];"""

NEW_GRADE_LABEL = """  const typeGradeSuffix = {'tv-drama':'','film':'（映画基準）','stage':'（舞台基準）','web':'（配信基準）','competition':'（公募基準）','short':'（短編基準）'};
  const gradeLabel = {
    S: '最優秀（コンクール受賞圏）', A: '優秀（プロレベル・公募通過圏）',
    B: '良好（あと一歩・集中改稿で変わる）', C: '標準（改稿で化ける可能性）',
    D: '要改善（基礎から見直しが必要）', E: '大幅改訂必要（根本的な再構成を）'
  }[grade] + (typeGradeSuffix[sType] || '');"""

if OLD_GRADE_LABEL in code:
    code = code.replace(OLD_GRADE_LABEL, NEW_GRADE_LABEL, 1)
    print("[OK] Updated gradeLabel with scriptType suffix")

# ─────────────────────────────────────────────────────────
# 19. Update v13 banner engine version text
# ─────────────────────────────────────────────────────────
code = code.replace(
    '審査員採点レポート v13</span>\n            <span style=\"font-size:9px;background:rgba(168,85,247,.25);color:rgba(200,160,255,.9);border:1px solid rgba(168,85,247,.4);border-radius:4px;padding:1px 6px;font-weight:700;letter-spacing:.05em\">24項目・8軸・評価モード対応 v13</span>',
    '審査員採点レポート v14</span>\n            <span style=\"font-size:9px;background:rgba(168,85,247,.25);color:rgba(200,160,255,.9);border:1px solid rgba(168,85,247,.4);border-radius:4px;padding:1px 6px;font-weight:700;letter-spacing:.05em\">21項目・8軸・脚本タイプ対応 v14</span>'
)
print("[OK] Updated v13 → v14 engine version banner")

# ─────────────────────────────────────────────────────────
# Done: write output
# ─────────────────────────────────────────────────────────
with open(SRC, 'w', encoding='utf-8') as f:
    f.write(code)

new_len = len(code)
print(f"\nv14 patch complete: {orig_len:,} → {new_len:,} chars (+{new_len-orig_len:,})")
