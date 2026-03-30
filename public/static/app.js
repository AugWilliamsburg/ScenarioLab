// ================================================================
//  シナリオラボ — 完全版 脚本執筆支援ツール
//  app.js — メインアプリケーション
// ================================================================


// ── Checklist Helper ──────────────────────────────────────────
function mkCheckItem(projId, toggleFn, extraArg, checkId, text, done) {
  const isChecked = done.includes(checkId);
  const fnCall = extraArg
    ? `${toggleFn}('${projId}','${extraArg}',this,'${checkId}')`
    : `${toggleFn}('${projId}','${checkId}')`;
  return `<div class="checklist-item" onclick="${fnCall}">
    <div class="checklist-check ${isChecked?'checked':''}">${isChecked?'<i class="fas fa-check"></i>':''}</div>
    <div class="checklist-text ${isChecked?'done':''}">${text}</div>
  </div>`;
}


// ── Safe Checklist Renderer ───────────────────────────────────
function renderChecklistItems(done, checks, getFn) {
  return checks.map(function(c) {
    const ok = done.includes(c.id);
    const cls = ok ? 'checked' : '';
    const tcls = ok ? 'done' : '';
    const ico = ok ? '<i class="fas fa-check"></i>' : '';
    const fn = getFn(c);
    return '<div class="checklist-item" onclick="' + fn + '">' +
      '<div class="checklist-check ' + cls + '">' + ico + '</div>' +
      '<div class="checklist-text ' + tcls + '">' + c.text + '</div>' +
      '</div>';
  }).join('');
}

// ── State ──────────────────────────────────────────────────────
const State = {
  currentPage: 'dashboard',
  currentProjectId: null,
  currentTab: {},
  projects: [],
  modal: null,
  toasts: [],
};

// ── Storage ────────────────────────────────────────────────────
const DB = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem('sl_' + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem('sl_' + key, JSON.stringify(val)); } catch {}
  },
  getProjects() { return this.get('projects', []); },
  saveProjects(ps) { this.set('projects', ps); },
  getProject(id) { return this.getProjects().find(p => p.id === id) || null; },
  saveProject(proj) {
    const ps = this.getProjects();
    const idx = ps.findIndex(p => p.id === proj.id);
    if (idx >= 0) ps[idx] = proj; else ps.unshift(proj);
    this.saveProjects(ps);
  },
  deleteProject(id) {
    this.saveProjects(this.getProjects().filter(p => p.id !== id));
  },
};

// ── Utils ──────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const now = () => new Date().toISOString();
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
};
const fmtDatetime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${fmtDate(iso)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};
const esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => [...ctx.querySelectorAll(sel)];
const el = (tag, attrs={}, ...children) => {
  const e = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    if (typeof c === 'string') e.insertAdjacentHTML('beforeend', c);
    else e.appendChild(c);
  }
  return e;
};

// ── Toast ──────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  let cont = $('#toast-container');
  if (!cont) { cont = el('div', { id: 'toast-container', class: 'toast-container' }); document.body.appendChild(cont); }
  const t = el('div', { class: `toast ${type}` }, `<i class="fas ${icons[type]||icons.info}"></i> ${esc(msg)}`);
  cont.appendChild(t);
  setTimeout(() => { t.style.animation = 'fadeOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, 2800);
}

// ── Modal ──────────────────────────────────────────────────────
function openModal(titleHtml, bodyHtml, footerHtml = '', opts = {}) {
  closeModal();
  const size = opts.size || '';
  const overlay = el('div', { class: 'modal-overlay', id: 'modal-overlay', onclick: (e) => { if (e.target.id === 'modal-overlay') closeModal(); } });
  overlay.innerHTML = `
    <div class="modal ${size}">
      <div class="modal-header">
        <div class="modal-title">${titleHtml}</div>
        <button class="btn btn-ghost btn-icon" onclick="closeModal()"><i class="fas fa-xmark"></i></button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
    </div>`;
  document.body.appendChild(overlay);
}
function closeModal() {
  const o = $('#modal-overlay');
  if (o) o.remove();
}

// ── Project Factory ────────────────────────────────────────────
function newProject(data = {}) {
  return {
    id: uid(),
    title: data.title || '無題の作品',
    genre: data.genre || 'ドラマ',
    format: data.format || 'テレビドラマ',
    logline: data.logline || '',
    synopsis: data.synopsis || '',
    phase: data.phase || '着想',
    createdAt: now(),
    updatedAt: now(),
    // Phase data
    ideas: [],
    moodboard: [],
    keywords: [],
    research: { notes: [], links: [], worldbuilding: '' },
    concept: { theme: '', premise: '', tone: '', target: '', length: '', notes: '' },
    characters: [],
    plots: [],
    scenes: [],
    outline: { acts: [] },
    drafts: [],
    revisions: [],
    feedbacks: [],
    checklist: { polish: [], final: [] },
    collaborators: [],
    exportHistory: [],
    wordTarget: 12000,
    notes: [],
    tags: [],
  };
}

// ── Phase Definitions ─────────────────────────────────────────
const PHASES = [
  { id: '着想',          icon: 'fa-lightbulb',       color: '#f7c56a', nav: 'ideas' },
  { id: 'リサーチ',      icon: 'fa-magnifying-glass', color: '#6ab8f7', nav: 'research' },
  { id: 'コンセプト設計', icon: 'fa-compass-drafting', color: '#6af7c8', nav: 'concept' },
  { id: 'プロット設計',  icon: 'fa-diagram-project',  color: '#f76ca0', nav: 'plot' },
  { id: 'キャラクター',  icon: 'fa-users',            color: '#c86af7', nav: 'characters' },
  { id: 'アウトライン',  icon: 'fa-list-ol',          color: '#7c6af7', nav: 'outline' },
  { id: '初稿',          icon: 'fa-pen-nib',          color: '#6af7c8', nav: 'editor' },
  { id: '大改稿',        icon: 'fa-rotate',           color: '#f7a06a', nav: 'revision' },
  { id: '精密推敲',      icon: 'fa-microscope',       color: '#f76ca0', nav: 'polish' },
  { id: 'フィードバック', icon: 'fa-comments',         color: '#6ab8f7', nav: 'feedback' },
  { id: '最終稿',        icon: 'fa-flag-checkered',   color: '#6af7c8', nav: 'final' },
  { id: '共有・出力',    icon: 'fa-share-nodes',      color: '#f7c56a', nav: 'export' },
];

const GENRES = ['ドラマ','コメディ','サスペンス','ミステリー','ホラー','SF','ファンタジー','アクション','ラブストーリー','青春','時代劇','アニメ'];
const FORMATS = ['テレビドラマ（連続）','テレビドラマ（単発）','映画','短編映画','ウェブドラマ','舞台脚本','アニメ','その他'];

// ── Router ─────────────────────────────────────────────────────
function navigate(page, projectId = null) {
  State.currentPage = page;
  if (projectId) State.currentProjectId = projectId;
  render();
  window.scrollTo(0, 0);
}

// ── Main Render ────────────────────────────────────────────────
function render() {
  const app = $('#app');
  if (!app) return;

  if (State.currentPage === 'dashboard' || !State.currentProjectId) {
    app.innerHTML = renderLayout(renderDashboard());
    bindDashboard();
  } else {
    const proj = DB.getProject(State.currentProjectId);
    if (!proj) { navigate('dashboard'); return; }
    const page = State.currentPage;
    let content = '';
    if (page === 'ideas')      content = renderIdeas(proj);
    else if (page === 'research')    content = renderResearch(proj);
    else if (page === 'concept')     content = renderConcept(proj);
    else if (page === 'plot')        content = renderPlot(proj);
    else if (page === 'characters')  content = renderCharacters(proj);
    else if (page === 'outline')     content = renderOutline(proj);
    else if (page === 'editor')      content = renderEditor(proj);
    else if (page === 'revision')    content = renderRevision(proj);
    else if (page === 'polish')      content = renderPolish(proj);
    else if (page === 'feedback')    content = renderFeedback(proj);
    else if (page === 'final')       content = renderFinal(proj);
    else if (page === 'export')      content = renderExport(proj);
    else content = renderIdeas(proj);
    app.innerHTML = renderLayout(content, proj);
    bindProjectPage(proj);
  }
}

// ── Layout Shell ───────────────────────────────────────────────
function renderLayout(content, proj = null) {
  const phaseNav = proj ? PHASES.map(p => `
    <div class="nav-item ${State.currentPage === p.nav ? 'active' : ''}" onclick="navigate('${p.nav}','${proj.id}')">
      <span class="nav-icon"><i class="fas ${p.icon}" style="color:${p.color}"></i></span>
      ${p.id}
    </div>`).join('') : '';

  const projectNav = proj ? `
    <div class="sidebar-section">
      <div class="sidebar-section-title">フェーズ</div>
      <div class="nav-phase-divider"></div>
      ${phaseNav}
    </div>` : '';

  const projectFooter = proj ? `
    <div class="sidebar-footer">
      <div class="sidebar-project-info">
        <i class="fas fa-film" style="color:var(--accent);font-size:13px;flex-shrink:0"></i>
        <div style="overflow:hidden">
          <div class="sidebar-project-name">${esc(proj.title)}</div>
          <div class="sidebar-project-phase">${esc(proj.phase)} フェーズ</div>
        </div>
      </div>
    </div>` : '';

  const topbarContent = proj ? `
    <div>
      <div class="topbar-title">${esc(proj.title)}</div>
      <div class="topbar-subtitle">${esc(proj.genre)} / ${esc(proj.format)}</div>
    </div>
    <div class="topbar-actions">
      <button class="btn btn-secondary btn-sm" onclick="navigate('dashboard')"><i class="fas fa-arrow-left"></i> 一覧</button>
      <button class="btn btn-primary btn-sm" onclick="quickSaveProject('${proj.id}')"><i class="fas fa-floppy-disk"></i> 保存</button>
    </div>` : `
    <div>
      <div class="topbar-title">シナリオラボ</div>
      <div class="topbar-subtitle">脚本執筆支援ツール</div>
    </div>
    <div class="topbar-actions">
      <button class="btn btn-primary btn-sm" onclick="openNewProjectModal()"><i class="fas fa-plus"></i> 新規作品</button>
    </div>`;

  return `
  <div class="app-layout">
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="logo-main">
          <div class="logo-icon"><i class="fas fa-clapperboard"></i></div>
          <div>
            <div class="logo-text">シナリオラボ</div>
            <div class="logo-sub">Scenario Lab</div>
          </div>
        </div>
      </div>
      <div class="sidebar-nav">
        <div class="sidebar-section">
          <div class="sidebar-section-title">ナビゲーション</div>
          <div class="nav-item ${!proj || State.currentPage==='dashboard'?'active':''}" onclick="navigate('dashboard')">
            <span class="nav-icon"><i class="fas fa-house"></i></span> ダッシュボード
          </div>
        </div>
        ${projectNav}
      </div>
      ${projectFooter}
    </nav>
    <div class="main-content">
      <div class="topbar">${topbarContent}</div>
      <div class="page-content" id="page-content">${content}</div>
    </div>
  </div>
  <div id="toast-container" class="toast-container"></div>`;
}

// ================================================================
//  DASHBOARD
// ================================================================

// 和色パレット（各フェーズに伝統色を割り当て）
const PHASE_COLORS_WA = {
  '着想':        { bg: '#fdf8e8', color: '#c48a00', border: '#e8d088', icon_bg: '#fdf8e8' },
  'リサーチ':    { bg: '#eef3fb', color: '#2e5fa0', border: '#b8cee8', icon_bg: '#eef3fb' },
  'コンセプト設計': { bg: '#eef7f7', color: '#2a8080', border: '#a8d4d4', icon_bg: '#eef7f7' },
  'プロット設計': { bg: '#fdf0f5', color: '#d44d7a', border: '#f0b8ce', icon_bg: '#fdf0f5' },
  'キャラクター': { bg: '#f4f2fb', color: '#6a5aaa', border: '#ccc4e8', icon_bg: '#f4f2fb' },
  'アウトライン': { bg: '#eff6ed', color: '#4a7c3f', border: '#b8d4b2', icon_bg: '#eff6ed' },
  '初稿':        { bg: '#fef2ee', color: '#d94f2a', border: '#f5c4b4', icon_bg: '#fef2ee' },
  '大改稿':      { bg: '#fdf8e8', color: '#c48a00', border: '#e8d088', icon_bg: '#fdf8e8' },
  '精密推敲':    { bg: '#fdf0f5', color: '#d44d7a', border: '#f0b8ce', icon_bg: '#fdf0f5' },
  'フィードバック':{ bg: '#eef3fb', color: '#2e5fa0', border: '#b8cee8', icon_bg: '#eef3fb' },
  '最終稿':      { bg: '#eff6ed', color: '#4a7c3f', border: '#b8d4b2', icon_bg: '#eff6ed' },
  '共有・出力':  { bg: '#f4f2fb', color: '#6a5aaa', border: '#ccc4e8', icon_bg: '#f4f2fb' },
};

// ライティングチップ
const WRITING_TIPS = [
  { icon: 'fa-pen-nib', title: '初稿のコツ', body: '「完璧な初稿」は存在しません。書き続けることが大切です。まずは感情のままに書き、後で直しましょう。' },
  { icon: 'fa-users', title: 'キャラクターの深み', body: 'キャラクターには「表の欲求（Want）」と「内なる必要（Need）」を設けましょう。この葛藤がドラマを生みます。' },
  { icon: 'fa-lightbulb', title: '着想を大切に', body: 'アイデアが浮かんだ瞬間を逃さないよう、メモ帳アプリや手帳を常に用意しておきましょう。' },
  { icon: 'fa-rotate', title: '改稿の視点', body: '改稿時は「読者（視聴者）の目線」で読み直すことが重要です。作り手目線を一時忘れましょう。' },
  { icon: 'fa-comments', title: 'セリフの鉄則', body: 'セリフはキャラクターが言わなくてもよいことを言う場所ではありません。何かを隠す・嘘をつく・遠回しにする、それがリアルです。' },
  { icon: 'fa-diagram-project', title: '構造の重要性', body: '三幕構成や四幕構成は「規則」ではなく「地図」です。どこで観客の心が動くかを意識して設計しましょう。' },
  { icon: 'fa-magnifying-glass', title: 'リサーチの深度', body: 'リサーチは書き始める前だけでなく、執筆中も続けましょう。リアリティは細部から生まれます。' },
  { icon: 'fa-microscope', title: '推敲のポイント', body: '「言わなくてもわかるセリフ」「説明的なト書き」を削るだけで、脚本の質は劇的に上がります。' },
];

function getRandomTip() {
  return WRITING_TIPS[Math.floor(Math.random() * WRITING_TIPS.length)];
}

function renderDashboard() {
  const projects = DB.getProjects();
  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => !['最終稿','共有・出力'].includes(p.phase)).length,
    completed: projects.filter(p => p.phase === '最終稿' || p.phase === '共有・出力').length,
    drafts: projects.reduce((a, p) => a + (p.drafts||[]).length, 0),
    totalWords: projects.reduce((a, p) => a + (p.drafts||[]).reduce((b, d) => b + countWords(d.content||''), 0), 0),
  };
  const phaseIdx = { '着想':0,'リサーチ':1,'コンセプト設計':2,'プロット設計':3,'キャラクター':4,'アウトライン':5,'初稿':6,'大改稿':7,'精密推敲':8,'フィードバック':9,'最終稿':10,'共有・出力':11 };

  // プロジェクトカード（強化版）
  const projectCards = projects.length === 0
    ? `<div class="card" style="text-align:center;padding:64px 20px;grid-column:1/-1;border:2px dashed var(--border)">
        <div style="font-size:52px;margin-bottom:16px;opacity:0.35">🎬</div>
        <div style="font-size:16px;font-weight:700;color:var(--text-secondary);margin-bottom:8px;font-family:'Noto Serif JP',serif">まだ作品がありません</div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:24px;line-height:1.7">新しい脚本プロジェクトを作成して<br>あなたの物語を始めましょう</div>
        <button class="btn btn-primary btn-lg" onclick="openNewProjectModal()"><i class="fas fa-plus"></i> 最初の作品を作成</button>
      </div>`
    : projects.map(p => {
        const idx = phaseIdx[p.phase] ?? 0;
        const pct = Math.round((idx / 11) * 100);
        const waColor = PHASE_COLORS_WA[p.phase] || { bg:'#fef2ee', color:'#d94f2a', border:'#f5c4b4' };
        const wordCount = (p.drafts||[]).reduce((a,d) => a + countWords(d.content||''), 0);
        const charCount = (p.characters||[]).length;
        const draftCount = (p.drafts||[]).length;
        const ph = PHASES[idx];
        // 12段階フェーズドット
        const phaseDots = PHASES.map((ph2, pi) => {
          const cls = pi < idx ? 'done' : pi === idx ? 'current' : '';
          return '<div class="phase-step ' + cls + '"></div>';
        }).join('');
        return `
        <div class="project-card" onclick="navigate('${ph?.nav||'ideas'}','${p.id}')" style="cursor:pointer">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div>
              <div class="project-card-title">${esc(p.title)}</div>
              <div class="project-card-genre"><i class="fas fa-film" style="font-size:10px;margin-right:3px;opacity:0.6"></i>${esc(p.genre)} / ${esc(p.format)}</div>
            </div>
            <div style="display:flex;gap:3px;flex-shrink:0">
              <button class="btn btn-ghost btn-icon btn-sm" onclick="event.stopPropagation();openEditProjectModal('${p.id}')" title="編集"><i class="fas fa-pen" style="font-size:10px"></i></button>
              <button class="btn btn-ghost btn-icon btn-sm" onclick="event.stopPropagation();confirmDeleteProject('${p.id}')" title="削除"><i class="fas fa-trash" style="font-size:10px;color:var(--accent)"></i></button>
            </div>
          </div>
          ${p.logline ? `<div style="font-size:12px;color:var(--text-muted);line-height:1.5;margin-bottom:10px;border-left:2px solid var(--border);padding-left:8px">${esc(p.logline.slice(0,90))}${p.logline.length>90?'…':''}</div>` : ''}
          <div class="project-card-meta">
            <span class="tag" style="background:${waColor.bg};color:${waColor.color};border:1px solid ${waColor.border}">
              <i class="fas ${ph?.icon||'fa-circle'}" style="font-size:9px"></i> ${esc(p.phase)}
            </span>
            ${wordCount > 0 ? `<span class="tag tag-gray" title="総文字数"><i class="fas fa-font" style="font-size:9px"></i> ${wordCount >= 1000 ? (wordCount/1000).toFixed(1)+'k' : wordCount}字</span>` : ''}
            ${charCount > 0 ? `<span class="tag tag-gray" title="キャラクター数"><i class="fas fa-user" style="font-size:9px"></i> ${charCount}人</span>` : ''}
            ${draftCount > 0 ? `<span class="tag tag-gray" title="稿数"><i class="fas fa-file-lines" style="font-size:9px"></i> ${draftCount}稿</span>` : ''}
          </div>
          <div class="progress-bar-wrap" style="margin-top:10px">
            <div class="progress-label">
              <span style="font-size:10px;color:var(--text-muted)">フェーズ ${idx+1}/12</span>
              <span style="font-size:10px;font-weight:600;color:${waColor.color}">${pct}%</span>
            </div>
            <div class="progress-bar" style="height:5px">
              <div class="progress-fill" style="width:${pct}%;background:linear-gradient(90deg,${waColor.color},${waColor.color}bb)"></div>
            </div>
          </div>
          <div class="phase-steps" style="margin-top:6px">${phaseDots}</div>
          <div style="margin-top:8px;font-size:11px;color:var(--text-light);text-align:right">
            <i class="fas fa-clock" style="font-size:9px"></i> ${fmtDate(p.updatedAt)}
          </div>
        </div>`;
      }).join('');

  // 最近の活動（強化版）
  const recentActivity = projects.slice(0, 6).map(p => {
    const idx2 = phaseIdx[p.phase] ?? 0;
    const waColor2 = PHASE_COLORS_WA[p.phase] || PHASE_COLORS_WA['着想'];
    return `
    <div class="activity-item">
      <div style="width:34px;height:34px;border-radius:var(--radius-sm);background:${waColor2.bg};border:1px solid ${waColor2.border};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="fas ${PHASES[idx2]?.icon||'fa-film'}" style="color:${waColor2.color};font-size:13px"></i>
      </div>
      <div class="activity-content">
        <div class="activity-title">${esc(p.title)}</div>
        <div class="activity-meta"><span style="color:${waColor2.color};font-weight:500">${esc(p.phase)}</span> フェーズ — ${fmtDate(p.updatedAt)}</div>
      </div>
      <button class="btn btn-secondary btn-sm" style="flex-shrink:0" onclick="navigate('${PHASES[idx2]?.nav||'ideas'}','${p.id}')">
        <i class="fas fa-arrow-right" style="font-size:10px"></i> 開く
      </button>
    </div>`;
  }).join('') || `<div style="text-align:center;padding:28px 16px;color:var(--text-muted);font-size:13px"><i class="fas fa-inbox" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.4"></i>まだ作品がありません</div>`;

  // フェーズフローガイド（タイル形式）
  const phaseFlowItems = PHASES.map((ph, i) => {
    const waC = PHASE_COLORS_WA[ph.id] || { bg:'#f8f6f1', color:'#7a6e5e', border:'#e4ddd3' };
    return `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:var(--radius-sm);border:1px solid ${waC.border};background:${waC.bg};cursor:default">
      <div style="width:24px;height:24px;border-radius:50%;background:white;border:1.5px solid ${waC.border};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="fas ${ph.icon}" style="color:${waC.color};font-size:10px"></i>
      </div>
      <div>
        <div style="font-size:10px;font-weight:700;color:${waC.color};letter-spacing:0.02em">${i+1}. ${ph.id}</div>
      </div>
    </div>`;
  }).join('');

  // ランダムチップ
  const tip = getRandomTip();

  // 今日の格言
  const QUOTES = [
    '「一稿で傑作を書こうとするな。傑作は百稿から生まれる」',
    '「書けないのは才能がないからではない。まだ書いていないだけだ」',
    '「キャラクターが動き始めたとき、本当の脚本が始まる」',
    '「観客は物語を見ているのではない。感情の旅をしているのだ」',
    '「削った一行が、残した百行より重要なこともある」',
  ];
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

  return `
  <!-- ヒーローバナー（明るい和デザイン） -->
  <div class="hero-wa" style="margin-bottom:28px">
    <div class="hero-wa-line"></div>
    <div class="hero-wa-title">
      <i class="fas fa-clapperboard" style="color:var(--accent);margin-right:10px"></i>
      シナリオラボ — ダッシュボード
    </div>
    <div class="hero-wa-sub">脚本執筆の全フェーズを一元管理。着想から完成まで、あなたの物語を支援します。</div>
    <div style="margin-top:14px;font-size:12px;font-style:italic;color:var(--text-muted);font-family:'Noto Serif JP',serif;border-left:2px solid var(--kogane);padding-left:10px">
      ${quote}
    </div>
  </div>

  <!-- クイックアクション -->
  <div class="quick-actions" style="margin-bottom:28px">
    <div class="quick-action-btn" onclick="openNewProjectModal()">
      <div class="qa-icon" style="background:var(--accent-bg);color:var(--accent)"><i class="fas fa-plus"></i></div>
      <div class="qa-label">新規作品を作成</div>
    </div>
    <div class="quick-action-btn" onclick="showImportTipsModal()">
      <div class="qa-icon" style="background:var(--kogane-bg);color:var(--kogane)"><i class="fas fa-book-open"></i></div>
      <div class="qa-label">執筆ガイドを読む</div>
    </div>
    <div class="quick-action-btn" onclick="showPhaseGuideModal()">
      <div class="qa-icon" style="background:var(--matcha-bg);color:var(--matcha)"><i class="fas fa-map-signs"></i></div>
      <div class="qa-label">フェーズガイド</div>
    </div>
  </div>

  <!-- 統計カード -->
  <div class="stat-grid" style="margin-bottom:28px">
    <div class="stat-card beni">
      <div class="stat-icon-wrap"><i class="fas fa-film"></i></div>
      <div class="stat-value">${stats.total}</div>
      <div class="stat-label">総プロジェクト数</div>
    </div>
    <div class="stat-card kon">
      <div class="stat-icon-wrap"><i class="fas fa-pen-nib"></i></div>
      <div class="stat-value">${stats.inProgress}</div>
      <div class="stat-label">執筆中</div>
    </div>
    <div class="stat-card matcha">
      <div class="stat-icon-wrap"><i class="fas fa-flag-checkered"></i></div>
      <div class="stat-value">${stats.completed}</div>
      <div class="stat-label">完成作品</div>
    </div>
    <div class="stat-card kogane">
      <div class="stat-icon-wrap"><i class="fas fa-font"></i></div>
      <div class="stat-value">${stats.totalWords >= 10000 ? Math.round(stats.totalWords/1000)+'k' : stats.totalWords.toLocaleString()}</div>
      <div class="stat-label">総執筆文字数</div>
    </div>
  </div>

  <!-- メインコンテンツ：作品一覧 + サイドパネル -->
  <div style="display:grid;grid-template-columns:1fr 320px;gap:24px;align-items:start">

    <!-- 左：作品一覧 -->
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="font-size:16px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">
          <i class="fas fa-folder-open" style="color:var(--accent);margin-right:8px"></i>作品一覧
          ${projects.length > 0 ? '<span style="font-size:12px;font-weight:400;color:var(--text-muted);font-family:inherit;margin-left:6px">(' + projects.length + '件)</span>' : ''}
        </div>
        <button class="btn btn-primary btn-sm" onclick="openNewProjectModal()">
          <i class="fas fa-plus"></i> 新規作成
        </button>
      </div>
      <div class="project-grid">${projectCards}</div>
    </div>

    <!-- 右：サイドパネル -->
    <div style="display:flex;flex-direction:column;gap:18px">

      <!-- 最近の活動 -->
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:13px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;background:var(--bg-subtle)">
          <i class="fas fa-clock-rotate-left" style="color:var(--momo);font-size:13px"></i>
          <span style="font-size:13px;font-weight:600;color:var(--text-primary);font-family:'Noto Serif JP',serif">最近の活動</span>
        </div>
        <div style="padding:6px 12px">${recentActivity}</div>
      </div>

      <!-- 今日の執筆チップ -->
      <div class="writing-tip-box">
        <div class="writing-tip-title"><i class="fas ${tip.icon}"></i> ${tip.title}</div>
        <div class="writing-tip-body">${tip.body}</div>
      </div>

      <!-- 執筆フローガイド -->
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:13px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg-subtle)">
          <div style="display:flex;align-items:center;gap:8px">
            <i class="fas fa-map" style="color:var(--matcha);font-size:13px"></i>
            <span style="font-size:13px;font-weight:600;color:var(--text-primary);font-family:'Noto Serif JP',serif">執筆フローガイド</span>
          </div>
          <span style="font-size:10px;color:var(--text-muted)">12フェーズ</span>
        </div>
        <div style="padding:12px 12px;display:grid;grid-template-columns:1fr 1fr;gap:5px">
          ${phaseFlowItems}
        </div>
      </div>
    </div>
  </div>`;
}

function bindDashboard() {
  // ダッシュボードのインタラクション（将来拡張用）
}

// ── 執筆ガイドモーダル ────────────────────────────────────────
function showImportTipsModal() {
  const tipsHtml = WRITING_TIPS.map(t => `
    <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
      <div style="width:36px;height:36px;border-radius:var(--radius-sm);background:var(--kogane-bg);color:var(--kogane);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:15px">
        <i class="fas ${t.icon}"></i>
      </div>
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:3px">${t.title}</div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.7">${t.body}</div>
      </div>
    </div>`).join('');
  openModal(
    `<i class="fas fa-book-open" style="color:var(--kogane)"></i> 執筆ガイド — プロのコツ`,
    `<div>${tipsHtml}</div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">閉じる</button>`,
    { size: 'modal-lg' }
  );
}

// ── フェーズガイドモーダル ────────────────────────────────────
function showPhaseGuideModal() {
  const PHASE_DESC = [
    { name:'着想', desc:'アイデアの種を集める段階。良し悪し問わずすべての閃きをメモしましょう。キーワード・ムードボード・チェックリストで整理します。' },
    { name:'リサーチ', desc:'作品世界のリアリティを構築する段階。史実・専門知識・現地調査など根拠となる情報を収集・整理します。' },
    { name:'コンセプト設計', desc:'作品の核を言語化する段階。テーマ・プレミス・ターゲット・トーン・USP（唯一無二の要素）・ログラインを確定します。' },
    { name:'プロット設計', desc:'物語の骨格を設計する段階。四幕（または三幕）構成でシーンを配置し、テンションカーブを確認します。' },
    { name:'キャラクター', desc:'登場人物を深く掘り下げる段階。Want/Need・バックストーリー・口癖・関係性マップで立体的なキャラクターを構築します。' },
    { name:'アウトライン', desc:'シーンの順序と内容を詳細に決める段階。各シーンの目的・登場人物・感情変化を整理し、全体の流れを確認します。' },
    { name:'初稿', desc:'実際に脚本を書く段階。日本式フォーマットで書き、とにかく最後まで書ききることを優先します。' },
    { name:'大改稿', desc:'構造レベルで見直す段階。シーンの順序・幕の長さ・キャラクターアーク・伏線回収を全面的にチェックします。' },
    { name:'精密推敲', desc:'セリフ・ト書きレベルで磨く段階。冗長な説明・キャラクターの口調の統一・リズム・間・余白を精査します。' },
    { name:'フィードバック', desc:'他者の目線を取り入れる段階。読み合わせ・感想収集・問題点の整理・対応計画を立てます。' },
    { name:'最終稿', desc:'完成稿として仕上げる段階。すべての修正を反映し、表紙・著作権・バージョン管理を行います。' },
    { name:'共有・出力', desc:'制作陣・スタッフへの共有段階。PDF/TXT出力・フォーマット確認・制作メモの添付を行います。' },
  ];
  const itemsHtml = PHASE_DESC.map((ph, i) => {
    const waC = PHASE_COLORS_WA[ph.name] || { bg:'#f8f6f1', color:'#7a6e5e', border:'#e4ddd3' };
    const phaseInfo = PHASES[i];
    return `
    <div style="display:flex;gap:12px;padding:12px;border-radius:var(--radius-sm);background:${waC.bg};border:1px solid ${waC.border};margin-bottom:8px">
      <div style="width:36px;height:36px;border-radius:50%;background:white;border:2px solid ${waC.border};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="fas ${phaseInfo?.icon||'fa-circle'}" style="color:${waC.color};font-size:14px"></i>
      </div>
      <div>
        <div style="font-size:12px;font-weight:700;color:${waC.color};margin-bottom:3px;letter-spacing:0.05em">Phase ${i+1} — ${ph.name}</div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.7">${ph.desc}</div>
      </div>
    </div>`;
  }).join('');
  openModal(
    `<i class="fas fa-map-signs" style="color:var(--matcha)"></i> フェーズガイド — 全12段階`,
    `<div>${itemsHtml}</div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">閉じる</button>`,
    { size: 'modal-lg' }
  );
}

// ── New Project Modal ──────────────────────────────────────────
function openNewProjectModal() {
  openModal(
    `<i class="fas fa-plus" style="color:var(--accent)"></i> 新規作品を作成`,
    `<div class="form-group">
      <label class="form-label">タイトル <span style="color:var(--red)">*</span></label>
      <input class="form-input" id="np-title" placeholder="作品タイトルを入力…" autofocus>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">ジャンル</label>
        <select class="form-select" id="np-genre">
          ${GENRES.map(g=>`<option>${g}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">フォーマット</label>
        <select class="form-select" id="np-format">
          ${FORMATS.map(f=>`<option>${f}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">ログライン（一行あらすじ）</label>
      <input class="form-input" id="np-logline" placeholder="主人公が○○をするために△△と戦う物語">
    </div>
    <div class="form-group">
      <label class="form-label">開始フェーズ</label>
      <select class="form-select" id="np-phase">
        ${PHASES.map(p=>`<option value="${p.id}">${p.id}</option>`).join('')}
      </select>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="createProject()"><i class="fas fa-plus"></i> 作成する</button>`
  );
  setTimeout(() => $('#np-title')?.focus(), 50);
}

function createProject() {
  const title = $('#np-title')?.value?.trim();
  if (!title) { toast('タイトルを入力してください', 'error'); return; }
  const proj = newProject({
    title,
    genre: $('#np-genre')?.value,
    format: $('#np-format')?.value,
    logline: $('#np-logline')?.value?.trim(),
    phase: $('#np-phase')?.value || '着想',
  });
  DB.saveProject(proj);
  closeModal();
  toast(`「${title}」を作成しました`, 'success');
  const phaseIdx = PHASES.findIndex(p => p.id === proj.phase);
  const nav = PHASES[phaseIdx >= 0 ? phaseIdx : 0]?.nav || 'ideas';
  navigate(nav, proj.id);
}

function openEditProjectModal(id) {
  const proj = DB.getProject(id);
  if (!proj) return;
  openModal(
    `<i class="fas fa-pen" style="color:var(--accent)"></i> 作品情報を編集`,
    `<div class="form-group">
      <label class="form-label">タイトル</label>
      <input class="form-input" id="ep-title" value="${esc(proj.title)}">
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">ジャンル</label>
        <select class="form-select" id="ep-genre">
          ${GENRES.map(g=>`<option ${g===proj.genre?'selected':''}>${g}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">フォーマット</label>
        <select class="form-select" id="ep-format">
          ${FORMATS.map(f=>`<option ${f===proj.format?'selected':''}>${f}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">ログライン</label>
      <input class="form-input" id="ep-logline" value="${esc(proj.logline||'')}">
    </div>
    <div class="form-group">
      <label class="form-label">あらすじ</label>
      <textarea class="form-textarea" id="ep-synopsis" rows="3">${esc(proj.synopsis||'')}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">現在のフェーズ</label>
      <select class="form-select" id="ep-phase">
        ${PHASES.map(p=>`<option value="${p.id}" ${p.id===proj.phase?'selected':''}>${p.id}</option>`).join('')}
      </select>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveEditProject('${id}')"><i class="fas fa-floppy-disk"></i> 保存</button>`
  );
}

function saveEditProject(id) {
  const proj = DB.getProject(id);
  if (!proj) return;
  proj.title   = $('#ep-title')?.value?.trim() || proj.title;
  proj.genre   = $('#ep-genre')?.value || proj.genre;
  proj.format  = $('#ep-format')?.value || proj.format;
  proj.logline = $('#ep-logline')?.value?.trim() || '';
  proj.synopsis= $('#ep-synopsis')?.value?.trim() || '';
  proj.phase   = $('#ep-phase')?.value || proj.phase;
  proj.updatedAt = now();
  DB.saveProject(proj);
  closeModal();
  toast('作品情報を更新しました', 'success');
  render();
}

function confirmDeleteProject(id) {
  const proj = DB.getProject(id);
  if (!proj) return;
  openModal(
    `<i class="fas fa-trash" style="color:var(--red)"></i> 作品を削除`,
    `<p style="color:var(--text-secondary);font-size:14px">「<strong style="color:var(--text-primary)">${esc(proj.title)}</strong>」を削除しますか？この操作は元に戻せません。</p>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-danger" onclick="deleteProject('${id}')"><i class="fas fa-trash"></i> 削除する</button>`
  );
}

function deleteProject(id) {
  DB.deleteProject(id);
  closeModal();
  if (State.currentProjectId === id) { State.currentProjectId = null; }
  toast('作品を削除しました', 'info');
  navigate('dashboard');
}

function quickSaveProject(id) {
  const proj = DB.getProject(id);
  if (proj) { proj.updatedAt = now(); DB.saveProject(proj); toast('保存しました', 'success'); }
}

function countWords(text) {
  return (text || '').replace(/\s+/g, '').length;
}

function bindProjectPage(proj) {
  // auto-save inputs on blur
  $$('input[data-save], textarea[data-save], select[data-save]').forEach(inp => {
    inp.addEventListener('change', () => autoSaveField(inp, proj));
    inp.addEventListener('blur', () => autoSaveField(inp, proj));
  });
}

function autoSaveField(inp, proj) {
  const key = inp.dataset.save;
  if (!key) return;
  const keys = key.split('.');
  let target = proj;
  for (let i = 0; i < keys.length - 1; i++) target = target[keys[i]];
  target[keys[keys.length-1]] = inp.value;
  proj.updatedAt = now();
  DB.saveProject(proj);
}

// ================================================================
//  PAGE: 着想 (IDEAS) — 個別最適化版
// ================================================================
function renderIdeas(proj) {
  const ideas = proj.ideas || [];
  const keywords = proj.keywords || [];
  const moodboard = proj.moodboard || [];

  // アイデアタイプの和色マッピング
  const IDEA_TYPE_COLORS = {
    'メモ':       { tag:'tag-kogane', icon:'fa-note-sticky', hex:'#c48a00', bg:'#fdf8e8' },
    'シーン':     { tag:'tag-momo',   icon:'fa-film',        hex:'#d44d7a', bg:'#fdf0f5' },
    'セリフ':     { tag:'tag-fuji',   icon:'fa-quote-left',  hex:'#6a5aaa', bg:'#f4f2fb' },
    'テーマ':     { tag:'tag-matcha', icon:'fa-seedling',    hex:'#4a7c3f', bg:'#eff6ed' },
    'キャラクター':{ tag:'tag-beni',  icon:'fa-user',        hex:'#d94f2a', bg:'#fef2ee' },
    '設定':       { tag:'tag-asagi',  icon:'fa-map',         hex:'#2a8080', bg:'#eef7f7' },
  };

  const ideaCards = ideas.length === 0
    ? `<div style="grid-column:1/-1;text-align:center;padding:48px 20px;color:var(--text-muted)">
        <div style="font-size:44px;margin-bottom:12px;opacity:0.30">💡</div>
        <div style="font-size:14px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">アイデアがまだありません</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">浮かんだことを何でも書き留めましょう</div>
        <button class="btn btn-primary btn-sm" onclick="openAddIdeaModal('${proj.id}')"><i class="fas fa-plus"></i> 最初のアイデアを追加</button>
       </div>`
    : ideas.map(idea => {
        const tc = IDEA_TYPE_COLORS[idea.type] || IDEA_TYPE_COLORS['メモ'];
        return `
      <div class="idea-card" id="idea-${idea.id}" style="border-top:3px solid ${tc.hex}">
        <div class="idea-card-actions">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="editIdea('${proj.id}','${idea.id}')"><i class="fas fa-pen" style="font-size:10px"></i></button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteIdea('${proj.id}','${idea.id}')"><i class="fas fa-xmark" style="font-size:10px;color:var(--accent)"></i></button>
        </div>
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:7px">
          <div style="width:22px;height:22px;border-radius:4px;background:${tc.bg};border:1px solid ${tc.hex}44;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fas ${tc.icon}" style="color:${tc.hex};font-size:10px"></i>
          </div>
          <div class="idea-card-title" style="margin:0">${esc(idea.title||'無題')}</div>
        </div>
        <div class="idea-card-body">${esc(idea.body||'').replace(/\n/g,'<br>')}</div>
        <div class="idea-card-footer">
          <span class="tag ${tc.tag}" style="font-size:10px">${esc(idea.type||'メモ')}</span>
          ${idea.priority==='高' ? '<span class="tag tag-beni" style="font-size:10px"><i class="fas fa-fire" style="font-size:9px"></i> 高優先</span>' : ''}
          ${idea.priority==='低' ? '<span class="tag tag-gray" style="font-size:10px">低優先</span>' : ''}
          <span class="tag tag-gray" style="margin-left:auto;font-size:10px">${fmtDate(idea.createdAt)}</span>
        </div>
      </div>`;
      }).join('');

  // アイデアタイプ集計
  const ideaTypeSummary = Object.entries(IDEA_TYPE_COLORS).map(([type, tc]) => {
    const count = ideas.filter(i => (i.type||'メモ') === type).length;
    if (count === 0) return '';
    return `<span class="tag ${tc.tag}" style="font-size:10px"><i class="fas ${tc.icon}" style="font-size:9px"></i> ${type} ${count}</span>`;
  }).join('');

  const keywordTags = keywords.map(k => `
    <span style="display:inline-flex;align-items:center;gap:5px;background:var(--fuji-bg);color:var(--fuji);border:1px solid var(--fuji-border);border-radius:20px;padding:4px 10px;font-size:12px;cursor:pointer;font-weight:500" onclick="deleteKeyword('${proj.id}','${esc(k)}')">
      # ${esc(k)} <i class="fas fa-xmark" style="font-size:9px;opacity:0.7"></i>
    </span>`).join('');

  // ムードボード（アイコン付き・カラー別）
  const MOODS = [
    { name:'時代・時期', icon:'fa-calendar', color: '#c48a00', bg:'#fdf8e8' },
    { name:'場所・空間', icon:'fa-location-dot', color: '#2a8080', bg:'#eef7f7' },
    { name:'雰囲気・トーン', icon:'fa-cloud', color: '#6a5aaa', bg:'#f4f2fb' },
    { name:'色彩イメージ', icon:'fa-palette', color: '#d44d7a', bg:'#fdf0f5' },
    { name:'音楽・サウンド', icon:'fa-music', color: '#4a7c3f', bg:'#eff6ed' },
    { name:'視覚的モチーフ', icon:'fa-eye', color: '#2e5fa0', bg:'#eef3fb' },
  ];
  const moodItems = MOODS.map(m => {
    const item = moodboard.find(mb => mb.category === m.name);
    return `
    <div class="mood-item ${item ? 'filled' : ''}" onclick="editMoodItem('${proj.id}','${m.name}')" style="${item ? 'border-color:'+m.color+'66;background:'+m.bg : ''}">
      <div style="display:flex;align-items:center;gap:5px;margin-bottom:5px">
        <i class="fas ${m.icon}" style="color:${m.color};font-size:12px"></i>
        <span style="font-size:10px;font-weight:600;color:${m.color}">${m.name}</span>
      </div>
      ${item ? `<div style="font-size:12px;color:var(--text-secondary);text-align:center;line-height:1.5">${esc(item.content||'').slice(0,60)}</div>` : `<div style="font-size:11px;color:var(--text-muted)">クリックして追加</div>`}
    </div>`;
  }).join('');

  const filledMoodCount = MOODS.filter(m => moodboard.find(mb => mb.category === m.name)).length;
  const checkedCount = (proj.ideaChecks||[]).length;

  return `
  <div class="section-header">
    <div class="section-title">
      <i class="fas fa-lightbulb" style="color:var(--kogane)"></i> 着想・アイデア収集
      <span class="phase-badge-lg" style="background:var(--kogane-bg);color:var(--kogane);border-color:var(--kogane-border)">Phase 1</span>
    </div>
    <div class="section-desc">閃き・断片的なアイデア・イメージをすべて書き留めましょう。良し悪しは後で判断します</div>
  </div>

  <!-- 進捗サマリー -->
  <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
    <div class="card" style="padding:12px 16px;display:flex;align-items:center;gap:10px;flex:1;min-width:140px">
      <div style="width:34px;height:34px;border-radius:var(--radius-sm);background:var(--kogane-bg);color:var(--kogane);display:flex;align-items:center;justify-content:center;font-size:15px">
        <i class="fas fa-lightbulb"></i>
      </div>
      <div>
        <div style="font-size:20px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">${ideas.length}</div>
        <div style="font-size:11px;color:var(--text-muted)">アイデア数</div>
      </div>
    </div>
    <div class="card" style="padding:12px 16px;display:flex;align-items:center;gap:10px;flex:1;min-width:140px">
      <div style="width:34px;height:34px;border-radius:var(--radius-sm);background:var(--fuji-bg);color:var(--fuji);display:flex;align-items:center;justify-content:center;font-size:15px">
        <i class="fas fa-tags"></i>
      </div>
      <div>
        <div style="font-size:20px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">${keywords.length}</div>
        <div style="font-size:11px;color:var(--text-muted)">キーワード</div>
      </div>
    </div>
    <div class="card" style="padding:12px 16px;display:flex;align-items:center;gap:10px;flex:1;min-width:140px">
      <div style="width:34px;height:34px;border-radius:var(--radius-sm);background:var(--momo-bg);color:var(--momo);display:flex;align-items:center;justify-content:center;font-size:15px">
        <i class="fas fa-palette"></i>
      </div>
      <div>
        <div style="font-size:20px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">${filledMoodCount}/6</div>
        <div style="font-size:11px;color:var(--text-muted)">ムードボード</div>
      </div>
    </div>
    <div class="card" style="padding:12px 16px;display:flex;align-items:center;gap:10px;flex:1;min-width:140px">
      <div style="width:34px;height:34px;border-radius:var(--radius-sm);background:var(--matcha-bg);color:var(--matcha);display:flex;align-items:center;justify-content:center;font-size:15px">
        <i class="fas fa-circle-check"></i>
      </div>
      <div>
        <div style="font-size:20px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">${checkedCount}/5</div>
        <div style="font-size:11px;color:var(--text-muted)">チェック完了</div>
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;margin-bottom:24px">
    <!-- 左：アイデアノート -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title"><i class="fas fa-lightbulb icon" style="color:var(--kogane)"></i> アイデアノート</div>
          ${ideaTypeSummary ? '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">' + ideaTypeSummary + '</div>' : ''}
        </div>
        <button class="btn btn-primary btn-sm" onclick="openAddIdeaModal('${proj.id}')"><i class="fas fa-plus"></i> 追加</button>
      </div>
      <div class="idea-grid">${ideaCards}</div>
    </div>

    <!-- 右：キーワード + ムードボード + チェック -->
    <div style="display:flex;flex-direction:column;gap:16px">

      <!-- キーワード・モチーフ -->
      <div class="card card-fuji" style="padding:14px 16px">
        <div class="card-header" style="margin-bottom:10px">
          <div class="card-title"><i class="fas fa-hashtag icon" style="color:var(--fuji)"></i> キーワード・モチーフ</div>
          <span style="font-size:11px;color:var(--text-muted)">${keywords.length}個</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;min-height:32px">
          ${keywordTags || '<span style="font-size:12px;color:var(--text-muted);font-style:italic">キーワードを追加してください</span>'}
        </div>
        <div style="display:flex;gap:8px">
          <input class="form-input" id="kw-input" placeholder="# キーワードを入力して Enter" style="font-size:12px"
            onkeydown="if(event.key==='Enter')addKeyword('${proj.id}')">
          <button class="btn btn-secondary btn-sm" onclick="addKeyword('${proj.id}')"><i class="fas fa-plus"></i></button>
        </div>
      </div>

      <!-- ムードボード -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-palette icon" style="color:var(--momo)"></i> ムードボード</div>
          <span style="font-size:11px;color:var(--text-muted)">${filledMoodCount}/6 入力済</span>
        </div>
        <div class="mood-board">${moodItems}</div>
      </div>

      <!-- 着想チェックリスト -->
      <div class="card card-matcha">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-circle-check icon" style="color:var(--matcha)"></i> 着想チェックリスト</div>
          <span style="font-size:11px;color:var(--matcha);font-weight:600">${checkedCount}/5</span>
        </div>
        ${renderIdeaChecklist(proj)}
      </div>
    </div>
  </div>

  <div class="info-box">
    <i class="fas fa-lightbulb"></i>
    <div><strong>着想フェーズのポイント：</strong>良し悪しを判断せず、浮かんだアイデアをすべて書き出しましょう。
    断片的なシーン・セリフ・テーマ・キャラクターのイメージ、何でもOK。高優先のアイデアはのちのコンセプト設計に活用します。</div>
  </div>`;
}

function renderIdeaChecklist(proj) {
  const checks = [
    { id:'c1', text:'「なぜこの話を書きたいのか」を言語化した' },
    { id:'c2', text:'主人公のビジュアル・声・雰囲気をイメージした' },
    { id:'c3', text:'話の核となる「瞬間」を一つ思い描いた' },
    { id:'c4', text:'この作品でしか描けない何かがある' },
    { id:'c5', text:'10個以上のアイデアメモを書いた' },
  ];
  const done = proj.ideaChecks || [];
  return renderChecklistItems(done, checks, function(c) {
    return "toggleIdeaCheck('" + proj.id + "','" + c.id + "')";
  });
}

function toggleIdeaCheck(projId, checkId) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.ideaChecks = proj.ideaChecks || [];
  if (proj.ideaChecks.includes(checkId)) {
    proj.ideaChecks = proj.ideaChecks.filter(x => x !== checkId);
  } else {
    proj.ideaChecks.push(checkId);
  }
  proj.updatedAt = now();
  DB.saveProject(proj);
  render();
}

function openAddIdeaModal(projId) {
  openModal(
    `<i class="fas fa-lightbulb" style="color:#f7c56a"></i> アイデアを追加`,
    `<div class="form-group">
      <label class="form-label">タイトル</label>
      <input class="form-input" id="idea-title" placeholder="アイデアのタイトル（任意）">
    </div>
    <div class="form-group">
      <label class="form-label">内容 <span style="color:var(--red)">*</span></label>
      <textarea class="form-textarea" id="idea-body" rows="5" placeholder="思いついたことをそのまま書いてください…"></textarea>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">種類</label>
        <select class="form-select" id="idea-type">
          <option>メモ</option><option>シーン</option><option>セリフ</option>
          <option>テーマ</option><option>キャラクター</option><option>設定</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">優先度</label>
        <select class="form-select" id="idea-priority">
          <option>普通</option><option>高</option><option>低</option>
        </select>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="addIdea('${projId}')"><i class="fas fa-plus"></i> 追加</button>`
  );
  setTimeout(() => $('#idea-body')?.focus(), 50);
}

function addIdea(projId) {
  const body = $('#idea-body')?.value?.trim();
  if (!body) { toast('内容を入力してください', 'error'); return; }
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.ideas = proj.ideas || [];
  proj.ideas.unshift({
    id: uid(), title: $('#idea-title')?.value?.trim() || '',
    body, type: $('#idea-type')?.value || 'メモ',
    priority: $('#idea-priority')?.value || '普通',
    createdAt: now(),
  });
  proj.updatedAt = now();
  DB.saveProject(proj);
  closeModal();
  toast('アイデアを追加しました', 'success');
  render();
}

function editIdea(projId, ideaId) {
  const proj = DB.getProject(projId);
  const idea = (proj?.ideas||[]).find(i => i.id === ideaId);
  if (!idea) return;
  openModal(
    `<i class="fas fa-pen" style="color:var(--accent)"></i> アイデアを編集`,
    `<div class="form-group">
      <label class="form-label">タイトル</label>
      <input class="form-input" id="ei-title" value="${esc(idea.title||'')}">
    </div>
    <div class="form-group">
      <label class="form-label">内容</label>
      <textarea class="form-textarea" id="ei-body" rows="5">${esc(idea.body||'')}</textarea>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">種類</label>
        <select class="form-select" id="ei-type">
          ${['メモ','シーン','セリフ','テーマ','キャラクター','設定'].map(t=>`<option ${t===idea.type?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">優先度</label>
        <select class="form-select" id="ei-priority">
          ${['普通','高','低'].map(t=>`<option ${t===idea.priority?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveEditIdea('${projId}','${ideaId}')">保存</button>`
  );
}

function saveEditIdea(projId, ideaId) {
  const proj = DB.getProject(projId);
  const idea = (proj?.ideas||[]).find(i => i.id === ideaId);
  if (!idea) return;
  idea.title = $('#ei-title')?.value?.trim() || '';
  idea.body  = $('#ei-body')?.value?.trim() || '';
  idea.type  = $('#ei-type')?.value || 'メモ';
  idea.priority = $('#ei-priority')?.value || '普通';
  proj.updatedAt = now();
  DB.saveProject(proj);
  closeModal(); toast('更新しました', 'success'); render();
}

function deleteIdea(projId, ideaId) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.ideas = (proj.ideas||[]).filter(i => i.id !== ideaId);
  proj.updatedAt = now();
  DB.saveProject(proj);
  toast('削除しました', 'info'); render();
}

function addKeyword(projId) {
  const input = $('#kw-input');
  const kw = input?.value?.trim();
  if (!kw) return;
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.keywords = proj.keywords || [];
  if (!proj.keywords.includes(kw)) proj.keywords.push(kw);
  proj.updatedAt = now();
  DB.saveProject(proj);
  input.value = '';
  render();
}

function deleteKeyword(projId, kw) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.keywords = (proj.keywords||[]).filter(k => k !== kw);
  proj.updatedAt = now();
  DB.saveProject(proj);
  render();
}

function editMoodItem(projId, category) {
  const proj = DB.getProject(projId);
  const item = (proj?.moodboard||[]).find(m => m.category === category);
  openModal(
    `<i class="fas fa-palette" style="color:var(--accent2)"></i> ${esc(category)}`,
    `<div class="form-group">
      <label class="form-label">内容・イメージ</label>
      <textarea class="form-textarea" id="mood-content" rows="4" placeholder="${esc(category)}について自由に書いてください…">${esc(item?.content||'')}</textarea>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveMoodItem('${projId}','${esc(category)}')">保存</button>`
  );
}

function saveMoodItem(projId, category) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.moodboard = proj.moodboard || [];
  const idx = proj.moodboard.findIndex(m => m.category === category);
  const content = $('#mood-content')?.value?.trim() || '';
  if (idx >= 0) proj.moodboard[idx].content = content;
  else proj.moodboard.push({ category, content });
  proj.updatedAt = now();
  DB.saveProject(proj);
  closeModal(); render();
}

// ================================================================
//  PAGE: リサーチ — 個別最適化版
// ================================================================
function renderResearch(proj) {
  const r = proj.research || {};
  const notes = r.notes || [];
  const links = r.links || [];

  // カテゴリ別色設定
  const NOTE_CAT_COLORS = {
    '職業・専門知識': { color: '#2a8080', bg: '#eef7f7', border: '#a8d4d4' },
    '時代・歴史':    { color: '#c48a00', bg: '#fdf8e8', border: '#e8d088' },
    '地理・場所':    { color: '#4a7c3f', bg: '#eff6ed', border: '#b8d4b2' },
    '人物・実在モデル': { color: '#d44d7a', bg: '#fdf0f5', border: '#f0b8ce' },
    '法律・制度':    { color: '#2e5fa0', bg: '#eef3fb', border: '#b8cee8' },
    '文化・慣習':    { color: '#6a5aaa', bg: '#f4f2fb', border: '#ccc4e8' },
    'その他':        { color: '#7a6e5e', bg: '#f0ece4', border: '#e4ddd3' },
  };

  const noteCards = notes.map(n => {
    const cat = NOTE_CAT_COLORS[n.category] || NOTE_CAT_COLORS['その他'];
    return `
    <div class="idea-card" style="border-left:3px solid ${cat.color};position:relative">
      <div class="idea-card-actions">
        <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteResearchNote('${proj.id}','${n.id}')"><i class="fas fa-xmark" style="font-size:10px;color:var(--accent)"></i></button>
      </div>
      <div style="display:inline-flex;align-items:center;gap:4px;background:${cat.bg};color:${cat.color};border:1px solid ${cat.border};border-radius:10px;padding:2px 8px;font-size:10px;font-weight:600;margin-bottom:7px">
        ${esc(n.category||'その他')}
      </div>
      <div class="idea-card-title">${esc(n.title||'無題')}</div>
      <div class="idea-card-body">${esc(n.body||'').replace(/\n/g,'<br>')}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:right">${fmtDate(n.createdAt)}</div>
    </div>`;
  }).join('') || `<div style="grid-column:1/-1;text-align:center;padding:36px 20px;color:var(--text-muted)">
    <div style="font-size:36px;margin-bottom:10px;opacity:0.3">📚</div>
    <div style="font-size:13px">リサーチノートを追加しましょう</div>
  </div>`;

  const linkItems = links.map(l => `
    <div class="research-source-card">
      <div style="width:32px;height:32px;border-radius:var(--radius-sm);background:var(--kon-bg);color:var(--kon-lt);display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="fas fa-link" style="font-size:12px"></i>
      </div>
      <div style="flex:1;overflow:hidden">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:2px">${esc(l.title||l.url)}</div>
        <div style="font-size:11px;color:var(--kon-lt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(l.url)}</div>
        ${l.memo ? '<div style="font-size:11px;color:var(--text-muted);margin-top:3px">' + esc(l.memo) + '</div>' : ''}
      </div>
      <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteResearchLink('${proj.id}','${l.id}')"><i class="fas fa-xmark" style="color:var(--accent);font-size:10px"></i></button>
    </div>`).join('') || `<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:16px;font-style:italic">参考リンクがありません</div>`;

  // カテゴリ別ノート数の集計
  const catSummary = Object.entries(NOTE_CAT_COLORS).map(([cat, c]) => {
    const cnt = notes.filter(n => (n.category||'その他') === cat).length;
    if (cnt === 0) return '';
    return `<span style="display:inline-flex;align-items:center;gap:3px;background:${c.bg};color:${c.color};border:1px solid ${c.border};border-radius:10px;padding:2px 8px;font-size:10px;font-weight:500">${cat} ${cnt}</span>`;
  }).join('');

  const checkedResearch = (proj.researchChecks||[]).length;

  return `
  <div class="section-header">
    <div class="section-title">
      <i class="fas fa-magnifying-glass" style="color:var(--kon-lt)"></i> リサーチ
      <span class="phase-badge-lg" style="background:var(--kon-bg);color:var(--kon-lt);border-color:var(--kon-border)">Phase 2</span>
    </div>
    <div class="section-desc">取材・調査・参考資料を整理して、作品世界のリアリティを構築しましょう</div>
  </div>

  <!-- 進捗サマリー -->
  <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
    <div class="card" style="padding:12px 16px;display:flex;align-items:center;gap:10px;flex:1;min-width:130px">
      <div style="width:32px;height:32px;border-radius:var(--radius-sm);background:var(--kon-bg);color:var(--kon-lt);display:flex;align-items:center;justify-content:center;font-size:14px"><i class="fas fa-book-open"></i></div>
      <div><div style="font-size:20px;font-weight:700;font-family:'Noto Serif JP',serif">${notes.length}</div><div style="font-size:11px;color:var(--text-muted)">リサーチノート</div></div>
    </div>
    <div class="card" style="padding:12px 16px;display:flex;align-items:center;gap:10px;flex:1;min-width:130px">
      <div style="width:32px;height:32px;border-radius:var(--radius-sm);background:var(--asagi-bg);color:var(--asagi);display:flex;align-items:center;justify-content:center;font-size:14px"><i class="fas fa-link"></i></div>
      <div><div style="font-size:20px;font-weight:700;font-family:'Noto Serif JP',serif">${links.length}</div><div style="font-size:11px;color:var(--text-muted)">参考リンク</div></div>
    </div>
    <div class="card" style="padding:12px 16px;display:flex;align-items:center;gap:10px;flex:1;min-width:130px">
      <div style="width:32px;height:32px;border-radius:var(--radius-sm);background:var(--matcha-bg);color:var(--matcha);display:flex;align-items:center;justify-content:center;font-size:14px"><i class="fas fa-circle-check"></i></div>
      <div><div style="font-size:20px;font-weight:700;font-family:'Noto Serif JP',serif">${checkedResearch}/6</div><div style="font-size:11px;color:var(--text-muted)">チェック完了</div></div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;margin-bottom:20px">
    <!-- 左：ノート + リンク -->
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title"><i class="fas fa-book-open icon" style="color:var(--kon-lt)"></i> リサーチノート</div>
            ${catSummary ? '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">' + catSummary + '</div>' : ''}
          </div>
          <button class="btn btn-primary btn-sm" onclick="openAddResearchNote('${proj.id}')"><i class="fas fa-plus"></i> 追加</button>
        </div>
        <div class="idea-grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">${noteCards}</div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-link icon" style="color:var(--asagi)"></i> 参考リンク・資料</div>
          <button class="btn btn-secondary btn-sm" onclick="openAddResearchLink('${proj.id}')"><i class="fas fa-plus"></i> 追加</button>
        </div>
        <div>${linkItems}</div>
      </div>
    </div>

    <!-- 右：世界観ノート + チェックリスト -->
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card card-kon">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-globe icon" style="color:var(--kon-lt)"></i> 世界観・設定ノート</div>
        </div>
        <textarea class="form-textarea" id="worldbuilding-area" rows="10"
          placeholder="時代背景、地理、社会構造、組織、ルール、文化、技術…&#10;作品世界の設定を自由に書いてください"
          onblur="saveWorldbuilding('${proj.id}',this.value)"
          style="min-height:180px;background:white">${esc(r.worldbuilding||'')}</textarea>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;text-align:right">
          <i class="fas fa-floppy-disk" style="font-size:9px"></i> フォーカスを外すと自動保存
        </div>
      </div>
      <div class="card card-matcha">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-list-check icon" style="color:var(--matcha)"></i> リサーチチェックリスト</div>
          <span style="font-size:11px;color:var(--matcha);font-weight:600">${checkedResearch}/6</span>
        </div>
        ${renderResearchChecklist(proj)}
      </div>
    </div>
  </div>

  <div class="info-box">
    <i class="fas fa-magnifying-glass"></i>
    <div><strong>リサーチのコツ：</strong>「わかったつもり」で書き始めないこと。実際に現場に行く・専門家に話を聞く・原典を読む。
    リサーチが深いほど、セリフや場面描写が生きてきます。</div>
  </div>`;
}

function renderResearchChecklist(proj) {
  const checks = [
    {id:'rc1',text:'時代・時期の考証を調べた'},
    {id:'rc2',text:'登場する職業・専門知識を調べた'},
    {id:'rc3',text:'舞台となる場所・地域を調べた'},
    {id:'rc4',text:'参考作品を3本以上観た・読んだ'},
    {id:'rc5',text:'実在する人物・事件のモデルを確認した'},
    {id:'rc6',text:'法律・医療・科学的正確性を確認した'},
  ];
  const done = proj.researchChecks || [];
  return renderChecklistItems(done, checks, function(c) {
    return "toggleCheck('" + proj.id + "','research',this,'" + c.id + "')";
  });
}

function toggleCheck(projId, type, el, checkId) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  const key = type + 'Checks';
  proj[key] = proj[key] || [];
  if (proj[key].includes(checkId)) proj[key] = proj[key].filter(x => x !== checkId);
  else proj[key].push(checkId);
  proj.updatedAt = now();
  DB.saveProject(proj);
  render();
}

function openAddResearchNote(projId) {
  openModal(
    `<i class="fas fa-book-open" style="color:#6ab8f7"></i> リサーチノート追加`,
    `<div class="form-group">
      <label class="form-label">タイトル</label>
      <input class="form-input" id="rn-title" placeholder="例：主人公の職業について">
    </div>
    <div class="form-group">
      <label class="form-label">カテゴリ</label>
      <select class="form-select" id="rn-cat">
        <option>職業・専門知識</option><option>時代・歴史</option><option>地理・場所</option>
        <option>人物・実在モデル</option><option>法律・制度</option><option>文化・慣習</option><option>その他</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">内容</label>
      <textarea class="form-textarea" id="rn-body" rows="6" placeholder="調べた内容を書いてください…"></textarea>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="addResearchNote('${projId}')"><i class="fas fa-plus"></i> 追加</button>`
  );
}

function addResearchNote(projId) {
  const body = $('#rn-body')?.value?.trim();
  if (!body) { toast('内容を入力してください','error'); return; }
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.research = proj.research || {};
  proj.research.notes = proj.research.notes || [];
  proj.research.notes.unshift({
    id: uid(), title: $('#rn-title')?.value?.trim()||'',
    category: $('#rn-cat')?.value||'その他', body, createdAt: now()
  });
  proj.updatedAt = now();
  DB.saveProject(proj);
  closeModal(); toast('追加しました','success'); render();
}

function deleteResearchNote(projId, id) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.research.notes = (proj.research.notes||[]).filter(n => n.id !== id);
  proj.updatedAt = now();
  DB.saveProject(proj);
  toast('削除しました','info'); render();
}

function openAddResearchLink(projId) {
  openModal(
    `<i class="fas fa-link" style="color:var(--accent)"></i> 参考リンク追加`,
    `<div class="form-group"><label class="form-label">URL</label><input class="form-input" id="rl-url" placeholder="https://..."></div>
     <div class="form-group"><label class="form-label">タイトル</label><input class="form-input" id="rl-title" placeholder="参考タイトル（任意）"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="addResearchLink('${projId}')"><i class="fas fa-plus"></i> 追加</button>`
  );
}

function addResearchLink(projId) {
  const url = $('#rl-url')?.value?.trim();
  if (!url) { toast('URLを入力してください','error'); return; }
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.research = proj.research || {};
  proj.research.links = proj.research.links || [];
  proj.research.links.unshift({ id: uid(), url, title: $('#rl-title')?.value?.trim()||url, createdAt: now() });
  proj.updatedAt = now();
  DB.saveProject(proj);
  closeModal(); toast('追加しました','success'); render();
}

function deleteResearchLink(projId, id) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.research.links = (proj.research.links||[]).filter(l => l.id !== id);
  proj.updatedAt = now();
  DB.saveProject(proj);
  render();
}

function saveWorldbuilding(projId, val) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.research = proj.research || {};
  proj.research.worldbuilding = val;
  proj.updatedAt = now();
  DB.saveProject(proj);
}

// ================================================================
//  PAGE: コンセプト設計 — 個別最適化版
// ================================================================
function renderConcept(proj) {
  const c = proj.concept || {};
  const checkedConcept = (proj.conceptChecks||[]).length;

  // テーマの入力状況チェック
  const themeOk = (c.theme||'').trim().length > 0;
  const premiseOk = (c.premise||'').trim().length > 0;
  const loglineOk = (proj.logline||'').trim().length > 0;
  const conceptFillPct = Math.round(([themeOk, premiseOk, !!(c.tone), !!(c.target), loglineOk, !!(c.usp)].filter(Boolean).length / 6) * 100);

  const TONE_COLORS = {
    'シリアス': { color:'#1d3d6b', bg:'#eef3fb' },
    'ダーク':   { color:'#2a1f1a', bg:'#f4f0eb' },
    'コミカル': { color:'#c48a00', bg:'#fdf8e8' },
    'ヒューマン':{ color:'#4a7c3f', bg:'#eff6ed' },
    'サスペンス':{ color:'#6a5aaa', bg:'#f4f2fb' },
    '感動':     { color:'#d44d7a', bg:'#fdf0f5' },
    'ホラー':   { color:'#8b1a1a', bg:'#fdf0ee' },
    '爽快':     { color:'#2a8080', bg:'#eef7f7' },
    '詩的':     { color:'#7a5a3a', bg:'#fdf8f0' },
  };
  const toneColor = c.tone ? (TONE_COLORS[c.tone] || { color:'var(--text-secondary)', bg:'#f0ece4' }) : null;

  return `
  <div class="section-header">
    <div class="section-title">
      <i class="fas fa-compass-drafting" style="color:var(--asagi)"></i> コンセプト設計
      <span class="phase-badge-lg" style="background:var(--asagi-bg);color:var(--asagi);border-color:var(--asagi-border)">Phase 3</span>
    </div>
    <div class="section-desc">作品の核心を言語化し、ぶれない「軸」を確立しましょう</div>
  </div>

  <!-- ログライン・完成度ハイライト -->
  <div style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap">
    <div class="card" style="flex:1;padding:16px;border-left:4px solid var(--asagi)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:12px;font-weight:700;color:var(--asagi);letter-spacing:0.06em;text-transform:uppercase">ログライン</div>
        <button class="btn btn-ghost btn-sm" style="font-size:11px" onclick="openEditProjectModal('${proj.id}')"><i class="fas fa-pen" style="font-size:10px"></i> 編集</button>
      </div>
      <div style="font-size:13.5px;color:var(--text-primary);line-height:1.7;font-family:'Noto Serif JP',serif;font-style:italic">
        ${proj.logline ? esc(proj.logline) : '<span style="color:var(--text-muted)">ログラインを設定してください（プロジェクト情報→編集）</span>'}
      </div>
    </div>
    <div class="card" style="min-width:160px;padding:16px;text-align:center">
      <div style="font-size:28px;font-weight:700;font-family:'Noto Serif JP',serif;color:${conceptFillPct>=80?'var(--matcha)':conceptFillPct>=50?'var(--kogane)':'var(--accent)'}">${conceptFillPct}%</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">コンセプト完成度</div>
      <div class="progress-bar" style="height:5px"><div class="progress-fill" style="width:${conceptFillPct}%;background:${conceptFillPct>=80?'var(--matcha)':conceptFillPct>=50?'var(--kogane)':'var(--accent)'}"></div></div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 340px;gap:20px">
    <!-- 左：テーマ・設定 -->
    <div style="display:flex;flex-direction:column;gap:16px">

      <!-- テーマ・プレミス -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-bullseye icon" style="color:var(--asagi)"></i> テーマ・主題・問い</div>
        </div>
        <div class="form-group">
          <label class="form-label">
            メインテーマ <span style="color:var(--accent)">*</span>
            <span style="font-size:10px;font-weight:400;color:var(--text-muted);margin-left:4px">一文で言い切れるほど明確に</span>
          </label>
          <input class="form-input" id="c-theme" value="${esc(c.theme||'')}"
            placeholder="例：真の勇気とは、恐れを感じながらも前に進むこと"
            onblur="saveConcept('${proj.id}')"
            style="${themeOk ? 'border-color:var(--matcha);background:var(--matcha-bg)' : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">
            プレミス・問い <span style="color:var(--accent)">*</span>
            <span style="font-size:10px;font-weight:400;color:var(--text-muted);margin-left:4px">「もし〜ならば…するか？」</span>
          </label>
          <textarea class="form-textarea" id="c-premise" rows="3"
            placeholder="例：もし愛する人を助けるために犯罪を犯した人間が、法の裁きを受けたとき何を選ぶか？"
            onblur="saveConcept('${proj.id}')">${esc(c.premise||'')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">サブテーマ・通奏低音</label>
          <textarea class="form-textarea" id="c-subtheme" rows="2"
            placeholder="例：贖罪、親子の絆、正義の相対性…"
            onblur="saveConcept('${proj.id}')">${esc(c.subtheme||'')}</textarea>
        </div>
      </div>

      <!-- 作品フォーマット設定 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-sliders icon" style="color:var(--kogane)"></i> 作品フォーマット・設定</div>
          ${c.tone && toneColor ? '<span class="tag" style="background:' + toneColor.bg + ';color:' + toneColor.color + ';border:1px solid ' + toneColor.color + '44">' + esc(c.tone) + '</span>' : ''}
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">トーン・雰囲気</label>
            <select class="form-select" id="c-tone" onchange="saveConcept('${proj.id}')">
              ${['','シリアス','ダーク','コミカル','ヒューマン','サスペンス','感動','ホラー','爽快','詩的'].map(t=>`<option ${t===c.tone?'selected':''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">ターゲット層</label>
            <select class="form-select" id="c-target" onchange="saveConcept('${proj.id}')">
              ${['','全年齢','10〜20代','20〜30代','30〜40代','40代以上','家族向け','女性向け','男性向け'].map(t=>`<option ${t===c.target?'selected':''}>${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">総尺・本数</label>
            <input class="form-input" id="c-length" value="${esc(c.length||'')}"
              placeholder="例：60分×10話" onblur="saveConcept('${proj.id}')">
          </div>
          <div class="form-group">
            <label class="form-label">時制・語り口</label>
            <input class="form-input" id="c-pov" value="${esc(c.pov||'')}"
              placeholder="例：現代・一人称（主人公）" onblur="saveConcept('${proj.id}')">
          </div>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">参考作品・インスピレーション源</label>
          <input class="form-input" id="c-ref" value="${esc(c.ref||'')}"
            placeholder="例：「半沢直樹」×「万引き家族」のような…" onblur="saveConcept('${proj.id}')">
        </div>
      </div>
    </div>

    <!-- 右：USP・感情・チェック -->
    <div style="display:flex;flex-direction:column;gap:16px">

      <!-- USP -->
      <div class="card card-asagi">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-star icon" style="color:var(--asagi)"></i> ユニーク・セリング・ポイント</div>
        </div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-bottom:8px;line-height:1.6">
          なぜ今この話を語るのか？他の作品とどこが違うのか？
        </div>
        <textarea class="form-textarea" id="c-usp" rows="5"
          placeholder="この作品にしか描けない「何か」を書いてください"
          onblur="saveConcept('${proj.id}')"
          style="background:white">${esc(c.usp||'')}</textarea>
      </div>

      <!-- 感情体験 -->
      <div class="card card-momo">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-heart icon" style="color:var(--momo)"></i> 視聴者の感情体験</div>
        </div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-bottom:8px;line-height:1.6">
          見終わった後、何を感じてほしいか？何が残ってほしいか？
        </div>
        <textarea class="form-textarea" id="c-emotion" rows="4"
          placeholder="例：明日も頑張ろうという前向きな気持ち。誰かを大切にしたくなる衝動"
          onblur="saveConcept('${proj.id}')"
          style="background:white">${esc(c.emotion||'')}</textarea>
      </div>

      <!-- チェックリスト -->
      <div class="card card-matcha">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-clipboard-check icon" style="color:var(--matcha)"></i> コンセプト確認チェック</div>
          <span style="font-size:11px;color:var(--matcha);font-weight:600">${checkedConcept}/5</span>
        </div>
        ${renderConceptChecklist(proj)}
      </div>
    </div>
  </div>`;
}

function renderConceptChecklist(proj) {
  const checks = [
    {id:'cc1',text:'テーマを一文で言い切れる'},
    {id:'cc2',text:'主人公が求めるものと必要なものが定まった'},
    {id:'cc3',text:'この話の「問い」が明確になった'},
    {id:'cc4',text:'トーンが一貫している'},
    {id:'cc5',text:'ログラインを30秒で説明できる'},
  ];
  const done = proj.conceptChecks || [];
  return renderChecklistItems(done, checks, function(c) {
    return "toggleCheck('" + proj.id + "','concept',this,'" + c.id + "')";
  });
}

function saveConcept(projId) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.concept = {
    theme:    $('#c-theme')?.value    || '',
    premise:  $('#c-premise')?.value  || '',
    subtheme: $('#c-subtheme')?.value || '',
    tone:     $('#c-tone')?.value     || '',
    target:   $('#c-target')?.value   || '',
    length:   $('#c-length')?.value   || '',
    pov:      $('#c-pov')?.value      || '',
    usp:      $('#c-usp')?.value      || '',
    emotion:  $('#c-emotion')?.value  || '',
    ref:      $('#c-ref')?.value      || '',
  };
  proj.updatedAt = now();
  DB.saveProject(proj);
}

// ================================================================
//  PAGE: キャラクター設計 — 個別最適化版
// ================================================================
function renderCharacters(proj) {
  const chars = proj.characters || [];

  // ロール別色設定
  const ROLE_COLORS = {
    '主人公':            { color:'#d94f2a', bg:'#fef2ee', border:'#f5c4b4' },
    'ヒロイン/ヒーロー': { color:'#d44d7a', bg:'#fdf0f5', border:'#f0b8ce' },
    'antagonist（敵）':  { color:'#1d3d6b', bg:'#eef3fb', border:'#b8cee8' },
    '相棒':              { color:'#4a7c3f', bg:'#eff6ed', border:'#b8d4b2' },
    'メンター':          { color:'#c48a00', bg:'#fdf8e8', border:'#e8d088' },
    'サブキャラ':        { color:'#6a5aaa', bg:'#f4f2fb', border:'#ccc4e8' },
    'その他':            { color:'#7a6e5e', bg:'#f0ece4', border:'#e4ddd3' },
  };

  // キャラクターのロール別分布
  const roleDistribution = chars.reduce((acc, ch) => {
    const role = ch.role || 'その他';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  const charCards = chars.length === 0
    ? `<div style="grid-column:1/-1;text-align:center;padding:56px 20px;color:var(--text-muted)">
        <div style="font-size:48px;margin-bottom:12px;opacity:0.3">👥</div>
        <div style="font-size:14px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">キャラクターがいません</div>
        <div style="font-size:12px;margin-bottom:20px">主人公・敵役など登場人物を追加しましょう</div>
        <button class="btn btn-primary btn-sm" onclick="openAddCharModal('${proj.id}')"><i class="fas fa-user-plus"></i> 最初のキャラクターを追加</button>
       </div>`
    : chars.map(ch => {
        const rc = ROLE_COLORS[ch.role] || ROLE_COLORS['その他'];
        const wantFilled = (ch.want||'').trim().length > 0;
        const needFilled = (ch.need||'').trim().length > 0;
        const completeness = [ch.name, ch.role, ch.age, ch.want, ch.need, ch.backstory, ch.speech].filter(v => v && String(v).trim()).length;
        return `
      <div class="character-card" onclick="openEditCharModal('${proj.id}','${ch.id}')">
        <div class="character-avatar" style="background:linear-gradient(135deg,${rc.bg} 0%,${rc.border}55 100%)">
          <span style="font-size:42px">${ch.emoji||'👤'}</span>
          <div style="position:absolute;top:8px;right:8px">
            <span style="display:inline-flex;align-items:center;gap:3px;background:${rc.bg};color:${rc.color};border:1px solid ${rc.border};border-radius:10px;padding:2px 7px;font-size:9.5px;font-weight:700">${esc(ch.role||'？')}</span>
          </div>
        </div>
        <div class="character-info">
          <div class="character-name">${esc(ch.name||'名前未設定')}</div>
          <div class="character-role" style="color:var(--text-muted)">
            ${ch.age ? ch.age + '歳' : ''}
            ${ch.age && ch.gender ? ' / ' : ''}
            ${ch.gender ? esc(ch.gender) : ''}
          </div>
          ${ch.tagline ? `<div style="font-size:11px;color:var(--text-secondary);font-style:italic;margin-bottom:8px;line-height:1.5;border-left:2px solid ${rc.border};padding-left:6px">"${esc(ch.tagline)}"</div>` : ''}
          <div style="display:flex;gap:5px;margin-bottom:8px;flex-wrap:wrap">
            ${wantFilled ? '<span class="tag tag-beni" style="font-size:10px"><i class="fas fa-arrow-up" style="font-size:8px"></i> Want</span>' : '<span class="tag tag-gray" style="font-size:10px;opacity:0.5">Want 未入力</span>'}
            ${needFilled ? '<span class="tag tag-matcha" style="font-size:10px"><i class="fas fa-heart" style="font-size:8px"></i> Need</span>' : '<span class="tag tag-gray" style="font-size:10px;opacity:0.5">Need 未入力</span>'}
          </div>
          <div class="character-traits">
            ${(ch.traits||[]).slice(0,3).map(t=>`<span class="tag tag-fuji" style="font-size:10px">${esc(t)}</span>`).join('')}
          </div>
          <div style="margin-top:8px">
            <div class="progress-bar" style="height:3px"><div class="progress-fill" style="width:${Math.round(completeness/7*100)}%;background:linear-gradient(90deg,${rc.color},${rc.color}88)"></div></div>
            <div style="font-size:9.5px;color:var(--text-muted);margin-top:2px">プロフィール完成度 ${Math.round(completeness/7*100)}%</div>
          </div>
        </div>
      </div>`;
      }).join('');

  // ロール分布サマリー
  const roleSummary = Object.entries(roleDistribution).map(([role, cnt]) => {
    const rc = ROLE_COLORS[role] || ROLE_COLORS['その他'];
    return `<span style="display:inline-flex;align-items:center;gap:3px;background:${rc.bg};color:${rc.color};border:1px solid ${rc.border};border-radius:10px;padding:3px 9px;font-size:10.5px;font-weight:500">${role} ${cnt}人</span>`;
  }).join('');

  return `
  <div class="section-header">
    <div class="section-title">
      <i class="fas fa-users" style="color:var(--fuji)"></i> キャラクター設計
      <span class="phase-badge-lg" style="background:var(--fuji-bg);color:var(--fuji);border-color:var(--fuji-border)">Phase 5</span>
    </div>
    <div class="section-desc">登場人物の内面・欲求・バックストーリーを深掘りして、生きたキャラクターを作りましょう</div>
  </div>

  <!-- ロール分布 + アクション -->
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap">
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
      <span style="font-size:12px;color:var(--text-muted);font-weight:500">登場人物：</span>
      ${roleSummary || '<span style="font-size:12px;color:var(--text-muted);font-style:italic">まだキャラクターがいません</span>'}
    </div>
    <button class="btn btn-primary" onclick="openAddCharModal('${proj.id}')">
      <i class="fas fa-user-plus"></i> キャラクター追加
    </button>
  </div>

  <div class="character-grid" style="margin-bottom:24px">${charCards}</div>
  ${chars.length > 1 ? renderRelationshipMap(proj) : ''}
  <div class="info-box" style="margin-top:16px">
    <i class="fas fa-users"></i>
    <div><strong>キャラクター設計のポイント：</strong>「Want（表の欲求）」と「Need（内なる必要）」の葛藤がドラマを生みます。
    主人公はWantを追いながら、Needに気づいていく——この旅がキャラクターアークです。</div>
  </div>`;
}

function renderRelationshipMap(proj) {
  const chars = proj.characters || [];
  const rels = proj.relationships || [];
  return `
  <div class="card" style="margin-top:24px">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-diagram-project icon"></i> 人物関係図メモ</div>
      <button class="btn btn-secondary btn-sm" onclick="openAddRelModal('${proj.id}')"><i class="fas fa-plus"></i> 関係を追加</button>
    </div>
    ${rels.length === 0 ? `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px">関係性を登録してください</div>` :
      `<div style="display:flex;flex-direction:column;gap:8px">` +
      rels.map(r => {
        const c1 = chars.find(c=>c.id===r.char1);
        const c2 = chars.find(c=>c.id===r.char2);
        return `<div style="display:flex;align-items:center;gap:12px;padding:8px 12px;background:var(--bg-primary);border-radius:6px;border:1px solid var(--border)">
          <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${esc(c1?.name||'?')}</span>
          <span style="font-size:11px;color:var(--accent-light);background:rgba(124,106,247,0.1);padding:2px 8px;border-radius:10px">${esc(r.type||'関係')}</span>
          <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${esc(c2?.name||'?')}</span>
          ${r.note ? `<span style="font-size:11px;color:var(--text-muted);flex:1">${esc(r.note)}</span>` : ''}
          <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteRel('${proj.id}','${r.id}')"><i class="fas fa-xmark" style="color:var(--red);font-size:10px"></i></button>
        </div>`;
      }).join('') + `</div>`}
  </div>`;
}

function openAddCharModal(projId) {
  openModal(
    `<i class="fas fa-user-plus" style="color:#c86af7"></i> キャラクター追加`,
    `<div class="grid-2">
      <div class="form-group"><label class="form-label">名前 <span style="color:var(--red)">*</span></label><input class="form-input" id="ch-name" placeholder="キャラクター名"></div>
      <div class="form-group"><label class="form-label">ふりがな</label><input class="form-input" id="ch-kana" placeholder="ふりがな"></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">役割</label>
        <select class="form-select" id="ch-role">
          <option>主人公</option><option>ヒロイン/ヒーロー</option><option>敵・antagonist</option>
          <option>相棒</option><option>メンター</option><option>サブキャラ</option><option>その他</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">年齢</label><input class="form-input" id="ch-age" type="number" placeholder="0"></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">性別</label>
        <select class="form-select" id="ch-gender"><option>男性</option><option>女性</option><option>その他</option><option>不明</option></select>
      </div>
      <div class="form-group"><label class="form-label">絵文字アイコン</label><input class="form-input" id="ch-emoji" placeholder="👤" maxlength="2"></div>
    </div>
    <div class="form-group"><label class="form-label">キャラクターのキャッチフレーズ</label>
      <input class="form-input" id="ch-tagline" placeholder="例：笑顔の裏に刃を隠す刑事"></div>
    <div class="form-group"><label class="form-label">職業・立場</label><input class="form-input" id="ch-job" placeholder="例：警察官、高校生、など"></div>
    <div class="form-group"><label class="form-label">外見・風貌</label>
      <textarea class="form-textarea" id="ch-appearance" rows="2" placeholder="容姿・服装の特徴"></textarea></div>
    <div class="form-group"><label class="form-label">性格・特徴（カンマ区切り）</label>
      <input class="form-input" id="ch-traits" placeholder="例：頑固,正義感が強い,人見知り"></div>
    <div class="form-group"><label class="form-label">欲求（Want）— 表面的に求めるもの</label>
      <input class="form-input" id="ch-want" placeholder="例：犯人を捕まえること"></div>
    <div class="form-group"><label class="form-label">必要（Need）— 内面に本当に必要なもの</label>
      <input class="form-input" id="ch-need" placeholder="例：自分を許すこと"></div>
    <div class="form-group"><label class="form-label">バックストーリー・過去</label>
      <textarea class="form-textarea" id="ch-back" rows="3" placeholder="過去の出来事・トラウマ・重要な経験"></textarea></div>
    <div class="form-group"><label class="form-label">口癖・話し方の特徴</label>
      <input class="form-input" id="ch-speech" placeholder="例：語尾に「…だよな？」が多い"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="addCharacter('${projId}')"><i class="fas fa-plus"></i> 追加</button>`,
    { size: 'modal-lg' }
  );
  setTimeout(() => $('#ch-name')?.focus(), 50);
}

function addCharacter(projId) {
  const name = $('#ch-name')?.value?.trim();
  if (!name) { toast('名前を入力してください','error'); return; }
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.characters = proj.characters || [];
  proj.characters.push({
    id: uid(), name, kana: $('#ch-kana')?.value?.trim()||'',
    role: $('#ch-role')?.value||'その他', age: $('#ch-age')?.value||'',
    gender: $('#ch-gender')?.value||'不明', emoji: $('#ch-emoji')?.value||'👤',
    tagline: $('#ch-tagline')?.value?.trim()||'', job: $('#ch-job')?.value?.trim()||'',
    appearance: $('#ch-appearance')?.value?.trim()||'',
    traits: ($('#ch-traits')?.value||'').split(',').map(t=>t.trim()).filter(Boolean),
    want: $('#ch-want')?.value?.trim()||'', need: $('#ch-need')?.value?.trim()||'',
    back: $('#ch-back')?.value?.trim()||'', speech: $('#ch-speech')?.value?.trim()||'',
    color: ['#7c6af7','#f76ca0','#6af7c8','#f7c56a','#6ab8f7','#c86af7'][Math.floor(Math.random()*6)],
    createdAt: now(),
  });
  proj.updatedAt = now();
  DB.saveProject(proj);
  closeModal(); toast(`${name}を追加しました`,'success'); render();
}

function openEditCharModal(projId, charId) {
  const proj = DB.getProject(projId);
  const ch = (proj?.characters||[]).find(c => c.id === charId);
  if (!ch) return;
  openModal(
    `<i class="fas fa-user" style="color:#c86af7"></i> ${esc(ch.name)} — キャラクター詳細`,
    `<div class="grid-2">
      <div class="form-group"><label class="form-label">名前</label><input class="form-input" id="ech-name" value="${esc(ch.name||'')}"></div>
      <div class="form-group"><label class="form-label">ふりがな</label><input class="form-input" id="ech-kana" value="${esc(ch.kana||'')}"></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">役割</label>
        <select class="form-select" id="ech-role">
          ${['主人公','ヒロイン/ヒーロー','敵・antagonist','相棒','メンター','サブキャラ','その他'].map(r=>`<option ${r===ch.role?'selected':''}>${r}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">年齢</label><input class="form-input" id="ech-age" value="${esc(ch.age||'')}"></div>
    </div>
    <div class="form-group"><label class="form-label">キャッチフレーズ</label><input class="form-input" id="ech-tagline" value="${esc(ch.tagline||'')}"></div>
    <div class="form-group"><label class="form-label">職業・立場</label><input class="form-input" id="ech-job" value="${esc(ch.job||'')}"></div>
    <div class="form-group"><label class="form-label">外見・風貌</label><textarea class="form-textarea" id="ech-appearance" rows="2">${esc(ch.appearance||'')}</textarea></div>
    <div class="form-group"><label class="form-label">性格・特徴（カンマ区切り）</label><input class="form-input" id="ech-traits" value="${esc((ch.traits||[]).join(','))}"></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">欲求（Want）</label><input class="form-input" id="ech-want" value="${esc(ch.want||'')}"></div>
      <div class="form-group"><label class="form-label">必要（Need）</label><input class="form-input" id="ech-need" value="${esc(ch.need||'')}"></div>
    </div>
    <div class="form-group"><label class="form-label">バックストーリー</label><textarea class="form-textarea" id="ech-back" rows="3">${esc(ch.back||'')}</textarea></div>
    <div class="form-group"><label class="form-label">口癖・話し方</label><input class="form-input" id="ech-speech" value="${esc(ch.speech||'')}"></div>
    <div class="form-group"><label class="form-label">絵文字</label><input class="form-input" id="ech-emoji" value="${esc(ch.emoji||'👤')}" maxlength="2"></div>`,
    `<button class="btn btn-danger btn-sm" onclick="deleteCharacter('${projId}','${charId}')"><i class="fas fa-trash"></i> 削除</button>
     <button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveEditChar('${projId}','${charId}')"><i class="fas fa-floppy-disk"></i> 保存</button>`,
    { size: 'modal-lg' }
  );
}

function saveEditChar(projId, charId) {
  const proj = DB.getProject(projId);
  const ch = (proj?.characters||[]).find(c => c.id === charId);
  if (!ch) return;
  ch.name       = $('#ech-name')?.value?.trim()||ch.name;
  ch.kana       = $('#ech-kana')?.value?.trim()||'';
  ch.role       = $('#ech-role')?.value||'その他';
  ch.age        = $('#ech-age')?.value||'';
  ch.tagline    = $('#ech-tagline')?.value?.trim()||'';
  ch.job        = $('#ech-job')?.value?.trim()||'';
  ch.appearance = $('#ech-appearance')?.value?.trim()||'';
  ch.traits     = ($('#ech-traits')?.value||'').split(',').map(t=>t.trim()).filter(Boolean);
  ch.want       = $('#ech-want')?.value?.trim()||'';
  ch.need       = $('#ech-need')?.value?.trim()||'';
  ch.back       = $('#ech-back')?.value?.trim()||'';
  ch.speech     = $('#ech-speech')?.value?.trim()||'';
  ch.emoji      = $('#ech-emoji')?.value||'👤';
  proj.updatedAt = now();
  DB.saveProject(proj);
  closeModal(); toast('保存しました','success'); render();
}

function deleteCharacter(projId, charId) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.characters = (proj.characters||[]).filter(c => c.id !== charId);
  proj.updatedAt = now();
  DB.saveProject(proj);
  closeModal(); toast('削除しました','info'); render();
}

function openAddRelModal(projId) {
  const proj = DB.getProject(projId);
  const chars = proj?.characters || [];
  if (chars.length < 2) { toast('キャラクターを2人以上登録してください','error'); return; }
  openModal(
    `<i class="fas fa-diagram-project" style="color:var(--accent)"></i> 関係性を追加`,
    `<div class="grid-2">
      <div class="form-group"><label class="form-label">キャラクター1</label>
        <select class="form-select" id="rel-c1">${chars.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">キャラクター2</label>
        <select class="form-select" id="rel-c2">${chars.map((c,i)=>`<option value="${c.id}" ${i===1?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
    </div>
    <div class="form-group"><label class="form-label">関係の種類</label>
      <select class="form-select" id="rel-type">
        <option>恋愛</option><option>友人</option><option>ライバル</option><option>親子</option>
        <option>兄弟</option><option>師弟</option><option>上司部下</option><option>敵</option><option>その他</option>
      </select></div>
    <div class="form-group"><label class="form-label">メモ</label>
      <input class="form-input" id="rel-note" placeholder="関係の詳細・複雑さなど"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="addRel('${projId}')"><i class="fas fa-plus"></i> 追加</button>`
  );
}

function addRel(projId) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.relationships = proj.relationships || [];
  proj.relationships.push({
    id: uid(), char1: $('#rel-c1')?.value, char2: $('#rel-c2')?.value,
    type: $('#rel-type')?.value||'その他', note: $('#rel-note')?.value?.trim()||''
  });
  proj.updatedAt = now();
  DB.saveProject(proj);
  closeModal(); toast('追加しました','success'); render();
}

function deleteRel(projId, relId) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.relationships = (proj.relationships||[]).filter(r => r.id !== relId);
  proj.updatedAt = now();
  DB.saveProject(proj);
  render();
}

// ================================================================
//  PAGE: プロット設計
// ================================================================
function renderPlot(proj) {
  const plots = proj.plots || [];
  const ACT_LABELS = ['第一幕（発端）','第二幕前半（展開）','第二幕後半（深化）','第三幕（クライマックス〜結末）'];

  const plotByAct = ACT_LABELS.map((label, actIdx) => {
    const actPlots = plots.filter(p => p.act === actIdx);
    const cards = actPlots.length === 0
      ? `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">シーンをここに追加</div>`
      : actPlots.map(p => `
        <div class="scene-card" onclick="openEditPlotModal('${proj.id}','${p.id}')">
          <div class="scene-num">シーン ${p.num||'?'}</div>
          <div class="scene-title">${esc(p.title||'無題シーン')}</div>
          <div class="scene-loc"><i class="fas fa-location-dot" style="font-size:9px"></i>${esc(p.location||'')}</div>
          ${p.tension ? `<div style="margin-top:6px"><div class="meter-bar" style="height:4px"><div class="meter-fill" style="width:${p.tension*10}%;background:${p.tension>7?'var(--red)':p.tension>4?'var(--orange)':'var(--accent)'}"></div></div></div>` : ''}
        </div>`).join('');
    return `
      <div class="plot-column">
        <div class="plot-column-header">${label}</div>
        <div class="plot-column-body" id="act-${actIdx}">${cards}</div>
        <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:4px;font-size:11px" onclick="openAddPlotModal('${proj.id}',${actIdx})">
          <i class="fas fa-plus"></i> 追加
        </button>
      </div>`;
  }).join('');

  const STRUCTURES = [
    { name:'三幕構成', desc:'発端→展開→結末の古典的構造', color:'var(--accent)' },
    { name:'英雄の旅', desc:'ヒーローズジャーニー（12段階）', color:'var(--accent4)' },
    { name:'起承転結', desc:'日本の伝統的な四部構成', color:'var(--accent2)' },
    { name:'五幕構成', desc:'シェイクスピア式の五段階', color:'var(--accent3)' },
  ];

  return `
  <div class="section-header">
    <div class="section-title"><i class="fas fa-diagram-project" style="color:#f76ca0"></i> プロット設計 <span class="phase-badge-lg">Phase 4</span></div>
    <div class="section-desc">物語の骨格を組み立て、各シーンの流れを設計しましょう</div>
  </div>
  <div class="grid-2" style="margin-bottom:20px">
    <div class="card">
      <div class="card-title" style="margin-bottom:12px"><i class="fas fa-sitemap icon"></i> 構造テンプレート</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${STRUCTURES.map(s => `
          <div style="padding:10px 14px;border:1px solid var(--border);border-radius:6px;cursor:pointer;flex:1;min-width:140px;transition:all .15s"
            onmouseover="this.style.borderColor='${s.color}'" onmouseout="this.style.borderColor='var(--border)'"
            onclick="applyStructure('${proj.id}','${s.name}')">
            <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:3px">${s.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${s.desc}</div>
          </div>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-title" style="margin-bottom:12px"><i class="fas fa-chart-line icon"></i> テンションカーブ</div>
      <div style="position:relative;height:80px;background:var(--bg-primary);border-radius:6px;overflow:hidden;border:1px solid var(--border)">
        <svg width="100%" height="100%" style="position:absolute;inset:0">
          ${renderTensionCurve(plots)}
        </svg>
        <div style="position:absolute;bottom:4px;left:0;right:0;display:flex;justify-content:space-around">
          ${ACT_LABELS.map((l,i)=>`<span style="font-size:9px;color:var(--text-muted)">${i+1}幕</span>`).join('')}
        </div>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-table-columns icon"></i> プロットボード（${plots.length}シーン）</div>
      <button class="btn btn-primary btn-sm" onclick="openAddPlotModal('${proj.id}',0)"><i class="fas fa-plus"></i> シーン追加</button>
    </div>
    <div class="plot-board" id="plot-board">${plotByAct}</div>
  </div>`;
}

function renderTensionCurve(plots) {
  if (!plots || plots.length === 0) return '';
  const pts = plots.map((p,i) => ({
    x: (i / Math.max(plots.length-1,1)) * 100,
    y: 100 - ((p.tension || 5) * 10)
  }));
  if (pts.length < 2) return '';
  const path = pts.map((p,i) => `${i===0?'M':'L'}${p.x}%,${p.y}%`).join(' ');
  return `<polyline points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2" opacity="0.7"/>`;
}

function openAddPlotModal(projId, actIdx) {
  const proj = DB.getProject(projId);
  const chars = proj?.characters || [];
  const nextNum = (proj?.plots||[]).length + 1;
  openModal(
    `<i class="fas fa-plus" style="color:var(--accent)"></i> シーンを追加`,
    `<div class="grid-2">
      <div class="form-group"><label class="form-label">シーン番号</label><input class="form-input" id="pl-num" type="number" value="${nextNum}"></div>
      <div class="form-group"><label class="form-label">幕</label>
        <select class="form-select" id="pl-act">
          <option value="0" ${actIdx===0?'selected':''}>第一幕（発端）</option>
          <option value="1" ${actIdx===1?'selected':''}>第二幕前半（展開）</option>
          <option value="2" ${actIdx===2?'selected':''}>第二幕後半（深化）</option>
          <option value="3" ${actIdx===3?'selected':''}>第三幕（クライマックス〜結末）</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">シーンタイトル</label><input class="form-input" id="pl-title" placeholder="このシーンを一言で"></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">場所</label><input class="form-input" id="pl-loc" placeholder="例：警察署 取調室"></div>
      <div class="form-group"><label class="form-label">時間帯</label>
        <select class="form-select" id="pl-time"><option>昼</option><option>夜</option><option>夕方</option><option>朝</option><option>不明</option></select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">このシーンで起きること（目的・出来事）</label>
      <textarea class="form-textarea" id="pl-what" rows="3" placeholder="このシーンで何が起きるか、何が変わるか"></textarea></div>
    <div class="form-group"><label class="form-label">登場キャラクター</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${chars.map(c=>`<label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer">
          <input type="checkbox" class="pl-char-check" value="${c.id}"> ${esc(c.name)}</label>`).join('')}
      </div></div>
    <div class="form-group"><label class="form-label">テンション強度（1〜10）</label>
      <input class="form-input" id="pl-tension" type="range" min="1" max="10" value="5" oninput="$('#pl-tension-val').textContent=this.value">
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">強度: <span id="pl-tension-val">5</span></div></div>
    <div class="form-group"><label class="form-label">メモ・演出ヒント</label>
      <textarea class="form-textarea" id="pl-notes" rows="2" placeholder="演出的なメモ、伏線など"></textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="addPlot('${projId}')"><i class="fas fa-plus"></i> 追加</button>`,
    { size: 'modal-lg' }
  );
  setTimeout(() => $('#pl-title')?.focus(), 50);
}

function addPlot(projId) {
  const title = $('#pl-title')?.value?.trim();
  if (!title) { toast('シーンタイトルを入力してください','error'); return; }
  const proj = DB.getProject(projId);
  if (!proj) return;
  const chars = [...document.querySelectorAll('.pl-char-check:checked')].map(c => c.value);
  proj.plots = proj.plots || [];
  proj.plots.push({
    id: uid(), num: parseInt($('#pl-num')?.value)||proj.plots.length+1,
    act: parseInt($('#pl-act')?.value)||0, title,
    location: $('#pl-loc')?.value?.trim()||'', time: $('#pl-time')?.value||'昼',
    what: $('#pl-what')?.value?.trim()||'', chars,
    tension: parseInt($('#pl-tension')?.value)||5,
    notes: $('#pl-notes')?.value?.trim()||'', createdAt: now(),
  });
  proj.plots.sort((a,b) => (a.act - b.act) || (a.num - b.num));
  proj.updatedAt = now();
  DB.saveProject(proj);
  closeModal(); toast('シーンを追加しました','success'); render();
}

function openEditPlotModal(projId, plotId) {
  const proj = DB.getProject(projId);
  const pl = (proj?.plots||[]).find(p => p.id === plotId);
  if (!pl) return;
  const chars = proj?.characters || [];
  openModal(
    `<i class="fas fa-film" style="color:var(--accent)"></i> シーン ${pl.num} — ${esc(pl.title)}`,
    `<div class="grid-2">
      <div class="form-group"><label class="form-label">タイトル</label><input class="form-input" id="epl-title" value="${esc(pl.title||'')}"></div>
      <div class="form-group"><label class="form-label">場所</label><input class="form-input" id="epl-loc" value="${esc(pl.location||'')}"></div>
    </div>
    <div class="form-group"><label class="form-label">このシーンで起きること</label>
      <textarea class="form-textarea" id="epl-what" rows="4">${esc(pl.what||'')}</textarea></div>
    <div class="form-group"><label class="form-label">テンション（1〜10）</label>
      <input type="range" min="1" max="10" value="${pl.tension||5}" id="epl-tension" class="form-input" oninput="$('#epl-tension-val').textContent=this.value">
      <span id="epl-tension-val" style="font-size:12px;color:var(--text-muted)">${pl.tension||5}</span>
    </div>
    <div class="form-group"><label class="form-label">メモ</label><textarea class="form-textarea" id="epl-notes" rows="2">${esc(pl.notes||'')}</textarea></div>`,
    `<button class="btn btn-danger btn-sm" onclick="deletePlot('${projId}','${plotId}')"><i class="fas fa-trash"></i></button>
     <button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveEditPlot('${projId}','${plotId}')">保存</button>`
  );
}

function saveEditPlot(projId, plotId) {
  const proj = DB.getProject(projId);
  const pl = (proj?.plots||[]).find(p => p.id === plotId);
  if (!pl) return;
  pl.title    = $('#epl-title')?.value?.trim()||pl.title;
  pl.location = $('#epl-loc')?.value?.trim()||'';
  pl.what     = $('#epl-what')?.value?.trim()||'';
  pl.tension  = parseInt($('#epl-tension')?.value)||5;
  pl.notes    = $('#epl-notes')?.value?.trim()||'';
  proj.updatedAt = now();
  DB.saveProject(proj);
  closeModal(); toast('保存しました','success'); render();
}

function deletePlot(projId, plotId) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.plots = (proj.plots||[]).filter(p => p.id !== plotId);
  proj.updatedAt = now();
  DB.saveProject(proj);
  closeModal(); toast('削除しました','info'); render();
}

function applyStructure(projId, structName) {
  toast(`${structName}テンプレートを適用しました（シーンを手動で追加してください）`, 'info');
}

// ================================================================
//  PAGE: アウトライン
// ================================================================
function renderOutline(proj) {
  const outline = proj.outline || { acts: [] };
  const plots = proj.plots || [];

  // Build from plots if outline empty
  const acts = outline.acts.length > 0 ? outline.acts : buildDefaultActs(plots);

  const actSections = acts.map((act, ai) => {
    const sceneItems = (act.scenes || []).map((s, si) => `
      <div class="outline-scene" onclick="openEditOutlineScene('${proj.id}',${ai},${si})">
        <div class="outline-scene-num">${si+1}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:500;color:var(--text-primary);margin-bottom:2px">${esc(s.title||'無題')}</div>
          <div style="font-size:11px;color:var(--text-muted)">${esc(s.location||'')} ${s.time?'/ '+s.time:''}</div>
          ${s.beat ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:4px">${esc(s.beat)}</div>` : ''}
        </div>
        <span class="tag tag-${s.type==='転換点'?'pink':s.type==='クライマックス'?'red':s.type==='伏線'?'yellow':'gray'}" style="font-size:10px">${s.type||'通常'}</span>
      </div>`).join('');

    return `
    <div class="act-section">
      <div class="act-header" onclick="toggleAct(${ai})">
        <div class="act-number">${ai+1}</div>
        <div style="flex:1">
          <div class="act-title">${esc(act.title||`第${ai+1}幕`)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${(act.scenes||[]).length}シーン ${act.summary ? '— '+act.summary.slice(0,40) : ''}</div>
        </div>
        <i class="fas fa-chevron-down" id="act-chevron-${ai}" style="color:var(--text-muted);font-size:12px;transition:transform .2s"></i>
      </div>
      <div class="act-scenes" id="act-scenes-${ai}">
        <div style="margin-bottom:10px">
          <input class="form-input" id="act-summary-${ai}" placeholder="この幕のサマリー…" value="${esc(act.summary||'')}"
            onblur="saveActSummary('${proj.id}',${ai},this.value)" style="font-size:12px">
        </div>
        ${sceneItems}
        <button class="btn btn-ghost btn-sm" style="margin-top:6px;font-size:11px" onclick="addOutlineScene('${proj.id}',${ai})">
          <i class="fas fa-plus"></i> シーン追加
        </button>
      </div>
    </div>`;
  }).join('');

  return `
  <div class="section-header">
    <div class="section-title"><i class="fas fa-list-ol" style="color:#7c6af7"></i> アウトライン（構成） <span class="phase-badge-lg">Phase 6</span></div>
    <div class="section-desc">全体の流れを俯瞰し、物語の骨格を確定させましょう</div>
  </div>
  <div class="grid-2" style="margin-bottom:20px">
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-size:14px;font-weight:600;color:var(--text-primary)">幕構成</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="importPlotsToOutline('${proj.id}')"><i class="fas fa-file-import"></i> プロットから取込</button>
          <button class="btn btn-primary btn-sm" onclick="addActToOutline('${proj.id}')"><i class="fas fa-plus"></i> 幕を追加</button>
        </div>
      </div>
      ${acts.length === 0 ? `<div class="card" style="text-align:center;padding:40px;color:var(--text-muted)">
        <i class="fas fa-list-ol" style="font-size:32px;display:block;margin-bottom:12px;opacity:0.3"></i>
        幕を追加するか、プロットから取り込んでください
      </div>` : actSections}
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="card-title" style="margin-bottom:12px"><i class="fas fa-chart-bar icon"></i> 構成分析</div>
        ${renderOutlineAnalysis(proj)}
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:12px"><i class="fas fa-clipboard-check icon"></i> アウトラインチェック</div>
        ${renderOutlineChecklist(proj)}
      </div>
    </div>
  </div>`;
}

function buildDefaultActs(plots) {
  if (plots.length === 0) return [];
  const actMap = {};
  plots.forEach(p => {
    if (!actMap[p.act]) actMap[p.act] = [];
    actMap[p.act].push({ id: p.id, title: p.title, location: p.location, time: p.time, beat: p.what, type: '通常' });
  });
  return Object.entries(actMap).map(([act, scenes]) => ({
    id: uid(), title: ['第一幕（発端）','第二幕前半','第二幕後半','第三幕（結末）'][parseInt(act)] || `第${parseInt(act)+1}幕`,
    summary: '', scenes
  }));
}

function renderOutlineAnalysis(proj) {
  const plots = proj.plots || [];
  const acts = (proj.outline?.acts || []);
  const totalScenes = acts.reduce((a,act) => a + (act.scenes||[]).length, 0);
  const avgTension = plots.length ? Math.round(plots.reduce((a,p) => a+(p.tension||5),0)/plots.length*10)/10 : 0;
  return `
  <div class="meter-row"><div class="meter-label">総シーン数</div><div style="font-size:14px;font-weight:600;color:var(--text-primary)">${totalScenes}</div></div>
  <div class="meter-row"><div class="meter-label">プロット数</div><div style="font-size:14px;font-weight:600;color:var(--text-primary)">${plots.length}</div></div>
  <div class="meter-row"><div class="meter-label">平均テンション</div><div style="font-size:14px;font-weight:600;color:var(--text-primary)">${avgTension}</div></div>
  <div style="margin-top:12px;font-size:12px;color:var(--text-muted)">キャラクター別登場シーン</div>
  ${(proj.characters||[]).map(ch => {
    const cnt = plots.filter(p=>(p.chars||[]).includes(ch.id)).length;
    const pct = plots.length ? Math.round(cnt/plots.length*100) : 0;
    return `<div class="meter-row"><div class="meter-label" style="width:70px">${esc(ch.name.slice(0,4))}</div>
      <div class="meter-bar"><div class="meter-fill" style="width:${pct}%;background:${ch.color||'var(--accent)'}"></div></div>
      <div class="meter-value">${cnt}回</div></div>`;
  }).join('')}`;
}

function renderOutlineChecklist(proj) {
  const checks = [
    {id:'oc1',text:'第一幕の「発端となる出来事」が明確'},
    {id:'oc2',text:'主人公の目標が第一幕で設定されている'},
    {id:'oc3',text:'中間点（ミッドポイント）の転換が設計されている'},
    {id:'oc4',text:'クライマックスシーンが特定できている'},
    {id:'oc5',text:'すべての伏線に回収シーンがある'},
    {id:'oc6',text:'各幕の長さバランスが適切'},
  ];
  const done = proj.outlineChecks || [];
  return renderChecklistItems(done, checks, function(c) {
    return "toggleCheck('" + proj.id + "','outline',this,'" + c.id + "')";
  });
}

function toggleAct(idx) {
  const s = $(`#act-scenes-${idx}`);
  const ch = $(`#act-chevron-${idx}`);
  if (!s) return;
  const isHidden = s.style.display === 'none';
  s.style.display = isHidden ? '' : 'none';
  if (ch) ch.style.transform = isHidden ? '' : 'rotate(-90deg)';
}

function addActToOutline(projId) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.outline = proj.outline || { acts: [] };
  proj.outline.acts.push({ id: uid(), title: `第${proj.outline.acts.length+1}幕`, summary: '', scenes: [] });
  proj.updatedAt = now();
  DB.saveProject(proj);
  render();
}

function importPlotsToOutline(projId) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  const acts = buildDefaultActs(proj.plots || []);
  if (acts.length === 0) { toast('プロットにシーンがありません','error'); return; }
  proj.outline = { acts };
  proj.updatedAt = now();
  DB.saveProject(proj);
  toast('プロットから取り込みました','success');
  render();
}

function saveActSummary(projId, actIdx, val) {
  const proj = DB.getProject(projId);
  if (!proj || !proj.outline) return;
  if (proj.outline.acts[actIdx]) { proj.outline.acts[actIdx].summary = val; }
  proj.updatedAt = now();
  DB.saveProject(proj);
}

function addOutlineScene(projId, actIdx) {
  const proj = DB.getProject(projId);
  if (!proj || !proj.outline) return;
  const act = proj.outline.acts[actIdx];
  if (!act) return;
  act.scenes = act.scenes || [];
  act.scenes.push({ id: uid(), title: '新しいシーン', location: '', time: '', beat: '', type: '通常' });
  proj.updatedAt = now();
  DB.saveProject(proj);
  render();
}

function openEditOutlineScene(projId, actIdx, sceneIdx) {
  const proj = DB.getProject(projId);
  const scene = proj?.outline?.acts?.[actIdx]?.scenes?.[sceneIdx];
  if (!scene) return;
  openModal(
    `<i class="fas fa-film" style="color:var(--accent)"></i> シーン編集`,
    `<div class="form-group"><label class="form-label">タイトル</label><input class="form-input" id="os-title" value="${esc(scene.title||'')}"></div>
     <div class="grid-2">
       <div class="form-group"><label class="form-label">場所</label><input class="form-input" id="os-loc" value="${esc(scene.location||'')}"></div>
       <div class="form-group"><label class="form-label">時間帯</label><select class="form-select" id="os-time">
         ${['昼','夜','夕方','朝','不明'].map(t=>`<option ${t===scene.time?'selected':''}>${t}</option>`).join('')}
       </select></div>
     </div>
     <div class="form-group"><label class="form-label">ビート（何が起きるか）</label>
       <textarea class="form-textarea" id="os-beat" rows="3">${esc(scene.beat||'')}</textarea></div>
     <div class="form-group"><label class="form-label">シーンの種類</label>
       <select class="form-select" id="os-type">
         ${['通常','転換点','クライマックス','伏線','伏線回収','コメディ','感動'].map(t=>`<option ${t===scene.type?'selected':''}>${t}</option>`).join('')}
       </select></div>`,
    `<button class="btn btn-danger btn-sm" onclick="deleteOutlineScene('${projId}',${actIdx},${sceneIdx})"><i class="fas fa-trash"></i></button>
     <button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveOutlineScene('${projId}',${actIdx},${sceneIdx})">保存</button>`
  );
}

function saveOutlineScene(projId, actIdx, sceneIdx) {
  const proj = DB.getProject(projId);
  const scene = proj?.outline?.acts?.[actIdx]?.scenes?.[sceneIdx];
  if (!scene) return;
  scene.title    = $('#os-title')?.value?.trim()||'';
  scene.location = $('#os-loc')?.value?.trim()||'';
  scene.time     = $('#os-time')?.value||'昼';
  scene.beat     = $('#os-beat')?.value?.trim()||'';
  scene.type     = $('#os-type')?.value||'通常';
  proj.updatedAt = now();
  DB.saveProject(proj);
  closeModal(); render();
}

function deleteOutlineScene(projId, actIdx, sceneIdx) {
  const proj = DB.getProject(projId);
  if (!proj?.outline?.acts?.[actIdx]) return;
  proj.outline.acts[actIdx].scenes.splice(sceneIdx, 1);
  proj.updatedAt = now();
  DB.saveProject(proj);
  closeModal(); render();
}

// ================================================================
//  PAGE: 脚本エディタ（初稿）
// ================================================================
function renderEditor(proj) {
  const drafts = proj.drafts || [];
  const activeDraftId = State.activeDraftId || (drafts[0]?.id);
  const activeDraft = drafts.find(d => d.id === activeDraftId) || drafts[0];

  const draftTabs = drafts.map(d => `
    <div class="tab ${activeDraft?.id===d.id?'active':''}" onclick="switchDraft('${proj.id}','${d.id}')">
      <i class="fas fa-file-lines"></i> ${esc(d.name||'稿')}
      ${drafts.length > 1 ? `<button class="btn btn-ghost" style="padding:1px 4px;margin-left:4px" onclick="event.stopPropagation();deleteDraft('${proj.id}','${d.id}')"><i class="fas fa-xmark" style="font-size:9px;color:var(--text-muted)"></i></button>` : ''}
    </div>`).join('');

  const scriptContent = activeDraft ? activeDraft.content || '' : '';
  const wordCount = countWords(scriptContent);
  const pageCount = Math.max(1, Math.ceil(wordCount / 400));

  return `
  <div class="section-header">
    <div class="section-title"><i class="fas fa-pen-nib" style="color:#6af7c8"></i> 脚本エディタ <span class="phase-badge-lg">Phase 7</span></div>
    <div class="section-desc">日本の脚本フォーマットで執筆しましょう</div>
  </div>
  <div class="editor-layout">
    <div class="editor-main">
      <div class="editor-toolbar">
        <div class="editor-toolbar-group">
          ${draftTabs}
          <button class="btn btn-ghost btn-sm" onclick="addNewDraft('${proj.id}')"><i class="fas fa-plus"></i></button>
        </div>
        <div class="editor-toolbar-group">
          <button class="btn btn-secondary btn-sm" onclick="insertElement('scene-heading')"><i class="fas fa-clapperboard"></i> シーン</button>
          <button class="btn btn-secondary btn-sm" onclick="insertElement('action')"><i class="fas fa-align-left"></i> ト書き</button>
          <button class="btn btn-secondary btn-sm" onclick="insertElement('character')"><i class="fas fa-user"></i> キャラ</button>
          <button class="btn btn-secondary btn-sm" onclick="insertElement('dialogue')"><i class="fas fa-comment"></i> セリフ</button>
          <button class="btn btn-secondary btn-sm" onclick="insertElement('parenthetical')"><i class="fas fa-brackets-round"></i> 指定</button>
          <button class="btn btn-secondary btn-sm" onclick="insertElement('transition')"><i class="fas fa-right-long"></i> 転換</button>
        </div>
        <div class="editor-toolbar-group" style="margin-left:auto">
          <span style="font-size:11px;color:var(--text-muted)">${wordCount.toLocaleString()}字 / 約${pageCount}ページ</span>
          <button class="btn btn-primary btn-sm" onclick="saveEditorContent('${proj.id}','${activeDraft?.id||''}')"><i class="fas fa-floppy-disk"></i> 保存</button>
        </div>
      </div>
      <div class="editor-body">
        <div class="script-page">
          <div class="script-title-block">
            <div class="main-title">${esc(proj.title)}</div>
            <div class="subtitle">${esc(proj.genre)} / ${esc(proj.format)}</div>
          </div>
          <textarea id="script-editor"
            style="width:100%;min-height:600px;background:transparent;border:none;outline:none;font-family:'Noto Serif JP',serif;font-size:13px;line-height:2.2;color:#1a1a1a;resize:none;white-space:pre-wrap;"
            placeholder="ここに脚本を書いてください。&#10;&#10;【シーン番号】場所（外/内）— 時間帯&#10;&#10;　ト書き（情景・動作の説明）&#10;&#10;キャラクター名&#10;　（心情・行動の指定）&#10;　「セリフ」&#10;&#10;ＯＬ（オーバーラップ）/ カット TO: / FI（フェードイン）"
            oninput="onEditorInput('${proj.id}','${activeDraft?.id||''}')"
          >${esc(scriptContent)}</textarea>
        </div>
      </div>
    </div>
    <div class="editor-sidebar">
      <div class="editor-panel">
        <div class="editor-panel-header"><i class="fas fa-list"></i> シーンナビ</div>
        <div class="editor-panel-body" id="scene-nav">
          ${renderSceneNav(scriptContent)}
        </div>
      </div>
      <div class="editor-panel">
        <div class="editor-panel-header"><i class="fas fa-chart-pie"></i> 統計</div>
        <div class="editor-panel-body">
          ${renderEditorStats(proj, scriptContent)}
        </div>
      </div>
      <div class="editor-panel">
        <div class="editor-panel-header"><i class="fas fa-users"></i> キャラクター</div>
        <div class="editor-panel-body">
          ${(proj.characters||[]).map(ch=>`
            <div style="display:flex;align-items:center;gap:6px;padding:4px 0;cursor:pointer;font-size:12px;color:var(--text-secondary)"
              onclick="insertCharName('${esc(ch.name)}')">
              <span>${ch.emoji||'👤'}</span> ${esc(ch.name)}
              <span style="font-size:10px;color:var(--text-muted);margin-left:auto">${esc(ch.role||'')}</span>
            </div>`).join('') || `<div style="font-size:12px;color:var(--text-muted)">キャラ未登録</div>`}
        </div>
      </div>
      <div class="editor-panel">
        <div class="editor-panel-header"><i class="fas fa-lightbulb"></i> 脚本フォーマットガイド</div>
        <div class="editor-panel-body">
          <div style="font-size:11px;color:var(--text-muted);line-height:1.8">
            <div><span style="color:var(--accent-light);font-weight:600">シーン見出し：</span><br>【1】○○（外）— 昼</div>
            <div style="margin-top:6px"><span style="color:var(--accent3);font-weight:600">ト書き：</span><br>　〜する。/〜だ。</div>
            <div style="margin-top:6px"><span style="color:var(--accent4);font-weight:600">キャラ名：</span><br>（ページ中央・大文字）</div>
            <div style="margin-top:6px"><span style="color:var(--accent2);font-weight:600">セリフ：</span><br>　「〜〜〜」</div>
            <div style="margin-top:6px"><span style="color:var(--text-secondary);font-weight:600">転換：</span><br>ＯＬ / カットＴＯ / ＦＩ / ＦＯ</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function renderSceneNav(content) {
  const lines = (content||'').split('\n');
  const scenes = lines.filter(l => /^【\d+】|^[０-９\d]+[．\.]\s*[^\s]/.test(l.trim()) || l.includes('（外）') || l.includes('（内）'));
  if (scenes.length === 0) return `<div style="font-size:12px;color:var(--text-muted)">シーン見出し未検出</div>`;
  return scenes.slice(0, 30).map((s, i) => `
    <div class="scene-list-item">
      <span style="color:var(--text-muted);font-size:10px;flex-shrink:0">S${i+1}</span>
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px">${esc(s.trim().slice(0,28))}</span>
    </div>`).join('');
}

function renderEditorStats(proj, content) {
  const wc = countWords(content);
  const lines = (content||'').split('\n').length;
  const dialogueLines = (content||'').split('\n').filter(l => l.trim().startsWith('「') || l.trim().startsWith('『')).length;
  const target = proj.wordTarget || 12000;
  const pct = Math.min(100, Math.round(wc/target*100));
  return `
  <div style="margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:3px">
      <span>文字数</span><span>${wc.toLocaleString()} / ${target.toLocaleString()}</span>
    </div>
    <div class="wc-bar"><div class="wc-fill" style="width:${pct}%"></div></div>
  </div>
  <div style="font-size:11px;color:var(--text-muted);line-height:2">
    <div>行数: <span style="color:var(--text-primary)">${lines}</span></div>
    <div>セリフ行: <span style="color:var(--text-primary)">${dialogueLines}</span></div>
    <div>約ページ数: <span style="color:var(--text-primary)">${Math.ceil(wc/400)}</span></div>
  </div>`;
}

let editorSaveTimer = null;
function onEditorInput(projId, draftId) {
  clearTimeout(editorSaveTimer);
  // Update scene nav and stats live
  const content = $('#script-editor')?.value || '';
  const navEl = $('#scene-nav');
  if (navEl) navEl.innerHTML = renderSceneNav(content);
  editorSaveTimer = setTimeout(() => saveEditorContent(projId, draftId), 1500);
}

function saveEditorContent(projId, draftId) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  const content = $('#script-editor')?.value || '';
  proj.drafts = proj.drafts || [];
  let draft = proj.drafts.find(d => d.id === draftId);
  if (!draft) {
    draft = { id: draftId || uid(), name: '第1稿', content: '', createdAt: now() };
    proj.drafts.push(draft);
  }
  draft.content = content;
  draft.updatedAt = now();
  proj.updatedAt = now();
  DB.saveProject(proj);
}

function addNewDraft(projId) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.drafts = proj.drafts || [];
  const newDraft = { id: uid(), name: `第${proj.drafts.length+1}稿`, content: '', createdAt: now() };
  proj.drafts.push(newDraft);
  proj.updatedAt = now();
  DB.saveProject(proj);
  State.activeDraftId = newDraft.id;
  render();
}

function switchDraft(projId, draftId) {
  saveEditorContent(projId, State.activeDraftId || '');
  State.activeDraftId = draftId;
  render();
}

function deleteDraft(projId, draftId) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.drafts = (proj.drafts||[]).filter(d => d.id !== draftId);
  proj.updatedAt = now();
  DB.saveProject(proj);
  if (State.activeDraftId === draftId) State.activeDraftId = proj.drafts[0]?.id || null;
  render();
}

function insertElement(type) {
  const ta = $('#script-editor');
  if (!ta) return;
  const inserts = {
    'scene-heading': '\n【　】　　（　）— 昼\n\n',
    'action': '\n　\n\n',
    'character': '\n\n\n',
    'dialogue': '\n　「」\n\n',
    'parenthetical': '（）\n',
    'transition': '\n\t\t\t\t\t\tＯＬ\n\n',
  };
  const text = inserts[type] || '\n';
  const pos = ta.selectionStart;
  ta.value = ta.value.slice(0, pos) + text + ta.value.slice(pos);
  ta.selectionStart = ta.selectionEnd = pos + text.length;
  ta.focus();
}

function insertCharName(name) {
  const ta = $('#script-editor');
  if (!ta) return;
  const pos = ta.selectionStart;
  const text = `\n\n${name}\n　「」\n`;
  ta.value = ta.value.slice(0, pos) + text + ta.value.slice(pos);
  ta.selectionStart = ta.selectionEnd = pos + text.length;
  ta.focus();
}

// ================================================================
//  PAGE: 大改稿・構造リライト
// ================================================================
function renderRevision(proj) {
  const revisions = proj.revisions || [];
  const drafts = proj.drafts || [];

  const revItems = revisions.length === 0
    ? `<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px">
        <i class="fas fa-rotate" style="font-size:32px;display:block;margin-bottom:12px;opacity:0.3"></i>
        改稿履歴がありません
       </div>`
    : `<div class="revision-timeline">` + revisions.map(r => `
        <div class="revision-item">
          <div class="revision-date">${fmtDatetime(r.createdAt)}</div>
          <div class="revision-title">${esc(r.title||'改稿')}</div>
          <div class="revision-notes">${esc(r.notes||'').replace(/\n/g,'<br>')}</div>
          ${r.type ? `<span class="tag tag-${r.type==='構造リライト'?'red':r.type==='セリフ修正'?'purple':'yellow'}" style="margin-top:8px;display:inline-flex">${esc(r.type)}</span>` : ''}
        </div>`).join('') + `</div>`;

  return `
  <div class="section-header">
    <div class="section-title"><i class="fas fa-rotate" style="color:#f7a06a"></i> 大改稿・構造リライト <span class="phase-badge-lg">Phase 8</span></div>
    <div class="section-desc">構造的な問題を直し、物語全体を組み直しましょう</div>
  </div>
  <div class="grid-2" style="gap:20px">
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-clock-rotate-left icon"></i> 改稿履歴</div>
          <button class="btn btn-primary btn-sm" onclick="openAddRevisionModal('${proj.id}')"><i class="fas fa-plus"></i> 改稿を記録</button>
        </div>
        ${revItems}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="card-title" style="margin-bottom:14px"><i class="fas fa-stethoscope icon"></i> 構造診断チェック</div>
        ${renderRevisionChecklist(proj)}
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:14px"><i class="fas fa-copy icon"></i> 稿を複製して改稿</div>
        ${drafts.length === 0
          ? `<div style="font-size:13px;color:var(--text-muted)">先にエディタで稿を作成してください</div>`
          : `<div style="display:flex;flex-direction:column;gap:8px">
              ${drafts.map(d => `
                <div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg-primary);border-radius:6px;border:1px solid var(--border)">
                  <i class="fas fa-file-lines" style="color:var(--accent)"></i>
                  <span style="font-size:13px;flex:1">${esc(d.name)}</span>
                  <span style="font-size:11px;color:var(--text-muted)">${countWords(d.content||'').toLocaleString()}字</span>
                  <button class="btn btn-secondary btn-sm" onclick="duplicateDraft('${proj.id}','${d.id}')"><i class="fas fa-copy"></i> 複製</button>
                </div>`).join('')}
            </div>`}
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:14px"><i class="fas fa-list-check icon"></i> リライト着眼点</div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.9">
          <div>📍 <strong>第一幕</strong>：主人公とゴールは30ページ以内に明示されているか？</div>
          <div>📍 <strong>ミッドポイント</strong>：中間で主人公は変わったか？</div>
          <div>📍 <strong>第二幕</strong>：毎シーン「前より悪くなっているか」を確認</div>
          <div>📍 <strong>クライマックス</strong>：主人公が「自力で」解決しているか？</div>
          <div>📍 <strong>サブプロット</strong>：メインストーリーと絡んでいるか？</div>
          <div>📍 <strong>テーマ</strong>：ラストシーンがテーマを体現しているか？</div>
        </div>
      </div>
    </div>
  </div>`;
}

function renderRevisionChecklist(proj) {
  const checks = [
    {id:'rv1',text:'主人公の目的・動機が明確で一貫している'},
    {id:'rv2',text:'各シーンが前のシーンより緊張が増している'},
    {id:'rv3',text:'すべての伏線が回収されている'},
    {id:'rv4',text:'不要なシーンを削除した'},
    {id:'rv5',text:'テーマがラストで体現されている'},
    {id:'rv6',text:'主人公が「変化」している'},
    {id:'rv7',text:'対立・葛藤が各シーンにある'},
  ];
  const done = proj.revisionChecks || [];
  return renderChecklistItems(done, checks, function(c) {
    return "toggleCheck('" + proj.id + "','revision',this,'" + c.id + "')";
  });
}

function openAddRevisionModal(projId) {
  openModal(
    `<i class="fas fa-rotate" style="color:#f7a06a"></i> 改稿を記録`,
    `<div class="form-group"><label class="form-label">改稿タイトル</label>
      <input class="form-input" id="rv-title" placeholder="例：第1稿→第2稿 構造改稿"></div>
    <div class="form-group"><label class="form-label">改稿種類</label>
      <select class="form-select" id="rv-type">
        <option>構造リライト</option><option>シーン追加</option><option>シーン削除</option>
        <option>セリフ修正</option><option>ト書き修正</option><option>全体見直し</option>
      </select></div>
    <div class="form-group"><label class="form-label">変更内容・メモ</label>
      <textarea class="form-textarea" id="rv-notes" rows="5" placeholder="何をどう変えたか、なぜ変えたかを記録しましょう"></textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="addRevision('${projId}')"><i class="fas fa-plus"></i> 記録</button>`
  );
}

function addRevision(projId) {
  const title = $('#rv-title')?.value?.trim();
  if (!title) { toast('タイトルを入力してください','error'); return; }
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.revisions = proj.revisions || [];
  proj.revisions.unshift({ id: uid(), title, type: $('#rv-type')?.value, notes: $('#rv-notes')?.value?.trim()||'', createdAt: now() });
  proj.updatedAt = now();
  DB.saveProject(proj);
  closeModal(); toast('改稿を記録しました','success'); render();
}

function duplicateDraft(projId, draftId) {
  const proj = DB.getProject(projId);
  const draft = (proj?.drafts||[]).find(d => d.id === draftId);
  if (!draft) return;
  const newDraft = { ...draft, id: uid(), name: draft.name + ' (コピー)', createdAt: now() };
  proj.drafts.push(newDraft);
  proj.updatedAt = now();
  DB.saveProject(proj);
  State.activeDraftId = newDraft.id;
  toast(`「${draft.name}」を複製しました`,'success');
  render();
}

// ================================================================
//  PAGE: 精密推敲
// ================================================================
function renderPolish(proj) {
  const drafts = proj.drafts || [];
  const activeDraft = drafts[0];
  const content = activeDraft?.content || '';

  const dialogueCount = (content.match(/「[^」]*」/g)||[]).length;
  const sceneCount    = (content.match(/【\d+】|（外）|（内）/g)||[]).length;
  const actionPct     = content ? Math.round(content.split('\n').filter(l=>l.trim()&&!l.includes('「')&&!l.includes('【')&&!l.includes('（外）')&&!l.includes('（内）')).length / Math.max(content.split('\n').filter(l=>l.trim()).length,1)*100) : 0;

  return `
  <div class="section-header">
    <div class="section-title"><i class="fas fa-microscope" style="color:#f76ca0"></i> 精密推敲 <span class="phase-badge-lg">Phase 9</span></div>
    <div class="section-desc">セリフ・ト書き・演出をきめ細かく磨き上げましょう</div>
  </div>
  <div class="grid-2" style="gap:20px">
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="card-title" style="margin-bottom:14px"><i class="fas fa-chart-bar icon"></i> スクリプト分析</div>
        <div class="grid-2">
          <div style="text-align:center;padding:16px;background:var(--bg-primary);border-radius:8px">
            <div style="font-size:28px;font-weight:700;color:var(--accent)">${dialogueCount}</div>
            <div style="font-size:11px;color:var(--text-muted)">セリフ数</div>
          </div>
          <div style="text-align:center;padding:16px;background:var(--bg-primary);border-radius:8px">
            <div style="font-size:28px;font-weight:700;color:var(--accent2)">${sceneCount}</div>
            <div style="font-size:11px;color:var(--text-muted)">シーン数</div>
          </div>
        </div>
        <div style="margin-top:14px">
          <div class="meter-row">
            <div class="meter-label">ト書き割合</div>
            <div class="meter-bar"><div class="meter-fill" style="width:${actionPct}%;background:var(--accent3)"></div></div>
            <div class="meter-value">${actionPct}%</div>
          </div>
          <div class="meter-row">
            <div class="meter-label">セリフ割合</div>
            <div class="meter-bar"><div class="meter-fill" style="width:${100-actionPct}%;background:var(--accent2)"></div></div>
            <div class="meter-value">${100-actionPct}%</div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:14px"><i class="fas fa-search icon"></i> 推敲チェックリスト</div>
        ${renderPolishChecklist(proj)}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="card-title" style="margin-bottom:12px"><i class="fas fa-comment-dots icon"></i> セリフ診断ポイント</div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:2">
          <div>✅ 各キャラのセリフは「そのキャラらしい」か？</div>
          <div>✅ セリフが説明的・くどくなっていないか？</div>
          <div>✅ サブテキスト（言外の意）が機能しているか？</div>
          <div>✅ 長いセリフは分割できないか？</div>
          <div>✅ 無言・沈黙・間を使えているか？</div>
          <div>✅ 1シーンに2つ以上の役割があるか？</div>
        </div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:12px"><i class="fas fa-eye icon"></i> ト書き診断ポイント</div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:2">
          <div>✅ 視覚的・具体的に書かれているか？</div>
          <div>✅ カメラに映らないものを書いていないか？</div>
          <div>✅ 「〜と思う」など内面描写を避けているか？</div>
          <div>✅ 4行以上の長いト書きは分割できないか？</div>
          <div>✅ 主語が明確か？</div>
          <div>✅ 演技過多な指定を減らしているか？</div>
        </div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:12px"><i class="fas fa-sticky-note icon"></i> 推敲メモ</div>
        <textarea class="form-textarea" id="polish-notes" rows="6"
          placeholder="推敲中に気づいたことを書いてください…"
          onblur="savePolishNotes('${proj.id}',this.value)">${esc(proj.polishNotes||'')}</textarea>
      </div>
    </div>
  </div>`;
}

function renderPolishChecklist(proj) {
  const checks = [
    {id:'po1',text:'すべてのセリフを声に出して読んだ'},
    {id:'po2',text:'長いト書きを短縮した'},
    {id:'po3',text:'各キャラの口調が一貫している'},
    {id:'po4',text:'不要なセリフ（説明・くどい）を削った'},
    {id:'po5',text:'感情的なクライマックスシーンを強化した'},
    {id:'po6',text:'冒頭3ページでフックがある'},
    {id:'po7',text:'ラストシーンが余韻を持って終わっている'},
    {id:'po8',text:'誤字・脱字・表記ゆれを確認した'},
  ];
  const done = proj.polishChecks || [];
  return renderChecklistItems(done, checks, function(c) {
    return "toggleCheck('" + proj.id + "','polish',this,'" + c.id + "')";
  });
}

function savePolishNotes(projId, val) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.polishNotes = val;
  proj.updatedAt = now();
  DB.saveProject(proj);
}

// ================================================================
//  PAGE: フィードバック
// ================================================================
function renderFeedback(proj) {
  const feedbacks = proj.feedbacks || [];

  const fbCards = feedbacks.length === 0
    ? `<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px">
        <i class="fas fa-comments" style="font-size:32px;display:block;margin-bottom:12px;opacity:0.3"></i>
        フィードバックを追加しましょう
       </div>`
    : feedbacks.map(f => `
      <div class="feedback-card ${f.type||'note'}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="tag tag-${f.type==='positive'?'green':f.type==='issue'?'red':f.type==='question'?'yellow':'blue'}" style="font-size:10px">
              ${f.type==='positive'?'✅ 良い点':f.type==='issue'?'❌ 問題点':f.type==='question'?'❓ 疑問':'📝 メモ'}
            </span>
            ${f.reviewer ? `<span style="font-size:11px;color:var(--text-muted)">${esc(f.reviewer)}</span>` : ''}
          </div>
          <div style="display:flex;gap:4px">
            <span style="font-size:10px;color:var(--text-muted)">${fmtDate(f.createdAt)}</span>
            <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteFeedback('${proj.id}','${f.id}')"><i class="fas fa-xmark" style="font-size:9px;color:var(--red)"></i></button>
          </div>
        </div>
        ${f.location ? `<div style="font-size:11px;color:var(--accent-light);margin-bottom:4px"><i class="fas fa-location-dot"></i> ${esc(f.location)}</div>` : ''}
        <div style="font-size:13px;color:var(--text-primary);line-height:1.7">${esc(f.content||'').replace(/\n/g,'<br>')}</div>
        ${f.resolved ? `<div style="font-size:11px;color:var(--green);margin-top:6px"><i class="fas fa-check-circle"></i> 対応済み</div>` :
          `<button class="btn btn-ghost btn-sm" style="margin-top:6px;font-size:11px" onclick="resolveFeedback('${proj.id}','${f.id}')"><i class="fas fa-check"></i> 対応済みにする</button>`}
      </div>`).join('');

  const resolvedCount = feedbacks.filter(f => f.resolved).length;
  const issueCount = feedbacks.filter(f => f.type === 'issue' && !f.resolved).length;

  return `
  <div class="section-header">
    <div class="section-title"><i class="fas fa-comments" style="color:#6ab8f7"></i> フィードバック管理 <span class="phase-badge-lg">Phase 10</span></div>
    <div class="section-desc">読み合わせ・校閲・プロデューサーからの意見を記録・反映しましょう</div>
  </div>
  <div class="grid-2" style="gap:20px">
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="font-size:14px;font-weight:600">フィードバック一覧（${feedbacks.length}件）</div>
        <button class="btn btn-primary btn-sm" onclick="openAddFeedbackModal('${proj.id}')"><i class="fas fa-plus"></i> 追加</button>
      </div>
      ${fbCards}
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="card-title" style="margin-bottom:12px"><i class="fas fa-chart-pie icon"></i> フィードバック状況</div>
        <div class="grid-2">
          <div style="text-align:center;padding:14px;background:var(--bg-primary);border-radius:8px">
            <div style="font-size:24px;font-weight:700;color:var(--green)">${resolvedCount}</div>
            <div style="font-size:11px;color:var(--text-muted)">対応済み</div>
          </div>
          <div style="text-align:center;padding:14px;background:var(--bg-primary);border-radius:8px">
            <div style="font-size:24px;font-weight:700;color:var(--red)">${issueCount}</div>
            <div style="font-size:11px;color:var(--text-muted)">未対応の問題</div>
          </div>
        </div>
        ${feedbacks.length > 0 ? `<div style="margin-top:12px">
          <div class="meter-row"><div class="meter-label">解決率</div>
            <div class="meter-bar"><div class="meter-fill" style="width:${Math.round(resolvedCount/feedbacks.length*100)}%;background:var(--green)"></div></div>
            <div class="meter-value">${Math.round(resolvedCount/feedbacks.length*100)}%</div>
          </div>
        </div>` : ''}
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:12px"><i class="fas fa-microphone icon"></i> 読み合わせメモ</div>
        <textarea class="form-textarea" id="readthrough-notes" rows="6"
          placeholder="読み合わせ・テストで気づいたこと、俳優の意見など…"
          onblur="saveReadthroughNotes('${proj.id}',this.value)">${esc(proj.readthroughNotes||'')}</textarea>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:12px"><i class="fas fa-clipboard-check icon"></i> 読み合わせチェック</div>
        ${renderFeedbackChecklist(proj)}
      </div>
    </div>
  </div>`;
}

function renderFeedbackChecklist(proj) {
  const checks = [
    {id:'fb1',text:'読み合わせを1回以上実施した'},
    {id:'fb2',text:'すべての問題点に対応策を検討した'},
    {id:'fb3',text:'プロデューサー・監督の意見を記録した'},
    {id:'fb4',text:'台本の誤りを全て修正した'},
    {id:'fb5',text:'対応済みのフィードバックを確認した'},
  ];
  const done = proj.feedbackChecks || [];
  return renderChecklistItems(done, checks, function(c) {
    return "toggleCheck('" + proj.id + "','feedback',this,'" + c.id + "')";
  });
}

function openAddFeedbackModal(projId) {
  openModal(
    `<i class="fas fa-comment-plus" style="color:#6ab8f7"></i> フィードバックを追加`,
    `<div class="form-group"><label class="form-label">種類</label>
      <select class="form-select" id="fb-type">
        <option value="issue">問題点</option><option value="positive">良い点</option>
        <option value="question">疑問・確認</option><option value="note">メモ</option>
      </select></div>
    <div class="form-group"><label class="form-label">場所・ページ（任意）</label>
      <input class="form-input" id="fb-loc" placeholder="例：P.24 シーン8、第二幕冒頭など"></div>
    <div class="form-group"><label class="form-label">フィードバック内容 <span style="color:var(--red)">*</span></label>
      <textarea class="form-textarea" id="fb-content" rows="5" placeholder="内容を書いてください"></textarea></div>
    <div class="form-group"><label class="form-label">出所（誰から）</label>
      <input class="form-input" id="fb-reviewer" placeholder="例：プロデューサー、自分、読み合わせ参加者など"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="addFeedback('${projId}')"><i class="fas fa-plus"></i> 追加</button>`
  );
  setTimeout(() => $('#fb-content')?.focus(), 50);
}

function addFeedback(projId) {
  const content = $('#fb-content')?.value?.trim();
  if (!content) { toast('内容を入力してください','error'); return; }
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.feedbacks = proj.feedbacks || [];
  proj.feedbacks.unshift({
    id: uid(), type: $('#fb-type')?.value||'note',
    location: $('#fb-loc')?.value?.trim()||'',
    content, reviewer: $('#fb-reviewer')?.value?.trim()||'',
    resolved: false, createdAt: now()
  });
  proj.updatedAt = now();
  DB.saveProject(proj);
  closeModal(); toast('追加しました','success'); render();
}

function resolveFeedback(projId, fbId) {
  const proj = DB.getProject(projId);
  const fb = (proj?.feedbacks||[]).find(f => f.id === fbId);
  if (!fb) return;
  fb.resolved = true;
  proj.updatedAt = now();
  DB.saveProject(proj);
  toast('対応済みにしました','success'); render();
}

function deleteFeedback(projId, fbId) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.feedbacks = (proj.feedbacks||[]).filter(f => f.id !== fbId);
  proj.updatedAt = now();
  DB.saveProject(proj);
  render();
}

function saveReadthroughNotes(projId, val) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.readthroughNotes = val;
  proj.updatedAt = now();
  DB.saveProject(proj);
}

// ================================================================
//  PAGE: 最終稿
// ================================================================
function renderFinal(proj) {
  const drafts = proj.drafts || [];
  const finalDraft = drafts[drafts.length - 1];
  const wc = countWords(finalDraft?.content || '');

  return `
  <div class="section-header">
    <div class="section-title"><i class="fas fa-flag-checkered" style="color:#6af7c8"></i> 最終稿 <span class="phase-badge-lg">Phase 11</span></div>
    <div class="section-desc">最終確認を行い、完成稿として仕上げましょう</div>
  </div>
  <div class="grid-2" style="gap:20px">
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card" style="background:rgba(106,247,200,0.04);border-color:rgba(106,247,200,0.2)">
        <div class="card-title" style="margin-bottom:14px;color:var(--accent3)"><i class="fas fa-trophy"></i> 完成ステータス</div>
        ${renderFinalStatus(proj)}
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:14px"><i class="fas fa-file-contract icon"></i> 最終稿情報</div>
        <div class="form-group"><label class="form-label">バージョン名</label>
          <input class="form-input" id="fn-version" value="${esc(proj.finalVersion||'決定稿')}"
            onblur="saveFinalInfo('${proj.id}')"></div>
        <div class="form-group"><label class="form-label">完成日</label>
          <input class="form-input" type="date" id="fn-date" value="${(proj.finalDate||'').slice(0,10)}"
            onblur="saveFinalInfo('${proj.id}')"></div>
        <div class="form-group"><label class="form-label">著作権表記</label>
          <input class="form-input" id="fn-copyright" value="${esc(proj.copyright||'')}"
            placeholder="© 2024 氏名" onblur="saveFinalInfo('${proj.id}')"></div>
        <div class="form-group"><label class="form-label">最終メモ・備考</label>
          <textarea class="form-textarea" id="fn-notes" rows="4"
            placeholder="制作への引き継ぎ事項など"
            onblur="saveFinalInfo('${proj.id}')">${esc(proj.finalNotes||'')}</textarea></div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="card-title" style="margin-bottom:14px"><i class="fas fa-clipboard-check icon"></i> 最終チェックリスト</div>
        ${renderFinalChecklist(proj)}
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:14px"><i class="fas fa-book-open icon"></i> 稿サマリー</div>
        ${drafts.map(d => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg-primary);border-radius:6px;border:1px solid var(--border);margin-bottom:6px">
            <i class="fas fa-file-lines" style="color:var(--accent)"></i>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:500">${esc(d.name)}</div>
              <div style="font-size:11px;color:var(--text-muted)">${countWords(d.content||'').toLocaleString()}字 / ${fmtDate(d.updatedAt||d.createdAt)}</div>
            </div>
            ${d.id === finalDraft?.id ? '<span class="tag tag-green">最新稿</span>' : ''}
          </div>`).join('') || `<div style="font-size:13px;color:var(--text-muted)">稿がありません</div>`}
      </div>
    </div>
  </div>`;
}

function renderFinalStatus(proj) {
  const allChecks = [
    ...(proj.ideaChecks||[]), ...(proj.researchChecks||[]), ...(proj.conceptChecks||[]),
    ...(proj.outlineChecks||[]), ...(proj.revisionChecks||[]), ...(proj.polishChecks||[]),
    ...(proj.feedbackChecks||[])
  ];
  const totalChecks = 5+6+5+6+7+8+5;
  const pct = Math.round(allChecks.length / totalChecks * 100);
  const feedbackPending = (proj.feedbacks||[]).filter(f=>!f.resolved).length;
  const drafts = proj.drafts || [];

  return `
  <div class="meter-row" style="margin-bottom:10px">
    <div class="meter-label">全体進捗</div>
    <div class="meter-bar"><div class="meter-fill" style="width:${pct}%;background:var(--accent3)"></div></div>
    <div class="meter-value">${pct}%</div>
  </div>
  <div style="font-size:12px;color:var(--text-secondary);line-height:2">
    <div>${(proj.characters||[]).length > 0 ? '✅' : '⬜'} キャラクター設計 （${(proj.characters||[]).length}人）</div>
    <div>${(proj.plots||[]).length > 0 ? '✅' : '⬜'} プロット設計 （${(proj.plots||[]).length}シーン）</div>
    <div>${drafts.length > 0 ? '✅' : '⬜'} 脚本稿 （${drafts.length}稿）</div>
    <div>${(proj.revisions||[]).length > 0 ? '✅' : '⬜'} 改稿記録 （${(proj.revisions||[]).length}回）</div>
    <div>${feedbackPending === 0 && (proj.feedbacks||[]).length > 0 ? '✅' : '⬜'} フィードバック対応 （未対応: ${feedbackPending}件）</div>
  </div>`;
}

function renderFinalChecklist(proj) {
  const checks = [
    {id:'fn1',text:'全シーンを通して最終確認した'},
    {id:'fn2',text:'ページ数・字数が適切な範囲内'},
    {id:'fn3',text:'表紙・タイトルページを整えた'},
    {id:'fn4',text:'登場人物一覧を最終確認した'},
    {id:'fn5',text:'場所・時代設定の一覧を確認した'},
    {id:'fn6',text:'著作権・クレジットを明記した'},
    {id:'fn7',text:'バックアップを保存した'},
  ];
  const done = proj.finalChecks || [];
  return renderChecklistItems(done, checks, function(c) {
    return "toggleCheck('" + proj.id + "','final',this,'" + c.id + "')";
  });
}

function saveFinalInfo(projId) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.finalVersion = $('#fn-version')?.value || '';
  proj.finalDate    = $('#fn-date')?.value || '';
  proj.copyright    = $('#fn-copyright')?.value || '';
  proj.finalNotes   = $('#fn-notes')?.value || '';
  proj.updatedAt = now();
  DB.saveProject(proj);
}

// ================================================================
//  PAGE: 共有・出力
// ================================================================
function renderExport(proj) {
  const drafts = proj.drafts || [];
  const activeDraft = drafts[drafts.length - 1];
  const wc = countWords(activeDraft?.content || '');

  return `
  <div class="section-header">
    <div class="section-title"><i class="fas fa-share-nodes" style="color:#f7c56a"></i> 共有・出力 <span class="phase-badge-lg">Phase 12</span></div>
    <div class="section-desc">脚本を書き出し・共有・提出できる形に整えましょう</div>
  </div>
  <div class="grid-2" style="gap:20px">
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="card-title" style="margin-bottom:14px"><i class="fas fa-file-export icon"></i> テキスト出力</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button class="btn btn-primary" onclick="exportScript('${proj.id}','txt')">
            <i class="fas fa-file-lines"></i> テキスト形式で書き出し（.txt）
          </button>
          <button class="btn btn-secondary" onclick="exportScript('${proj.id}','html')">
            <i class="fas fa-code"></i> HTML形式で書き出し
          </button>
          <button class="btn btn-secondary" onclick="copyScriptToClipboard('${proj.id}')">
            <i class="fas fa-copy"></i> クリップボードにコピー
          </button>
        </div>
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">出力オプション</div>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-bottom:6px">
            <input type="checkbox" id="exp-title" checked> タイトルページを含める
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-bottom:6px">
            <input type="checkbox" id="exp-charlist"> 登場人物一覧を含める
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
            <input type="checkbox" id="exp-pagenum"> ページ番号を付ける
          </label>
        </div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:14px"><i class="fas fa-eye icon"></i> プレビュー</div>
        <div style="background:white;border-radius:6px;padding:20px;max-height:400px;overflow-y:auto;font-family:'Noto Serif JP',serif;font-size:12px;line-height:2;color:#1a1a1a;white-space:pre-wrap">${esc(activeDraft?.content||'（稿がありません）').slice(0,1500)}${(activeDraft?.content||'').length > 1500 ? '\n\n...' : ''}</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="card-title" style="margin-bottom:14px"><i class="fas fa-circle-info icon"></i> 作品情報サマリー</div>
        <div style="font-size:13px;line-height:2">
          <div><span style="color:var(--text-muted)">タイトル：</span><strong>${esc(proj.title)}</strong></div>
          <div><span style="color:var(--text-muted)">ジャンル：</span>${esc(proj.genre)}</div>
          <div><span style="color:var(--text-muted)">フォーマット：</span>${esc(proj.format)}</div>
          <div><span style="color:var(--text-muted)">文字数：</span>${wc.toLocaleString()}字</div>
          <div><span style="color:var(--text-muted)">稿数：</span>${drafts.length}稿</div>
          <div><span style="color:var(--text-muted)">キャラクター：</span>${(proj.characters||[]).length}人</div>
          <div><span style="color:var(--text-muted)">改稿回数：</span>${(proj.revisions||[]).length}回</div>
          <div><span style="color:var(--text-muted)">バージョン：</span>${esc(proj.finalVersion||'—')}</div>
          <div><span style="color:var(--text-muted)">著作権：</span>${esc(proj.copyright||'—')}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:14px"><i class="fas fa-users icon"></i> 登場人物一覧（出力用）</div>
        <div style="font-size:12px;line-height:2">
          ${(proj.characters||[]).map(c => `
            <div style="padding:4px 0;border-bottom:1px solid var(--border)">
              <strong>${esc(c.name)}</strong>（${esc(c.kana||'')}）${c.age?` ${c.age}歳`:''}
              ${c.role?` ／ ${esc(c.role)}`:''}
              ${c.tagline?`<br><span style="color:var(--text-muted);font-size:11px">${esc(c.tagline)}</span>`:''}
            </div>`).join('') || '<div style="color:var(--text-muted)">キャラクター未登録</div>'}
        </div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:14px"><i class="fas fa-clock-rotate-left icon"></i> 出力履歴</div>
        ${(proj.exportHistory||[]).length === 0
          ? `<div style="font-size:13px;color:var(--text-muted)">出力履歴なし</div>`
          : (proj.exportHistory||[]).slice(0,5).map(e=>`
            <div style="font-size:12px;color:var(--text-muted);padding:4px 0;border-bottom:1px solid var(--border)">
              <i class="fas fa-file"></i> ${esc(e.type)} — ${fmtDatetime(e.at)}
            </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function exportScript(projId, format) {
  const proj = DB.getProject(projId);
  const drafts = proj?.drafts || [];
  const draft = drafts[drafts.length - 1];
  const content = draft?.content || '';

  const includeTitle = $('#exp-title')?.checked;
  const includeCharList = $('#exp-charlist')?.checked;

  let output = '';
  if (includeTitle) {
    output += `${proj.title}\n`;
    output += `${'='.repeat(proj.title.length*2)}\n`;
    output += `ジャンル：${proj.genre} / ${proj.format}\n`;
    if (proj.logline) output += `ログライン：${proj.logline}\n`;
    if (proj.copyright) output += `${proj.copyright}\n`;
    output += `\n${'─'.repeat(40)}\n\n`;
  }
  if (includeCharList && (proj.characters||[]).length > 0) {
    output += `【登場人物】\n`;
    proj.characters.forEach(c => {
      output += `  ${c.name}（${c.kana||''}）${c.age?c.age+'歳':''}　${c.role||''}　${c.tagline||''}\n`;
    });
    output += `\n${'─'.repeat(40)}\n\n`;
  }
  output += content;

  if (format === 'txt') {
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${proj.title}_${proj.finalVersion||'決定稿'}.txt`;
    a.click(); URL.revokeObjectURL(url);
  } else if (format === 'html') {
    const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>${esc(proj.title)}</title>
    <style>body{font-family:'Noto Serif JP',serif;max-width:700px;margin:40px auto;padding:20px;line-height:2;font-size:14px;color:#1a1a1a;}pre{white-space:pre-wrap;font-family:inherit}</style></head>
    <body><pre>${esc(output)}</pre></body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${proj.title}_${proj.finalVersion||'決定稿'}.html`;
    a.click(); URL.revokeObjectURL(url);
  }

  // Record history
  proj.exportHistory = proj.exportHistory || [];
  proj.exportHistory.unshift({ type: format.toUpperCase(), at: now() });
  proj.updatedAt = now();
  DB.saveProject(proj);
  toast(`${format.toUpperCase()}で書き出しました`, 'success');
}

function copyScriptToClipboard(projId) {
  const proj = DB.getProject(projId);
  const draft = (proj?.drafts||[]).slice(-1)[0];
  const content = draft?.content || '';
  navigator.clipboard?.writeText(content).then(() => {
    toast('クリップボードにコピーしました', 'success');
  }).catch(() => {
    toast('コピーに失敗しました', 'error');
  });
}

// ================================================================
//  INIT
// ================================================================
function init() {
  // Seed sample project if empty
  if (DB.getProjects().length === 0) {
    const sample = newProject({
      title: 'サンプル作品「夜明けの証言」',
      genre: 'サスペンス',
      format: 'テレビドラマ（連続）',
      logline: '不正を暴こうとした刑事が、かつての恩師が犯人だと知り、真実と友情の間で引き裂かれる。',
      phase: '着想',
    });
    sample.ideas = [
      { id: uid(), title: '冒頭シーンのアイデア', body: '深夜の取調室。主人公は容疑者の顔を見て凍りつく。\n「…先生」', type: 'シーン', priority: '高', createdAt: now() },
      { id: uid(), title: 'テーマメモ', body: '正義とは何か？法の正義と人の正義が食い違うとき、人はどう選択するのか。', type: 'テーマ', priority: '高', createdAt: now() },
    ];
    sample.keywords = ['正義','裏切り','恩師','刑事','夜明け'];
    sample.characters = [
      { id: uid(), name: '木村 拓也', kana: 'きむら たくや', role: '主人公', age: '38', gender: '男性', emoji: '🕵️', tagline: '法より人を信じたい刑事', job: '警察官（刑事）', traits: ['頑固','正義感が強い','不器用'], want: '事件の真相を解明すること', need: '恩師への感謝と怒りを超えること', color: '#7c6af7', createdAt: now() },
      { id: uid(), name: '田中 教授', kana: 'たなか きょうじゅ', role: '敵・antagonist', age: '64', gender: '男性', emoji: '👴', tagline: '間違った正義を信じた男', job: '大学教授（元検察官）', traits: ['知的','カリスマ','歪んだ正義感'], want: '自分の計画を完遂すること', need: '過去の選択を認め赦されること', color: '#f76ca0', createdAt: now() },
    ];
    DB.saveProject(sample);
  }
  render();
}

// ── Global event bindings ──────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (State.currentProjectId) quickSaveProject(State.currentProjectId);
  }
});

// Start
init();
