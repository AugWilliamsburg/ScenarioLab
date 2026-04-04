#!/usr/bin/env python3
"""
Scenario Lab v12 – Comprehensive patch
UI/UX redesign + scoring engine refinement
"""
import re, sys

JS_PATH  = 'public/static/app.js'
CSS_PATH = 'public/static/app.css'

def load(p):
    with open(p, encoding='utf-8') as f: return f.read()
def save(p, s):
    with open(p, 'w', encoding='utf-8') as f: f.write(s)

# ══════════════════════════════════════════════════════════════════
# 1. CSS – Add v12 design tokens and overrides at end of file
# ══════════════════════════════════════════════════════════════════
css = load(CSS_PATH)

V12_CSS = r"""

/* ══════════════════════════════════════════════════════
   Scenario Lab v12 — 精密UI刷新 / Design System 2.0
   ══════════════════════════════════════════════════════ */

/* ── v12: 全体バナー ─────────────────────────────────── */
.sr-result-banner {
  background: linear-gradient(145deg, #0c0820 0%, #160d3a 40%, #071428 70%, #040c1c 100%);
  border-radius: 18px;
  padding: 0;
  color: #fff;
  position: relative;
  overflow: hidden;
  box-shadow: 0 16px 64px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.06);
}
.sr-result-banner::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 80% 10%, rgba(138,43,226,.12) 0%, transparent 60%),
              radial-gradient(ellipse at 20% 80%, rgba(59,130,246,.08) 0%, transparent 50%);
  pointer-events: none;
}

/* ── v12: バナーヘッダーバー ─────────────────────────── */
.sr-banner-topbar {
  padding: 11px 20px;
  border-bottom: 1px solid rgba(255,255,255,.06);
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}
.sr-banner-label {
  font-size: 10px;
  letter-spacing: .14em;
  color: rgba(255,255,255,.38);
  font-weight: 600;
  text-transform: uppercase;
}
.sr-version-tag {
  font-size: 8.5px;
  background: rgba(138,43,226,.22);
  color: rgba(200,160,255,.85);
  border: 1px solid rgba(138,43,226,.38);
  border-radius: 4px;
  padding: 1px 6px;
  font-weight: 700;
  letter-spacing: .04em;
}
.sr-engine-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 8px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 8px;
  background: linear-gradient(90deg,rgba(109,40,217,.1),rgba(59,130,246,.08));
  color: rgba(180,140,255,.9);
  border: 1px solid rgba(109,40,217,.2);
  letter-spacing: .05em;
  white-space: nowrap;
}

/* ── v12: スコアサークル ─────────────────────────────── */
.sr-score-circle-wrap {
  position: relative;
  flex-shrink: 0;
}
.sr-score-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border: 3px solid rgba(255,255,255,.14);
  box-shadow: 0 8px 32px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.1);
  position: relative;
}
.sr-score-num {
  font-size: 30px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -.02em;
}
.sr-score-denom {
  font-size: 9px;
  opacity: .6;
  letter-spacing: .04em;
  margin-top: 1px;
}
.sr-score-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px dashed rgba(255,255,255,.07);
  pointer-events: none;
}

/* ── v12: グレード表示 ──────────────────────────────── */
.sr-grade-text {
  font-size: 32px;
  font-weight: 900;
  font-family: 'Noto Serif JP', serif;
  line-height: 1;
  text-shadow: 0 2px 16px rgba(0,0,0,.5);
}
.sr-grade-label {
  font-size: 13px;
  font-weight: 800;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.sr-summary-text {
  font-size: 12px;
  line-height: 1.8;
  color: rgba(255,255,255,.68);
  margin-top: 4px;
}

/* ── v12: カテゴリスコアグリッド ────────────────────── */
.sr-cat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 0 20px 20px;
  position: relative;
}
@media (max-width: 600px) {
  .sr-cat-grid { grid-template-columns: repeat(2, 1fr); }
}
.sr-cat-cell {
  position: relative;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 10px;
  padding: 9px 12px 10px;
  transition: background .15s;
}
.sr-cat-cell:hover { background: rgba(255,255,255,.07); }
.sr-cat-cell.cell-lowest {
  border-color: rgba(239,68,68,.3);
  background: rgba(239,68,68,.06);
}
.sr-cat-cell.cell-highest {
  border-color: rgba(34,197,94,.25);
  background: rgba(34,197,94,.04);
}
.sr-cat-label {
  font-size: 9px;
  color: rgba(255,255,255,.46);
  line-height: 1.3;
  font-weight: 600;
  flex: 1;
  padding-right: 4px;
  min-width: 0;
}
.sr-cat-score {
  font-size: 16px;
  font-weight: 900;
  line-height: 1;
  flex-shrink: 0;
}
.sr-cat-bar-track {
  width: 100%;
  height: 3px;
  background: rgba(255,255,255,.08);
  border-radius: 2px;
  margin-top: 6px;
  overflow: hidden;
}
.sr-cat-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width .8s cubic-bezier(.16,1,.3,1);
}
.sr-cat-badge {
  position: absolute;
  top: -6px;
  right: 8px;
  font-size: 7px;
  border-radius: 3px;
  padding: 1px 5px;
  font-weight: 800;
  letter-spacing: .04em;
  color: #fff;
}

/* ── v12: 診断ノートパネル ───────────────────────────── */
.sr-diag-panel {
  margin-top: 10px;
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  background: var(--bg-white);
  box-shadow: 0 2px 8px rgba(0,0,0,.04);
}
.sr-diag-panel-header {
  padding: 12px 16px;
  background: linear-gradient(90deg, var(--bg-subtle), var(--bg-white));
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  transition: background .15s;
}
.sr-diag-panel-header:hover { background: var(--bg-subtle); }
.sr-diag-panel-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}
.sr-diag-count-chip {
  font-size: 10px;
  color: var(--text-muted);
  background: var(--bg-canvas);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1px 7px;
}
.sr-diag-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
}

/* ── v12: 診断ノートカード（リデザイン） ──────────────── */
.sr-notes-container {
  padding: 6px 0;
}
.sr-diag-note {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 11px 16px;
  border-bottom: 1px solid rgba(0,0,0,.04);
  transition: background .12s;
  position: relative;
}
.sr-diag-note:last-child { border-bottom: none; }
.sr-diag-note.note-good {
  background: rgba(22,163,74,.022);
  border-left: 3px solid rgba(22,163,74,.5);
}
.sr-diag-note.note-bad  {
  background: rgba(220,38,38,.02);
  border-left: 3px solid rgba(220,38,38,.45);
}
.sr-diag-note.note-warn {
  background: rgba(217,119,6,.018);
  border-left: 3px solid rgba(217,119,6,.4);
}
.sr-diag-note:hover { background: rgba(0,0,0,.02); }
.sr-diag-note-icon {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  margin-top: 1px;
  font-size: 8px;
  color: #fff;
}
.note-good .sr-diag-note-icon {
  background: linear-gradient(135deg, #16a34a, #22c55e);
  box-shadow: 0 2px 6px rgba(22,163,74,.35);
}
.note-bad .sr-diag-note-icon {
  background: linear-gradient(135deg, #b91c1c, #dc2626);
  box-shadow: 0 2px 6px rgba(220,38,38,.35);
}
.note-warn .sr-diag-note-icon {
  background: linear-gradient(135deg, #b45309, #d97706);
  box-shadow: 0 2px 6px rgba(217,119,6,.3);
}
.sr-diag-note-text {
  font-size: 12px;
  line-height: 1.8;
  color: var(--text-primary);
  font-weight: 450;
  letter-spacing: .01em;
}

/* ── v12: 引用ブロック（抜本再設計） ──────────────────── */
.sr-cite-block {
  position: relative;
  border-radius: 0 8px 8px 0;
  padding: 9px 13px 10px 14px;
  margin-top: 9px;
  border-left-width: 3px;
  border-left-style: solid;
  overflow-wrap: break-word;
  word-break: break-word;
  transition: opacity .15s;
}
.sr-cite-block.cite-bad {
  border-left-color: #dc2626;
  background: linear-gradient(to right, rgba(220,38,38,.05), rgba(220,38,38,.02));
  border-top: 1px solid rgba(220,38,38,.1);
  border-right: 1px solid rgba(220,38,38,.06);
  border-bottom: 1px solid rgba(220,38,38,.06);
}
.sr-cite-block.cite-good {
  border-left-color: #16a34a;
  background: linear-gradient(to right, rgba(22,163,74,.05), rgba(22,163,74,.02));
  border-top: 1px solid rgba(22,163,74,.1);
  border-right: 1px solid rgba(22,163,74,.06);
  border-bottom: 1px solid rgba(22,163,74,.06);
}
.sr-cite-block.cite-warn {
  border-left-color: #d97706;
  background: linear-gradient(to right, rgba(217,119,6,.05), rgba(217,119,6,.02));
  border-top: 1px solid rgba(217,119,6,.1);
  border-right: 1px solid rgba(217,119,6,.06);
  border-bottom: 1px solid rgba(217,119,6,.06);
}
.sr-cite-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.cite-bad  .sr-cite-label { color: #b91c1c; }
.cite-good .sr-cite-label { color: #15803d; }
.cite-warn .sr-cite-label { color: #b45309; }
.sr-cite-text {
  font-family: 'Noto Serif JP', 'Yu Mincho', '游明朝', Georgia, serif;
  font-size: 11.5px;
  line-height: 2.05;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  color: var(--text-secondary);
  letter-spacing: .015em;
}
.cite-bad  .sr-cite-text { color: #7f1d1d; }
.cite-good .sr-cite-text { color: #14532d; }
.cite-warn .sr-cite-text { color: #78350f; }
.sr-cite-arrow {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9.5px;
  font-weight: 700;
  margin-top: 6px;
  padding-top: 6px;
  letter-spacing: .015em;
}
.cite-bad  .sr-cite-arrow { color: #b91c1c; border-top: 1px dashed rgba(220,38,38,.22); }
.cite-warn .sr-cite-arrow { color: #b45309; border-top: 1px dashed rgba(217,119,6,.22); }
.cite-good .sr-cite-arrow { color: #15803d; border-top: 1px dashed rgba(22,163,74,.22); }

/* ── v12: タブUI ───────────────────────────────────────── */
.sr-fb-tabs {
  display: flex;
  border-bottom: 2px solid var(--border);
  overflow-x: auto;
  scrollbar-width: none;
  background: var(--bg-white);
}
.sr-fb-tabs::-webkit-scrollbar { display: none; }
.sr-fb-tab {
  flex-shrink: 0;
  padding: 9px 16px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: all .15s;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  letter-spacing: .01em;
}
.sr-fb-tab:hover { color: var(--text-primary); background: var(--bg-subtle); }
.sr-fb-tab.active {
  color: var(--fuji, #7c3aed);
  border-bottom-color: var(--fuji, #7c3aed);
  background: var(--bg-white);
  font-weight: 700;
}

/* ── v12: 強みカード ────────────────────────────────────── */
.sr-strength-item {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  padding: 9px 12px;
  margin-bottom: 5px;
  background: linear-gradient(to right, rgba(22,163,74,.05), rgba(22,163,74,.02));
  border: 1px solid rgba(22,163,74,.2);
  border-left: 3px solid #16a34a;
  border-radius: 9px;
  transition: transform .12s, box-shadow .12s;
}
.sr-strength-item:hover {
  transform: translateX(2px);
  box-shadow: 0 3px 12px rgba(22,163,74,.1);
}
.sr-strength-icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #16a34a, #22c55e);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  margin-top: 1px;
  font-size: 7px;
  color: #fff;
  box-shadow: 0 2px 6px rgba(22,163,74,.3);
}
.sr-strength-text {
  flex: 1;
  font-size: 12px;
  line-height: 1.75;
  color: var(--text-primary);
}

/* ── v12: 弱点カード ────────────────────────────────────── */
.sr-weakness-item {
  margin-bottom: 7px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(220,38,38,.18);
  border-left: 3px solid #dc2626;
  transition: box-shadow .15s;
}
.sr-weakness-item:hover { box-shadow: 0 4px 16px rgba(220,38,38,.1); }
.sr-weakness-item.critical {
  border-color: rgba(220,38,38,.35);
  border-left-color: #b91c1c;
}
.sr-weakness-header {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  padding: 8px 12px;
  background: rgba(220,38,38,.03);
}
.sr-weakness-icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #b91c1c, #dc2626);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  margin-top: 2px;
  font-size: 7px;
  color: #fff;
  box-shadow: 0 2px 6px rgba(220,38,38,.25);
}
.sr-weakness-text {
  flex: 1;
  font-size: 12px;
  line-height: 1.75;
  color: var(--text-primary);
}

/* ── v12: 改稿提案カード ──────────────────────────────── */
.sr-suggestion-card {
  margin-bottom: 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow .2s;
  box-shadow: 0 1px 4px rgba(0,0,0,.04);
}
.sr-suggestion-card:hover { box-shadow: 0 5px 20px rgba(0,0,0,.08); }
.sr-suggestion-header {
  padding: 10px 14px;
  background: linear-gradient(90deg, rgba(234,179,8,.06), transparent);
  border-bottom: 1px solid rgba(234,179,8,.15);
  display: flex;
  gap: 9px;
  align-items: flex-start;
}
.sr-suggestion-number {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #b45309, #d97706);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 800;
  color: #fff;
  min-width: 20px;
  margin-top: 1px;
  box-shadow: 0 2px 6px rgba(180,83,9,.3);
}
.sr-suggestion-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.55;
}

/* ── v12: Before/After グリッド ─────────────────────── */
.sr-ba-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border-top: 1px solid var(--border);
}
@media (max-width: 520px) { .sr-ba-grid { grid-template-columns: 1fr; } }
.sr-ba-before {
  padding: 11px 14px;
  background: rgba(220,38,38,.025);
  border-right: 1px solid var(--border);
}
.sr-ba-after {
  padding: 11px 14px;
  background: rgba(22,163,74,.025);
}
.sr-ba-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.sr-ba-before .sr-ba-label { color: #b91c1c; }
.sr-ba-after  .sr-ba-label { color: #15803d; }
.sr-ba-text {
  font-family: 'Noto Serif JP', 'Yu Mincho', Georgia, serif;
  font-size: 11px;
  line-height: 1.95;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  margin: 0;
}
.sr-ba-before .sr-ba-text { color: #7f1d1d; }
.sr-ba-after  .sr-ba-text { color: #14532d; }

/* ── v12: 優先タスクカード ────────────────────────────── */
.sr-priority-card {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 14px;
  margin-bottom: 8px;
  border-radius: 10px;
  border: 1px solid transparent;
  transition: transform .15s;
}
.sr-priority-card:hover { transform: translateX(2px); }
.sr-priority-card.rank-1 {
  background: linear-gradient(135deg, rgba(220,38,38,.07), rgba(239,68,68,.02));
  border-color: rgba(220,38,38,.22);
  border-left: 3px solid #dc2626;
}
.sr-priority-card.rank-2 {
  background: linear-gradient(135deg, rgba(249,115,22,.06), transparent);
  border-color: rgba(249,115,22,.2);
  border-left: 3px solid #f97316;
}
.sr-priority-card.rank-3 {
  background: linear-gradient(135deg, rgba(234,179,8,.05), transparent);
  border-color: rgba(234,179,8,.2);
  border-left: 3px solid #eab308;
}

/* ── v12: チュータリングカード ────────────────────────── */
.sr-tutor-card {
  border: 1px solid var(--border);
  border-radius: 13px;
  overflow: hidden;
  margin-bottom: 14px;
  box-shadow: 0 2px 10px rgba(0,0,0,.05);
  transition: box-shadow .2s, transform .15s;
}
.sr-tutor-card:hover {
  box-shadow: 0 8px 28px rgba(0,0,0,.1);
  transform: translateY(-1px);
}
.sr-tutor-card-header {
  padding: 12px 15px;
  background: var(--bg-subtle);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.sr-tutor-urgency-badge {
  flex-shrink: 0;
  font-size: 8px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 10px;
  letter-spacing: .04em;
  margin-top: 2px;
  text-transform: uppercase;
}
.sr-tutor-urgency-badge.urgent {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}
.sr-tutor-urgency-badge.warning {
  background: #fef3c7;
  color: #78350f;
  border: 1px solid #fde68a;
}
.sr-tutor-urgency-badge.info {
  background: var(--fuji-bg, #f0eeff);
  color: var(--fuji);
  border: 1px solid var(--fuji-border, #e0d0ff);
}

/* ── v12: ルーブリックアイテム ─────────────────────────── */
.sr-rubric-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 0;
  border-bottom: 1px solid rgba(0,0,0,.05);
}
.sr-rubric-item:last-child { border-bottom: none; }

/* ── v12: セッションカード ───────────────────────────── */
.sr-session-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 13px 15px;
  cursor: pointer;
  background: var(--bg-white);
  transition: all .15s;
  position: relative;
  box-shadow: 0 1px 4px rgba(0,0,0,.04);
}
.sr-session-card:hover {
  border-color: rgba(107,70,193,.3);
  box-shadow: 0 4px 16px rgba(107,70,193,.08);
}
.sr-session-card.active {
  border-color: var(--fuji);
  box-shadow: 0 0 0 2px rgba(107,70,193,.15);
  background: rgba(107,70,193,.02);
}
.sr-session-score-badge {
  width: 46px;
  height: 46px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: 0 3px 10px rgba(0,0,0,.2);
}

/* ── v12: スタット統計チップ ──────────────────────────── */
.sr-stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 5px;
}
.sr-stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 9px;
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 12px;
  padding: 2px 8px;
  color: rgba(255,255,255,.58);
  font-weight: 600;
  white-space: nowrap;
}
.sr-stat-chip.alert {
  background: rgba(248,113,113,.14);
  border-color: rgba(248,113,113,.28);
  color: rgba(248,113,113,.88);
}
.sr-stat-chip.good {
  background: rgba(74,222,128,.1);
  border-color: rgba(74,222,128,.22);
  color: rgba(74,222,128,.88);
}

/* ── v12: 採点ボタン ──────────────────────────────────── */
.sr-score-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: transparent;
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-light);
  transition: all .15s;
}
.sr-score-btn:hover { transform: scale(1.1); }
.sr-score-btn.active { box-shadow: 0 2px 8px rgba(0,0,0,.15); }

/* ── v12: Feedback page – type badges ──────────────────── */
.fb-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 9.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  letter-spacing: .02em;
}

/* ── v12: 空状態プレースホルダー ──────────────────────── */
.sr-empty-state {
  text-align: center;
  padding: 56px 24px;
  color: var(--text-muted);
}
.sr-empty-icon {
  font-size: 40px;
  opacity: .15;
  display: block;
  margin-bottom: 14px;
}

/* ── v12: responsive fixes ──────────────────────────────── */
@media (max-width: 480px) {
  .sr-cat-grid { grid-template-columns: repeat(2, 1fr); gap: 4px; padding: 0 12px 14px; }
  .sr-ba-grid { grid-template-columns: 1fr; }
  .sr-fb-tabs { gap: 0; }
  .sr-fb-tab { padding: 8px 10px; font-size: 10.5px; }
}
"""

css += V12_CSS
save(CSS_PATH, css)
print(f"[v12] CSS updated: +{len(V12_CSS.splitlines())} lines")

# ══════════════════════════════════════════════════════════════════
# 2. JS – Update version label in banner
# ══════════════════════════════════════════════════════════════════
js = load(JS_PATH)

OLD_BANNER_LABEL = '18項目・7軸・脚本固有分析 v11'
NEW_BANNER_LABEL = '18項目・7軸・脚本固有分析 v12'
js = js.replace(OLD_BANNER_LABEL, NEW_BANNER_LABEL)

OLD_VER = 'SCENARIO LAB ─ 審査員採点レポート v11'
NEW_VER = 'SCENARIO LAB ─ 審査員採点レポート v12'
js = js.replace(OLD_VER, NEW_VER)

print("[v12] Version labels updated")

# ══════════════════════════════════════════════════════════════════
# 3. JS – Replace emoji in feedback page TYPE_INFO with icon labels
# ══════════════════════════════════════════════════════════════════
OLD_TYPEINFO = """  const TYPE_INFO = {
    positive: { label:'✅ 良い点', cls:'tag-green', color:'var(--green)' },
    issue:    { label:'❌ 問題点', cls:'tag-red', color:'var(--red)' },
    question: { label:'❓ 疑問',   cls:'tag-yellow', color:'var(--kogane)' },
    note:     { label:'📝 メモ',   cls:'tag-blue', color:'var(--fuji)' },
  };"""
NEW_TYPEINFO = """  const TYPE_INFO = {
    positive: { label:'良い点', icon:'fa-circle-check', cls:'tag-green', color:'var(--green)' },
    issue:    { label:'問題点', icon:'fa-circle-xmark', cls:'tag-red', color:'var(--red)' },
    question: { label:'疑問',   icon:'fa-circle-question', cls:'tag-yellow', color:'var(--kogane)' },
    note:     { label:'メモ',   icon:'fa-note-sticky', cls:'tag-blue', color:'var(--fuji)' },
  };"""
if OLD_TYPEINFO in js:
    js = js.replace(OLD_TYPEINFO, NEW_TYPEINFO)
    print("[v12] Feedback type icons updated (emoji removed)")
else:
    print("[v12] WARNING: TYPE_INFO not found, skipping")

# ══════════════════════════════════════════════════════════════════
# 4. JS – Fix the feedback-card type label rendering (was using {ti.label} which now needs icon)
# ══════════════════════════════════════════════════════════════════
OLD_CARD_TAG = "            <span class=\"tag ${ti.cls}\" style=\"font-size:10px\">${ti.label}</span>"
NEW_CARD_TAG = "            <span class=\"tag ${ti.cls}\" style=\"font-size:10px;display:inline-flex;align-items:center;gap:3px\"><i class=\"fas ${ti.icon||'fa-tag'}\" style=\"font-size:8px\"></i>${ti.label}</span>"
if OLD_CARD_TAG in js:
    js = js.replace(OLD_CARD_TAG, NEW_CARD_TAG)
    print("[v12] Feedback card tag icon added")

# ══════════════════════════════════════════════════════════════════
# 5. JS – Improve session list empty state (replace emoji 📝)
# ══════════════════════════════════════════════════════════════════
OLD_EMPTY = """    <div style=\"font-size:48px;margin-bottom:16px;opacity:.2\">📝</div>"""
NEW_EMPTY = """    <div style=\"font-size:40px;margin-bottom:16px;opacity:.15\"><i class=\"fas fa-scroll\" style=\"color:var(--fuji)\"></i></div>"""
if OLD_EMPTY in js:
    js = js.replace(OLD_EMPTY, NEW_EMPTY)
    print("[v12] Empty state emoji replaced")

# ══════════════════════════════════════════════════════════════════
# 6. JS – Improve session card design (cleaner structure)
# ══════════════════════════════════════════════════════════════════
OLD_SESSION_CARD_START = """    <div class=\"card\" style=\"cursor:pointer;padding:12px 14px;border-left:3px solid ${s.id===activeSessionId?'var(--fuji)':'var(--border)'};position:relative;transition:all .15s;${s.id===activeSessionId?'box-shadow:0 0 0 2px var(--fuji);background:var(--fuji-bg,#f8f4ff)':''}\" onclick=\"staffRoomOpenSession('${s.id}')\" onmouseover=\"if('${s.id}'!=='${activeSessionId}')this.style.borderLeftColor='var(--fuji)'\" onmouseout=\"if('${s.id}'!=='${activeSessionId}')this.style.borderLeftColor='var(--border)'\">"""
NEW_SESSION_CARD_START = """    <div class=\"sr-session-card ${s.id===activeSessionId?'active':''}\" onclick=\"staffRoomOpenSession('${s.id}')\">"""
if OLD_SESSION_CARD_START in js:
    js = js.replace(OLD_SESSION_CARD_START, NEW_SESSION_CARD_START)
    print("[v12] Session card HTML simplified")

# ══════════════════════════════════════════════════════════════════
# 7. JS – Replace score badge in session card
# ══════════════════════════════════════════════════════════════════
OLD_SCORE_BADGE = """          ${displayScore !== null ? `
          <div style=\"width:44px;height:44px;border-radius:10px;background:${scoreGradient};display:flex;align-items:center;justify-content:center;flex-direction:column;box-shadow:0 2px 8px rgba(0,0,0,.2)\">
            ${autoGrade ? `<span style=\"font-size:14px;font-weight:900;color:#fff;line-height:1\">${autoGrade}</span>` : ''}
            <span style=\"font-size:${autoGrade?'9':'13'}px;font-weight:700;color:${autoGrade?'rgba(255,255,255,.8)':'#fff'}\">${displayScore}</span>
          </div>
          <div style=\"font-size:9px;color:var(--text-muted);margin-top:1px\">${isAutoScore?'AI採点':'手動'}</div>` :
          `<div style=\"width:44px;height:44px;border-radius:10px;background:var(--bg-subtle);border:1px dashed var(--border);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1px\">
            <i class=\"fas fa-wand-magic-sparkles\" style=\"font-size:12px;color:var(--text-light)\"></i>
          </div>
          <div style=\"font-size:9px;color:var(--text-light);margin-top:1px\">未採点</div>`}"""
NEW_SCORE_BADGE = """          ${displayScore !== null ? `
          <div class=\"sr-session-score-badge\" style=\"background:${scoreGradient}\">
            ${autoGrade ? `<span style=\"font-size:15px;font-weight:900;color:#fff;line-height:1\">${autoGrade}</span>` : ''}
            <span style=\"font-size:${autoGrade?'9.5':'14'}px;font-weight:700;color:${autoGrade?'rgba(255,255,255,.75)':'#fff'}\">${displayScore}</span>
          </div>
          <div style=\"font-size:9px;color:var(--text-muted);margin-top:2px;text-align:center\">${isAutoScore?'AI採点':'手動'}</div>` :
          `<div class=\"sr-session-score-badge\" style=\"background:var(--bg-subtle);border:1px dashed var(--border)\">
            <i class=\"fas fa-sparkles\" style=\"font-size:13px;color:var(--text-light)\"></i>
          </div>
          <div style=\"font-size:9px;color:var(--text-light);margin-top:2px;text-align:center\">未採点</div>`}"""
if OLD_SCORE_BADGE in js:
    js = js.replace(OLD_SCORE_BADGE, NEW_SCORE_BADGE)
    print("[v12] Session score badge redesigned")
else:
    print("[v12] WARNING: Score badge block not found (whitespace may differ)")

# ══════════════════════════════════════════════════════════════════
# 8. JS – Improve diagnostic note rendering: better structure and readability
# ══════════════════════════════════════════════════════════════════
OLD_DIAG_NOTE_RENDER = """              <div class=\"sr-diag-note note-${typeClass}\">
                <div class=\"sr-diag-note-icon\"><i class=\"fas ${iconName}\"></i></div>
                <div style=\"flex:1;min-width:0\">
                  <div style=\"font-size:11.5px;line-height:1.75;color:var(--text-primary);font-weight:500\">${esc(n.text)}</div>
                  ${n.quote ? `<div class=\"sr-cite-block ${citeClass}\" style=\"margin-top:7px\">
                    <div class=\"sr-cite-label\"><i class=\"fas ${citeIcon}\" style=\"font-size:7px;margin-right:3px\"></i>${citeLabel}</div>
                    <div class=\"sr-cite-text\">${esc(n.quote)}</div>
                    ${n.type === 'bad' ? '<div class=\"sr-cite-arrow\"><i class=\"fas fa-arrow-right\" style=\"font-size:8px;margin-right:4px\"></i>この台詞・ト書きを改稿してください</div>' : ''}
                    ${n.type === 'warn' ? '<div class=\"sr-cite-arrow\" style=\"color:#b45309;border-top-color:rgba(217,119,6,.2)\"><i class=\"fas fa-lightbulb\" style=\"font-size:8px;margin-right:4px\"></i>改稿のヒントにしてください</div>' : ''}
                  </div>` : ''}
                </div>
              </div>"""
NEW_DIAG_NOTE_RENDER = """              <div class=\"sr-diag-note note-${typeClass}\">
                <div class=\"sr-diag-note-icon\"><i class=\"fas ${iconName}\"></i></div>
                <div style=\"flex:1;min-width:0\">
                  <div class=\"sr-diag-note-text\">${esc(n.text).replace(/\\n/g,'<br>')}</div>
                  ${n.quote ? `<div class=\"sr-cite-block ${citeClass}\">
                    <div class=\"sr-cite-label\"><i class=\"fas ${citeIcon}\" style=\"font-size:8px;margin-right:4px\"></i>${citeLabel}</div>
                    <div class=\"sr-cite-text\">${esc(n.quote)}</div>
                    ${n.type === 'bad' ? `<div class=\"sr-cite-arrow\"><i class=\"fas fa-arrow-right\" style=\"font-size:9px;margin-right:5px\"></i>この台詞・ト書きを改稿してください</div>` : ''}
                    ${n.type === 'warn' ? `<div class=\"sr-cite-arrow\"><i class=\"fas fa-lightbulb\" style=\"font-size:9px;margin-right:5px\"></i>改稿のヒントとして参照してください</div>` : ''}
                    ${n.type === 'good' ? `<div class=\"sr-cite-arrow\"><i class=\"fas fa-star\" style=\"font-size:8px;margin-right:5px\"></i>この表現・構造を他のシーンにも展開してください</div>` : ''}
                  </div>` : ''}
                </div>
              </div>"""
if OLD_DIAG_NOTE_RENDER in js:
    js = js.replace(OLD_DIAG_NOTE_RENDER, NEW_DIAG_NOTE_RENDER)
    print("[v12] Diagnostic note rendering improved")
else:
    print("[v12] WARNING: Diagnostic note render block not found")

# ══════════════════════════════════════════════════════════════════
# 9. JS – Improve strength item rendering in feedback tab
# ══════════════════════════════════════════════════════════════════
OLD_STR_CARD = """              return `<div style=\"display:flex;gap:8px;align-items:flex-start;padding:7px 10px;margin-bottom:4px;background:var(--matcha-bg,#f0fdf4);border:1px solid var(--matcha-border,#bbf7d0);border-radius:8px;border-left:3px solid var(--matcha)\">
                <span style=\"flex-shrink:0;margin-top:2px;width:16px;height:16px;border-radius:50%;background:var(--matcha);display:inline-flex;align-items:center;justify-content:center;min-width:16px;box-shadow:0 1px 4px rgba(34,197,94,.3)\"><i class=\"fas fa-check\" style=\"font-size:7px;color:#fff\"></i></span>
                <div style=\"flex:1;min-width:0\">
                  <div style=\"font-size:11.5px;line-height:1.7;color:var(--text-primary);font-weight:500\">${esc(content)}</div>
                </div>
                ${scoreVal !== null ? `<span style=\"flex-shrink:0;font-size:12px;font-weight:800;color:${scoreColor2};line-height:1\">${scoreVal}<span style=\"font-size:8px;opacity:.6\">/5</span></span>` : ''}
              </div>`;"""
NEW_STR_CARD = """              return `<div class=\"sr-strength-item\">
                <span class=\"sr-strength-icon\"><i class=\"fas fa-check\" style=\"font-size:7px\"></i></span>
                <div class=\"sr-strength-text\">${esc(content)}</div>
                ${scoreVal !== null ? `<span style=\"flex-shrink:0;font-size:12px;font-weight:800;color:${scoreColor2};line-height:1;white-space:nowrap\">${scoreVal}<span style=\"font-size:8px;opacity:.6\">/5</span></span>` : ''}
              </div>`;"""
if OLD_STR_CARD in js:
    js = js.replace(OLD_STR_CARD, NEW_STR_CARD)
    print("[v12] Strength card HTML simplified with class")
else:
    print("[v12] WARNING: Strength card not found")

# ══════════════════════════════════════════════════════════════════
# 10. JS – Improve weakness item rendering in feedback tab
# ══════════════════════════════════════════════════════════════════
OLD_WEAK_CARD = """              return `<div style=\"margin-bottom:6px;border:1px solid ${isCritical ? 'rgba(239,68,68,.3)' : 'rgba(239,68,68,.15)'};border-radius:8px;overflow:hidden;border-left:3px solid ${isCritical ? '#dc2626' : 'var(--momo)'}\">
                <div style=\"display:flex;gap:8px;align-items:flex-start;padding:7px 10px;background:${isCritical ? 'rgba(239,68,68,.06)' : 'rgba(239,68,68,.03)'}\">
                  <span style=\"flex-shrink:0;margin-top:2px;width:16px;height:16px;border-radius:50%;background:${isCritical ? '#dc2626' : 'var(--momo)'};display:inline-flex;align-items:center;justify-content:center;min-width:16px;box-shadow:0 1px 4px rgba(239,68,68,.25)\"><i class=\"fas fa-exclamation\" style=\"font-size:7px;color:#fff\"></i></span>
                  <div style=\"flex:1;min-width:0\">
                    <div style=\"font-size:11.5px;line-height:1.7;color:var(--text-primary);font-weight:500\">${esc(content)}</div>
                    ${isCritical ? '<div style=\"font-size:9.5px;color:#b91c1c;margin-top:3px;font-weight:600\"><i class=\"fas fa-circle-exclamation\" style=\"margin-right:3px\"></i>最優先改善項目</div>' : ''}
                  </div>
                  ${scoreVal !== null ? `<span style=\"flex-shrink:0;font-size:12px;font-weight:800;color:${isCritical ? '#dc2626' : 'var(--momo)'};line-height:1;white-space:nowrap\">${scoreVal}<span style=\"font-size:8px;opacity:.6\">/5</span></span>` : ''}
                </div>"""
NEW_WEAK_CARD = """              return `<div class=\"sr-weakness-item${isCritical ? ' critical' : ''}\">
                <div class=\"sr-weakness-header\">
                  <span class=\"sr-weakness-icon\"><i class=\"fas fa-exclamation\" style=\"font-size:7px\"></i></span>
                  <div style=\"flex:1;min-width:0\">
                    <div class=\"sr-weakness-text\">${esc(content)}</div>
                    ${isCritical ? '<div style=\"font-size:9.5px;color:#991b1b;margin-top:3px;font-weight:700;display:flex;align-items:center;gap:3px\"><i class=\"fas fa-circle-exclamation\" style=\"font-size:8px\"></i>最優先改善項目</div>' : ''}
                  </div>
                  ${scoreVal !== null ? `<span style=\"flex-shrink:0;font-size:12.5px;font-weight:800;color:${isCritical ? '#dc2626' : 'var(--momo)'};line-height:1;white-space:nowrap\">${scoreVal}<span style=\"font-size:8px;opacity:.6\">/5</span></span>` : ''}
                </div>"""
if OLD_WEAK_CARD in js:
    js = js.replace(OLD_WEAK_CARD, NEW_WEAK_CARD)
    print("[v12] Weakness card HTML improved")
else:
    print("[v12] WARNING: Weakness card not found")

# ══════════════════════════════════════════════════════════════════
# 11. JS – Improve ペーシング diagnostic: add actual long scene quote
# ══════════════════════════════════════════════════════════════════
# Find the pacing note section and add scene quote functionality
OLD_PACING_NOTE = """  // ── Want/Need 詳細（主人公名付き）
  if (scores['protag-want-need'] >= 4 && mainCharName) {
    notes.push({ type: 'good', text: 'Want/Need設計：「' + mainCharName + '」のWant（外的目標）とNeed（内的必要性）が明確で、ドラマの核として機能しています。この拮抗構造が物語の深みを生んでいます。' });
  }"""

NEW_PACING_NOTE = """  // ── ペーシング診断（v12拡張: 最長シーンの実際の内容を引用）
  if (scores['pacing'] <= 2 && sceneCount >= 2) {
    // 最長シーンを抽出して具体的に指摘
    const longestScene = (() => {
      // シーン区切りでテキストを分割し、最長シーンを見つける
      const sceneSections = [];
      let curSceneStart = -1, curSceneLabel = '';
      for (let _psi = 0; _psi < nonEmpty.length; _psi++) {
        if (isSceneLine(nonEmpty[_psi])) {
          if (curSceneStart >= 0) {
            sceneSections.push({ label: curSceneLabel, lines: nonEmpty.slice(curSceneStart+1, _psi) });
          }
          curSceneStart = _psi;
          curSceneLabel = nonEmpty[_psi];
        }
      }
      if (curSceneStart >= 0) {
        sceneSections.push({ label: curSceneLabel, lines: nonEmpty.slice(curSceneStart+1) });
      }
      return sceneSections.length > 0
        ? sceneSections.reduce((a, b) => a.lines.length > b.lines.length ? a : b)
        : null;
    })();
    const pacingBadNote = {
      type: 'warn',
      text: 'ペーシング：' + sceneCount + 'シーン中、緩急のリズムが弱い。'
        + (longestScene ? '最長シーン「' + (longestScene.label.length > 30 ? longestScene.label.slice(0,30)+'…' : longestScene.label) + '」が' + longestScene.lines.length + '行と長大です。' : '')
        + '\\n1シーン=1目的の原則：入場時と退場時で「何かが変化」しているか確認してください。'
        + '\\n変化がなければそのシーンはカットか、他のシーンに統合します。'
    };
    if (longestScene && longestScene.lines.length > 5) {
      const sampleLines = longestScene.lines.slice(0, 5).join('\\n');
      const lastLine = longestScene.lines[longestScene.lines.length - 1];
      pacingBadNote.quote = '最長シーン: ' + longestScene.label + '\\n\\n'
        + (sampleLines.length > 180 ? sampleLines.slice(0,180)+'…' : sampleLines)
        + '\\n（中略 / 計' + longestScene.lines.length + '行）'
        + (lastLine ? '\\n' + lastLine : '')
        + '\\n\\n↳ このシーンは「この会話が終わった後、何が変わったか？」を一文で答えられますか？'
        + '\\n  答えられなければ、ここを半分以下に圧縮してください。';
    }
    notes.push(pacingBadNote);
  } else if (scores['pacing'] >= 4 && sceneCount >= 3) {
    notes.push({ type: 'good', text: 'ペーシング：' + sceneCount + 'シーンの緩急が良好です。シーンの入退場が機能的で読み手を引き込みます。' + (memorableCount > 0 ? '記憶に残るシーンの要素（' + memorableCount + '箇所）が物語の波を作っています。' : '') });
  }

  // ── Want/Need 詳細（主人公名付き）
  if (scores['protag-want-need'] >= 4 && mainCharName) {
    notes.push({ type: 'good', text: 'Want/Need設計：「' + mainCharName + '」のWant（外的目標）とNeed（内的必要性）が明確で、ドラマの核として機能しています。この拮抗構造が物語の深みを生んでいます。' });
  }"""

if OLD_PACING_NOTE in js:
    js = js.replace(OLD_PACING_NOTE, NEW_PACING_NOTE)
    print("[v12] Pacing diagnostic enhanced with longest-scene quote")
else:
    print("[v12] WARNING: Pacing note anchor not found")

# ══════════════════════════════════════════════════════════════════
# 12. JS – Improve visual storytelling diagnostic with actual action line
# ══════════════════════════════════════════════════════════════════
OLD_VISUAL_NOTE = """  // ── ビジュアル診断
  if (scores['visual'] <= 2 && actionLines.length < 3) {
    notes.push({ type: 'bad', text: 'ビジュアル：映像的な描写が不足しています。「カメラで撮れるか？」を基準にト書きを書き直してください。音・光・質感・空間の使い方で感情を表現する映像言語を意識してください。' });
  } else if (scores['visual'] >= 4) {
    notes.push({ type: 'good', text: 'ビジュアル：映像的描写が豊富です。' + (sensoryCount >= 2 ? '五感の描写（' + sensoryCount + '箇所）が読者の脳内に映像を生み出しています。' : '') + (memorableCount > 0 ? '忘れられないシーンの要素（' + memorableCount + '箇所）があります。' : '') });
  }"""

NEW_VISUAL_NOTE = """  // ── ビジュアル診断（v12拡張）
  if (scores['visual'] <= 2) {
    // 映像的でない行を探す（感情語のあるト書き）
    const nonVisualAct = actionLines.find(l => ['悲しい','嬉しい','怒っ','うれしい','つらい','悲しんで','感じた','思った','悩んで'].some(k => l.includes(k)));
    const visualBadNote = {
      type: 'bad',
      text: 'ビジュアルストーリーテリング：映像的描写が弱い（ビジュアル行' + Math.round(visualRatio*100) + '%）。'
        + (!nonVisualAct && actionLines.length < 3 ? 'ト書き自体が少なすぎます。' : '')
        + '\\n脚本のト書きは「カメラで撮れるもの・マイクで収録できるもの」だけを書いてください。'
        + '\\n感情や内面状態は書かず、その感情が表れた「行動・物・空間・音」に変換します。'
    };
    if (nonVisualAct) {
      const firstAbstractKw = ['悲しい','嬉しい','怒っ','うれしい','つらい','悲しんで','感じた','思った'].find(k => nonVisualAct.includes(k)) || '感情語';
      visualBadNote.quote = '問題のト書き: ' + (nonVisualAct.length > 70 ? nonVisualAct.slice(0,70)+'…' : nonVisualAct)
        + '\\n\\n「' + firstAbstractKw + '」はカメラで撮れません。置き換え例:'
        + '\\n  ト書き: ' + (mainCharName || '田中') + '、立つ。窓に近づく。外の音——遠くで、何か。'
        + '\\n  （内面を行動・環境・音で代替）';
    } else if (actionLines.length > 0) {
      const firstAct = actionLines[0];
      visualBadNote.quote = '冒頭のト書き: ' + (firstAct.length > 70 ? firstAct.slice(0,70)+'…' : firstAct)
        + '\\n\\n↳ このシーンに「音・光・質感・距離感」を1つ追加してみてください。'
        + '\\n  例: 「（遠くで踏切の音）」「（蛍光灯がちらつく）」「（床の冷たさ）」';
    }
    notes.push(visualBadNote);
  } else if (scores['visual'] >= 4) {
    const visualGoodExample = (() => {
      const sKws = ['音', '光', '匂い', '冷たい', '温かい', '白い', '暗い', '静寂', '沈黙', '風'];
      return actionLines.find(l => sKws.some(k => l.includes(k)) && l.length >= 6 && l.length <= 60) || null;
    })();
    const visualGoodNote = {
      type: 'good',
      text: 'ビジュアルストーリーテリング：映像で語れています。'
        + (sensoryCount >= 2 ? '五感の描写（' + sensoryCount + '箇所）が読者の脳内に映像を生み出しています。' : '')
        + (memorableCount > 0 ? '記憶に残るシーン要素（' + memorableCount + '箇所）があります。' : '')
    };
    if (visualGoodExample) {
      visualGoodNote.quote = visualGoodExample + '\\n↑ 感覚・環境描写が映像を生む好例';
    }
    notes.push(visualGoodNote);
  }"""

if OLD_VISUAL_NOTE in js:
    js = js.replace(OLD_VISUAL_NOTE, NEW_VISUAL_NOTE)
    print("[v12] Visual diagnostic enhanced")
else:
    print("[v12] WARNING: Visual diagnostic anchor not found")

# ══════════════════════════════════════════════════════════════════
# 13. JS – Strengthen format diagnostic
# ══════════════════════════════════════════════════════════════════
OLD_FORMAT_NOTE = """  // ── フォーマット診断
  if (scores['format-correctness'] <= 2) {
    const fmtNote = { type: 'warn', text: '脚本フォーマット：①柱書き（番号＋○＋場所・時間帯）②ト書き（3行以内）③台詞（キャラ名「台詞」）の基本三要素が不揃いです。' + (!hasSceneNumbers && sceneCount > 0 ? 'シーン番号を追加してください（例: 1○教室・昼）。' : '') + 'プロ投稿ではフォーマットが審査対象です。' };
    if (!hasSceneNumbers && sceneLines.length > 0) {
      fmtNote.quote = sceneLines[0] + '\\n↳ この柱書きにシーン番号（1○ 2○ ...）を付けてください';
    } else if (!hasProperJapFormat) {
      const firstLine = nonEmpty[0] || '';
      fmtNote.quote = firstLine.slice(0,60) + (firstLine.length>60?'…':'') + '\\n↳ 柱書き形式（例: 1○場所・時間帯）が見当たりません';
    }
    notes.push(fmtNote);
  }"""

NEW_FORMAT_NOTE = """  // ── フォーマット診断（v12拡張）
  if (scores['format-correctness'] <= 2) {
    const fmtIssues = [];
    if (!hasSceneNumbers && sceneCount > 0) fmtIssues.push('シーン番号なし（例: 1○ではなく「教室・昼」のみ）');
    if (!hasProperJapFormat && sceneCount === 0) fmtIssues.push('柱書き（シーン区切り）が検出されません');
    if (parentheticalLines.length === 0 && totalDialogueLines > 3) fmtIssues.push('演技指示（カッコ書き）がゼロ');
    const fmtNote = {
      type: 'warn',
      text: '脚本フォーマット：正式な日本語脚本フォーマットを整えてください。'
        + (fmtIssues.length > 0 ? '\\n問題点: ' + fmtIssues.join('、') + '。' : '')
        + '\\n基本三要素: ①柱書き（番号○場所・時間帯）②ト書き（3行以内）③台詞（キャラ名「台詞」）。'
        + 'プロ投稿ではフォーマットも審査対象です。'
    };
    if (!hasSceneNumbers && sceneLines.length > 0) {
      fmtNote.quote = '現在の柱書き: ' + sceneLines[0]
        + '\\n\\n↳ 正しい形式: 1○' + sceneLines[0].replace(/^[○◯0-9１-９]+[○◯\s]*/, '')
        + '\\n  （先頭に連番を付け、○記号で場所と時間帯を区切る）';
    } else if (!hasProperJapFormat) {
      const firstLine = nonEmpty[0] || '';
      fmtNote.quote = '冒頭行: ' + (firstLine.length > 60 ? firstLine.slice(0,60)+'…' : firstLine)
        + '\\n\\n正しい柱書きの例:\\n  1○田中のアパート・夜\\n\\n  田中（30）、コップに水を注ぐ。\\n\\n  田中「（独り言）どこへ行った……」';
    }
    notes.push(fmtNote);
  } else if (scores['format-correctness'] >= 4) {
    const fmtGoodNote = {
      type: 'good',
      text: '脚本フォーマット：プロ水準の書式が整っています。'
        + (hasSceneNumbers ? 'シーン番号付きの柱書きが正しく配置されています。' : '')
        + (parentheticalLines.length > 0 ? '演技指示（' + parentheticalLines.length + '箇所）も適切です。' : '')
    };
    if (sceneLines.length > 0) {
      fmtGoodNote.quote = sceneLines[0] + '\\n↑ 正しい柱書き形式の好例';
    }
    notes.push(fmtGoodNote);
  }"""

if OLD_FORMAT_NOTE in js:
    js = js.replace(OLD_FORMAT_NOTE, NEW_FORMAT_NOTE)
    print("[v12] Format diagnostic enhanced")
else:
    print("[v12] WARNING: Format diagnostic not found")

# ══════════════════════════════════════════════════════════════════
# 14. JS – Improve originality diagnostic with more script-specific
# ══════════════════════════════════════════════════════════════════
OLD_ORIG_NOTE = """  // ── オリジナリティ診断
  if (scores['originality'] <= 2 && totalChars > 200) {
    notes.push({ type: 'warn', text: 'オリジナリティ：ジャンルの独自性や切り口が薄い。「このシナリオでしか描けない何か」を一言で言えますか？ジャンルの定番を1つ裏切る要素、あるいは固有の体験から来る独自ディテールを追加してください。' });
  } else if (scores['originality'] >= 4) {
    notes.push({ type: 'good', text: 'オリジナリティ：' + (detectedGenres.length >= 2 ? detectedGenres.join('×') + 'のジャンル交差で独自性があります。' : '') + (poeticCount >= 2 ? '詩的・比喩的表現（' + poeticCount + '箇所）が文体に個性を与えています。' : '') + '書き手独自の視点が感じられます。' });
  }"""

NEW_ORIG_NOTE = """  // ── オリジナリティ診断（v12拡張）
  if (scores['originality'] <= 2 && totalChars > 200) {
    // ジャンルが検出されている場合は、そのジャンルの定番からの逸脱を提案
    const genreForOrig = detectedGenres[0] || null;
    const origBadNote = {
      type: 'warn',
      text: 'オリジナリティ：独自の切り口・視点が弱い。'
        + (genreForOrig ? '「' + genreForOrig + '」ジャンルの定番展開の中に埋没しています。' : '')
        + '\\n強化の3手順:'
        + '\\n① この物語を一言で言える「裏切り」は何か？（ジャンルの定番を1つ裏返す）'
        + '\\n② この作家にしか書けない「固有の体験・記憶・違和感」を1シーンに盛り込む'
        + '\\n③ 「もし○○だったら？」の逆説的前提でシーンを1つ書き直す'
    };
    // 最も「ありきたり」な台詞を探して引用
    const genericPhrases = ['頑張れ', 'ありがとう', '大丈夫', 'わかった', 'そうか', 'なるほど', '信じてくれ', 'お前なら', 'きっとうまくいく'];
    const genericDlg = dialogueTexts.find(d => genericPhrases.some(p => d.includes(p)) && d.length > 3 && d.length < 40);
    if (genericDlg) {
      origBadNote.quote = '定番的な台詞: 「' + genericDlg + '」'
        + '\\n\\n↳ この台詞はこの脚本でしか言えない言葉ですか？'
        + '\\n  もし他の作品でも使えるなら、この状況・このキャラクターだけの言い方に書き直してください。'
        + (genreForOrig ? '\\n  例えば「' + genreForOrig + '」なら、あなたの作品だけが持つ「〇〇」という要素を使って。' : '');
    } else if (actionLines.length > 0) {
      origBadNote.quote = '（固有の体験・記憶からくる具体的ディテールが検出されません）'
        + '\\n\\n↳ あなた自身が「このシーンでしか使えない」と思うモノ・場所・音・時間を1つ書き込んでください。'
        + '\\n  例：「1998年製のラジカセ」「田端駅南口の、消えかけた自販機の光」';
    }
    notes.push(origBadNote);
  } else if (scores['originality'] >= 4) {
    const origGoodNote = {
      type: 'good',
      text: 'オリジナリティ：'
        + (detectedGenres.length >= 2 ? detectedGenres.join('×') + 'のジャンル交差で独自性があります。' : '書き手固有の視点が感じられます。')
        + (poeticCount >= 2 ? '詩的・比喩的表現（' + poeticCount + '箇所）が文体に個性を加えています。' : '')
        + (uniqueStructureKws.some(kw => text.includes(kw)) ? '構造面でも独自の試みが見られます。' : '')
    };
    if (itemDetails['originality'] && itemDetails['originality'].quote) {
      origGoodNote.quote = itemDetails['originality'].quote + '\\n↑ 固有の視点・ディテールが光る箇所';
    }
    notes.push(origGoodNote);
  }"""

if OLD_ORIG_NOTE in js:
    js = js.replace(OLD_ORIG_NOTE, NEW_ORIG_NOTE)
    print("[v12] Originality diagnostic enhanced")
else:
    print("[v12] WARNING: Originality diagnostic not found")

# ══════════════════════════════════════════════════════════════════
# 15. JS – Add naturalness/voice quality diagnostic (new)
# ══════════════════════════════════════════════════════════════════
OLD_PRODUCTIONVIABILITY_NOTE = """  // ── 映像化実現性診断
  if (scores['production-viability'] >= 4) {
    notes.push({ type: 'good', text: '映像化適性：低コスト・高効率に撮影できる設定で、プロデューサーが企画を通しやすい構成です。' + (indoorScenes > 0 && outdoorScenes > 0 ? '屋内外のバランスも良好。' : '') });
  } else if (productionScaleHeavy) {
    notes.push({ type: 'warn', text: '映像化コスト：VFX・大規模セット要素が含まれています。ドラマコンクールでは日常的な舞台設定の方が通過率が上がります。予算で実現できるか確認してください。' });
  }"""

NEW_PRODUCTIONVIABILITY_NOTE = """  // ── 自然さ・リズム診断（v12新規）
  if (scores['naturalness'] <= 2 && totalDialogueLines >= 4) {
    // 最も不自然な長い台詞を探す
    const unnaturalDlg = dialogueTexts.filter(d => d.length > 55).reduce((a, b) => a.length > b.length ? a : b, '');
    const naturalNote = {
      type: 'warn',
      text: 'セリフの自然さ：平均' + Math.round(avgDialogueLen) + '字と台詞が長い。'
        + '実際の会話は10〜35字が自然なリズムです。'
        + '\\n60字超の台詞は「説明台詞」「演説」になりがちです。'
        + '\\n改善方法: 1つの長い台詞を3〜4行に分割し、相手の反応（ト書きや短い返答）を挿入してください。'
    };
    if (unnaturalDlg.length > 0) {
      // 分割例を自動生成
      const parts = unnaturalDlg.slice(0, 55).split(/[、。！？]/).filter(p => p.trim().length > 0).slice(0, 2);
      const charGuessN = mainCharName || '田中';
      naturalNote.quote = '問題の台詞（' + unnaturalDlg.length + '字）:\\n「' + (unnaturalDlg.length > 85 ? unnaturalDlg.slice(0,85)+'…' : unnaturalDlg) + '」'
        + '\\n\\n↳ 分割改稿の例:'
        + '\\n  ' + charGuessN + '「' + (parts[0] || unnaturalDlg.slice(0,20)) + '——」'
        + '\\n  （相手、視線を外す）'
        + '\\n  ' + charGuessN + '「（続けて）……' + (parts[1] || unnaturalDlg.slice(20,38)) + '」';
    }
    notes.push(naturalNote);
  } else if (scores['naturalness'] >= 4 && totalDialogueLines >= 4) {
    notes.push({
      type: 'good',
      text: 'セリフの自然さ：平均' + Math.round(avgDialogueLen) + '字と適切な長さで、会話のリズムが良い。'
        + (avgDialogueLen <= 30 ? '特に短台詞の多用がテンポを生んでいます。' : '')
        + 'セリフを音読しても違和感がないレベルに達しています。'
    });
  }

  // ── 映像化実現性診断（v12拡張）
  if (scores['production-viability'] >= 4) {
    const prodGoodNote = {
      type: 'good',
      text: '映像化適性：低コスト・高効率に撮影できる設定で、プロデューサーが企画を通しやすい構成です。'
        + (indoorScenes > 0 && outdoorScenes > 0 ? '屋内外のバランスも良好。' : '')
        + (sceneCount <= 15 ? 'シーン数' + sceneCount + '（適切な規模）です。' : '')
    };
    if (sceneLines.length > 0) {
      const practicalSceneLine = sceneLines.find(l => practicalKws.some(k => l.includes(k)));
      if (practicalSceneLine) {
        prodGoodNote.quote = practicalSceneLine + '\\n↑ 実現可能な日常的舞台設定の好例';
      }
    }
    notes.push(prodGoodNote);
  } else if (productionScaleHeavy) {
    const heavySceneEx = sceneLines.find(l => vfxKws.some(k => l.includes(k))) || null;
    const prodWarnNote = {
      type: 'warn',
      text: '映像化コスト：VFX・大規模セット要素が含まれています。ドラマコンクールでは日常的な舞台設定の方が通過率が上がります。'
        + '\\n制作予算で実現できるか確認し、必要に応じて舞台設定を変換してください。'
    };
    if (heavySceneEx) {
      prodWarnNote.quote = heavySceneEx + '\\n\\n↳ この設定を「室内・少人数・日常」に変換できませんか？'
        + '\\n  同じドラマは、小さな空間でも成立します。';
    }
    notes.push(prodWarnNote);
  }"""

if OLD_PRODUCTIONVIABILITY_NOTE in js:
    js = js.replace(OLD_PRODUCTIONVIABILITY_NOTE, NEW_PRODUCTIONVIABILITY_NOTE)
    print("[v12] Naturalness diagnostic added + production-viability enhanced")
else:
    print("[v12] WARNING: Production-viability note anchor not found")

# ══════════════════════════════════════════════════════════════════
# 16. JS – Fix the diagnostic note rendering area: make text newlines into <br>
#     (Already handled in step 8 but let's ensure the main text area uses pre-wrap)
# ══════════════════════════════════════════════════════════════════
# Already done above

# ══════════════════════════════════════════════════════════════════
# 17. JS – Improve sr-cite-arrow for non-bad citations (already in step 8 for diag notes)
#     Also fix cite-arrow in rubric items
# ══════════════════════════════════════════════════════════════════
OLD_RUBRIC_CITE_ARROW = """              ${scoreVal<=2 ? '<div class=\"sr-cite-arrow\"><i class=\"fas fa-arrow-right\" style=\"font-size:8px;margin-right:4px\"></i>この箇所を改稿対象として確認してください</div>' : ''}\n            </div>` : ''}"""
NEW_RUBRIC_CITE_ARROW = """              ${scoreVal<=2 ? `<div class=\"sr-cite-arrow\"><i class=\"fas fa-arrow-right\" style=\"font-size:9px;margin-right:5px\"></i>この箇所を改稿対象として確認してください</div>` : scoreVal>=4 ? `<div class=\"sr-cite-arrow\"><i class=\"fas fa-star\" style=\"font-size:8px;margin-right:5px\"></i>この表現を他のシーンにも展開してください</div>` : ''}\n            </div>` : ''}"""
if OLD_RUBRIC_CITE_ARROW in js:
    js = js.replace(OLD_RUBRIC_CITE_ARROW, NEW_RUBRIC_CITE_ARROW)
    print("[v12] Rubric cite arrow improved")
else:
    print("[v12] WARNING: Rubric cite arrow not found (may have different formatting)")

# ══════════════════════════════════════════════════════════════════
# 18. JS – Add isSceneLine helper if not defined in scope of pacing note
#     (it is already defined in the engine, so just reference it)
# ══════════════════════════════════════════════════════════════════
# isSceneLine is already defined earlier in staffRoomAutoScore function

# ══════════════════════════════════════════════════════════════════
# 19. JS – Remove duplicate .sr-ba-grid CSS from old definition
#     (handled by CSS cascade; v12 definition at the end will win)
# ══════════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════════
# 20. JS – Improve the diagnostic panel header with color-coded note counts
# ══════════════════════════════════════════════════════════════════
OLD_DIAG_PANEL = """        <!-- ② 詳細診断パネル（折りたたみ式） -->
        <div style=\"margin-top:10px;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--bg-white)\">
          <div style=\"padding:12px 16px;background:var(--bg-subtle);display:flex;align-items:center;gap:8px;cursor:pointer;border-bottom:1px solid var(--border)\" onclick=\"const d=document.getElementById('sr-diag-${s.id}');const ic=document.getElementById('sr-diag-ic-${s.id}');const open=d.style.display!=='none';d.style.display=open?'none':'block';ic.style.transform=open?'':'rotate(180deg)'\">
            <i class=\"fas fa-microscope\" style=\"color:var(--fuji);font-size:12px\"></i>
            <span style=\"font-size:12px;font-weight:700;color:var(--text-primary)\">審査員診断ノート</span>
            <span style=\"font-size:9px;color:var(--fuji);background:var(--fuji-bg,#f0eeff);border:1px solid var(--fuji-border,#e0d0ff);border-radius:8px;padding:1px 6px;font-weight:600\">脚本引用つき</span>
            <span style=\"font-size:10px;color:var(--text-muted);background:var(--bg-canvas);border:1px solid var(--border);border-radius:10px;padding:1px 7px\">${(autoResult.detailNotes||[]).length}件</span>
            <span style=\"font-size:10px;color:var(--matcha);margin-left:4px;display:flex;align-items:center;gap:3px\"><span style=\"width:6px;height:6px;border-radius:50%;background:var(--matcha);flex-shrink:0;display:inline-block\"></span>${(autoResult.detailNotes||[]).filter(n=>n.type==='good').length} 良好</span>
            <span style=\"font-size:10px;color:var(--momo);display:flex;align-items:center;gap:3px\"><span style=\"width:6px;height:6px;border-radius:50%;background:var(--momo);flex-shrink:0;display:inline-block\"></span>${(autoResult.detailNotes||[]).filter(n=>n.type==='bad').length} 要修正</span>
            <span style=\"font-size:10px;color:var(--kogane);display:flex;align-items:center;gap:3px\"><span style=\"width:6px;height:6px;border-radius:50%;background:var(--kogane);flex-shrink:0;display:inline-block\"></span>${(autoResult.detailNotes||[]).filter(n=>n.type==='warn').length} 注意</span>
            <i id=\"sr-diag-ic-${s.id}\" class=\"fas fa-chevron-up\" style=\"margin-left:auto;font-size:10px;color:var(--text-muted);transition:transform .2s;transform:rotate(180deg)\"></i>
          </div>"""
NEW_DIAG_PANEL = """        <!-- ② 詳細診断パネル（折りたたみ式） v12 -->
        <div class=\"sr-diag-panel\">
          <div class=\"sr-diag-panel-header\" onclick=\"const d=document.getElementById('sr-diag-${s.id}');const ic=document.getElementById('sr-diag-ic-${s.id}');const open=d.style.display!=='none';d.style.display=open?'none':'block';ic.style.transform=open?'':'rotate(180deg)'\">
            <i class=\"fas fa-microscope\" style=\"color:var(--fuji);font-size:12px;flex-shrink:0\"></i>
            <span class=\"sr-diag-panel-title\">審査員診断ノート <span style=\"font-size:9px;font-weight:600;background:var(--fuji-bg,#f0eeff);color:var(--fuji);border:1px solid var(--fuji-border,#e0d0ff);border-radius:8px;padding:1px 7px;margin-left:2px\">脚本引用つき</span></span>
            <span class=\"sr-diag-count-chip\">${(autoResult.detailNotes||[]).length}件</span>
            <span style=\"font-size:10px;color:#15803d;display:flex;align-items:center;gap:3px;margin-left:4px\"><span class=\"sr-diag-status-dot\" style=\"background:#22c55e\"></span>${(autoResult.detailNotes||[]).filter(n=>n.type==='good').length}件 良好</span>
            <span style=\"font-size:10px;color:#b91c1c;display:flex;align-items:center;gap:3px\"><span class=\"sr-diag-status-dot\" style=\"background:#dc2626\"></span>${(autoResult.detailNotes||[]).filter(n=>n.type==='bad').length}件 要修正</span>
            <span style=\"font-size:10px;color:#b45309;display:flex;align-items:center;gap:3px\"><span class=\"sr-diag-status-dot\" style=\"background:#d97706\"></span>${(autoResult.detailNotes||[]).filter(n=>n.type==='warn').length}件 注意</span>
            <i id=\"sr-diag-ic-${s.id}\" class=\"fas fa-chevron-up\" style=\"margin-left:auto;font-size:10px;color:var(--text-muted);transition:transform .2s;transform:rotate(180deg)\"></i>
          </div>"""
if OLD_DIAG_PANEL in js:
    js = js.replace(OLD_DIAG_PANEL, NEW_DIAG_PANEL)
    print("[v12] Diagnostic panel header redesigned")
else:
    print("[v12] WARNING: Diagnostic panel header not found")

# ══════════════════════════════════════════════════════════════════
# 21. JS – close tag for sr-diag-panel (change closing div)
# ══════════════════════════════════════════════════════════════════
# The old div ended with </div> which remains, just changing the outer element classes
# No need to change closing tag since we changed from inline style to class

# ══════════════════════════════════════════════════════════════════
# 22. JS – Add "voice" diagnostic note (naturalness of character voices)
# ══════════════════════════════════════════════════════════════════
# This is handled in the existing voice/naturalness scoring already

# ══════════════════════════════════════════════════════════════════
# 23. JS – Improve feedback tab icons (already inline in js)
# ══════════════════════════════════════════════════════════════════
# The fb-tabs already use icons, just updating from emoji to cleaner labels

OLD_TABS = """          <div class=\"sr-fb-tabs\">
            <button id=\"sr-fb-tab-str-${s.id}\" class=\"sr-fb-tab active\" onclick=\"staffRoomFbTab('${s.id}','strengths')\"><i class=\"fas fa-circle-check\" style=\"font-size:9px;color:var(--matcha)\"></i>強み</button>
            <button id=\"sr-fb-tab-wk-${s.id}\" class=\"sr-fb-tab\" onclick=\"staffRoomFbTab('${s.id}','weaknesses')\"><i class=\"fas fa-circle-xmark\" style=\"font-size:9px;color:var(--momo)\"></i>弱点</button>
            <button id=\"sr-fb-tab-sg-${s.id}\" class=\"sr-fb-tab\" onclick=\"staffRoomFbTab('${s.id}','suggestions')\"><i class=\"fas fa-pen-nib\" style=\"font-size:9px;color:var(--kogane)\"></i>改稿提案</button>
            <button id=\"sr-fb-tab-pr-${s.id}\" class=\"sr-fb-tab\" onclick=\"staffRoomFbTab('${s.id}','priority')\"><i class=\"fas fa-flag\" style=\"font-size:9px;color:var(--fuji)\"></i>最優先</button>
          </div>"""
NEW_TABS = """          <div class=\"sr-fb-tabs\">
            <button id=\"sr-fb-tab-str-${s.id}\" class=\"sr-fb-tab active\" onclick=\"staffRoomFbTab('${s.id}','strengths')\">
              <i class=\"fas fa-circle-check\" style=\"font-size:10px;color:var(--matcha)\"></i>強み
              <span style=\"font-size:9px;font-weight:700;background:rgba(34,197,94,.12);color:#15803d;border-radius:8px;padding:0 5px;margin-left:1px\">${(autoResult.strengths||'').split('\\n').filter(l=>l.startsWith('・')).length}</span>
            </button>
            <button id=\"sr-fb-tab-wk-${s.id}\" class=\"sr-fb-tab\" onclick=\"staffRoomFbTab('${s.id}','weaknesses')\">
              <i class=\"fas fa-circle-xmark\" style=\"font-size:10px;color:var(--momo)\"></i>弱点
              <span style=\"font-size:9px;font-weight:700;background:rgba(239,68,68,.1);color:#b91c1c;border-radius:8px;padding:0 5px;margin-left:1px\">${(autoResult.weaknesses||'').split('\\n').filter(l=>l.startsWith('・')).length}</span>
            </button>
            <button id=\"sr-fb-tab-sg-${s.id}\" class=\"sr-fb-tab\" onclick=\"staffRoomFbTab('${s.id}','suggestions')\">
              <i class=\"fas fa-pen-nib\" style=\"font-size:10px;color:var(--kogane)\"></i>改稿提案
            </button>
            <button id=\"sr-fb-tab-pr-${s.id}\" class=\"sr-fb-tab\" onclick=\"staffRoomFbTab('${s.id}','priority')\">
              <i class=\"fas fa-flag\" style=\"font-size:10px;color:var(--fuji)\"></i>最優先課題
            </button>
          </div>"""
if OLD_TABS in js:
    js = js.replace(OLD_TABS, NEW_TABS)
    print("[v12] Feedback tabs enhanced with counts")
else:
    print("[v12] WARNING: Feedback tabs not found")

# ══════════════════════════════════════════════════════════════════
# Save JS
# ══════════════════════════════════════════════════════════════════
save(JS_PATH, js)
print(f"[v12] JS saved ({len(js.splitlines())} lines)")

# ══════════════════════════════════════════════════════════════════
# Syntax sanity check
# ══════════════════════════════════════════════════════════════════
import subprocess
result = subprocess.run(['node', '--check', JS_PATH], capture_output=True, text=True)
if result.returncode == 0:
    print("[v12] JS syntax check: PASS")
else:
    print("[v12] JS syntax ERROR:")
    print(result.stderr[:2000])
    sys.exit(1)

print("\n[v12] All patches applied successfully.")
