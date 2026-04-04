#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scenario Lab v13 Patch
======================
1. Evaluation Modes: Contest-Judge / Adaptation / Scenario-School / General
2. Annotated Script: per-location inline comments export
3. Expanded Rubric: +6 new axes (obstacle-strength, obstacle, commercial-fit, target-fit, judges-comments, adaptation-score)
4. Cleaner quote extraction & script-specific feedback
5. Header badge updated to v13
6. Session card shows eval mode badge
7. New CSS for mode selector + annotated script panel
"""

import re

JS_PATH = 'public/static/app.js'
CSS_PATH = 'public/static/app.css'

with open(JS_PATH, 'r', encoding='utf-8') as f:
    js = f.read()
with open(CSS_PATH, 'r', encoding='utf-8') as f:
    css = f.read()

changes = []

# ─── 1. CSS additions ─────────────────────────────────────────────────────────

NEW_CSS = r"""
/* ══════════════════════════════════════════════════════
   v13 Evaluation Mode Selector & Annotated Script
   ══════════════════════════════════════════════════════ */

/* Mode selector strip */
.sr-mode-strip {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  padding: 10px 12px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.sr-mode-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 20px;
  border: 1.5px solid var(--border);
  background: var(--bg-card);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all .18s;
  white-space: nowrap;
}
.sr-mode-btn:hover { border-color: var(--fuji); color: var(--fuji); background: var(--fuji-bg, #f0eeff); }
.sr-mode-btn.active { background: var(--fuji); border-color: var(--fuji); color: #fff; box-shadow: 0 2px 8px rgba(107,70,193,.3); }
.sr-mode-btn i { font-size: 10px; }

/* Mode description */
.sr-mode-desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
  padding: 7px 10px;
  background: var(--bg-subtle);
  border-left: 3px solid var(--fuji);
  border-radius: 0 6px 6px 0;
  margin-bottom: 14px;
}

/* Mode badge on session card */
.sr-mode-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 8px;
  letter-spacing: .04em;
}
.sr-mode-badge.contest   { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.sr-mode-badge.adaptation{ background: #dbeafe; color: #1e3a8a; border: 1px solid #bfdbfe; }
.sr-mode-badge.school    { background: #dcfce7; color: #14532d; border: 1px solid #bbf7d0; }
.sr-mode-badge.general   { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }

/* Expanded axis items */
.sr-axis-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-light, #f1f0f0);
}
.sr-axis-row:last-child { border-bottom: none; }
.sr-axis-label { font-size: 11.5px; color: var(--text-secondary); flex: 1; }
.sr-axis-score { font-size: 13px; font-weight: 800; min-width: 28px; text-align: right; }
.sr-axis-bar   { flex: 0 0 80px; height: 4px; background: var(--bg-subtle); border-radius: 2px; overflow: hidden; }
.sr-axis-fill  { height: 100%; border-radius: 2px; transition: width .6s ease; }

/* Annotated script panel */
.sr-annotated-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-top: 18px;
}
.sr-annotated-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: linear-gradient(90deg, #09071f, #1a0f4a);
  color: #fff;
}
.sr-annotated-body {
  max-height: 600px;
  overflow-y: auto;
  font-family: 'Noto Serif JP', serif;
  font-size: 12.5px;
  line-height: 2.0;
  padding: 16px;
  background: #fafaf9;
}
.sr-ann-line {
  display: flex;
  gap: 0;
  align-items: flex-start;
  margin-bottom: 2px;
}
.sr-ann-line:hover { background: rgba(107,70,193,.04); border-radius: 4px; }
.sr-ann-lnum {
  flex-shrink: 0;
  min-width: 32px;
  font-size: 9.5px;
  color: #9ca3af;
  padding-top: 3px;
  user-select: none;
  text-align: right;
  padding-right: 10px;
}
.sr-ann-text { flex: 1; color: var(--text-primary); }
.sr-ann-text.scene-line  { font-weight: 700; color: #1e3a8a; background: #eff6ff; padding: 1px 4px; border-radius: 3px; }
.sr-ann-text.char-line   { font-weight: 700; color: #374151; padding-left: 60px; }
.sr-ann-text.dialogue-line { color: #1f2937; padding-left: 40px; }
.sr-ann-text.direction-line { color: #6b7280; font-style: italic; }
.sr-ann-comment {
  margin-left: 10px;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  align-self: center;
  flex-shrink: 0;
}
.sr-ann-comment.warn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.sr-ann-comment.good { background: #dcfce7; color: #14532d; border: 1px solid #bbf7d0; }
.sr-ann-comment.note { background: #f0f9ff; color: #0c4a6e; border: 1px solid #bae6fd; }

/* Judges comment section */
.sr-judges-section {
  margin-top: 16px;
  padding: 14px;
  background: linear-gradient(135deg, #09071f, #1a0f4a);
  border-radius: 10px;
  color: #fff;
}
.sr-judge-card {
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 10px;
}
.sr-judge-name {
  font-size: 10px;
  color: rgba(255,255,255,.5);
  font-weight: 700;
  letter-spacing: .08em;
  margin-bottom: 6px;
}
.sr-judge-comment {
  font-size: 12px;
  line-height: 1.75;
  color: rgba(255,255,255,.85);
}
.sr-judge-score {
  display: inline-block;
  font-size: 18px;
  font-weight: 900;
  color: #fbbf24;
  margin-right: 6px;
}

/* Commercial fit section */
.sr-commercial-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.sr-commercial-row:last-child { border-bottom: none; }
.sr-commercial-label { font-size: 11px; color: rgba(255,255,255,.6); flex: 1; }
.sr-commercial-val { font-size: 13px; font-weight: 800; }

/* Obstacle strength display */
.sr-obstacle-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 12px;
  font-size: 10.5px;
  font-weight: 700;
}
.sr-obstacle-chip.strong { background: #dcfce7; color: #14532d; }
.sr-obstacle-chip.weak   { background: #fef2f2; color: #7f1d1d; }
.sr-obstacle-chip.medium { background: #fef3c7; color: #92400e; }

/* Adaptation score */
.sr-adapt-bar-wrap { margin-top: 10px; }
.sr-adapt-label { font-size: 10px; color: var(--text-muted); margin-bottom: 3px; display: flex; justify-content: space-between; }
.sr-adapt-bar { height: 6px; background: var(--bg-subtle); border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
.sr-adapt-fill { height: 100%; border-radius: 3px; }

/* Mode-specific rubric additions */
.sr-extra-axis-section {
  margin-top: 14px;
  padding: 12px;
  background: var(--bg-subtle);
  border-radius: 8px;
  border: 1px solid var(--border);
}
.sr-extra-axis-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Clean quote block (v13 refinement) */
.sr-quote-v13 {
  margin: 8px 0;
  padding: 0;
  border-radius: 6px;
  overflow: hidden;
}
.sr-quote-v13-label {
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: .08em;
  padding: 4px 10px;
  text-transform: uppercase;
}
.sr-quote-v13-label.bad  { background: #fef2f2; color: #b91c1c; border-left: 3px solid #ef4444; }
.sr-quote-v13-label.good { background: #f0fdf4; color: #15803d; border-left: 3px solid #22c55e; }
.sr-quote-v13-label.warn { background: #fffbeb; color: #b45309; border-left: 3px solid #f59e0b; }
.sr-quote-v13-body {
  font-family: 'Noto Serif JP', serif;
  font-size: 12px;
  line-height: 1.85;
  padding: 8px 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
.sr-quote-v13-body.bad  { background: #fff5f5; color: #7f1d1d; }
.sr-quote-v13-body.good { background: #f0fdf4; color: #14532d; }
.sr-quote-v13-body.warn { background: #fffbeb; color: #78350f; }
.sr-quote-v13-improve {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 6px 10px 8px;
  border-top: 1px dashed rgba(0,0,0,.08);
  line-height: 1.7;
}

/* v13 header badge */
.sr-v13-badge {
  font-size: 9px;
  background: rgba(251,191,36,.2);
  color: #fbbf24;
  border: 1px solid rgba(251,191,36,.35);
  border-radius: 4px;
  padding: 1px 6px;
  font-weight: 700;
  letter-spacing: .05em;
}
"""

if '.sr-mode-strip' not in css:
    css += NEW_CSS
    changes.append('Added v13 CSS (mode selector, annotated script, expanded axes, judge comments, commercial fit)')

# ─── 2. Update engine header badge v12 → v13 ─────────────────────────────────

old_badge = '18項目・7軸・脚本固有分析 v12'
new_badge = '24項目・8軸・評価モード対応 v13'
if old_badge in js:
    js = js.replace(old_badge, new_badge)
    changes.append('Updated engine badge to v13 (24 items, 8 axes)')

old_version = 'SCENARIO LAB ─ 審査員採点レポート v12'
new_version = 'SCENARIO LAB ─ 審査員採点レポート v13'
if old_version in js:
    js = js.replace(old_version, new_version)
    changes.append('Updated report header to v13')

# ─── 3. Update staffRoomRunAnalysis engine comment ───────────────────────────

old_engine_header = '''function staffRoomRunAnalysis(text) {
  // ══════════════════════════════════════════════════════════════════
  //  シナリオラボ 職員室 — コンクール審査員エンジン v11.0
  //  7カテゴリ・18項目・多軸評価モデル
  //  客観（構造・形式）× 主観（情動・映像性・作家性）× 映像化実現性
  //  判定ロジック: NHK・城戸賞・テレビ大賞 審査基準を参考に設計
  // ══════════════════════════════════════════════════════════════════'''

new_engine_header = '''function staffRoomRunAnalysis(text, evalMode) {
  // ══════════════════════════════════════════════════════════════════
  //  シナリオラボ 職員室 — 精密採点エンジン v13.0
  //  8カテゴリ・24項目・評価モード対応多軸モデル
  //  評価モード: contest(コンクール) | adaptation(映像化適合) | school(添削) | general(総合)
  //  客観（構造・形式）× 主観（情動・映像性・作家性）× 映像化実現性 × 商業適合性
  //  判定ロジック: NHK・城戸賞・テレビ大賞・映像化適合度 審査基準参考
  // ══════════════════════════════════════════════════════════════════
  const mode = evalMode || 'contest';'''

if old_engine_header in js:
    js = js.replace(old_engine_header, new_engine_header)
    changes.append('Updated staffRoomRunAnalysis signature to accept evalMode parameter')

# ─── 4. Inject annotated script generation function before staffRoomExport ───

ANNOTATED_FUNC = '''
// ── アノテーション付き脚本生成（v13）─────────────────────────────────────
function staffRoomGenerateAnnotatedScript(sessionId) {
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
  const isCharName = l => /^[　\s]*[A-ZＡ-Ｚぁ-ん一-龯]{1,15}[　\s]*$/.test(l.trim()) && l.trim().length < 16;
  const isDialogue = (l, prev) => prev && isCharName(prev) && !isSceneLine(l);
  const isDirection = l => !isSceneLine(l) && !isCharName(l) && l.trim().length > 0;

  let annotHtml = '';
  let prevLine = '';
  let sceneIdx = 0;
  let longDialogueWarned = new Set();

  rawLines.forEach((rawLine, ri) => {
    const l = rawLine.trim();
    if (l === '') { annotHtml += '<div style="height:6px"></div>'; prevLine = ''; return; }

    let lineClass = 'direction-line';
    let lineContent = esc(l);

    if (isSceneLine(l)) {
      sceneIdx++;
      lineClass = 'scene-line';
      lineContent = `<i class="fas fa-film" style="font-size:8px;margin-right:4px;opacity:.5"></i>${esc(l)}`;
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
        commentHtml += `<span class="sr-ann-comment ${typeClass}"><i class="fas ${icon}" style="font-size:8px"></i> ${esc(issue.label.slice(0,18))}</span>`;
      });
    }

    annotHtml += `<div class="sr-ann-line">
      <span class="sr-ann-lnum">${ri+1}</span>
      <span class="sr-ann-text ${lineClass}">${lineContent}</span>
      ${commentHtml}
    </div>`;
    prevLine = l;
  });

  // Build modal
  const modalEl = document.getElementById('modal-overlay');
  if (!modalEl) return;
  modalEl.innerHTML = `
    <div class="modal-dialog" style="max-width:820px;width:95vw;max-height:90vh;overflow:hidden;display:flex;flex-direction:column">
      <div class="modal-header" style="flex-shrink:0;display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,#09071f,#1a0f4a);color:#fff;border-radius:12px 12px 0 0;padding:14px 18px">
        <i class="fas fa-file-lines" style="color:#a78bfa;font-size:14px"></i>
        <div style="flex:1">
          <div style="font-weight:700;font-size:13px">${esc(s.title||'無題の脚本')}　—　アノテーション付き脚本</div>
          <div style="font-size:10px;color:rgba(255,255,255,.5);margin-top:2px">採点結果を脚本上に直接マッピング · 問題箇所と好評価箇所を行単位で表示</div>
        </div>
        <div style="display:flex;gap:6px">
          <button onclick="staffRoomDownloadAnnotated('${sessionId}')" style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:6px;padding:5px 10px;font-size:10px;cursor:pointer;font-weight:600"><i class="fas fa-download" style="margin-right:4px"></i>TXTダウンロード</button>
          <button onclick="document.getElementById('modal-overlay').style.display='none'" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.7);border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center"><i class="fas fa-times" style="font-size:11px"></i></button>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto">
        <div class="sr-annotated-body">
          ${annotHtml || '<div style="color:var(--text-muted);padding:20px;text-align:center">脚本テキストがありません</div>'}
        </div>
      </div>
      <div style="flex-shrink:0;padding:10px 16px;background:var(--bg-subtle);border-top:1px solid var(--border);font-size:10.5px;color:var(--text-muted);display:flex;align-items:center;gap:12px;border-radius:0 0 12px 12px">
        <span><span style="display:inline-block;width:10px;height:10px;background:#fef3c7;border:1px solid #fde68a;border-radius:2px;margin-right:3px"></span>要注意</span>
        <span><span style="display:inline-block;width:10px;height:10px;background:#dcfce7;border:1px solid #bbf7d0;border-radius:2px;margin-right:3px"></span>好評価</span>
        <span><span style="display:inline-block;width:10px;height:10px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:2px;margin-right:3px"></span>情報</span>
        <span style="margin-left:auto">${rawLines.length}行 · ${detailNotes.length}件の診断ノート適用</span>
      </div>
    </div>`;
  modalEl.style.display = 'flex';
}

function staffRoomDownloadAnnotated(sessionId) {
  const sessions = DB.get('staffroom_sessions', []);
  const s = sessions.find(x => x.id === sessionId);
  if (!s || !s.scriptText) return;

  const ar = s.autoScoreResult || null;
  const detailNotes = ar ? (ar.detailNotes || []) : [];
  const rawLines = s.scriptText.split('\\n');
  const bar = '═'.repeat(60);
  const line2 = '─'.repeat(60);

  let out = `${bar}\\n  アノテーション付き脚本\\n  ${s.title || '無題の脚本'}\\n  生成: ${new Date().toLocaleString('ja-JP')}\\n${bar}\\n\\n`;

  // Map quotes to lines
  const issueMap = {};
  detailNotes.forEach(note => {
    const q = note.quote || '';
    if (!q) return;
    q.split('\\n').map(l=>l.trim()).filter(l=>l.length>0).forEach(ql => {
      rawLines.forEach((rl, ri) => {
        if (rl.trim() === ql || (rl.trim().includes(ql.slice(0,20)) && ql.length > 10)) {
          if (!issueMap[ri]) issueMap[ri] = [];
          issueMap[ri].push(note);
        }
      });
    });
  });

  rawLines.forEach((rl, ri) => {
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
  });

  const blob = new Blob([out], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `annotated_${(s.title||'script').slice(0,20).replace(/[\\s\\/\\\\]/g,'_')}_${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  toast('アノテーション付き脚本をダウンロードしました', 'success');
}

'''

if 'staffRoomGenerateAnnotatedScript' not in js:
    # Insert before staffRoomExport
    js = js.replace('function staffRoomExport(sessionId) {',
                    ANNOTATED_FUNC + 'function staffRoomExport(sessionId) {')
    changes.append('Added staffRoomGenerateAnnotatedScript + staffRoomDownloadAnnotated functions')

# ─── 5. Add eval mode selector to session header ──────────────────────────────

OLD_SESSION_HEADER = '''      <!-- セッションヘッダー -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="staffRoomCloseSession()" style="flex-shrink:0"><i class="fas fa-arrow-left"></i></button>
        <input class="form-input" id="staffroom-title" style="flex:1;min-width:200px;font-size:14px;font-weight:600" placeholder="脚本タイトル" value="${esc(s.title||'')}" oninput="staffRoomAutoSaveTitle('${s.id}')">
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-primary btn-sm" onclick="staffRoomSaveAll('${s.id}')"><i class="fas fa-save"></i> 保存</button>
          <button class="btn btn-secondary btn-sm" onclick="staffRoomExport('${s.id}')"><i class="fas fa-file-export"></i> レポート</button>
        </div>
      </div>'''

NEW_SESSION_HEADER = '''      <!-- セッションヘッダー -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="staffRoomCloseSession()" style="flex-shrink:0"><i class="fas fa-arrow-left"></i></button>
        <input class="form-input" id="staffroom-title" style="flex:1;min-width:200px;font-size:14px;font-weight:600" placeholder="脚本タイトル" value="${esc(s.title||'')}" oninput="staffRoomAutoSaveTitle('${s.id}')">
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-primary btn-sm" onclick="staffRoomSaveAll('${s.id}')"><i class="fas fa-save"></i> 保存</button>
          <button class="btn btn-secondary btn-sm" onclick="staffRoomExport('${s.id}')"><i class="fas fa-file-export"></i> レポート</button>
          ${s.autoScoreResult ? `<button class="btn btn-sm" style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8);color:#fff;border:none" onclick="staffRoomGenerateAnnotatedScript('${s.id}')"><i class="fas fa-file-lines" style="margin-right:4px"></i>アノテーション</button>` : ''}
        </div>
      </div>

      <!-- 評価モード選択 -->
      <div class="sr-mode-strip">
        <span style="font-size:10.5px;font-weight:700;color:var(--text-muted);align-self:center;white-space:nowrap"><i class="fas fa-sliders" style="margin-right:4px"></i>評価モード:</span>
        ${[
          { id:'contest',   icon:'fa-trophy',        label:'コンクール審査',   desc:'NHK・城戸賞・テレビ大賞基準。審査員視点で採点。コンクール通過力・感情インパクト・作家性を重視。' },
          { id:'adaptation',icon:'fa-video',          label:'映像化適合',       desc:'映像化・ドラマ化・映画化の実現可能性。制作費効率・ロケ多様性・VFX依存度・放送枠適合を重視。' },
          { id:'school',    icon:'fa-graduation-cap', label:'シナリオ学校添削',  desc:'教育的フィードバック重視。基礎技術・フォーマット・構成の正確さを丁寧に指摘。初級～中級向け。' },
          { id:'general',   icon:'fa-chart-bar',      label:'総合評価',         desc:'全軸バランス評価。コンクール・映像化・教育的観点をすべて含む総合診断レポート。' },
        ].map(m => `<button class="sr-mode-btn ${(s.evalMode||'contest')===m.id?'active':''}" onclick="staffRoomSetMode('${s.id}','${m.id}',this)">
          <i class="fas ${m.icon}"></i>${m.label}
        </button>`).join('')}
      </div>
      <div class="sr-mode-desc" id="sr-mode-desc-${s.id}">${{
        contest:    '<i class="fas fa-trophy" style="color:var(--fuji);margin-right:4px"></i><strong>コンクール審査モード</strong> — NHK・城戸賞・テレビ大賞基準。審査員視点で採点。コンクール通過力・感情インパクト・作家性を重視。',
        adaptation: '<i class="fas fa-video" style="color:#2563eb;margin-right:4px"></i><strong>映像化適合モード</strong> — 映像化・ドラマ化・映画化の実現可能性を重視。制作費効率・ロケ多様性・VFX依存度・放送枠適合を詳細評価。',
        school:     '<i class="fas fa-graduation-cap" style="color:#16a34a;margin-right:4px"></i><strong>シナリオ学校添削モード</strong> — 基礎技術・フォーマット・構成の正確さを丁寧に指摘。具体的な改稿提案と模範例付き。',
        general:    '<i class="fas fa-chart-bar" style="color:#ca8a04;margin-right:4px"></i><strong>総合評価モード</strong> — コンクール・映像化・教育的観点を全方位で評価。採点ヒストリー・比較分析付き。',
      }[(s.evalMode||'contest')]}</div>'''

if OLD_SESSION_HEADER in js:
    js = js.replace(OLD_SESSION_HEADER, NEW_SESSION_HEADER)
    changes.append('Added evaluation mode selector strip with 4 modes')

# ─── 6. Add staffRoomSetMode function ────────────────────────────────────────

SET_MODE_FUNC = '''
function staffRoomSetMode(sessionId, mode, btn) {
  const sessions = DB.get('staffroom_sessions', []);
  const idx = sessions.findIndex(s => s.id === sessionId);
  if (idx === -1) return;
  sessions[idx].evalMode = mode;
  sessions[idx].updatedAt = Date.now();
  DB.set('staffroom_sessions', sessions);

  // Update UI without full re-render
  const strip = btn.closest('.sr-mode-strip');
  if (strip) strip.querySelectorAll('.sr-mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const descEl = document.getElementById(`sr-mode-desc-${sessionId}`);
  const descMap = {
    contest:    '<i class="fas fa-trophy" style="color:var(--fuji);margin-right:4px"></i><strong>コンクール審査モード</strong> — NHK・城戸賞・テレビ大賞基準。審査員視点で採点。コンクール通過力・感情インパクト・作家性を重視。',
    adaptation: '<i class="fas fa-video" style="color:#2563eb;margin-right:4px"></i><strong>映像化適合モード</strong> — 映像化・ドラマ化・映画化の実現可能性を重視。制作費効率・ロケ多様性・VFX依存度・放送枠適合を詳細評価。',
    school:     '<i class="fas fa-graduation-cap" style="color:#16a34a;margin-right:4px"></i><strong>シナリオ学校添削モード</strong> — 基礎技術・フォーマット・構成の正確さを丁寧に指摘。具体的な改稿提案と模範例付き。',
    general:    '<i class="fas fa-chart-bar" style="color:#ca8a04;margin-right:4px"></i><strong>総合評価モード</strong> — コンクール・映像化・教育的観点を全方位で評価。採点ヒストリー・比較分析付き。',
  };
  if (descEl) descEl.innerHTML = descMap[mode] || descMap.contest;
  toast(`評価モードを「${btn.textContent.trim()}」に切り替えました`, 'info');
}

'''

if 'function staffRoomSetMode' not in js:
    js = js.replace('function staffRoomNewSession() {',
                    SET_MODE_FUNC + 'function staffRoomNewSession() {')
    changes.append('Added staffRoomSetMode function')

# ─── 7. Pass evalMode to staffRoomAutoScore ──────────────────────────────────

OLD_AUTOSCORE_CALL = "      const result = staffRoomRunAnalysis(text);"
NEW_AUTOSCORE_CALL = "      const result = staffRoomRunAnalysis(text, s.evalMode || 'contest');"

if OLD_AUTOSCORE_CALL in js:
    js = js.replace(OLD_AUTOSCORE_CALL, NEW_AUTOSCORE_CALL)
    changes.append('staffRoomAutoScore now passes evalMode to analysis engine')

# ─── 8. Add expanded axes computation at end of staffRoomRunAnalysis ─────────

# Find the return statement of staffRoomRunAnalysis and inject before it
# We look for the analysisStats block construction
OLD_ANALYSIS_STATS = '''  const analysisStats = {
    totalChars,
    estimatedPages: Math.max(1, Math.round(totalChars / 800)),
    sceneCount: sceneLines.length,
    uniqueChars: uniqueCharNames.size,
    dialogueRatio: Math.round(dialogueRatio),
    emotionDensity: Math.round(emotionDensity),
    onTheNoseCount,
    hasCatharsis,
    genreStr,
  };'''

NEW_ANALYSIS_STATS = '''  // ── 拡張軸計算 (v13) ──────────────────────────────────────────────
  // 障壁強度 (obstacle strength): 対立・妨害キーワード密度
  const obstacleKw = ['だめだ','無理だ','できない','阻む','拒否','拒絶','邪魔','妨げ','追い込む','逃げ場','崖','罠','裏切','誤解','嘘','秘密','危機','絶体絶命','どん底','失敗','挫折','壊れ','奪われ','失って','諦め','限界'];
  const obstacleCount = obstacleKw.reduce((n,kw)=>n+(text.match(new RegExp(kw,'g'))||[]).length,0);
  const obstacleScore = Math.min(5, Math.round(obstacleCount / Math.max(1,sceneLines.length) * 2.5 + (conflictScore||0)*0.5));
  // 商業適合度 (commercial fit): 日常舞台＋少人数＋ジャンル人気度
  const popularGenres = ['ミステリー','サスペンス','恋愛','ヒューマン','家族','青春'];
  const genreBonus = popularGenres.filter(g=>genreStr.includes(g)).length;
  const commercialScore = Math.min(5, Math.round(
    (indoorRatio||0) * 1.5 +
    Math.max(0, 3 - (uniqueCharNames.size > 8 ? 2 : uniqueCharNames.size > 5 ? 1 : 0)) +
    genreBonus * 0.5
  ));
  // 映像化適合度 (adaptation suitability): visualScore + direction + production
  const adaptationScore = Math.min(100, Math.round(
    ((itemScores['visual']||0) * 0.35 +
     (itemScores['direction-clarity']||0) * 0.25 +
     (itemScores['production-viability']||0) * 0.25 +
     (itemScores['format-correctness']||0) * 0.15) * 20
  ));
  // テンポ・リズム (tempo): 短ト書き比率・シーン転換頻度
  const avgSceneLen = sceneLines.length > 0 ? Math.round(totalLines / sceneLines.length) : totalLines;
  const tempoScore = Math.min(5, Math.round(
    (shortActionRatio > 0.5 ? 2 : shortActionRatio > 0.3 ? 1 : 0) +
    (avgSceneLen < 20 ? 2 : avgSceneLen < 35 ? 1 : 0) +
    (sceneLines.length >= 5 ? 1 : 0)
  ));

  // ── モード別 審査員コメント生成 ─────────────────────────────────────
  const judgesComments = [];
  const totalScore_ref = itemScores;
  if (mode === 'contest' || mode === 'general') {
    const eiScore = totalScore_ref['emotional-impact'] || 0;
    const avScore = totalScore_ref['authorial-voice'] || 0;
    if (eiScore >= 4) {
      judgesComments.push({ judge: '審査委員長', score: eiScore, comment: `感情的インパクトが際立っています。読み始めた瞬間に空気が変わる感覚があり、コンクールの一次審査を通過するに十分な牽引力があります。${ar_origScore >= 4 ? 'オリジナリティも高く、この書き手ならではの世界観が確立されています。' : '次稿ではオリジナリティをさらに磨き、「この作家にしか書けない話」という確信を読み手に与えてください。'}` });
    } else {
      judgesComments.push({ judge: '審査委員長', score: Math.max(1, eiScore), comment: `感情的インパクトが今一歩です。コンクール審査員は「続きを読みたい」と思わせる瞬間を探します。転換点・意外性・忘れられないシーン——3つのうち少なくとも1つを強化してください。読後に「何かが変わった」という感覚が残る脚本が一次通過します。` });
    }
    const subScore = totalScore_ref['subtext'] || 0;
    const voiceScore = totalScore_ref['voice'] || 0;
    judgesComments.push({ judge: 'セリフ担当審査員', score: Math.round((subScore+voiceScore)/2), comment: subScore >= 4 ? `サブテキストの扱いが秀逸です。登場人物が本音を言わずに感情を伝える——この技術が確立されています。対話に緊張感があり、キャラクターの声も固有性があります。` : `セリフに「説明」が多く見受けられます。登場人物は本音を言いません。言いたいことの裏にある行動や沈黙で語る——サブテキスト技法を全セリフに適用してください。「悲しい」ではなく「コーヒーカップを洗い続ける手が止まらない」。` });
  }
  if (mode === 'adaptation' || mode === 'general') {
    const prodScore = totalScore_ref['production-viability'] || 0;
    const visScore  = totalScore_ref['visual'] || 0;
    judgesComments.push({ judge: 'プロデューサー視点', score: Math.round((prodScore+visScore+commercialScore)/3), comment: prodScore >= 4 ? `制作コスト観点で優れています。日常的な舞台設定・少人数キャスト・映像映えするト書き——放送・配信向けのパッケージとして企画を通す力があります。` : `制作コストが心配です。VFX・大規模ロケ・多人数キャストは予算を圧迫します。同じ感情効果を「密室」「2人」「日常の道具」で表現できないか検討してください。予算内で作れる脚本が実際に映像化されます。` });
  }
  if (mode === 'school' || mode === 'general') {
    const fmtScore = totalScore_ref['format-correctness'] || 0;
    const threeActScore = totalScore_ref['three-act'] || 0;
    judgesComments.push({ judge: '講師・添削担当', score: Math.round((fmtScore+threeActScore)/2), comment: fmtScore >= 4 && threeActScore >= 4 ? `基礎が完全に身についています。フォーマット・三幕構成・因果関係——プロの読み手が違和感なく読める脚本です。次のステップは「個性」の確立です。形式の正確さの上に、あなただけの声を乗せてください。` : `まずは基礎の徹底を。脚本フォーマット（柱書き・ト書き・台詞の配置）と三幕構成（発端事件・対立・クライマックスの位置）を正確に実装してください。審査員・プロデューサーはフォーマットの乱れで読む気を失います。` });
  }

  const ar_origScore = totalScore_ref['originality'] || 0;

  const analysisStats = {
    totalChars,
    estimatedPages: Math.max(1, Math.round(totalChars / 800)),
    sceneCount: sceneLines.length,
    uniqueChars: uniqueCharNames.size,
    dialogueRatio: Math.round(dialogueRatio),
    emotionDensity: Math.round(emotionDensity),
    onTheNoseCount,
    hasCatharsis,
    genreStr,
    // v13 expanded axes
    obstacleScore,
    obstacleCount,
    commercialScore,
    adaptationScore,
    tempoScore,
    avgSceneLen,
    judgesComments,
    evalMode: mode,
  };'''

if OLD_ANALYSIS_STATS in js and 'obstacleScore' not in js:
    js = js.replace(OLD_ANALYSIS_STATS, NEW_ANALYSIS_STATS)
    changes.append('Added v13 expanded axes: obstacle strength, commercial fit, adaptation score, tempo, judges comments')

# ─── 9. Inject judges comments + extended axes into result banner UI ──────────

# Find the analysis stats display in the result banner (after hasCatharsis display)
OLD_STATS_DISPLAY = '''                    ${autoResult.analysisStats.hasCatharsis ? '<span style="color:rgba(74,222,128,.7)"><i class="fas fa-check-circle" style="font-size:7px;margin-right:2px"></i>カタルシス</span>' : ''}
                  </span>` : ''}'''

NEW_STATS_DISPLAY = '''                    ${autoResult.analysisStats.hasCatharsis ? '<span style="color:rgba(74,222,128,.7)"><i class="fas fa-check-circle" style="font-size:7px;margin-right:2px"></i>カタルシス</span>' : ''}
                    ${autoResult.analysisStats.obstacleScore !== undefined ? `<span style="color:${autoResult.analysisStats.obstacleScore>=4?'rgba(74,222,128,.7)':autoResult.analysisStats.obstacleScore>=2?'rgba(251,191,36,.7)':'rgba(248,113,113,.7)'}"><i class="fas fa-shield-halved" style="font-size:7px;margin-right:2px"></i>障壁${['','▼','△','◇','○','◎'][autoResult.analysisStats.obstacleScore]||autoResult.analysisStats.obstacleScore}</span>` : ''}
                    ${autoResult.analysisStats.adaptationScore !== undefined ? `<span style="color:rgba(147,197,253,.7)"><i class="fas fa-video" style="font-size:7px;margin-right:2px"></i>映像適合${autoResult.analysisStats.adaptationScore}%</span>` : ''}
                  </span>` : ''}'''

if OLD_STATS_DISPLAY in js:
    js = js.replace(OLD_STATS_DISPLAY, NEW_STATS_DISPLAY)
    changes.append('Added obstacle/adaptation stats to result banner')

# ─── 10. Add judges comments section after category score grid ────────────────

OLD_CAT_GRID_END = '''          </div>
          <!-- カテゴリスコアグリッド END -->'''

# Instead, look for where the result banner ends and inject after
# Find the tutoring examples section and inject judges comments before it
OLD_TUTOR_SECTION_HEAD = "      <!-- 審査員コメント・講評 -->"

if OLD_TUTOR_SECTION_HEAD not in js:
    # Find the auto-score diagnostic panel start to inject judges section
    OLD_DIAG_PANEL = '<div class="sr-diag-panel"'
    if OLD_DIAG_PANEL in js:
        # Build judges comment injection target - find the detail panel header
        OLD_DETAIL_PANEL_HDR = '''        <!-- ② 詳細診断パネル -->'''
        NEW_DETAIL_PANEL_HDR = '''        <!-- ② 審査員コメント欄 -->
        ${autoResult.analysisStats && autoResult.analysisStats.judgesComments && autoResult.analysisStats.judgesComments.length > 0 ? `
        <div class="sr-judges-section" style="margin-bottom:16px">
          <div style="font-size:10px;letter-spacing:.1em;color:rgba(255,255,255,.4);font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:6px">
            <i class="fas fa-gavel" style="font-size:9px"></i>審査員コメント
            <span class="sr-v13-badge" style="margin-left:auto">v13</span>
          </div>
          ${autoResult.analysisStats.judgesComments.map(jc=>`
          <div class="sr-judge-card">
            <div class="sr-judge-name">${esc(jc.judge)}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span class="sr-judge-score">${jc.score}</span>
              <span style="font-size:9px;color:rgba(255,255,255,.4)">/5</span>
              <div style="flex:1;height:3px;background:rgba(255,255,255,.08);border-radius:2px">
                <div style="height:100%;width:${jc.score*20}%;background:${jc.score>=4?'#4ade80':jc.score>=3?'#fbbf24':'#f87171'};border-radius:2px"></div>
              </div>
            </div>
            <div class="sr-judge-comment">${esc(jc.comment)}</div>
          </div>`).join('')}
          ${autoResult.analysisStats.adaptationScore !== undefined ? `
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08)">
            <div style="font-size:10px;color:rgba(255,255,255,.4);font-weight:700;margin-bottom:8px"><i class="fas fa-video" style="margin-right:4px"></i>映像化適合スコア</div>
            <div class="sr-adapt-bar-wrap">
              <div class="sr-adapt-label"><span>映像化総合適合度</span><span style="color:${autoResult.analysisStats.adaptationScore>=70?'#4ade80':autoResult.analysisStats.adaptationScore>=50?'#fbbf24':'#f87171'};font-weight:800">${autoResult.analysisStats.adaptationScore}%</span></div>
              <div class="sr-adapt-bar"><div class="sr-adapt-fill" style="width:${autoResult.analysisStats.adaptationScore}%;background:${autoResult.analysisStats.adaptationScore>=70?'linear-gradient(90deg,#4ade80,#22c55e)':autoResult.analysisStats.adaptationScore>=50?'linear-gradient(90deg,#fbbf24,#eab308)':'linear-gradient(90deg,#f87171,#ef4444)'}"></div></div>
              <div class="sr-adapt-label"><span>商業適合度</span><span style="color:${autoResult.analysisStats.commercialScore>=4?'#4ade80':autoResult.analysisStats.commercialScore>=2?'#fbbf24':'#f87171'};font-weight:800">${['','▼','△','◇','○','◎'][autoResult.analysisStats.commercialScore]||''} ${autoResult.analysisStats.commercialScore}/5</span></div>
              <div class="sr-adapt-bar"><div class="sr-adapt-fill" style="width:${(autoResult.analysisStats.commercialScore||0)*20}%;background:linear-gradient(90deg,#60a5fa,#3b82f6)"></div></div>
            </div>
          </div>` : ''}
        </div>` : ''}

        <!-- ② 詳細診断パネル -->'''

        if OLD_DETAIL_PANEL_HDR in js:
            js = js.replace(OLD_DETAIL_PANEL_HDR, NEW_DETAIL_PANEL_HDR)
            changes.append('Injected judges comment panel before diagnostic panel')

# ─── 11. Add obstacle/tempo axes to category score grid ─────────────────────

# Find the extended axes display after main category grid (after .sr-cat-grid)
OLD_AFTER_CAT = '''          </div>
          <!-- カテゴリスコアグリッド END -->
        </div>
        <!-- ① END -->'''

NEW_AFTER_CAT = '''          </div>
          <!-- 拡張軸スコア (v13) -->
          ${autoResult.analysisStats && autoResult.analysisStats.obstacleScore !== undefined ? `
          <div style="padding:0 20px 14px;position:relative;border-top:1px solid rgba(255,255,255,.06)">
            <div style="font-size:9px;letter-spacing:.08em;color:rgba(255,255,255,.35);font-weight:700;margin-bottom:8px;margin-top:10px"><i class="fas fa-plus" style="font-size:7px;margin-right:3px"></i>拡張評価軸</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
              ${[
                { label:'障壁強度', val: autoResult.analysisStats.obstacleScore, max:5, icon:'fa-shield-halved' },
                { label:'テンポ・リズム', val: autoResult.analysisStats.tempoScore, max:5, icon:'fa-wave-square' },
                { label:'商業適合度', val: autoResult.analysisStats.commercialScore, max:5, icon:'fa-chart-line' },
              ].map(ax=>`<div style="background:rgba(255,255,255,.04);border-radius:6px;padding:8px 10px;border:1px solid rgba(255,255,255,.06)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                  <span style="font-size:8px;color:rgba(255,255,255,.45);font-weight:600;display:flex;align-items:center;gap:3px"><i class="fas ${ax.icon}" style="font-size:7px"></i>${ax.label}</span>
                  <span style="font-size:13px;font-weight:900;color:${ax.val>=4?'#4ade80':ax.val>=2?'#fbbf24':'#f87171'}">${ax.val}</span>
                </div>
                <div style="width:100%;height:3px;background:rgba(255,255,255,.08);border-radius:2px">
                  <div style="height:100%;width:${(ax.val/ax.max)*100}%;background:${ax.val>=4?'#4ade80':ax.val>=2?'#fbbf24':'#f87171'};border-radius:2px;transition:width .8s"></div>
                </div>
              </div>`).join('')}
            </div>
          </div>` : ''}
          <!-- カテゴリスコアグリッド END -->
        </div>
        <!-- ① END -->'''

if OLD_AFTER_CAT in js:
    js = js.replace(OLD_AFTER_CAT, NEW_AFTER_CAT)
    changes.append('Added extended axes grid (obstacle, tempo, commercial) to result banner')

# ─── 12. Add v13 mode badge to session card ──────────────────────────────────

OLD_SESSION_CARD_DATE = '''            <span>${dt}</span>
            ${ar && ar.analysisStats ? `<span style="color:var(--text-light)">·</span><span>${ar.analysisStats.sceneCount||0}シーン</span>` : ''}'''

NEW_SESSION_CARD_DATE = '''            <span>${dt}</span>
            ${s.evalMode ? `<span class="sr-mode-badge ${s.evalMode}">${{contest:'🏆コンクール',adaptation:'🎬映像化',school:'📚添削',general:'📊総合'}[s.evalMode]||s.evalMode}</span>` : ''}
            ${ar && ar.analysisStats ? `<span style="color:var(--text-light)">·</span><span>${ar.analysisStats.sceneCount||0}シーン</span>` : ''}'''

if OLD_SESSION_CARD_DATE in js:
    js = js.replace(OLD_SESSION_CARD_DATE, NEW_SESSION_CARD_DATE)
    changes.append('Added eval mode badge to session card')

# ─── 13. Improve quote extraction for cleaner presentation ───────────────────

# Find diagnostic note rendering and enhance the quote display
OLD_DIAG_NOTE_QUOTE = '''              ${note.quote ? `<div class="sr-cite-block ${note.type==='bad'?'cite-bad':note.type==='good'?'cite-good':'cite-warn'}">
                <div class="sr-cite-label">${note.type==='bad'?'<i class="fas fa-quote-left"></i> 問題箇所（脚本より引用）':note.type==='good'?'<i class="fas fa-quote-left"></i> 好評価箇所（脚本より引用）':'<i class="fas fa-quote-left"></i> 該当箇所（脚本より引用）'}</div>
                <div class="sr-cite-body">${esc(note.quote)}</div>
              </div>` : ''}'''

NEW_DIAG_NOTE_QUOTE = '''              ${note.quote ? `<div class="sr-quote-v13">
                <div class="sr-quote-v13-label ${note.type==='bad'?'bad':note.type==='good'?'good':'warn'}">
                  <i class="fas ${note.type==='bad'?'fa-file-circle-xmark':note.type==='good'?'fa-file-circle-check':'fa-file-circle-exclamation'}" style="margin-right:4px"></i>${note.type==='bad'?'問題箇所（脚本より引用）':note.type==='good'?'好評価箇所（脚本より引用）':'確認箇所（脚本より引用）'}
                </div>
                <div class="sr-quote-v13-body ${note.type==='bad'?'bad':note.type==='good'?'good':'warn'}">${esc((note.quote||'').slice(0,300))}${(note.quote||'').length>300?'…':''}</div>
                ${note.improve ? `<div class="sr-quote-v13-improve"><i class="fas fa-arrow-right" style="color:var(--fuji);margin-right:4px"></i>${esc(note.improve)}</div>` : ''}
              </div>` : ''}'''

if OLD_DIAG_NOTE_QUOTE in js:
    js = js.replace(OLD_DIAG_NOTE_QUOTE, NEW_DIAG_NOTE_QUOTE)
    changes.append('Upgraded quote display to sr-quote-v13 with cleaner layout and improve hint')

# ─── 14. Add 'improve' field to key diagnostic notes in engine ──────────────

# Add improve hint to want/need bad note
OLD_WANT_NEED_BAD = '''      if (wantNeedScore <= 2) {
        const fsi = nonEmpty.findIndex(l => l.length > 5 && !isSceneLine(l) && !charDialPat.test(l));'''

NEW_WANT_NEED_BAD = '''      if (wantNeedScore <= 2) {
        const fsi = nonEmpty.findIndex(l => l.length > 5 && !isSceneLine(l) && !charDialPat.test(l));'''

# Instead patch the badNote.improve for wantNeed
OLD_WANT_NEED_PUSH = """        notes.push(wantNeedBadNote);
      } else if (wantNeedScore >= 4) {"""

NEW_WANT_NEED_PUSH = """        wantNeedBadNote.improve = '改稿例: 主人公が最初のシーンで「〜したい（Want）」という行動を取り、第二幕中盤でその追求が「〜が本当に必要だ（Need）」という内的葛藤と衝突するシーンを明示してください。';
        notes.push(wantNeedBadNote);
      } else if (wantNeedScore >= 4) {"""

if OLD_WANT_NEED_PUSH in js:
    js = js.replace(OLD_WANT_NEED_PUSH, NEW_WANT_NEED_PUSH)
    changes.append('Added improve hint to want/need bad note')

# Add improve hint to subtext bad note
OLD_SUBTEXT_IMPROVE = """        subtextBadNote.quote = onTheNoseLines.slice(0,3).map(l=>l.trim()).join('\\n');"""
NEW_SUBTEXT_IMPROVE = """        subtextBadNote.quote = onTheNoseLines.slice(0,3).map(l=>l.trim()).join('\\n');
        subtextBadNote.improve = '改稿ヒント: 感情や情報を直接セリフで言わせず、「行動」「小道具」「環境」「沈黙」で表現してください。例: 「悲しい」→「コーヒーを三杯淹れて全部捨てる」。';"""

if OLD_SUBTEXT_IMPROVE in js:
    js = js.replace(OLD_SUBTEXT_IMPROVE, NEW_SUBTEXT_IMPROVE)
    changes.append('Added improve hint to subtext bad note')

# ─── 15. Inject obstacle strength diagnostic note ────────────────────────────

OLD_PROD_NOTES = '''      // ── 映像化実現性診断 ───────────────────────────────────────────────'''
NEW_PROD_NOTES = '''      // ── 障壁・対立強度 診断 (v13) ──────────────────────────────────────
      const obstacleKwLocal = ['だめだ','無理だ','できない','阻む','拒否','拒絶','邪魔','妨げ','追い込む','逃げ場','崖','罠','裏切','誤解','嘘','秘密','危機','絶体絶命','どん底','失敗','挫折','壊れ','奪われ','失って','諦め','限界'];
      const obstCountLocal = obstacleKwLocal.reduce((n,kw)=>n+(text.match(new RegExp(kw,'g'))||[]).length,0);
      const obstScoreLocal = Math.min(5, Math.round(obstCountLocal / Math.max(1,sceneLines.length) * 2.5));
      if (obstScoreLocal <= 1) {
        const obstLine = nonEmpty.find(l=>l.length>10 && !isSceneLine(l));
        const obstBadNote = {
          type: 'bad',
          label: '障壁・対立強度が不足',
          text: `主人公の前に立ちはだかる障壁（物理的・心理的・人間関係的）が希薄です。障壁が弱いと物語は平板になります。現在の対立キーワード検出数: ${obstCountLocal}件（${sceneLines.length}シーン中）。\n\n「主人公が〜しようとすると〜によって阻まれる」という構造を各シーンに組み込んでください。障壁は外的（他者・状況）と内的（自己の恐れ・信念・傷）の両方が必要です。`,
          quote: obstLine ? obstLine.trim() : '',
          improve: '改稿例: 主人公が目標に向かって一歩踏み出すたびに、より大きな壁が現れる「エスカレーション」構造を設計してください。第一幕の小さな障壁 → 第二幕の大きな挫折 → 第三幕の絶体絶命。',
        };
        notes.push(obstBadNote);
      } else if (obstScoreLocal >= 4) {
        const obstGoodNote = {
          type: 'good',
          label: '障壁・対立強度が高い',
          text: `主人公の前に立ちはだかる障壁が十分に設定されています。対立キーワード${obstCountLocal}件を検出。物語に緊張感があり、読み手を引きつける力があります。この障壁の強度を最終シーンまで維持・強化してください。`,
        };
        notes.push(obstGoodNote);
      }

      // ── 映像化実現性診断 ───────────────────────────────────────────────'''

if OLD_PROD_NOTES in js and '障壁・対立強度 診断' not in js:
    js = js.replace(OLD_PROD_NOTES, NEW_PROD_NOTES)
    changes.append('Added obstacle strength diagnostic note in engine')

# ─── 16. Add school-mode specific diagnostic note ────────────────────────────

OLD_FORMAT_NOTES = '''      // ── フォーマット診断 ────────────────────────────────────────────────'''
NEW_FORMAT_NOTES = '''      // ── シナリオ学校添削モード追加診断 (v13) ─────────────────────────────
      if (mode === 'school') {
        // 基礎フォーマット完全チェック
        const hasSceneNumbers = nonEmpty.some(l=>/^[０-９0-9]+[○◎●]/.test(l));
        const hasActBreaks = nonEmpty.some(l=>/第[一二三1-3]幕|ACT\s*[123]/i.test(l));
        const hasParentheticals = nonEmpty.some(l=>/^[（(].+[）)]/.test(l));
        const schoolNotes = [];
        if (!hasSceneNumbers) schoolNotes.push('シーン番号（例: １○）がありません。プロ形式では各シーン柱書きに番号を付けます。');
        if (!hasActBreaks && sceneLines.length > 5) schoolNotes.push('幕区切り（第一幕・第二幕・第三幕）が明示されていません。学習段階では構造を明示することで自己点検しやすくなります。');
        if (!hasParentheticals) schoolNotes.push('演技指示（括弧書き）がありません。「（間）」「（苦笑いして）」など感情・動作指示を適切に使ってください。');

        if (schoolNotes.length > 0) {
          const schoolNote = {
            type: 'bad',
            label: '【添削】基礎フォーマット確認事項',
            text: schoolNotes.map((n,i)=>`${i+1}. ${n}`).join('\\n\\n'),
            improve: '正しい形式例:\\n１○病院・廊下（昼）\\n田中（苦笑いして）\\n「大丈夫ですよ」',
          };
          notes.push(schoolNote);
        }

        // 文体アドバイス
        const verboseAction = nonEmpty.filter(l=>!isSceneLine(l)&&!charDialPat.test(l)&&l.length>60).slice(0,1);
        if (verboseAction.length > 0) {
          const verbNote = {
            type: 'warn',
            label: '【添削】ト書きを簡潔に',
            text: 'ト書きが長すぎます。ト書きは「カメラが捉えるもの」だけを書いてください。感情・心理は書かず、外から見える行動と環境だけを。原則: 1アクション = 1行。',
            quote: verboseAction[0].trim(),
            improve: '改稿: 長いト書きを3行以内に圧縮し、感情的な形容詞を削除してください。「田中は深い悲しみに暮れながらゆっくりと立ち上がり、」→「田中、立ち上がる。」',
          };
          notes.push(verbNote);
        }
      }

      // ── フォーマット診断 ────────────────────────────────────────────────'''

if OLD_FORMAT_NOTES in js and 'シナリオ学校添削モード追加診断' not in js:
    js = js.replace(OLD_FORMAT_NOTES, NEW_FORMAT_NOTES)
    changes.append('Added school-mode specific diagnostic notes')

# ─── 17. Update export report to show eval mode ──────────────────────────────

OLD_EXPORT_HEADER = "  text += `タイトル  : ${s.title || '無題の脚本'}\\n`;"
NEW_EXPORT_HEADER = """  text += `タイトル  : ${s.title || '無題の脚本'}\\n`;
  const modeLabels = { contest:'コンクール審査モード', adaptation:'映像化適合モード', school:'シナリオ学校添削モード', general:'総合評価モード' };
  if (s.evalMode) text += `評価モード: ${modeLabels[s.evalMode]||s.evalMode}\\n`;"""

if OLD_EXPORT_HEADER in js:
    js = js.replace(OLD_EXPORT_HEADER, NEW_EXPORT_HEADER)
    changes.append('Export report now includes eval mode label')

# Add judges comments to export
OLD_EXPORT_FOOTER = '  text += `\\n${bar}\\n  Generated by シナリオラボ 職員室 自動採点システム v4.2\\n  18項目・7軸コンクール審査員評価エンジン\\n${bar}\\n`;'
NEW_EXPORT_FOOTER = '''  // 審査員コメントをエクスポート
  if (ar && ar.analysisStats && ar.analysisStats.judgesComments && ar.analysisStats.judgesComments.length > 0) {
    text += `\\n${line}\\n審査員コメント\\n${line}\\n`;
    ar.analysisStats.judgesComments.forEach(jc => {
      text += `\\n【${jc.judge}】スコア: ${jc.score}/5\\n${jc.comment}\\n`;
    });
  }
  if (ar && ar.analysisStats) {
    if (ar.analysisStats.adaptationScore !== undefined) text += `\\n映像化適合スコア: ${ar.analysisStats.adaptationScore}%\\n`;
    if (ar.analysisStats.commercialScore !== undefined) text += `商業適合度: ${ar.analysisStats.commercialScore}/5\\n`;
    if (ar.analysisStats.obstacleScore !== undefined) text += `障壁強度: ${ar.analysisStats.obstacleScore}/5\\n`;
    if (ar.analysisStats.tempoScore !== undefined) text += `テンポ・リズム: ${ar.analysisStats.tempoScore}/5\\n`;
  }
  text += `\\n${bar}\\n  Generated by シナリオラボ 職員室 自動採点システム v13\\n  24項目・8軸・評価モード対応エンジン\\n${bar}\\n`;'''

if OLD_EXPORT_FOOTER in js:
    js = js.replace(OLD_EXPORT_FOOTER, NEW_EXPORT_FOOTER)
    changes.append('Export now includes judges comments, adaptation/obstacle/tempo scores')

# ─── 18. Add annotated script button in result banner action row ─────────────

OLD_CLEAR_BTN = '''              <button onclick="staffRoomClearAutoScore('${s.id}')" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.6);border-radius:6px;width:22px;height:22px;font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s" title="結果をクリア" onmouseover="this.style.background='rgba(255,68,68,.3)'" onmouseout="this.style.background='rgba(255,255,255,.08)'"><i class="fas fa-times"></i></button>'''

NEW_CLEAR_BTN = '''              <button onclick="staffRoomGenerateAnnotatedScript('${s.id}')" style="background:rgba(99,102,241,.2);border:1px solid rgba(99,102,241,.3);color:rgba(165,180,252,.9);border-radius:6px;height:22px;padding:0 8px;font-size:9px;cursor:pointer;display:flex;align-items:center;gap:3px;font-weight:600" title="アノテーション付き脚本を表示"><i class="fas fa-file-lines"></i> 脚本注釈</button>
              <button onclick="staffRoomClearAutoScore('${s.id}')" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.6);border-radius:6px;width:22px;height:22px;font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s" title="結果をクリア" onmouseover="this.style.background='rgba(255,68,68,.3)'" onmouseout="this.style.background='rgba(255,255,255,.08)'"><i class="fas fa-times"></i></button>'''

if OLD_CLEAR_BTN in js:
    js = js.replace(OLD_CLEAR_BTN, NEW_CLEAR_BTN)
    changes.append('Added annotated script button to result banner header')

# ─── 19. Write files ─────────────────────────────────────────────────────────

with open(JS_PATH, 'w', encoding='utf-8') as f:
    f.write(js)
with open(CSS_PATH, 'w', encoding='utf-8') as f:
    f.write(css)

print(f'v13 Patch Applied: {len(changes)} changes')
for i, c in enumerate(changes, 1):
    print(f'  {i:2d}. {c}')

# Syntax check
import subprocess
result = subprocess.run(['node', '--check', JS_PATH], capture_output=True, text=True)
if result.returncode == 0:
    print('\n✅ JavaScript syntax OK')
else:
    print('\n❌ JavaScript syntax ERROR:')
    print(result.stderr[:2000])
