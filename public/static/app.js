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
  currentPage: 'top',
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
  // モバイルではナビゲート時にサイドバーを強制的に閉じる
  if (window.innerWidth <= 900) {
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.classList.remove('active');
    DB.set('sidebar_collapsed', true);
  }
  // デスクトップでも現在の折り畳み状態を確実に維持（DB状態を保持）
  // → renderLayout側で DB.get('sidebar_collapsed', true) を読むのでここでは変更しない
  render();
  window.scrollTo(0, 0);
}

// ── Main Render ────────────────────────────────────────────────
function render() {
  const app = $('#app');
  if (!app) return;

  const p = State.currentPage;

  // 学習センター
  if (p === 'learn' || p === 'learn-guide' || p === 'learn-articles' || p === 'learn-exercises' || p === 'learn-glossary' || p === 'learn-roadmap' || (p && (p.startsWith('article-') || p.startsWith('exercise-')))) {
    app.innerHTML = renderLayout(renderLearnPage());
    return;
  }

  // ツールページ
  if (p === 'tools' || p === 'tool-logline' || p === 'tool-char-diag' || p === 'tool-scene' || p === 'tool-timer' || p === 'tool-pitch' || p === 'tool-tension' || p === 'tool-name-gen' || p === 'tool-structure' || p === 'tool-emotion-arc' || p === 'tool-world-notes' || p === 'tool-dialogue-check' || p === 'tool-plot-holes' || p === 'tool-beat-counter') {
    app.innerHTML = renderLayout(renderToolsPage());
    bindToolsPage();
    return;
  }

  // テンプレートページ
  if (p === 'templates' || (p && p.startsWith('template-'))) {
    app.innerHTML = renderLayout(renderTemplatesPage());
    return;
  }

  // 設定ページ
  if (p === 'settings') {
    app.innerHTML = renderLayout(renderSettingsPage());
    return;
  }

  // 執筆日誌ページ
  if (p === 'journal') {
    app.innerHTML = renderLayout(renderJournalPage());
    bindJournalPage();
    return;
  }

  // 名前辞典ページ
  if (p === 'namedict') {
    app.innerHTML = renderLayout(renderNameDictPage());
    bindNameDictPage();
    return;
  }

  // ワールドビルディングページ
  if (p === 'worldbuilding') {
    app.innerHTML = renderLayout(renderWorldBuildingPage());
    return;
  }

  // インスピレーションページ
  if (p === 'inspiration') {
    app.innerHTML = renderLayout(renderInspirationPage());
    bindInspirationPage();
    return;
  }

  // ストーリーボードページ
  if (p === 'board') {
    app.innerHTML = renderLayout(renderBoardPage());
    bindBoardPage();
    return;
  }

  // タスク管理ページ
  if (p === 'tasks') {
    app.innerHTML = renderLayout(renderTasksPage());
    bindTasksPage();
    return;
  }

  // ストーリー構成ボードページ（boardに統合・リダイレクト）
  if (p === 'storymap') {
    BoardState.listTab = 'maps';
    app.innerHTML = renderLayout(renderBoardPage());
    bindBoardPage();
    return;
  }

  if (p === 'dashboard' || p === 'top' || !State.currentProjectId) {
    if (p === 'top') {
      app.innerHTML = renderLayout(renderTopPage());
      bindTopPage();
    } else if (p === 'dashboard') {
      // ダッシュボードに遷移する際は現在のプロジェクトIDをクリア
      State.currentProjectId = null;
      app.innerHTML = renderLayout(renderDashboard());
      bindDashboard();
    } else {
      // currentProjectId が null で dashboard でも top でもない場合
      app.innerHTML = renderLayout(renderDashboard());
      bindDashboard();
    }
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
    else if (page === 'collab')      content = renderCollabMemo(proj);
    else if (page === 'proj-dash')   content = renderProjectDash(proj);
    else content = renderIdeas(proj);
    app.innerHTML = renderLayout(content, proj);
    bindProjectPage(proj);
  }
}

// ── Layout Shell ───────────────────────────────────────────────
function renderLayout(content, proj = null) {
  const cp = State.currentPage;
  const isLearnPage = cp === 'learn' || cp === 'learn-guide' || cp === 'learn-articles' || cp === 'learn-exercises' || cp === 'learn-glossary' || cp === 'learn-roadmap' || (cp && (cp.startsWith('article-') || cp.startsWith('exercise-')));
  const isToolsPage = cp === 'tools' || cp === 'tool-logline' || cp === 'tool-char-diag' || cp === 'tool-scene' || cp === 'tool-timer' || cp === 'tool-pitch' || cp === 'tool-tension' || cp === 'tool-name-gen' || cp === 'tool-structure' || cp === 'tool-emotion-arc' || cp === 'tool-world-notes' || cp === 'tool-dialogue-check' || cp === 'tool-plot-holes' || cp === 'tool-beat-counter';
  const isTemplatesPage = cp === 'templates' || (cp && cp.startsWith('template-'));
  const isSettingsPage = cp === 'settings';
  const isJournalPage = cp === 'journal';
  const isNameDictPage = cp === 'namedict';
  const isWorldPage = cp === 'worldbuilding';
  const isInspirationPage = cp === 'inspiration';
  const isBoardPage = cp === 'board' || cp === 'storymap';
  const isTasksPage = cp === 'tasks';
  const isStorymapPage = cp === 'storymap';
  const isSpecialPage = isLearnPage || isToolsPage || isTemplatesPage || isSettingsPage || isJournalPage || isNameDictPage || isWorldPage || isInspirationPage || isBoardPage || isTasksPage || isStorymapPage;

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

  const TOPBAR_PAGES = {
    top:              { icon:'fa-house',     color:'var(--accent)',  title:'ホーム',             sub:'今日の執筆・プロジェクト・タスク' },
    dashboard:        { icon:'fa-folder',    color:'var(--fuji)',    title:'作品ダッシュボード', sub:'プロジェクト一覧・管理' },
    learn:            { icon:'fa-book-open', color:'var(--fuji)',   title:'学習センター',       sub:'脚本執筆の理論・テクニックを学ぶ' },
    'learn-guide':    { icon:'fa-book-open', color:'var(--fuji)',   title:'学習センター',       sub:'ステップバイステップガイド' },
    'learn-articles': { icon:'fa-book-open', color:'var(--fuji)',   title:'学習センター',       sub:'構成理論・詳細記事' },
    tools:            { icon:'fa-toolbox',   color:'var(--asagi)',  title:'ライターズツール',   sub:'執筆を助けるツール集' },
    'tool-logline':   { icon:'fa-quote-left',color:'var(--accent)', title:'ログラインメーカー', sub:'一文でプロの物語を設計' },
    'tool-char-diag': { icon:'fa-user-check',color:'var(--fuji)',   title:'キャラクター診断',   sub:'Want/Need・アーク設計' },
    'tool-scene':     { icon:'fa-film',      color:'var(--momo)',   title:'シーン分析',         sub:'1シーンの構造を分析' },
    'tool-timer':     { icon:'fa-stopwatch', color:'var(--kogane)', title:'執筆タイマー',       sub:'集中執筆セッション' },
    'tool-pitch':     { icon:'fa-bullhorn',  color:'var(--accent)', title:'ピッチドックメーカー',sub:'企画書・あらすじを自動生成' },
    'tool-tension':   { icon:'fa-chart-line',color:'var(--momo)',   title:'テンションカーブ分析',sub:'物語の緊張度を可視化' },
    'tool-name-gen':  { icon:'fa-signature', color:'var(--kon-lt)', title:'キャラクター名ジェネレーター', sub:'和・洋・古風な名前を生成' },
    templates:        { icon:'fa-copy',      color:'var(--kogane)', title:'テンプレート集',     sub:'すぐに使えるフォーマット' },
    settings:         { icon:'fa-gear',      color:'var(--text-muted)', title:'設定',           sub:'アプリの設定' },
    journal:          { icon:'fa-book',      color:'var(--matcha)', title:'執筆日誌',           sub:'毎日の執筆記録・進捗管理' },
    namedict:         { icon:'fa-spell-check',color:'var(--kon-lt)',title:'キャラクター名辞典', sub:'登場人物の名前・読みを管理' },
    worldbuilding:    { icon:'fa-globe',     color:'var(--asagi)',  title:'世界観設計',         sub:'舞台・設定・世界観を構築' },
    inspiration:      { icon:'fa-bolt',      color:'var(--kogane)', title:'インスピレーション・ライブラリ', sub:'アイデア・メモ・ノート・マインドマップを整理' },
    board:            { icon:'fa-film',              color:'var(--fuji)',   title:'ストーリーボード',  sub:'カンバンボード＆シーンマップで物語を視覚設計' },
    tasks:            { icon:'fa-calendar-check',   color:'var(--matcha)', title:'タスク管理',        sub:'執筆タスク・スケジュール・習慣管理' },
    storymap:         { icon:'fa-film',              color:'var(--fuji)',   title:'ストーリーボード',  sub:'カンバンボード＆シーンマップで物語を視覚設計' },
  };
  const cpKey = TOPBAR_PAGES[cp] ? cp : (cp && cp.startsWith('article-') ? 'learn' : null);
  const tbData = cpKey ? TOPBAR_PAGES[cpKey] : null;

  // ── サイドバー折り畳み状態 ── デフォルトは閉じた状態
  const sidebarCollapsed = DB.get('sidebar_collapsed', true);

  // ── デュータスクバッジ ──
  const dueBadge = (()=>{
    const ts = DB.get('tasks',[]);
    const due = ts.filter(t=>!t.done && t.dueDate === new Date().toISOString().slice(0,10)).length;
    return due>0?`<span class="nav-badge">${due}</span>`:'';
  })();

  // ── フェーズバー（作品選択時：上部に横並びで表示） ──
  const phaseBar = proj ? `
  <div class="phase-topbar" id="phase-topbar">
    <div class="phase-topbar-inner">
      <button class="phase-top-home" onclick="navigate('proj-dash','${proj.id}')" title="作品トップページ">
        <i class="fas fa-chart-pie"></i><span>作品概要</span>
      </button>
      <div class="phase-topbar-divider"></div>
      ${PHASES.map((p, i) => {
        const phaseIdx = { '着想':0,'リサーチ':1,'コンセプト設計':2,'プロット設計':3,'キャラクター':4,'アウトライン':5,'初稿':6,'大改稿':7,'精密推敲':8,'フィードバック':9,'最終稿':10,'共有・出力':11 };
        const curIdx = phaseIdx[proj.phase] ?? 0;
        const isCur = cp === p.nav;
        const isDone = i < curIdx;
        return `<button class="phase-top-btn ${isCur?'active':''} ${isDone?'done':''}" onclick="navigate('${p.nav}','${proj.id}')" title="${p.id}">
          <i class="fas ${p.icon}"></i>
          <span class="phase-top-label">${p.id}</span>
          ${isDone?`<span class="phase-top-check"><i class="fas fa-check"></i></span>`:''}
        </button>`;
      }).join('')}
      <div class="phase-topbar-divider"></div>
      <button class="phase-top-collab ${cp==='collab'?'active':''}" onclick="navigate('collab','${proj.id}')" title="コラボメモ">
        <i class="fas fa-book-bookmark"></i><span>メモ</span>
      </button>
      <button class="phase-top-export ${cp==='export'?'active':''}" onclick="navigate('export','${proj.id}')" title="共有・出力">
        <i class="fas fa-share-nodes"></i><span>出力</span>
      </button>
    </div>
  </div>` : '';

  // ── サイドバー折り畳み時に表示するロゴ（常に表示） ──
  const collapsedLogo = `
    <button class="sidebar-toggle-btn" id="sidebar-toggle" onclick="toggleSidebar()" title="メニュー開閉">
      <i class="fas fa-bars"></i>
    </button>
    <div class="topbar-logo-link" onclick="navigate('top')" title="ホームへ">
      <div class="topbar-logo-icon"><i class="fas fa-clapperboard"></i></div>
      <div class="topbar-logo-texts">
        <div class="topbar-logo-name">シナリオラボ</div>
        <div class="topbar-logo-sub">脚本執筆支援ツール</div>
      </div>
    </div>`;

  // ── トップバー ──
  const isTopPage = (cp === 'top');
  const topbarContent = proj ? `
    ${collapsedLogo}
    <div class="topbar-divider"></div>
    <div class="topbar-proj-info" onclick="navigate('proj-dash','${proj.id}')" title="作品概要へ" style="cursor:pointer">
      <div class="topbar-title">${esc(proj.title)}</div>
      <div class="topbar-subtitle">${esc(proj.genre)} / ${esc(proj.format)} — <span style="color:${(PHASE_COLORS_WA[proj.phase]||{color:'#999'}).color};font-weight:600">${esc(proj.phase)}</span></div>
    </div>
    <div class="topbar-actions">
      <button class="btn btn-secondary btn-sm" onclick="navigate('dashboard')"><i class="fas fa-house"></i><span class="topbar-btn-label"> 一覧</span></button>
      <button class="btn btn-primary btn-sm" onclick="quickSaveProject('${proj.id}')"><i class="fas fa-floppy-disk"></i><span class="topbar-btn-label"> 保存</span></button>
    </div>` : tbData && !isTopPage ? `
    ${collapsedLogo}
    <div class="topbar-divider"></div>
    <div class="topbar-page-info">
      <div class="topbar-title"><i class="fas ${tbData.icon}" style="color:${tbData.color};margin-right:7px"></i>${tbData.title}</div>
      <div class="topbar-subtitle">${tbData.sub}</div>
    </div>
    <div class="topbar-actions">
      <button class="btn btn-secondary btn-sm" onclick="navigate('dashboard')"><i class="fas fa-gauge-high"></i><span class="topbar-btn-label"> ダッシュボード</span></button>
    </div>` : `
    ${collapsedLogo}
    <div class="topbar-actions">
      ${isTopPage ? `
      <button class="btn btn-secondary btn-sm" onclick="navigate('dashboard')"><i class="fas fa-gauge-high"></i><span class="topbar-btn-label"> ダッシュボード</span></button>
      <button class="btn btn-primary btn-sm" onclick="openNewProjectModal()"><i class="fas fa-plus"></i><span class="topbar-btn-label"> 新規作品</span></button>
      ` : `<button class="btn btn-primary btn-sm" onclick="openNewProjectModal()"><i class="fas fa-plus"></i><span class="topbar-btn-label"> 新規作品</span></button>`}
    </div>`;

  // ── サイドバー内の作品ミニカード（作品選択中のみ） ──
  const sidebarProjectCard = proj ? `
  <div class="sidebar-proj-card" onclick="navigate('proj-dash','${proj.id}')">
    <div class="sidebar-proj-card-icon"><i class="fas fa-film"></i></div>
    <div class="sidebar-proj-card-body">
      <div class="sidebar-proj-card-title">${esc(proj.title)}</div>
      <div class="sidebar-proj-card-phase">${esc(proj.phase)}</div>
    </div>
    <i class="fas fa-chevron-right sidebar-proj-card-arrow"></i>
  </div>` : '';

  // ── セクション折りたたみ状態を復元 ──
  const sectionStates = DB.get('sidebar_section_states', {});
  const sec0collapsed = sectionStates['main']    === true;
  const sec1collapsed = sectionStates['support'] === true;
  const sec2collapsed = sectionStates['design']  === true;

  return `
  <div class="app-layout ${sidebarCollapsed?'sidebar-collapsed':''}">
    <!-- オーバーレイ（モバイル） -->
    <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>

    <nav class="sidebar" id="sidebar">
      <!-- ロゴ + 閉じるボタン -->
      <div class="sidebar-logo">
        <div class="sidebar-logo-inner">
          <div class="logo-icon"><i class="fas fa-clapperboard"></i></div>
          <div class="logo-texts">
            <div class="logo-text">シナリオラボ</div>
            <div class="logo-sub">Scenario Lab</div>
          </div>
        </div>
        <button class="sidebar-close-btn" onclick="toggleSidebar()" title="メニューを閉じる" aria-label="サイドバーを閉じる">
          <i class="fas fa-xmark"></i>
        </button>
      </div>

      <div class="sidebar-nav">
        <!-- 作品カード（選択中のみ） -->
        ${sidebarProjectCard ? `<div class="sidebar-proj-section">${sidebarProjectCard}</div>` : ''}

        <!-- メインメニュー -->
        <div class="sidebar-section ${sec0collapsed?'section-collapsed':''}">
          <button class="sidebar-section-label" onclick="toggleSidebarSection(this.parentElement,'main')" title="折りたたむ">
            <span class="sidebar-sec-label-text"><i class="fas fa-house sidebar-sec-icon"></i>メインメニュー</span>
            <i class="fas fa-chevron-down sidebar-section-caret ${sec0collapsed?'rotated':''}"></i>
          </button>
          <div class="sidebar-section-items">
            <div class="nav-item ${cp==='top'?'active':''}" onclick="navigate('top')">
              <span class="nav-icon"><i class="fas fa-sun" style="color:#f7d07a"></i></span><span class="nav-label">ホーム</span>
            </div>
            <div class="nav-item ${(!proj && cp==='dashboard')?'active':''}" onclick="navigate('dashboard')">
              <span class="nav-icon"><i class="fas fa-gauge-high" style="color:#f5d9c8"></i></span><span class="nav-label">ダッシュボード</span>
            </div>
            <div class="nav-item ${isJournalPage?'active':''}" onclick="navigate('journal')">
              <span class="nav-icon"><i class="fas fa-book" style="color:#7de08a"></i></span><span class="nav-label">執筆日誌</span>
            </div>
            <div class="nav-item ${isInspirationPage?'active':''}" onclick="navigate('inspiration')">
              <span class="nav-icon"><i class="fas fa-bolt" style="color:#f7d07a"></i></span><span class="nav-label">インスピレーション</span>
            </div>
            <div class="nav-item ${ (cp==='board'||cp==='storymap')?'active':''}" onclick="navigate('board')">
              <span class="nav-icon"><i class="fas fa-film" style="color:#bbb4ff"></i></span><span class="nav-label">ストーリーボード</span>
            </div>
            <div class="nav-item ${ cp==='tasks'?'active':''}" onclick="navigate('tasks')">
              <span class="nav-icon"><i class="fas fa-calendar-check" style="color:#7de08a"></i></span><span class="nav-label">タスク管理</span>${dueBadge}
            </div>
          </div>
        </div>

        <!-- 執筆サポート -->
        <div class="sidebar-section ${sec1collapsed?'section-collapsed':''}">
          <button class="sidebar-section-label" onclick="toggleSidebarSection(this.parentElement,'support')" title="折りたたむ">
            <span class="sidebar-sec-label-text"><i class="fas fa-pen-nib sidebar-sec-icon"></i>執筆サポート</span>
            <i class="fas fa-chevron-down sidebar-section-caret ${sec1collapsed?'rotated':''}"></i>
          </button>
          <div class="sidebar-section-items">
            <div class="nav-item ${isLearnPage?'active':''}" onclick="navigate('learn')">
              <span class="nav-icon"><i class="fas fa-graduation-cap" style="color:#c0b8ff"></i></span><span class="nav-label">学習センター</span>
            </div>
            <div class="nav-item ${isToolsPage?'active':''}" onclick="navigate('tools')">
              <span class="nav-icon"><i class="fas fa-toolbox" style="color:#6ddede"></i></span><span class="nav-label">ツール</span>
            </div>
            <div class="nav-item ${isTemplatesPage?'active':''}" onclick="navigate('templates')">
              <span class="nav-icon"><i class="fas fa-copy" style="color:#f7d07a"></i></span><span class="nav-label">テンプレート</span>
            </div>
          </div>
        </div>

        <!-- 設計・資料 -->
        <div class="sidebar-section ${sec2collapsed?'section-collapsed':''}">
          <button class="sidebar-section-label" onclick="toggleSidebarSection(this.parentElement,'design')" title="折りたたむ">
            <span class="sidebar-sec-label-text"><i class="fas fa-folder sidebar-sec-icon"></i>設計・資料</span>
            <i class="fas fa-chevron-down sidebar-section-caret ${sec2collapsed?'rotated':''}"></i>
          </button>
          <div class="sidebar-section-items">
            <div class="nav-item ${isNameDictPage?'active':''}" onclick="navigate('namedict')">
              <span class="nav-icon"><i class="fas fa-spell-check" style="color:#90c8f8"></i></span><span class="nav-label">名前辞典</span>
            </div>
            <div class="nav-item ${isWorldPage?'active':''}" onclick="navigate('worldbuilding')">
              <span class="nav-icon"><i class="fas fa-globe" style="color:#6ddede"></i></span><span class="nav-label">世界観設計</span>
            </div>
            <div class="nav-item ${isSettingsPage?'active':''}" onclick="navigate('settings')">
              <span class="nav-icon"><i class="fas fa-gear" style="color:#d8cec4"></i></span><span class="nav-label">設定</span>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <div class="main-content">
      <div class="topbar">
        ${topbarContent}
        <!-- グローバルタイマーウィジェット（常に右端に表示） -->
        <div class="global-timer-widget" id="global-timer-widget" onclick="toggleTimerPopup()" title="執筆タイマーを開く">
          <div class="gtimer-icon ${TimerState.isRunning ? (TimerState.isBreak ? 'break' : 'running') : ''}">
            <i class="fas fa-stopwatch"></i>
          </div>
          <div class="gtimer-display" id="gtimer-display">${(()=>{const m=Math.floor(TimerState.seconds/60),s=TimerState.seconds%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');})()} </div>
          ${TimerState.isRunning ? `<div class="gtimer-dot ${TimerState.isBreak?'break':'work'}"></div>` : ''}
        </div>
      </div>

      ${phaseBar}

      <!-- タイマーポップアップ（fixed, topbar直下の右端） -->
      <div class="timer-popup" id="timer-popup" style="display:none">
        <div class="timer-popup-header">
          <span style="font-size:13px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">
            <i class="fas fa-stopwatch" style="color:var(--kogane);margin-right:6px"></i>執筆タイマー
          </span>
          <div style="display:flex;gap:4px">
            <button class="btn btn-ghost btn-icon btn-sm" onclick="navigate('tool-timer')" title="タイマーページへ"><i class="fas fa-expand" style="font-size:10px"></i></button>
            <button class="btn btn-ghost btn-icon btn-sm" onclick="closeTimerPopup()" title="閉じる"><i class="fas fa-xmark" style="font-size:11px"></i></button>
          </div>
        </div>
        <div class="timer-popup-body">
          <div id="timer-popup-mode" style="font-size:12px;font-weight:600;text-align:center;margin-bottom:10px;color:${TimerState.isBreak?'var(--matcha)':'var(--kogane)'};letter-spacing:.04em">${TimerState.isBreak?'☕ 休憩タイム':'✍️ 執筆タイム'}</div>
          <div id="timer-popup-display" class="timer-popup-bigtime" title="クリックで時間を編集" onclick="timerDisplayClick()">${(()=>{const m=Math.floor(TimerState.seconds/60),s=TimerState.seconds%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');})()} </div>
          <div style="font-size:10px;color:var(--text-muted);text-align:center;margin-bottom:12px;margin-top:-6px"><i class="fas fa-pen-to-square" style="font-size:9px"></i> クリックで時間を編集</div>
          <div style="display:flex;gap:6px;justify-content:center;margin-bottom:14px">
            <button class="btn btn-primary" id="timer-popup-btn" onclick="timerTogglePopup()" style="min-width:100px;height:36px">
              <i class="fas ${TimerState.isRunning?'fa-pause':'fa-play'}"></i> ${TimerState.isRunning?'一時停止':'開始'}
            </button>
            <button class="btn btn-secondary" onclick="timerResetPopup()" title="リセット" style="height:36px;width:36px;padding:0;display:flex;align-items:center;justify-content:center"><i class="fas fa-rotate-left"></i></button>
          </div>
          <div class="timer-popup-settings">
            <div class="timer-popup-setting-item">
              <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">作業</div>
              <input type="number" id="timer-popup-work" class="form-input" value="${DB.get('timer_settings',{work:25}).work}" min="1" max="90" style="width:52px;text-align:center;padding:3px 4px;font-size:13px;font-weight:700" onchange="updateTimerSettings()">
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px">分</div>
            </div>
            <div style="font-size:18px;color:var(--border);align-self:center">:</div>
            <div class="timer-popup-setting-item">
              <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">休憩</div>
              <input type="number" id="timer-popup-break" class="form-input" value="${DB.get('timer_settings',{break:5}).break}" min="1" max="30" style="width:52px;text-align:center;padding:3px 4px;font-size:13px;font-weight:700" onchange="updateTimerSettings()">
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px">分</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
              <div style="font-size:10px;color:var(--text-muted)">完了セッション</div>
              <div style="font-size:22px;font-weight:800;color:var(--kogane);line-height:1" id="timer-popup-sessions">${TimerState.sessions}</div>
              <div style="font-size:10px;color:var(--text-muted)">回</div>
            </div>
          </div>
          <!-- 自然音セレクター -->
          <div class="timer-ambient-section">
            <div class="timer-ambient-label"><i class="fas fa-music"></i> BGM / 自然音</div>
            <div id="ambient-btns" class="timer-ambient-grid">
              <button class="timer-ambient-btn ${(DB.get('ambient_sound','none')==='none')?'active':''}" onclick="setAmbientSound('none')">🔇<span>なし</span></button>
              <button class="timer-ambient-btn ${(DB.get('ambient_sound','none')==='rain')?'active':''}" onclick="setAmbientSound('rain')">🌧<span>雨音</span></button>
              <button class="timer-ambient-btn ${(DB.get('ambient_sound','none')==='waves')?'active':''}" onclick="setAmbientSound('waves')">🌊<span>波音</span></button>
              <button class="timer-ambient-btn ${(DB.get('ambient_sound','none')==='forest')?'active':''}" onclick="setAmbientSound('forest')">🌿<span>森</span></button>
              <button class="timer-ambient-btn ${(DB.get('ambient_sound','none')==='cafe')?'active':''}" onclick="setAmbientSound('cafe')">☕<span>カフェ</span></button>
              <button class="timer-ambient-btn ${(DB.get('ambient_sound','none')==='white')?'active':''}" onclick="setAmbientSound('white')">📻<span>ホワイト</span></button>
            </div>
          </div>
        </div>
      </div>
      <div class="page-content" id="page-content">${content}</div>
    </div>
  </div>
  <div id="toast-container" class="toast-container"></div>`;
}

// ── サイドバートグル ────────────────────────────────────────────
function toggleSidebar() {
  const app = document.querySelector('.app-layout');
  const overlay = document.getElementById('sidebar-overlay');
  if (!app) return;
  const isCollapsed = app.classList.toggle('sidebar-collapsed');
  // デスクトップ: DB に保存（状態永続化）
  if (window.innerWidth > 900) {
    DB.set('sidebar_collapsed', isCollapsed);
  } else {
    // モバイル: オーバーレイのみ制御（DB保存しない）
    if (overlay) overlay.classList.toggle('active', !isCollapsed);
  }
}
function closeSidebar() {
  const app = document.querySelector('.app-layout');
  const overlay = document.getElementById('sidebar-overlay');
  if (!app) return;
  app.classList.add('sidebar-collapsed');
  if (overlay) overlay.classList.remove('active');
  if (window.innerWidth > 900) DB.set('sidebar_collapsed', true);
}
function openSidebar() {
  const app = document.querySelector('.app-layout');
  const overlay = document.getElementById('sidebar-overlay');
  if (!app) return;
  app.classList.remove('sidebar-collapsed');
  if (overlay && window.innerWidth <= 900) overlay.classList.add('active');
  if (window.innerWidth > 900) DB.set('sidebar_collapsed', false);
}

// ── サイドバーセクション個別折りたたみ（DB永続化） ───────────────
function toggleSidebarSection(section, key) {
  if (!section) return;
  const caret = section.querySelector('.sidebar-section-caret');
  const isCollapsed = section.classList.toggle('section-collapsed');
  if (caret) caret.classList.toggle('rotated', isCollapsed);
  // DB に保存
  const states = DB.get('sidebar_section_states', {});
  states[key] = isCollapsed;
  DB.set('sidebar_section_states', states);
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

// ================================================================
//  TOP PAGE (ホーム)
// ================================================================
const WRITING_QUOTES = [
  { text: '初稿はただ存在させればいい。完璧である必要はない。', author: 'アーネスト・ヘミングウェイ' },
  { text: '書くことは、考えることだ。書き始めるまで、自分が何を考えているか分からない。', author: 'フラナリー・オコナー' },
  { text: '物語は人間の夢だ。夢は人間の物語だ。', author: 'Ⅲ 匿名' },
  { text: '一日に一ページ。それだけで一年後には一冊の本になる。', author: '作家の格言' },
  { text: 'セリフは行動だ。キャラクターがただ話しているのではなく、何かをしているのだ。', author: 'デイヴィッド・マメット' },
  { text: 'すべての物語は「なぜ今日この話をするのか」という問いから始まる。', author: '脚本術の格言' },
  { text: '観客は賢い。彼らを馬鹿にしてはいけない。彼らはあなたが思う以上に多くを感じ取っている。', author: 'シドニー・ルメット' },
  { text: '主人公を苦しめることを恐れるな。苦難が物語を生む。', author: 'ストーリーテリングの原則' },
  { text: '「なぜ」と「もし〜なら」——この二つの問いが物語のエンジンだ。', author: '脚本家の知恵' },
  { text: '書けない日も書く。それが習慣になる。', author: '匿名の作家' },
  { text: '良い対話は何か別のことについて話している。', author: 'エルモア・レナード' },
  { text: 'ストーリーとはキャラクターだ。プロットはキャラクターが何をするかではなく、キャラクターが誰であるかを明かす方法だ。', author: 'リサ・クロン' },
  { text: '伏線は回収しなければ嘘になる。回収できない伏線は置かない勇気も必要だ。', author: '脚本術の格言' },
  { text: '物語の核心はいつも「変化」だ——主人公が変わるか、世界が変わるか、観客が変わるか。', author: 'ロバート・マッキー' },
  { text: '書くことは孤独な仕事だ。しかし孤独でなければ書けない。', author: 'フランツ・カフカ' },
];

function renderTopPage() {
  const today = new Date().toISOString().slice(0, 10);
  const quote = WRITING_QUOTES[Math.floor(Math.random() * WRITING_QUOTES.length)];
  const projects = DB.getProjects();
  const tasks = TASK_DB.getTasks();
  const todayTasks = tasks.filter(t => !t.done && t.dueDate === today);
  const overdueTasks = tasks.filter(t => !t.done && t.dueDate && t.dueDate < today);
  const urgentTasks = tasks.filter(t => !t.done && t.priority === 'urgent');

  // 進行中プロジェクト (最後に更新した順)
  const activeProjects = [...projects]
    .filter(p => p.phase !== '共有・出力')
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, 3);

  // 今日のジャーナル
  const journals = DB.get('journal_entries', []);
  const todayJournal = journals.find(j => j.date === today);
  const todayWords = todayJournal ? (todayJournal.wordCount || 0) : 0;
  const dailyGoal = DB.get('daily_word_goal', 500);
  const pct = Math.min(100, Math.round(todayWords / dailyGoal * 100));

  // 今後7日以内の期限タスク
  const upcoming7 = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    const dayTasks = tasks.filter(t => !t.done && t.dueDate === ds);
    if (dayTasks.length > 0) upcoming7.push({ date: ds, tasks: dayTasks });
  }

  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const todayDay = new Date().getDay();
  const todayJP = `${new Date().getMonth()+1}月${new Date().getDate()}日（${dayNames[todayDay]}）`;

  const phaseColors = PHASE_COLORS_WA;

  return `
  <div class="top-page">
    <!-- ヒーロー格言バナー -->
    <div class="top-quote-banner">
      <div class="top-quote-inner">
        <div class="top-quote-date"><i class="fas fa-sun"></i> ${todayJP}</div>
        <blockquote class="top-quote-text">"${esc(quote.text)}"</blockquote>
        <div class="top-quote-author">— ${esc(quote.author)}</div>
      </div>
      <button class="top-quote-refresh" onclick="renderTopPageRefreshQuote()" title="別の格言"><i class="fas fa-rotate"></i></button>
    </div>

    <!-- クイックアクション -->
    <div class="top-quick-actions">
      <button class="top-qa-btn top-qa-primary" onclick="navigate('journal')">
        <i class="fas fa-pen-nib"></i><span>今日の執筆記録</span>
      </button>
      <button class="top-qa-btn" onclick="openNewProjectModal()">
        <i class="fas fa-plus"></i><span>新規作品</span>
      </button>
      <button class="top-qa-btn" onclick="navigate('tasks');setTimeout(openNewTaskModal,100)">
        <i class="fas fa-list-check"></i><span>タスク追加</span>
      </button>
      <button class="top-qa-btn" onclick="navigate('inspiration')">
        <i class="fas fa-bolt"></i><span>インスピレーション</span>
      </button>
    </div>

    <div class="top-main-grid">
      <!-- 左カラム -->
      <div class="top-left-col">

        <!-- 今日の執筆進捗 -->
        <div class="top-card">
          <div class="top-card-header">
            <i class="fas fa-pen-nib" style="color:var(--matcha)"></i>
            <span>今日の執筆</span>
            <span class="top-card-sub">${todayJP}</span>
          </div>
          <div class="top-writing-progress">
            <div class="top-wp-numbers">
              <span class="top-wp-count">${todayWords.toLocaleString()}</span>
              <span class="top-wp-sep">/</span>
              <span class="top-wp-goal">${dailyGoal.toLocaleString()} 字</span>
              <span class="top-wp-pct ${pct>=100?'done':''}">${pct}%</span>
            </div>
            <div class="top-progress-bar">
              <div class="top-progress-fill ${pct>=100?'done':''}" style="width:${pct}%"></div>
            </div>
            ${pct >= 100 ? `<div style="font-size:11.5px;color:var(--matcha);text-align:center;margin-top:4px;font-weight:700">🎉 今日のノルマ達成！</div>` : `<div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:4px">あと ${(dailyGoal-todayWords).toLocaleString()} 字</div>`}
          </div>
          ${todayJournal ? `
          <div style="margin-top:10px;padding:10px 12px;background:var(--bg-hover);border-radius:var(--radius-sm);font-size:12px;color:var(--text-secondary)">
            <i class="fas fa-quote-left" style="color:var(--text-muted);margin-right:4px;font-size:10px"></i>${esc((todayJournal.body||'').slice(0,100))}${(todayJournal.body||'').length>100?'…':''}
          </div>` : `<button class="btn btn-secondary btn-sm" style="margin-top:10px;width:100%" onclick="navigate('journal')"><i class="fas fa-pen"></i> 今日の執筆を記録する</button>`}
        </div>

        <!-- 進行中プロジェクト -->
        <div class="top-card">
          <div class="top-card-header">
            <i class="fas fa-film" style="color:var(--accent)"></i>
            <span>進行中の作品</span>
            <button class="btn btn-ghost btn-sm" onclick="navigate('dashboard')" style="margin-left:auto;font-size:11px">すべて見る →</button>
          </div>
          ${activeProjects.length === 0 ? `
          <div style="text-align:center;padding:20px;color:var(--text-muted)">
            <i class="fas fa-plus-circle" style="font-size:24px;margin-bottom:8px;display:block;opacity:.4"></i>
            <div style="font-size:12px">作品がありません</div>
            <button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="openNewProjectModal()">最初の作品を作る</button>
          </div>` : `
          <div class="top-projects-list">
            ${activeProjects.map(p => {
              const waColor = phaseColors[p.phase] || { bg:'var(--bg-hover)',color:'var(--text-muted)',border:'var(--border)' };
              const phaseIdx = ['着想','リサーチ','コンセプト設計','プロット設計','キャラクター','アウトライン','初稿','大改稿','精密推敲','フィードバック','最終稿','共有・出力'].indexOf(p.phase);
              const phasePct = phaseIdx >= 0 ? Math.round((phaseIdx / 11) * 100) : 0;
              return `
              <div class="top-project-row" onclick="navigate('proj-dash','${p.id}')">
                <div class="top-proj-phase-dot" style="background:${waColor.color}"></div>
                <div class="top-proj-info">
                  <div class="top-proj-title">${esc(p.title)}</div>
                  <div class="top-proj-meta">
                    <span style="background:${waColor.bg};color:${waColor.color};border:1px solid ${waColor.border};padding:1px 7px;border-radius:var(--radius-full);font-size:10px;font-weight:700">${esc(p.phase)}</span>
                    <span style="color:var(--text-muted);font-size:10.5px">${p.genre||''}</span>
                  </div>
                  <div class="top-proj-bar-wrap">
                    <div class="top-proj-bar"><div style="width:${phasePct}%;background:${waColor.color};height:100%;border-radius:2px;transition:width .5s"></div></div>
                    <span style="font-size:10px;color:var(--text-muted);width:28px;text-align:right">${phasePct}%</span>
                  </div>
                </div>
                <button class="btn btn-ghost btn-sm top-proj-open-btn" onclick="event.stopPropagation();navigate('${PHASES.find(ph=>ph.id===p.phase)?.nav||'ideas'}','${p.id}')">執筆<i class="fas fa-chevron-right" style="font-size:9px;margin-left:2px"></i></button>
              </div>`;
            }).join('')}
          </div>`}
        </div>
      </div>

      <!-- 右カラム -->
      <div class="top-right-col">

        <!-- タスク（今日・期限切れ・緊急） -->
        <div class="top-card">
          <div class="top-card-header">
            <i class="fas fa-calendar-check" style="color:var(--fuji)"></i>
            <span>タスク</span>
            <button class="btn btn-ghost btn-sm" onclick="navigate('tasks')" style="margin-left:auto;font-size:11px">タスク管理 →</button>
          </div>
          ${(overdueTasks.length > 0 || urgentTasks.length > 0) ? `
          <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
            ${overdueTasks.length > 0 ? `<div style="display:inline-flex;align-items:center;gap:4px;background:var(--momo-bg);color:var(--momo);border:1px solid var(--momo-border);border-radius:var(--radius-full);padding:3px 8px;font-size:11px;font-weight:700"><i class="fas fa-exclamation-circle"></i> 期限切れ ${overdueTasks.length}件</div>` : ''}
            ${urgentTasks.length > 0 ? `<div style="display:inline-flex;align-items:center;gap:4px;background:#fde8ef;color:#d01050;border:1px solid #f5b3c8;border-radius:var(--radius-full);padding:3px 8px;font-size:11px;font-weight:700"><i class="fas fa-fire"></i> 緊急 ${urgentTasks.length}件</div>` : ''}
          </div>` : ''}
          ${todayTasks.length === 0 && overdueTasks.length === 0 ? `
          <div style="text-align:center;padding:14px;color:var(--text-muted);font-size:12px">
            <i class="fas fa-check-circle" style="font-size:20px;color:var(--matcha);margin-bottom:6px;display:block"></i>今日のタスクはありません
          </div>` : ''}
          ${todayTasks.length > 0 ? `
          <div style="font-size:10.5px;font-weight:700;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">今日 (${todayTasks.length}件)</div>
          <div class="top-task-list">
            ${todayTasks.slice(0, 4).map(t => renderTopTaskItem(t)).join('')}
            ${todayTasks.length > 4 ? `<div style="text-align:center;font-size:11px;color:var(--text-muted);padding:4px">あと${todayTasks.length-4}件 <button class="btn btn-ghost btn-sm" style="font-size:11px" onclick="navigate('tasks')">すべて見る</button></div>` : ''}
          </div>` : ''}
          ${overdueTasks.length > 0 ? `
          <div style="font-size:10.5px;font-weight:700;color:var(--momo);margin:10px 0 6px;text-transform:uppercase;letter-spacing:.05em">期限切れ (${overdueTasks.length}件)</div>
          <div class="top-task-list">
            ${overdueTasks.slice(0, 3).map(t => renderTopTaskItem(t, true)).join('')}
            ${overdueTasks.length > 3 ? `<div style="text-align:center;font-size:11px;color:var(--text-muted);padding:4px">あと${overdueTasks.length-3}件</div>` : ''}
          </div>` : ''}
        </div>

        <!-- 7日間のタスクスケジュール -->
        ${upcoming7.length > 0 ? `
        <div class="top-card">
          <div class="top-card-header">
            <i class="fas fa-calendar-week" style="color:var(--kogane)"></i>
            <span>今後7日のスケジュール</span>
          </div>
          <div class="top-week-schedule">
            ${upcoming7.map(({ date, tasks: dayTasks }) => {
              const d = new Date(date + 'T00:00:00');
              const isToday = date === today;
              const label = isToday ? '今日' : `${d.getMonth()+1}/${d.getDate()}(${dayNames[d.getDay()]})`;
              return `
              <div class="top-week-row ${isToday?'today':''}">
                <div class="top-week-date ${isToday?'today':''}">${label}</div>
                <div class="top-week-tasks">
                  ${dayTasks.slice(0,2).map(t => {
                    const pr = TASK_PRIORITIES[t.priority] || TASK_PRIORITIES.medium;
                    return `<div class="top-week-task-chip" style="border-left:2px solid ${pr.color}" onclick="navigate('tasks')">${esc(t.title.slice(0,20))}${t.title.length>20?'…':''}</div>`;
                  }).join('')}
                  ${dayTasks.length > 2 ? `<div class="top-week-task-chip" style="background:transparent;color:var(--text-muted);border:1px dashed var(--border)">+${dayTasks.length-2}</div>` : ''}
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

        <!-- クイックリンク -->
        <div class="top-card">
          <div class="top-card-header">
            <i class="fas fa-compass" style="color:var(--asagi)"></i>
            <span>ツール&リソース</span>
          </div>
          <div class="top-links-grid">
            <button class="top-link-btn" onclick="navigate('board')"><i class="fas fa-film" style="color:var(--fuji)"></i><span>ストーリーボード</span></button>
            <button class="top-link-btn" onclick="navigate('learn')"><i class="fas fa-book-open" style="color:var(--fuji)"></i><span>学習センター</span></button>
            <button class="top-link-btn" onclick="navigate('tools')"><i class="fas fa-toolbox" style="color:var(--asagi)"></i><span>ツール集</span></button>
            <button class="top-link-btn" onclick="navigate('worldbuilding')"><i class="fas fa-globe" style="color:var(--asagi)"></i><span>世界観設計</span></button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function renderTopTaskItem(task, overdue = false) {
  const pr = TASK_PRIORITIES[task.priority] || TASK_PRIORITIES.medium;
  return `
  <div class="top-task-item" onclick="navigate('tasks')">
    <div class="top-task-check" onclick="event.stopPropagation();toggleTaskDone('${task.id}');render()">
      <i class="fas fa-circle" style="color:var(--border);font-size:13px"></i>
    </div>
    <div class="top-task-content">
      <div class="top-task-title ${overdue?'overdue':''}">${esc(task.title.slice(0,30))}${task.title.length>30?'…':''}</div>
      ${task.dueDate ? `<div class="top-task-due ${overdue?'overdue':''}">${overdue?'<i class="fas fa-exclamation-circle"></i> 期限切れ: ':'<i class="fas fa-clock"></i> '}${task.dueDate}</div>` : ''}
    </div>
    <div class="top-task-priority" style="color:${pr.color}"><i class="fas ${pr.icon}" style="font-size:10px"></i></div>
  </div>`;
}

function renderTopPageRefreshQuote() {
  const qEl = document.querySelector('.top-quote-text');
  const aEl = document.querySelector('.top-quote-author');
  if (!qEl || !aEl) return;
  const q = WRITING_QUOTES[Math.floor(Math.random() * WRITING_QUOTES.length)];
  qEl.textContent = `"${q.text}"`;
  aEl.textContent = `— ${q.author}`;
}

function bindTopPage() {
  // トップページのバインド（将来的な拡張用）
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

  // タスク統計（ダッシュボード用）
  const allTasks = TASK_DB.getTasks();
  const todayStr = new Date().toISOString().slice(0,10);
  const tasksDueToday = allTasks.filter(t => !t.done && t.dueDate === todayStr);
  const tasksOverdue = allTasks.filter(t => !t.done && t.dueDate && t.dueDate < todayStr);
  const tasksUrgent = allTasks.filter(t => !t.done && t.priority === 'urgent');
  const tasksThisWeek = allTasks.filter(t => {
    if (!t.dueDate || t.done) return false;
    const d = new Date(t.dueDate);
    const now = new Date();
    const diff = (d - now) / (1000*60*60*24);
    return diff >= 0 && diff <= 7;
  });

  // ライティングストリーク計算
  const journalEntriesAll = DB.get('journal_entries', []);
  let streak = 0;
  const checkDate = new Date();
  for (let i = 0; i < 365; i++) {
    const ds = checkDate.toISOString().slice(0,10);
    if (journalEntriesAll.find(e => e.date === ds && (e.wordCount||0) > 0)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
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
        <div class="project-card db-proj-card" onclick="navigate('proj-dash','${p.id}')" style="cursor:pointer;border-left:3px solid ${waColor.color}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div style="flex:1;min-width:0">
              <div class="project-card-title">${esc(p.title)}</div>
              <div class="project-card-genre"><i class="fas fa-film" style="font-size:10px;margin-right:3px;opacity:0.6"></i>${esc(p.genre)} / ${esc(p.format)}</div>
            </div>
            <div style="display:flex;gap:3px;flex-shrink:0;margin-left:6px">
              <button class="btn btn-ghost btn-icon btn-sm" onclick="event.stopPropagation();openEditProjectModal('${p.id}')" title="編集"><i class="fas fa-pen" style="font-size:10px"></i></button>
              <button class="btn btn-ghost btn-icon btn-sm" onclick="event.stopPropagation();confirmDeleteProject('${p.id}')" title="削除"><i class="fas fa-trash" style="font-size:10px;color:var(--accent)"></i></button>
            </div>
          </div>
          ${p.logline ? `<div style="font-size:11.5px;color:var(--text-muted);line-height:1.5;margin-bottom:10px;border-left:2px solid ${waColor.border};padding-left:8px;font-style:italic">${esc(p.logline.slice(0,80))}${p.logline.length>80?'…':''}</div>` : ''}
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
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px">
            <span style="font-size:10.5px;color:var(--text-muted)"><i class="fas fa-clock" style="font-size:9px"></i> ${fmtDate(p.updatedAt)}</span>
            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();navigate('${ph?.nav||'ideas'}','${p.id}')" style="font-size:10.5px;padding:4px 10px">
              <i class="fas fa-pen-nib" style="font-size:9px"></i> 執筆再開
            </button>
          </div>
        </div>`;
      }).join('');

  // 今週の執筆データ（日誌から取得）
  const journalEntries = DB.get('journal_entries', []);
  const today = new Date();
  const weekDays = Array.from({length:7}, (_,i) => {
    const d = new Date(today); d.setDate(today.getDate()-6+i);
    return d.toISOString().slice(0,10);
  });
  const weekData = weekDays.map(day => {
    const e = journalEntries.find(e => e.date === day);
    return { day: day.slice(5), wc: e?.wordCount||0, mood: e?.mood||null };
  });
  const weekMax = Math.max(...weekData.map(d=>d.wc), 1);

  // 目標進捗
  const writingGoal = DB.get('writing_goal', { daily: 500, weekly: 2000 });
  const todayWc = journalEntries.find(e=>e.date===today.toISOString().slice(0,10))?.wordCount||0;
  const weekWc  = weekData.reduce((a,d)=>a+d.wc,0);
  const goalPct = Math.min(100, Math.round(todayWc / writingGoal.daily * 100));
  const weekGoalPct = Math.min(100, Math.round(weekWc / writingGoal.weekly * 100));

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

  <!-- 統計カード（強化版） -->
  <div class="stat-grid db-stat-grid" style="margin-bottom:20px">
    <div class="stat-card beni" style="cursor:pointer" onclick="openNewProjectModal()" title="新規作成">
      <div class="stat-icon-wrap"><i class="fas fa-film"></i></div>
      <div class="stat-value">${stats.total}</div>
      <div class="stat-label">総プロジェクト</div>
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
      <div class="stat-label">総文字数</div>
    </div>
    <div class="stat-card fuji" style="cursor:pointer" onclick="navigate('journal')" title="執筆日誌へ">
      <div class="stat-icon-wrap"><i class="fas fa-fire"></i></div>
      <div class="stat-value">${streak}</div>
      <div class="stat-label">連続日数🔥</div>
    </div>
    <div class="stat-card ${tasksOverdue.length>0?'beni':'asagi'}" style="cursor:pointer" onclick="navigate('tasks')" title="タスク管理へ">
      <div class="stat-icon-wrap"><i class="fas fa-triangle-exclamation"></i></div>
      <div class="stat-value">${tasksOverdue.length}</div>
      <div class="stat-label">期限切れ</div>
    </div>

  </div>

  <!-- メインコンテンツ：作品一覧 + サイドパネル -->
  <div class="db-main-grid">

    <!-- 左：作品一覧 -->
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-size:16px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">
          <i class="fas fa-folder-open" style="color:var(--accent);margin-right:8px"></i>作品ダッシュボード
          ${projects.length > 0 ? '<span style="font-size:12px;font-weight:400;color:var(--text-muted);font-family:inherit;margin-left:6px">(' + projects.length + '件)</span>' : ''}
        </div>
        <button class="btn btn-primary btn-sm" onclick="openNewProjectModal()">
          <i class="fas fa-plus"></i> 新規作成
        </button>
      </div>
      ${projects.length > 0 ? `
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:center">
        <div style="position:relative;flex:1;min-width:160px">
          <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:12px"></i>
          <input id="db-search" class="form-input" style="padding-left:30px;height:34px;font-size:12.5px" placeholder="作品を検索...">
        </div>
        <!-- ソート・ビュー切替 -->
        <div style="display:flex;gap:4px;align-items:center">
          <select id="db-sort" class="form-select" style="height:34px;font-size:11.5px;padding:0 8px;width:auto" onchange="sortProjects(this.value)">
            <option value="updated">更新順</option>
            <option value="created">作成順</option>
            <option value="title">タイトル順</option>
            <option value="phase">フェーズ順</option>
            <option value="progress">進捗順</option>
          </select>
          <button class="btn btn-ghost btn-icon btn-sm db-view-btn active" id="db-view-grid" onclick="setDashboardView('grid')" title="グリッド表示" style="width:34px;height:34px">
            <i class="fas fa-th-large" style="font-size:12px"></i>
          </button>
          <button class="btn btn-ghost btn-icon btn-sm db-view-btn" id="db-view-list" onclick="setDashboardView('list')" title="リスト表示" style="width:34px;height:34px">
            <i class="fas fa-list" style="font-size:12px"></i>
          </button>
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px">
        <button class="phase-filter-btn active btn btn-ghost btn-sm" data-phase="all" style="font-size:11px">すべて</button>
        ${['着想','リサーチ','コンセプト設計','プロット設計','キャラクター','アウトライン','初稿','大改稿','精密推敲','フィードバック','最終稿','共有・出力'].slice(0,6).map(ph => `<button class="phase-filter-btn btn btn-ghost btn-sm" data-phase="${ph}" style="font-size:11px">${ph}</button>`).join('')}
      </div>` : ''}
      <div class="project-grid" id="project-cards-container">${projectCards}</div>
    </div>

    <!-- 右：サイドパネル -->
    <div style="display:flex;flex-direction:column;gap:18px">

      <!-- 今日のタスク・期限切れタスク ウィジェット -->
      <div class="card" style="padding:0;overflow:hidden;border-top:3px solid ${tasksOverdue.length>0?'var(--accent)':'var(--kon-lt)'}">
        <div style="padding:13px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg-subtle)">
          <div style="display:flex;align-items:center;gap:8px">
            <i class="fas fa-list-check" style="color:${tasksOverdue.length>0?'var(--accent)':'var(--kon-lt)'};font-size:13px"></i>
            <span style="font-size:13px;font-weight:600;color:var(--text-primary);font-family:'Noto Serif JP',serif">タスク状況</span>
            ${(tasksDueToday.length+tasksOverdue.length)>0?`<span style="background:var(--accent);color:white;font-size:9px;font-weight:700;padding:1px 6px;border-radius:8px">${tasksDueToday.length+tasksOverdue.length}</span>`:''}
          </div>
          <button class="btn btn-ghost btn-sm" onclick="navigate('tasks')" style="font-size:10.5px">
            すべて見る <i class="fas fa-arrow-right" style="font-size:9px"></i>
          </button>
        </div>
        <div style="padding:10px 12px">
          ${tasksOverdue.length>0?`
          <div style="margin-bottom:8px">
            <div style="font-size:10.5px;font-weight:700;color:var(--accent);margin-bottom:5px;display:flex;align-items:center;gap:5px">
              <i class="fas fa-circle-exclamation" style="font-size:9px"></i> 期限切れ (${tasksOverdue.length}件)
            </div>
            ${tasksOverdue.slice(0,3).map(t=>`
            <div style="display:flex;align-items:center;gap:7px;padding:5px 7px;background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:5px;margin-bottom:4px;cursor:pointer" onclick="navigate('tasks')">
              <i class="fas fa-circle" style="color:var(--accent);font-size:8px;flex-shrink:0"></i>
              <span style="font-size:11.5px;color:var(--text-primary);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.title)}</span>
              <span style="font-size:9.5px;color:var(--accent);font-weight:600;white-space:nowrap">${t.dueDate?t.dueDate.slice(5):''}</span>
            </div>`).join('')}
            ${tasksOverdue.length>3?`<div style="font-size:10.5px;color:var(--text-muted);text-align:center;padding:3px">他 ${tasksOverdue.length-3}件…</div>`:''}
          </div>`:''}
          ${tasksDueToday.length>0?`
          <div style="margin-bottom:8px">
            <div style="font-size:10.5px;font-weight:700;color:var(--kogane);margin-bottom:5px;display:flex;align-items:center;gap:5px">
              <i class="fas fa-sun" style="font-size:9px"></i> 今日のタスク (${tasksDueToday.length}件)
            </div>
            ${tasksDueToday.slice(0,3).map(t=>`
            <div style="display:flex;align-items:center;gap:7px;padding:5px 7px;background:var(--kogane-bg);border:1px solid var(--kogane-border);border-radius:5px;margin-bottom:4px;cursor:pointer" onclick="navigate('tasks')">
              <i class="fas fa-circle" style="color:var(--kogane);font-size:8px;flex-shrink:0"></i>
              <span style="font-size:11.5px;color:var(--text-primary);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.title)}</span>
              ${t.priority==='urgent'?`<span style="font-size:9px;background:var(--accent-bg);color:var(--accent);padding:1px 4px;border-radius:3px;font-weight:700">急</span>`:''}
            </div>`).join('')}
            ${tasksDueToday.length>3?`<div style="font-size:10.5px;color:var(--text-muted);text-align:center;padding:3px">他 ${tasksDueToday.length-3}件…</div>`:''}
          </div>`:''}
          ${tasksThisWeek.length>0&&tasksDueToday.length===0&&tasksOverdue.length===0?`
          <div style="margin-bottom:6px">
            <div style="font-size:10.5px;font-weight:700;color:var(--matcha);margin-bottom:5px;display:flex;align-items:center;gap:5px">
              <i class="fas fa-calendar-week" style="font-size:9px"></i> 今週中 (${tasksThisWeek.length}件)
            </div>
            ${tasksThisWeek.slice(0,3).map(t=>`
            <div style="display:flex;align-items:center;gap:7px;padding:5px 7px;background:var(--matcha-bg);border:1px solid var(--matcha-border);border-radius:5px;margin-bottom:4px;cursor:pointer" onclick="navigate('tasks')">
              <i class="fas fa-circle" style="color:var(--matcha);font-size:8px;flex-shrink:0"></i>
              <span style="font-size:11.5px;color:var(--text-primary);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.title)}</span>
              <span style="font-size:9.5px;color:var(--matcha);font-weight:600;white-space:nowrap">${t.dueDate?t.dueDate.slice(5):''}</span>
            </div>`).join('')}
          </div>`:''}
          ${(tasksDueToday.length+tasksOverdue.length+tasksThisWeek.length)===0?`
          <div style="text-align:center;padding:16px 8px;color:var(--text-muted);font-size:12px">
            <i class="fas fa-check-circle" style="font-size:22px;display:block;margin-bottom:6px;opacity:0.4;color:var(--matcha)"></i>
            今日の期限タスクなし
          </div>`:''}
          <!-- クイックタスク追加 -->
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
            <div style="display:flex;gap:5px">
              <input id="db-quick-task" class="form-input" placeholder="タスクをすばやく追加…" style="font-size:11.5px;height:30px;flex:1" onkeydown="if(event.key==='Enter')dbQuickAddTask()">
              <button class="btn btn-primary btn-sm" onclick="dbQuickAddTask()" style="height:30px;padding:0 10px;font-size:11px"><i class="fas fa-plus"></i></button>
            </div>
          </div>
        </div>
      </div>

      <!-- 執筆目標ウィジェット -->
      <div class="card" style="padding:0;overflow:hidden;border-top:3px solid var(--matcha)">
        <div style="padding:13px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg-subtle)">
          <div style="display:flex;align-items:center;gap:8px">
            <i class="fas fa-bullseye" style="color:var(--matcha);font-size:13px"></i>
            <span style="font-size:13px;font-weight:600;color:var(--text-primary);font-family:'Noto Serif JP',serif">今日の目標</span>
          </div>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="openGoalSettingModal()" title="目標を設定">
            <i class="fas fa-pen" style="font-size:10px"></i>
          </button>
        </div>
        <div style="padding:14px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
            <div style="text-align:center;padding:10px;background:var(--matcha-bg);border-radius:var(--radius-sm);border:1px solid var(--matcha-border)">
              <div style="font-size:22px;font-weight:700;color:var(--matcha)">${todayWc.toLocaleString()}</div>
              <div style="font-size:10px;color:var(--text-muted)">今日の文字数</div>
              <div style="font-size:10px;color:var(--matcha);font-weight:600">目標 ${writingGoal.daily.toLocaleString()}字</div>
            </div>
            <div style="text-align:center;padding:10px;background:var(--kogane-bg);border-radius:var(--radius-sm);border:1px solid var(--kogane-border)">
              <div style="font-size:22px;font-weight:700;color:var(--kogane)">${weekWc.toLocaleString()}</div>
              <div style="font-size:10px;color:var(--text-muted)">今週の文字数</div>
              <div style="font-size:10px;color:var(--kogane);font-weight:600">目標 ${writingGoal.weekly.toLocaleString()}字</div>
            </div>
          </div>
          <div style="margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;margin-bottom:3px">
              <span style="font-size:11px;color:var(--text-secondary)">今日の進捗</span>
              <span style="font-size:11px;font-weight:600;color:${goalPct>=100?'var(--matcha)':'var(--text-secondary)'}">${goalPct}%${goalPct>=100?' 🎉':''}</span>
            </div>
            <div style="height:8px;background:var(--bg-hover);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${goalPct}%;background:${goalPct>=100?'var(--matcha)':'linear-gradient(90deg,var(--matcha),var(--kogane))'};border-radius:4px;transition:width .5s ease"></div>
            </div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:3px">
              <span style="font-size:11px;color:var(--text-secondary)">週間進捗</span>
              <span style="font-size:11px;font-weight:600;color:${weekGoalPct>=100?'var(--kogane)':'var(--text-secondary)'}">${weekGoalPct}%${weekGoalPct>=100?' ✨':''}</span>
            </div>
            <div style="height:8px;background:var(--bg-hover);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${weekGoalPct}%;background:${weekGoalPct>=100?'var(--kogane)':'linear-gradient(90deg,var(--kogane),var(--fuji))'};border-radius:4px;transition:width .5s ease"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 週間執筆チャート -->
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:13px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;background:var(--bg-subtle)">
          <i class="fas fa-chart-bar" style="color:var(--fuji);font-size:13px"></i>
          <span style="font-size:13px;font-weight:600;color:var(--text-primary);font-family:'Noto Serif JP',serif">週間執筆チャート</span>
        </div>
        <div style="padding:14px">
          <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:4px;height:70px">
            ${weekData.map(d => {
              const h = Math.round((d.wc / weekMax) * 60) + 4;
              const isToday = d.day === today.toISOString().slice(5,10);
              return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
                <div style="font-size:9px;color:var(--text-muted)">${d.wc>0?d.wc:''}</div>
                <div style="width:100%;height:${h}px;background:${isToday?'var(--fuji)':'var(--fuji-bg)'};border:1.5px solid ${isToday?'var(--fuji)':'var(--fuji-border)'};border-radius:3px 3px 0 0;transition:height .3s" title="${d.day}: ${d.wc}字"></div>
                <div style="font-size:9px;color:${isToday?'var(--fuji)':'var(--text-muted)'};font-weight:${isToday?700:400}">${d.day}</div>
              </div>`;
            }).join('')}
          </div>
          <div style="margin-top:10px;font-size:11px;color:var(--text-muted);text-align:center">
            今週合計: <span style="font-weight:600;color:var(--fuji)">${weekWc.toLocaleString()}字</span>
          </div>
        </div>
      </div>

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

      <!-- 執筆統計グラフ -->
      ${projects.length > 0 ? `
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:13px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;background:var(--bg-subtle)">
          <i class="fas fa-chart-pie" style="color:var(--fuji);font-size:13px"></i>
          <span style="font-size:13px;font-weight:600;color:var(--text-primary);font-family:'Noto Serif JP',serif">フェーズ分布</span>
        </div>
        <div style="padding:14px 14px">
          ${(function(){
            const phaseCounts = {};
            projects.forEach(p => { phaseCounts[p.phase] = (phaseCounts[p.phase]||0)+1; });
            return Object.entries(phaseCounts).map(([phase, cnt]) => {
              const waC = PHASE_COLORS_WA[phase] || { bg:'#f8f6f1', color:'#7a6e5e', border:'#e4ddd3' };
              const pct = Math.round((cnt / projects.length) * 100);
              return `<div style="margin-bottom:8px">
                <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                  <span style="font-size:11.5px;color:${waC.color};font-weight:600">${phase}</span>
                  <span style="font-size:11px;color:var(--text-muted)">${cnt}件 (${pct}%)</span>
                </div>
                <div style="height:6px;background:var(--bg-hover);border-radius:3px;overflow:hidden">
                  <div style="height:100%;width:${pct}%;background:${waC.color};border-radius:3px;transition:width .4s ease"></div>
                </div>
              </div>`;
            }).join('');
          })()}
        </div>
      </div>` : ''}

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

      <!-- ストーリーボード ウィジェット -->
      ${renderDashboardBoardWidget()}

      <!-- クイックリンク -->
      <div class="card" style="padding:14px">
        <div style="font-size:12.5px;font-weight:600;color:var(--text-secondary);margin-bottom:10px;font-family:'Noto Serif JP',serif"><i class="fas fa-compass" style="color:var(--accent);margin-right:6px"></i>クイックアクセス</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          ${[
            { icon:'fa-book', label:'執筆日誌', page:'journal', color:'var(--matcha)' },
            { icon:'fa-bolt', label:'インスピレーション', page:'inspiration', color:'var(--kogane)' },
            { icon:'fa-table-cells-large', label:'ストーリーボード', page:'board', color:'var(--fuji)' },
            { icon:'fa-graduation-cap', label:'学習センター', page:'learn', color:'var(--fuji)' },
            { icon:'fa-toolbox', label:'ツール', page:'tools', color:'var(--asagi)' },
            { icon:'fa-globe', label:'世界観設計', page:'worldbuilding', color:'var(--asagi)' },
          ].map(l => `<button class="btn btn-ghost btn-sm" style="justify-content:flex-start;gap:7px;font-size:11.5px" onclick="navigate('${l.page}')">
            <i class="fas ${l.icon}" style="color:${l.color};width:14px"></i>${l.label}
          </button>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function dbQuickAddTask() {
  const input = document.getElementById('db-quick-task');
  if (!input || !input.value.trim()) return;
  const title = input.value.trim();
  const task = {
    id: 'task_' + Date.now(),
    title,
    dueDate: new Date().toISOString().slice(0,10),
    priority: 'medium',
    category: 'writing',
    done: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  TASK_DB.saveTask(task);
  input.value = '';
  toast(`タスク「${title}」を追加しました`, 'success', 2500);
  // ダッシュボードを再描画してタスクリストを更新
  const taskWidgetContent = document.querySelector('#db-task-widget-list');
  if (!taskWidgetContent) {
    // 簡易リフレッシュ
    navigate('dashboard');
    return;
  }
}

function bindDashboard() {
  // 検索フィルター
  const searchInput = $('#db-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => filterProjects(searchInput.value));
  }
  // フェーズフィルター
  $$('.phase-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.phase-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterProjectsByPhase(btn.dataset.phase);
    });
  });
  // ビュー状態を復元
  const savedView = DB.get('dashboard_view', 'grid');
  if (savedView === 'list') setDashboardView('list', false);
}

// ── Dashboard View Toggle ───────────────────────────────────
function setDashboardView(view, save = true) {
  const container = document.getElementById('project-cards-container');
  if (!container) return;
  if (view === 'list') {
    container.classList.remove('project-grid');
    container.classList.add('project-list-view');
    document.getElementById('db-view-grid')?.classList.remove('active');
    document.getElementById('db-view-list')?.classList.add('active');
  } else {
    container.classList.add('project-grid');
    container.classList.remove('project-list-view');
    document.getElementById('db-view-grid')?.classList.add('active');
    document.getElementById('db-view-list')?.classList.remove('active');
  }
  if (save) DB.set('dashboard_view', view);
}

// ── Dashboard Sort ───────────────────────────────────────────
function sortProjects(sortKey) {
  const container = document.getElementById('project-cards-container');
  if (!container) return;
  const cards = [...container.querySelectorAll('.project-card')];
  const phaseOrder = {'着想':0,'リサーチ':1,'コンセプト設計':2,'プロット設計':3,'キャラクター':4,'アウトライン':5,'初稿':6,'大改稿':7,'精密推敲':8,'フィードバック':9,'最終稿':10,'共有・出力':11};
  cards.sort((a, b) => {
    const aTitle = a.querySelector('.project-card-title')?.textContent || '';
    const bTitle = b.querySelector('.project-card-title')?.textContent || '';
    const aPhaseTag = a.querySelector('.tag')?.textContent?.trim() || '';
    const bPhaseTag = b.querySelector('.tag')?.textContent?.trim() || '';
    const aPhase = Object.keys(phaseOrder).find(ph => aPhaseTag.includes(ph)) || '';
    const bPhase = Object.keys(phaseOrder).find(ph => bPhaseTag.includes(ph)) || '';
    if (sortKey === 'title') return aTitle.localeCompare(bTitle, 'ja');
    if (sortKey === 'phase') return (phaseOrder[aPhase]||0) - (phaseOrder[bPhase]||0);
    if (sortKey === 'progress') return (phaseOrder[bPhase]||0) - (phaseOrder[aPhase]||0);
    return 0;
  });
  cards.forEach(c => container.appendChild(c));
  toast('並び替えました', 'info');
}

function openGoalSettingModal() {
  const goal = DB.get('writing_goal', { daily: 500, weekly: 2000 });
  openModal(
    `<i class="fas fa-bullseye" style="color:var(--matcha)"></i> 執筆目標を設定`,
    `<div class="form-group">
       <label class="form-label">1日の目標文字数</label>
       <input class="form-input" id="goal-daily" type="number" value="${goal.daily}" min="100" max="50000" step="100">
     </div>
     <div class="form-group">
       <label class="form-label">1週間の目標文字数</label>
       <input class="form-input" id="goal-weekly" type="number" value="${goal.weekly}" min="500" max="200000" step="500">
     </div>
     <div style="padding:10px 12px;background:var(--matcha-bg);border-radius:var(--radius-sm);font-size:12px;color:var(--matcha);border-left:3px solid var(--matcha)">
       <i class="fas fa-lightbulb" style="margin-right:6px"></i>目標は執筆日誌の文字数入力と連動します
     </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveWritingGoal()"><i class="fas fa-floppy-disk"></i> 保存</button>`
  );
}

function saveWritingGoal() {
  const daily  = parseInt($('#goal-daily')?.value || 500);
  const weekly = parseInt($('#goal-weekly')?.value || 2000);
  DB.set('writing_goal', { daily: isNaN(daily)?500:daily, weekly: isNaN(weekly)?2000:weekly });
  closeModal();
  toast('目標を設定しました！', 'success');
  navigate('dashboard');
}

function filterProjects(query) {
  const cards = $$('.project-card');
  cards.forEach(card => {
    const title = card.querySelector('.project-card-title')?.textContent || '';
    const genre = card.querySelector('.project-card-genre')?.textContent || '';
    const match = !query || title.includes(query) || genre.includes(query);
    card.style.display = match ? '' : 'none';
  });
}

function filterProjectsByPhase(phase) {
  const cards = $$('.project-card');
  cards.forEach(card => {
    if (!phase || phase === 'all') {
      card.style.display = '';
    } else {
      const phaseTag = card.querySelector('.tag')?.textContent?.trim() || '';
      card.style.display = phaseTag.includes(phase) ? '' : 'none';
    }
  });
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
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="openImportFromInspiration('${proj.id}')" title="インスピレーションから取り込む">
            <i class="fas fa-bolt" style="color:var(--kogane)"></i> インスピから
          </button>
          <button class="btn btn-primary btn-sm" onclick="openAddIdeaModal('${proj.id}')"><i class="fas fa-plus"></i> 追加</button>
        </div>
      </div>
      ${ideas.length > 1 ? `
      <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
        <span style="font-size:11.5px;color:var(--text-muted)">並び替え:</span>
        <button class="btn btn-ghost btn-sm idea-sort active" data-sort="createdAt" onclick="sortIdeas('${proj.id}','createdAt',this)">日付順</button>
        <button class="btn btn-ghost btn-sm idea-sort" data-sort="priority" onclick="sortIdeas('${proj.id}','priority',this)">優先度</button>
        <button class="btn btn-ghost btn-sm idea-sort" data-sort="type" onclick="sortIdeas('${proj.id}','type',this)">タイプ別</button>
      </div>` : ''}
      <div class="idea-grid" id="idea-grid-${proj.id}">${ideaCards}</div>
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

function sortIdeas(projId, by, btn) {
  $$('.idea-sort').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');
  const proj = DB.getProject(projId);
  if (!proj || !proj.ideas) return;
  const priorityOrder = { '高':0, '中':1, '低':2, '':3 };
  const sorted = [...proj.ideas].sort((a,b) => {
    if (by === 'priority') return (priorityOrder[a.priority||'']||3) - (priorityOrder[b.priority||'']||3);
    if (by === 'type') return (a.type||'').localeCompare(b.type||'');
    return new Date(b.createdAt||0) - new Date(a.createdAt||0);
  });
  const IDEA_TYPE_COLORS = {
    'メモ':{'tag':'tag-kogane','icon':'fa-note-sticky','hex':'#c48a00','bg':'#fdf8e8'},
    'シーン':{'tag':'tag-momo','icon':'fa-film','hex':'#d44d7a','bg':'#fdf0f5'},
    'セリフ':{'tag':'tag-fuji','icon':'fa-quote-left','hex':'#6a5aaa','bg':'#f4f2fb'},
    'テーマ':{'tag':'tag-matcha','icon':'fa-seedling','hex':'#4a7c3f','bg':'#eff6ed'},
    'キャラクター':{'tag':'tag-beni','icon':'fa-user','hex':'#d94f2a','bg':'#fef2ee'},
    '設定':{'tag':'tag-asagi','icon':'fa-map','hex':'#2a8080','bg':'#eef7f7'},
  };
  const grid = $('#idea-grid-'+projId);
  if (!grid) return;
  grid.innerHTML = sorted.map(idea => {
    const tc = IDEA_TYPE_COLORS[idea.type] || IDEA_TYPE_COLORS['メモ'];
    return `<div class="idea-card" id="idea-${idea.id}" style="border-top:3px solid ${tc.hex}">
      <div class="idea-card-actions">
        <button class="btn btn-ghost btn-icon btn-sm" onclick="editIdea('${projId}','${idea.id}')"><i class="fas fa-pen" style="font-size:10px"></i></button>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteIdea('${projId}','${idea.id}')"><i class="fas fa-xmark" style="font-size:10px;color:var(--accent)"></i></button>
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
        ${idea.priority==='高'?'<span class="tag tag-beni" style="font-size:10px"><i class="fas fa-fire" style="font-size:9px"></i> 高優先</span>':''}
        ${idea.priority==='低'?'<span class="tag tag-gray" style="font-size:10px">低優先</span>':''}
        <span class="tag tag-gray" style="margin-left:auto;font-size:10px">${fmtDate(idea.createdAt)}</span>
      </div>
    </div>`;
  }).join('');
}

function openImportFromInspiration(projId) {
  const scratches = DB.get('inspiration_scratches', []);
  if (scratches.length === 0) {
    toast('スクラッチパッドにメモがありません。先にインスピレーションページでメモを追加してください。', 'info');
    return;
  }
  openModal(
    `<i class="fas fa-bolt" style="color:var(--kogane)"></i> インスピレーションから取り込む`,
    `<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">スクラッチパッドのメモを選択してアイデアとして追加します</div>
     <div style="max-height:360px;overflow-y:auto;display:flex;flex-direction:column;gap:8px" id="insp-import-list">
       ${scratches.slice(0,20).map((s,i) => `
         <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:var(--bg-subtle);border-radius:var(--radius-sm);cursor:pointer;border:1px solid var(--border)">
           <input type="checkbox" value="${s.id}" style="margin-top:3px;flex-shrink:0">
           <div>
             ${s.title ? `<div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:3px">${esc(s.title)}</div>` : ''}
             <div style="font-size:12px;color:var(--text-secondary);line-height:1.6">${esc(s.body?.slice(0,100)||'')}${(s.body||'').length>100?'…':''}</div>
             <div style="font-size:10px;color:var(--text-muted);margin-top:4px">${s.type||'その他'}</div>
           </div>
         </label>`).join('')}
     </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="confirmImportFromInspiration('${projId}')"><i class="fas fa-plus"></i> 選択した項目を追加</button>`,
    { size: 'modal-md' }
  );
}

function confirmImportFromInspiration(projId) {
  const checks = $$('#insp-import-list input[type=checkbox]:checked');
  if (checks.length === 0) { toast('項目を選択してください', 'error'); return; }
  const scratches = DB.get('inspiration_scratches', []);
  const proj = DB.getProject(projId);
  if (!proj) return;
  if (!proj.ideas) proj.ideas = [];
  checks.forEach(ch => {
    const s = scratches.find(x => x.id === ch.value);
    if (!s) return;
    proj.ideas.unshift({ id: uid(), title: s.title || s.body?.slice(0,30) || 'スクラッチメモ',
      body: s.body, type: 'メモ', priority: '中', createdAt: new Date().toISOString() });
  });
  DB.saveProject(proj);
  closeModal();
  toast(`${checks.length}件のメモをアイデアに追加しました！`, 'success');
  navigate(State.currentPage, projId);
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
    <div class="card" style="padding:0;overflow:hidden">
      <div class="card-header" style="padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg-subtle)">
        <div class="card-title"><i class="fas fa-chart-line icon"></i> テンションカーブ</div>
        <span style="font-size:10.5px;color:var(--text-muted)">${plots.length}シーン</span>
      </div>
      <div style="padding:12px 14px">${renderTensionCurveInteractive(proj)}</div>
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
  return `<polyline points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2" opacity="0.7"/>`;
}

function renderTensionCurveInteractive(proj) {
  const plots = proj.plots || [];
  if (plots.length === 0) {
    return `<div style="text-align:center;padding:32px;color:var(--text-muted)">
      <i class="fas fa-chart-line" style="font-size:28px;opacity:0.3;display:block;margin-bottom:8px"></i>
      シーンを追加するとテンションカーブが表示されます
    </div>`;
  }

  const W = 600, H = 150;
  const padL = 32, padR = 12, padT = 12, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  // グリッド線
  let gridLines = '';
  for (let t = 0; t <= 10; t += 2) {
    const y = padT + innerH - (t / 10) * innerH;
    gridLines += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--border)" stroke-width="0.5" opacity="0.6"/>`;
    gridLines += `<text x="${padL - 4}" y="${y + 4}" font-size="8" fill="var(--text-muted)" text-anchor="end">${t}</text>`;
  }

  // 幕区切り線（4幕）
  const actColors = ['var(--accent)','var(--kogane)','var(--momo)','var(--fuji)'];
  let actLines = '';
  [0.25, 0.5, 0.75].forEach(ratio => {
    const x = padL + ratio * innerW;
    actLines += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${H - padB}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,3" opacity="0.7"/>`;
  });

  // ポイント計算
  const pts = plots.map((p, i) => ({
    x: padL + (i / Math.max(plots.length - 1, 1)) * innerW,
    y: padT + innerH - ((p.tension || 5) / 10) * innerH,
    tension: p.tension || 5,
    title: p.title || `S${i+1}`,
    act: p.act || 0,
    id: p.id,
  }));

  // 滑らかなパス（Bezier曲線）
  let pathD = '';
  if (pts.length >= 2) {
    pathD = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cp1x = pts[i-1].x + (pts[i].x - pts[i-1].x) / 3;
      const cp2x = pts[i].x - (pts[i].x - pts[i-1].x) / 3;
      pathD += ` C ${cp1x} ${pts[i-1].y} ${cp2x} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
    }
  }

  // グラデーション塗りつぶし
  const fillD = pathD + ` L ${pts[pts.length-1].x} ${H - padB} L ${pts[0].x} ${H - padB} Z`;

  // インタラクティブポイント
  const points = pts.map((p, i) => {
    const color = p.tension >= 8 ? 'var(--accent)' : p.tension >= 6 ? 'var(--momo)' : p.tension >= 4 ? 'var(--kogane)' : 'var(--matcha)';
    return `
    <g class="tension-point" style="cursor:pointer" onclick="openEditPlotModal('${proj.id}','${p.id}')">
      <circle cx="${p.x}" cy="${p.y}" r="6" fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="${p.x}" cy="${p.y}" r="10" fill="transparent" />
      <title>${esc(p.title)} (テンション:${p.tension})</title>
    </g>`;
  }).join('');

  // 幕ラベル
  const actLabels = ['第一幕','第二幕前','第二幕後','第三幕'];
  const actLabelSvg = [0.125, 0.375, 0.625, 0.875].map((ratio, i) => {
    const x = padL + ratio * innerW;
    return `<text x="${x}" y="${H - padB + 18}" font-size="8" fill="var(--text-muted)" text-anchor="middle">${actLabels[i]}</text>`;
  }).join('');

  return `
  <div style="overflow-x:auto">
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:100%;min-width:280px;display:block">
      <defs>
        <linearGradient id="tension-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.03"/>
        </linearGradient>
      </defs>
      ${gridLines}
      ${actLines}
      ${pts.length >= 2 ? `
      <path d="${fillD}" fill="url(#tension-fill)"/>
      <path d="${pathD}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
      ${actLabelSvg}
      ${points}
    </svg>
  </div>
  <div style="display:flex;gap:12px;margin-top:6px;flex-wrap:wrap">
    <span style="font-size:10px;color:var(--text-muted)"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--accent);vertical-align:middle;margin-right:4px"></span>高テンション(8-10)</span>
    <span style="font-size:10px;color:var(--text-muted)"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--momo);vertical-align:middle;margin-right:4px"></span>中高(6-7)</span>
    <span style="font-size:10px;color:var(--text-muted)"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--kogane);vertical-align:middle;margin-right:4px"></span>中(4-5)</span>
    <span style="font-size:10px;color:var(--text-muted)"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--matcha);vertical-align:middle;margin-right:4px"></span>低(1-3)</span>
    <span style="font-size:10px;color:var(--text-muted);margin-left:auto"><i class="fas fa-hand-pointer"></i> ポイントをクリックで編集</span>
  </div>`;
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
  const lastSaved = activeDraft?.updatedAt ? new Date(activeDraft.updatedAt).toLocaleTimeString('ja-JP', {hour:'2-digit',minute:'2-digit'}) : '未保存';

  return `
  <div class="section-header">
    <div class="section-title"><i class="fas fa-pen-nib" style="color:#6af7c8"></i> 脚本エディタ <span class="phase-badge-lg">Phase 7</span></div>
    <div class="section-desc">日本の脚本フォーマットで執筆しましょう。オートセーブ有効（1.5秒）</div>
  </div>
  <div class="editor-layout">
    <div class="editor-main">
      <div class="editor-toolbar">
        <div class="editor-toolbar-group">
          ${draftTabs}
          <button class="btn btn-ghost btn-sm" onclick="addNewDraft('${proj.id}')"><i class="fas fa-plus"></i></button>
        </div>
        <div class="editor-toolbar-group">
          <button class="btn btn-secondary btn-sm" onclick="insertElement('scene-heading')" title="シーン見出し【○○】"><i class="fas fa-clapperboard"></i> シーン</button>
          <button class="btn btn-secondary btn-sm" onclick="insertElement('action')" title="ト書き（情景・動作）"><i class="fas fa-align-left"></i> ト書き</button>
          <button class="btn btn-secondary btn-sm" onclick="insertElement('character')" title="キャラクター名"><i class="fas fa-user"></i> キャラ</button>
          <button class="btn btn-secondary btn-sm" onclick="insertElement('dialogue')" title="セリフ「」"><i class="fas fa-comment"></i> セリフ</button>
          <button class="btn btn-secondary btn-sm" onclick="insertElement('parenthetical')" title="演技指定（）"><i class="fas fa-brackets-round"></i> 指定</button>
          <button class="btn btn-secondary btn-sm" onclick="insertElement('transition')" title="転換OP/カット"><i class="fas fa-right-long"></i> 転換</button>
        </div>
        <div class="editor-toolbar-group" style="margin-left:auto;gap:8px">
          <span id="editor-autosave-indicator" style="font-size:11px;color:var(--matcha);display:flex;align-items:center;gap:4px" title="最終保存: ${lastSaved}">
            <i class="fas fa-cloud-arrow-up" style="font-size:10px"></i><span>${lastSaved}</span>
          </span>
          <span style="font-size:11px;color:var(--text-muted)">${wordCount.toLocaleString()}字 / 約${pageCount}ページ</span>
          <button class="btn btn-ghost btn-sm" onclick="toggleFocusMode()" id="focus-mode-btn" title="集中執筆モード"><i class="fas fa-expand"></i></button>
          <button class="btn btn-ghost btn-sm" onclick="openWordGoalModal('${proj.id}')" title="目標文字数設定"><i class="fas fa-bullseye"></i></button>
          <div style="display:flex;align-items:center;gap:4px">
            <button class="btn btn-ghost btn-icon btn-sm" onclick="changeEditorFontSize(-1)" title="文字を小さく"><i class="fas fa-minus" style="font-size:9px"></i></button>
            <span id="editor-font-size" style="font-size:11px;color:var(--text-muted);min-width:28px;text-align:center">13</span>
            <button class="btn btn-ghost btn-icon btn-sm" onclick="changeEditorFontSize(1)" title="文字を大きく"><i class="fas fa-plus" style="font-size:9px"></i></button>
          </div>
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
        <div class="editor-panel-body" id="editor-stats-live">
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
          <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border)">
            <div style="font-size:10.5px;font-weight:700;color:var(--text-muted);margin-bottom:6px">執筆のヒント</div>
            <div style="font-size:10.5px;color:var(--text-muted);line-height:1.8">
              ✏️ まず最後まで書ききること<br>
              🎬 内面より行動で感情を表現<br>
              💬 セリフは短く・個性的に<br>
              ✂️ 1シーン = 1つの変化<br>
              🔄 推敲は2稿目以降で
            </div>
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
  const sceneCount = (content||'').split('\n').filter(l => /^【\d+】/.test(l.trim()) || l.includes('（外）') || l.includes('（内）')).length;
  const charLines = (content||'').split('\n').filter(l => /^[A-Z\u3040-\u30ff\u4e00-\u9fff]{1,10}$/.test(l.trim())).length;
  const target = proj.wordTarget || 12000;
  const pct = Math.min(100, Math.round(wc/target*100));
  const pctColor = pct >= 80 ? 'var(--matcha)' : pct >= 50 ? 'var(--kogane)' : 'var(--accent)';
  return `
  <div style="margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:3px">
      <span>目標達成率</span><span style="color:${pctColor};font-weight:600">${pct}%</span>
    </div>
    <div class="wc-bar"><div class="wc-fill" style="width:${pct}%;background:${pctColor}"></div></div>
    <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${wc.toLocaleString()} / ${target.toLocaleString()}字</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
    ${[
      {label:'文字数', val: wc.toLocaleString(), icon:'fa-text-height', color:'var(--kon-lt)'},
      {label:'ページ数', val: Math.ceil(wc/400)+'p', icon:'fa-file', color:'var(--fuji)'},
      {label:'シーン数', val: sceneCount, icon:'fa-clapperboard', color:'var(--momo)'},
      {label:'行数', val: lines, icon:'fa-align-left', color:'var(--matcha)'},
      {label:'セリフ行', val: dialogueLines, icon:'fa-comment', color:'var(--kogane)'},
      {label:'キャラ登場', val: charLines+'行', icon:'fa-user', color:'var(--asagi)'},
    ].map(s=>`
    <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-xs);padding:6px 8px;text-align:center">
      <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px"><i class="fas ${s.icon}" style="color:${s.color};margin-right:3px"></i>${s.label}</div>
      <div style="font-size:13px;font-weight:700;color:var(--text-primary)">${s.val}</div>
    </div>`).join('')}
  </div>`;
}

let editorSaveTimer = null;
function onEditorInput(projId, draftId) {
  clearTimeout(editorSaveTimer);
  // Update scene nav and stats live
  const content = $('#script-editor')?.value || '';
  const navEl = $('#scene-nav');
  if (navEl) navEl.innerHTML = renderSceneNav(content);
  // Update live stats
  const statsEl = document.getElementById('editor-stats-live');
  if (statsEl) {
    const proj = DB.getProject(projId);
    if (proj) statsEl.innerHTML = renderEditorStats(proj, content);
  }
  // Update word count in toolbar
  const wc = countWords(content);
  const pc = Math.max(1, Math.ceil(wc / 400));
  const wcEl = document.querySelector('.editor-toolbar-group [data-wc]');
  if (wcEl) wcEl.textContent = `${wc.toLocaleString()}字 / 約${pc}ページ`;
  // Show saving indicator
  const ind = document.getElementById('editor-autosave-indicator');
  if (ind) ind.innerHTML = '<i class="fas fa-circle-notch fa-spin" style="font-size:10px;color:var(--text-muted)"></i><span style="color:var(--text-muted)">保存中…</span>';
  editorSaveTimer = setTimeout(() => {
    saveEditorContent(projId, draftId);
    if (ind) ind.innerHTML = '<i class="fas fa-cloud-check" style="font-size:10px;color:var(--matcha)"></i><span style="color:var(--matcha)">保存済み</span>';
  }, 1500);
}

function openWordGoalModal(projId) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  const current = proj.wordTarget || 12000;
  openModal(`
  <div class="modal-header"><div class="modal-title"><i class="fas fa-bullseye" style="color:var(--accent)"></i> 目標文字数を設定</div></div>
  <div class="modal-body">
    <div class="form-group">
      <label class="form-label">目標文字数</label>
      <input class="form-input" id="word-goal-input" type="number" value="${current}" min="100" step="100" placeholder="例：12000">
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px">目安：短編=4,000〜8,000字 / 1時間ドラマ=10,000〜14,000字 / 映画=12,000〜18,000字</div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
      ${[4000,8000,12000,16000].map(v=>`<button class="btn btn-ghost btn-sm" style="font-size:11px" onclick="document.getElementById('word-goal-input').value=${v}">${v.toLocaleString()}字</button>`).join('')}
    </div>
  </div>
  <div class="modal-footer">
    <button class="btn btn-ghost" onclick="closeModal()">キャンセル</button>
    <button class="btn btn-primary" onclick="saveWordGoal('${projId}')"><i class="fas fa-check"></i> 設定</button>
  </div>`);
}

function saveWordGoal(projId) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  const val = parseInt(document.getElementById('word-goal-input')?.value);
  if (isNaN(val) || val < 100) { toast('有効な文字数を入力してください', 'error'); return; }
  proj.wordTarget = val;
  proj.updatedAt = now();
  DB.saveProject(proj);
  closeModal();
  toast(`目標文字数を ${val.toLocaleString()}字 に設定しました`, 'success');
  render();
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

// ── 集中執筆モード ───────────────────────────────────────────────
window._focusMode = false;
window._editorFontSize = 13;

function toggleFocusMode() {
  window._focusMode = !window._focusMode;
  const editorLayout = document.querySelector('.editor-layout');
  const sidebar = document.querySelector('.editor-sidebar');
  const btn = $('#focus-mode-btn');
  const header = document.querySelector('.page-header, .topbar, .sidebar, nav');

  if (window._focusMode) {
    if (sidebar) sidebar.style.display = 'none';
    if (editorLayout) { editorLayout.style.gridTemplateColumns = '1fr'; editorLayout.style.maxWidth = '800px'; editorLayout.style.margin = '0 auto'; }
    if (btn) { btn.innerHTML = '<i class="fas fa-compress"></i>'; btn.title = '通常モードに戻る'; }
    toast('集中執筆モード ON', 'success');
  } else {
    if (sidebar) sidebar.style.display = '';
    if (editorLayout) { editorLayout.style.gridTemplateColumns = ''; editorLayout.style.maxWidth = ''; editorLayout.style.margin = ''; }
    if (btn) { btn.innerHTML = '<i class="fas fa-expand"></i>'; btn.title = '集中執筆モード'; }
    toast('通常モードに戻りました', 'info');
  }
}

function changeEditorFontSize(delta) {
  window._editorFontSize = Math.min(20, Math.max(10, window._editorFontSize + delta));
  const ta = $('#script-editor');
  if (ta) ta.style.fontSize = window._editorFontSize + 'px';
  const sizeEl = $('#editor-font-size');
  if (sizeEl) sizeEl.textContent = window._editorFontSize;
  DB.set('editor_font_size', window._editorFontSize);
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
  const content = activeDraft?.content || '';
  const wc = countWords(content);
  const expOpts = DB.get(`exp_opts_${proj.id}`, { title: true, charlist: false, pagenum: false, synopsis: false, format: 'txt' });

  // プレビュー生成（脚本フォーマット整形）
  const previewContent = buildExportOutput(proj, content, expOpts);
  const previewHtml = esc(previewContent.slice(0, 2000)) + (previewContent.length > 2000 ? '\n\n──（以下省略）──' : '');

  return `
  <div class="section-header">
    <div class="section-title"><i class="fas fa-share-nodes" style="color:#f7c56a"></i> 共有・出力 <span class="phase-badge-lg">Phase 12</span></div>
    <div class="section-desc">脚本を書き出し・共有・提出できる形に整えましょう</div>
  </div>

  <div class="export-layout">
    <!-- 左カラム：設定と操作 -->
    <div class="export-left">

      <!-- 出力フォーマット選択 -->
      <div class="card" style="padding:0;overflow:hidden;border-top:3px solid var(--fuji)">
        <div class="export-card-head"><i class="fas fa-file-export"></i> 出力フォーマット</div>
        <div style="padding:16px;display:flex;flex-direction:column;gap:8px">
          <div class="export-fmt-grid">
            ${[
              { val:'txt',  icon:'fa-file-lines',  label:'テキスト (.txt)',    desc:'シンプル・汎用性高い' },
              { val:'md',   icon:'fa-markdown',    label:'Markdown (.md)',    desc:'構造付きテキスト' },
              { val:'html', icon:'fa-code',        label:'HTML (.html)',      desc:'スタイル付き印刷向け' },
              { val:'script', icon:'fa-scroll',   label:'脚本形式 (.txt)',    desc:'日本式フォーマット整形' },
            ].map(f => `
            <label class="export-fmt-card ${expOpts.format===f.val?'active':''}">
              <input type="radio" name="exp-format" value="${f.val}" ${expOpts.format===f.val?'checked':''} onchange="setExportOpt('${proj.id}','format','${f.val}')">
              <i class="fas ${f.icon}" style="font-size:16px;margin-bottom:4px;color:${expOpts.format===f.val?'var(--fuji)':'var(--text-muted)'}"></i>
              <div style="font-size:11.5px;font-weight:700">${f.label}</div>
              <div style="font-size:10px;color:var(--text-muted)">${f.desc}</div>
            </label>`).join('')}
          </div>
        </div>
      </div>

      <!-- 出力オプション -->
      <div class="card" style="padding:0;overflow:hidden">
        <div class="export-card-head"><i class="fas fa-sliders"></i> 出力オプション</div>
        <div style="padding:14px;display:flex;flex-direction:column;gap:8px">
          ${[
            { id:'title',    label:'タイトルページを含める',    icon:'fa-heading',   checked: expOpts.title },
            { id:'charlist', label:'登場人物一覧を含める',      icon:'fa-users',     checked: expOpts.charlist },
            { id:'synopsis', label:'あらすじを含める',          icon:'fa-align-left',checked: expOpts.synopsis },
            { id:'pagenum',  label:'ページ番号を付ける (HTML)', icon:'fa-list-ol',   checked: expOpts.pagenum },
          ].map(o => `
          <label class="export-opt-row">
            <input type="checkbox" ${o.checked?'checked':''} onchange="setExportOpt('${proj.id}','${o.id}',this.checked)">
            <i class="fas ${o.icon}" style="color:var(--text-muted);font-size:11px;width:14px"></i>
            <span style="font-size:13px">${o.label}</span>
          </label>`).join('')}
        </div>
      </div>

      <!-- 書き出しボタン -->
      <div class="card" style="padding:0;overflow:hidden;border-top:3px solid var(--matcha)">
        <div class="export-card-head"><i class="fas fa-download"></i> 書き出し</div>
        <div style="padding:14px;display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-primary" onclick="exportScript('${proj.id}',null)" style="justify-content:center">
            <i class="fas fa-download"></i> ${esc(proj.title)}_${esc(proj.finalVersion||'稿')} を書き出す
          </button>
          <button class="btn btn-secondary" onclick="copyScriptToClipboard('${proj.id}')" style="justify-content:center">
            <i class="fas fa-copy"></i> クリップボードにコピー
          </button>
          <div style="display:flex;gap:6px;margin-top:4px">
            <button class="btn btn-ghost btn-sm" onclick="exportScript('${proj.id}','txt')" style="flex:1;justify-content:center;font-size:11px">TXT</button>
            <button class="btn btn-ghost btn-sm" onclick="exportScript('${proj.id}','md')" style="flex:1;justify-content:center;font-size:11px">MD</button>
            <button class="btn btn-ghost btn-sm" onclick="exportScript('${proj.id}','html')" style="flex:1;justify-content:center;font-size:11px">HTML</button>
            <button class="btn btn-ghost btn-sm" onclick="exportScript('${proj.id}','script')" style="flex:1;justify-content:center;font-size:11px">脚本</button>
          </div>
          ${content.length === 0 ? `<div style="font-size:11px;color:var(--accent);background:var(--accent-bg);padding:8px 10px;border-radius:6px;border:1px solid var(--accent-border)"><i class="fas fa-exclamation-triangle" style="margin-right:4px"></i>まだ本文が書かれていません。エディタで執筆してから書き出しましょう。</div>` : ''}
        </div>
      </div>

      <!-- 作品情報 -->
      <div class="card" style="padding:0;overflow:hidden">
        <div class="export-card-head"><i class="fas fa-circle-info"></i> 作品情報</div>
        <div style="padding:14px">
          <div class="export-info-grid">
            <div class="export-info-row"><span>タイトル</span><strong>${esc(proj.title)}</strong></div>
            <div class="export-info-row"><span>ジャンル</span><span>${esc(proj.genre)}</span></div>
            <div class="export-info-row"><span>フォーマット</span><span>${esc(proj.format)}</span></div>
            <div class="export-info-row"><span>文字数</span><span style="color:var(--fuji);font-weight:600">${wc.toLocaleString()}字</span></div>
            <div class="export-info-row"><span>稿数</span><span>${drafts.length}稿</span></div>
            <div class="export-info-row"><span>登場人物</span><span>${(proj.characters||[]).length}人</span></div>
            <div class="export-info-row"><span>バージョン</span><span>${esc(proj.finalVersion||'—')}</span></div>
            <div class="export-info-row"><span>著作権</span><span style="font-size:11px">${esc(proj.copyright||'—')}</span></div>
          </div>
        </div>
      </div>

      <!-- 出力履歴 -->
      <div class="card" style="padding:0;overflow:hidden">
        <div class="export-card-head"><i class="fas fa-clock-rotate-left"></i> 出力履歴</div>
        <div style="padding:10px 14px">
          ${(proj.exportHistory||[]).length === 0
            ? `<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:10px">まだ書き出しがありません</div>`
            : (proj.exportHistory||[]).slice(0,6).map(e=>`
              <div style="display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--text-muted);padding:4px 0;border-bottom:1px solid var(--border)">
                <i class="fas fa-file-arrow-down" style="color:var(--fuji)"></i>
                <span style="font-weight:600;color:var(--text-secondary)">${esc(e.type)}</span>
                <span style="margin-left:auto">${fmtDatetime(e.at)}</span>
              </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- 右カラム：プレビュー -->
    <div class="export-right">
      <div class="card" style="padding:0;overflow:hidden;height:100%;min-height:500px">
        <div class="export-card-head" style="justify-content:space-between">
          <span><i class="fas fa-eye"></i> 出力プレビュー</span>
          <span style="font-size:11px;color:var(--text-muted)">${expOpts.format.toUpperCase()}形式</span>
        </div>
        <div id="export-preview" style="background:#fcfaf7;padding:20px 28px;height:calc(100% - 44px);overflow-y:auto;font-family:'Noto Serif JP',serif;font-size:12.5px;line-height:2.1;color:#1a1a1a;white-space:pre-wrap;border-radius:0 0 var(--radius-md) var(--radius-md)">${previewHtml}</div>
      </div>
    </div>
  </div>`;
}

// buildExportOutput: フォーマットに応じた出力テキストを生成する中核関数
function buildExportOutput(proj, content, opts) {
  const fmt = opts?.format || 'txt';
  const chars = proj.characters || [];
  const plots = proj.plots || [];

  if (fmt === 'md') {
    // Markdown形式
    let out = '';
    if (opts?.title) {
      out += `# ${proj.title}\n\n`;
      if (proj.genre || proj.format) out += `**ジャンル:** ${proj.genre || ''}　**フォーマット:** ${proj.format || ''}\n\n`;
      if (proj.logline) out += `> ${proj.logline}\n\n`;
      if (proj.copyright) out += `*${proj.copyright}*\n\n`;
      out += `---\n\n`;
    }
    if (opts?.synopsis && proj.logline) {
      out += `## あらすじ\n\n${proj.logline}\n\n---\n\n`;
    }
    if (opts?.charlist && chars.length > 0) {
      out += `## 登場人物\n\n`;
      chars.forEach(c => {
        out += `- **${c.name}**（${c.kana||''}）${c.age?`${c.age}歳`:''}${c.role?` — ${c.role}`:''}${c.tagline?`\n  *${c.tagline}*`:''}\n`;
      });
      out += `\n---\n\n`;
    }
    out += content;
    return out;
  } else if (fmt === 'script') {
    // 日本式脚本フォーマット
    let out = '';
    if (opts?.title) {
      const separator = '─'.repeat(36);
      out += `${separator}\n`;
      out += `　　　　　　${proj.title}\n`;
      out += `${separator}\n\n`;
      if (proj.genre || proj.format) out += `　　　　ジャンル：${proj.genre||''} / ${proj.format||''}\n`;
      if (proj.logline) out += `\n　　　　${proj.logline}\n`;
      if (proj.copyright) out += `\n　　　　${proj.copyright}\n`;
      out += `\n${separator}\n\n`;
    }
    if (opts?.synopsis && proj.logline) {
      out += `【あらすじ】\n　${proj.logline}\n\n${'─'.repeat(36)}\n\n`;
    }
    if (opts?.charlist && chars.length > 0) {
      out += `【登場人物】\n`;
      chars.forEach(c => {
        out += `　${c.name}（${c.kana||''}）`;
        if (c.age) out += `　${c.age}歳`;
        if (c.role) out += `　${c.role}`;
        if (c.tagline) out += `\n　　　　${c.tagline}`;
        out += '\n';
      });
      out += `\n${'─'.repeat(36)}\n\n`;
    }
    // 脚本本文：行頭のタブや全角スペースを整形
    const lines = content.split('\n');
    const formatted = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      // 柱（シーンヘッダー）判定: 全大文字・数字始まり・INT/EXT等
      if (/^(INT|EXT|ＩＮＴ|ＥＸＴ|〇|○|\d+\.)/.test(trimmed)) {
        return `\n${trimmed}\n`;
      }
      // セリフ判定: 「 で始まる行
      if (trimmed.startsWith('「') || trimmed.startsWith('『')) {
        return `　　　　${trimmed}`;
      }
      return `　${trimmed}`;
    });
    out += formatted.join('\n');
    return out;
  } else if (fmt === 'html') {
    // HTML出力用のテキスト（プレビューには使わず、buildHtmlExport で処理）
    let out = '';
    if (opts?.title) {
      out += `${proj.title}\n${proj.genre||''} / ${proj.format||''}\n`;
      if (proj.logline) out += `${proj.logline}\n`;
      out += '\n───────────────────────────────────────\n\n';
    }
    if (opts?.charlist && chars.length > 0) {
      out += `【登場人物】\n`;
      chars.forEach(c => {
        out += `  ${c.name}（${c.kana||''}）${c.age?c.age+'歳':''}　${c.role||''}　${c.tagline||''}\n`;
      });
      out += '\n───────────────────────────────────────\n\n';
    }
    out += content;
    return out;
  } else {
    // TXT（デフォルト）
    let out = '';
    if (opts?.title) {
      out += `${proj.title}\n`;
      out += `${'═'.repeat(Math.min(proj.title.length*2, 60))}\n`;
      if (proj.genre || proj.format) out += `ジャンル：${proj.genre||''} / ${proj.format||''}\n`;
      if (proj.logline) out += `ログライン：${proj.logline}\n`;
      if (proj.copyright) out += `${proj.copyright}\n`;
      out += `\n${'─'.repeat(40)}\n\n`;
    }
    if (opts?.synopsis && proj.logline) {
      out += `【あらすじ】\n${proj.logline}\n\n${'─'.repeat(40)}\n\n`;
    }
    if (opts?.charlist && chars.length > 0) {
      out += `【登場人物】\n`;
      chars.forEach(c => {
        out += `  ${c.name}（${c.kana||''}）${c.age?c.age+'歳':''}　${c.role||''}　${c.tagline||''}\n`;
      });
      out += `\n${'─'.repeat(40)}\n\n`;
    }
    out += content;
    return out;
  }
}

function setExportOpt(projId, key, value) {
  const opts = DB.get(`exp_opts_${projId}`, { title: true, charlist: false, pagenum: false, synopsis: false, format: 'txt' });
  opts[key] = value;
  DB.set(`exp_opts_${projId}`, opts);
  // プレビュー更新
  const proj = DB.getProject(projId);
  if (!proj) return;
  const draft = (proj.drafts||[]).slice(-1)[0];
  const content = draft?.content || '';
  const previewEl = document.getElementById('export-preview');
  if (previewEl) {
    const previewText = buildExportOutput(proj, content, opts);
    const previewHtml = esc(previewText.slice(0, 3000)) + (previewText.length > 3000 ? '\n\n──（以下省略）──' : '');
    previewEl.textContent = previewHtml;
    // active class for format cards
    document.querySelectorAll('.export-fmt-card').forEach(el => el.classList.remove('active'));
    const activeCard = document.querySelector(`.export-fmt-card input[value="${opts.format}"]`);
    if (activeCard) activeCard.closest('.export-fmt-card').classList.add('active');
  }
}

function exportScript(projId, format) {
  const proj = DB.getProject(projId);
  const drafts = proj?.drafts || [];
  const draft = drafts[drafts.length - 1];
  const content = draft?.content || '';

  // UIからオプションを読む（存在すれば）またはDBから取得
  const opts = DB.get(`exp_opts_${projId}`, { title: true, charlist: false, pagenum: false, synopsis: false, format: 'txt' });
  const fmt = format || opts.format || 'txt';

  // タイトルページ・登場人物リスト・あらすじのDOM checkboxがあれば反映
  const titleEl = document.getElementById('exp-title');
  const charlistEl = document.getElementById('exp-charlist');
  const synopsisEl = document.getElementById('exp-synopsis');
  if (titleEl) opts.title = titleEl.checked;
  if (charlistEl) opts.charlist = charlistEl.checked;
  if (synopsisEl) opts.synopsis = synopsisEl.checked;
  opts.format = fmt;

  const output = buildExportOutput(proj, content, opts);
  const safeTitle = proj.title.replace(/[\\/:*?"<>|]/g, '_');
  const versionLabel = proj.finalVersion || '決定稿';

  if (fmt === 'md') {
    const blob = new Blob([output], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${safeTitle}_${versionLabel}.md`;
    a.click(); URL.revokeObjectURL(url);
  } else if (fmt === 'html') {
    const htmlDoc = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(proj.title)}</title>
<style>
  body { font-family: 'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', serif; max-width: 720px; margin: 48px auto; padding: 24px 32px; line-height: 2.2; font-size: 14px; color: #1a1a1a; background: #fffdf8; }
  h1 { font-size: 22px; font-weight: 700; border-bottom: 2px solid #c8b89a; padding-bottom: 8px; margin-bottom: 12px; }
  .meta { font-size: 12px; color: #666; margin-bottom: 8px; }
  .logline { font-style: italic; color: #444; border-left: 3px solid #c8b89a; padding-left: 12px; margin: 16px 0; }
  .section { margin: 20px 0; padding-top: 12px; border-top: 1px solid #e0d8ce; }
  .section-title { font-size: 13px; font-weight: 700; color: #7a6e5e; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
  .char-item { margin-bottom: 4px; font-size: 13px; }
  .char-name { font-weight: 700; }
  pre, .script-body { white-space: pre-wrap; font-family: inherit; line-height: 2.1; }
  @media print { body { margin: 0; padding: 16px; } }
</style>
</head>
<body>
${opts.title ? `<h1>${esc(proj.title)}</h1>
<div class="meta">${esc(proj.genre||'')}${proj.format?` / ${esc(proj.format)}`:''}</div>
${proj.logline ? `<div class="logline">${esc(proj.logline)}</div>` : ''}
${proj.copyright ? `<div class="meta">${esc(proj.copyright)}</div>` : ''}` : ''}
${opts.synopsis && proj.logline ? `<div class="section"><div class="section-title">あらすじ</div><p>${esc(proj.logline)}</p></div>` : ''}
${opts.charlist && (proj.characters||[]).length > 0 ? `<div class="section"><div class="section-title">登場人物</div>
${(proj.characters||[]).map(c => `<div class="char-item"><span class="char-name">${esc(c.name)}</span>${c.kana?`（${esc(c.kana)}）`:''}${c.age?` ${esc(c.age)}歳`:''}${c.role?` — ${esc(c.role)}`:''}${c.tagline?`<br><em style="font-size:12px;color:#666">${esc(c.tagline)}</em>`:''}</div>`).join('\n')}</div>` : ''}
<div class="section"><pre class="script-body">${esc(content)}</pre></div>
${opts.pagenum ? '<script>window.onload=function(){var s=document.createElement("style");s.textContent="@page{margin:2cm} .page-num{position:fixed;bottom:0;right:0;font-size:11px;color:#999;padding:8px}";document.head.appendChild(s);}<\/script>' : ''}
</body>
</html>`;
    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${safeTitle}_${versionLabel}.html`;
    a.click(); URL.revokeObjectURL(url);
  } else if (fmt === 'script') {
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${safeTitle}_${versionLabel}_脚本形式.txt`;
    a.click(); URL.revokeObjectURL(url);
  } else {
    // txt (default)
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${safeTitle}_${versionLabel}.txt`;
    a.click(); URL.revokeObjectURL(url);
  }

  // Record history
  proj.exportHistory = proj.exportHistory || [];
  proj.exportHistory.unshift({ type: fmt.toUpperCase(), at: now() });
  proj.updatedAt = now();
  DB.saveProject(proj);
  toast(`${fmt.toUpperCase()}形式で書き出しました`, 'success');
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
//  LEARN PAGE — 学習センター
// ================================================================

// 記事データ
const ARTICLES = [
  {
    id: 'kishotenketsu',
    title: '起承転結 — 日本の四幕構成',
    subtitle: '起・承・転・結の4段階で物語を設計する日本古来の構成法',
    category: '構成理論',
    categoryColor: 'beni',
    icon: 'fa-torii-gate',
    tags: ['構成理論','日本式','4幕'],
    readTime: 8,
    desc: '中国の詩の形式に由来し、日本で独自発展した四部構成。起でシチュエーションを設定し、承でそれを発展させ、転で劇的に転換し、結で収束させる。',
  },
  {
    id: 'three-act',
    title: '三幕構成 — The Three-Act Structure',
    subtitle: 'ハリウッドで最も普及した物語設計の基盤',
    category: '構成理論',
    categoryColor: 'kon',
    icon: 'fa-diagram-project',
    tags: ['構成理論','ハリウッド','三幕'],
    readTime: 10,
    desc: '序幕・本幕・終幕の3つの幕で物語を組み立てる。それぞれ25%・50%・25%の比率が目安。ターニングポイントが幕の境界を作る。',
  },
  {
    id: 'save-the-cat',
    title: 'Save the Cat — ブレイク・スナイダーのビートシート',
    subtitle: '15のビートで映画脚本を設計するプロの方程式',
    category: '構成理論',
    categoryColor: 'matcha',
    icon: 'fa-cat',
    tags: ['構成理論','映画','15ビート'],
    readTime: 12,
    desc: 'ブレイク・スナイダーが提唱した15のビート（転換点）で構成されるシステム。オープニングイメージからファイナルイメージまで、110ページの映画脚本に対応。',
  },
  {
    id: 'story-circle',
    title: 'ストーリーサークル — ダン・ハーモンのサークル',
    subtitle: '8ステップのサイクルで「英雄の旅」を描く',
    category: '構成理論',
    categoryColor: 'fuji',
    icon: 'fa-rotate',
    tags: ['構成理論','英雄の旅','8ステップ'],
    readTime: 9,
    desc: 'リック・アンド・モーティの脚本家ダン・ハーモンが整理した8ステップの円環構造。キャラクターの変化を「欠如→追求→挑戦→変容→回帰」の循環で描く。',
  },
  {
    id: 'hero-journey',
    title: '英雄の旅 — ジョセフ・キャンベルのミスリル',
    subtitle: '神話学者が発見した普遍的な英雄物語の17段階',
    category: '神話構造',
    categoryColor: 'kogane',
    icon: 'fa-dragon',
    tags: ['神話構造','英雄','17段階'],
    readTime: 11,
    desc: '世界中の神話に共通する英雄の旅の型。「出発→試練→帰還」の大きな流れの中に17の詳細なステップがある。スターウォーズやハリーポッターなど多数に影響。',
  },
  {
    id: 'character-arc',
    title: 'キャラクターアーク — 変化と成長の設計',
    subtitle: 'ポジティブ・ネガティブ・フラットアークの三類型と設計法',
    category: 'キャラクター',
    categoryColor: 'momo',
    icon: 'fa-person-walking',
    tags: ['キャラクター','アーク','変化'],
    readTime: 9,
    desc: 'キャラクターが物語を通じてどう変化するかを設計するフレームワーク。主人公の「欠如（ウーンド）」から「変化（チェンジ）」までの心理的旅路を詳解。',
  },
  {
    id: 'subtext',
    title: 'サブテキスト — 言わない脚本術',
    subtitle: '台詞の裏に隠された意味・感情を演出するテクニック',
    category: 'セリフ技法',
    categoryColor: 'asagi',
    icon: 'fa-comment-dots',
    tags: ['セリフ','サブテキスト','演出'],
    readTime: 8,
    desc: '「本当のことは言わない」——優れた脚本の台詞はセリフの表面ではなく裏側に本音が流れる。サブテキストの概念と実践的な書き方を解説。',
  },
  {
    id: 'scene-craft',
    title: 'シーン設計の技法 — 目的・葛藤・変化',
    subtitle: '1シーンに必ず含めるべき3つの要素と設計の流れ',
    category: '場面設計',
    categoryColor: 'kogane',
    icon: 'fa-clapperboard',
    tags: ['シーン','構成','場面設計'],
    readTime: 10,
    desc: 'すべての優れたシーンには「目的・葛藤・変化」が含まれている。シーンをゼロから設計する手順と、よくある失敗パターンの回避法を解説。',
  },
  {
    id: 'dialogue-craft',
    title: 'セリフの書き方 — キャラクターの声を設計する',
    subtitle: '自然で個性的なセリフを書くための7つの原則',
    category: 'セリフ技法',
    categoryColor: 'asagi',
    icon: 'fa-comment',
    tags: ['セリフ','対話','キャラクター'],
    readTime: 9,
    desc: '「セリフはキャラクターのX線写真だ」——良いセリフは性格・欲求・関係性を同時に表現する。自然で個性的なセリフを書く具体的な技法を解説。',
  },
  {
    id: 'script-format',
    title: '脚本フォーマット完全ガイド',
    subtitle: '映画・TV・舞台脚本の書式ルールを体系的に学ぶ',
    category: '執筆技術',
    categoryColor: 'kon',
    icon: 'fa-file-alt',
    tags: ['フォーマット','書式','プロ技術'],
    readTime: 11,
    desc: 'プロの脚本家が使うフォーマットルール。シーンヘッダー・アクション・セリフ・指示の書き方から、日本独自のドラマ脚本書式まで完全解説。',
  },
  {
    id: 'tension-pacing',
    title: 'テンションとペーシング — 感情の波形を設計する',
    subtitle: '起伏のある物語を作るためのリズムとテンポの技法',
    category: '構成技法',
    categoryColor: 'beni',
    icon: 'fa-wave-square',
    tags: ['テンション','ペーシング','リズム'],
    readTime: 10,
    desc: '優れた脚本は感情の「波形」を意図的に設計している。シーンごとのテンション曲線、緊張と弛緩の交代、クライマックスへの積み上げ方を解説。',
  },
  {
    id: 'save-the-cat-chart',
    title: 'Save the Cat — ビジュアル図解・完全版',
    subtitle: '15ビートシートの構造を視覚的に把握し、物語全体を設計する',
    category: '構成理論',
    categoryColor: 'matcha',
    icon: 'fa-cat',
    tags: ['Save the Cat','ビート','図解','構造'],
    readTime: 12,
    desc: '映画脚本の15ビートシートを視覚的ダイアグラムで解説。各ビートの位置・割合・役割を一覧できる図表と、実際の脚本例での適用方法を詳しく紹介。',
  },
  {
    id: 'scenario-ten',
    title: 'シナリオ十箇条 — 日本式脚本の黄金律',
    subtitle: '展開・宿命・宝物・決意・感動・山場・終演・題目・乱調・敵役の10原則',
    category: '構成理論',
    categoryColor: 'beni',
    icon: 'fa-scroll',
    tags: ['シナリオ十箇条','日本式','構成','原則'],
    readTime: 10,
    desc: '日本の脚本術で語り継がれる10の根本原則。Situations（展開）、Destiny（宿命）、Treasure（宝物）、Turning Point（決意）、Feels（感動）、Climax（山場）、Finale（終演）、Theme（題目）、Pinch（乱調）、Antagonist（敵役）。',
  },
  {
    id: 'emotional-design',
    title: '感情設計マスターガイド — 観客の心を動かす技術',
    subtitle: '涙・笑い・恐怖・興奮を計算して生み出す感情工学',
    category: '執筆技法',
    categoryColor: 'momo',
    icon: 'fa-heart-pulse',
    tags: ['感情設計','カタルシス','共感','感情曲線'],
    readTime: 11,
    desc: '脚本が「感動的」かどうかは偶然ではなく設計による。感情の種類・タイミング・振れ幅を意図的に制御するプロの技術を解説。カタルシス理論から感情曲線設計まで。',
  },
  {
    id: 'act2-breakthrough',
    title: 'アクト2突破法 — 中盤の「沼」から抜け出す6つの戦略',
    subtitle: '三幕構成の最大の壁、アクト2をどう書き切るか',
    category: '構成理論',
    categoryColor: 'kon',
    icon: 'fa-shield-halved',
    tags: ['アクト2','三幕構成','中盤','ミッドポイント'],
    readTime: 9,
    desc: 'ほとんどの脚本家が苦しむアクト2（全体の50%を占める中幕）。失速しやすい中盤を突破するための6つの構造的戦略とミッドポイントの設計法を詳解。',
  },
  {
    id: 'professional-revision',
    title: 'プロの推敲術 — 初稿から完成稿への7段階',
    subtitle: '書き直すたびに脚本が強くなる体系的推敲プロセス',
    category: '執筆プロセス',
    categoryColor: 'asagi',
    icon: 'fa-rotate',
    tags: ['推敲','改稿','初稿','完成稿'],
    readTime: 10,
    desc: 'プロの脚本家は「初稿は捨て稿」と言う。7段階の推敲プロセス（大局→構造→シーン→セリフ→ト書き→テクニカル→最終読み）で、初稿を傑作に磨き上げる方法論。',
  },
  {
    id: 'genre-conventions',
    title: 'ジャンル別・お約束と裏切り方',
    subtitle: 'ホラー・コメディ・サスペンスなど各ジャンルの定石とその覆し方',
    category: '執筆技法',
    categoryColor: 'fuji',
    icon: 'fa-masks-theater',
    tags: ['ジャンル','ホラー','コメディ','サスペンス'],
    readTime: 10,
    desc: '各ジャンルには観客が「期待するもの」がある。その期待を満たしながら、どこかで意外性を出すことがジャンル脚本の醍醐味。ジャンル別の定石と破り方を解説。',
  },
  {
    id: 'world-building',
    title: '世界観設計の技法 — 観客を異世界に没入させる',
    subtitle: 'SF・ファンタジー・時代劇の世界観を脚本でどう表現するか',
    category: '執筆技法',
    categoryColor: 'asagi',
    icon: 'fa-globe',
    tags: ['世界観','SF','ファンタジー','設定'],
    readTime: 9,
    desc: '世界観は「説明」ではなく「体験」として提示する。設定の出し方・見せ方・観客への情報の渡し方を設計するテクニックを解説。情報過多による「設定おたく罠」の回避法も。',
  },
  {
    id: 'opening-scenes',
    title: '最初の10ページで勝負は決まる',
    subtitle: 'プロデューサーの心を掴む脚本の冒頭設計術',
    category: '執筆技法',
    categoryColor: 'beni',
    icon: 'fa-door-open',
    tags: ['冒頭','オープニング','フック','掴み'],
    readTime: 8,
    desc: '脚本の最初の10ページで読者は「続きを読むか」を決める。強力なフック、キャラクターの即時提示、世界観の確立、ジャンルのトーン設定——冒頭10ページに込めるべきすべてを解説。',
  },
  {
    id: 'theme-integration',
    title: 'テーマを「隠す」技術',
    subtitle: '説教臭くならずにテーマを物語に織り込む方法',
    category: '執筆技法',
    categoryColor: 'kogane',
    icon: 'fa-thread',
    tags: ['テーマ','サブテキスト','象徴','物語'],
    readTime: 9,
    desc: '良い脚本はテーマを語らない——テーマを見せる。「これはこういう話です」と説明することなく、キャラクターの行動・対話・イメージによってテーマを伝える技術を解説。',
  },
  {
    id: 'antagonist-design',
    title: '敵役設計の技法 — 強い敵がいる物語',
    subtitle: '観客に愛される「信念ある敵役」をどう作るか',
    category: 'キャラクター',
    categoryColor: 'momo',
    icon: 'fa-masks-theater',
    tags: ['敵役','アンタゴニスト','キャラクター','対立'],
    readTime: 10,
    desc: '「最良のビラン（悪役）は自分が正しいと信じている」。主人公と等価値の動機を持つ敵役が物語を深くする理由と、設計の具体的な方法を解説。',
  },
  {
    id: 'subplots-bstory',
    title: 'サブプロット設計 — Bストーリーの活かし方',
    subtitle: 'メインプロットを補完し、テーマを体現するサブプロットの設計法',
    category: '構成技法',
    categoryColor: 'fuji',
    icon: 'fa-code-branch',
    tags: ['サブプロット','Bストーリー','構成','テーマ'],
    readTime: 9,
    desc: 'Bストーリー（サブプロット）はメインプロットの「鏡」。恋愛・友情・家族を絡めることで、主人公の内的テーマを立体的に映し出す。Save the Catでのp.30開始の意味から実装まで。',
  },
  {
    id: 'rewriting-strategy',
    title: '改稿の戦略 — どこを直すかの判断基準',
    subtitle: '初稿から何が「優先して直すべき問題」かを見抜く技術',
    category: '執筆プロセス',
    categoryColor: 'asagi',
    icon: 'fa-arrows-rotate',
    tags: ['改稿','初稿','推敲','優先順位'],
    readTime: 8,
    desc: '改稿は「全部を直す」のではなく「何を直すかを決める」ことが9割。大局→構造→シーン→セリフの優先順位で改稿することで、同じ時間でも成果が10倍変わる。',
  },
  {
    id: 'visual-storytelling',
    title: 'ビジュアル・ストーリーテリング — 見せる脚本',
    subtitle: '映像で語るために、言葉ではなく「画」で設計する技術',
    category: '執筆技法',
    categoryColor: 'kon',
    icon: 'fa-eye',
    tags: ['映像','ビジュアル','ト書き','演出'],
    readTime: 9,
    desc: '脚本は「読む」ものではなく「見る」ものを設計する。台詞に頼らず、行動・画・象徴・音で物語を語るビジュアル・ストーリーテリングの原則と実践法。',
  },
];

// ガイドデータ
const GUIDES = [
  {
    id: 'guide-basics',
    title: '脚本執筆の基礎',
    desc: '脚本とは何か、他のライティングとの違い、必要なマインドセットを解説。',
    icon: 'fa-seedling',
    color: 'matcha',
    steps: 5,
  },
  {
    id: 'guide-format',
    title: '日本式脚本フォーマット',
    desc: '柱書き・ト書き・台詞・転換など、日本式フォーマットの正しい書き方。',
    icon: 'fa-scroll',
    color: 'kon',
    steps: 7,
  },
  {
    id: 'guide-logline',
    title: 'ログラインの書き方',
    desc: '一文で物語の全体を伝えるログラインの公式と練習方法。',
    icon: 'fa-quote-left',
    color: 'beni',
    steps: 4,
  },
  {
    id: 'guide-dialogue',
    title: 'セリフの書き方',
    desc: '生きたセリフを書くための10の原則。サブテキストとキャラクターの声。',
    icon: 'fa-comments',
    color: 'momo',
    steps: 6,
  },
  {
    id: 'guide-revision',
    title: '改稿の進め方',
    desc: '初稿から完成稿まで、プロが実践する改稿プロセスのステップバイステップ。',
    icon: 'fa-rotate',
    color: 'kogane',
    steps: 6,
  },
  {
    id: 'guide-process',
    title: '全プロセスロードマップ',
    desc: '着想から共有まで、12フェーズ全体の流れと各フェーズのゴールを解説。',
    icon: 'fa-map',
    color: 'fuji',
    steps: 12,
  },
  {
    id: 'guide-character-design',
    title: 'キャラクター設計の完全ガイド',
    desc: '主人公から脇役まで、立体的なキャラクターを設計する5ステップ。欲求・欠如・アークの設計法を解説。',
    icon: 'fa-person-walking',
    color: 'momo',
    steps: 5,
  },
  {
    id: 'guide-scene-writing',
    title: '1シーンの書き方 完全手順',
    desc: 'シーン設計から執筆・推敲まで。目的・葛藤・変化を含む完全なシーンを書くための実践ガイド。',
    icon: 'fa-clapperboard',
    color: 'kogane',
    steps: 6,
  },
  {
    id: 'guide-tension',
    title: 'テンション管理と感情設計',
    desc: '物語全体の感情の波形を設計する。テンション曲線の作り方とペーシングのコントロール法。',
    icon: 'fa-wave-square',
    color: 'beni',
    steps: 5,
  },
];

const COLOR_MAP = {
  beni: { bg: 'var(--accent-bg)', color: 'var(--accent)', border: 'var(--accent-border)' },
  kon:  { bg: 'var(--kon-bg)', color: 'var(--kon-lt)', border: 'var(--kon-border)' },
  matcha: { bg: 'var(--matcha-bg)', color: 'var(--matcha)', border: 'var(--matcha-border)' },
  kogane: { bg: 'var(--kogane-bg)', color: 'var(--kogane)', border: 'var(--kogane-border)' },
  fuji: { bg: 'var(--fuji-bg)', color: 'var(--fuji)', border: 'var(--fuji-border)' },
  momo: { bg: 'var(--momo-bg)', color: 'var(--momo)', border: 'var(--momo-border)' },
  asagi: { bg: 'var(--asagi-bg)', color: 'var(--asagi)', border: 'var(--asagi-border)' },
};

function renderLearnPage() {
  const page = State.currentPage;

  // 記事個別ページ
  if (page && page.startsWith('article-')) {
    const articleId = page.replace('article-', '');
    return renderArticlePage(articleId);
  }

  // 演習個別ページ
  if (page && page.startsWith('exercise-')) {
    const exId = page.replace('exercise-', '');
    return renderExercisePage(exId);
  }

  // タブ判定
  const activeTab = page === 'learn-articles' ? 'articles'
    : page === 'learn-exercises' ? 'exercises'
    : page === 'learn-glossary' ? 'glossary'
    : page === 'learn-roadmap' ? 'roadmap'
    : 'guide';

  const tabBadge = (count, color='var(--fuji)') =>
    count ? `<span style="font-size:9px;padding:1px 5px;background:${color};color:white;border-radius:8px;margin-left:3px">${count}</span>` : '';

  const EXERCISES = window._EXERCISES || [];

  const subnav = `
  <div class="learn-subnav">
    <div class="learn-subnav-item ${activeTab==='guide'?'active':''}" onclick="navigate('learn-guide')">
      <i class="fas fa-map"></i> ガイド
    </div>
    <div class="learn-subnav-item ${activeTab==='articles'?'active':''}" onclick="navigate('learn-articles')">
      <i class="fas fa-newspaper"></i> 記事${tabBadge(ARTICLES.length)}
    </div>
    <div class="learn-subnav-item ${activeTab==='exercises'?'active':''}" onclick="navigate('learn-exercises')">
      <i class="fas fa-pen-to-square"></i> 演習${tabBadge(EXERCISES.length, 'var(--matcha)')}
    </div>
    <div class="learn-subnav-item ${activeTab==='glossary'?'active':''}" onclick="navigate('learn-glossary')">
      <i class="fas fa-book-bookmark"></i> 用語辞典
    </div>
    <div class="learn-subnav-item ${activeTab==='roadmap'?'active':''}" onclick="navigate('learn-roadmap')">
      <i class="fas fa-road"></i> ロードマップ
    </div>
  </div>`;

  const hero = `
  <div class="learn-hero">
    <div class="learn-hero-line"></div>
    <div class="learn-hero-title">
      <i class="fas fa-book-open" style="color:var(--fuji);margin-right:9px"></i>学習センター
    </div>
    <div class="learn-hero-sub">脚本執筆に必要な理論・テクニック・プロセスを体系的に学びましょう。すべてが、より良い脚本のために。</div>
  </div>`;

  if (activeTab === 'articles') {
    // 既読・ブックマーク取得
    const readArticles = DB.get('read_articles', []);
    const bookmarkedArticles = DB.get('bookmarked_articles', []);
    const readCount = ARTICLES.filter(a => readArticles.includes(a.id)).length;
    const learnFilter = DB.get('learn_article_filter', { category: '', search: '', showBookmark: false, viewMode: 'category' });
    const viewMode = learnFilter.viewMode || 'category';

    // カテゴリ一覧（動的生成）
    const allCategories = [...new Set(ARTICLES.map(a => a.category))];

    // フィルタリング
    let filteredArticles = ARTICLES.filter(a => {
      if (learnFilter.category && a.category !== learnFilter.category) return false;
      if (learnFilter.search && !a.title.toLowerCase().includes(learnFilter.search.toLowerCase())
          && !(a.desc||'').toLowerCase().includes(learnFilter.search.toLowerCase())
          && !a.tags.some(t => t.toLowerCase().includes(learnFilter.search.toLowerCase()))) return false;
      if (learnFilter.showBookmark && !bookmarkedArticles.includes(a.id)) return false;
      return true;
    });

    // 記事カード生成
    const makeArticleCard = (a) => {
      const c = COLOR_MAP[a.categoryColor] || COLOR_MAP['beni'];
      const isRead = readArticles.includes(a.id);
      const isBm   = bookmarkedArticles.includes(a.id);
      if (viewMode === 'list') {
        return `
        <div class="card" style="padding:12px 16px;cursor:pointer;margin-bottom:6px;display:flex;align-items:center;gap:12px${isRead?';opacity:.85':''}" onclick="navigate('article-${a.id}')">
          <div style="width:38px;height:38px;border-radius:var(--radius-md);background:${c.bg};color:${c.color};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">
            <i class="fas ${a.icon}"></i>
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:2px">
              <span style="font-size:10px;padding:1px 6px;background:${c.bg};color:${c.color};border:1px solid ${c.border};border-radius:var(--radius-full);font-weight:600;flex-shrink:0">${a.category}</span>
              <span style="font-size:13px;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.title)}</span>
            </div>
            <div style="font-size:11.5px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.desc||'')}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            ${isBm ? `<i class="fas fa-bookmark" style="color:var(--kogane);font-size:13px"></i>` : ''}
            ${isRead ? `<span style="font-size:10px;padding:1px 7px;background:var(--matcha-bg);color:var(--matcha);border:1px solid var(--matcha-border);border-radius:var(--radius-full);font-weight:600"><i class="fas fa-check" style="font-size:8px"></i> 既読</span>` : ''}
            <span style="font-size:11px;color:var(--text-muted)"><i class="fas fa-clock" style="font-size:9px"></i> ${a.readTime}分</span>
            <i class="fas fa-chevron-right" style="font-size:10px;color:var(--text-muted)"></i>
          </div>
        </div>`;
      }
      return `
      <div class="article-card ${isRead?'read':''}" onclick="navigate('article-${a.id}')" style="position:relative">
        ${isRead ? `<div style="position:absolute;top:10px;right:10px;font-size:10px;padding:2px 8px;background:var(--matcha-bg);color:var(--matcha);border:1px solid var(--matcha-border);border-radius:var(--radius-full);font-weight:600"><i class="fas fa-check" style="font-size:9px;margin-right:2px"></i>既読</div>` : ''}
        ${isBm ? `<div style="position:absolute;top:10px;right:${isRead?'70':'10'}px;font-size:13px;color:var(--kogane)"><i class="fas fa-bookmark"></i></div>` : ''}
        <div class="article-card-header">
          <div class="article-card-icon" style="background:${c.bg};color:${c.color}">
            <i class="fas ${a.icon}"></i>
          </div>
          <div>
            <div style="font-size:10px;padding:2px 7px;background:${c.bg};color:${c.color};border:1px solid ${c.border};border-radius:var(--radius-full);display:inline-block;margin-bottom:3px;font-weight:600">${a.category}</div>
            <div class="article-card-title">${esc(a.title)}</div>
          </div>
        </div>
        <div class="article-card-body">
          <div class="article-card-desc">${esc(a.desc||'')}</div>
          <div class="article-card-tags">
            ${(a.tags||[]).map(t => `<span class="tag tag-gray">${t}</span>`).join('')}
          </div>
        </div>
        <div class="article-card-footer">
          <div class="article-read-time"><i class="fas fa-clock"></i> 約${a.readTime}分で読む</div>
          <span style="font-size:11px;color:var(--accent);font-weight:600">読む <i class="fas fa-arrow-right" style="font-size:9px"></i></span>
        </div>
      </div>`;
    };

    const emptyMsg = `<div style="${viewMode==='grid'?'grid-column:1/-1;':''}text-align:center;padding:40px;color:var(--text-muted)"><i class="fas fa-search" style="font-size:24px;opacity:.3;display:block;margin-bottom:10px"></i>条件に合う記事が見つかりません</div>`;

    let articlesHtml = '';
    if (filteredArticles.length === 0) {
      articlesHtml = `<div ${viewMode==='grid'?'class="article-grid"':''}>${emptyMsg}</div>`;
    } else if (viewMode === 'category') {
      // カテゴリ別グループ表示
      const byCategory = {};
      filteredArticles.forEach(a => {
        if (!byCategory[a.category]) byCategory[a.category] = [];
        byCategory[a.category].push(a);
      });
      const catColorMap = {};
      filteredArticles.forEach(a => { catColorMap[a.category] = a.categoryColor; });
      articlesHtml = Object.entries(byCategory).map(([cat, articles]) => {
        const cc = COLOR_MAP[catColorMap[cat]] || COLOR_MAP['beni'];
        const catReadCount = articles.filter(a => readArticles.includes(a.id)).length;
        return `
        <div style="margin-bottom:28px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid ${cc.color}33">
            <div style="width:26px;height:26px;border-radius:50%;background:${cc.bg};border:1px solid ${cc.border};display:flex;align-items:center;justify-content:center;font-size:12px;color:${cc.color}"><i class="fas fa-folder"></i></div>
            <span style="font-size:15px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">${cat}</span>
            <span style="font-size:11px;color:var(--text-muted)">${catReadCount}/${articles.length}本読了</span>
            <div style="flex:1;height:4px;background:var(--bg-hover);border-radius:2px;overflow:hidden;max-width:100px">
              <div style="height:100%;width:${articles.length>0?Math.round(catReadCount/articles.length*100):0}%;background:${cc.color};border-radius:2px"></div>
            </div>
          </div>
          <div class="article-grid">${articles.map(makeArticleCard).join('')}</div>
        </div>`;
      }).join('');
    } else if (viewMode === 'list') {
      articlesHtml = `<div>${filteredArticles.length === 0 ? emptyMsg : filteredArticles.map(makeArticleCard).join('')}</div>`;
    } else {
      articlesHtml = `<div class="article-grid">${filteredArticles.length === 0 ? emptyMsg : filteredArticles.map(makeArticleCard).join('')}</div>`;
    }

    // 進捗バッジ
    const progressPct = Math.round(readCount / ARTICLES.length * 100);
    const progressBadge = `
    <div class="learn-progress-bar-wrap">
      <div style="flex:1">
        <div style="font-size:12px;font-weight:600;color:var(--fuji);margin-bottom:6px;display:flex;align-items:center;gap:8px">
          <i class="fas fa-trophy" style="margin-right:2px"></i>学習進捗
          <span style="font-size:13px;color:var(--text-primary)">${readCount}<span style="font-size:11px;color:var(--text-muted)">/${ARTICLES.length}本</span></span>
          <span style="margin-left:auto;font-size:13px;font-weight:700;color:var(--fuji)">${progressPct}%</span>
        </div>
        <div style="height:8px;background:var(--bg-hover);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${progressPct}%;background:linear-gradient(90deg,var(--fuji),var(--fuji-lt));border-radius:4px;transition:width .5s ease"></div>
        </div>
      </div>
      <div style="display:flex;gap:12px;flex-shrink:0">
        ${bookmarkedArticles.length > 0 ? `
        <div style="font-size:12px;color:var(--kogane);font-weight:600;text-align:center">
          <i class="fas fa-bookmark" style="font-size:15px;display:block;margin-bottom:2px"></i>
          ${bookmarkedArticles.length}本保存
        </div>` : ''}
        ${progressPct >= 100 ? `<div style="font-size:13px;color:var(--matcha);font-weight:700">🏆 コンプリート！</div>` : ''}
      </div>
    </div>`;

    // フィルターバー
    const filterBar = `
    <div class="learn-filter-bar">
      <div style="position:relative;flex:1">
        <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:12px;pointer-events:none"></i>
        <input class="form-input" style="padding-left:30px;height:34px;font-size:12px" placeholder="タイトル・タグで検索…" value="${esc(learnFilter.search)}"
          oninput="setLearnFilter('search',this.value)">
      </div>
      <select class="form-select" style="height:34px;font-size:12px;width:auto" onchange="setLearnFilter('category',this.value)">
        <option value="">全カテゴリ</option>
        ${allCategories.map(cat=>`<option value="${cat}" ${learnFilter.category===cat?'selected':''}>${cat}</option>`).join('')}
      </select>
      <button class="btn ${learnFilter.showBookmark?'btn-primary':'btn-ghost'} btn-sm" onclick="setLearnFilter('showBookmark',${!learnFilter.showBookmark})" title="ブックマーク">
        <i class="fas fa-bookmark"></i>
      </button>
      <div style="display:flex;gap:2px;border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;flex-shrink:0">
        <button class="btn btn-sm ${viewMode==='grid'?'btn-primary':'btn-ghost'}" onclick="setLearnFilter('viewMode','grid')" title="グリッド表示" style="border-radius:0;padding:4px 8px"><i class="fas fa-grid-2"></i></button>
        <button class="btn btn-sm ${viewMode==='list'?'btn-primary':'btn-ghost'}" onclick="setLearnFilter('viewMode','list')" title="リスト表示" style="border-radius:0;padding:4px 8px"><i class="fas fa-list"></i></button>
        <button class="btn btn-sm ${viewMode==='category'?'btn-primary':'btn-ghost'}" onclick="setLearnFilter('viewMode','category')" title="カテゴリ別" style="border-radius:0;padding:4px 8px"><i class="fas fa-folder-tree"></i></button>
      </div>
      ${(learnFilter.category||learnFilter.search||learnFilter.showBookmark) ? `<button class="btn btn-ghost btn-sm" onclick="clearLearnFilter()" title="フィルタをリセット"><i class="fas fa-rotate-left"></i></button>` : ''}
    </div>`;

    return `${hero}${subnav}
    ${progressBadge}
    ${filterBar}
    <div style="margin-bottom:10px;font-size:12px;color:var(--text-muted)">
      ${filteredArticles.length === ARTICLES.length
        ? `全 ${ARTICLES.length} 本の記事`
        : `${filteredArticles.length} 本 (全 ${ARTICLES.length} 本中)`}
      <span style="margin-left:10px;color:var(--text-muted)">
        ${viewMode==='category'?'📂 カテゴリ別表示':viewMode==='list'?'📋 リスト表示':'⊞ グリッド表示'}
      </span>
    </div>
    ${articlesHtml}`;

  } else if (activeTab === 'exercises') {
    return renderLearnExercises(hero, subnav);
  } else if (activeTab === 'glossary') {
    return renderLearnGlossary(hero, subnav);
  } else if (activeTab === 'roadmap') {
    return renderLearnRoadmap(hero, subnav);
  } else {
    // ガイド一覧（進捗トラッキング付き）
    const readGuides = DB.get('read_guides', []);
    const readGuideCount = GUIDES.filter(g => readGuides.includes(`guide-${g.id}`)).length;
    const guideProgressPct = Math.round(readGuideCount / GUIDES.length * 100);

    const guideCards = GUIDES.map(g => {
      const c = COLOR_MAP[g.color] || COLOR_MAP['fuji'];
      const isRead = readGuides.includes(`guide-${g.id}`);
      const completedSteps = DB.get(`guide_steps_guide-${g.id}`, []);
      const stepPct = g.steps > 0 ? Math.round(completedSteps.length / g.steps * 100) : 0;
      return `
      <div class="guide-card" style="position:relative" onclick="navigate('article-guide-${g.id}')">
        ${isRead ? `<div style="position:absolute;top:10px;right:10px;width:22px;height:22px;border-radius:50%;background:var(--matcha);display:flex;align-items:center;justify-content:center;z-index:1"><i class="fas fa-check" style="color:white;font-size:10px"></i></div>` : ''}
        <div class="guide-card-icon" style="background:${c.bg};color:${c.color}">
          <i class="fas ${g.icon}"></i>
        </div>
        <div class="guide-card-title">${esc(g.title)}</div>
        <div class="guide-card-desc">${esc(g.desc)}</div>
        ${stepPct > 0 ? `<div style="margin-top:8px">
          <div style="height:4px;background:var(--bg-hover);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${stepPct}%;background:${c.color};border-radius:2px;transition:width .4s"></div>
          </div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${completedSteps.length}/${g.steps}ステップ完了 (${stepPct}%)</div>
        </div>` : ''}
        <div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:10.5px;color:var(--text-muted)"><i class="fas fa-list-check" style="font-size:9px;margin-right:3px"></i>${g.steps}ステップ</span>
          <span style="font-size:11px;color:${isRead?'var(--matcha)':c.color};font-weight:600">${isRead?'<i class="fas fa-redo" style="font-size:9px"></i> 読み直す':'読む <i class="fas fa-arrow-right" style="font-size:9px"></i>'}</span>
        </div>
      </div>`;
    }).join('');

    // ガイド進捗バッジ
    const guideProgress = `
    <div style="display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--bg-subtle);border-radius:var(--radius-md);border:1px solid var(--border);margin-bottom:16px">
      <div style="width:44px;height:44px;border-radius:50%;background:var(--fuji-bg);border:2px solid var(--fuji-border);display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="fas fa-map" style="color:var(--fuji);font-size:16px"></i>
      </div>
      <div style="flex:1">
        <div style="font-size:12.5px;font-weight:700;color:var(--text-primary);margin-bottom:4px">ガイド進捗: ${readGuideCount}/${GUIDES.length}冊読了 (${guideProgressPct}%)</div>
        <div style="height:7px;background:var(--bg-hover);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${guideProgressPct}%;background:${guideProgressPct>=100?'var(--matcha)':'linear-gradient(90deg,var(--fuji),var(--momo))'};border-radius:4px;transition:width .5s ease"></div>
        </div>
      </div>
      ${guideProgressPct >= 100 ? `<span style="font-size:13px">🏆</span>` : ''}
    </div>`;

    return `${hero}${subnav}
    ${guideProgress}
    <div style="margin-bottom:18px">
      <div style="font-size:15px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif;margin-bottom:4px">
        <i class="fas fa-map" style="color:var(--fuji);margin-right:7px"></i>ステップバイステップガイド
      </div>
      <div style="font-size:12px;color:var(--text-muted)">脚本執筆の各テーマを段階的に解説。初心者から上級者まで対応。${GUIDES.length}冊収録。</div>
    </div>
    <div class="guide-grid">${guideCards}</div>`;
  }
}

// ================================================================
//  演習データ
// ================================================================
window._EXERCISES = [
  {
    id: 'ex-logline-01',
    category: '企画・構成',
    difficulty: '初級',
    title: 'ログライン完成問題',
    estimatedTime: 15,
    icon: 'fa-quote-left',
    color: 'beni',
    overview: '与えられた要素から魅力的なログラインを作成します。ログラインはプロデューサーが最初に読む「物語の設計図」であり、主人公・目標・障害・テーマを凝縮した1〜2文です。',
    question: `以下の要素を使って、60字以内のログラインを完成させてください。

【素材】
・主人公: 孤独な元刑事（52歳）、かつて誤認逮捕をしてしまった過去を抱える
・障害: 10年前に自分が冤罪で服役させた男が出所し、復讐のために接触してくる
・目標: 真犯人を見つけ出し、自分の罪を償う
・テーマ: 罪と赦し

【要件】
①「欠如ある主人公が〜という目標を持つが、〜という障害に直面する」の構造
②60字以内
③テーマ（罪と赦し）が伝わること`,
    rubric: [
      { point: '主人公の欠如・属性が表現されているか', weight: 20 },
      { point: '外的目標（真犯人捜し）が明確か', weight: 20 },
      { point: '障害（復讐・冤罪）が盛り込まれているか', weight: 20 },
      { point: '60字以内に収まっているか', weight: 20 },
      { point: 'テーマ（罪と赦し）の余韻があるか', weight: 20 },
    ],
    hint: '「元刑事」「冤罪」「復讐」「真犯人」を盛り込み、主語→目標→障害の順で組み立てると整理しやすいです。',
    sampleAnswer: '冤罪を生み出した元刑事が、服役させた男の復讐に追われながら真犯人を探し、罪を償おうとする。（47字）',
    relatedArticles: ['three-act', 'kishotenketsu'],
    tags: ['ログライン', '構成', '初級'],
  },
  {
    id: 'ex-scene-01',
    category: 'シーン設計',
    difficulty: '中級',
    title: 'シーンの3要素を設計する',
    estimatedTime: 20,
    icon: 'fa-film',
    color: 'kogane',
    overview: '優れたシーンには必ず「目的・葛藤・変化」の3要素があります。この演習では既存のシーンを分析し、3要素を特定した上で、改善版を書きます。',
    question: `【分析パート】
次のシーンの「目的・葛藤・変化」を特定してください。

「田中は社長に昇進の話を持ちかけられる。しかし条件は、親友の不正を告発することだった。田中は承諾しかけたが、親友の子どもの写真を見て断った」

---

【創作パート】
上記のシーンを脚本形式で書いてください（ト書き＋セリフ、15〜25行程度）。

要件:
・目的・葛藤・変化の3要素をすべて盛り込むこと
・感情はセリフや行動で見せること（直接言わない）
・サブテキスト（言外の意味）を1か所以上使うこと`,
    rubric: [
      { point: '分析: 目的・葛藤・変化を正確に特定できているか', weight: 25 },
      { point: '脚本形式（柱書き・ト書き・セリフ）が使えているか', weight: 20 },
      { point: '感情を行動・言動で「見せて」いるか（ラベリングなし）', weight: 25 },
      { point: 'サブテキストが1か所以上使われているか', weight: 15 },
      { point: '変化がシーン前後で明確に起きているか', weight: 15 },
    ],
    hint: '分析: 目的＝田中が達成しようとすること。葛藤＝何が妨げているか。変化＝シーン前後で何が変わったか。\n創作: 写真を「見せる」シーンをどう書くかが鍵。「断った」という行動を、セリフなしでも伝えられますか？',
    sampleAnswer: `【分析】
目的: 昇進を手に入れる
葛藤: キャリアへの欲望 vs 友情・倫理の板挟み
変化: 昇進を諦め、友情を守るという価値観を確認した

【創作例】
　○内・役員室・昼

　　広い窓。スカイラインが広がる。
　　社長・高橋（58）が立っている。田中（34）は向かいに座る。

　　高橋
　　「いい機会だと思って話した。君の将来を考えてのことだよ」

　　田中の視線が、机の上の写真立てに止まる。
　　親友の妻と、幼い息子。

　　田中
　　「……ありがとうございます」

　　田中は、ゆっくりと立ち上がる。

　　田中
　　「少し、考えさせてください」

　　高橋は田中の目を見る。何かを察したように、かすかにうなずく。`,
    relatedArticles: ['scene-craft', 'subtext', 'dialogue-craft'],
    tags: ['シーン', '目的', '葛藤', '変化', '中級'],
  },
  {
    id: 'ex-subtext-01',
    category: 'セリフ技法',
    difficulty: '中級',
    title: 'サブテキストの書き換え',
    estimatedTime: 15,
    icon: 'fa-comment-dots',
    color: 'fuji',
    overview: 'サブテキスト（言外の意味）は優れたセリフの核心です。感情を直接言わず、行動・言葉の裏に「本音」を流すテクニックを練習します。',
    question: `次のセリフはサブテキストがなく、感情を直接言っています。
サブテキストを使って書き換えてください（2パターン以上）。

【元のセリフ（3人の登場人物の連続セリフ）】
由紀:「あなたのことが心配で仕方ない。もっと自分を大切にしてほしい。あなたを失いたくない」
健:「わかってる。ありがとう。でも自分でできるから大丈夫だよ」
由紀:「信じてるよ。いつでも頼ってね」

【要件】
①「心配」「大切」「失いたくない」「信じてる」「頼って」を直接使わないこと
②2つのパターンを書くこと（シーン状況を変えても可）
③それぞれパターンの「サブテキストの仕組み」を1行で説明すること`,
    rubric: [
      { point: '感情ワードを使わずに同じ感情が伝わっているか', weight: 30 },
      { point: '2パターン書かれているか', weight: 20 },
      { point: '各パターンの仕組み説明が的確か', weight: 20 },
      { point: 'セリフがキャラクターらしく自然か（声に出して読める）', weight: 15 },
      { point: '沈黙・間・行動をうまく使っているか', weight: 15 },
    ],
    hint: '「傘、持ってる？」「今夜、雨が降るって言ってたから」——こうした「具体的な気遣い行動」がサブテキストの典型です。言いたいことを「別のもの」に変換してみましょう。',
    sampleAnswer: `【パターン1: 日常の行動で示す】
由紀:「……傘、持ってる？」
健:「え？ 大丈夫だよ」
由紀:「そう。（間）……ちゃんと食べてる?」
仕組み: 「心配」という言葉なしに、具体的な確認行動で愛情を示す

【パターン2: 別れ際の沈黙で示す】
由紀:「（財布からお守りを取り出す）　これ、お母さんにもらったやつ。ずっと持ってたんだけど」
健:「……いいの?」
由紀:「邪魔だから」（目を合わせない）
仕組み: 「あなたを失いたくない」を、大切な物を手放す行動で逆説的に表現`,
    relatedArticles: ['subtext', 'dialogue-craft'],
    tags: ['セリフ', 'サブテキスト', '書き換え', '中級'],
  },
  {
    id: 'ex-arc-01',
    category: 'キャラクター',
    difficulty: '上級',
    title: 'キャラクターアーク全設計',
    estimatedTime: 30,
    icon: 'fa-person-walking',
    color: 'momo',
    overview: 'キャラクターアーク（変容の弧）は、物語を通じたキャラクターの内的変化です。「欠如→誤信念→試練→変化」の流れを設計します。',
    question: `次のキャラクター設定から、ポジティブアーク（成長・変容）を完全設計してください。

【キャラクター】
美咲（29歳・会社員）
状況: 転職先で初日からミスを連発し、プロジェクトリーダーの鈴木（45歳）に厳しく指導される。

【設計してほしい項目】
①欠如（冒頭の内的な不完全さ）
②誤った信念（Lie — 主人公が信じている誤り）
③ゴースト（その信念を生んだ過去の経験）
④Want（表面的・外的目標）
⑤Need（内面・内的に必要なもの）
⑥転換点1（Act1終わり：引き返せない選択）
⑦最低点（すべてを失う瞬間）
⑧クライマックスでの選択（変化の証明）
⑨クロージングイメージ（冒頭との対比）`,
    rubric: [
      { point: '欠如とNeedが有機的に繋がっているか', weight: 20 },
      { point: '誤信念がゴーストから自然に導かれているか', weight: 20 },
      { point: 'WantとNeedが対立しているか（外的目標が内的成長を妨げる構造）', weight: 20 },
      { point: 'クライマックスの選択が「変化の証明」になっているか（旧来の選択との対比）', weight: 20 },
      { point: 'クロージングと冒頭が対比をなしているか', weight: 20 },
    ],
    hint: '「人は信じられない（誤信念）→信じることで得るものを経験→信じる勇気（変化）」の流れ。Wantは「仕事での成功」、Needは「他者への信頼」になると構造が明確になりやすいです。',
    sampleAnswer: `①欠如: 孤立感、本音を言えない、常に一人で抱える
②誤信念: 「助けを求めると弱く見られる。頼ることは恥だ」
③ゴースト: 中学時代のグループ発表で失敗し、チーム全員に責められた経験
④Want: 新しい職場でリーダーに認められ、信頼を勝ち取りたい
⑤Need: 自分の弱さを認め、他者に頼ることで共に成長する力
⑥転換点1: 鈴木に「一人で全部やろうとするな」と言われ、チームに助けを求めるかどうかの選択を迫られる
⑦最低点: 一人で挽回しようとして重大なミスを起こし、プロジェクトを危機に陥れる
⑧クライマックスの選択: 「できません、助けてください」と初めて言える——以前なら隠して一人でやろうとした
⑨クロージング: 初日と同じオフィス。今日は早朝から来た同僚が「おはよう」と声をかける。美咲は微笑んで「おはようございます」と答える`,
    relatedArticles: ['character-arc'],
    tags: ['キャラクター', 'アーク', '上級'],
  },
  {
    id: 'ex-structure-01',
    category: '構成分析',
    difficulty: '中級',
    title: '映画のプロット構造分析',
    estimatedTime: 25,
    icon: 'fa-diagram-project',
    color: 'kon',
    overview: '実際の物語の構造を三幕構成・Save the Catのビートで分析します。知っている映画・ドラマ・小説を例にとり、構造を解剖することで理解を深めます。',
    question: `あなたが知っている映画・ドラマ・小説（アニメ・漫画も可）を1作品選び、以下の項目を分析してください。

【分析項目】
①作品タイトルとジャンル
②主人公の外的目標（Want）と内的目標（Need）
③三幕構成の各幕の区切り（どのシーンで幕が変わるか）
④Save the Cat の「触媒（p.12）」「ミッドポイント（p.55）」「すべてを失う（p.75）」に対応するシーン
⑤主人公のキャラクターアーク（冒頭→クライマックスでの変化）
⑥この作品が「うまく機能している」理由を2点

【注意】
・知っている作品で構いません
・正解はありません。あなたの分析・解釈が評価されます`,
    rubric: [
      { point: '分析が具体的なシーン・セリフに基づいているか', weight: 25 },
      { point: 'WantとNeedが対比的に設定できているか', weight: 20 },
      { point: '三幕の区切りが構造的に正しく特定されているか', weight: 20 },
      { point: 'Save the Catのビートが正確に対応付けられているか', weight: 20 },
      { point: '「うまく機能している理由」が自分の言葉で語られているか', weight: 15 },
    ],
    hint: '「千と千尋の神隠し」「君の名は。」「ドラゴン桜」「逃げるは恥だが役に立つ」など、よく知っている作品を選ぶと分析しやすいです。',
    sampleAnswer: `【例: 千と千尋の神隠し】
①タイトル: 千と千尋の神隠し　ジャンル: ファンタジー/成長物語

②Want: 豚になった両親を人間に戻したい
  Need: 自分で考え、働き、他者を信頼すること（自立と共生）

③三幕構成:
  Act1: 神の国に迷い込み、豚になった両親を見る（p.0〜25%）
  Act2: 湯屋で働きながら試練を乗り越える（p.25〜75%）
  Act3: 両親を見分けてハクと再会し、現実世界に戻る（p.75〜100%）

④Save the Cat ビート:
  触媒(p.12): 両親が豚になる瞬間
  ミッドポイント(p.55): リンに頼み、ハクを助けに行く決断
  すべてを失う(p.75): ハクが消え、一人で無限列車に乗り込む

⑤キャラクターアーク: 
  冒頭: 泣いて文句を言うだけ、自分で何もできない
  クライマックス: 「この人が両親だ」と自分の感覚を信じて答える

⑥機能している理由:
  ・「名前を奪われる」というシンプルな象徴（アイデンティティの喪失と回復）
  ・すべての試練が「思い出す・信じる・与える」という内的成長の検証になっている`,
    relatedArticles: ['three-act', 'save-the-cat', 'character-arc'],
    tags: ['構成分析', '三幕', 'Save the Cat', '中級'],
  },
  {
    id: 'ex-opening-01',
    category: '執筆技術',
    difficulty: '初級',
    title: '冒頭10ページの設計と執筆',
    estimatedTime: 30,
    icon: 'fa-door-open',
    color: 'asagi',
    overview: '脚本の最初の10ページは物語の「約束」です。主人公・世界観・トーン・テーマを確立し、観客を引き込む冒頭を設計・執筆します。',
    question: `あなたが書きたい（または書いている）脚本の「冒頭シーン」を書いてください。
まだ脚本がない場合は、以下の設定を使ってください:

【設定（使用しない場合は自分の設定で可）】
・ジャンル: 現代ドラマ
・主人公: 42歳の翻訳家（女性）、20年前に夫と別れた後一人で生きてきた
・物語の発端: ある日、翻訳を依頼された原稿が別れた夫の遺稿だったと気づく

【要件】
①400字以上・800字以内の脚本形式（柱書き・ト書き・セリフ）
②冒頭シーン（自宅や職場など）で、主人公の「日常と欠如」を見せること
③少なくとも1行のサブテキストを含むセリフを入れること
④トーン（ドラマの雰囲気）を感じさせるト書きを書くこと`,
    rubric: [
      { point: '脚本形式（柱書き・ト書き・セリフの区別）が使えているか', weight: 20 },
      { point: '主人公の「日常と欠如」が視覚的に伝わるか', weight: 25 },
      { point: 'サブテキストが含まれているか', weight: 20 },
      { point: 'ト書きがビジュアル的・具体的か（感情ラベリングなし）', weight: 20 },
      { point: '続きを読みたくなるフックがあるか', weight: 15 },
    ],
    hint: '日常シーンで「欠如」を見せるコツ: 主人公の部屋にある「あるべきもの」が「ない」描写（例: 食卓に椅子が一つしかない、家族写真が裏返し）が効果的です。',
    sampleAnswer: `　○内・美里の仕事部屋・深夜

　　壁一面の本棚。辞書が並ぶ。
　　椅子に一つのマグカップ。

　　大沢美里（42）がパソコンの前に座っている。
　　白髪が少し混じった黒髪。メガネ。

　　美里はキーボードを叩く手を止め、画面を見つめる。

　　美里
　　「……ここ、どう訳せばいいんだ」

　　彼女の指が、原稿の一節をなぞる。
　　「それでも、彼女は待っていた」

　　美里の手が止まる。

　　スマートフォンが光る。
　　着信。表示されているのは「社」の一文字だけ。

　　美里は少し間を置いてから、出る。

　　美里
　　「はい……ああ、届きました。でも、この——」
　　（間）
　　「……わかりました。明日までに」

　　通話が切れる。
　　美里はもう一度、画面の一節を見る。
　　「それでも、彼女は待っていた」。

　　カーテンの外。雨。`,
    relatedArticles: ['opening-scenes', 'visual-storytelling'],
    tags: ['冒頭', '執筆', '脚本形式', '初級'],
  },
  {
    id: 'ex-dialogue-01',
    category: 'セリフ技法',
    difficulty: '中級',
    title: 'キャラクターの「声」を設計する',
    estimatedTime: 20,
    icon: 'fa-comments',
    color: 'asagi',
    overview: '同じ情報を、まったく異なる個性を持つ2人のキャラクターがどう言うかを書き分けます。「声の個性」とは語彙・口調・省略・間の癖です。',
    question: `以下の「伝えるべき情報」を、2人のキャラクターがそれぞれ言う形で書いてください。

【伝えるべき情報】
「自分が会社を辞めることに決めた」

【キャラクターA】
・37歳・男性・元体育教師
・論理より直感で行動する
・感情的になりやすいが根は優しい
・口ぐせ: 「正直に言うと〜」「まぁ、なんというか」

【キャラクターB】
・28歳・女性・外資系コンサルタント
・常にデータと論理で話す
・感情を表に出さない
・簡潔で無駄のない言葉を好む

【要件】
①それぞれ3〜5行のセリフ（独白またはシーン内のセリフ）で書くこと
②「辞める」「退職する」などの直接的な単語を使わずに伝えること（サブテキスト）
③それぞれのキャラクターの「声の個性」が明確に異なること
④なぜその書き方にしたか、各キャラクターの「声の設計意図」を1〜2行で説明すること`,
    rubric: [
      { point: 'AとBの声が明確に異なっているか（語彙・口調・リズムの違い）', weight: 30 },
      { point: '「辞める」を直接言わずに情報が伝わっているか（サブテキスト達成）', weight: 25 },
      { point: '各キャラクターの設定（職業・性格）が言葉に反映されているか', weight: 25 },
      { point: '設計意図の説明が的確か（なぜその言い方にしたかが明確）', weight: 20 },
    ],
    hint: 'Aはためらいながらぐるぐる回り道をして伝えるかもしれません。Bは事実だけを淡々と一文で言うかもしれません。「声」とは言葉の選び方・文の長さ・言い終わり方に出ます。',
    sampleAnswer: `【キャラクターA】
「正直に言うと……あのな、来月から、俺、学校には行かなくなると思うんよ。まぁ、なんというか——自分でも驚いてるんだけど、なんかもう、ここが潮時かなって。（間）……お前には最初に言っておきたくてさ」

設計意図: 「まぁ、なんというか」「正直に言うと」の口ぐせを活かし、本題を言いかけては迂回する。感情的な決断を自分でも整理しきれていない様子を「省略」と「……」で表現。

【キャラクターB】
「先週、退職届を提出しました。3月末付けで。引き継ぎのスケジュールは既にドキュメントにまとめてあります」

設計意図: 感情なし、前置きなし、必要な情報のみを3文で完結。「退職届を提出」という行政的な表現で感情を排除。「ドキュメント」などコンサル語彙を自然に使用。`,
    relatedArticles: ['dialogue-craft', 'subtext'],
    tags: ['セリフ', '声の設計', 'キャラクター', 'サブテキスト', '中級'],
  },
  {
    id: 'ex-theme-01',
    category: 'テーマ・構造',
    difficulty: '上級',
    title: 'テーマを「隠す」設計',
    estimatedTime: 25,
    icon: 'fa-thread',
    color: 'kogane',
    overview: 'テーマを直接言わず、主人公の行動・選択・対比によって観客に「感じさせる」設計をします。上級の脚本技術——テーマの埋め込み方を実践します。',
    question: `以下のテーマと物語設定を使って、テーマを「一度も直接言わずに」表現するシーンを設計・執筆してください。

【テーマ】
「自分を許すことが、他者を許すことの第一歩になる」

【物語設定】
主人公・田村（44歳・弁護士）は、かつて弁護した依頼人を誤って有罪にしてしまったミスを抱えている。
現在、その依頼人の子ども（18歳）の事件を担当することになった。

【課題】
以下の3点をすべて含む1シーン（15〜30行程度）を書いてください。

①「テーマ」を象徴するモノ・行動を1つ設計し、シーンに組み込む（例: 写真・手紙・癖など）
②テーマを象徴するセリフを「一度も直接言わずに」書く
③シーンの冒頭と末尾で、田村の「内的状態」が変化することを行動・視線・間で示す

最後に「テーマの埋め込み設計メモ」として、①で選んだ象徴と、それがどうテーマに繋がるかを3行で説明すること。`,
    rubric: [
      { point: 'テーマを象徴するモノ・行動が明確に設計・使用されているか', weight: 25 },
      { point: 'テーマのキーワード（許す・赦し・責任等）を使わずにテーマが感じられるか', weight: 25 },
      { point: '冒頭と末尾で田村の状態変化が行動・視線・間で示されているか', weight: 25 },
      { point: '設計メモ（象徴とテーマの繋がり説明）が論理的・的確か', weight: 25 },
    ],
    hint: '「象徴」は目に見えるもの（物・場所・行動）を選ぶと効果的です。例えば「引き出しにしまった名刺」「コーヒーを飲み干す」「窓の外を見る」——こうした具体的な行動が感情の代わりをします。テーマを言わせるのではなく「示す」ことがゴールです。',
    sampleAnswer: `○内・田村法律事務所・夜

　　デスクの引き出し。田村（44）がゆっくりと開ける。
　　奥に、古い名刺が一枚。
　　「川島 健一」——かつて弁護に失敗した男の名前。

　　ドアをノックする音。
　　田村は引き出しを閉める。

　　扉が開き、川島の息子・翔（18）が入ってくる。
　　父親に似た目の形。

　　田村
　　「……座って」

　　翔は黙って座る。

　　田村はファイルを開く。目が止まる。
　　父・健一の事件番号。

　　田村
　　「君の事件、引き受けます。……全力で」
　　（間）
　　「ただ、一つだけ聞かせてほしい。お父さんのことを——恨んでいますか」

　　翔
　　「……お父さんは、俺のことを信じてくれました。最後まで」

　　田村の手が、ファイルの表紙の上で止まる。
　　ゆっくりと、開く。

---
【テーマの埋め込み設計メモ】
①象徴: 引き出しの中の名刺（田村が「閉じ込めていた」罪の象徴）
→ 冒頭に開けて末尾に「ファイルを開く」行動が対比: 閉じることから「開く」ことへの変化
テーマとの繋がり: 「名刺を仕舞う＝自分のミスを封印する」→「ファイルを開く＝向き合う選択」——これが「自分を許すことへの一歩」を行動で示す。`,
    relatedArticles: ['theme-integration', 'visual-storytelling', 'subtext'],
    tags: ['テーマ', '象徴', '上級', '脚本設計'],
  },
];
// ── 練習問題ページ ────────────────────────────────────────────
// ── 演習一覧ページ ─────────────────────────────────────────────
function renderLearnExercises(hero, subnav) {
  const exercises = window._EXERCISES || [];
  const doneExercises = DB.get('done_exercises', []);
  const exFilter = DB.get('ex_filter', { difficulty: '', category: '' });
  const allDifficulties = [...new Set(exercises.map(e => e.difficulty))];
  const allCategories = [...new Set(exercises.map(e => e.category))];

  let filtered = exercises.filter(e => {
    if (exFilter.difficulty && e.difficulty !== exFilter.difficulty) return false;
    if (exFilter.category && e.category !== exFilter.category) return false;
    return true;
  });

  const diffColor = { '初級':'var(--matcha)', '中級':'var(--kogane)', '上級':'var(--accent)' };
  const doneCount = doneExercises.filter(id => exercises.some(e => e.id === id)).length;
  const pct = Math.round(doneCount / Math.max(exercises.length, 1) * 100);

  const filterBar = `
  <div class="learn-filter-bar">
    <select class="form-select" style="height:34px;font-size:12px;width:auto" onchange="setExFilter('difficulty',this.value)">
      <option value="">全難易度</option>
      ${allDifficulties.map(d=>`<option value="${d}" ${exFilter.difficulty===d?'selected':''}>${d}</option>`).join('')}
    </select>
    <select class="form-select" style="height:34px;font-size:12px;width:auto" onchange="setExFilter('category',this.value)">
      <option value="">全カテゴリ</option>
      ${allCategories.map(c=>`<option value="${c}" ${exFilter.category===c?'selected':''}>${c}</option>`).join('')}
    </select>
    ${(exFilter.difficulty||exFilter.category) ? `<button class="btn btn-ghost btn-sm" onclick="clearExFilter()"><i class="fas fa-rotate-left"></i></button>` : ''}
  </div>`;

  const cards = filtered.map(ex => {
    const done = doneExercises.includes(ex.id);
    const c = COLOR_MAP[ex.color] || COLOR_MAP['beni'];
    const savedAnswer = DB.get(`ex_answer_${ex.id}`, '');
    const hasDraft = savedAnswer.length > 0;
    return `
    <div class="card" style="cursor:pointer;padding:0;overflow:hidden;border-top:3px solid ${c.color}" onclick="navigate('exercise-${ex.id}')">
      <div style="padding:16px 18px">
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px">
          <div style="width:44px;height:44px;border-radius:var(--radius-md);background:${c.bg};color:${c.color};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">
            <i class="fas ${ex.icon}"></i>
          </div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
              <span style="font-size:10px;padding:1px 7px;background:${diffColor[ex.difficulty]||'var(--text-muted)'}22;color:${diffColor[ex.difficulty]||'var(--text-muted)'};border:1px solid ${diffColor[ex.difficulty]||'var(--text-muted)'}44;border-radius:var(--radius-full);font-weight:700">${ex.difficulty}</span>
              <span style="font-size:10px;padding:1px 7px;background:${c.bg};color:${c.color};border:1px solid ${c.border};border-radius:var(--radius-full);font-weight:600">${ex.category}</span>
              ${done ? `<span style="font-size:10px;padding:1px 7px;background:var(--matcha-bg);color:var(--matcha);border:1px solid var(--matcha-border);border-radius:var(--radius-full);font-weight:700"><i class="fas fa-check" style="font-size:8px"></i> 提出済</span>` : hasDraft ? `<span style="font-size:10px;padding:1px 7px;background:var(--kogane-bg);color:var(--kogane);border:1px solid var(--kogane-border);border-radius:var(--radius-full);font-weight:700"><i class="fas fa-pencil" style="font-size:8px"></i> 下書き</span>` : ''}
            </div>
            <div style="font-size:14px;font-weight:700;color:var(--text-primary)">${esc(ex.title)}</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-bottom:12px">${esc(ex.overview)}</div>
        <div style="display:flex;align-items:center;gap:12px;font-size:11.5px;color:var(--text-muted)">
          <span><i class="fas fa-clock" style="font-size:10px;margin-right:3px"></i>約${ex.estimatedTime}分</span>
          <span><i class="fas fa-list-check" style="font-size:10px;margin-right:3px"></i>${ex.rubric.length}項目採点</span>
          <span style="margin-left:auto;font-size:12px;color:${c.color};font-weight:600">${done ? '再挑戦する' : hasDraft ? '続きを書く'  : '演習を始める'} <i class="fas fa-arrow-right" style="font-size:10px"></i></span>
        </div>
      </div>
    </div>`;
  }).join('');

  return `${hero}${subnav}
  <div style="padding:14px 16px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-md);margin-bottom:16px;display:flex;align-items:center;gap:16px">
    <div style="width:50px;height:50px;border-radius:50%;background:var(--matcha-bg);border:2px solid var(--matcha-border);display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <i class="fas fa-pen-to-square" style="color:var(--matcha);font-size:18px"></i>
    </div>
    <div style="flex:1">
      <div style="font-size:13.5px;font-weight:700;color:var(--text-primary);margin-bottom:5px">演習: ${doneCount}/${exercises.length}問 提出完了 (${pct}%)</div>
      <div style="height:8px;background:var(--bg-hover);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${pct>=100?'var(--matcha)':'linear-gradient(90deg,var(--matcha),var(--asagi))'};border-radius:4px;transition:width .5s ease"></div>
      </div>
    </div>
    ${pct>=100?`<span style="font-size:18px">🏆</span>`:''}
  </div>
  <div style="padding:12px 14px;background:var(--asagi-bg);border:1px solid var(--asagi-border);border-radius:var(--radius-md);margin-bottom:16px;font-size:12.5px;color:var(--text-secondary);line-height:1.7">
    <i class="fas fa-info-circle" style="color:var(--asagi);margin-right:6px"></i>
    各演習は専用ページで取り組みます。解答を書いて提出すると、採点基準に沿って<strong style="color:var(--text-primary)">自動添削</strong>を行います。ヒント・模範解答・関連記事もリンクされています。
  </div>
  ${filterBar}
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">${filtered.length}問（全${exercises.length}問）</div>
  <div style="display:grid;gap:12px">${cards || '<div style="text-align:center;padding:40px;color:var(--text-muted)">条件に合う演習が見つかりません</div>'}</div>`;
}

// ── 演習個別ページ ─────────────────────────────────────────────
function renderExercisePage(exId) {
  const exercises = window._EXERCISES || [];
  const ex = exercises.find(e => e.id === exId);
  if (!ex) return `<div class="article-page">
    <div class="article-back-btn" onclick="navigate('learn-exercises')"><i class="fas fa-arrow-left"></i> 演習一覧に戻る</div>
    <div style="text-align:center;padding:60px;color:var(--text-muted)">演習が見つかりません</div>
  </div>`;

  const c = COLOR_MAP[ex.color] || COLOR_MAP['beni'];
  const diffColor = { '初級':'var(--matcha)', '中級':'var(--kogane)', '上級':'var(--accent)' };
  const savedAnswer = DB.get(`ex_answer_${ex.id}`, '');
  const feedback = DB.get(`ex_feedback_${ex.id}`, null);
  const done = DB.get('done_exercises', []).includes(ex.id);

  const rubricHtml = ex.rubric.map((r, i) => `
  <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-subtle,var(--border))">
    <div style="width:22px;height:22px;border-radius:50%;background:${c.bg};color:${c.color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${i+1}</div>
    <div style="flex:1;font-size:12.5px;color:var(--text-secondary)">${r.point}</div>
    <div style="font-size:11px;color:var(--text-muted);flex-shrink:0">${r.weight}点</div>
  </div>`).join('');

  const relatedHtml = (ex.relatedArticles || []).map(id => {
    const a = ARTICLES.find(x => x.id === id);
    if (!a) return '';
    const ac = COLOR_MAP[a.categoryColor] || COLOR_MAP['beni'];
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:${ac.bg};border:1px solid ${ac.border};border-radius:var(--radius-md);cursor:pointer" onclick="navigate('article-${id}')">
      <i class="fas ${a.icon}" style="color:${ac.color};font-size:13px"></i>
      <span style="font-size:12.5px;color:var(--text-primary);font-weight:600">${esc(a.title)}</span>
      <i class="fas fa-arrow-right" style="font-size:10px;color:var(--text-muted);margin-left:auto"></i>
    </div>`;
  }).join('');

  const feedbackHtml = feedback ? `
  <div class="card" id="ex-feedback-panel" style="margin-top:20px;border-top:3px solid ${c.color}">
    <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:14px;font-family:'Noto Serif JP',serif">
      <i class="fas fa-robot" style="color:${c.color};margin-right:8px"></i>添削結果
    </div>
    <!-- スコアバー -->
    <div style="display:flex;align-items:center;gap:16px;padding:14px 18px;background:var(--bg-subtle);border-radius:var(--radius-md);border:1px solid var(--border);margin-bottom:16px">
      <div style="width:64px;height:64px;border-radius:50%;background:var(--bg-card);border:3px solid ${feedback.scoreColor};display:flex;align-items:center;justify-content:center;flex-direction:column;flex-shrink:0">
        <div style="font-size:22px;font-weight:800;color:${feedback.scoreColor}">${feedback.score}</div>
        <div style="font-size:9px;color:var(--text-muted)">点</div>
      </div>
      <div style="flex:1">
        <div style="font-size:16px;font-weight:700;color:${feedback.scoreColor};margin-bottom:4px">${feedback.grade}</div>
        <div style="height:8px;background:var(--bg-hover);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${feedback.score}%;background:${feedback.scoreColor};border-radius:4px;transition:width .7s ease"></div>
        </div>
      </div>
    </div>
    <!-- 項目別評価 -->
    <div style="margin-bottom:16px">
      <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)">採点基準別評価</div>
      ${feedback.rubricFeedback.map((rf, i) => `
      <div style="padding:10px 12px;background:${rf.pass?'var(--matcha-bg)':'var(--accent-bg)'};border:1px solid ${rf.pass?'var(--matcha-border)':'var(--accent-border)'};border-radius:var(--radius-md);margin-bottom:7px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <i class="fas ${rf.pass?'fa-circle-check':'fa-circle-exclamation'}" style="color:${rf.pass?'var(--matcha)':'var(--accent)'};font-size:13px"></i>
          <span style="font-size:12.5px;font-weight:700;color:var(--text-primary)">${ex.rubric[i]?.point||''}</span>
          <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">${ex.rubric[i]?.weight||0}点中${rf.earnedPoints}点</span>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.7;padding-left:20px">${rf.comment}</div>
      </div>`).join('')}
    </div>
    <!-- 総合コメント -->
    <div style="padding:14px 16px;background:var(--fuji-bg);border:1px solid var(--fuji-border);border-radius:var(--radius-md);margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:var(--fuji);margin-bottom:7px"><i class="fas fa-comment-dots"></i> 総合コメント・改善アドバイス</div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.9;white-space:pre-line">${esc(feedback.overallComment)}</div>
    </div>
    <!-- 改善点 -->
    ${feedback.improvements.length ? `
    <div style="padding:14px 16px;background:var(--kogane-bg);border:1px solid var(--kogane-border);border-radius:var(--radius-md);margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:var(--kogane);margin-bottom:8px"><i class="fas fa-lightbulb"></i> 具体的な改善提案</div>
      ${feedback.improvements.map(imp=>`<div style="display:flex;gap:8px;margin-bottom:6px;font-size:12.5px;color:var(--text-secondary)"><i class="fas fa-arrow-right" style="color:var(--kogane);font-size:11px;margin-top:3px;flex-shrink:0"></i><div>${imp}</div></div>`).join('')}
    </div>` : ''}
    <!-- 模範解答 -->
    <details style="margin-top:12px">
      <summary style="cursor:pointer;padding:10px 14px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-md);font-size:13px;font-weight:600;color:var(--text-primary);list-style:none;display:flex;align-items:center;gap:8px">
        <i class="fas fa-eye" style="color:var(--matcha)"></i> 模範解答を見る
        <i class="fas fa-chevron-down" style="margin-left:auto;font-size:10px;color:var(--text-muted)"></i>
      </summary>
      <div style="padding:14px;border:1px solid var(--border);border-top:none;border-radius:0 0 var(--radius-md) var(--radius-md);background:var(--matcha-bg)">
        <div style="font-size:12.5px;color:var(--text-secondary);white-space:pre-line;line-height:1.9">${esc(ex.sampleAnswer)}</div>
      </div>
    </details>
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="resetExercise('${ex.id}')"><i class="fas fa-rotate-left"></i> やり直す</button>
    </div>
  </div>` : '';

  return `
  <div class="article-page">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="navigate('learn-exercises')"><i class="fas fa-arrow-left"></i> 演習一覧</button>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <span style="font-size:10px;padding:2px 8px;background:${diffColor[ex.difficulty]||'#eee'}22;color:${diffColor[ex.difficulty]||'#999'};border:1px solid ${diffColor[ex.difficulty]||'#eee'}44;border-radius:var(--radius-full);font-weight:700">${ex.difficulty}</span>
        <span style="font-size:10px;padding:2px 8px;background:${c.bg};color:${c.color};border:1px solid ${c.border};border-radius:var(--radius-full);font-weight:600">${ex.category}</span>
        ${done?`<span style="font-size:10px;padding:2px 8px;background:var(--matcha-bg);color:var(--matcha);border:1px solid var(--matcha-border);border-radius:var(--radius-full);font-weight:700"><i class="fas fa-check" style="font-size:8px"></i> 提出済</span>`:''}
      </div>
    </div>

    <!-- ヘッダー -->
    <div style="background:linear-gradient(135deg,${c.bg},var(--bg-subtle));border:1px solid ${c.border};border-radius:var(--radius-lg);padding:22px 26px;margin-bottom:22px;position:relative;overflow:hidden">
      <div style="position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:70px;color:${c.color};opacity:0.07;pointer-events:none"><i class="fas ${ex.icon}"></i></div>
      <div style="width:28px;height:2.5px;background:${c.color};border-radius:2px;margin-bottom:10px"></div>
      <div style="font-size:21px;font-weight:700;font-family:'Noto Serif JP',serif;color:var(--text-primary);margin-bottom:6px">
        <i class="fas ${ex.icon}" style="color:${c.color};margin-right:8px"></i>${esc(ex.title)}
      </div>
      <div style="font-size:13px;color:var(--text-muted)">${esc(ex.overview)}</div>
      <div style="display:flex;gap:16px;margin-top:12px;font-size:12px;color:var(--text-muted)">
        <span><i class="fas fa-clock" style="margin-right:4px"></i>目安 ${ex.estimatedTime}分</span>
        <span><i class="fas fa-list-check" style="margin-right:4px"></i>${ex.rubric.length}項目採点</span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 280px;gap:18px;align-items:start">
      <!-- メインコンテンツ -->
      <div>
        <!-- 問題文 -->
        <div class="card" style="margin-bottom:16px;border-top:3px solid ${c.color}">
          <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:14px;font-family:'Noto Serif JP',serif">
            <i class="fas fa-file-lines" style="color:${c.color};margin-right:8px"></i>問題
          </div>
          <div style="font-size:13px;color:var(--text-secondary);white-space:pre-line;line-height:1.9;background:var(--bg-subtle);border-radius:var(--radius-sm);padding:16px">${esc(ex.question)}</div>
        </div>

        <!-- 解答入力 -->
        <div class="card" style="margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-size:14px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">
              <i class="fas fa-pencil" style="color:var(--matcha);margin-right:8px"></i>あなたの解答
            </div>
            <div id="ex-autosave-label" style="font-size:11px;color:var(--text-muted)"></div>
          </div>
          <textarea id="ex-answer-input" class="form-input" rows="14" placeholder="ここに解答を入力してください…&#10;&#10;問題文をよく読み、要件をすべて満たすように書きましょう。&#10;完成したら「提出して添削を受ける」ボタンを押してください。" style="font-size:13px;line-height:1.9;resize:vertical;font-family:'Noto Serif JP',serif" oninput="autoSaveExAnswer('${ex.id}',this.value)">${esc(savedAnswer)}</textarea>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;gap:8px;flex-wrap:wrap">
            <div style="font-size:11.5px;color:var(--text-muted)">
              <span id="ex-char-count">${savedAnswer.length}</span>字
              <span style="margin-left:8px;color:var(--text-muted)">目安: ${ex.estimatedTime * 40}字以上</span>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-ghost btn-sm" onclick="showExHint('${ex.id}')"><i class="fas fa-lightbulb"></i> ヒント</button>
              <button class="btn btn-ghost btn-sm" onclick="togglePreSubmitCheck()" id="ex-precheck-btn"><i class="fas fa-clipboard-check"></i> 提出前確認</button>
              <button class="btn btn-primary" onclick="submitExercise('${ex.id}')" id="ex-submit-btn">
                <i class="fas fa-paper-plane"></i> 提出して添削を受ける
              </button>
            </div>
          </div>
        </div>

        <!-- 提出前チェックリスト -->
        <div id="ex-precheck-panel" style="display:none;margin-bottom:16px;padding:16px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-md)">
          <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:12px"><i class="fas fa-clipboard-check" style="color:var(--matcha);margin-right:7px"></i>提出前セルフチェック</div>
          <div style="display:grid;gap:8px;font-size:12.5px;color:var(--text-secondary)">
            ${ex.rubric.map((r,i)=>`
            <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer">
              <input type="checkbox" id="precheck-${i}" style="margin-top:2px;accent-color:var(--matcha);flex-shrink:0">
              <span><span style="font-size:10px;font-weight:700;color:${c.color};margin-right:4px">${r.weight}点</span>${r.point}</span>
            </label>`).join('')}
          </div>
          <div id="precheck-summary" style="margin-top:12px;font-size:12px;color:var(--text-muted);padding:8px 10px;background:var(--bg-card);border-radius:var(--radius-sm);display:none"></div>
          <button class="btn btn-ghost btn-sm" style="margin-top:10px;font-size:11px" onclick="calcPrecheckScore(${JSON.stringify(ex.rubric.map(r=>r.weight))})">
            <i class="fas fa-calculator"></i> 自己採点する
          </button>
        </div>

        <!-- ヒントパネル -->
        <div id="ex-hint-panel" style="display:none;margin-bottom:16px;padding:14px 16px;background:var(--kogane-bg);border:1px solid var(--kogane-border);border-radius:var(--radius-md)">
          <div style="font-size:12px;font-weight:700;color:var(--kogane);margin-bottom:8px"><i class="fas fa-lightbulb"></i> ヒント</div>
          <div style="font-size:13px;color:var(--text-secondary);white-space:pre-line;line-height:1.8">${esc(ex.hint)}</div>
        </div>

        ${feedbackHtml}
      </div>

      <!-- サイドバー -->
      <div>
        <!-- 採点基準 -->
        <div class="card" style="margin-bottom:14px">
          <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:10px;font-family:'Noto Serif JP',serif">
            <i class="fas fa-list-check" style="color:${c.color};margin-right:7px"></i>採点基準 (100点満点)
          </div>
          ${rubricHtml}
          <div style="margin-top:8px;font-size:11px;color:var(--text-muted);text-align:right">合計: 100点</div>
        </div>

        <!-- 関連記事 -->
        ${relatedHtml ? `
        <div class="card" style="margin-bottom:14px">
          <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px">
            <i class="fas fa-book-open" style="color:var(--fuji);margin-right:6px"></i>関連記事
          </div>
          <div style="display:grid;gap:6px">${relatedHtml}</div>
        </div>` : ''}

        <!-- 前後の演習ナビ -->
        ${(() => {
          const allEx = window._EXERCISES || [];
          const idx = allEx.findIndex(e => e.id === ex.id);
          const prev = idx > 0 ? allEx[idx-1] : null;
          const next = idx < allEx.length-1 ? allEx[idx+1] : null;
          if (!prev && !next) return '';
          const makeNav = (e, label, icon) => {
            const nc = COLOR_MAP[e.color] || COLOR_MAP['beni'];
            return `<div style="padding:10px 12px;background:${nc.bg};border:1px solid ${nc.border};border-radius:var(--radius-md);cursor:pointer" onclick="navigate('exercise-${e.id}')">
              <div style="font-size:10px;color:${nc.color};font-weight:700;margin-bottom:3px"><i class="fas ${icon}" style="font-size:9px;margin-right:3px"></i>${label}</div>
              <div style="font-size:12px;font-weight:700;color:var(--text-primary)">${esc(e.title)}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${e.difficulty} · ${e.category}</div>
            </div>`;
          };
          return `<div class="card" style="margin-bottom:14px">
            <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px">
              <i class="fas fa-list-ol" style="color:var(--text-muted);margin-right:6px"></i>他の演習
            </div>
            <div style="display:grid;gap:6px">
              ${prev ? makeNav(prev, '← 前の演習', 'fa-arrow-left') : ''}
              ${next ? makeNav(next, '次の演習 →', 'fa-arrow-right') : ''}
            </div>
          </div>`;
        })()}

        <!-- タグ -->
        <div style="padding:12px 14px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-md)">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:7px">タグ</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">
            ${(ex.tags||[]).map(t=>`<span class="tag tag-gray">${t}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ── 演習 自動保存 ─────────────────────────────────────────────

function togglePreSubmitCheck() {
  const el = document.getElementById('ex-precheck-panel');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function calcPrecheckScore(weights) {
  let total = 0;
  let checked = 0;
  weights.forEach((w, i) => {
    const cb = document.getElementById(`precheck-${i}`);
    if (cb && cb.checked) { total += w; checked++; }
  });
  const maxTotal = weights.reduce((s, w) => s + w, 0);
  const pct = Math.round(total / maxTotal * 100);
  const el = document.getElementById('precheck-summary');
  if (el) {
    el.style.display = 'block';
    const grade = pct >= 80 ? '提出OK！' : pct >= 60 ? 'あと少し' : 'もう少し準備を';
    const col = pct >= 80 ? 'var(--matcha)' : pct >= 60 ? 'var(--kogane)' : 'var(--accent)';
    el.innerHTML = `<span style="color:${col};font-weight:700">${grade}</span> — 自己採点: <strong>${total}/${maxTotal}点 (${pct}%)</strong>（${checked}/${weights.length}項目チェック）<br><span style="font-size:11px;color:var(--text-muted)">${pct >= 80 ? '採点基準を十分に満たしています。自信を持って提出しましょう。' : pct >= 60 ? '未チェック項目を見直してから提出するとより高いスコアが期待できます。' : 'ヒントと採点基準をもう一度確認してから提出することをお勧めします。'}</span>`;
  }
}

let _exSaveTimer = null;
function autoSaveExAnswer(exId, val) {
  const el = document.getElementById('ex-char-count');
  if (el) el.textContent = val.length;
  const label = document.getElementById('ex-autosave-label');
  if (label) label.textContent = '保存中…';
  clearTimeout(_exSaveTimer);
  _exSaveTimer = setTimeout(() => {
    DB.set(`ex_answer_${exId}`, val);
    const lb = document.getElementById('ex-autosave-label');
    if (lb) lb.textContent = '下書き保存済み ✓';
  }, 800);
}

function showExHint(exId) {
  const el = document.getElementById('ex-hint-panel');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ── 演習 提出→自動添削 ───────────────────────────────────────
function submitExercise(exId) {
  const exercises = window._EXERCISES || [];
  const ex = exercises.find(e => e.id === exId);
  if (!ex) return;
  const answer = document.getElementById('ex-answer-input')?.value?.trim() || '';
  if (answer.length < 30) {
    toast('解答を入力してから提出してください（30字以上）', 'error');
    return;
  }

  const btn = document.getElementById('ex-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 添削中…'; }

  // 自動添削ロジック（ルーブリックベース）
  setTimeout(() => {
    const feedback = generateExerciseFeedback(ex, answer);
    DB.set(`ex_feedback_${exId}`, feedback);
    // 提出済みにマーク
    const done = DB.get('done_exercises', []);
    if (!done.includes(exId)) done.push(exId);
    DB.set('done_exercises', done);
    DB.set(`ex_answer_${exId}`, answer);
    toast('添削が完了しました！', 'success');
    render();
    setTimeout(() => {
      const panel = document.getElementById('ex-feedback-panel');
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  }, 1200);
}

function generateExerciseFeedback(ex, answer) {
  const len = answer.length;
  const minLen = ex.estimatedTime * 35;
  const ans = answer;

  // 演習IDごとの専用評価ロジック
  const customEvaluators = {
    'ex-logline-01': [
      () => {
        const hasProto = ans.includes('元刑事') || ans.includes('刑事') || ans.includes('男') || ans.includes('彼');
        const hasChar = ans.includes('欠如') || ans.includes('孤独') || ans.includes('過去') || ans.includes('罪') || ans.includes('誤') || (ans.includes('刑事') && ans.length > 20);
        const pass = hasProto && (hasChar || len >= 20);
        return { pass, earnedPoints: pass ? 20 : (hasProto ? 12 : 4),
          comment: pass ? '主人公の属性（元刑事・欠如）が表現されています。' : '主人公の「欠如」や特徴的な属性をもう少し盛り込みましょう。「孤独な元刑事」というキャラクターの本質を1語で示してください。' };
      },
      () => {
        const hasGoal = ans.includes('真犯人') || ans.includes('犯人') || ans.includes('探') || ans.includes('償') || ans.includes('目標') || ans.includes('見つ');
        const pass = hasGoal;
        return { pass, earnedPoints: pass ? 20 : 8,
          comment: pass ? '外的目標（真犯人捜し・償い）が明確に表現されています。' : '外的目標が不明確です。「真犯人を見つける」「罪を償う」という具体的な目標を盛り込みましょう。' };
      },
      () => {
        const hasObstacle = ans.includes('冤罪') || ans.includes('復讐') || ans.includes('服役') || ans.includes('追') || ans.includes('脅') || ans.includes('障害') || ans.includes('妨');
        const pass = hasObstacle;
        return { pass, earnedPoints: pass ? 20 : 8,
          comment: pass ? '障害（冤罪・復讐の男）が盛り込まれています。' : '障害が不明確です。「服役させた男の復讐」という具体的な障害を1フレーズ加えましょう。' };
      },
      () => {
        const charCount = len;
        const pass = charCount <= 65 && charCount >= 20;
        return { pass, earnedPoints: pass ? 20 : (charCount > 65 ? Math.floor(20 * 65/charCount) : (charCount >= 10 ? 10 : 2)),
          comment: pass ? `字数（${charCount}字）が要件を満たしています。簡潔に凝縮できています。` : charCount > 65 ? `${charCount}字で要件（60字以内）を超えています。不要な修飾語を削り、核心だけを残しましょう。` : `${charCount}字は短すぎます。要素が不足している可能性があります。` };
      },
      () => {
        const hasTheme = ans.includes('罪') || ans.includes('赦') || ans.includes('償') || ans.includes('許') || ans.includes('業') || ans.includes('因果');
        const pass = hasTheme;
        return { pass, earnedPoints: pass ? 20 : 5,
          comment: pass ? 'テーマ（罪と赦し）の余韻が感じられます。' : 'テーマ（罪と赦し）の要素が弱いです。「罪」「償い」「赦し」に連なる言葉を1語加えると余韻が生まれます。' };
      },
    ],
    'ex-scene-01': [
      () => {
        const hasParts = ['目的', 'Want', '目標'].some(w => ans.includes(w)) &&
                         ['葛藤', '対立', '板挟み'].some(w => ans.includes(w)) &&
                         ['変化', '変わ', '選択', '決断'].some(w => ans.includes(w));
        return { pass: hasParts, earnedPoints: hasParts ? 25 : (ans.length > 50 ? 14 : 7),
          comment: hasParts ? '分析パートで目的・葛藤・変化の3要素を正確に特定できています。' : '3要素（目的・葛藤・変化）のいずれかが不明確です。それぞれを「目的:」「葛藤:」「変化:」と明示して書くと整理しやすくなります。' };
      },
      () => {
        const hasHeader = ans.includes('内・') || ans.includes('外・') || ans.includes('○内') || ans.includes('○外');
        const hasDialogue = (ans.match(/「[^」]+」/g) || []).length >= 2;
        const pass = hasHeader && hasDialogue;
        return { pass, earnedPoints: pass ? 20 : ((hasHeader ? 8 : 0) + (hasDialogue ? 8 : 0)),
          comment: pass ? '脚本形式（柱書き・ト書き・セリフ）が適切に使われています。' : (!hasHeader ? '柱書き（○内/外・場所・時間帯）を追加しましょう。' : '') + (!hasDialogue ? 'セリフを「」でくくって2つ以上書きましょう。' : '') };
      },
      () => {
        const badEmotions = ['悲しい', '嬉しい', '怖い', 'つらい', '辛い', '心配', '動揺', 'ショック'];
        const found = badEmotions.filter(w => ans.includes(w));
        const hasAction = ans.includes('止まる') || ans.includes('見る') || ans.includes('立つ') || ans.includes('座る') || ans.includes('……') || ans.includes('（間）') || ans.includes('手が') || ans.includes('目が');
        const pass = found.length === 0 && hasAction;
        return { pass, earnedPoints: pass ? 25 : (found.length > 0 ? 8 : 14),
          comment: pass ? '感情ラベリングなく、行動・視線・間で感情を「見せて」います。' : found.length > 0 ? `「${found[0]}」など感情ラベリングがあります。その感情を「行動」に変換しましょう（例: 悲しい→手が止まる）。` : '感情を示す行動描写（視線・間・身体反応）をもう一か所加えると深みが増します。' };
      },
      () => {
        const hasSubtext = ans.includes('……') || ans.includes('（間）') || ans.includes('（沈黙）') || (ans.match(/「[^」]{0,30}」/g) || []).some(s => s.length < 25);
        const pass = hasSubtext;
        return { pass, earnedPoints: pass ? 15 : 4,
          comment: pass ? 'サブテキスト（間・短いセリフ・言いかけ）が1か所以上確認できます。' : '本音を隠したサブテキストが見当たりません。「……」や短い言いかけセリフを1か所入れましょう。' };
      },
      () => {
        const hasChange = ans.includes('変化') || ans.includes('変わ') || ans.includes('断') || ans.includes('選択') || ans.includes('決め') || (ans.includes('立') && ans.includes('上'));
        const pass = hasChange && len >= minLen * 0.4;
        return { pass, earnedPoints: pass ? 15 : (hasChange ? 10 : 5),
          comment: pass ? 'シーンの前後で明確な変化（行動・決断・態度）が起きています。' : 'シーン前後の変化がやや不明確です。田中が「何かを決める」瞬間を行動1つで示すと変化が際立ちます。' };
      },
    ],
    'ex-arc-01': [
      () => {
        const hasDeficiency = ans.includes('欠如') || ans.includes('孤立') || ans.includes('本音') || ans.includes('一人') || ans.includes('閉') || ans.includes('不完全');
        const hasNeed = ans.includes('Need') || ans.includes('ニード') || ans.includes('必要') || ans.includes('内的') || ans.includes('成長');
        const pass = hasDeficiency && hasNeed;
        return { pass, earnedPoints: pass ? 20 : ((hasDeficiency ? 8 : 0) + (hasNeed ? 8 : 0)),
          comment: pass ? '欠如とNeedが有機的に繋がっています。' : (!hasDeficiency ? '「欠如」（冒頭の内的な不完全さ）をより具体的に書きましょう。' : '') + (!hasNeed ? '「Need」（内的に必要なもの）が不明確です。内的成長の方向性を1文で示してください。' : '') };
      },
      () => {
        const hasLie = ans.includes('誤') || ans.includes('信念') || ans.includes('Lie') || ans.includes('信じている') || ans.includes('信じていること');
        const hasGhost = ans.includes('ゴースト') || ans.includes('過去') || ans.includes('経験') || ans.includes('トラウマ') || ans.includes('幼') || ans.includes('記憶');
        const pass = hasLie && hasGhost;
        return { pass, earnedPoints: pass ? 20 : ((hasLie ? 8 : 0) + (hasGhost ? 8 : 0)),
          comment: pass ? '誤信念（Lie）がゴーストから自然に導かれています。' : (!hasLie ? '誤信念（主人公が信じている「間違い」）を「〜という信念」の形で書きましょう。' : '') + (!hasGhost ? 'ゴースト（誤信念の原因となった過去経験）を具体的に書きましょう。' : '') };
      },
      () => {
        const hasWant = ans.includes('Want') || ans.includes('ウォント') || ans.includes('外的') || ans.includes('表面') || ans.includes('目標');
        const hasNeed = ans.includes('Need') || ans.includes('ニード') || ans.includes('内的') || ans.includes('内面') || ans.includes('成長');
        const pass = hasWant && hasNeed;
        return { pass, earnedPoints: pass ? 20 : ((hasWant ? 8 : 0) + (hasNeed ? 8 : 0)),
          comment: pass ? 'WantとNeedの対立構造（外的目標が内的成長を妨げる関係）が設計できています。' : (!hasWant ? 'Want（外的・表面的な目標）を具体的に設計しましょう。' : '') + (!hasNeed ? 'Need（内的に必要なもの）を設計しましょう。' : '') };
      },
      () => {
        const hasClimax = ans.includes('クライマックス') || ans.includes('選択') || ans.includes('変化') || ans.includes('証明') || ans.includes('対比');
        const pass = hasClimax && (ans.includes('選択') || ans.includes('行動') || ans.includes('決断'));
        return { pass, earnedPoints: pass ? 20 : (hasClimax ? 12 : 5),
          comment: pass ? 'クライマックスの選択が「変化の証明」として機能しています。旧来の選択との対比が見えます。' : 'クライマックスでの選択をより具体的に書きましょう。「以前の美咲ならどうしたか」という対比があるとアークが証明されます。' };
      },
      () => {
        const hasClosing = ans.includes('クロージング') || ans.includes('エンディング') || ans.includes('最後') || ans.includes('結末') || ans.includes('対比');
        const hasContrast = ans.includes('対比') || ans.includes('違い') || ans.includes('変わった') || (hasClosing && ans.includes('冒頭'));
        const pass = hasClosing && hasContrast;
        return { pass, earnedPoints: pass ? 20 : (hasClosing ? 10 : 4),
          comment: pass ? 'クロージングイメージが冒頭と対比をなしています。変化が「映像的」に示されています。' : 'クロージングイメージを書く際は「冒頭のシーンとの対比」を意識しましょう。同じ場所・同じ行動で「どう違うか」を示すと効果的です。' };
      },
    ],
  };

  const rubricFeedback = ex.rubric.map((r, i) => {
    if (customEvaluators[ex.id] && customEvaluators[ex.id][i]) {
      const result = customEvaluators[ex.id][i]();
      return { pass: result.pass, comment: result.comment, earnedPoints: Math.min(result.earnedPoints, r.weight) };
    }

    let pass = false;
    let comment = '';
    let earnedPoints = 0;
    const keywords = r.point;

    if (keywords.includes('長さ') || keywords.includes('字以内') || keywords.includes('字数')) {
      pass = len >= minLen * 0.5;
      earnedPoints = pass ? r.weight : Math.floor(r.weight * (len / Math.max(minLen, 1)));
      comment = pass
        ? `十分な文章量（${len}字）で解答されています。`
        : `解答が短すぎます（${len}字）。もう少し詳しく書きましょう。目安は${minLen}字以上です。`;
    } else if ((keywords.includes('目的') && keywords.includes('葛藤')) || keywords.includes('3要素') || keywords.includes('WantとNeed')) {
      const hasGoal = ans.includes('目的') || ans.includes('Want') || ans.includes('目標') || ans.includes('望む');
      const hasConflict = ans.includes('葛藤') || ans.includes('対立') || ans.includes('障害') || ans.includes('妨げ');
      const hasChange = ans.includes('変化') || ans.includes('変わ') || ans.includes('成長') || ans.includes('決断') || ans.includes('選択');
      const score3 = [hasGoal, hasConflict, hasChange].filter(Boolean).length;
      pass = score3 >= 2;
      earnedPoints = Math.floor(r.weight * score3 / 3);
      comment = pass
        ? `目的・葛藤・変化の${score3}要素が確認できます。`
        : `目的・葛藤・変化の3要素のうち、${score3}つしか確認できませんでした。不足している要素を意識して書き直してみましょう。`;
    } else if (keywords.includes('感情') && (keywords.includes('見せ') || keywords.includes('ラベリング'))) {
      const badWords = ['悲しい', '嬉しい', '怖い', '辛い', '怒っている', '心配', 'うれしい', '寂しい'];
      const found = badWords.filter(w => ans.includes(w));
      pass = found.length === 0;
      earnedPoints = pass ? r.weight : Math.floor(r.weight * 0.4);
      comment = pass
        ? '感情の直接表現（ラベリング）がなく、行動・言動で感情を表現できています。'
        : `「${found.slice(0,2).join('・')}」など感情を直接ラベリングしている表現があります。行動や間接的な言葉に置き換えましょう。`;
    } else if (keywords.includes('サブテキスト') || keywords.includes('言外') || keywords.includes('直接言わ')) {
      const directWords = ['辞め', '退職', 'やめ', '辞職'];
      const usedDirect = directWords.filter(w => ans.includes(w));
      const hasSubtext = ans.includes('……') || ans.includes('（間）') || ans.includes('（沈黙）') || (ans.length >= 30 && usedDirect.length === 0);
      pass = hasSubtext && usedDirect.length === 0;
      earnedPoints = pass ? r.weight : (hasSubtext ? Math.floor(r.weight * 0.6) : Math.floor(r.weight * 0.2));
      comment = pass
        ? '間・沈黙・含みのある表現が確認できます。直接的な言葉を使わずに情報が伝わっています。'
        : usedDirect.length > 0
          ? `「${usedDirect[0]}」という直接表現が使われています。回り道する表現に変えましょう。`
          : '「……」や行間に意味を持たせるサブテキストが見当たりません。本音を「別の言葉・行動」で表現する箇所を1か所以上作りましょう。';
    } else if (keywords.includes('脚本形式') || keywords.includes('柱書き') || keywords.includes('フォーマット')) {
      const hasHeader = ans.includes('内・') || ans.includes('外・') || ans.includes('○内') || ans.includes('○外');
      const hasDialogue = ans.includes('「');
      pass = hasHeader && hasDialogue;
      earnedPoints = pass ? r.weight : (hasHeader || hasDialogue ? Math.floor(r.weight * 0.5) : 0);
      comment = pass
        ? '柱書き（シーンヘッダー）とセリフの区別ができており、脚本形式を使えています。'
        : (!hasHeader ? '柱書き（「○内・場所・時間帯」形式）を追加しましょう。' : '') + (!hasDialogue ? 'セリフは「」でくくって書きましょう。' : '');
    } else if (keywords.includes('声') && keywords.includes('異な')) {
      const twoPatterns = ans.includes('パターン') || ans.includes('キャラクター') || (ans.split('\n').length >= 6);
      pass = twoPatterns && len >= minLen * 0.5;
      earnedPoints = pass ? r.weight : Math.floor(r.weight * 0.5);
      comment = pass ? '2人のキャラクターの声が明確に書き分けられています。' : '2人の声の違いがより明確になるよう、語彙・文体・文の長さに意識的な差をつけましょう。';
    } else if (keywords.includes('象徴')) {
      const hasSymbol = ans.includes('象徴') || ans.includes('モノ') || ans.includes('小道具') || ans.length > 100;
      pass = hasSymbol;
      earnedPoints = pass ? r.weight : Math.floor(r.weight * 0.4);
      comment = pass ? 'テーマを象徴するモノ・行動が設計・使用されています。' : '象徴となるモノ（写真・小道具・繰り返される行動等）を明確に設計し、シーンに組み込みましょう。';
    } else if (keywords.includes('具体的') || keywords.includes('シーン') || keywords.includes('根拠')) {
      const isSpecific = len >= minLen * 0.6 && (ans.includes('シーン') || ans.includes('場面') || ans.includes('例'));
      pass = isSpecific;
      earnedPoints = pass ? r.weight : Math.floor(r.weight * 0.5);
      comment = pass
        ? '具体的な場面・シーンへの言及があり、根拠のある分析ができています。'
        : '抽象的な説明が多いです。具体的なシーン・セリフ・場面を例として挙げると分析の説得力が増します。';
    } else if (keywords.includes('自分の言葉') || keywords.includes('語られ') || keywords.includes('解釈')) {
      pass = len >= minLen * 0.5;
      earnedPoints = pass ? r.weight : Math.floor(r.weight * 0.6);
      comment = pass ? 'あなた自身の考えが文章から伝わります。' : 'もう少し自分の言葉で理由・根拠を説明してみましょう。';
    } else {
      const kwArr = r.point.replace(/[（）・、。？！]/g,' ').split(/\s+/).filter(k => k.length >= 2);
      const matched = kwArr.filter(k => ans.includes(k)).length;
      const ratio = matched / Math.max(kwArr.length, 1);
      pass = ratio >= 0.3 && len >= minLen * 0.4;
      earnedPoints = Math.floor(r.weight * Math.min(1, ratio + (len >= minLen ? 0.3 : 0)));
      comment = pass
        ? 'この採点項目の要素が解答に含まれています。'
        : 'この採点項目への対応が不十分です。問題の要件を再確認しましょう。';
    }

    return { pass, comment, earnedPoints: Math.min(earnedPoints, r.weight) };
  });

  const totalScore = rubricFeedback.reduce((s, r) => s + r.earnedPoints, 0);
  const grade = totalScore >= 85 ? '優秀' : totalScore >= 70 ? '良好' : totalScore >= 50 ? '合格' : '要改善';
  const scoreColor = totalScore >= 85 ? 'var(--matcha)' : totalScore >= 70 ? 'var(--asagi)' : totalScore >= 50 ? 'var(--kogane)' : 'var(--accent)';

  const failedItems = rubricFeedback.filter(r => !r.pass);
  const improvements = failedItems.slice(0, 4).map((r) => {
    const idx = rubricFeedback.indexOf(r);
    const rub = ex.rubric[idx];
    if (!rub) return null;
    return `【${rub.point}】 ${r.comment}`;
  }).filter(Boolean);

  const exSpecificComments = {
    'ex-logline-01': {
      high: 'ログラインの4要素（主人公の欠如・目標・障害・テーマ）をすべて60字以内に凝縮できています。プロレベルの設計力です。',
      mid: 'ログラインの骨格はできています。字数と4要素の充足度をもう一度確認してみましょう。',
      low: 'ログラインは「主人公の欠如→目標→障害」の3点を最短で表す文です。各要素を一つずつ確認してから再挑戦してください。',
    },
    'ex-scene-01': {
      high: '分析と創作の両方で高い精度を発揮しています。シーンの「見えない感情」を行動で表現する力があります。',
      mid: '分析力はありますが、脚本形式での「感情を見せる」表現をさらに磨きましょう。',
      low: '分析から始めて、「目的・葛藤・変化」を確認してから脚本形式で書き直しましょう。',
    },
    'ex-arc-01': {
      high: 'キャラクターアークの全要素を有機的に設計できています。WantとNeedの対立が特に秀逸です。',
      mid: 'アークの骨格はできています。誤信念とゴーストの因果関係、クライマックスの対比をより明示しましょう。',
      low: 'キャラクターアーク設計は「欠如→誤信念→ゴースト→転換点→クライマックス」の順に書き出すと整理しやすいです。',
    },
    'ex-dialogue-01': {
      high: '2人のキャラクターの声を完璧に書き分けています。直接言わずに伝えるサブテキストも機能しています。',
      mid: '声の個性は出ていますが、2人の差異をさらに際立たせましょう。特に文体・文の長さ・語彙の選択に差をつけてみてください。',
      low: '「声の設計」は語彙・口調・文の長さ・言い終わり方で決まります。まずキャラクターの「声の癖」を1つ決めてから書きましょう。',
    },
    'ex-theme-01': {
      high: 'テーマを一切直接言わず、象徴と行動でテーマを「感じさせる」高度な設計ができています。',
      mid: '象徴の設計はできています。テーマのキーワードを使わずに観客に「感じさせる」最後の一工夫を加えましょう。',
      low: 'まずテーマを象徴する「モノ」を1つ決めましょう。その「モノ」の状態が変化することで、テーマを語れます。',
    },
  };

  const exCom = exSpecificComments[ex.id];
  let overallComment = '';
  if (totalScore >= 85) {
    overallComment = exCom ? exCom.high : `素晴らしい解答です！採点基準のほとんどを満たしています。この水準を維持しながら、さらに洗練させることを目指しましょう。`;
  } else if (totalScore >= 70) {
    overallComment = (exCom ? exCom.mid + '\n\n' : '') + `あと少しの改善で「優秀」に届きます。特に${failedItems.length > 0 ? `「${ex.rubric[rubricFeedback.indexOf(failedItems[0])]?.point}」` : '細部の精度'}を意識して書き直してみましょう。`;
  } else if (totalScore >= 50) {
    overallComment = (exCom ? exCom.low + '\n\n' : '') + `ヒントを参考にしながら、問題文の要件を一つ一つ確認してから再挑戦してみましょう。`;
  } else {
    overallComment = `解答の方向性を見直す必要があります。\n\n問題の要件と採点基準をもう一度丁寧に読み、ヒントと模範解答を参考にしながら再挑戦してください。一度に全部直そうとせず、採点基準の上から順番に対応することをお勧めします。`;
  }

  return { score: totalScore, grade, scoreColor, rubricFeedback, overallComment, improvements };
}
function resetExercise(exId) {
  if (!confirm('添削結果と下書きをリセットして最初からやり直しますか？')) return;
  DB.set(`ex_feedback_${exId}`, null);
  DB.set(`ex_answer_${exId}`, '');
  const done = DB.get('done_exercises', []);
  const idx = done.indexOf(exId);
  if (idx !== -1) done.splice(idx, 1);
  DB.set('done_exercises', done);
  render();
}

function setExFilter(key, val) {
  const f = DB.get('ex_filter', { difficulty:'', category:'' });
  f[key] = val;
  DB.set('ex_filter', f);
  render();
}
function clearExFilter() {
  DB.set('ex_filter', { difficulty:'', category:'' });
  render();
}

// ================================================================
//  用語辞典タブ
// ================================================================
const GLOSSARY_DATA = [
  { term: '三幕構成', reading: 'さんまくこうせい', category: '構成', color: 'kon', def: '物語を「序幕（Act1）・本幕（Act2）・終幕（Act3）」の3つの幕に分ける構造理論。ハリウッドで最も普及した脚本フレームワーク。比率は25：50：25が基本。' },
  { term: 'ログライン', reading: 'ろぐらいん', category: '企画', color: 'beni', def: '物語全体を1〜2文で表現した要約文。主人公・目標・障害・テーマを凝縮する。プロデューサーへのピッチや自分の脚本の設計図として使われる。' },
  { term: 'サブテキスト', reading: 'さぶてきすと', category: 'セリフ', color: 'asagi', def: 'セリフの表面ではなく「裏」に流れる本音・感情・意図。「本当のことは言わない」——良いセリフは言外の意味を持つ。' },
  { term: 'キャラクターアーク', reading: 'きゃらくたーあーく', category: 'キャラクター', color: 'momo', def: '主人公が物語を通じてどう変化するかを示す変容の弧。ポジティブアーク（成長）・ネガティブアーク（堕落）・フラットアーク（信念の維持）の3種類がある。' },
  { term: 'ミッドポイント', reading: 'みっどぽいんと', category: '構成', color: 'kon', def: 'Act2（本幕）の中央に位置する転換点。主人公の目標・認識・立場が変わる瞬間。「偽の勝利」か「偽の敗北」が典型的。物語のテンションを持続させる鍵。' },
  { term: 'ターニングポイント', reading: 'たーにんぐぽいんと', category: '構成', color: 'beni', def: '幕と幕の境界を作る「引き返せない選択の瞬間」。TP1（Act1→Act2）は主人公が新世界に踏み出す選択。TP2（Act2→Act3）はクライマックスへの突入。' },
  { term: 'Want / Need', reading: 'うぉんと / にーど', category: 'キャラクター', color: 'momo', def: 'Want（ウォント）: 主人公が意識的に追い求める外的・表面的な目標。Need（ニード）: 主人公が無意識に必要としている内的成長。優れた物語ではWantを追う過程でNeedを満たす。' },
  { term: 'ト書き', reading: 'とがき', category: 'フォーマット', color: 'fuji', def: '脚本における行動・情景・場面の描写部分。「映像として撮影できるもの」だけを書くのが原則。内面描写（〜と思った）は基本的に書かない。' },
  { term: 'カタルシス', reading: 'かたるしす', category: '感情設計', color: 'kogane', def: 'アリストテレスが提唱した「感情の浄化・解放」の概念。観客が主人公の体験を通じて感情を浄化し、解放感を得る瞬間。クライマックスで生まれる感情的解放がカタルシス。' },
  { term: 'フックライン', reading: 'ふっくらいん', category: '企画', color: 'beni', def: '読者・観客を引き込む「掴み」の一言。ログラインの中でも特に刺激的・新奇な要素。映画の予告編で使われるキャッチコピーとも近い。' },
  { term: 'ウーンド（傷）', reading: 'うーんど', category: 'キャラクター', color: 'momo', def: '主人公が過去に受けた心理的・感情的な傷。現在の行動・誤信念の根源となる。ウーンドがあることでキャラクターに深みと動機が生まれる。' },
  { term: 'Save the Cat', reading: 'せいぶ ざ きゃっと', category: '構成', color: 'matcha', def: 'ブレイク・スナイダーが提唱した15ビートシートを中心とした脚本術。タイトルは「主人公が猫を助けるシーン」で観客の共感を即座に得るテクニックから。' },
  { term: 'オン・ザ・ノーズ', reading: 'おん ざ のーず', category: 'セリフ', color: 'asagi', def: 'セリフが「言いたいことをそのまま言っている」状態。「テーマを直接言う」「感情をラベリングする」などがこれに当たる。脚本術では避けるべきとされる代表的なNG。' },
  { term: 'Bストーリー', reading: 'びーすとーりー', category: '構成', color: 'kon', def: 'メイン（Aストーリー）を補完するサブプロット。多くの場合、テーマを体現する関係性（恋愛・友情など）。Save the Catではp.30から始まる。' },
  { term: '柱書き', reading: 'はしらがき', category: 'フォーマット', color: 'fuji', def: '日本式脚本のシーンヘッダー。「○内/外・場所・時間帯」の形式で書く。例：「○内・警察署・取調室・夜」。シーンの切り替えを表す。' },
  { term: 'プレミス', reading: 'ぷれみす', category: '構成', color: 'beni', def: '物語の命題・テーマを「〜すれば〜になる」と格言形式で表したもの。例：「復讐を求めすぎると自分が怪物になる」。脚本家の内なる羅針盤となる。' },
  { term: 'クライマックス', reading: 'くらいまっくす', category: '構成', color: 'kon', def: '物語の最大の対決・緊張の頂点。主人公が変化したことを行動で「証明」する場面。Save the Catではp.85〜p.99に位置する。' },
  { term: '起承転結', reading: 'きしょうてんけつ', category: '構成', color: 'beni', def: '中国の詩から日本に伝わった四部構成。起（設定）・承（展開）・転（転換）・結（収束）。三幕構成との最大の違いは「転」の役割：必然性と驚きを両立する逆転。' },
  { term: 'テンション', reading: 'てんしょん', category: '感情設計', color: 'kogane', def: '物語の「縦」の軸：シーンの感情的緊張度。高いほど観客は前のめりになる。テンションとペーシング（速度）を組み合わせて感情の波形を設計する。' },
  { term: 'ポモドーロ', reading: 'ぽもどーろ', category: '執筆技術', color: 'matcha', def: 'フランチェスコ・シリロが開発した時間管理術。25分の集中作業＋5分の休憩を1セットとする。シナリオラボの執筆タイマーがこの技法を実装。' },
];

function renderLearnGlossary(hero, subnav) {
  const gFilter = DB.get('glossary_filter', { category: '', search: '' });
  const allCats = [...new Set(GLOSSARY_DATA.map(g => g.category))];
  const filtered = GLOSSARY_DATA.filter(g => {
    if (gFilter.category && g.category !== gFilter.category) return false;
    if (gFilter.search) {
      const q = gFilter.search.toLowerCase();
      if (!g.term.toLowerCase().includes(q) && !g.def.toLowerCase().includes(q) && !g.reading.includes(q)) return false;
    }
    return true;
  });

  // あいうえお順にグループ化
  const readings = ['あ','い','う','え','お','か','き','く','け','こ','さ','し','す','せ','そ','た','ち','つ','て','と','な','に','ぬ','ね','の','は','ひ','ふ','へ','ほ','ま','み','む','め','も','や','ゆ','よ','ら','り','る','れ','ろ','わ'];
  const groups = {};
  filtered.forEach(g => {
    const r0 = g.reading[0];
    const group = readings.find(r => r0 <= r && r0 <= r) || r0;
    // 簡単なグループ化（最初の文字で区切る）
    const row = r0 <= 'お' ? 'あ行' : r0 <= 'こ' ? 'か行' : r0 <= 'そ' ? 'さ行' : r0 <= 'と' ? 'た行' : r0 <= 'の' ? 'な行' : r0 <= 'ほ' ? 'は行' : r0 <= 'も' ? 'ま行' : r0 <= 'よ' ? 'や行' : r0 <= 'ろ' ? 'ら行' : 'わ行';
    if (!groups[row]) groups[row] = [];
    groups[row].push(g);
  });

  const itemsHtml = Object.entries(groups).map(([row, terms]) => `
  <div style="margin-bottom:24px">
    <div style="font-size:14px;font-weight:700;color:var(--fuji);margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid var(--fuji)">${row}</div>
    <div style="display:grid;gap:8px">
      ${terms.map(g => {
        const c = COLOR_MAP[g.color] || COLOR_MAP['beni'];
        return `
        <div style="padding:12px 14px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-md);border-left:3px solid ${c.color}">
          <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:5px">
            <span style="font-size:15px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">${esc(g.term)}</span>
            <span style="font-size:11px;color:var(--text-muted)">${esc(g.reading)}</span>
            <span style="font-size:10px;padding:1px 7px;background:${c.bg};color:${c.color};border:1px solid ${c.border};border-radius:var(--radius-full);font-weight:600;margin-left:auto">${g.category}</span>
          </div>
          <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.8">${esc(g.def)}</div>
        </div>`;
      }).join('')}
    </div>
  </div>`).join('');

  const filterBar = `
  <div class="learn-filter-bar">
    <div style="position:relative;flex:1">
      <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:12px;pointer-events:none"></i>
      <input class="form-input" style="padding-left:30px;height:34px;font-size:12px" placeholder="用語を検索…" value="${esc(gFilter.search)}" oninput="setGlossaryFilter('search',this.value)">
    </div>
    <select class="form-select" style="height:34px;font-size:12px;width:auto" onchange="setGlossaryFilter('category',this.value)">
      <option value="">全カテゴリ</option>
      ${allCats.map(c=>`<option value="${c}" ${gFilter.category===c?'selected':''}>${c}</option>`).join('')}
    </select>
    ${(gFilter.category||gFilter.search)?`<button class="btn btn-ghost btn-sm" onclick="clearGlossaryFilter()"><i class="fas fa-rotate-left"></i></button>`:''}
  </div>`;

  return `${hero}${subnav}
  <div style="padding:14px 16px;background:var(--fuji-bg);border:1px solid var(--fuji-border);border-radius:var(--radius-md);margin-bottom:18px;display:flex;align-items:center;gap:12px">
    <i class="fas fa-book-bookmark" style="color:var(--fuji);font-size:22px;flex-shrink:0"></i>
    <div>
      <div style="font-size:13.5px;font-weight:700;color:var(--text-primary);margin-bottom:2px">脚本用語辞典</div>
      <div style="font-size:12px;color:var(--text-muted)">脚本執筆で頻出する専門用語・理論用語を${GLOSSARY_DATA.length}語収録。読み方・カテゴリ・解説付き。</div>
    </div>
  </div>
  ${filterBar}
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px">${filtered.length}語（全${GLOSSARY_DATA.length}語）</div>
  ${itemsHtml || '<div style="text-align:center;padding:40px;color:var(--text-muted)">検索条件に一致する用語がありません</div>'}`;
}

function setGlossaryFilter(key, val) {
  const f = DB.get('glossary_filter', { category:'', search:'' });
  f[key] = val;
  DB.set('glossary_filter', f);
  render();
}
function clearGlossaryFilter() {
  DB.set('glossary_filter', { category:'', search:'' });
  render();
}

// ================================================================
//  学習ロードマップタブ
// ================================================================
function renderLearnRoadmap(hero, subnav) {
  const completedRm = DB.get('roadmap_completed', []);

  const phases = [
    {
      id: 'phase-1',
      phase: 'Phase 1',
      title: '脚本の基礎を知る',
      color: 'matcha',
      duration: '1〜2週間',
      icon: 'fa-seedling',
      desc: '脚本とは何か、なぜ構成が大切かを理解する段階。まず「全体像」を掴みます。',
      steps: [
        { id: 'rm-1-1', type: 'guide', label: 'ガイドを読む', title: '脚本執筆の基礎', link: 'article-guide-guide-basics', icon: 'fa-map' },
        { id: 'rm-1-2', type: 'article', label: '記事を読む', title: '三幕構成 — ハリウッドの基盤', link: 'article-three-act', icon: 'fa-newspaper' },
        { id: 'rm-1-3', type: 'article', label: '記事を読む', title: '起承転結 — 日本の四幕構成', link: 'article-kishotenketsu', icon: 'fa-newspaper' },
        { id: 'rm-1-4', type: 'tool', label: 'ツールで試す', title: 'ログラインメーカーで物語を一文にまとめる', link: 'tool-logline', icon: 'fa-wrench' },
        { id: 'rm-1-5', type: 'exercise', label: '演習に挑む', title: 'ログライン完成問題（初級）', link: 'exercise-ex-logline-01', icon: 'fa-pen-to-square' },
      ],
    },
    {
      id: 'phase-2',
      phase: 'Phase 2',
      title: '構成の設計を深める',
      color: 'kon',
      duration: '2〜3週間',
      icon: 'fa-diagram-project',
      desc: '物語の骨格を設計する理論を学び、実際の作品を分析する力をつけます。',
      steps: [
        { id: 'rm-2-1', type: 'article', label: '記事を読む', title: 'Save the Cat — 15ビートシート', link: 'article-save-the-cat', icon: 'fa-newspaper' },
        { id: 'rm-2-2', type: 'article', label: '記事を読む', title: 'テンションとペーシング', link: 'article-tension-pacing', icon: 'fa-newspaper' },
        { id: 'rm-2-3', type: 'article', label: '記事を読む', title: 'アクト2突破法', link: 'article-act2-breakthrough', icon: 'fa-newspaper' },
        { id: 'rm-2-4', type: 'tool', label: 'ツールで試す', title: 'ビートカウンターで自分の脚本を検証', link: 'tool-beat-counter', icon: 'fa-wrench' },
        { id: 'rm-2-5', type: 'tool', label: 'ツールで試す', title: '構成チェッカーで物語を4フレームで診断', link: 'tool-structure', icon: 'fa-wrench' },
        { id: 'rm-2-6', type: 'exercise', label: '演習に挑む', title: '映画のプロット構造分析（中級）', link: 'exercise-ex-structure-01', icon: 'fa-pen-to-square' },
      ],
    },
    {
      id: 'phase-3',
      phase: 'Phase 3',
      title: 'キャラクターを設計する',
      color: 'momo',
      duration: '2〜3週間',
      icon: 'fa-users',
      desc: '主人公・敵役・サブキャラクターの動機・アーク・関係性を設計する力をつけます。',
      steps: [
        { id: 'rm-3-1', type: 'article', label: '記事を読む', title: 'キャラクターアーク — 変化と成長の設計', link: 'article-character-arc', icon: 'fa-newspaper' },
        { id: 'rm-3-2', type: 'article', label: '記事を読む', title: '敵役設計の技法', link: 'article-antagonist-design', icon: 'fa-newspaper' },
        { id: 'rm-3-3', type: 'tool', label: 'ツールで試す', title: 'キャラクター診断シートで主人公を設計', link: 'tool-char-diag', icon: 'fa-wrench' },
        { id: 'rm-3-4', type: 'tool', label: 'ツールで試す', title: '感情アーク設計でキャラクターの変化を可視化', link: 'tool-emotion-arc', icon: 'fa-wrench' },
        { id: 'rm-3-5', type: 'exercise', label: '演習に挑む', title: 'キャラクターアーク全設計（上級）', link: 'exercise-ex-arc-01', icon: 'fa-pen-to-square' },
      ],
    },
    {
      id: 'phase-4',
      phase: 'Phase 4',
      title: 'シーンとセリフを磨く',
      color: 'asagi',
      duration: '2〜3週間',
      icon: 'fa-film',
      desc: '1シーンの設計・サブテキスト・ビジュアル表現など、実際の脚本執筆技術を習得します。',
      steps: [
        { id: 'rm-4-1', type: 'article', label: '記事を読む', title: 'シーン設計の技法 — 目的・葛藤・変化', link: 'article-scene-craft', icon: 'fa-newspaper' },
        { id: 'rm-4-2', type: 'article', label: '記事を読む', title: 'サブテキスト — 言わない脚本術', link: 'article-subtext', icon: 'fa-newspaper' },
        { id: 'rm-4-3', type: 'article', label: '記事を読む', title: 'ビジュアル・ストーリーテリング', link: 'article-visual-storytelling', icon: 'fa-newspaper' },
        { id: 'rm-4-4', type: 'tool', label: 'ツールで試す', title: 'シーン構造チェッカーで1シーンを診断', link: 'tool-scene', icon: 'fa-wrench' },
        { id: 'rm-4-5', type: 'tool', label: 'ツールで試す', title: 'セリフ磨き診断でセリフのクオリティを採点', link: 'tool-dialogue-check', icon: 'fa-wrench' },
        { id: 'rm-4-6', type: 'exercise', label: '演習に挑む', title: 'シーンの3要素を設計する（中級）', link: 'exercise-ex-scene-01', icon: 'fa-pen-to-square' },
        { id: 'rm-4-7', type: 'exercise', label: '演習に挑む', title: 'サブテキストの書き換え（中級）', link: 'exercise-ex-subtext-01', icon: 'fa-pen-to-square' },
      ],
    },
    {
      id: 'phase-5',
      phase: 'Phase 5',
      title: '初稿を書いて推敲する',
      color: 'kogane',
      duration: '継続的',
      icon: 'fa-rotate',
      desc: '脚本の初稿執筆から改稿・推敲まで、実践的な執筆プロセス全体を体験します。',
      steps: [
        { id: 'rm-5-1', type: 'guide', label: 'ガイドを読む', title: '全プロセスロードマップ（12フェーズ）', link: 'article-guide-guide-process', icon: 'fa-map' },
        { id: 'rm-5-2', type: 'article', label: '記事を読む', title: '最初の10ページで勝負は決まる', link: 'article-opening-scenes', icon: 'fa-newspaper' },
        { id: 'rm-5-3', type: 'article', label: '記事を読む', title: 'プロの推敲術 — 7段階', link: 'article-professional-revision', icon: 'fa-newspaper' },
        { id: 'rm-5-4', type: 'article', label: '記事を読む', title: '改稿の戦略 — どこを直すかの判断基準', link: 'article-rewriting-strategy', icon: 'fa-newspaper' },
        { id: 'rm-5-5', type: 'tool', label: 'ツールで試す', title: 'プロット穴探しで物語の矛盾を検出', link: 'tool-plot-holes', icon: 'fa-wrench' },
        { id: 'rm-5-6', type: 'tool', label: 'ツールで試す', title: '執筆タイマーで集中執筆セッションを開始', link: 'tool-timer', icon: 'fa-wrench' },
        { id: 'rm-5-7', type: 'exercise', label: '演習に挑む', title: '冒頭10ページの設計と執筆（初級）', link: 'exercise-ex-opening-01', icon: 'fa-pen-to-square' },
      ],
    },
  ];

  const typeColor = { guide:'var(--fuji)', article:'var(--accent)', tool:'var(--kogane)', exercise:'var(--matcha)' };
  const typeLabel = { guide:'ガイド', article:'記事', tool:'ツール', exercise:'演習' };

  const totalSteps = phases.reduce((s, p) => s + p.steps.length, 0);
  const doneSteps = completedRm.length;
  const overallPct = Math.round(doneSteps / Math.max(totalSteps, 1) * 100);

  const phasesHtml = phases.map(p => {
    const c = COLOR_MAP[p.color] || COLOR_MAP['matcha'];
    const phaseDoneCount = p.steps.filter(s => completedRm.includes(s.id)).length;
    const phasePct = Math.round(phaseDoneCount / p.steps.length * 100);

    const stepsHtml = p.steps.map(s => {
      const done = completedRm.includes(s.id);
      const tc = typeColor[s.type];
      return `
      <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:${done?'var(--matcha-bg)':'var(--bg-card)'};border:1px solid ${done?'var(--matcha-border)':'var(--border)'};border-radius:var(--radius-md);cursor:pointer;transition:all .2s" onclick="navigate('${s.link}')">
        <input type="checkbox" ${done?'checked':''} onclick="event.stopPropagation();toggleRoadmapStep('${s.id}')" style="width:15px;height:15px;accent-color:var(--matcha);flex-shrink:0">
        <div style="width:22px;height:22px;border-radius:50%;background:${tc}22;color:${tc};display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0">
          <i class="fas ${s.icon}"></i>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:10px;color:${tc};font-weight:700;margin-bottom:1px">${typeLabel[s.type]}</div>
          <div style="font-size:12.5px;color:${done?'var(--text-muted)':'var(--text-primary)'};font-weight:${done?'400':'600'};text-decoration:${done?'line-through':''};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.title)}</div>
        </div>
        <i class="fas fa-arrow-right" style="font-size:10px;color:var(--text-muted);flex-shrink:0"></i>
      </div>`;
    }).join('');

    return `
    <div style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <div style="width:42px;height:42px;border-radius:50%;background:${c.bg};border:2px solid ${c.color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="fas ${p.icon}" style="color:${c.color};font-size:16px"></i>
        </div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;flex-wrap:wrap">
            <span style="font-size:11px;color:${c.color};font-weight:700">${p.phase}</span>
            <span style="font-size:15px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">${esc(p.title)}</span>
            <span style="font-size:11px;color:var(--text-muted)">${p.duration}</span>
          </div>
          <div style="height:5px;background:var(--bg-hover);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${phasePct}%;background:${phasePct>=100?'var(--matcha)':c.color};border-radius:3px;transition:width .5s ease"></div>
          </div>
          <div style="font-size:10.5px;color:var(--text-muted);margin-top:2px">${phaseDoneCount}/${p.steps.length}完了 (${phasePct}%)</div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px;padding-left:54px">${esc(p.desc)}</div>
      <div style="display:grid;gap:6px;padding-left:54px">${stepsHtml}</div>
    </div>`;
  }).join('');

  return `${hero}${subnav}
  <div style="padding:16px 18px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-md);margin-bottom:20px;display:flex;align-items:center;gap:16px">
    <div style="width:54px;height:54px;border-radius:50%;background:var(--kogane-bg);border:2px solid var(--kogane-border);display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <i class="fas fa-road" style="color:var(--kogane);font-size:20px"></i>
    </div>
    <div style="flex:1">
      <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:5px">学習進捗: ${doneSteps}/${totalSteps}ステップ完了 (${overallPct}%)</div>
      <div style="height:10px;background:var(--bg-hover);border-radius:5px;overflow:hidden">
        <div style="height:100%;width:${overallPct}%;background:${overallPct>=100?'var(--matcha)':'linear-gradient(90deg,var(--matcha),var(--kogane),var(--accent))'};border-radius:5px;transition:width .7s ease"></div>
      </div>
    </div>
    ${overallPct>=100?`<span style="font-size:24px">🏆</span>`:''}
  </div>
  <div style="padding:12px 14px;background:var(--asagi-bg);border:1px solid var(--asagi-border);border-radius:var(--radius-md);margin-bottom:20px;font-size:12.5px;color:var(--text-secondary);line-height:1.7">
    <i class="fas fa-info-circle" style="color:var(--asagi);margin-right:6px"></i>
    各ステップをクリックすると対象のページ（記事・ガイド・ツール・演習）に移動します。終わったらチェックボックスで完了マークを付けましょう。
  </div>
  ${phasesHtml}`;
}

function toggleRoadmapStep(stepId) {
  const done = DB.get('roadmap_completed', []);
  const idx = done.indexOf(stepId);
  if (idx === -1) done.push(stepId); else done.splice(idx, 1);
  DB.set('roadmap_completed', done);
  render();
}

function renderArticlePage(articleId) {
  const article = ARTICLES.find(a => a.id === articleId);

  if (!article) {

    // ガイド記事の場合
    if (articleId.startsWith('guide-')) {
      return renderGuidePage(articleId);
    }
    return `<div class="article-page">
      <div class="article-back-btn" onclick="navigate('learn-articles')">
        <i class="fas fa-arrow-left"></i> 記事一覧に戻る
      </div>
      <div style="text-align:center;padding:60px;color:var(--text-muted)">記事が見つかりません</div>
    </div>`;
  }

  const c = COLOR_MAP[article.categoryColor] || COLOR_MAP['beni'];

  const bodies = {
    'kishotenketsu': renderArticleKishotenketsu(),
    'three-act': renderArticleThreeAct(),
    'save-the-cat': renderArticleSaveTheCat(),
    'save-the-cat-chart': renderArticleSaveTheCatChart(),
    'story-circle': renderArticleStoryCircle(),
    'hero-journey': renderArticleHeroJourney(),
    'character-arc': renderArticleCharacterArc(),
    'subtext': renderArticleSubtext(),
    'scene-craft': renderArticleSceneCraft(),
    'dialogue-craft': renderArticleDialogueCraft(),
    'script-format': renderArticleScriptFormat(),
    'tension-pacing': renderArticleTensionPacing(),
    'scenario-ten': renderArticleScenarioTen(),
    'emotional-design': renderArticleEmotionalDesign(),
    'act2-breakthrough': renderArticleAct2Breakthrough(),
    'professional-revision': renderArticleProfessionalRevision(),
    'genre-conventions': renderArticleGenreConventions(),
    'world-building': renderArticleWorldBuilding(),
    'opening-scenes': renderArticleOpeningScenes(),
    'theme-integration': renderArticleThemeIntegration(),
    'antagonist-design': renderArticleAntagonistDesign(),
    'subplots-bstory': renderArticleSubplotsBstory(),
    'rewriting-strategy': renderArticleRewritingStrategy(),
    'visual-storytelling': renderArticleVisualStorytelling(),
  };

  const body = bodies[articleId] || `<p>コンテンツは準備中です。</p>`;

  // 既読マーク
  const readArticles = DB.get('read_articles', []);
  const isRead = readArticles.includes(articleId);
  if (!isRead) {
    readArticles.push(articleId);
    DB.set('read_articles', readArticles);
  }
  // ブックマーク
  const bookmarkedArticles = DB.get('bookmarked_articles', []);
  const isBookmarked = bookmarkedArticles.includes(articleId);

  return `
  <div style="max-width:820px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div class="article-back-btn" style="margin-bottom:0" onclick="navigate('learn-articles')">
        <i class="fas fa-arrow-left"></i> 記事一覧に戻る
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="toggleArticleBookmark('${articleId}')" style="color:${isBookmarked?'var(--kogane)':'var(--text-muted)'}">
          <i class="fas fa-bookmark"></i> ${isBookmarked?'ブックマーク済み':'ブックマーク'}
        </button>
        <span style="font-size:11px;padding:3px 10px;border-radius:var(--radius-full);background:var(--matcha-bg);color:var(--matcha);border:1px solid var(--matcha-border);font-weight:600">
          <i class="fas fa-check" style="font-size:9px;margin-right:3px"></i>既読
        </span>
      </div>
    </div>
    <div class="article-header" style="margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid var(--border);position:relative">
      <div style="position:absolute;bottom:-1px;left:0;width:40px;height:2px;background:${c.color};border-radius:1px"></div>
      <div class="article-category-tag" style="background:${c.bg};color:${c.color};border:1px solid ${c.border}">
        <i class="fas ${article.icon}"></i> ${esc(article.category)}
      </div>
      <div class="article-title">${esc(article.title)}</div>
      <div class="article-subtitle">${esc(article.subtitle)}</div>
      <div class="article-meta-row">
        <span><i class="fas fa-clock" style="margin-right:3px"></i>約${article.readTime}分で読む</span>
        <span>${article.tags.map(t=>`<span class="tag tag-gray" style="margin-right:3px">${t}</span>`).join('')}</span>
      </div>
    </div>
    <div class="article-body">${body}</div>
    <div style="margin-top:36px;padding-top:20px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
      <button class="btn btn-secondary" onclick="navigate('learn-articles')">
        <i class="fas fa-arrow-left"></i> 記事一覧
      </button>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="toggleArticleBookmark('${articleId}')">
          <i class="fas fa-bookmark"></i> ${isBookmarked?'ブックマーク解除':'ブックマーク'}
        </button>
        <button class="btn btn-ghost btn-sm" onclick="navigate('learn-guide')"><i class="fas fa-map"></i> ガイドも見る</button>
      </div>
    </div>
  </div>`;
}

// ── 記事本文 ────────────────────────────────────────────────────

function renderArticleKishotenketsu() {
  return `
  <div class="article-callout fuji">
    <i class="fas fa-info-circle" style="color:var(--fuji);margin-right:8px;flex-shrink:0"></i>
    <strong>起承転結</strong>は中国の漢詩（絶句）の構成法に由来し、日本で独自に発展しました。西洋の三幕構成とは異なる独特の「転」の概念が特徴です。
  </div>

  <h2>起承転結とは</h2>
  <p>起承転結は物語を4つのパートに分ける日本的な構成法です。中国の漢詩（七言絶句・五言絶句）の「起句・承句・転句・結句」に由来し、平安時代以降の日本文学を通じて物語構成法として定着しました。</p>

  <div class="structure-diagram">
    <div class="structure-diagram-title"><i class="fas fa-chart-bar"></i> 起承転結の構造</div>
    <div class="act-bar">
      <div class="act-bar-seg" style="flex:1;background:var(--matcha)">起</div>
      <div class="act-bar-seg" style="flex:2;background:var(--kon-lt)">承</div>
      <div class="act-bar-seg" style="flex:1;background:var(--accent)">転</div>
      <div class="act-bar-seg" style="flex:1;background:var(--fuji)">結</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 2fr 1fr 1fr;gap:3px;font-size:10px;color:var(--text-muted);text-align:center">
      <div>約15-25%</div><div>約40-50%</div><div>約15-25%</div><div>約15-20%</div>
    </div>
  </div>

  <h2>各パートの役割</h2>

  <h3>起（き）— 物語の設定と提示</h3>
  <p>物語の世界・主人公・問題を設定します。観客/読者に「どんな物語か」を伝える段階です。テンポよく、かつ確実に必要な情報を届けることが重要です。</p>
  <div class="article-callout matcha">
    <strong>起のチェックリスト：</strong>主人公は誰か？どんな世界か？何が問題か？なぜ今この話が始まるのか？
  </div>

  <h3>承（しょう）— 展開と発展</h3>
  <p>起で設定した状況を発展させます。主人公が行動し、問題が複雑になり、ストーリーが動き始める段階です。三幕構成の第二幕に相当しますが、「転」への準備として伏線を張る意識が重要です。</p>

  <h3>転（てん）— 劇的な転換</h3>
  <p>起承転結の中で最も日本的な概念。予想外の転換・視点の変化・価値の逆転が起こります。単なる「クライマックス」ではなく、物語の<em>意味が変わる</em>瞬間です。</p>
  <p>効果的な「転」の条件：①驚きがある、②必然性がある（後から考えると「そうだったのか」と納得できる）、③感情的インパクトがある。</p>
  <div class="article-callout">
    西洋の三幕構成における「ターニングポイント」と似ていますが、起承転結の「転」はより突然で、意味論的な転換を重視します。
  </div>

  <h3>結（けつ）— 収束と余韻</h3>
  <p>転を受けて物語を収束させます。日本的な美意識として、すべてを説明し尽くすのではなく、<em>余韻</em>を残すことが好まれます。「問いかけで終わる結」「静けさの中の解決」なども日本らしい結び方です。</p>

  <h2>映像作品への適用</h2>
  <p>テレビドラマへの応用として、1話完結の30分枠なら：</p>
  <div class="concept-cards">
    <div class="concept-card-sm"><span class="icon">🎬</span><div class="label">起</div><div class="sub">0〜7分：事件の発生</div></div>
    <div class="concept-card-sm"><span class="icon">🔍</span><div class="label">承</div><div class="sub">7〜20分：調査・葛藤</div></div>
    <div class="concept-card-sm"><span class="icon">⚡</span><div class="label">転</div><div class="sub">20〜25分：予想外の展開</div></div>
    <div class="concept-card-sm"><span class="icon">🌸</span><div class="label">結</div><div class="sub">25〜30分：解決と余韻</div></div>
  </div>

  <h2>三幕構成との比較</h2>
  <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:12.5px;margin:12px 0">
      <tr style="background:var(--bg-hover)">
        <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);font-size:11px;color:var(--text-muted);letter-spacing:0.05em">比較項目</th>
        <th style="padding:8px 12px;text-align:left;border:1px solid var(--border)">起承転結</th>
        <th style="padding:8px 12px;text-align:left;border:1px solid var(--border)">三幕構成</th>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid var(--border);color:var(--text-muted)">幕の数</td>
        <td style="padding:8px 12px;border:1px solid var(--border)">4</td>
        <td style="padding:8px 12px;border:1px solid var(--border)">3</td>
      </tr>
      <tr style="background:var(--bg-subtle)">
        <td style="padding:8px 12px;border:1px solid var(--border);color:var(--text-muted)">転換の性質</td>
        <td style="padding:8px 12px;border:1px solid var(--border)">意味的・突然的</td>
        <td style="padding:8px 12px;border:1px solid var(--border)">因果的・段階的</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid var(--border);color:var(--text-muted)">結末の傾向</td>
        <td style="padding:8px 12px;border:1px solid var(--border)">余韻・余白</td>
        <td style="padding:8px 12px;border:1px solid var(--border)">明確な解決</td>
      </tr>
      <tr style="background:var(--bg-subtle)">
        <td style="padding:8px 12px;border:1px solid var(--border);color:var(--text-muted)">文化的背景</td>
        <td style="padding:8px 12px;border:1px solid var(--border)">東アジア（漢詩）</td>
        <td style="padding:8px 12px;border:1px solid var(--border)">西洋（アリストテレス）</td>
      </tr>
    </table>
  </div>

  <div class="article-callout kogane">
    <strong>実践のヒント：</strong>起承転結は「型」として使うより、自分の物語を俯瞰するための「地図」として使いましょう。「この物語の転は何か？」と問い続けることで、物語の核心が見えてきます。
  </div>`;
}

function renderArticleThreeAct() {
  return `
  <div class="article-callout kon">
    <i class="fas fa-info-circle" style="color:var(--kon-lt);margin-right:8px;flex-shrink:0"></i>
    三幕構成はアリストテレスの「詩学」に遡り、シド・フィールドが1979年に体系化。現代ハリウッドの標準的な構成法です。
  </div>

  <h2>三幕構成とは</h2>
  <p>物語を「序幕（Act1）・本幕（Act2）・終幕（Act3）」の3つに分ける構成法。映画脚本では一般的に各幕が約25%・50%・25%のページ数になります（110ページ構成の場合：約28p・55p・27p）。</p>

  <div class="structure-diagram">
    <div class="structure-diagram-title"><i class="fas fa-chart-bar"></i> 三幕構成の構造</div>
    <div class="act-bar">
      <div class="act-bar-seg" style="flex:25;background:var(--matcha)">Act1 — 序幕 (25%)</div>
      <div class="act-bar-seg" style="flex:50;background:var(--kon-lt)">Act2 — 本幕 (50%)</div>
      <div class="act-bar-seg" style="flex:25;background:var(--accent)">Act3 — 終幕 (25%)</div>
    </div>
  </div>

  <h2>各幕の詳細</h2>

  <h3>Act1 — 序幕：設定と発端</h3>
  <p>主人公・世界・問題・ゴールを設定します。第一幕の終わりに「ターニングポイント1（PP1）」が来て、主人公は不可逆的な行動を取ります。</p>
  <div class="beat-list">
    <div class="beat-item">
      <div class="beat-num" style="background:var(--matcha)">1</div>
      <div class="beat-content">
        <div class="beat-title">オープニングイメージ <span class="beat-pct">p.1〜5</span></div>
        <div class="beat-desc">物語の世界観・トーンを一発で伝えるシーン</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--matcha)">2</div>
      <div class="beat-content">
        <div class="beat-title">主人公の日常 <span class="beat-pct">p.5〜15</span></div>
        <div class="beat-desc">変化前の主人公の姿。欲求と欠如を示す</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--matcha)">3</div>
      <div class="beat-content">
        <div class="beat-title">発端事件 (Inciting Incident) <span class="beat-pct">p.15〜25</span></div>
        <div class="beat-desc">日常を揺るがす出来事。物語の引き金となる事件</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--matcha)">4</div>
      <div class="beat-content">
        <div class="beat-title">ターニングポイント1 <span class="beat-pct">p.25〜30</span></div>
        <div class="beat-desc">主人公が第二幕の世界へ踏み込む不可逆な選択</div>
      </div>
    </div>
  </div>

  <h3>Act2 — 本幕：上昇と下降</h3>
  <p>物語の中心。主人公が目標に向かって行動し、障害に出会い、変化していきます。通常「前半（Act2a）」と「後半（Act2b）」に分かれ、中盤に「ミッドポイント」が来ます。</p>
  <div class="article-callout matcha">
    <strong>ミッドポイント（中間点）：</strong>第二幕の真ん中（p.55付近）に来る転換点。主人公の立場や認識が大きく変わる。「表面的な勝利→本質的な危機」または「最低点からの立ち上がり」が典型的。
  </div>

  <h3>Act3 — 終幕：クライマックスと解決</h3>
  <p>主人公が最終的な選択をし、クライマックスに挑む。物語のテーマが最も強く体現される場面を経て、変化後の世界を示すクロージングイメージで幕を閉じます。</p>

  <h2>ターニングポイントの設計</h2>
  <p>三幕構成の要はターニングポイントです。良いターニングポイントの条件：</p>
  <ul>
    <li><strong>不可逆性：</strong>戻れない、引き返せない</li>
    <li><strong>選択性：</strong>主人公の能動的な選択によって起きる</li>
    <li><strong>感情的衝撃：</strong>観客の感情を強く動かす</li>
    <li><strong>方向性変換：</strong>物語の方向が変わる</li>
  </ul>

  <div class="article-callout kogane">
    <strong>よくある失敗：</strong>Act2が長すぎて中弛みする。対策は「ミッドポイント」を明確に設計し、Act2を前半・後半に分けてテンポを管理すること。
  </div>`;
}

function renderArticleSaveTheCat() {
  const beats = [
    { n:1, name:'オープニングイメージ', pct:'p.1', desc:'物語のトーン・テーマを象徴する一場面' },
    { n:2, name:'テーマの提示', pct:'p.5', desc:'物語のテーマが問いかけとして提示される' },
    { n:3, name:'設定', pct:'p.1〜10', desc:'主人公の日常世界・欠如・欲求を描写' },
    { n:4, name:'触媒（発端）', pct:'p.12', desc:'日常を壊す出来事。物語の引き金' },
    { n:5, name:'議論', pct:'p.12〜25', desc:'主人公の葛藤・躊躇・準備の段階' },
    { n:6, name:'第二幕への突入', pct:'p.25', desc:'主人公が新たな世界へ踏み込む決断' },
    { n:7, name:'Bストーリー', pct:'p.30', desc:'サブプロット（多くは恋愛・人間関係）が始まる' },
    { n:8, name:'楽しみと遊び', pct:'p.30〜55', desc:'観客が楽しみにしていたシーンが展開する' },
    { n:9, name:'ミッドポイント', pct:'p.55', desc:'表面的な勝利か最低点。主人公の認識が変わる' },
    { n:10, name:'悪役の迫来', pct:'p.55〜75', desc:'障害が激化、主人公の計画が崩れていく' },
    { n:11, name:'すべてを失う', pct:'p.75', desc:'最大の失敗・喪失。物語の最低点' },
    { n:12, name:'暗闇の魂', pct:'p.75〜85', desc:'深刻な疑念と絶望。変化の直前の闇' },
    { n:13, name:'クライマックスへの突入', pct:'p.85', desc:'主人公が最終決戦へ向かう決断' },
    { n:14, name:'クライマックス', pct:'p.85〜110', desc:'主人公が変化した姿で最大の障害に立ち向かう' },
    { n:15, name:'クロージングイメージ', pct:'p.110', desc:'オープニングイメージと対比して変化を示す最終場面' },
  ];

  return `
  <div class="article-callout matcha">
    ブレイク・スナイダーの著書『Save the Cat!』（2005）で提唱。タイトルは「主人公が猫を救う」ような「観客に好感を持たせる瞬間」を指す。
  </div>

  <h2>Save the Catとは</h2>
  <p>脚本家ブレイク・スナイダーが開発した15のビート（転換点）で構成される脚本設計システム。110ページの映画脚本に対応しており、各ビートの目安となるページ数が示されています。</p>
  <p>「Save the Cat」とは、主人公が登場して最初に「何か観客が好きになれる行動」を取ることで、観客の共感を得るテクニック。例えば、猫を助ける（Save the cat）など。</p>

  <h2>15のビートシート</h2>
  <div class="beat-list">
    ${beats.map(b => `
    <div class="beat-item">
      <div class="beat-num">${b.n}</div>
      <div class="beat-content">
        <div class="beat-title">${b.name} <span class="beat-pct">${b.pct}</span></div>
        <div class="beat-desc">${b.desc}</div>
      </div>
    </div>`).join('')}
  </div>

  <h2>ジャンルの型（ビートの変形）</h2>
  <p>スナイダーは映画を10のジャンルに分類し、各ジャンルで効果的なビート変形を提案しています。</p>
  <div class="concept-cards">
    <div class="concept-card-sm"><span class="icon">🧩</span><div class="label">Monster in the House</div><div class="sub">怪物もの・ホラー</div></div>
    <div class="concept-card-sm"><span class="icon">🧳</span><div class="label">Golden Fleece</div><div class="sub">旅もの・冒険</div></div>
    <div class="concept-card-sm"><span class="icon">🔍</span><div class="label">Out of the Bottle</div><div class="sub">魔法・超自然</div></div>
    <div class="concept-card-sm"><span class="icon">💫</span><div class="label">Dude with a Problem</div><div class="sub">無実の男</div></div>
    <div class="concept-card-sm"><span class="icon">🎭</span><div class="label">Rites of Passage</div><div class="sub">成長・変化</div></div>
    <div class="concept-card-sm"><span class="icon">❤️</span><div class="label">Buddy Love</div><div class="sub">恋愛・友情</div></div>
  </div>

  <div class="article-callout kogane">
    <strong>批判と活用：</strong>Save the Catは「公式すぎる」と批判されることもあります。重要なのは、これを「守るべき規則」ではなく「物語を分析するツール」として使うこと。既存の名作を分析するのに特に役立ちます。
  </div>`;
}

function renderArticleStoryCircle() {
  const steps = [
    { n:1, name:'あなたは（主人公）', desc:'キャラクターの日常世界を設定する', color:'var(--fuji)' },
    { n:2, name:'何かを望んでいる', desc:'主人公の欲求（Want）を明確にする', color:'var(--kon-lt)' },
    { n:3, name:'不慣れな状況に入る', desc:'主人公が快適ゾーンを離れる', color:'var(--matcha)' },
    { n:4, name:'目的に適応する', desc:'新しい世界のルールを学ぶ', color:'var(--kogane)' },
    { n:5, name:'望みを達成する', desc:'表面的な目標を達成する', color:'var(--asagi)' },
    { n:6, name:'大きな代償を払う', desc:'望みを得ることで何かを失う', color:'var(--accent)' },
    { n:7, name:'帰還する（変化して）', desc:'元の世界に戻るが変化している', color:'var(--momo)' },
    { n:8, name:'状況が変わった', desc:'世界または主人公が変化した', color:'var(--fuji)' },
  ];

  return `
  <div class="article-callout fuji">
    ダン・ハーモン（Rick and Morty、Community の脚本家）が開発。ジョセフ・キャンベルの「英雄の旅」をシンプルな8ステップに圧縮したもの。
  </div>

  <h2>ストーリーサークルとは</h2>
  <p>ストーリーサークル（別名「ダン・ハーモンのサークル」「Story Circle」）は、物語をたった8つのステップの円環で捉えるシステムです。円の上半分が「快適ゾーン（日常）」、下半分が「不快ゾーン（非日常）」であり、主人公はこの円を一周します。</p>

  <div class="structure-diagram">
    <div class="structure-diagram-title"><i class="fas fa-rotate"></i> 8ステップのサークル</div>
    <div class="cycle-grid">
      ${steps.map(s => `
      <div class="cycle-step" style="border-color:${s.color}20">
        <div class="cycle-num" style="color:${s.color}">Step ${s.n}</div>
        <div class="cycle-name">${s.name}</div>
      </div>`).join('')}
    </div>
  </div>

  <h2>各ステップの詳細</h2>
  <div class="beat-list">
    ${steps.map(s => `
    <div class="beat-item">
      <div class="beat-num" style="background:${s.color}">${s.n}</div>
      <div class="beat-content">
        <div class="beat-title">${s.name}</div>
        <div class="beat-desc">${s.desc}</div>
      </div>
    </div>`).join('')}
  </div>

  <h2>ネストする円（入れ子構造）</h2>
  <p>ストーリーサークルの強力な特徴の一つは「入れ子」にできること。物語全体がサークルを描くと同時に、各エピソード・各シーンもサークルを描くことができます。</p>
  <div class="article-callout matcha">
    <strong>テレビシリーズへの応用：</strong>シリーズ全体・シーズン・エピソード・シーンのそれぞれがサークルを持つ。ハーモンは「Community」でこの構造を一貫して使用した。
  </div>

  <h2>英雄の旅との比較</h2>
  <p>ストーリーサークルは英雄の旅を8ステップに圧縮したものですが、キャンベルの17段階より実用的です。テレビの1話（22〜45分）や短編、さらには単一のシーンにまで適用できる柔軟さが特徴です。</p>

  <div class="article-callout kogane">
    <strong>Step 5と6の逆転：</strong>主人公が「望みを達成する」（Step 5）のは表面的な成功。本当の成長は「代償を払う」（Step 6）ことで起きる。この逆転がドラマを生む核心です。
  </div>`;
}

function renderArticleHeroJourney() {
  return `
  <div class="article-callout kogane">
    ジョセフ・キャンベル著『千の顔を持つ英雄』（1949）で提唱。世界中の神話・伝説に共通するパターンを「モノミス（単一神話）」と名付けた。
  </div>

  <h2>英雄の旅とは</h2>
  <p>神話学者ジョセフ・キャンベルが世界中の神話・宗教・民話を比較研究した結果、発見した普遍的な物語構造。英雄が「日常→非日常→帰還」を辿る旅を17段階で描きます。</p>
  <p>スターウォーズ（ジョージ・ルーカスはキャンベルを師と仰いだ）、ライオン・キング、マトリックス、ハリー・ポッターなど無数の名作がこの構造に基づいています。</p>

  <h2>三つの大きな段階</h2>

  <div class="structure-diagram">
    <div class="structure-diagram-title"><i class="fas fa-rotate"></i> 英雄の旅の大構造</div>
    <div class="act-bar">
      <div class="act-bar-seg" style="flex:1;background:var(--matcha)">出発</div>
      <div class="act-bar-seg" style="flex:2;background:var(--accent)">試練</div>
      <div class="act-bar-seg" style="flex:1;background:var(--fuji)">帰還</div>
    </div>
  </div>

  <h3>出発（Departure）</h3>
  <div class="beat-list">
    <div class="beat-item"><div class="beat-num" style="background:var(--matcha)">1</div><div class="beat-content"><div class="beat-title">日常世界</div><div class="beat-desc">英雄の出発点となる普通の世界</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--matcha)">2</div><div class="beat-content"><div class="beat-title">冒険への召喚</div><div class="beat-desc">英雄に旅への呼びかけが来る</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--matcha)">3</div><div class="beat-content"><div class="beat-title">召喚の拒否</div><div class="beat-desc">英雄は最初、冒険を拒む</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--matcha)">4</div><div class="beat-content"><div class="beat-title">師との出会い</div><div class="beat-desc">英雄に知識・力・助言を与える存在</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--matcha)">5</div><div class="beat-content"><div class="beat-title">第一の関門突破</div><div class="beat-desc">英雄が非日常の世界へ踏み込む</div></div></div>
  </div>

  <h3>試練（Initiation）</h3>
  <div class="beat-list">
    <div class="beat-item"><div class="beat-num" style="background:var(--accent)">6</div><div class="beat-content"><div class="beat-title">試練・同盟者・敵</div><div class="beat-desc">新しい世界でのテストと人間関係の形成</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--accent)">7</div><div class="beat-content"><div class="beat-title">最深部への接近</div><div class="beat-desc">最大の試練の洞穴の前に立つ</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--accent)">8</div><div class="beat-content"><div class="beat-title">最大の試練</div><div class="beat-desc">死と再生を象徴する最大の危機</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--accent)">9</div><div class="beat-content"><div class="beat-title">報酬の獲得</div><div class="beat-desc">試練を超えた後の宝・知識・力</div></div></div>
  </div>

  <h3>帰還（Return）</h3>
  <div class="beat-list">
    <div class="beat-item"><div class="beat-num" style="background:var(--fuji)">10</div><div class="beat-content"><div class="beat-title">帰還への道</div><div class="beat-desc">日常世界への帰還を決断する</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--fuji)">11</div><div class="beat-content"><div class="beat-title">復活</div><div class="beat-desc">最後の浄化・最終テスト</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--fuji)">12</div><div class="beat-content"><div class="beat-title">霊薬を持って帰還</div><div class="beat-desc">変化した英雄が日常世界に帰還し、宝をもたらす</div></div></div>
  </div>

  <div class="article-callout">
    <strong>実践的な活用：</strong>17段階すべてを使う必要はありません。「召喚→拒否→師→旅立ち→試練→帰還」という基本的な弧を意識するだけでも物語は豊かになります。
  </div>`;
}

function toggleArticleBookmark(articleId) {
  const bm = DB.get('bookmarked_articles', []);
  const idx = bm.indexOf(articleId);
  if (idx >= 0) {
    bm.splice(idx, 1);
    toast('ブックマークを解除しました', 'info');
  } else {
    bm.push(articleId);
    toast('ブックマークしました！', 'success');
  }
  DB.set('bookmarked_articles', bm);
  navigate('article-' + articleId);
}

function setLearnFilter(key, val) {
  const f = DB.get('learn_article_filter', { category: '', search: '', showBookmark: false });
  f[key] = val;
  DB.set('learn_article_filter', f);
  navigate('learn-articles');
}

function clearLearnFilter() {
  DB.set('learn_article_filter', { category: '', search: '', showBookmark: false });
  navigate('learn-articles');
}

function toggleGuideStep(guideId, stepNum, checked) {
  const key = `guide_steps_${guideId}`;
  let steps = DB.get(key, []);
  if (checked) {
    if (!steps.includes(stepNum)) steps.push(stepNum);
  } else {
    steps = steps.filter(s => s !== stepNum);
  }
  DB.set(key, steps);
  // Update progress display without full re-render
  const pct = Math.round(steps.length / (GUIDES.find(g=>`guide-${g.id}`===guideId)?.steps||1) * 100);
  const bar = document.querySelector('.article-header ~ div .card [style*="border-radius:3px"]:last-of-type > div');
  if (bar) bar.style.width = pct + '%';
  const countEl = document.querySelector('.article-header ~ div .card [style*="text-align:center"]');
  if (countEl && countEl.textContent.includes('ステップ完了')) {
    const guide = GUIDES.find(g=>`guide-${g.id}`===guideId);
    if (guide) countEl.textContent = `${steps.length}/${guide.steps} ステップ完了`;
  }
}

function resetGuideSteps(guideId) {
  DB.set(`guide_steps_${guideId}`, []);
  render();
  toast('進捗をリセットしました', 'info');
}

function renderArticleSubtext() {
  return `
  <div class="article-callout asagi">
    <i class="fas fa-comment-dots" style="color:var(--asagi);margin-right:8px;flex-shrink:0"></i>
    <strong>サブテキスト（subtext）</strong>とは、台詞の表面には現れない、言外に込められた意味・感情・意図のこと。「言葉と本音のズレ」が観客を引きつける。
  </div>

  <h2>なぜサブテキストが重要か</h2>
  <p>素人の脚本と玄人の脚本を分ける大きな要因のひとつがサブテキストの扱いです。登場人物が「すべて言葉で説明してしまう」脚本は薄っぺらく感じられ、観客の想像力が入る余地がありません。</p>
  <div class="article-callout">
    ドラマの黄金律：「決して言うな。見せろ。それも直接ではなく、間接的に」
  </div>

  <h2>サブテキストの4類型</h2>
  <div class="concept-cards">
    <div class="concept-card-sm" style="background:var(--asagi-bg);border-color:var(--asagi-border)">
      <span class="icon">💔</span>
      <div class="label" style="color:var(--asagi)">感情的サブテキスト</div>
      <div class="sub">言えない本音・押し込めた感情</div>
    </div>
    <div class="concept-card-sm" style="background:var(--matcha-bg);border-color:var(--matcha-border)">
      <span class="icon">🎭</span>
      <div class="label" style="color:var(--matcha)">社会的サブテキスト</div>
      <div class="sub">立場・礼儀・権力の抑圧</div>
    </div>
    <div class="concept-card-sm" style="background:var(--accent-bg);border-color:var(--accent-border)">
      <span class="icon">🔍</span>
      <div class="label" style="color:var(--accent)">情報的サブテキスト</div>
      <div class="sub">キャラが知っていることを隠す</div>
    </div>
    <div class="concept-card-sm" style="background:var(--fuji-bg);border-color:var(--fuji-border)">
      <span class="icon">⚡</span>
      <div class="label" style="color:var(--fuji)">意図的サブテキスト</div>
      <div class="sub">操作・交渉・計算された言葉</div>
    </div>
  </div>

  <h2>実践例：感情的サブテキスト</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0">
    <div style="padding:14px;background:var(--accent-bg);border-radius:var(--radius-md);border:1px solid var(--accent-border)">
      <div style="font-size:11.5px;font-weight:700;color:var(--accent);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">❌ サブテキストなし（薄い）</div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.9">
        A「好きだよ」<br>B「私も好き」<br>A「でも、これからも友達でいよう」<br>B「…うん、そうだね。友達として好き」
      </div>
    </div>
    <div style="padding:14px;background:var(--matcha-bg);border-radius:var(--radius-md);border:1px solid var(--matcha-border)">
      <div style="font-size:11.5px;font-weight:700;color:var(--matcha);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">✅ サブテキストあり（深い）</div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.9">
        A「（外を見ながら）来年、東京行くんだろ」<br>B「（少し間）そう。決まってる」<br>A「そっか」（長い沈黙）「──いい店、知ってるよ。向こうで」<br>B「…教えてよ」
      </div>
    </div>
  </div>
  <p>後者では「好き」という言葉は一言も出てきません。しかし「東京に引っ越す」事実と「いい店を教える」という言葉の裏に、関係継続を望む気持ちと諦めが同時に流れています。</p>

  <h2>サブテキストを書く5つの技法</h2>
  <div class="beat-list">
    <div class="beat-item">
      <div class="beat-num" style="background:var(--asagi)">1</div>
      <div class="beat-content">
        <div class="beat-title">話題のすり替え（Topic Dodge）</div>
        <div class="beat-desc">本当に言いたいことを言わず、別のトピックに移す。観客は「あ、言えなかったんだ」と感じる</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--asagi)">2</div>
      <div class="beat-content">
        <div class="beat-title">行動で代替する（Action Substitute）</div>
        <div class="beat-desc">「愛してる」と言う代わりに、コーヒーを静かに置く。日本映画の得意技。</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--asagi)">3</div>
      <div class="beat-content">
        <div class="beat-title">皮肉・反語（Irony）</div>
        <div class="beat-desc">言葉の意味と感情の逆転。「楽しいね」と言いながら顔が強張っている</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--asagi)">4</div>
      <div class="beat-content">
        <div class="beat-title">過去形・仮定法（Past/Conditional）</div>
        <div class="beat-desc">「もし昔に戻れたら」「あのとき違う選択をしていたら」——現在への思いを過去に隠す</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--asagi)">5</div>
      <div class="beat-content">
        <div class="beat-title">中断と沈黙（Interruption / Silence）</div>
        <div class="beat-desc">言いかけてやめる。沈黙が続く。「…」は時に最も雄弁なセリフになる。</div>
      </div>
    </div>
  </div>

  <div class="article-callout matcha">
    <strong>執筆のヒント：</strong>書いた台詞に「このキャラは本当はここで何を言いたかったのか？」と問い直してみましょう。その答えを言わせずに、どう行動・反応させるかを考えると、サブテキストが生まれます。
  </div>`;
}

function renderArticleSceneCraft() {
  return `
  <div class="article-callout kogane">
    <i class="fas fa-clapperboard" style="color:var(--kogane);margin-right:8px;flex-shrink:0"></i>
    シーンとは単なる「場面の描写」ではありません。シーンは<strong>物語を推進するドラマ単位</strong>です。優れたシーンには必ず「目的・葛藤・変化」の3要素が含まれています。
  </div>

  <h2>シーン設計の3要素</h2>
  <div class="concept-cards">
    <div class="concept-card-sm" style="background:var(--kogane-bg);border-color:var(--kogane-border)">
      <span class="icon">🎯</span>
      <div class="label" style="color:var(--kogane)">目的（Goal）</div>
      <div class="sub">このシーンで誰が何を達成しようとしているか</div>
    </div>
    <div class="concept-card-sm" style="background:var(--accent-bg);border-color:var(--accent-border)">
      <span class="icon">⚔️</span>
      <div class="label" style="color:var(--accent)">葛藤（Conflict）</div>
      <div class="sub">目的の達成を妨げる力・人・状況</div>
    </div>
    <div class="concept-card-sm" style="background:var(--matcha-bg);border-color:var(--matcha-border)">
      <span class="icon">🔄</span>
      <div class="label" style="color:var(--matcha)">変化（Change）</div>
      <div class="sub">シーン終了後、何かが変わっていること</div>
    </div>
  </div>

  <h2>シーン設計の手順</h2>
  <div class="beat-list">
    <div class="beat-item">
      <div class="beat-num" style="background:var(--kogane)">1</div>
      <div class="beat-content">
        <div class="beat-title">このシーンは何のためにあるか？</div>
        <div class="beat-desc">物語的機能を1文で言えること。「主人公が動機を明確にする」「ターニングポイントを引き起こす」など</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--kogane)">2</div>
      <div class="beat-content">
        <div class="beat-title">誰がシーンに入り、どんな目標を持っているか？</div>
        <div class="beat-desc">登場人物全員に「このシーンで何がしたいか」を設定する。目標が衝突するとき、葛藤が生まれる</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--kogane)">3</div>
      <div class="beat-content">
        <div class="beat-title">シーンの最大テンションはどこか？</div>
        <div class="beat-desc">最も緊張が高まる瞬間（ターニングポイント）を意識的に設計する。そこに向かって構築し、そこから解放する</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--kogane)">4</div>
      <div class="beat-content">
        <div class="beat-title">シーン終了時、何が変化したか？</div>
        <div class="beat-desc">感情、関係性、情報、状況——何かが確実に変わっていること。同じ状態で終わるシーンはカットすべき</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--kogane)">5</div>
      <div class="beat-content">
        <div class="beat-title">入口と出口を遅く入り早く出る</div>
        <div class="beat-desc">シーンに入るのを「挨拶」より遅くし、「解決」の直後に終わる。前後の冗長な部分をカットするとテンポが上がる</div>
      </div>
    </div>
  </div>

  <h2>シーンのよくある失敗と対策</h2>
  <div style="display:grid;grid-template-columns:1fr;gap:10px;margin:16px 0">
    ${[
      { fail:'情報を渡すだけのシーン（説明シーン）', fix:'情報を葛藤の中に埋め込む。「二人が言い争いながら、その情報が出てくる」' },
      { fail:'感情を直接語らせる（「悲しい」「嬉しい」と言う）', fix:'感情は行動・ト書き・サブテキストで表現する' },
      { fail:'変化のないシーン（入った時と出た時が同じ）', fix:'シーン終わりに「Value Change（価値の変化）」を意識する' },
      { fail:'長すぎる会話シーン（話し合いが続く）', fix:'会話を「行動」「決断」「行動の中断」で分断する' },
    ].map(({fail,fix}) => `
      <div style="padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-subtle)">
        <div style="font-size:12px;color:var(--accent);font-weight:600;margin-bottom:5px"><i class="fas fa-times-circle" style="margin-right:5px"></i>${fail}</div>
        <div style="font-size:12px;color:var(--matcha);margin-top:4px"><i class="fas fa-check-circle" style="margin-right:5px"></i>${fix}</div>
      </div>`).join('')}
  </div>

  <h2>シーンチェックリスト</h2>
  ${[
    'このシーンがなければ物語は成立しないか？（不要なら削除）',
    '登場人物全員に明確な目標があるか？',
    '何らかの葛藤・対立・困難があるか？',
    'シーン前後で何かが変化しているか？',
    '最後のセリフ/ト書きが次のシーンへの「引き」になっているか？',
    '会話・行動・沈黙のバランスは取れているか？',
  ].map(item => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="width:18px;height:18px;border-radius:50%;border:2px solid var(--matcha);flex-shrink:0"></div>
      <span style="font-size:12.5px;color:var(--text-secondary)">${item}</span>
    </div>`).join('')}

  <div class="article-callout">
    <strong>プロのテクニック：</strong>書いたシーンを「このシーンをカットしたら？」と問い直してみましょう。カットしても物語が成立するなら、そのシーンは不要です。すべてのシーンが「必要不可欠」である脚本こそが強い。
  </div>`;
}

function renderArticleCharacterArc() {
  return `
  <div class="article-callout momo">
    キャラクターアークとは、物語を通じて主人公（またはキャラクター）が内的に変化する過程。行動の変化ではなく、<em>信念・価値観・自己認識</em>の変化を指します。
  </div>

  <h2>キャラクターアークの三類型</h2>

  <div class="concept-cards">
    <div class="concept-card-sm" style="background:var(--matcha-bg);border-color:var(--matcha-border)">
      <span class="icon">📈</span>
      <div class="label" style="color:var(--matcha)">ポジティブアーク</div>
      <div class="sub">欠如→変容→成長</div>
    </div>
    <div class="concept-card-sm" style="background:var(--accent-bg);border-color:var(--accent-border)">
      <span class="icon">📉</span>
      <div class="label" style="color:var(--accent)">ネガティブアーク</div>
      <div class="sub">弱点→悪化→堕落</div>
    </div>
    <div class="concept-card-sm" style="background:var(--kon-bg);border-color:var(--kon-border)">
      <span class="icon">➡️</span>
      <div class="label" style="color:var(--kon-lt)">フラットアーク</div>
      <div class="sub">信念→試練→確信</div>
    </div>
  </div>

  <h2>ポジティブアークの設計</h2>
  <p>最も一般的なアーク。主人公が欠如・誤信・弱点を抱えた状態からスタートし、物語を通じてそれを克服・変容させる。</p>

  <div class="beat-list">
    <div class="beat-item">
      <div class="beat-num" style="background:var(--momo)">1</div>
      <div class="beat-content">
        <div class="beat-title">欠如（ウーンド）の設定</div>
        <div class="beat-desc">過去のトラウマや誤った信念。例：「自分は愛される価値がない」</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--momo)">2</div>
      <div class="beat-content">
        <div class="beat-title">Want vs. Need</div>
        <div class="beat-desc">Want（欲しいもの）とNeed（本当に必要なもの）は必ず乖離させる</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--momo)">3</div>
      <div class="beat-content">
        <div class="beat-title">ゴーストの顕在化</div>
        <div class="beat-desc">欠如が表面化し、主人公の行動を誤らせる瞬間を作る</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--momo)">4</div>
      <div class="beat-content">
        <div class="beat-title">変容の瞬間</div>
        <div class="beat-desc">主人公が真実を受け入れ、誤信を捨てる決定的瞬間</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--momo)">5</div>
      <div class="beat-content">
        <div class="beat-title">変化の証明</div>
        <div class="beat-desc">クライマックスで変化した主人公が以前と異なる選択をする</div>
      </div>
    </div>
  </div>

  <h2>Want と Need の設計</h2>
  <p>キャラクターアークの核心はWant（表面的な欲求）とNeed（内的な必要）の対立にあります。</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0">
    <div style="background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:6px;letter-spacing:0.06em">WANT（欲しいもの）</div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.65">主人公が意識的に求めるもの。外的な目標。「金が欲しい」「復讐したい」「成功したい」</div>
    </div>
    <div style="background:var(--matcha-bg);border:1px solid var(--matcha-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:11px;font-weight:700;color:var(--matcha);margin-bottom:6px;letter-spacing:0.06em">NEED（必要なもの）</div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.65">主人公が無意識に必要としているもの。内的な成長。「許すこと」「繋がること」「自己受容」</div>
    </div>
  </div>

  <div class="article-callout kogane">
    <strong>黄金則：</strong>Wantを追いかけることでNeedを見つける旅。クライマックスで主人公はWantよりNeedを選ぶ決断をする。これがキャラクターの「成長」です。
  </div>

  <h2>ネガティブアーク（悲劇的アーク）</h2>
  <p>主人公が変容せず、または間違った方向に変化する。トラジック（悲劇）やアンチヒーローの物語に使われます。「マクベス」「ウォルター・ホワイト（ブレイキング・バッド）」など。</p>
  <div class="article-callout">
    ネガティブアークでは、視聴者は主人公の間違いが明らかなのに止められない悲しさを体験する。「変化できた可能性」を描くことが重要。
  </div>`;
}

// ── 新記事: セリフの書き方 ──────────────────────────────────────
function renderArticleDialogueCraft() {
  return `
  <div class="article-callout fuji">
    <i class="fas fa-info-circle" style="color:var(--fuji);margin-right:8px;flex-shrink:0"></i>
    <strong>「セリフはX線だ」</strong>——スクリーンライターのハル・エイシュカーは言いました。良いセリフは、その人物の内面・背景・欲求をすべて照らし出します。
  </div>

  <h2>セリフの三層構造</h2>
  <p>脚本のセリフには3つの層があります。プロの脚本家はこれら全てを意識して書きます。</p>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0">
    <div style="background:var(--fuji-bg);border:1px solid var(--fuji-border);border-radius:var(--radius-md);padding:14px;text-align:center">
      <div style="font-size:22px;margin-bottom:6px">📣</div>
      <div style="font-size:12px;font-weight:700;color:var(--fuji);margin-bottom:6px">テキスト層</div>
      <div style="font-size:11px;color:var(--text-secondary);line-height:1.6">実際に言っている言葉。表面的な意味。</div>
    </div>
    <div style="background:var(--momo-bg);border:1px solid var(--momo-border);border-radius:var(--radius-md);padding:14px;text-align:center">
      <div style="font-size:22px;margin-bottom:6px">💭</div>
      <div style="font-size:12px;font-weight:700;color:var(--momo);margin-bottom:6px">サブテキスト層</div>
      <div style="font-size:11px;color:var(--text-secondary);line-height:1.6">本当に言いたいこと。隠された感情・意図。</div>
    </div>
    <div style="background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:var(--radius-md);padding:14px;text-align:center">
      <div style="font-size:22px;margin-bottom:6px">🎭</div>
      <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:6px">コンテキスト層</div>
      <div style="font-size:11px;color:var(--text-secondary);line-height:1.6">誰が・いつ・どんな状況で言うか。</div>
    </div>
  </div>

  <h2>良いセリフの7原則</h2>

  <div class="beat-list">
    <div class="beat-item">
      <div class="beat-num" style="background:var(--fuji)">1</div>
      <div class="beat-content">
        <div class="beat-title">キャラクターの声が個別化されている</div>
        <div class="beat-desc">名前を隠してもどのキャラクターか分かる。語彙・リズム・話し方が全員違う。</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--asagi)">2</div>
      <div class="beat-content">
        <div class="beat-title">説明しすぎない（ダイアログとしての自然さ）</div>
        <div class="beat-desc">人は普通、知っていることを言い直さない。「そうだよ、君が昨日話していたことだよ、つまり…」は避ける。</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--momo)">3</div>
      <div class="beat-content">
        <div class="beat-title">アクションを持っている（能動的セリフ）</div>
        <div class="beat-desc">セリフには目的がある。「説得する」「脅す」「距離を置く」「気を引く」——何をしているか分かる。</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--kogane)">4</div>
      <div class="beat-content">
        <div class="beat-title">サブテキストを持つ（言わない技術）</div>
        <div class="beat-desc">本音は絶対に直接言わない。感情は行動・言葉の選択・沈黙で伝える。「愛してる」の代わりに「コーヒーを持ってきた」。</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--matcha)">5</div>
      <div class="beat-content">
        <div class="beat-title">短く・鋭く（テレビドラマは特に重要）</div>
        <div class="beat-desc">1つのセリフは原則3行以内。長い独白は舞台演劇。映像では会話のキャッチボールが命。</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--accent)">6</div>
      <div class="beat-content">
        <div class="beat-title">「はい/いいえ」では答えない（間接的反応）</div>
        <div class="beat-desc">現実の会話でも人は質問に直接答えない。「今日何してたの？」「コーヒーが飲みたい」——これでキャラクターが生きる。</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--kon-lt)">7</div>
      <div class="beat-content">
        <div class="beat-title">声に出して確認する</div>
        <div class="beat-desc">書いたセリフは必ず声に出して読む。不自然なリズム・言いにくい音の連なり・不要な語尾が見つかる。</div>
      </div>
    </div>
  </div>

  <h2>よくある失敗パターン</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0">
    <div style="background:#fde8e8;border:1px solid #f7c0c0;border-radius:var(--radius-md);padding:14px">
      <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:8px">❌ やりがちなミス</div>
      <ul style="font-size:12px;color:var(--text-secondary);line-height:1.8;margin:0;padding-left:16px">
        <li>「私は〇〇という気持ちです」（感情の直接説明）</li>
        <li>ト書きの説明をセリフで繰り返す</li>
        <li>全員が同じ話し方をする</li>
        <li>観客への情報提供が目的になる</li>
        <li>長すぎる独白（3行超え）</li>
      </ul>
    </div>
    <div style="background:var(--matcha-bg);border:1px solid var(--matcha-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:11px;font-weight:700;color:var(--matcha);margin-bottom:8px">✅ プロの書き方</div>
      <ul style="font-size:12px;color:var(--text-secondary);line-height:1.8;margin:0;padding-left:16px">
        <li>感情は行動・選択・間で示す</li>
        <li>必要な情報は自然な文脈に埋め込む</li>
        <li>各キャラに独自の口癖・語彙を持たせる</li>
        <li>セリフの目的（動詞）を明確にする</li>
        <li>短い交換でテンポを作る</li>
      </ul>
    </div>
  </div>

  <div class="article-callout matcha">
    <strong>実践課題：</strong>お気に入りのドラマの1シーンを書き起こし、各セリフに「このキャラクターは今何をしているか（動詞）」を書いてみましょう。セリフの目的が見えてくるはずです。
  </div>`;
}

// ── 新記事: 脚本フォーマット ──────────────────────────────────────
function renderArticleScriptFormat() {
  return `
  <div class="article-callout kon">
    <i class="fas fa-info-circle" style="color:var(--kon-lt);margin-right:8px;flex-shrink:0"></i>
    <strong>フォーマットは「業界の共通言語」</strong>——正しい書式で書かれた脚本は、監督・俳優・スタッフ全員が同じイメージを持てる「設計図」になります。
  </div>

  <h2>シーンヘッダー（スラッグライン）</h2>
  <p>すべてのシーンはシーンヘッダーから始まります。以下の3要素を大文字で書きます。</p>
  <div style="background:var(--bg-hover);border-radius:var(--radius-md);padding:16px;font-family:monospace;font-size:13px;line-height:2;margin:14px 0">
    <div style="color:var(--text-primary);font-weight:700">INT. 東京駅 構内 — 朝</div>
    <div style="color:var(--text-muted);font-size:11px;margin-top:4px">場所の種類（INT./EXT.） + 場所名 + ダッシュ + 時刻</div>
    <div style="height:1px;background:var(--border);margin:10px 0"></div>
    <div style="color:var(--text-primary);font-weight:700">EXT. 上野公園 — 夕暮れ</div>
    <div style="color:var(--text-muted);font-size:11px;margin-top:4px">INT.=屋内 / EXT.=屋外 / INT./EXT.=両方にまたがる</div>
  </div>

  <h2>アクション（ト書き）のルール</h2>
  <p>シーンヘッダーの後に書く視覚的描写です。現在形で書きます。</p>
  <div class="article-callout matcha">
    <strong>原則：</strong>「見えるもの・聞こえるもの」だけ書く。キャラクターの内面（「〜と思った」）は書かない。カメラ指示も原則書かない（演出家の領域）。
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0">
    <div style="background:#fde8e8;border:1px solid #f7c0c0;border-radius:var(--radius-md);padding:12px">
      <div style="font-size:10px;font-weight:700;color:var(--accent);margin-bottom:6px">❌ 避けるべき書き方</div>
      <div style="font-size:11.5px;color:var(--text-secondary);font-family:monospace;line-height:1.8">勇気を振り絞って、<br>彼女は立ち上がる。<br>（心が痛かった）</div>
    </div>
    <div style="background:var(--matcha-bg);border:1px solid var(--matcha-border);border-radius:var(--radius-md);padding:12px">
      <div style="font-size:10px;font-weight:700;color:var(--matcha);margin-bottom:6px">✅ 正しい書き方</div>
      <div style="font-size:11.5px;color:var(--text-secondary);font-family:monospace;line-height:1.8">彼女はゆっくりと立ち上がる。<br>手が小刻みに震えている。</div>
    </div>
  </div>

  <h2>セリフの書式</h2>
  <div style="background:var(--bg-hover);border-radius:var(--radius-md);padding:16px;font-family:monospace;font-size:13px;line-height:2;margin:14px 0">
    <div style="text-align:center;font-weight:700;color:var(--text-primary)">田中（怒りをこらえて）</div>
    <div style="text-align:center;color:var(--text-secondary)">それが本当のことだと思っているのか。</div>
    <div style="color:var(--text-muted);font-size:11px;margin-top:8px;text-align:center">キャラクター名（大文字または太字）→ （演技指示）→ セリフ本文</div>
  </div>
  <div class="article-callout kogane">
    <strong>演技指示（括弧内）について：</strong>「（笑いながら）」「（怒りをこらえて）」などは最小限に。俳優の演技を縛りすぎてはいけません。セリフ自体が感情を表せているなら不要。
  </div>

  <h2>日本のドラマ脚本の特徴</h2>
  <p>ハリウッド形式と日本のTV脚本には以下の違いがあります。</p>
  <div style="overflow-x:auto;margin:14px 0">
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr style="background:var(--kon-bg)">
          <th style="padding:8px 12px;text-align:left;color:var(--kon-lt);border-bottom:2px solid var(--kon-border)">項目</th>
          <th style="padding:8px 12px;text-align:left;color:var(--kon-lt);border-bottom:2px solid var(--kon-border)">ハリウッド形式</th>
          <th style="padding:8px 12px;text-align:left;color:var(--kon-lt);border-bottom:2px solid var(--kon-border)">日本TV形式</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:8px 12px;color:var(--text-secondary)">ページ長</td>
          <td style="padding:8px 12px;color:var(--text-secondary)">1ページ≒1分</td>
          <td style="padding:8px 12px;color:var(--text-secondary)">25〜30ページ（1話45分）</td>
        </tr>
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:8px 12px;color:var(--text-secondary)">シーンヘッダー</td>
          <td style="padding:8px 12px;color:var(--text-secondary)">英語大文字</td>
          <td style="padding:8px 12px;color:var(--text-secondary)">○番 場所 時刻</td>
        </tr>
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:8px 12px;color:var(--text-secondary)">キャラクター名</td>
          <td style="padding:8px 12px;color:var(--text-secondary)">中央揃え大文字</td>
          <td style="padding:8px 12px;color:var(--text-secondary)">左端・太字・括弧なし</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;color:var(--text-secondary)">ト書き</td>
          <td style="padding:8px 12px;color:var(--text-secondary)">左マージン1.5インチ</td>
          <td style="padding:8px 12px;color:var(--text-secondary)">Oで囲む・全角書き</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="article-callout fuji">
    <strong>まず大切なのは：</strong>完璧なフォーマットより「書き続けること」です。フォーマットは後から整えられます。ただし、プロの現場に提出する際は正しい書式が必須。
  </div>`;
}

// ── 新記事: テンションとペーシング ──────────────────────────────────────
function renderArticleTensionPacing() {
  return `
  <div class="article-callout beni">
    <i class="fas fa-wave-square" style="color:var(--accent);margin-right:8px;flex-shrink:0"></i>
    <strong>感情の「波形」</strong>——優れた物語は山と谷を繰り返します。ずっと高いテンションも、ずっと低いテンションも、観客は疲れてしまいます。
  </div>

  <h2>テンション曲線の設計</h2>
  <p>物語全体のテンション（緊張感）は、以下のような曲線を描くのが理想的です。</p>
  <div class="structure-diagram">
    <div class="structure-diagram-title"><i class="fas fa-wave-square"></i> 理想的なテンション曲線</div>
    <div style="position:relative;height:80px;background:var(--bg-hover);border-radius:var(--radius-sm);overflow:hidden;margin:10px 0">
      <svg width="100%" height="100%" viewBox="0 0 400 80" preserveAspectRatio="none">
        <polyline points="0,70 40,50 80,60 120,30 160,45 200,20 240,35 280,10 320,25 360,5 400,15" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
        <polyline points="0,70 400,70" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="4,4"/>
      </svg>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted)">
      <span>幕開け</span><span>中盤</span><span>クライマックス</span>
    </div>
  </div>

  <h2>緊張と弛緩のパターン</h2>
  <div class="beat-list">
    <div class="beat-item">
      <div class="beat-num" style="background:var(--accent)">↑</div>
      <div class="beat-content">
        <div class="beat-title">緊張を高める技法</div>
        <div class="beat-desc">時間制限を設定する・情報の隠蔽（観客は知っているがキャラは知らない）・対立の激化・予期しない裏切り</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--matcha)">↓</div>
      <div class="beat-content">
        <div class="beat-title">弛緩させる技法（必ず必要）</div>
        <div class="beat-desc">コメディリリーフ・キャラクター同士の穏やかな交流・回想シーン・勝利の瞬間（束の間の）</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--fuji)">⚡</div>
      <div class="beat-content">
        <div class="beat-title">サプライズの活用</div>
        <div class="beat-desc">予測を裏切ることでテンションが急上昇する。ただし「ルールの範囲内でのサプライズ」が重要。</div>
      </div>
    </div>
  </div>

  <h2>ペーシング（テンポ）のコントロール</h2>
  <p>「テンション」は感情の高低、「ペーシング」はシーンの速さです。この2つは独立して調整できます。</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0">
    <div style="background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:8px">⚡ 速いペース</div>
      <ul style="font-size:11.5px;color:var(--text-secondary);line-height:1.8;margin:0;padding-left:16px">
        <li>短いセリフの応酬</li>
        <li>素早い場面転換</li>
        <li>アクション多め</li>
        <li>ト書きを短く書く</li>
        <li>情報を素早く提示</li>
      </ul>
    </div>
    <div style="background:var(--kon-bg);border:1px solid var(--kon-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:11px;font-weight:700;color:var(--kon-lt);margin-bottom:8px">🌊 遅いペース</div>
      <ul style="font-size:11.5px;color:var(--text-secondary);line-height:1.8;margin:0;padding-left:16px">
        <li>長い沈黙・間</li>
        <li>1つの場面を丁寧に</li>
        <li>感情的な描写を増やす</li>
        <li>ト書きに詩的な文章</li>
        <li>情報を少しずつ開示</li>
      </ul>
    </div>
  </div>

  <h2>クライマックスへの積み上げ方</h2>
  <p>クライマックスが「最高潮」になるためには、それまでの積み上げが必要です。</p>
  <div class="article-callout matcha">
    <strong>積み上げの公式：</strong>問題を3回繰り返す → 毎回ステークス（賭けるもの）が大きくなる → 3回目が最大の試練 → クライマックス。これが「三度の繰り返し」のパターン。
  </div>

  <div class="article-callout kogane">
    <strong>実践チェック：</strong>あなたの脚本を振り返って、「テンションが同じ高さで続くシーン」がないか確認してください。意図的に「谷」を作ることで、次の「山」がより高く感じられます。
  </div>`;
}

function renderArticleSaveTheCatChart() {
  return `
  <div class="article-callout matcha">
    <i class="fas fa-cat" style="color:var(--matcha);margin-right:8px;flex-shrink:0"></i>
    このページでは <strong>Save the Cat! 15ビートシート</strong>を視覚的な図解で学びます。ビートの位置・割合・機能を一覧できる図表と、実際の物語への適用方法を紹介します。
  </div>

  <h2>ビートシートの全体構造</h2>
  <p>110ページの脚本に対応したビート配置を視覚化します。横軸がページ数（物語の進行）、各ビートの位置と機能を色分けで表示します。</p>

  <div class="stc-chart-wrapper">
    <div class="stc-acts-row">
      <div class="stc-act stc-act1">第一幕 (1〜25p)</div>
      <div class="stc-act stc-act2">第二幕前半 (25〜55p)</div>
      <div class="stc-act stc-act2b">第二幕後半 (55〜85p)</div>
      <div class="stc-act stc-act3">第三幕 (85〜110p)</div>
    </div>
    <div class="stc-timeline">
      <div class="stc-beat" style="left:0.9%;background:#6ba3be" title="p.1 オープニングイメージ"><span>①</span></div>
      <div class="stc-beat" style="left:4.5%;background:#7eb5c8" title="p.5 テーマの提示"><span>②</span></div>
      <div class="stc-beat" style="left:9%;background:#90c4d4" title="p.1-10 設定"><span>③</span></div>
      <div class="stc-beat stc-beat-key" style="left:10.9%;background:#3e8f7e" title="p.12 触媒"><span>④</span></div>
      <div class="stc-beat" style="left:19%;background:#90c4d4" title="p.12-25 議論"><span>⑤</span></div>
      <div class="stc-beat stc-beat-key" style="left:22.7%;background:#3e8f7e" title="p.25 第二幕突入"><span>⑥</span></div>
      <div class="stc-beat" style="left:27.3%;background:#b5d4a8" title="p.30 Bストーリー"><span>⑦</span></div>
      <div class="stc-beat" style="left:36%;background:#c8e0bc" title="p.30-55 楽しみと遊び"><span>⑧</span></div>
      <div class="stc-beat stc-beat-key" style="left:50%;background:#c9913d" title="p.55 ミッドポイント"><span>⑨</span></div>
      <div class="stc-beat" style="left:62%;background:#d4a87e" title="p.55-75 悪役の迫来"><span>⑩</span></div>
      <div class="stc-beat stc-beat-key" style="left:68.2%;background:#c0392b" title="p.75 すべてを失う"><span>⑪</span></div>
      <div class="stc-beat" style="left:75%;background:#d4706a" title="p.75-85 暗闇の魂"><span>⑫</span></div>
      <div class="stc-beat stc-beat-key" style="left:77.3%;background:#8e44ad" title="p.85 クライマックス突入"><span>⑬</span></div>
      <div class="stc-beat" style="left:86%;background:#b08fd4" title="p.85-110 クライマックス"><span>⑭</span></div>
      <div class="stc-beat" style="left:99%;background:#6ba3be" title="p.110 クロージングイメージ"><span>⑮</span></div>
    </div>
    <div class="stc-page-ruler">
      <span>p.1</span><span>p.25</span><span>p.55</span><span>p.75</span><span>p.85</span><span>p.110</span>
    </div>
  </div>

  <h2>15ビートの詳細・機能マップ</h2>
  <div class="stc-beat-grid">
    <div class="stc-beat-card stc-card-setup">
      <div class="stc-beat-card-header">第一幕 — 設定</div>
      <div class="stc-beat-item"><span class="stc-beat-no">①</span><span class="stc-beat-name">オープニングイメージ</span><span class="stc-beat-page">p.1</span><div class="stc-beat-role">物語のトーン・テーマを象徴する一場面。クロージングイメージと対比する</div></div>
      <div class="stc-beat-item"><span class="stc-beat-no">②</span><span class="stc-beat-name">テーマの提示</span><span class="stc-beat-page">p.5</span><div class="stc-beat-role">「あなたが変わるべきこと」が問いかけとして投げかけられる</div></div>
      <div class="stc-beat-item"><span class="stc-beat-no">③</span><span class="stc-beat-name">設定</span><span class="stc-beat-page">p.1-10</span><div class="stc-beat-role">主人公の日常・世界・欠如・人間関係を素早く描写</div></div>
      <div class="stc-beat-item stc-beat-item-key"><span class="stc-beat-no">④</span><span class="stc-beat-name">触媒（発端）</span><span class="stc-beat-page">p.12</span><div class="stc-beat-role">🔑 日常を壊す決定的な出来事。もう後戻りできない</div></div>
      <div class="stc-beat-item"><span class="stc-beat-no">⑤</span><span class="stc-beat-name">議論</span><span class="stc-beat-page">p.12-25</span><div class="stc-beat-role">主人公の葛藤・躊躇・準備。変化への抵抗</div></div>
      <div class="stc-beat-item stc-beat-item-key"><span class="stc-beat-no">⑥</span><span class="stc-beat-name">第二幕への突入</span><span class="stc-beat-page">p.25</span><div class="stc-beat-role">🔑 主人公が「逆さの世界」へ踏み込む決断</div></div>
    </div>
    <div class="stc-beat-card stc-card-fun">
      <div class="stc-beat-card-header">第二幕前半 — 楽しみと遊び</div>
      <div class="stc-beat-item"><span class="stc-beat-no">⑦</span><span class="stc-beat-name">Bストーリー</span><span class="stc-beat-page">p.30</span><div class="stc-beat-role">サブプロット開始（多くは恋愛・友情）。テーマの鏡</div></div>
      <div class="stc-beat-item"><span class="stc-beat-no">⑧</span><span class="stc-beat-name">楽しみと遊び</span><span class="stc-beat-page">p.30-55</span><div class="stc-beat-role">観客が期待していたシーン。「売り」の見せ場</div></div>
      <div class="stc-beat-item stc-beat-item-key"><span class="stc-beat-no">⑨</span><span class="stc-beat-name">ミッドポイント</span><span class="stc-beat-page">p.55</span><div class="stc-beat-role">🔑 表面的勝利か最低点。主人公の認識が変わる転換</div></div>
    </div>
    <div class="stc-beat-card stc-card-dark">
      <div class="stc-beat-card-header">第二幕後半 — 暗闇へ</div>
      <div class="stc-beat-item"><span class="stc-beat-no">⑩</span><span class="stc-beat-name">悪役の迫来</span><span class="stc-beat-page">p.55-75</span><div class="stc-beat-role">障害が激化。主人公の計画が崩れ始める</div></div>
      <div class="stc-beat-item stc-beat-item-key"><span class="stc-beat-no">⑪</span><span class="stc-beat-name">すべてを失う</span><span class="stc-beat-page">p.75</span><div class="stc-beat-role">🔑 最大の失敗・喪失。物語の底（最低点）</div></div>
      <div class="stc-beat-item"><span class="stc-beat-no">⑫</span><span class="stc-beat-name">暗闇の魂</span><span class="stc-beat-page">p.75-85</span><div class="stc-beat-role">深刻な疑念と絶望。変化の直前の最も暗い瞬間</div></div>
    </div>
    <div class="stc-beat-card stc-card-climax">
      <div class="stc-beat-card-header">第三幕 — クライマックス</div>
      <div class="stc-beat-item stc-beat-item-key"><span class="stc-beat-no">⑬</span><span class="stc-beat-name">クライマックスへの突入</span><span class="stc-beat-page">p.85</span><div class="stc-beat-role">🔑 主人公が変化した姿で最終決戦へ向かう決断</div></div>
      <div class="stc-beat-item"><span class="stc-beat-no">⑭</span><span class="stc-beat-name">クライマックス</span><span class="stc-beat-page">p.85-110</span><div class="stc-beat-role">主人公が変化した姿で最大の障害に立ち向かう</div></div>
      <div class="stc-beat-item stc-beat-item-key"><span class="stc-beat-no">⑮</span><span class="stc-beat-name">クロージングイメージ</span><span class="stc-beat-page">p.110</span><div class="stc-beat-role">🔑 ①と対比。変化を示す最終場面</div></div>
    </div>
  </div>

  <h2>ビートの比率と機能</h2>
  <div class="stc-ratio-chart">
    <div class="stc-ratio-bar">
      <div style="width:22.7%;background:#3e8f7e;padding:6px 4px;font-size:10px;color:#fff;text-align:center;border-radius:4px 0 0 4px">第一幕<br>25%</div>
      <div style="width:27.3%;background:#b5d4a8;padding:6px 4px;font-size:10px;color:#2d5a27;text-align:center">楽しみ&遊び<br>30%</div>
      <div style="width:27.3%;background:#c0392b;padding:6px 4px;font-size:10px;color:#fff;text-align:center">暗闇へ<br>27%</div>
      <div style="width:22.7%;background:#8e44ad;padding:6px 4px;font-size:10px;color:#fff;text-align:center;border-radius:0 4px 4px 0">第三幕<br>23%</div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-top:4px;padding:0 2px">
      <span>p.1</span><span>p.25</span><span>p.55</span><span>p.75 p.85</span><span>p.110</span>
    </div>
  </div>

  <h2>物語の「変化」の軸</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0">
    <div style="background:var(--bg-hover);border-radius:var(--radius-sm);padding:14px;border-left:3px solid var(--accent)">
      <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:6px">幕開け（オープニングイメージ）</div>
      <div style="font-size:12px;color:var(--text-secondary)">主人公の「欠如した状態」「変化前」の世界</div>
    </div>
    <div style="background:var(--bg-hover);border-radius:var(--radius-sm);padding:14px;border-left:3px solid var(--matcha)">
      <div style="font-size:11px;font-weight:700;color:var(--matcha);margin-bottom:6px">幕末（クロージングイメージ）</div>
      <div style="font-size:12px;color:var(--text-secondary)">主人公の「成長した状態」「変化後」の世界</div>
    </div>
  </div>

  <div class="article-callout matcha">
    <strong>図表の使い方：</strong>まずあなたの物語の「触媒（p.12）」「ミッドポイント（p.55）」「すべてを失う（p.75）」の3つの転換点を書き出してみてください。これらが決まれば、物語の骨格が完成します。
  </div>`;
}

function renderArticleScenarioTen() {
  const items = [
    {
      no: 1,
      en: 'Situations',
      ja: '展開',
      icon: 'fa-sitemap',
      color: 'var(--accent)',
      bg: 'var(--accent-bg)',
      desc: '物語が「動く」ためのシチュエーション設計。主人公が置かれる状況・環境・制約を意図的に設計する。良い展開は「主人公が選択しなければならない状況」を作り出す。',
      tips: ['主人公に「逃げ場のない状況」を作る', '時間・場所・人間関係の制約が展開を生む', 'どんな展開も「主人公の欲求」に直結させる'],
    },
    {
      no: 2,
      en: 'Destiny / Secret',
      ja: '宿命',
      icon: 'fa-star',
      color: 'var(--kogane)',
      bg: 'var(--kogane-bg)',
      desc: '主人公が逃れられない「宿命」や「隠された秘密」。これが明かされる時に物語は劇的に動く。観客が知っていて主人公が知らない情報（ドラマティック・アイロニー）も含まれる。',
      tips: ['宿命は早めに示唆し、後半で明かす', '「秘密」は主人公と観客の関係を作る', '宿命を知った時のキャラクターの反応を準備する'],
    },
    {
      no: 3,
      en: 'Treasure',
      ja: '宝物',
      icon: 'fa-gem',
      color: 'var(--fuji)',
      bg: 'var(--fuji-bg)',
      desc: '主人公が追い求める「宝物」。物理的な目標（金・地位・人）だけでなく、精神的な目標（愛・認知・自己受容）も含む。主人公の「欲求（Want）」と「必要（Need）」の違いが物語の深みを生む。',
      tips: ['外的宝物（Want）と内的宝物（Need）を区別する', '宝物への道のりが物語の骨格', '宝物を得た時に主人公はどう変わるか'],
    },
    {
      no: 4,
      en: 'Turning Point',
      ja: '決意',
      icon: 'fa-rotate',
      color: 'var(--matcha)',
      bg: 'var(--matcha-bg)',
      desc: '物語を転換させる「決意の瞬間」。主人公が大きな選択をする場面。この選択が主人公のキャラクターを最もよく表す。観客は「もし自分なら？」と自問させられる。',
      tips: ['決意は「選択肢がある状態」で行わせる', '決意の前後でキャラクターが変わる', '最良の決意は「コスト」を伴う'],
    },
    {
      no: 5,
      en: 'Feels',
      ja: '感動',
      icon: 'fa-heart',
      color: 'var(--momo)',
      bg: 'var(--momo-bg)',
      desc: '観客の感情を揺さぶる「感動の瞬間」。涙・笑い・恐怖・驚き——感情なき物語は記憶に残らない。感動は「期待を外す」か「期待を超える」ことで生まれる。',
      tips: ['感動は「準備」があって初めて生まれる', '笑いと涙は紙一重——悲劇の直後に笑いを入れる', '感情の「振れ幅」が感動の大きさを決める'],
    },
    {
      no: 6,
      en: 'Climax',
      ja: '山場',
      icon: 'fa-mountain',
      color: 'var(--accent)',
      bg: 'var(--accent-bg)',
      desc: '物語の頂点——すべての要素が集結する「山場」。最大の緊張・最大のステークス・最大の対決。山場は第二幕で積み上げてきたものをすべて解放する瞬間。',
      tips: ['山場は「主人公が最も変化する場面」', '山場では主人公自身が問題を解決しなければならない', '山場の前に必ず「最低点」を置く'],
    },
    {
      no: 7,
      en: 'Finale',
      ja: '終演',
      icon: 'fa-flag-checkered',
      color: 'var(--kon-lt)',
      bg: 'var(--kon-bg)',
      desc: '山場の後の「収束」。世界の新しい秩序を示し、キャラクターの変化を確認する。終演は「変化後の新しい日常」を垣間見せる。余韻が次の感情を生む。',
      tips: ['終演は短く、余韻を残す', '「元の世界に戻ったが何かが変わった」を見せる', 'オープニングと呼応させることで物語が完結する'],
    },
    {
      no: 8,
      en: 'Theme',
      ja: '題目',
      icon: 'fa-quote-left',
      color: 'var(--asagi)',
      bg: 'var(--asagi-bg)',
      desc: '物語が伝えようとする「テーマ（主題）」。テーマは「メッセージ」ではなく「問い」として機能するのが理想。観客が自分自身の答えを見つける余地を残す。',
      tips: ['テーマは台詞で説明せず、出来事で示す', '主人公の変化がそのままテーマを表す', '題目は最初から決めてもよいし、書いた後に発見してもよい'],
    },
    {
      no: 9,
      en: 'Pinch / Defect',
      ja: '乱調',
      icon: 'fa-bolt',
      color: 'var(--kogane)',
      bg: 'var(--kogane-bg)',
      desc: '物語のリズムを揺さぶる「乱れ」や「欠陥」。完璧に進む物語は退屈になる。意図的な乱調——予想外の展開、キャラクターの失敗、サブプロットの割り込み——がテンションを維持する。',
      tips: ['乱調は「予測可能な展開」の前後に置く', 'キャラクターの欠陥が乱調を生み出す', '乱調からの回復がキャラクターの成長を示す'],
    },
    {
      no: 10,
      en: 'Antagonist',
      ja: '敵役',
      icon: 'fa-user-slash',
      color: '#d01050',
      bg: '#fde8ef',
      desc: '主人公の目標を阻む「敵役（アンタゴニスト）」。人物である必要はない——自然・社会・自分自身の内面が敵役でもよい。優れた敵役は主人公と同じくらい強く、動機が理解できる。',
      tips: ['敵役の目的は「主人公と同じゴール」が効果的', '敵役の視点でも物語が成立することを確認する', '敵役は主人公の「影（シャドー）」として設計する'],
    },
  ];

  return `
  <div class="article-callout beni">
    <i class="fas fa-scroll" style="color:var(--accent);margin-right:8px;flex-shrink:0"></i>
    <strong>シナリオ十箇条</strong>は日本の脚本術で語り継がれる10の根本原則です。物語を「動かす力」の源泉を10の観点から整理し、執筆の指針として活用します。
  </div>

  <h2>10の原則一覧</h2>
  <div class="sct-overview">
    ${items.map(it => `
    <div class="sct-overview-item" style="border-color:${it.color};background:${it.bg}">
      <div class="sct-ov-no" style="color:${it.color}">${it.no}</div>
      <div class="sct-ov-content">
        <div class="sct-ov-en" style="color:${it.color}">${it.en}</div>
        <div class="sct-ov-ja">${it.ja}</div>
      </div>
      <i class="fas ${it.icon} sct-ov-icon" style="color:${it.color}"></i>
    </div>`).join('')}
  </div>

  <h2>各原則の詳細</h2>
  ${items.map(it => `
  <div class="sct-item-card">
    <div class="sct-item-header" style="background:${it.bg};border-left:4px solid ${it.color}">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;background:${it.color};border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px;flex-shrink:0">${it.no}</div>
        <div>
          <div style="font-size:13px;font-weight:700;color:${it.color}">${it.ja} <span style="font-weight:400;color:var(--text-muted);font-size:11px">（${it.en}）</span></div>
          <div style="font-size:10px;color:var(--text-muted)"><i class="fas ${it.icon}" style="margin-right:4px"></i>${it.desc.slice(0,40)}…</div>
        </div>
      </div>
    </div>
    <div class="sct-item-body">
      <p style="font-size:13px;line-height:1.75;color:var(--text-secondary);margin:0 0 12px">${it.desc}</p>
      <div style="background:var(--bg-page);border-radius:var(--radius-sm);padding:10px 12px">
        <div style="font-size:10.5px;font-weight:700;color:${it.color};margin-bottom:6px"><i class="fas fa-lightbulb" style="margin-right:4px"></i>実践ポイント</div>
        <ul style="margin:0;padding-left:16px">
          ${it.tips.map(tip => `<li style="font-size:12px;color:var(--text-secondary);margin-bottom:3px">${tip}</li>`).join('')}
        </ul>
      </div>
    </div>
  </div>`).join('')}

  <div class="article-callout kogane">
    <strong>活用法：</strong>脚本を書く前に10箇条それぞれについて1〜2行メモしてみましょう。特に「敵役」「宿命」「宝物」の3つを明確にするだけで、物語の骨格が大きく固まります。
  </div>`;
}

// ── 感情設計マスターガイド ──────────────────────────────────────
function renderArticleEmotionalDesign() {
  return `
  <h2>感情は「設計」できる</h2>
  <p>観客が涙を流したり、心が震えたりする瞬間は、偶然の産物ではありません。熟練した脚本家は、感情を意図的に計算し、配置し、振れ幅を設計しています。これを<strong>感情設計（Emotional Engineering）</strong>と呼びます。</p>

  <div class="article-callout beni">
    <strong>感情設計の黄金律：</strong>観客に感情を「語らせる」のではなく、感情を「体験させる」。
  </div>

  <h2>感情の7種類と脚本への応用</h2>
  ${[
    { name:'喜び・高揚', icon:'fa-face-smile', color:'var(--kogane)', desc:'目標達成・再会・笑い。クライマックス後に配置。長く続けると感動が薄れる。', tip:'喜びの前に「苦労」を置くほど増幅される' },
    { name:'悲しみ・喪失', icon:'fa-face-sad-tear', color:'var(--fuji)', desc:'別れ・死・失敗。最も強い感情の一つ。「何かを失う」シーンで発生。', tip:'観客が喪失の大きさを理解した瞬間に爆発する' },
    { name:'恐怖・緊張', icon:'fa-face-grimace', color:'var(--accent)', desc:'未知・脅威・タイムプレッシャー。長すぎると麻痺。短く鋭く使う。', tip:'「何かが起こりそう」という予感が恐怖より怖い' },
    { name:'怒り・義憤', icon:'fa-face-angry', color:'var(--momo)', desc:'不正義・裏切り・弱者への攻撃。観客の味方を作る最強の道具。', tip:'観客が主人公に「怒れ！」と思う瞬間が理想' },
    { name:'共感・感情移入', icon:'fa-heart', color:'var(--matcha)', desc:'「自分もそう思う」「分かる」という感覚。物語の接着剤。', tip:'主人公の弱点や失敗が共感を生む' },
    { name:'驚き・意外性', icon:'fa-bolt', color:'var(--asagi)', desc:'予想外の展開・情報。強く使いすぎると安っぽくなる。', tip:'伏線を張って「そうだったのか！」を作る' },
    { name:'希望・期待', icon:'fa-star', color:'var(--kon-lt)', desc:'「きっと上手くいく」という感覚。暗い話でも希望の光を置く。', tip:'絶望の底で希望を見せると感情が最大化する' },
  ].map(e => `
  <div style="display:flex;gap:12px;padding:12px;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;align-items:flex-start">
    <div style="width:36px;height:36px;border-radius:50%;background:${e.color}20;display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <i class="fas ${e.icon}" style="color:${e.color};font-size:15px"></i>
    </div>
    <div style="flex:1">
      <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:3px">${e.name}</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:5px;line-height:1.6">${e.desc}</div>
      <div style="font-size:11.5px;color:${e.color};font-weight:600"><i class="fas fa-lightbulb" style="font-size:10px;margin-right:4px"></i>${e.tip}</div>
    </div>
  </div>`).join('')}

  <h2>感情曲線の設計法</h2>
  <p>物語全体の感情の動きを<strong>感情曲線（Emotional Arc）</strong>として視覚化します。良い物語は平坦ではなく、山と谷を繰り返しながら最終的に最高点（クライマックス）に向かいます。</p>

  <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin:16px 0">
    <div style="font-size:13px;font-weight:700;margin-bottom:12px;font-family:'Noto Serif JP',serif">感情曲線の基本パターン</div>
    ${[
      { name:'W字型（最も使われる）', desc:'感情が上下を繰り返しながら最終的に最高点に。三幕構成に対応。', color:'var(--kogane)' },
      { name:'カタルシス型', desc:'長い下降→急激な上昇。「どん底からの復活」パターン。最も感動的。', color:'var(--accent)' },
      { name:'悲劇型', desc:'上昇→急激な下降。観客に強い余韻を残す。芸術的作品に多い。', color:'var(--fuji)' },
      { name:'平静→嵐→平静', desc:'日常→事件→新たな日常。成長物語の基本。', color:'var(--matcha)' },
    ].map(p => `
    <div style="display:flex;gap:10px;margin-bottom:8px;align-items:center">
      <div style="width:8px;height:8px;border-radius:50%;background:${p.color};flex-shrink:0"></div>
      <div>
        <span style="font-size:12px;font-weight:600;color:${p.color}">${p.name}：</span>
        <span style="font-size:12px;color:var(--text-secondary)">${p.desc}</span>
      </div>
    </div>`).join('')}
  </div>

  <h2>カタルシスを生む3つの条件</h2>
  <p>アリストテレスが提唱した<strong>カタルシス（感情の浄化）</strong>は、観客が感情的解放を経験する瞬間です。強いカタルシスには3つの条件が必要です。</p>
  <div class="article-callout matcha">
    <ol style="padding-left:18px;margin:0">
      <li style="margin-bottom:6px"><strong>感情的投資：</strong>観客がキャラクターに深く共感している（カタルシス前の感情の蓄積）</li>
      <li style="margin-bottom:6px"><strong>感情的障害：</strong>その感情が長時間抑圧・緊張させられている（エネルギーの蓄積）</li>
      <li><strong>感情的解放：</strong>決定的なシーンで一気に解放される（爆発・浄化）</li>
    </ol>
  </div>

  <h2>実践：感情マップを作る</h2>
  <p>脚本を書く前に、シーンごとに「どの感情を、どの強度で、観客に体験させたいか」をリストアップしましょう。これを<strong>感情マップ</strong>と呼びます。</p>

  <div class="article-callout kon">
    <strong>練習：</strong>好きな映画・ドラマのシーンを10個選び、それぞれが観客に与える感情と強度（1〜10）を書き出してみましょう。パターンが見えてきます。
  </div>`;
}

// ── アクト2突破法 ─────────────────────────────────────────────
function renderArticleAct2Breakthrough() {
  const strategies = [
    {
      no: 1,
      title: 'ミッドポイントを最大化する',
      icon: 'fa-crosshairs',
      color: 'var(--accent)',
      bg: 'var(--accent-bg)',
      desc: 'アクト2の中央（全体の50%地点）に「偽りの勝利」か「偽りの敗北」を置く。これがアクト2を前半・後半に分割し、失速を防ぐ。',
      example: '例：主人公がゴールに一時的に近づく（偽りの勝利）か、最悪の状況に陥る（偽りの敗北）。',
    },
    {
      no: 2,
      title: 'サブプロットで主プロットを補強する',
      icon: 'fa-code-branch',
      color: 'var(--fuji)',
      bg: 'var(--fuji-bg)',
      desc: 'サブプロット（恋愛・友情・サイドキャラの物語）をアクト2に組み込む。主プロットが停滞する時間を埋め、テーマを別角度から補強する。',
      example: '例：犯罪捜査もの（主プロット）に、主人公の家庭の問題（サブプロット）を絡める。',
    },
    {
      no: 3,
      title: '「見かけ上の解決」を挟む',
      icon: 'fa-magnifying-glass',
      color: 'var(--matcha)',
      bg: 'var(--matcha-bg)',
      desc: 'アクト2中盤で一度「問題が解決しそう」な場面を作り、すぐに覆す。観客のエネルギーをリセットして後半への期待を高める。',
      example: '例：「これで全部解決だ」→「いや、実はもっと深刻な問題があった」という流れ。',
    },
    {
      no: 4,
      title: 'キャラクターの内的変化を可視化する',
      icon: 'fa-person-walking',
      color: 'var(--kogane)',
      bg: 'var(--kogane-bg)',
      desc: 'アクト2は外的な事件だけでなく、キャラクターの内面が変化するフェーズ。変化の「前」「途中」「後」を具体的なシーンで示す。',
      example: '例：「嘘をつくことへの罪悪感」が徐々に表れるシーンを3〜4回挟む。',
    },
    {
      no: 5,
      title: '時計を見せる（タイムプレッシャー）',
      icon: 'fa-clock',
      color: 'var(--momo)',
      bg: 'var(--momo-bg)',
      desc: '締め切り・制限時間・迫り来る脅威をアクト2に組み込む。観客に「急いで！」という緊張感を持続させる。',
      example: '例：「3日以内に証拠を見つけなければ無実の人が処刑される」。',
    },
    {
      no: 6,
      title: 'ダークナイト（最暗部）を設計する',
      icon: 'fa-moon',
      color: 'var(--kon-lt)',
      bg: 'var(--kon-bg)',
      desc: 'アクト2終盤（75%地点）で主人公が最も深い絶望に落ちる「ダークナイト・オブ・ソウル」を置く。ここからアクト3への反転が生まれる。',
      example: '例：仲間を失い、目標は届かず、帰る場所もなく…という状況。',
    },
  ];

  return `
  <h2>アクト2とは何か</h2>
  <p>三幕構成において、アクト2（第二幕）は全体の約<strong>50%</strong>を占める最長の幕です。主人公が目標に向かって行動し、様々な障害にぶつかり、内的・外的に変化していく過程を描きます。</p>
  <div class="article-callout beni">
    <strong>アクト2が難しい理由：</strong>アクト1は「物語を始める」という明確な目標、アクト3は「物語を終わらせる」という目標があります。しかしアクト2は「物語を進める」という漠然とした目標しかなく、脚本家はここで行き詰まりやすくなります。
  </div>

  <h2>6つの突破戦略</h2>
  ${strategies.map(s => `
  <div style="border:1px solid var(--border);border-left:4px solid ${s.color};border-radius:var(--radius);padding:16px;margin-bottom:12px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <div style="width:32px;height:32px;border-radius:50%;background:${s.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="fas ${s.icon}" style="color:${s.color};font-size:13px"></i>
      </div>
      <div>
        <span style="font-size:11px;color:${s.color};font-weight:700;letter-spacing:.05em">戦略 ${s.no}</span>
        <div style="font-size:14px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">${s.title}</div>
      </div>
    </div>
    <p style="font-size:13px;line-height:1.75;color:var(--text-secondary);margin:0 0 8px">${s.desc}</p>
    <div style="background:${s.bg};border-radius:var(--radius-sm);padding:8px 12px;font-size:12px;color:var(--text-secondary)">
      <i class="fas fa-film" style="color:${s.color};font-size:10px;margin-right:5px"></i>${s.example}
    </div>
  </div>`).join('')}

  <h2>アクト2の時間配分（モデル）</h2>
  <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin:16px 0">
    ${[
      { range:'25-37.5%', label:'アクト2前半：新世界への適応', color:'var(--matcha)', desc:'主人公が新しい状況・目標・仲間に慣れていく。' },
      { range:'37.5-50%', label:'ミッドポイント', color:'var(--kogane)', desc:'偽りの勝利 or 偽りの敗北。物語の転換点。' },
      { range:'50-62.5%', label:'アクト2後半：エスカレーション', color:'var(--accent)', desc:'主人公が積極的に行動し、危機が高まる。' },
      { range:'62.5-75%', label:'ダークナイト（最暗部）', color:'var(--fuji)', desc:'全てを失う。絶望の底。アクト3への反転準備。' },
    ].map(t => `
    <div style="display:flex;gap:10px;margin-bottom:10px;align-items:flex-start">
      <div style="min-width:80px;font-size:10px;font-weight:700;color:${t.color};padding-top:2px">${t.range}</div>
      <div>
        <div style="font-size:12.5px;font-weight:600;color:var(--text-primary)">${t.label}</div>
        <div style="font-size:12px;color:var(--text-muted)">${t.desc}</div>
      </div>
    </div>`).join('')}
  </div>

  <div class="article-callout kogane">
    <strong>自己診断：</strong>「アクト2で詰まった」と感じたら、ミッドポイントが明確かどうか確認してください。多くの場合、50%地点に劇的な転換がないことが原因です。
  </div>`;
}

// ── プロの推敲術 ──────────────────────────────────────────────
function renderArticleProfessionalRevision() {
  const stages = [
    {
      stage: 1,
      title: '大局読み — 全体像を俯瞰する',
      icon: 'fa-binoculars',
      color: 'var(--accent)',
      bg: 'var(--accent-bg)',
      desc: '初稿を「連続して一気に読む」。この段階では何も直さない。物語の流れ、感情の動き、大きな矛盾を把握する。',
      check: ['物語全体の感情曲線は山と谷があるか', '主人公の欲求は一貫しているか', '全体の読後感は意図した通りか'],
    },
    {
      stage: 2,
      title: '構造チェック — 幕と転換点の確認',
      icon: 'fa-diagram-project',
      color: 'var(--fuji)',
      bg: 'var(--fuji-bg)',
      desc: '三幕構成・ビートシートなどの構造フレームワークと照らし合わせる。各転換点（ターニングポイント）が機能しているか確認。',
      check: ['アクト1の終わりに「世界の変化」があるか', 'ミッドポイントが明確か', 'アクト2のダークナイトが十分に暗いか', 'クライマックスが物語の全テーマを体現しているか'],
    },
    {
      stage: 3,
      title: 'シーン整理 — 不要シーンの削除',
      icon: 'fa-scissors',
      color: 'var(--matcha)',
      bg: 'var(--matcha-bg)',
      desc: '各シーンに「このシーンがなければ物語は成立するか？」と問う。Yesなら削除候補。残すシーンは必ず複数の役割（情報提供＋感情＋伏線など）を果たすこと。',
      check: ['このシーンで観客は何かを学ぶか', 'このシーンはキャラクターの内的変化を示すか', 'このシーンは次のシーンへの橋渡しをするか'],
    },
    {
      stage: 4,
      title: 'セリフの磨き上げ',
      icon: 'fa-comments',
      color: 'var(--kogane)',
      bg: 'var(--kogane-bg)',
      desc: '各キャラクターのセリフを音読する。長すぎるセリフを切る。「言わなくても分かること」は削除。各キャラクターの声が区別できるか確認する。',
      check: ['同じことを2回言っていないか', '直接的すぎるセリフ（サブテキストがないか）', 'このセリフはこのキャラクターらしいか', 'テーマを「語らせて」いないか'],
    },
    {
      stage: 5,
      title: 'ト書き・情景描写の精査',
      icon: 'fa-align-left',
      color: 'var(--momo)',
      bg: 'var(--momo-bg)',
      desc: '日本式ト書きの場合、動作・状況のみを書く。感情・心理を直接書かない。映像で見せることを意識。4行以上のト書きは分割するか短縮する。',
      check: ['カメラでは写せない内面描写を書いていないか', '動詞は具体的で生き生きしているか', '読み手が映像をイメージできるか'],
    },
    {
      stage: 6,
      title: 'テクニカルチェック',
      icon: 'fa-gear',
      color: 'var(--asagi)',
      bg: 'var(--asagi-bg)',
      desc: 'フォーマット・表記の統一。キャラクター名の統一、時制の一貫性、柱書きの正確さ、ページ数のバランス確認。',
      check: ['キャラクター名の表記が一致しているか', '柱書きのフォーマットが正しいか', '1シーンが長すぎないか（3〜5分が目安）', '全体のページ数は適切か'],
    },
    {
      stage: 7,
      title: '最終読み — 他者の目で読む',
      icon: 'fa-eye',
      color: 'var(--kon-lt)',
      bg: 'var(--kon-bg)',
      desc: '数日間距離を置いた後、「初めて読む読者」の視点で通読する。または信頼できる人に読んでもらい、感情の反応を確認する。',
      check: ['最初の10ページで引き込まれるか', 'どこかで読み飛ばしたくなる場所はないか', '最後まで読んだ後、誰かに話したくなるか'],
    },
  ];

  return `
  <h2>「初稿は捨て稿」の本当の意味</h2>
  <p>ヘミングウェイは「すべての初稿はクソだ」と言いました。これは初稿をバカにしているのではなく、推敲こそが脚本執筆の本質だという宣言です。初稿は「素材の発見」、推敲は「彫刻」です。</p>
  <div class="article-callout beni">
    <strong>重要な心構え：</strong>初稿で完璧を目指さない。まず書き切ることに集中し、推敲で磨く。多くの脚本家は初稿を7〜10回書き直します。
  </div>

  <h2>7段階推敲プロセス</h2>
  ${stages.map(s => `
  <div style="border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:12px;position:relative;padding-left:52px">
    <div style="position:absolute;left:16px;top:16px;width:28px;height:28px;border-radius:50%;background:${s.bg};border:2px solid ${s.color};display:flex;align-items:center;justify-content:center">
      <span style="font-size:11px;font-weight:800;color:${s.color}">${s.stage}</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <i class="fas ${s.icon}" style="color:${s.color};font-size:13px"></i>
      <span style="font-size:14px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">${s.title}</span>
    </div>
    <p style="font-size:13px;line-height:1.75;color:var(--text-secondary);margin:0 0 10px">${s.desc}</p>
    <div style="background:${s.bg};border-radius:var(--radius-sm);padding:10px 12px">
      <div style="font-size:10.5px;font-weight:700;color:${s.color};margin-bottom:6px">チェックリスト</div>
      <ul style="margin:0;padding-left:16px">
        ${s.check.map(c => `<li style="font-size:12px;color:var(--text-secondary);margin-bottom:3px">${c}</li>`).join('')}
      </ul>
    </div>
  </div>`).join('')}

  <h2>「殺すのが惜しい愛着」に注意</h2>
  <p>推敲で最も難しいのは、自分が気に入っているシーンやセリフを削除することです。作家はこれを<strong>「殺すのが惜しい愛着（Kill Your Darlings）」</strong>と呼びます。</p>
  <div class="article-callout kogane">
    <strong>原則：</strong>「このシーンが好きだから残す」ではなく「このシーンが物語に必要だから残す」で判断してください。削除したシーンは「書き溜め」として別ファイルに保存しておきましょう。後で別の作品で使えることがあります。
  </div>`;
}

function renderArticleGenreConventions() {
  return `
  <div class="article-callout fuji">
    ジャンルは「観客との約束」です。その約束を守りながらどこかで裏切ることで、印象に残る作品になります。
  </div>
  <h2>ジャンルとは観客との契約</h2>
  <p>ホラーを観に行った観客は「怖がらせてくれ」という期待を持っています。コメディを観に行った観客は「笑わせてくれ」という期待を持っています。この期待を無視することはできません。しかし、期待通りにすべてを満たすだけでは「凡作」になります。</p>
  <div class="article-callout kogane">
    <strong>鉄則：</strong>ジャンルの定石を「知った上で」破ること。定石を知らずに破ると単なる失敗作になります。
  </div>
  <h2>主要ジャンルの定石と裏切り方</h2>
  <div class="beat-list">
    <div class="beat-item">
      <div class="beat-num" style="background:var(--momo)">🎭</div>
      <div class="beat-content">
        <div class="beat-title">ホラー</div>
        <div class="beat-desc"><strong>定石：</strong>孤立した場所、徐々に迫る恐怖、キャラクターの愚かな行動、謎の解明。<br><strong>裏切り方：</strong>怪物を日常に持ち込む（「ゲット・アウト」）、ホラーを家族ドラマに変換する（「ヘレディタリー」）</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--kogane)">😄</div>
      <div class="beat-content">
        <div class="beat-title">コメディ</div>
        <div class="beat-desc"><strong>定石：</strong>誤解・すれ違い・立場の逆転、笑いのリズム（テンポ）、フィジカル・バーバル・シチュエーション。<br><strong>裏切い方：</strong>社会問題をコメディで包む（「SORRY TO BOTHER YOU」）、真剣な感情をコメディの中に突然挿入</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--kon-lt)">🔍</div>
      <div class="beat-content">
        <div class="beat-title">サスペンス・ミステリー</div>
        <div class="beat-desc"><strong>定石：</strong>謎の提示→手がかりの収集→誤方向→解決。情報の非対称性（観客は知っているが主人公は知らない）。<br><strong>裏切い方：</strong>「誰が」より「なぜ」を問う構造（心理サスペンス）、探偵が犯人だった</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--fuji)">💙</div>
      <div class="beat-content">
        <div class="beat-title">ラブストーリー</div>
        <div class="beat-desc"><strong>定石：</strong>出会い・引力・障害・危機・再結合。「おじゃまキャラ」の存在。「人は変われる」というメッセージ。<br><strong>裏切り方：</strong>ハッピーエンドにしない（「ラ・ラ・ランド」）、愛の定義を問い直す（「her/世界でひとつの彼女」）</div>
      </div>
    </div>
  </div>
  <h2>ジャンルミックスの技法</h2>
  <p>現代の優れた映画・ドラマの多くはジャンルをミックスしています。コメディ×ホラー（「ジョーダン・ピール作品」）、SF×恋愛（「エターナル・サンシャイン」）、ファンタジー×社会問題（「シェイプ・オブ・ウォーター」）。</p>
  <div class="article-callout matcha">
    <strong>実践：</strong>次に観る映画・ドラマで「このジャンルの定石は何か？」「どこで裏切っているか？」を意識して観てみてください。これが最速の勉強法です。
  </div>`;
}

function renderArticleWorldBuilding() {
  return `
  <div class="article-callout asagi">
    優れた世界観設計は「見せる」もの。「私の世界にはこんなルールがあります」と説明するのではなく、観客に自然に「体験」させます。
  </div>
  <h2>世界観設計の基本原則</h2>
  <p>SF・ファンタジー・時代劇など、リアルとは異なる世界を舞台にする場合、世界観設計は脚本作業の核心になります。しかし多くの初心者がはまる罠があります。</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0">
    <div style="background:var(--momo-bg);border:1px solid var(--momo-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:12px;font-weight:700;color:var(--momo);margin-bottom:8px">❌ 設定説明の罠</div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.8">「この世界では魔法は17歳以下しか使えません。なぜならば……」と冒頭から延々と説明するオープニング。観客は眠る。</div>
    </div>
    <div style="background:var(--matcha-bg);border:1px solid var(--matcha-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:12px;font-weight:700;color:var(--matcha);margin-bottom:8px">✅ 体験から学ばせる</div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.8">「18歳になった主人公が魔法を使おうとして失敗する」→観客は「大人になると使えないのか」と自然に学ぶ。</div>
    </div>
  </div>
  <h2>世界観の3レイヤー構造</h2>
  <div class="beat-list">
    <div class="beat-item"><div class="beat-num" style="background:var(--asagi)">表</div><div class="beat-content"><div class="beat-title">表層（Surface）: 観客に見えるもの</div><div class="beat-desc">衣装・建築・テクノロジー・言語。これが「世界の顔」。凝りすぎると本末転倒。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--kon-lt)">中</div><div class="beat-content"><div class="beat-title">中層（Rules）: 世界のルール</div><div class="beat-desc">物理法則・魔法のコスト・権力構造。主人公と対立に影響するルールを優先設計。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--fuji)">深</div><div class="beat-content"><div class="beat-title">深層（History）: 歴史と文化</div><div class="beat-desc">なぜこの世界はこうなっているか。観客には見えなくても作者は知っている必要がある。</div></div></div>
  </div>
  <h2>情報の出し方：砂糖の一粒ずつ</h2>
  <p>世界観情報は「物語が必要とするタイミング」で出す。これが「Need-to-Know Principle（知る必要があるときの原則）」です。</p>
  <div class="article-callout kogane">
    <strong>実践ワーク：</strong>あなたの世界観設定リストを作り、「この情報はどのシーンで必要になるか」を書き込んでください。必要なシーンがない情報は削除またはメモに留めておく。
  </div>`;
}

function renderArticleOpeningScenes() {
  return `
  <div class="article-callout beni">
    プロデューサーや評価者が脚本を読むとき、最初の10ページで「読み続けるかどうか」を決めます。10ページは命綱です。
  </div>
  <h2>最初の10ページが持つべき5つの要素</h2>
  <div class="beat-list">
    <div class="beat-item"><div class="beat-num" style="background:var(--accent)">1</div><div class="beat-content"><div class="beat-title">フック（引き）</div><div class="beat-desc">冒頭1〜3ページで「これはどんな話だろう」という疑問・緊張・好奇心を生む出来事。映像的なインパクトが効果的。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--accent)">2</div><div class="beat-content"><div class="beat-title">主人公の即時提示</div><div class="beat-desc">主人公は遅くとも5ページ以内に登場し、彼/彼女が「どんな人物か」が行動で伝わること。セリフや説明でなく「何をするか」で見せる。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--accent)">3</div><div class="beat-content"><div class="beat-title">世界観・ジャンルの宣言</div><div class="beat-desc">冒頭10ページで「この作品はどんなジャンル・トーンか」が明確になること。コメディなら笑い、ホラーなら不安、サスペンスなら謎。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--accent)">4</div><div class="beat-content"><div class="beat-title">日常世界の確立</div><div class="beat-desc">主人公の「特別な出来事が起きる前の日常」を見せる。変化はコントラストで際立つ。日常がなければ非日常は伝わらない。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--accent)">5</div><div class="beat-content"><div class="beat-title">テーマの種を蒔く</div><div class="beat-desc">テーマに関わる「疑問」または「イメージ」を冒頭に忍ばせる。これが作品全体の伏線となり、ラストで回収される。</div></div></div>
  </div>
  <h2>よくある冒頭の失敗パターン</h2>
  <ul style="font-size:12.5px;line-height:2;color:var(--text-secondary)">
    <li>❌ <strong>夢オチオープニング：</strong>最初に衝撃的な場面を見せて「目が覚めると…」。観客の信頼を失う最速の方法。</li>
    <li>❌ <strong>設定説明ナレーション：</strong>「西暦2087年、地球は…」と延々と説明。映像ではなく言葉で解決しようとする癖。</li>
    <li>❌ <strong>主人公の独白的自己紹介：</strong>「私の名前は田中一郎、35歳で…」という直接的な人物説明。行動で見せること。</li>
    <li>❌ <strong>スロースタート：</strong>最初の5ページで何も起きない。平凡な朝の描写が続く。</li>
  </ul>
  <div class="article-callout matcha">
    <strong>実践ワーク：</strong>好きな映画・ドラマの最初の5〜10分を「どんな要素が含まれているか」を分析してみましょう。上の5要素がいつ・どのように提示されているかをメモすることが最速の学習法です。
  </div>`;
}

function renderArticleThemeIntegration() {
  return `
  <div class="article-callout kogane">
    「このドラマが言いたいことは愛の大切さです」と脚本に書いてはいけません。テーマは語るのではなく、体験させるものです。
  </div>
  <h2>テーマとは何か</h2>
  <p>テーマとは「この物語が問いかける根本的な命題」のことです。「義務と自由」「報復と赦し」「個人と社会」——これらは答えではなく問いです。優れた物語はテーマについて答えを押し付けるのではなく、観客に考えさせます。</p>
  <h2>テーマを「隠す」5つの技法</h2>
  <div class="beat-list">
    <div class="beat-item"><div class="beat-num" style="background:var(--kogane)">1</div><div class="beat-content"><div class="beat-title">対立構造でテーマを体現</div><div class="beat-desc">テーマの両側を代表するキャラクター同士を対立させる。「自由」と「責任」をそれぞれ体現する登場人物が衝突するとき、テーマは自動的に浮かび上がる。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--kogane)">2</div><div class="beat-content"><div class="beat-title">象徴・イメージの反復</div><div class="beat-desc">テーマに関連する物・色・場所を繰り返し登場させる。「扉」が開放性の象徴として冒頭と末尾に登場することで、テーマを視覚的に伝える。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--kogane)">3</div><div class="beat-content"><div class="beat-title">プレミス文にテーマを埋め込む</div><div class="beat-desc">「〜すれば〜になる」という形でテーマを格言化し、脚本家だけが知っている「指針」にする。例：「正義を求めすぎると、自分が怪物になる」</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--kogane)">4</div><div class="beat-content"><div class="beat-title">脇役にテーマの別の回答をさせる</div><div class="beat-desc">主人公と同じ問題に直面した脇役が「別の選択をする」ことで、テーマの複数の側面を見せる。主人公の選択の意味が深まる。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--kogane)">5</div><div class="beat-content"><div class="beat-title">結末でテーマを問い直す</div><div class="beat-desc">ラストシーンでオープニングのイメージ・セリフ・状況を変奏して繰り返す。「同じ状況で主人公がどう変わったか」がテーマを答えとして静かに伝える。</div></div></div>
  </div>
  <h2>「説教」にならないために</h2>
  <p>テーマを直接語らせることを「オン・ザ・ノーズ（On the nose）」と呼び、脚本界では最大のタブーの一つです。</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0">
    <div style="background:var(--momo-bg);border:1px solid var(--momo-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:12px;font-weight:700;color:var(--momo);margin-bottom:6px">❌ オン・ザ・ノーズ</div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.8;font-style:italic">「大切なのはお金じゃない。家族なんだよ。それがわかってよかったよ」</div>
    </div>
    <div style="background:var(--matcha-bg);border:1px solid var(--matcha-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:12px;font-weight:700;color:var(--matcha);margin-bottom:6px">✅ テーマを行動で見せる</div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.8;font-style:italic">昇進の書類にサインするペンを置き、父の電話に出る。「もしもし、父さん？……うん、今から行くよ」</div>
    </div>
  </div>
  <div class="article-callout fuji">
    <strong>実践ワーク：</strong>自分の脚本の「テーマ」を一文で書いてみましょう（例：「信頼は裏切られることで初めて本物になる」）。そのテーマが「セリフで語られている場所」を探し、行動・イメージ・状況に置き換えてください。
  </div>`;
}

// ── 新記事: 敵役設計 ────────────────────────────────────────
function renderArticleAntagonistDesign() {
  return `
  <div class="article-callout beni">
    「悪役は自分が正しいと信じている」——強い敵役は単なる障害ではなく、主人公と等価値の「別の答え」を体現する存在です。
  </div>
  <h2>なぜ敵役が重要なのか</h2>
  <p>主人公の強さは「どれだけ強い敵役と対決するか」で決まります。弱い敵役は主人公を輝かせず、テーマも薄くなります。強い敵役がいることで、物語は「人生の選択」を問いかけるものになります。</p>
  <h2>良い敵役の3条件</h2>
  <div class="beat-list">
    <div class="beat-item"><div class="beat-num" style="background:var(--accent)">1</div><div class="beat-content"><div class="beat-title">自分が正しいという信念がある</div><div class="beat-desc">悪役は「自分が悪い」とは思っていません。自分の行動が正当化できる理由・哲学・傷を持っています。観客が「一理ある」と感じるほど強い敵役です。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--accent)">2</div><div class="beat-content"><div class="beat-title">主人公と同じ欲求を持つ（手段が違う）</div><div class="beat-desc">主人公と敵役が「同じものを求めながら、正反対の方法を選ぶ」とき、テーマが浮かび上がります。愛・正義・安全——同じ目標への異なるアプローチが対立を深めます。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--accent)">3</div><div class="beat-content"><div class="beat-title">主人公の弱点を攻撃できる</div><div class="beat-desc">良い敵役は主人公の最大の弱点を知っています。外的な力だけでなく、主人公の内的な恐れや「誤った信念」を利用することで、克服の困難さが際立ちます。</div></div></div>
  </div>
  <h2>敵役の種類</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin:14px 0">
    ${[
      {t:'人物型',d:'明確な意思を持つ敵（殺人犯・組織のボス・ライバル）。最もわかりやすく感情的対立が生まれる'},
      {t:'社会・制度型',d:'不条理な社会・法・組織が敵。主人公は「変えるべき世界」と戦う'},
      {t:'自然・運命型',d:'病気・災害・時間が敵。外的な力と内的な抵抗が交差する'},
      {t:'内面型',d:'主人公自身の恐れ・欲望・誤信念が敵。最も深いテーマを生む'},
    ].map(item=>`<div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px"><div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:4px">${item.t}</div><div style="font-size:11.5px;color:var(--text-secondary);line-height:1.7">${item.d}</div></div>`).join('')}
  </div>
  <h2>敵役設計ワーク</h2>
  <p>あなたの敵役に対して、以下を答えてみましょう：</p>
  <div style="background:var(--bg-subtle);border-radius:var(--radius-md);padding:16px;margin:12px 0;font-size:13px;color:var(--text-secondary);line-height:2">
    ① なぜ敵役は自分の行動が正しいと信じているか？<br>
    ② 敵役の「傷・バックストーリー」は何か？<br>
    ③ 主人公と何が共通しているか？<br>
    ④ 主人公の最大の弱点は何で、それをどう利用するか？
  </div>
  <div class="article-callout fuji">
    <strong>最強の敵役テスト：</strong>敵役の言い分だけを聞いたとき、観客が「それも一理ある……」と感じれば、その敵役は成功しています。
  </div>`;
}

// ── 新記事: サブプロット・Bストーリー ────────────────────────
function renderArticleSubplotsBstory() {
  return `
  <div class="article-callout fuji">
    Bストーリーはメインプロットの「鏡」です。主人公の内的テーマを、外的な物語とは別の角度から照らし出します。
  </div>
  <h2>サブプロットとBストーリーの役割</h2>
  <p>メインプロット（Aストーリー）は「主人公が外的目標を追う物語」です。Bストーリーは多くの場合「内的テーマを体現する関係性の物語」（恋愛・友情・師弟関係など）です。</p>
  <div class="beat-list">
    <div class="beat-item"><div class="beat-num" style="background:var(--fuji)">A</div><div class="beat-content"><div class="beat-title">Aストーリー（メイン）</div><div class="beat-desc">主人公の外的目標と行動。「何をしているか」の物語。観客が追う主な展開。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--momo)">B</div><div class="beat-content"><div class="beat-title">Bストーリー（サブ）</div><div class="beat-desc">内的テーマを体現する関係性。「なぜそれをしているか」の物語。感情的な深みを与える。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--asagi)">C</div><div class="beat-content"><div class="beat-title">Cストーリー（脇役）</div><div class="beat-desc">脇役の小さな目標。コミックリリーフや情報提供の役割。テーマの変奏。</div></div></div>
  </div>
  <h2>Save the Cat での位置づけ</h2>
  <p>BストーリーはSave the Catのビート8（p.30）で「始まる」のが基本です。Bストーリーのキャラクターは「テーマの体現者」であり、最初は主人公の信念に疑問を投げかけます。</p>
  <h2>Bストーリーが機能するための3条件</h2>
  <div style="display:grid;gap:10px;margin:14px 0">
    ${[
      {n:1,t:'メインプロットと交差する',d:'Bストーリーの展開がAストーリーの転換点と「同時に」動くとき、感情的インパクトが倍増します。'},
      {n:2,t:'テーマを反対側から照らす',d:'AストーリーとBストーリーが「同じテーマへの異なるアプローチ」をとることで、テーマに立体感が生まれます。'},
      {n:3,t:'クライマックスで統合される',d:'最終クライマックスでAとBが合流するとき、物語に解放感と完結感が生まれます。'},
    ].map(item=>`<div style="display:flex;gap:10px;padding:12px;background:var(--bg-subtle);border-radius:var(--radius-md);border:1px solid var(--border)"><div style="width:26px;height:26px;border-radius:50%;background:var(--fuji);color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${item.n}</div><div><div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:3px">${item.t}</div><div style="font-size:12px;color:var(--text-secondary);line-height:1.7">${item.d}</div></div></div>`).join('')}
  </div>
  <div class="article-callout matcha">
    <strong>実践ワーク：</strong>自分の脚本のAストーリーを一文で書いてください。次に「この物語のテーマを別の角度で体現するBストーリーを担うキャラクターは誰か？」を考えましょう。
  </div>`;
}

// ── 新記事: 改稿の戦略 ───────────────────────────────────────
function renderArticleRewritingStrategy() {
  return `
  <div class="article-callout asagi">
    プロの脚本家は「初稿は捨て稿」と言います。初稿を書くことと、それを磨くことは、全く別のスキルです。
  </div>
  <h2>改稿の本質：何を直すかを決めること</h2>
  <p>改稿で失敗する最大の理由は「全部を同時に直そうとすること」です。脚本の問題には「大小の優先順位」があります。細部のセリフを直しても、構造的な問題があれば意味がありません。</p>
  <h2>改稿の4つのレベル</h2>
  <div class="beat-list">
    <div class="beat-item"><div class="beat-num" style="background:var(--asagi)">1</div><div class="beat-content"><div class="beat-title">大局レビュー（最初に行う）</div><div class="beat-desc">脚本全体を一気読みし、感情曲線・主人公の目標明確度・全体の印象を確認。一切書き込まず、読者として読む。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--asagi)">2</div><div class="beat-content"><div class="beat-title">構造チェック（次に行う）</div><div class="beat-desc">幕の境界・転換点・クライマックスが機能しているか確認。構造の問題が最優先課題。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--asagi)">3</div><div class="beat-content"><div class="beat-title">シーン整理（その後）</div><div class="beat-desc">不要なシーンの削除・シーンの目的明確化・順番の調整。「このシーンを削れるか？」と問い続ける。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--asagi)">4</div><div class="beat-content"><div class="beat-title">セリフ・ト書き（最後に行う）</div><div class="beat-desc">説明的セリフの削除・感情ラベリングの排除・ト書きのスリム化。構造が固まってから行う。</div></div></div>
  </div>
  <h2>削除の判断基準</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0">
    <div style="background:var(--momo-bg);border:1px solid var(--momo-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:12px;font-weight:700;color:var(--momo);margin-bottom:6px">削除すべきシーン</div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.8">・削除しても物語が通じる<br>・情報がすでに別の場所で伝わっている<br>・キャラクターが変化しない<br>・テンポを下げるだけの「移動」シーン</div>
    </div>
    <div style="background:var(--matcha-bg);border:1px solid var(--matcha-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:12px;font-weight:700;color:var(--matcha);margin-bottom:6px">残すべきシーン</div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.8">・削除すると論理が破綻する<br>・キャラクターが変化する<br>・テーマを体現している<br>・観客の感情を動かす</div>
    </div>
  </div>
  <div class="article-callout kogane">
    <strong>改稿の黄金律：</strong>「好き」だからといって残してはいけません。シーンの存在意義を問い続けてください。「削れる？」と問うたとき「それは困る」と感じるシーンが、本当に必要なシーンです。
  </div>`;
}

// ── 新記事: ビジュアル・ストーリーテリング ───────────────────
function renderArticleVisualStorytelling() {
  return `
  <div class="article-callout kon">
    脚本は「読む」のではなく「見る」ものを設計します。言葉より映像で語る——それが脚本執筆の本質です。
  </div>
  <h2>ビジュアル・ストーリーテリングとは</h2>
  <p>優れた脚本は「映像にならないもの」を書きません。主人公の「内面の独白」ではなく、「行動・表情・選択」によって感情を伝えます。</p>
  <h2>映像で語る5つの技法</h2>
  <div class="beat-list">
    <div class="beat-item"><div class="beat-num" style="background:var(--kon-lt)">1</div><div class="beat-content"><div class="beat-title">行動で感情を見せる</div><div class="beat-desc">「田中は悲しかった」→「田中は返信しかけたメッセージを消し、スマホを伏せた」。感情は状態ではなく行動で見せます。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--kon-lt)">2</div><div class="beat-content"><div class="beat-title">象徴を使う</div><div class="beat-desc">繰り返し登場するオブジェクト（鍵・写真・手紙）が感情やテーマの「象徴」になるとき、言葉なしでメッセージを伝えられます。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--kon-lt)">3</div><div class="beat-content"><div class="beat-title">対比・コントラストを使う</div><div class="beat-desc">冒頭のシーンと末尾のシーンが「同じ状況・異なる選択」になると、主人公の変化がビジュアルで伝わります。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--kon-lt)">4</div><div class="beat-content"><div class="beat-title">沈黙と間を活かす</div><div class="beat-desc">台詞がない瞬間——沈黙・表情・ためらい——が最も多くを語ることがあります。「沈黙の5秒」がセリフ10行分の感情を運ぶことも。</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--kon-lt)">5</div><div class="beat-content"><div class="beat-title">冒頭イメージで世界を確立する</div><div class="beat-desc">物語の最初の「画」が世界観・トーン・テーマを設定します。オープニングイメージは映画の「約束」です。</div></div></div>
  </div>
  <h2>ト書きを磨く</h2>
  <p>ビジュアル表現の実践はト書きから始まります。</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0">
    <div style="background:var(--momo-bg);border:1px solid var(--momo-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:12px;font-weight:700;color:var(--momo);margin-bottom:6px">❌ 避けるべきト書き</div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.8">・「田中は不安を感じた」（内面描写）<br>・「美しい夕日が沈んでいた」（映画的でない抒情）<br>・「この後2年が経過する」（直接的な時間表示）</div>
    </div>
    <div style="background:var(--matcha-bg);border:1px solid var(--matcha-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:12px;font-weight:700;color:var(--matcha);margin-bottom:6px">✅ 映像的なト書き</div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.8">・「田中の手が、ドアノブの前で止まる」<br>・「夕日。田中の影が長く伸びる」<br>・「田中の髪に白いものが混じっている」</div>
    </div>
  </div>
  <div class="article-callout fuji">
    <strong>実践ワーク：</strong>自分の脚本から「感情を直接書いているト書き」を探してください。それを「カメラに映る具体的な行動・画」に置き換えてみましょう。
  </div>`;
}


function renderGuidePage(guideId) {
  const guide = GUIDES.find(g => `guide-${g.id}` === guideId);
  if (!guide) {
    return `<div class="article-page">
      <div class="article-back-btn" onclick="navigate('learn-guide')"><i class="fas fa-arrow-left"></i> ガイド一覧に戻る</div>
      <div style="text-align:center;padding:60px;color:var(--text-muted)">ガイドが見つかりません</div>
    </div>`;
  }

  const c = COLOR_MAP[guide.color] || COLOR_MAP['fuji'];
  const guideContents = {
    'guide-guide-basics': renderGuideBasics(),
    'guide-guide-format': renderGuideFormat(),
    'guide-guide-logline': renderGuideLogline(),
    'guide-guide-dialogue': renderGuideDialogue(),
    'guide-guide-revision': renderGuideRevision(),
    'guide-guide-process': renderGuideProcess(),
    'guide-guide-character-design': renderGuideCharacterDesign(),
    'guide-guide-scene-writing': renderGuideSceneWriting(),
    'guide-guide-tension': renderGuideTension(),
  };

  const body = guideContents[`guide-${guideId}`] || guideContents[guideId] || `<p style="color:var(--text-muted);text-align:center;padding:40px">ガイドコンテンツは準備中です。</p>`;

  // ガイド進捗トラッキング
  const readGuides = DB.get('read_guides', []);
  const isRead = readGuides.includes(guideId);
  // 各ガイドのステップ完了トラッキング
  const guideStepsKey = `guide_steps_${guideId}`;
  const completedSteps = DB.get(guideStepsKey, []);

  // 自動既読マーク
  setTimeout(() => {
    const rg = DB.get('read_guides', []);
    if (!rg.includes(guideId)) { rg.push(guideId); DB.set('read_guides', rg); }
  }, 3000);

  const guideIdx = GUIDES.findIndex(g => `guide-${g.id}` === guideId);
  const prevGuide = guideIdx > 0 ? GUIDES[guideIdx - 1] : null;
  const nextGuide = guideIdx < GUIDES.length - 1 ? GUIDES[guideIdx + 1] : null;

  // ステップチェックリスト生成
  const stepChecks = Array.from({length: guide.steps}, (_,i) => {
    const stepNum = i + 1;
    const isDone = completedSteps.includes(stepNum);
    return `<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:${isDone?'var(--matcha-bg)':'var(--bg-subtle)'};border:1px solid ${isDone?'var(--matcha-border)':'var(--border)'};border-radius:var(--radius-sm);cursor:pointer;font-size:12px;font-weight:600;color:${isDone?'var(--matcha)':'var(--text-secondary)'};transition:all .2s">
      <input type="checkbox" ${isDone?'checked':''} onchange="toggleGuideStep('${guideId}',${stepNum},this.checked)" style="accent-color:var(--matcha);width:15px;height:15px">
      <i class="fas fa-${isDone?'check-circle':'circle'}" style="font-size:11px;color:${isDone?'var(--matcha)':'var(--text-muted)'}"></i>
      Step ${stepNum}
    </label>`;
  }).join('');

  const stepPct = guide.steps > 0 ? Math.round(completedSteps.length / guide.steps * 100) : 0;

  return `
  <div style="max-width:820px">
    <div class="article-back-btn" onclick="navigate('learn-guide')">
      <i class="fas fa-arrow-left"></i> ガイド一覧に戻る
    </div>
    <div class="article-header" style="margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid var(--border);position:relative">
      <div style="position:absolute;bottom:-1px;left:0;width:40px;height:2px;background:${c.color};border-radius:1px"></div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div class="article-category-tag" style="background:${c.bg};color:${c.color};border:1px solid ${c.border}">
          <i class="fas ${guide.icon}"></i> ステップバイステップガイド
        </div>
        ${isRead ? `<span style="font-size:11px;padding:3px 10px;background:var(--matcha-bg);color:var(--matcha);border:1px solid var(--matcha-border);border-radius:10px;font-weight:600"><i class="fas fa-check"></i> 読了</span>` : ''}
        ${stepPct > 0 ? `<span style="font-size:11px;padding:3px 10px;background:var(--fuji-bg);color:var(--fuji);border:1px solid var(--fuji-border);border-radius:10px;font-weight:600"><i class="fas fa-tasks"></i> ${stepPct}% 完了</span>` : ''}
      </div>
      <div class="article-title">${esc(guide.title)}</div>
      <div class="article-subtitle">${esc(guide.desc)}</div>
      <div class="article-meta-row">
        <span><i class="fas fa-list-check" style="margin-right:3px"></i>${guide.steps}ステップ</span>
        <span style="color:var(--text-muted)">ガイド ${guideIdx+1}/${GUIDES.length}</span>
        <span style="color:var(--text-muted)"><i class="fas fa-clock" style="margin-right:3px"></i>約${Math.ceil(guide.steps*2)}〜${guide.steps*3}分</span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 200px;gap:20px;align-items:start">
      <div>
        <div class="article-body">${body}</div>
      </div>
      <div style="position:sticky;top:80px">
        <div class="card" style="padding:14px">
          <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px">
            <i class="fas fa-tasks" style="color:${c.color};margin-right:5px"></i>進捗チェック
          </div>
          <div style="height:6px;background:var(--bg-hover);border-radius:3px;overflow:hidden;margin-bottom:10px">
            <div style="height:100%;width:${stepPct}%;background:${c.color};border-radius:3px;transition:width .4s"></div>
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;text-align:center">${completedSteps.length}/${guide.steps} ステップ完了</div>
          <div style="display:flex;flex-direction:column;gap:5px">
            ${stepChecks}
          </div>
          ${completedSteps.length === guide.steps ? `
          <div style="margin-top:12px;padding:8px;background:var(--matcha-bg);border:1px solid var(--matcha-border);border-radius:var(--radius-sm);text-align:center;font-size:11.5px;font-weight:700;color:var(--matcha)">
            🎉 全ステップ完了！
          </div>` : ''}
          ${nextGuide ? `<button class="btn btn-primary btn-sm" style="width:100%;margin-top:10px" onclick="navigate('article-guide-${nextGuide.id}')"><i class="fas fa-chevron-right"></i> 次のガイドへ</button>` : ''}
        </div>
      </div>
    </div>

    <div style="margin-top:36px;padding-top:20px;border-top:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <button class="btn btn-secondary" onclick="navigate('learn-guide')">
          <i class="fas fa-arrow-left"></i> ガイド一覧
        </button>
        <div style="display:flex;gap:8px">
          ${prevGuide ? `<button class="btn btn-ghost btn-sm" onclick="navigate('article-guide-${prevGuide.id}')"><i class="fas fa-chevron-left"></i> ${esc(prevGuide.title.slice(0,12))}…</button>` : ''}
          ${nextGuide ? `<button class="btn btn-primary btn-sm" onclick="navigate('article-guide-${nextGuide.id}')">次のガイド: ${esc(nextGuide.title.slice(0,12))}… <i class="fas fa-chevron-right"></i></button>` : ''}
        </div>
      </div>
      <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="navigate('learn-articles')"><i class="fas fa-newspaper"></i> 記事も見る</button>
        <button class="btn btn-ghost btn-sm" onclick="navigate('learn-guide')"><i class="fas fa-list"></i> すべてのガイド</button>
        <button class="btn btn-ghost btn-sm" onclick="resetGuideSteps('${guideId}')"><i class="fas fa-rotate-left"></i> 進捗リセット</button>
      </div>
    </div>
  </div>`;
}

function renderGuideBasics() {
  return `
  <div class="article-callout fuji">
    脚本は「設計図」です。映画・ドラマを作るためのブループリント。小説とは根本的に異なる形式と哲学があります。
  </div>
  <h2>Step 1 — 脚本とは何か</h2>
  <p>脚本は映像化のための設計図です。小説のように内面描写や文体を楽しむものではなく、カメラが捉える映像と俳優が発するセリフ・行動を記述するものです。</p>
  <div class="concept-cards">
    <div class="concept-card-sm"><span class="icon">🎬</span><div class="label">映像のみ</div><div class="sub">カメラに映るものだけを書く</div></div>
    <div class="concept-card-sm"><span class="icon">🎭</span><div class="label">行動と対話</div><div class="sub">キャラクターは行動と言葉で語る</div></div>
    <div class="concept-card-sm"><span class="icon">⏱️</span><div class="label">1ページ≒1分</div><div class="sub">日本式は概ね1ページ1〜1.5分</div></div>
    <div class="concept-card-sm"><span class="icon">🤝</span><div class="label">協業の設計図</div><div class="sub">監督・俳優・スタッフが読む文書</div></div>
  </div>
  <h2>Step 2 — 小説との違い</h2>
  <p>最大の違いは「内面を直接書けない」こと。「彼女は悲しかった」ではなく「彼女は窓の外を見つめ、何も言わなかった」と書く。感情は行動と映像で表現します。</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0">
    <div style="background:var(--momo-bg);border:1px solid var(--momo-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:12px;font-weight:700;color:var(--momo);margin-bottom:6px">❌ 小説的な書き方</div>
      <div style="font-size:11.5px;color:var(--text-secondary);line-height:1.8;font-style:italic">「彼女は深い悲しみを感じながら、窓の外の灰色の空を見た。もう会えないと思うと、胸が締め付けられた。」</div>
    </div>
    <div style="background:var(--matcha-bg);border:1px solid var(--matcha-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:12px;font-weight:700;color:var(--matcha);margin-bottom:6px">✅ 脚本的な書き方</div>
      <div style="font-size:11.5px;color:var(--text-secondary);line-height:1.8;font-style:italic">「美咲、窓の外を見つめる。<br>雨が降り始める。<br>美咲は何も言わない。」</div>
    </div>
  </div>
  <h2>Step 3 — 必要なマインドセット</h2>
  <p>脚本執筆に最も大切な心構えは「<strong>完璧な初稿は存在しない</strong>」ということ。プロの脚本家も初稿は荒削りです。まず書き切ることを最優先にしましょう。</p>
  <div class="article-callout matcha">
    <strong>「初稿は泥、最終稿は宝石」</strong> — Aaron Sorkin（ソーシャル・ネットワーク脚本家）。最初の一稿は「書き切る」ことだけを目標にする。判断・批評は後回しにする。
  </div>
  <h2>Step 4 — ツールと環境</h2>
  <p>専用ソフトは不要。シナリオラボを使えば日本式フォーマットで書けます。重要なのはツールより習慣。毎日少しでも書く時間を確保することです。</p>
  <div class="beat-list">
    <div class="beat-item"><div class="beat-num" style="background:var(--fuji)">1</div><div class="beat-content"><div class="beat-title">固定時間で書く</div><div class="beat-desc">「起きてから30分」「昼休み」など、毎日同じ時間に書く習慣が最強の生産性向上策</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--fuji)">2</div><div class="beat-content"><div class="beat-title">最小単位で始める</div><div class="beat-desc">「1シーンだけ書く」という小さなゴール設定が継続の鍵。完璧主義は後回しに</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--fuji)">3</div><div class="beat-content"><div class="beat-title">書く場所を決める</div><div class="beat-desc">同じ場所・環境で書く習慣は、脳に「ここが執筆モードだ」と教える強力なトリガー</div></div></div>
  </div>
  <h2>Step 5 — 最初の一歩</h2>
  <p>まずは「どんな物語を書きたいか」を一文で書きましょう。「誰が」「何をしたいのか」「何が邪魔をするのか」の三要素が揃えば、あなたはもう脚本を書き始められます。</p>
  <div class="article-callout kogane">
    <strong>実践ワーク：</strong>今すぐ「メモ」や「インスピレーション」に以下の3つを書いてみましょう。<br>
    ① 主人公は誰？（職業・年齢・特徴を1行で）<br>
    ② 何をしようとしている？（具体的なゴール）<br>
    ③ 何が邪魔をする？（外的または内的な障害）<br>
    この3行があれば、あなたはもう脚本の骨格を持っています。
  </div>`;
}

function renderGuideFormat() {
  return `
  <div class="article-callout kon">
    日本式脚本フォーマットには厳密な規則があります。テレビドラマ・映画・舞台で若干異なりますが、基本構造は共通です。
  </div>
  <h2>Step 1 — 柱書き（はしらがき）</h2>
  <p>シーンの場所と時間を示す見出し。「○内・外」「場所」「時間帯（昼・夜・朝など）」の順に書きます。</p>
  <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 16px;font-family:'Noto Serif JP',serif;font-size:13px;line-height:1.9;margin:10px 0">
    ○内・木村の自室・深夜<br>
    ○外・渋谷駅前・昼
  </div>
  <h2>Step 2 — ト書き（とがき）</h2>
  <p>映像上の描写。登場人物の行動・状況・場の雰囲気を簡潔に書きます。「見える」「聞こえる」ものだけを書く。</p>
  <h2>Step 3 — 台詞（セリフ）</h2>
  <p>キャラクター名を中央に書き、その下にセリフを書きます。括弧書き（演技指定）は最小限に。セリフはキャラクターの性格・状況を体現するものです。</p>
  <h2>Step 4 — 転換指示</h2>
  <p>シーンの切り替えを示す。「カット」「オーバーラップ」「フラッシュバック」などの指示。多用は禁物。</p>
  <h2>Step 5 — 一般的なルール</h2>
  <ul>
    <li>説明的すぎるト書きを避ける（「彼は悲しそうな顔をして」→「彼は何も言わない」）</li>
    <li>括弧演技指定は俳優への介入になるため最小限に</li>
    <li>ページ数管理（1ページ≒1分を意識）</li>
  </ul>
  <h2>Step 6 — フォーマットの実例</h2>
  <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-sm);padding:20px 28px;font-family:'Noto Serif JP',serif;font-size:12.5px;line-height:2;margin:10px 0">
    <div style="font-weight:700;padding:3px 6px;background:var(--bg-hover);border-left:3px solid #1a160e;font-size:12px;margin-bottom:12px">○内・警察署・取調室・夜</div>
    蛍光灯の光。木村（38）が椅子に座っている。<br><br>
    <div style="text-align:center;font-weight:700;margin:8px 0">木村</div>
    <div style="margin:0 48px 12px">……先生？</div>
    木村の手が震える。
  </div>
  <h2>Step 7 — よくある誤り</h2>
  <ul>
    <li><strong>説明過多：</strong>「〜と思った」「〜を感じた」は使わない</li>
    <li><strong>カメラ指示の多用：</strong>「クローズアップで〜」などは導演の領域</li>
    <li><strong>冗長なト書き：</strong>3行以上のト書きは読みにくい。2行以内を目安に</li>
  </ul>`;
}

function renderGuideLogline() {
  return `
  <div class="article-callout beni">
    ログラインは脚本の「エレベーターピッチ」。1〜2文でプロデューサーや俳優が「見たい！」と思う要素を凝縮します。
  </div>
  <h2>Step 1 — ログラインの公式</h2>
  <p>最もシンプルなログラインの公式：</p>
  <div style="background:var(--accent-bg);border:1.5px solid var(--accent-border);border-radius:var(--radius-md);padding:16px 20px;margin:12px 0;font-family:'Noto Serif JP',serif;font-size:13.5px;line-height:1.8;font-style:italic">
    「[キャラクター] は [ゴール] を達成しようとするが、[障害] によって阻まれる。」
  </div>
  <h2>Step 2 — 良いログラインの4条件</h2>
  <div class="beat-list">
    <div class="beat-item"><div class="beat-num" style="background:var(--accent)">1</div><div class="beat-content"><div class="beat-title">主人公の明確化</div><div class="beat-desc">「刑事」「シングルマザー」など具体的・ユニークな属性</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--accent)">2</div><div class="beat-content"><div class="beat-title">ゴールの明確化</div><div class="beat-desc">何を達成しようとしているか。測定可能で明確であること</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--accent)">3</div><div class="beat-content"><div class="beat-title">障害の明確化</div><div class="beat-desc">何が邪魔をするか。なるべく具体的で感情的インパクトがあること</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--accent)">4</div><div class="beat-content"><div class="beat-title">テーマの匂い</div><div class="beat-desc">「義務か愛か」「正義か友情か」などの葛藤が透けて見えること</div></div></div>
  </div>
  <h2>Step 3 — ログライン練習：悪い例と良い例</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0">
    <div style="background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:var(--radius-md);padding:13px">
      <div style="font-size:10.5px;font-weight:700;color:var(--accent);margin-bottom:6px">❌ 悪い例</div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.65">ある刑事が難事件を解決しようとする面白い物語。</div>
    </div>
    <div style="background:var(--matcha-bg);border:1px solid var(--matcha-border);border-radius:var(--radius-md);padding:13px">
      <div style="font-size:10.5px;font-weight:700;color:var(--matcha);margin-bottom:6px">✅ 良い例</div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.65">不正を暴こうとした刑事が、容疑者の中に自分の恩師を発見し、真実と友情の狭間で引き裂かれる。</div>
    </div>
  </div>
  <h2>Step 4 — 磨く練習</h2>
  <p>ログラインを書いたら次の問いに答えてみてください：①主人公は誰か一言で言えるか？②ゴールは外から見て判断できるか？③障害は感情的か？④テーマが透けるか？すべてYesになるまで磨き続けましょう。</p>`;
}

function renderGuideDialogue() {
  return `
  <div class="article-callout momo">
    良いセリフの鉄則：<em>キャラクターは嘘をつく、隠す、遠回しに言う</em>。直接的すぎるセリフは現実味がない。
  </div>
  <h2>Step 1 — セリフの目的</h2>
  <p>セリフには必ず目的が必要です。目的なしにキャラクターは話しません。①情報を伝える、②感情を表現する、③他者に影響を与える、④性格を示す——いずれかが含まれていないセリフは削りましょう。</p>
  <h2>Step 2 — サブテキスト</h2>
  <p>「言葉の裏にある意味」がサブテキストです。実際に言われた言葉と、本当に意味することが異なるとき、ドラマが生まれます。</p>
  <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 16px;font-family:'Noto Serif JP',serif;font-size:12.5px;line-height:2;margin:10px 0">
    <div style="font-size:10px;color:var(--text-muted);margin-bottom:8px">例：「大丈夫？」という言葉でも、誰が誰にどんな状況で言うかで意味が変わる</div>
    <div style="text-align:center;font-weight:700">田中</div>
    <div style="margin:0 40px">…大丈夫か？</div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:8px">→ 実際は「許してくれるか？」という謝罪を含む言葉</div>
  </div>
  <h2>Step 3 — キャラクターの「声」</h2>
  <p>異なるキャラクターのセリフを読んで、名前を隠しても誰が言ったかわかりますか？ わかれば「声」ができています。語彙、口調、句読点の使い方、話題の選び方が個性を作ります。</p>
  <h2>Step 4 — 避けるべきセリフのパターン</h2>
  <ul>
    <li><strong>説明的すぎるセリフ：</strong>「ご存知の通り、我が社の業績が…」→ 登場人物同士が知っている情報を改めて言う必要はない</li>
    <li><strong>テーマを直接言う：</strong>「これが真の友情というものだ」→ テーマはセリフより行動で示す</li>
    <li><strong>感情ラベリング：</strong>「私は今、とても悲しい」→ 行動と状況で悲しさを示す</li>
  </ul>
  <h2>Step 5 — リズムと間（ま）</h2>
  <p>会話のリズムを意識しましょう。長い台詞と短い台詞を混ぜる。沈黙（ト書きに「間」と書く）を効果的に使う。日本の演劇・テレビは「間」を非常に大切にします。</p>
  <h2>Step 6 — 声に出して読む</h2>
  <p>セリフは必ず声に出して読んでください。読みにくいセリフは実際に言いにくいセリフです。自然に口から出る言葉を目指しましょう。</p>`;
}

function renderGuideRevision() {
  return `
  <div class="article-callout kogane">
    「執筆は改稿である」——プロの脚本家の多くは初稿の10倍以上の時間を改稿に費やします。改稿は弱点修正ではなく、物語を発見する過程です。
  </div>
  <h2>Step 1 — 初稿完成後まず置く</h2>
  <p>初稿が完成したら、少なくとも1〜2日は見ない時間を作りましょう。距離を置くことで、書いた内容ではなく「書かれた内容」を客観的に読めるようになります。</p>
  <h2>Step 2 — 俯瞰読み（マクロ改稿）</h2>
  <p>最初の改稿は細かいセリフの修正ではなく、全体構造の把握から始めます。</p>
  <div class="beat-list">
    <div class="beat-item"><div class="beat-num" style="background:var(--kogane)">1</div><div class="beat-content"><div class="beat-title">物語の骨格確認</div><div class="beat-desc">主人公のゴール・障害・変化は明確か？</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--kogane)">2</div><div class="beat-content"><div class="beat-title">幕の長さバランス</div><div class="beat-desc">各幕が適切な長さか？中弛みはないか？</div></div></div>
    <div class="beat-item"><div class="beat-num" style="background:var(--kogane)">3</div><div class="beat-content"><div class="beat-title">キャラクターアーク確認</div><div class="beat-desc">主人公は冒頭と末尾で何が変わったか？</div></div></div>
  </div>
  <h2>Step 3 — シーンレベル改稿</h2>
  <p>各シーンに問いかけます：①このシーンは物語を前進させるか？②主人公の感情が変化しているか？③入り口と出口を「遅く入り、早く出る」ができているか？</p>
  <h2>Step 4 — セリフの精査</h2>
  <p>「言わなくてもわかるセリフ」を削ります。観客の知性を信頼してください。セリフを1/3削っても意味が通じるなら、削りましょう。</p>
  <h2>Step 5 — 声に出して通し読み</h2>
  <p>必ず声に出して全体を読み通します。引っかかりを感じた箇所にメモ。流れるように読めない部分は問題を抱えています。</p>
  <h2>Step 6 — 第三者の目を借りる</h2>
  <p>信頼できる読み手に読んでもらいましょう。フィードバックをもらう際は「何が好きか」「何が混乱したか」「誰を応援したか」の3点を聞くのが効果的です。</p>`;
}

function renderGuideProcess() {
  return `
  <div class="article-callout fuji">
    シナリオラボの12フェーズは、プロの脚本家が実際に辿るプロセスを体系化したものです。各フェーズに明確なゴールがあります。
  </div>
  <h2>全12フェーズの概要</h2>
  <div class="beat-list">
    ${PHASES.map((ph, i) => {
      const waC = PHASE_COLORS_WA[ph.id] || { bg:'#f8f6f1', color:'#7a6e5e', border:'#e4ddd3' };
      const desc = [
        'アイデアの種を集める。良し悪し問わずすべての閃きをメモ。',
        '作品世界のリアリティを構築。史実・専門知識・参考作品を整理。',
        'テーマ・プレミス・ターゲット・トーン・ログラインを確定。',
        '物語の骨格を設計。四幕構成でシーンを配置し全体を確認。',
        'Want/Need・バックストーリー・関係性マップで立体的キャラを構築。',
        'シーンの順序と内容を詳細に。各シーンの目的・感情変化を整理。',
        '実際に脚本を書く。とにかく最後まで書ききることを優先。',
        '構造レベルで見直す。シーン順・幕の長さ・伏線回収を全面チェック。',
        'セリフ・ト書きレベルで磨く。冗長な説明・リズム・余白を精査。',
        '他者の目線を取り入れる。読み合わせ・感想収集・対応計画。',
        '完成稿として仕上げる。すべての修正を反映しバージョン管理。',
        '制作陣への共有。PDF/TXT出力・フォーマット確認。',
      ][i];
      return `
      <div class="beat-item">
        <div class="beat-num" style="background:${waC.color}">${i+1}</div>
        <div class="beat-content">
          <div class="beat-title"><i class="fas ${ph.icon}" style="color:${waC.color};margin-right:5px"></i>${ph.id}</div>
          <div class="beat-desc">${desc}</div>
        </div>
      </div>`;
    }).join('')}
  </div>
  <div class="article-callout kogane">
    <strong>重要：</strong>フェーズは必ずしも線形に進む必要はありません。書いている途中でキャラクターを設計し直したり、リサーチに戻ることも普通です。ただし、各フェーズの「ゴール」は意識しておきましょう。
  </div>`;
}

// ── 新ガイド: キャラクター設計 ──────────────────────────────────
function renderGuideCharacterDesign() {
  return `
  <div class="article-callout momo">
    キャラクターは「行動の集合体」です。内面を説明するのではなく、状況に対してどう動くかで人物像を伝えます。
  </div>
  <h2>Step 1 — 欲求の二重構造（Want vs Need）</h2>
  <p>全ての立体的なキャラクターには2種類の欲求があります。</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0">
    <div style="background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:8px">WANT（意識的欲求）</div>
      <ul style="font-size:11.5px;color:var(--text-secondary);line-height:1.9;margin:0;padding-left:16px">
        <li>本人が自覚している目標</li>
        <li>具体的・外的・物質的</li>
        <li>例：復讐したい、お金が欲しい、認められたい</li>
      </ul>
    </div>
    <div style="background:var(--momo-bg);border:1px solid var(--momo-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:12px;font-weight:700;color:var(--momo);margin-bottom:8px">NEED（無意識的欲求）</div>
      <ul style="font-size:11.5px;color:var(--text-secondary);line-height:1.9;margin:0;padding-left:16px">
        <li>本人が気づいていない内的変化</li>
        <li>抽象的・内的・精神的</li>
        <li>例：許す能力、繋がり、自己受容</li>
      </ul>
    </div>
  </div>
  <div class="article-callout kogane">
    <strong>黄金ルール：</strong>WantとNeedを相反させると物語が動く。Wantを追いかけることで、最終的にNeedに気づく旅がキャラクターアーク。
  </div>

  <h2>Step 2 — バックストーリーと「傷（ウーンド）」</h2>
  <p>立体的なキャラクターには必ず「過去の傷」があります。これが現在の行動パターンを説明します。</p>
  <div class="beat-list">
    <div class="beat-item">
      <div class="beat-num" style="background:var(--momo)">傷</div>
      <div class="beat-content">
        <div class="beat-title">心理的トラウマ・失敗体験</div>
        <div class="beat-desc">過去に何を経験し、どんな「嘘（ライ）」を信じるようになったか</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--accent)">嘘</div>
      <div class="beat-content">
        <div class="beat-title">キャラクターの「嘘の信念」</div>
        <div class="beat-desc">傷から生まれた歪んだ世界観。例:「信じると裏切られる」「自分は価値がない」</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--matcha)">真実</div>
      <div class="beat-content">
        <div class="beat-title">物語が明かす「真実」</div>
        <div class="beat-desc">クライマックスでキャラクターが「嘘」から「真実」に気づく瞬間。これが変容。</div>
      </div>
    </div>
  </div>

  <h2>Step 3 — 口癖と話し方の個性</h2>
  <p>すべてのキャラクターが同じ話し方をしていては、セリフを聞いただけで誰が言っているかわかりません。</p>
  <ul style="font-size:12.5px;line-height:2;color:var(--text-secondary)">
    <li>語彙の選択：エリートと庶民では使う言葉が違う</li>
    <li>文の長さ：慎重な人は短く、饒舌な人は長くなる傾向</li>
    <li>口癖・フィラー：「要するに」「わかる？」「…まあ」</li>
    <li>話題の選び方：何を気にして、何を無視するか</li>
    <li>ユーモアのスタイル：皮肉か、ダジャレか、真面目か</li>
  </ul>

  <h2>Step 4 — 関係性と対立構造</h2>
  <p>キャラクターは他のキャラクターとの関係で輝きます。「対立する価値観を持つ二人」が同じ目標を追うとき、最も豊かなドラマが生まれます。</p>

  <h2>Step 5 — キャラクターシート記入のコツ</h2>
  <p>シナリオラボの「キャラクター」フェーズで、以下の順に記入していきましょう：</p>
  <div class="article-callout fuji">
    <strong>記入順：</strong>① 名前と外見 → ② Want（表の目標） → ③ Need（内的変化） → ④ 傷とその嘘 → ⑤ 口癖と話し方 → ⑥ 他キャラとの関係性
  </div>`;
}

// ── 新ガイド: 1シーンの書き方 ─────────────────────────────────
function renderGuideSceneWriting() {
  return `
  <div class="article-callout kogane">
    すべての優れたシーンには「目的」「葛藤」「変化」の3要素が含まれます。この3つがないシーンは削除候補です。
  </div>
  <h2>Step 1 — シーンの3要素を確認する</h2>
  <div class="beat-list">
    <div class="beat-item">
      <div class="beat-num" style="background:var(--kogane)">目</div>
      <div class="beat-content">
        <div class="beat-title">目的（What）</div>
        <div class="beat-desc">このシーンで誰が何を達成しようとしているか。目的がないシーンは「観客の時間泥棒」。</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--accent)">葛</div>
      <div class="beat-content">
        <div class="beat-title">葛藤（Conflict）</div>
        <div class="beat-desc">目的達成を阻む障害。外的（他者・環境）でも内的（心理・迷い）でもよい。</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--matcha)">変</div>
      <div class="beat-content">
        <div class="beat-title">変化（Change）</div>
        <div class="beat-desc">シーン冒頭と末尾で状況・関係・感情が変わっているか。変化しないシーンは不要。</div>
      </div>
    </div>
  </div>

  <h2>Step 2 — シーンのエントリーとエグジット</h2>
  <p>脚本の名言：「できるだけ遅く入り、できるだけ早く出る（Enter late, Exit early）」</p>
  <ul style="font-size:12.5px;line-height:2;color:var(--text-secondary)">
    <li><strong>入り：</strong>シーンの「面白い部分」が始まる直前から書き始める</li>
    <li><strong>出：</strong>シーンの目的が達成（または完全に失敗）した瞬間に終わらせる</li>
    <li>挨拶・移動・準備のシーンから始めない</li>
  </ul>

  <h2>Step 3 — ト書きの書き方</h2>
  <p>ト書き（アクションライン）は映像に映るものだけを書きます。感情や心理は「行動」で表現します。</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0">
    <div style="background:#fff0f0;border:1px solid #ffcccc;border-radius:var(--radius-md);padding:12px">
      <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:6px">❌ NG例</div>
      <div style="font-size:12px;color:var(--text-secondary);font-family:monospace;line-height:1.7">太郎は悲しかった。<br>失恋の痛みを感じながら<br>歩いていた。</div>
    </div>
    <div style="background:var(--matcha-bg);border:1px solid var(--matcha-border);border-radius:var(--radius-md);padding:12px">
      <div style="font-size:11px;font-weight:700;color:var(--matcha);margin-bottom:6px">✅ OK例</div>
      <div style="font-size:12px;color:var(--text-secondary);font-family:monospace;line-height:1.7">太郎、うつむいたまま<br>公園のベンチを素通りする。<br>手に握ったスマホを<br>そっとポケットに押し込む。</div>
    </div>
  </div>

  <h2>Step 4 — セリフとサブテキストの統合</h2>
  <p>セリフは「言いたいことを直接言わない」のが原則。登場人物は本音を隠しながら話します。</p>

  <h2>Step 5 — シーンを自己批評する5つの質問</h2>
  <div class="article-callout fuji">
    書いたシーンに自問してください：①このシーンがなければ物語は進まないか？ ②開幕と終幕で状況が変わっているか？ ③主人公の感情が変化しているか？ ④最も強い感情的モーメントはどこか？ ⑤ト書きに不要な説明はないか？
  </div>

  <h2>Step 6 — 脚本フォーマットでのシーン構成</h2>
  <p>シナリオラボの「初稿」フェーズでシーンを書くとき、以下の構造を意識しましょう：</p>
  <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;font-family:monospace;font-size:12px;line-height:2;color:var(--text-primary)">
    <div style="color:var(--fuji);font-weight:700">〇 場所（時間）</div>
    <div style="color:var(--text-muted)">　　[ト書き: 状況・登場人物の行動]</div>
    <div style="color:var(--kon-lt);font-weight:700">　　　　キャラクター名</div>
    <div style="color:var(--text-secondary)">　　　[セリフ]</div>
    <div style="color:var(--text-muted)">　　[ト書き: 反応・次の行動]</div>
  </div>`;
}

// ── 新ガイド: テンション管理 ──────────────────────────────────
function renderGuideTension() {
  return `
  <div class="article-callout beni">
    優れた脚本の感情曲線は「山と谷」で構成されます。常に高いテンションは観客を疲弊させ、常に低いテンションは眠らせます。
  </div>
  <h2>Step 1 — テンションとペーシングの違いを理解する</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0">
    <div style="background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:8px">テンション</div>
      <p style="font-size:11.5px;color:var(--text-secondary);line-height:1.8;margin:0">感情の高低。観客がどれくらい「ハラハラ・感動・緊張」しているか。縦軸の動き。</p>
    </div>
    <div style="background:var(--fuji-bg);border:1px solid var(--fuji-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:12px;font-weight:700;color:var(--fuji);margin-bottom:8px">ペーシング（テンポ）</div>
      <p style="font-size:11.5px;color:var(--text-secondary);line-height:1.8;margin:0">シーンの速さ。セリフの量・場面転換の速さ。横軸の動き。</p>
    </div>
  </div>

  <h2>Step 2 — テンションカーブの基本パターン</h2>
  <div class="beat-list">
    <div class="beat-item">
      <div class="beat-num" style="background:var(--matcha)">低</div>
      <div class="beat-content">
        <div class="beat-title">第一幕（0〜25%）: 低〜中テンション</div>
        <div class="beat-desc">キャラクターと世界の紹介。観客をリラックスさせ、感情移入させる時間。</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--kogane)">中</div>
      <div class="beat-content">
        <div class="beat-title">第二幕（25〜75%）: 波形を繰り返す</div>
        <div class="beat-desc">「山・谷・山・谷」を繰り返しながら全体として上昇していく。谷は必ず作る。</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--accent)">高</div>
      <div class="beat-content">
        <div class="beat-title">第三幕（75〜95%）: クライマックスへ</div>
        <div class="beat-desc">テンションが最高潮に達するクライマックス。その前に「最も暗い瞬間」を作る。</div>
      </div>
    </div>
    <div class="beat-item">
      <div class="beat-num" style="background:var(--fuji)">↓</div>
      <div class="beat-content">
        <div class="beat-title">エンディング（95〜100%）: 急降下</div>
        <div class="beat-desc">クライマックス後は素早く落ち着かせる。余韻を残しながら終える。</div>
      </div>
    </div>
  </div>

  <h2>Step 3 — テンションを上げる・下げる技法</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0">
    <div style="background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:8px">⬆ 上げる技法</div>
      <ul style="font-size:11.5px;color:var(--text-secondary);line-height:1.9;margin:0;padding-left:16px">
        <li>タイムリミットを設ける</li>
        <li>情報の非対称（観客は知っているがキャラは知らない）</li>
        <li>対立の激化・裏切り</li>
        <li>意外な展開・どんでん返し</li>
      </ul>
    </div>
    <div style="background:var(--matcha-bg);border:1px solid var(--matcha-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-size:11px;font-weight:700;color:var(--matcha);margin-bottom:8px">⬇ 下げる技法</div>
      <ul style="font-size:11.5px;color:var(--text-secondary);line-height:1.9;margin:0;padding-left:16px">
        <li>コメディリリーフ</li>
        <li>キャラクター同士の穏やかな交流</li>
        <li>束の間の勝利・安堵</li>
        <li>回想や過去シーン</li>
      </ul>
    </div>
  </div>

  <h2>Step 4 — シナリオラボでテンションを管理する</h2>
  <p>「プロット設計」フェーズのテンションカーブを活用して、各シーンのテンション値（1〜10）を設定してください。</p>
  <div class="article-callout fuji">
    <strong>実践ワーク：</strong>現在のシーン一覧を見て、「テンション値が3以上連続して同じ数字のシーン」を探してください。そこが「停滞ゾーン」です。意図的に起伏を作ることを検討しましょう。
  </div>

  <h2>Step 5 — クライマックス設計の公式</h2>
  <p>強力なクライマックスを作るための「三度の試練」パターン：</p>
  <div class="article-callout matcha">
    <strong>三度の繰り返し：</strong>同じ問題を3回繰り返す → 毎回ステークス（賭けるもの）が大きくなる → 3回目が最大の試練 → クライマックス。この構造が観客の感情を頂点まで引き上げます。
  </div>`;
}

// ================================================================
//  PAGE: ツール
// ================================================================
function renderToolsPage() {
  const cp = State.currentPage;

  if (cp === 'tool-logline') return renderToolLogline();
  if (cp === 'tool-char-diag') return renderToolCharDiag();
  if (cp === 'tool-scene') return renderToolScene();
  if (cp === 'tool-timer') return renderToolTimer();
  if (cp === 'tool-pitch') return renderToolPitch();
  if (cp === 'tool-tension') return renderToolTension();
  if (cp === 'tool-name-gen') return renderToolNameGen();
  if (cp === 'tool-structure') return renderToolStructure();
  if (cp === 'tool-emotion-arc') return renderToolEmotionArc();
  if (cp === 'tool-world-notes') return renderToolWorldNotes();
  if (cp === 'tool-dialogue-check') return renderToolDialogueCheck();
  if (cp === 'tool-plot-holes') return renderToolPlotHoles();
  if (cp === 'tool-beat-counter') return renderToolBeatCounter();

  // カテゴリ分けされたツール一覧
  const TOOL_CATEGORIES = [
    {
      id: 'planning',
      label: '企画・構成',
      icon: 'fa-lightbulb',
      color: 'var(--accent)',
      bg: 'var(--accent-bg)',
      border: 'var(--accent-border)',
      desc: 'アイデアから物語の骨格を作るツール',
      tools: [
        { id:'tool-logline', title:'ログラインメーカー', icon:'fa-quote-left', color:'beni', desc:'4要素入力でプロ品質のログラインを複数生成', badge:'おすすめ' },
        { id:'tool-pitch', title:'ピッチドック・メーカー', icon:'fa-bullhorn', color:'beni', desc:'企画書・あらすじ・ピッチ文書を自動生成', badge:'新機能' },
        { id:'tool-tension', title:'テンションカーブ設計', icon:'fa-chart-line', color:'momo', desc:'物語全体の緊張度を視覚化・設計', badge:'新機能' },
        { id:'tool-structure', title:'構成チェッカー', icon:'fa-diagram-project', color:'kon', desc:'三幕構成・Save the Cat など複数フレームで物語を検証', badge:'新機能' },
      ],
    },
    {
      id: 'character',
      label: 'キャラクター',
      icon: 'fa-users',
      color: 'var(--fuji)',
      bg: 'var(--fuji-bg)',
      border: 'var(--fuji-border)',
      desc: 'キャラクターを深く設計・管理するツール',
      tools: [
        { id:'tool-char-diag', title:'キャラクター診断シート', icon:'fa-user-check', color:'fuji', desc:'Want/Need・バックストーリー・アーク設計を整理' },
        { id:'tool-name-gen', title:'キャラクター名ジェネレーター', icon:'fa-signature', color:'kon', desc:'和風・洋風・古風・SF系の名前を自動生成', badge:'新機能' },
        { id:'tool-emotion-arc', title:'感情アーク設計', icon:'fa-heart-pulse', color:'momo', desc:'キャラクターの感情変化曲線を視覚的に設計', badge:'新機能' },
      ],
    },
    {
      id: 'writing',
      label: '執筆・シーン',
      icon: 'fa-pen-nib',
      color: 'var(--momo)',
      bg: 'var(--momo-bg)',
      border: 'var(--momo-border)',
      desc: 'シーンの構成や執筆作業を助けるツール',
      tools: [
        { id:'tool-scene', title:'シーン構造チェッカー', icon:'fa-film', color:'momo', desc:'入口・目的・対立・出口の4要素を診断' },
        { id:'tool-timer', title:'執筆タイマー（ポモドーロ）', icon:'fa-stopwatch', color:'kogane', desc:'25分集中＋5分休憩で生産性アップ' },
        { id:'tool-world-notes', title:'世界観メモパッド', icon:'fa-globe', color:'asagi', desc:'設定・ルール・用語・地名などを素早くメモ' },
        { id:'tool-dialogue-check', title:'セリフ磨き診断', icon:'fa-comments', color:'fuji', desc:'台詞をAI診断基準で採点・改善提案', badge:'新機能' },
        { id:'tool-plot-holes', title:'プロット穴探し', icon:'fa-magnifying-glass', color:'beni', desc:'論理矛盾・伏線未回収・動機不備を検出', badge:'新機能' },
        { id:'tool-beat-counter', title:'ビートカウンター', icon:'fa-list-ol', color:'kogane', desc:'Save the Cat 15ビートを脚本に対応付け', badge:'新機能' },
      ],
    },
  ];

  const colorMap = { beni:'var(--accent)', fuji:'var(--fuji)', momo:'var(--momo)', kogane:'var(--kogane)', asagi:'var(--asagi)', kon:'var(--kon-lt)' };
  const bgMap = { beni:'var(--accent-bg)', fuji:'var(--fuji-bg)', momo:'var(--momo-bg)', kogane:'var(--kogane-bg)', asagi:'var(--asagi-bg)', kon:'var(--kon-bg)' };

  const categorySections = TOOL_CATEGORIES.map(cat => {
    const toolCards = cat.tools.map(t => `
    <div class="guide-card" style="cursor:pointer;margin-bottom:0" onclick="navigate('${t.id}')">
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:8px">
        <div style="width:42px;height:42px;border-radius:var(--radius-md);background:${bgMap[t.color]||'var(--bg-hover)'};color:${colorMap[t.color]||'var(--text-muted)'};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">
          <i class="fas ${t.icon}"></i>
        </div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
            <div class="guide-card-title" style="margin-bottom:0;font-size:13.5px">${esc(t.title)}</div>
            ${t.badge ? `<span class="tag tag-beni" style="font-size:9px">${t.badge}</span>` : ''}
          </div>
          <div class="guide-card-desc" style="font-size:11.5px">${esc(t.desc)}</div>
        </div>
        <i class="fas fa-arrow-right" style="font-size:10px;color:${colorMap[t.color]||'var(--text-muted)'};flex-shrink:0;margin-top:4px"></i>
      </div>
    </div>`).join('');

    return `
    <div class="card" style="padding:0;overflow:hidden;border-top:3px solid ${cat.color}">
      <div style="padding:14px 16px;border-bottom:1px solid var(--border);background:var(--bg-subtle);display:flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;border-radius:var(--radius-sm);background:${cat.bg};border:1px solid ${cat.border};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="fas ${cat.icon}" style="color:${cat.color};font-size:15px"></i>
        </div>
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">${cat.label}</div>
          <div style="font-size:11.5px;color:var(--text-muted)">${cat.desc}</div>
        </div>
        <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">${cat.tools.length}ツール</span>
      </div>
      <div style="padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
        ${toolCards}
      </div>
    </div>`;
  }).join('');

  return `
  <div style="background:linear-gradient(135deg,var(--asagi-bg) 0%,var(--bg-subtle) 60%);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px 28px;margin-bottom:24px;position:relative;overflow:hidden">
    <div style="position:absolute;right:24px;top:50%;transform:translateY(-50%);font-size:80px;font-weight:700;font-family:'Noto Serif JP',serif;color:var(--asagi);opacity:0.05;pointer-events:none">道具</div>
    <div style="width:28px;height:2.5px;background:linear-gradient(90deg,var(--asagi),var(--kon-lt));border-radius:2px;margin-bottom:10px"></div>
    <div style="font-size:22px;font-weight:700;font-family:'Noto Serif JP',serif;color:var(--text-primary);margin-bottom:6px">
      <i class="fas fa-toolbox" style="color:var(--asagi);margin-right:8px"></i>ライターズツール
    </div>
    <div style="font-size:13px;color:var(--text-muted)">執筆プロセスを加速する専用ツール集。カテゴリごとに整理された${TOOL_CATEGORIES.reduce((a,c)=>a+c.tools.length,0)}つのツールで、アイデア出しから推敲まで完全サポート。</div>
  </div>
  <div style="display:flex;flex-direction:column;gap:20px">
    ${categorySections}
  </div>`;
}

function renderToolLogline() {
  return `
  <div class="article-back-btn" onclick="navigate('tools')"><i class="fas fa-arrow-left"></i> ツール一覧</div>
  <div class="section-header">
    <div class="section-title"><i class="fas fa-quote-left" style="color:var(--accent)"></i> ログラインメーカー</div>
    <div class="section-desc">4要素を入力するだけでプロ品質のログラインを複数生成します</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
    <div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-pencil icon" style="color:var(--accent)"></i> 4要素を入力</div>
        </div>
        <div class="form-group">
          <label class="form-label">主人公 <span style="color:var(--accent)">*</span></label>
          <input class="form-input" id="ll-protagonist" placeholder="例：末期がんを宣告された刑事">
        </div>
        <div class="form-group">
          <label class="form-label">ゴール <span style="color:var(--accent)">*</span></label>
          <input class="form-input" id="ll-goal" placeholder="例：20年前の未解決事件を解決すること">
        </div>
        <div class="form-group">
          <label class="form-label">障害・敵対勢力 <span style="color:var(--accent)">*</span></label>
          <input class="form-input" id="ll-obstacle" placeholder="例：犯人が自分の元上司と知り、友情と正義の間で引き裂かれる">
        </div>
        <div class="form-group">
          <label class="form-label">テーマ・問い（任意）</label>
          <input class="form-input" id="ll-theme" placeholder="例：正義と友情のどちらを選ぶか">
        </div>
        <button class="btn btn-primary" style="width:100%" onclick="generateLoglines()">
          <i class="fas fa-magic"></i> ログラインを生成する
        </button>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="card-title" style="margin-bottom:12px"><i class="fas fa-circle-info icon" style="color:var(--kon-lt)"></i> 良いログラインの4条件</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${[
            ['具体的な主人公','「警察官」より「末期がんの元刑事」'],
            ['明確なゴール','測定可能・外から見てわかる目標'],
            ['感情的な障害','単なる物理的障害より感情的葛藤'],
            ['テーマの匂い','「何を問う話か」が透けて見える'],
          ].map(([t,d]) => `<div style="display:flex;gap:10px;padding:8px;background:var(--bg-subtle);border-radius:var(--radius-sm);border:1px solid var(--border)">
            <i class="fas fa-check" style="color:var(--matcha);font-size:12px;margin-top:2px;flex-shrink:0"></i>
            <div><div style="font-size:12.5px;font-weight:600;color:var(--text-primary)">${t}</div><div style="font-size:11.5px;color:var(--text-muted)">${d}</div></div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <div>
      <div class="card" style="min-height:400px">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-list icon" style="color:var(--matcha)"></i> 生成されたログライン</div>
          <button class="btn btn-ghost btn-sm" id="ll-copy-all" style="display:none" onclick="copyAllLoglines()"><i class="fas fa-copy"></i> 全コピー</button>
        </div>
        <div id="ll-results">
          <div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
            <i class="fas fa-quote-left" style="font-size:36px;display:block;margin-bottom:12px;opacity:0.25"></i>
            <div style="font-size:13.5px">4要素を入力してボタンを押すと<br>ここに複数パターンのログラインが生成されます</div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="card-title" style="margin-bottom:12px"><i class="fas fa-book icon" style="color:var(--kogane)"></i> ログライン例（参考）</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${[
            '「命がけで証言台に立つ証人が、証人保護プログラムの担当官が実は自分を消そうとしていると気づく」',
            '「失業した元刑事が息子の行方不明を調査するうちに、息子が自分の過去の事件の被害者だったと知る」',
            '「宇宙初の民間火星移住計画に携わるエンジニアが、救命装置に致命的な欠陥を発見し、会社の隠蔽工作と戦う」',
          ].map(ex => `<div style="font-size:12.5px;color:var(--text-secondary);padding:10px 12px;background:var(--bg-subtle);border-radius:var(--radius-sm);border-left:3px solid var(--accent-border);line-height:1.6;font-style:italic">${ex}</div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function generateLoglines() {
  const protagonist = $('#ll-protagonist')?.value?.trim();
  const goal = $('#ll-goal')?.value?.trim();
  const obstacle = $('#ll-obstacle')?.value?.trim();
  const theme = $('#ll-theme')?.value?.trim();

  if (!protagonist || !goal || !obstacle) {
    toast('主人公・ゴール・障害は必須です', 'error');
    return;
  }

  const patterns = [
    `${protagonist}は${goal}ために立ち上がるが、${obstacle}。`,
    `${goal}を目指す${protagonist}は、${obstacle}という試練に直面する。`,
    `${protagonist}にとって、${goal}ことが人生最後の使命となる。しかし${obstacle}。`,
    `${obstacle}——その中で${protagonist}は、なおも${goal}ために戦い続けることを選ぶ。`,
    theme ? `「${theme}」——${protagonist}が${goal}ために${obstacle}に立ち向かう物語。` : null,
  ].filter(Boolean);

  const resultsEl = $('#ll-results');
  if (!resultsEl) return;

  resultsEl.innerHTML = patterns.map((p, i) => `
    <div style="padding:13px 14px;background:var(--bg-subtle);border-radius:var(--radius-md);border:1px solid var(--border);margin-bottom:8px;position:relative;transition:all .14s">
      <div style="font-size:10px;font-weight:700;color:var(--accent);letter-spacing:0.08em;margin-bottom:6px">パターン ${i+1}</div>
      <div style="font-size:13.5px;color:var(--text-primary);line-height:1.8;font-family:'Noto Serif JP',serif" id="ll-p-${i}">${esc(p)}</div>
      <button class="btn btn-ghost btn-sm" style="position:absolute;top:8px;right:8px;font-size:10.5px" onclick="copyLogline(${i})">
        <i class="fas fa-copy"></i> コピー
      </button>
    </div>`).join('');

  const copyBtn = $('#ll-copy-all');
  if (copyBtn) copyBtn.style.display = '';

  window._ll_patterns = patterns;
  toast('ログラインを生成しました！', 'success');
}

function copyLogline(idx) {
  const el = $(`#ll-p-${idx}`);
  if (!el) return;
  navigator.clipboard?.writeText(el.textContent || '').then(() => toast('コピーしました', 'success'));
}

function copyAllLoglines() {
  const patterns = window._ll_patterns || [];
  if (!patterns.length) return;
  navigator.clipboard?.writeText(patterns.join('\n\n')).then(() => toast('全パターンをコピーしました', 'success'));
}

function renderToolCharDiag() {
  return `
  <div class="article-back-btn" onclick="navigate('tools')"><i class="fas fa-arrow-left"></i> ツール一覧</div>
  <div class="section-header">
    <div class="section-title"><i class="fas fa-user-check" style="color:var(--fuji)"></i> キャラクター診断シート</div>
    <div class="section-desc">Want/Need・内的葛藤・バックストーリーを分析してキャラクターの深みを測定します</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-user icon" style="color:var(--fuji)"></i> 基本情報</div></div>
        <div class="form-group"><label class="form-label">キャラクター名</label><input class="form-input" id="cd-name" placeholder="例：木村 拓也"></div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">役割</label>
            <select class="form-select" id="cd-role">
              <option>主人公</option><option>ヒロイン/ヒーロー</option><option>antagonist（敵）</option>
              <option>相棒</option><option>メンター</option><option>サブキャラ</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">年齢</label><input class="form-input" id="cd-age" placeholder="38"></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-arrows-alt-v icon" style="color:var(--accent)"></i> Want vs. Need</div></div>
        <div class="form-group">
          <label class="form-label" style="color:var(--accent)">Want（表面的な欲求）</label>
          <textarea class="form-textarea" id="cd-want" rows="3" placeholder="意識的に求めるもの。外的な目標。例：犯人を捕まえること"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label" style="color:var(--matcha)">Need（内面に必要なもの）</label>
          <textarea class="form-textarea" id="cd-need" rows="3" placeholder="無意識に必要なもの。内的な成長。例：自分を許すこと"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">欠如（ウーンド）— 過去のトラウマ・傷</label>
          <textarea class="form-textarea" id="cd-wound" rows="3" placeholder="主人公の行動を歪めている過去の出来事や信念"></textarea>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-comment-dots icon" style="color:var(--momo)"></i> 口癖・話し方</div></div>
        <input class="form-input" id="cd-speech" placeholder="例：語尾に「…そうか？」が多い、断定を避ける話し方">
        <div style="margin-top:8px;font-size:11.5px;color:var(--text-muted)">口癖はキャラクターの価値観や不安を反映します</div>
      </div>
      <button class="btn btn-primary" style="width:100%" onclick="runCharDiag()">
        <i class="fas fa-stethoscope"></i> キャラクターを診断する
      </button>
    </div>
    <div>
      <div class="card" style="min-height:500px">
        <div class="card-header"><div class="card-title"><i class="fas fa-chart-radar icon" style="color:var(--fuji)"></i> 診断結果</div></div>
        <div id="cd-results">
          <div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
            <i class="fas fa-user-check" style="font-size:40px;display:block;margin-bottom:14px;opacity:0.2"></i>
            <div style="font-size:13px">情報を入力して診断ボタンを押すと<br>キャラクターの深みと課題が表示されます</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function runCharDiag() {
  const name   = $('#cd-name')?.value?.trim() || 'キャラクター';
  const want   = $('#cd-want')?.value?.trim();
  const need   = $('#cd-need')?.value?.trim();
  const wound  = $('#cd-wound')?.value?.trim();
  const speech = $('#cd-speech')?.value?.trim();

  const scores = {
    want:   want   ? 100 : 0,
    need:   need   ? 100 : 0,
    wound:  wound  ? 100 : 0,
    speech: speech ? 100 : 0,
  };

  const avg = Math.round(Object.values(scores).reduce((a,b)=>a+b,0) / 4);
  const arcType = (want && need) ? (want !== need ? 'ポジティブアーク（成長）' : 'フラットアーク（不変）') : '未確定';

  const tips = [];
  if (!want) tips.push({ color:'var(--accent)', icon:'fa-arrow-up', text:'Wantを設定しましょう。主人公が意識的に追い求める外的な目標です。' });
  if (!need) tips.push({ color:'var(--matcha)', icon:'fa-heart', text:'Needを設定しましょう。Wantを追うことで気づく、本当に必要なものです。WantとNeedの対立がドラマを生みます。' });
  if (!wound) tips.push({ color:'var(--momo)', icon:'fa-bandage', text:'欠如（ウーンド）を設定しましょう。主人公の行動を歪めている過去の傷です。' });
  if (!speech) tips.push({ color:'var(--fuji)', icon:'fa-comment', text:'口癖を設定しましょう。台詞を読んで「誰が言ったかわかる」個性を作ります。' });

  const resultsEl = $('#cd-results');
  if (!resultsEl) return;

  resultsEl.innerHTML = `
  <div style="text-align:center;margin-bottom:20px;padding:18px;background:${avg>=80?'var(--matcha-bg)':avg>=50?'var(--kogane-bg)':'var(--accent-bg)'};border-radius:var(--radius-md);border:1px solid ${avg>=80?'var(--matcha-border)':avg>=50?'var(--kogane-border)':'var(--accent-border)'}">
    <div style="font-size:38px;font-weight:700;font-family:'Noto Serif JP',serif;color:${avg>=80?'var(--matcha)':avg>=50?'var(--kogane)':'var(--accent)'}">${avg}<span style="font-size:18px">点</span></div>
    <div style="font-size:12.5px;color:var(--text-muted)">キャラクター深度スコア</div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
    ${Object.entries({Want:scores.want,Need:scores.need,'ウーンド':scores.wound,'口癖・声':scores.speech}).map(([k,v]) => `
    <div style="padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-subtle)">
      <div style="font-size:10.5px;font-weight:600;color:var(--text-muted);margin-bottom:4px">${k}</div>
      <div style="display:flex;align-items:center;gap:6px">
        <div style="flex:1;height:4px;background:var(--bg-hover);border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${v}%;background:${v===100?'var(--matcha)':'var(--border-mid)'};transition:width .5s"></div>
        </div>
        <span style="font-size:11px;color:${v===100?'var(--matcha)':'var(--text-muted)'}">${v===100?'✅ OK':'❌ 未入力'}</span>
      </div>
    </div>`).join('')}
  </div>

  <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px;margin-bottom:14px">
    <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:5px">推定アークタイプ</div>
    <div style="font-size:14px;font-weight:700;color:var(--fuji);font-family:'Noto Serif JP',serif">${arcType}</div>
  </div>

  ${tips.length > 0 ? `<div style="font-size:12.5px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">改善提案</div>
  ${tips.map(t=>`<div style="display:flex;gap:10px;padding:10px;background:white;border:1px solid var(--border);border-radius:var(--radius-sm);border-left:3px solid ${t.color};margin-bottom:6px">
    <i class="fas ${t.icon}" style="color:${t.color};flex-shrink:0;margin-top:2px"></i>
    <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.6">${t.text}</div>
  </div>`).join('')}` : `<div class="success-box"><i class="fas fa-circle-check"></i><div>全要素が設定されています！このキャラクターは立体的な設計ができています。</div></div>`}`;

  toast('診断完了！', 'success');
}

function renderToolScene() {
  return `
  <div class="article-back-btn" onclick="navigate('tools')"><i class="fas fa-arrow-left"></i> ツール一覧</div>
  <div class="section-header">
    <div class="section-title"><i class="fas fa-film" style="color:var(--momo)"></i> シーン構造チェッカー</div>
    <div class="section-desc">1シーンを入力して「入口・目的・対立・出口」の4要素を分析します</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-pen-nib icon" style="color:var(--momo)"></i> シーン情報</div></div>
        <div class="form-group">
          <label class="form-label">場所・時間</label>
          <input class="form-input" id="sc-location" placeholder="例：警察署 取調室・夜">
        </div>
        <div class="form-group">
          <label class="form-label">登場キャラクター</label>
          <input class="form-input" id="sc-chars" placeholder="例：木村、田中教授">
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-door-open icon" style="color:var(--matcha)"></i> 4要素の分析</div></div>
        <div class="form-group">
          <label class="form-label" style="color:var(--matcha)">① 入口（シーン開始前の状況）</label>
          <textarea class="form-textarea" id="sc-entry" rows="2" placeholder="このシーンが始まる前、何が起きているか"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label" style="color:var(--kon-lt)">② 目的（このシーンで達成したいこと）</label>
          <textarea class="form-textarea" id="sc-goal" rows="2" placeholder="主人公がこのシーンで何を達成しようとするか"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label" style="color:var(--accent)">③ 対立（目的を阻むもの）</label>
          <textarea class="form-textarea" id="sc-conflict" rows="2" placeholder="何が目的の達成を妨げるか（人物・情報・感情）"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label" style="color:var(--fuji)">④ 出口（シーン終了後の状況の変化）</label>
          <textarea class="form-textarea" id="sc-exit" rows="2" placeholder="このシーンの結果、何がどう変わったか（良くなった/悪くなった）"></textarea>
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:4px" onclick="analyzeScene()">
          <i class="fas fa-magnifying-glass"></i> シーンを分析する
        </button>
      </div>
    </div>
    <div>
      <div class="card" style="min-height:500px">
        <div class="card-header"><div class="card-title"><i class="fas fa-chart-bar icon" style="color:var(--momo)"></i> 分析結果</div></div>
        <div id="sc-results">
          <div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
            <i class="fas fa-film" style="font-size:40px;display:block;margin-bottom:14px;opacity:0.2"></i>
            <div style="font-size:13px">4要素を入力して分析ボタンを押すと<br>シーンの構造分析が表示されます</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function analyzeScene() {
  const entry    = $('#sc-entry')?.value?.trim();
  const goal     = $('#sc-goal')?.value?.trim();
  const conflict = $('#sc-conflict')?.value?.trim();
  const exit_    = $('#sc-exit')?.value?.trim();
  const location = $('#sc-location')?.value?.trim();

  const checks = [
    { label:'入口が設定されている', ok: !!entry, tip:'シーン開始前の状況を明確にすることで、観客はシーンのコンテキストを理解できます。' },
    { label:'目的（ゴール）が明確', ok: !!goal, tip:'各シーンに明確な目的がないと、観客は「何を観ているか」が分からなくなります。' },
    { label:'対立（コンフリクト）がある', ok: !!conflict, tip:'対立のないシーンは退屈です。目的を阻む何かが必ずあるべきです。' },
    { label:'出口で何かが変わった', ok: !!exit_, tip:'シーン終了後、状況が変化（悪化・好転）していないと、物語が停滞します。' },
  ];

  const score = checks.filter(c => c.ok).length;
  const hasConflictAndChange = !!conflict && !!exit_;

  const resultsEl = $('#sc-results');
  if (!resultsEl) return;

  resultsEl.innerHTML = `
  <div style="text-align:center;margin-bottom:18px;padding:16px;background:${score>=4?'var(--matcha-bg)':score>=3?'var(--kogane-bg)':'var(--accent-bg)'};border-radius:var(--radius-md)">
    <div style="font-size:36px;font-weight:700;color:${score>=4?'var(--matcha)':score>=3?'var(--kogane)':'var(--accent)'};font-family:'Noto Serif JP',serif">${score}/4</div>
    <div style="font-size:12px;color:var(--text-muted)">要素充足スコア</div>
  </div>

  ${checks.map(c => `
  <div style="display:flex;gap:10px;padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:7px;background:${c.ok?'var(--matcha-bg)':'var(--accent-bg)'};border-left:3px solid ${c.ok?'var(--matcha)':'var(--accent)'}">
    <i class="fas ${c.ok?'fa-check-circle':'fa-times-circle'}" style="color:${c.ok?'var(--matcha)':'var(--accent)'};flex-shrink:0;margin-top:2px"></i>
    <div>
      <div style="font-size:12.5px;font-weight:600;color:var(--text-primary)">${c.label}</div>
      ${!c.ok ? `<div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;line-height:1.5">${c.tip}</div>` : ''}
    </div>
  </div>`).join('')}

  ${hasConflictAndChange ? `<div class="success-box" style="margin-top:12px"><i class="fas fa-star"></i><div><strong>対立と変化がある</strong>——このシーンは物語を前進させています！</div></div>` :
    `<div class="warning-box" style="margin-top:12px"><i class="fas fa-exclamation-triangle"></i><div>対立と出口の変化を強化すると、シーンが物語を動かすようになります。</div></div>`}

  <div style="margin-top:14px;padding:12px;background:var(--bg-subtle);border-radius:var(--radius-sm);border:1px solid var(--border)">
    <div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:5px;letter-spacing:0.06em">黄金律</div>
    <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">「遅く入り、早く出る」——シーンは必要になった瞬間に始まり、必要がなくなったらすぐ終わる。</div>
  </div>`;

  toast('分析完了！', 'success');
}

function renderToolTimer() {
  return `
  <div class="article-back-btn" onclick="navigate('tools')"><i class="fas fa-arrow-left"></i> ツール一覧</div>
  <div class="section-header">
    <div class="section-title"><i class="fas fa-stopwatch" style="color:var(--kogane)"></i> 執筆タイマー</div>
    <div class="section-desc">ポモドーロテクニックで集中執筆セッションを管理します</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
    <div>
      <div class="card" style="text-align:center;padding:32px 20px">
        <div id="timer-mode-label" style="font-size:13px;font-weight:600;color:var(--text-muted);letter-spacing:0.08em;margin-bottom:12px">執筆タイム</div>
        <div id="timer-display" style="font-size:72px;font-weight:700;font-family:'Noto Serif JP',serif;color:var(--text-primary);letter-spacing:0.04em;line-height:1;margin-bottom:24px">25:00</div>
        <div style="display:flex;gap:10px;justify-content:center;margin-bottom:20px">
          <button class="btn btn-primary btn-lg" id="timer-start-btn" onclick="timerToggle()"><i class="fas fa-play"></i> 開始</button>
          <button class="btn btn-secondary" onclick="timerReset()"><i class="fas fa-rotate-left"></i> リセット</button>
        </div>
        <div style="display:flex;gap:16px;justify-content:center">
          <div style="text-align:center">
            <div style="font-size:22px;font-weight:700;color:var(--accent)" id="timer-session-count">0</div>
            <div style="font-size:10.5px;color:var(--text-muted)">セッション</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:22px;font-weight:700;color:var(--matcha)" id="timer-total-min">0</div>
            <div style="font-size:10.5px;color:var(--text-muted)">累計分</div>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-header"><div class="card-title"><i class="fas fa-sliders icon" style="color:var(--kogane)"></i> タイマー設定</div></div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">執筆時間（分）</label>
            <input class="form-input" id="timer-work-min" type="number" value="25" min="5" max="60">
          </div>
          <div class="form-group">
            <label class="form-label">休憩時間（分）</label>
            <input class="form-input" id="timer-break-min" type="number" value="5" min="1" max="30">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">セッションの目標</label>
          <input class="form-input" id="timer-goal" placeholder="例：第3シーンを書ききる">
        </div>
      </div>
    </div>
    <div>
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-list icon" style="color:var(--kogane)"></i> ポモドーロ記録</div></div>
        <div id="timer-log" style="font-size:12px;color:var(--text-muted)">セッションを開始すると記録が表示されます</div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-title" style="margin-bottom:10px"><i class="fas fa-lightbulb icon" style="color:var(--kogane)"></i> ポモドーロのコツ</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.9">
          <div>🍅 25分は「完全に集中する」時間です</div>
          <div>📵 SNS・メールは休憩まで完全にオフ</div>
          <div>📝 書けない時も「書こうとする」だけで価値があります</div>
          <div>🎯 セッションごとに小さな目標を設定</div>
          <div>🏆 4セッション後は15〜30分の長休憩を</div>
        </div>
      </div>
    </div>
  </div>`;
}

// タイマー状態
const TimerState = {
  interval: null,
  seconds: 25 * 60,
  isRunning: false,
  isBreak: false,
  sessions: 0,
  totalMinutes: 0,
  logs: [],
};

function bindToolsPage() {
  // タイマーページの場合は状態を維持
}

function timerToggle() {
  if (TimerState.isRunning) {
    clearInterval(TimerState.interval);
    TimerState.isRunning = false;
    const btn = $('#timer-start-btn');
    if (btn) btn.innerHTML = '<i class="fas fa-play"></i> 再開';
  } else {
    if (!TimerState.seconds) {
      const workMin = parseInt($('#timer-work-min')?.value || '25');
      TimerState.seconds = workMin * 60;
      TimerState.isBreak = false;
    }
    TimerState.isRunning = true;
    const btn = $('#timer-start-btn');
    if (btn) btn.innerHTML = '<i class="fas fa-pause"></i> 一時停止';
    const startTime = Date.now();
    const startSeconds = TimerState.seconds;
    TimerState.interval = setInterval(() => {
      TimerState.seconds--;
      updateTimerDisplay();
      if (TimerState.seconds <= 0) {
        clearInterval(TimerState.interval);
        TimerState.isRunning = false;
        if (!TimerState.isBreak) {
          TimerState.sessions++;
          TimerState.totalMinutes += parseInt($('#timer-work-min')?.value || '25');
          const goal = $('#timer-goal')?.value || '';
          TimerState.logs.unshift({ type:'work', time: new Date().toLocaleTimeString('ja'), goal });
          toast('執筆セッション完了！お疲れ様です 🎉', 'success');
          TimerState.isBreak = true;
          const breakMin = parseInt($('#timer-break-min')?.value || '5');
          TimerState.seconds = breakMin * 60;
          const btn = $('#timer-start-btn');
          if (btn) btn.innerHTML = '<i class="fas fa-play"></i> 休憩開始';
        } else {
          TimerState.isBreak = false;
          const workMin = parseInt($('#timer-work-min')?.value || '25');
          TimerState.seconds = workMin * 60;
          const btn = $('#timer-start-btn');
          if (btn) btn.innerHTML = '<i class="fas fa-play"></i> 執筆開始';
          toast('休憩終了！次のセッションを始めましょう', 'info');
        }
        updateTimerDisplay();
        updateTimerLog();
      }
    }, 1000);
  }
}

function updateTimerDisplay() {
  const m = Math.floor(TimerState.seconds / 60);
  const s = TimerState.seconds % 60;
  const timeStr = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const color = TimerState.isBreak ? 'var(--matcha)' : (TimerState.seconds < 60 ? 'var(--accent)' : 'var(--text-primary)');

  // タイマーページ内のディスプレイ
  const d = $('#timer-display');
  const ml = $('#timer-mode-label');
  const sc = $('#timer-session-count');
  const tm = $('#timer-total-min');
  if (d) { d.textContent = timeStr; d.style.color = color; }
  if (ml) ml.textContent = TimerState.isBreak ? '休憩タイム' : '執筆タイム';
  if (sc) sc.textContent = String(TimerState.sessions);
  if (tm) tm.textContent = String(TimerState.totalMinutes);

  // グローバルウィジェット更新
  updateGlobalTimerWidget(timeStr, color);
}

// ── Global Timer Widget ────────────────────────────────────────
function updateGlobalTimerWidget(timeStr, color) {
  const gd = $('#gtimer-display');
  if (gd) { gd.textContent = timeStr + ' '; }
  const pd = $('#timer-popup-display');
  if (pd) { pd.textContent = timeStr + ' '; pd.style.color = color; }
  const pm = $('#timer-popup-mode');
  if (pm) { pm.textContent = TimerState.isBreak ? '☕ 休憩タイム' : '✍️ 執筆タイム'; pm.style.color = TimerState.isBreak ? 'var(--matcha)' : 'var(--kogane)'; }
  const ps = $('#timer-popup-sessions');
  if (ps) ps.textContent = TimerState.sessions;
  const pb = $('#timer-popup-btn');
  if (pb) pb.innerHTML = `<i class="fas ${TimerState.isRunning ? 'fa-pause' : 'fa-play'}"></i> ${TimerState.isRunning ? '一時停止' : '開始'}`;
  // ウィジェットのアニメーションクラス更新
  const wi = $('#global-timer-widget');
  if (wi) {
    const icon = wi.querySelector('.gtimer-icon');
    if (icon) {
      icon.className = 'gtimer-icon' + (TimerState.isRunning ? (TimerState.isBreak ? ' break' : ' running') : '');
    }
    let dot = wi.querySelector('.gtimer-dot');
    if (TimerState.isRunning) {
      if (!dot) { dot = document.createElement('div'); dot.className = `gtimer-dot ${TimerState.isBreak?'break':'work'}`; wi.appendChild(dot); }
      else dot.className = `gtimer-dot ${TimerState.isBreak?'break':'work'}`;
    } else if (dot) dot.remove();
  }
}

function toggleTimerPopup() {
  const popup = $('#timer-popup');
  if (!popup) return;
  const isVisible = popup.style.display !== 'none';
  popup.style.display = isVisible ? 'none' : '';
  // クリック外で閉じる
  if (!isVisible) {
    setTimeout(() => {
      function closeOnOutside(e) {
        const popup2 = document.getElementById('timer-popup');
        const widget = document.getElementById('global-timer-widget');
        if (popup2 && !popup2.contains(e.target) && widget && !widget.contains(e.target)) {
          popup2.style.display = 'none';
          document.removeEventListener('click', closeOnOutside);
        }
      }
      document.addEventListener('click', closeOnOutside);
    }, 50);
  }
}

function closeTimerPopup() {
  const popup = $('#timer-popup');
  if (popup) popup.style.display = 'none';
}

function timerTogglePopup() {
  // タイマーページのtimerToggle相当 (popupからの操作)
  if (TimerState.isRunning) {
    clearInterval(TimerState.interval);
    TimerState.isRunning = false;
  } else {
    if (!TimerState.seconds) {
      const settings = DB.get('timer_settings', { work: 25, break: 5 });
      TimerState.seconds = settings.work * 60;
      TimerState.isBreak = false;
    }
    TimerState.isRunning = true;
    TimerState.interval = setInterval(() => {
      TimerState.seconds--;
      updateTimerDisplay();
      if (TimerState.seconds <= 0) {
        clearInterval(TimerState.interval);
        TimerState.isRunning = false;
        const settings = DB.get('timer_settings', { work: 25, break: 5 });
        if (!TimerState.isBreak) {
          TimerState.sessions++;
          TimerState.totalMinutes += settings.work;
          TimerState.logs.unshift({ type:'work', time: new Date().toLocaleTimeString('ja'), goal: '' });
          toast('執筆セッション完了！お疲れ様です 🎉', 'success');
          TimerState.isBreak = true;
          TimerState.seconds = settings.break * 60;
        } else {
          TimerState.isBreak = false;
          TimerState.seconds = settings.work * 60;
          toast('休憩終了！次のセッションを始めましょう', 'info');
        }
        updateTimerDisplay();
      }
    }, 1000);
  }
  updateTimerDisplay();
}

function timerResetPopup() {
  clearInterval(TimerState.interval);
  TimerState.isRunning = false;
  TimerState.isBreak = false;
  const settings = DB.get('timer_settings', { work: 25, break: 5 });
  TimerState.seconds = settings.work * 60;
  updateTimerDisplay();
}

function updateTimerSettings() {
  const work = parseInt($('#timer-popup-work')?.value || '25');
  const brk = parseInt($('#timer-popup-break')?.value || '5');
  DB.set('timer_settings', { work: isNaN(work)?25:work, break: isNaN(brk)?5:brk });
  if (!TimerState.isRunning) {
    TimerState.seconds = (isNaN(work)?25:work) * 60;
    updateTimerDisplay();
  }
}

// ── 自然音エンジン v2 (Web Audio API — 高品質自然音) ────────────
const AmbientSound = {
  ctx: null,
  nodes: [],
  current: null,
  masterGain: null,
  _schedulers: [],

  init() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch(e) { return false; }
    }
    // AudioContextが一時停止している場合は再開
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return true;
  },

  stop() {
    // スケジューラーを全て停止
    this._schedulers.forEach(id => clearTimeout(id));
    this._schedulers = [];
    // ノードを停止
    this.nodes.forEach(n => {
      try { n.stop(0); } catch(e) {}
      try { n.disconnect(); } catch(e) {}
    });
    this.nodes = [];
    if (this.masterGain) {
      try {
        // フェードアウト
        this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
        const g = this.masterGain;
        setTimeout(() => { try { g.disconnect(); } catch(e) {} }, 500);
      } catch(e) {}
      this.masterGain = null;
    }
    this.current = null;
  },

  // ノイズバッファ生成（ステレオ対応、より長いバッファ）
  makeNoiseBuf(color) {
    const sr = this.ctx.sampleRate;
    const len = sr * 4; // 4秒バッファでよりランダムに
    const buf = this.ctx.createBuffer(2, len, sr); // ステレオ
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      let lastOut = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        if (color === 'pink') {
          b0=0.99886*b0+white*0.0555179; b1=0.99332*b1+white*0.0750759;
          b2=0.96900*b2+white*0.1538520; b3=0.86650*b3+white*0.3104856;
          b4=0.55000*b4+white*0.5329522; b5=-0.7616*b5-white*0.0168980;
          data[i] = (b0+b1+b2+b3+b4+b5+b6+white*0.5362) * 0.11;
          b6 = white * 0.115926;
        } else if (color === 'brown') {
          lastOut = (lastOut + (0.02 * white)) / 1.02;
          data[i] = lastOut * 3.5;
        } else {
          data[i] = white;
        }
      }
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  },

  // フィルターチェーン作成
  makeFilter(type, freq, q) {
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    if (q !== undefined) f.Q.value = q;
    return f;
  },

  // 雨音 — より自然な多層構成
  playRain(dest) {
    const sr = this.ctx.sampleRate;
    // 層1: メインの雨の背景音（ホワイトノイズ＋複数フィルター）
    const rain1 = this.makeNoiseBuf('white');
    const lpf1 = this.makeFilter('lowpass', 3000);
    const hpf1 = this.makeFilter('highpass', 200);
    const g1 = this.ctx.createGain(); g1.gain.value = 0.28;
    rain1.connect(lpf1); lpf1.connect(hpf1); hpf1.connect(g1); g1.connect(dest);
    rain1.start();
    this.nodes.push(rain1);

    // 層2: 雨粒の細かい音（高域成分）
    const rain2 = this.makeNoiseBuf('pink');
    const bpf2 = this.makeFilter('bandpass', 4000, 0.8);
    const g2 = this.ctx.createGain(); g2.gain.value = 0.12;
    rain2.connect(bpf2); bpf2.connect(g2); g2.connect(dest);
    rain2.start();
    this.nodes.push(rain2);

    // 層3: 低域のゴロゴロ感（遠くの雷・地鳴り）
    const rain3 = this.makeNoiseBuf('brown');
    const lpf3 = this.makeFilter('lowpass', 180);
    const g3 = this.ctx.createGain(); g3.gain.value = 0.08;
    rain3.connect(lpf3); lpf3.connect(g3); g3.connect(dest);
    rain3.start();
    this.nodes.push(rain3);

    // 強度のゆらぎ（自然な変動）
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = 0.05;
    const lfoG = this.ctx.createGain(); lfoG.gain.value = 0.06;
    lfo.connect(lfoG); lfoG.connect(g1.gain);
    lfo.start();
    this.nodes.push(lfo);
  },

  // 波音 — 海岸の波の寄せ返し
  playWaves(dest) {
    // ピンクノイズベース
    const noise = this.makeNoiseBuf('pink');
    const lpf = this.makeFilter('lowpass', 1200);
    const g = this.ctx.createGain(); g.gain.value = 0.4;
    noise.connect(lpf); lpf.connect(g); g.connect(dest);
    noise.start();
    this.nodes.push(noise);

    // 波の周期的なうねり（複数周期を重ねる）
    const createWaveLfo = (freq, depth, offset) => {
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine'; lfo.frequency.value = freq;
      const lfoG = this.ctx.createGain(); lfoG.gain.value = depth;
      const bias = this.ctx.createGain(); bias.gain.value = offset;
      lfo.connect(lfoG); lfoG.connect(bias.gain);
      lfo.start();
      this.nodes.push(lfo);
      return bias;
    };
    // 主波（約12秒周期）
    const wave1 = createWaveLfo(0.083, 0.22, 0.22);
    wave1.connect(g.gain);
    // 副波（ずれた周期）
    const wave2 = createWaveLfo(0.11, 0.10, 0.0);
    wave2.connect(g.gain);

    // フィルター周波数のゆらぎ（波が寄せる時の音色変化）
    const fLfo = this.ctx.createOscillator();
    fLfo.type = 'sine'; fLfo.frequency.value = 0.083;
    const fLfoG = this.ctx.createGain(); fLfoG.gain.value = 400;
    lpf.frequency.value = 800;
    fLfo.connect(fLfoG); fLfoG.connect(lpf.frequency);
    fLfo.start();
    this.nodes.push(fLfo);

    // 泡立ち音（高域）
    const foam = this.makeNoiseBuf('white');
    const hpf = this.makeFilter('highpass', 3000);
    const fLfo2 = this.ctx.createOscillator();
    fLfo2.type = 'sine'; fLfo2.frequency.value = 0.083;
    const gFoam = this.ctx.createGain(); gFoam.gain.value = 0.0;
    const fLfoG2 = this.ctx.createGain(); fLfoG2.gain.value = 0.05;
    fLfo2.connect(fLfoG2); fLfoG2.connect(gFoam.gain);
    foam.connect(hpf); hpf.connect(gFoam); gFoam.connect(dest);
    foam.start(); fLfo2.start();
    this.nodes.push(foam, fLfo2);
  },

  // 森の音 — 風・虫・鳥の多層レイヤー
  playForest(dest) {
    // 風の音（ピンクノイズ）
    const wind = this.makeNoiseBuf('pink');
    const lpf = this.makeFilter('lowpass', 800);
    const hpf = this.makeFilter('highpass', 120);
    const gWind = this.ctx.createGain(); gWind.gain.value = 0.22;
    wind.connect(hpf); hpf.connect(lpf); lpf.connect(gWind); gWind.connect(dest);
    wind.start();
    this.nodes.push(wind);

    // 風のゆらぎ
    const wLfo = this.ctx.createOscillator();
    wLfo.type = 'sine'; wLfo.frequency.value = 0.07;
    const wLfoG = this.ctx.createGain(); wLfoG.gain.value = 0.08;
    wLfo.connect(wLfoG); wLfoG.connect(gWind.gain);
    wLfo.start();
    this.nodes.push(wLfo);

    // 葉ずれ（高域ピンクノイズ）
    const leaves = this.makeNoiseBuf('pink');
    const bpLeaves = this.makeFilter('bandpass', 5000, 0.5);
    const gLeaves = this.ctx.createGain(); gLeaves.gain.value = 0.08;
    leaves.connect(bpLeaves); bpLeaves.connect(gLeaves); gLeaves.connect(dest);
    leaves.start();
    this.nodes.push(leaves);

    // 虫の音（複数周波数の正弦波 + AM変調）
    const insects = [
      { freq: 4200, rate: 3.5, depth: 0.02 },
      { freq: 3800, rate: 4.2, depth: 0.015 },
      { freq: 5100, rate: 2.8, depth: 0.01 },
    ];
    insects.forEach(ins => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine'; osc.frequency.value = ins.freq;
      const gOsc = this.ctx.createGain(); gOsc.gain.value = 0;
      const amLfo = this.ctx.createOscillator();
      amLfo.type = 'sine'; amLfo.frequency.value = ins.rate;
      const amG = this.ctx.createGain(); amG.gain.value = ins.depth;
      amLfo.connect(amG); amG.connect(gOsc.gain);
      osc.connect(gOsc); gOsc.connect(dest);
      osc.start(); amLfo.start();
      this.nodes.push(osc, amLfo);
    });
  },

  // カフェ音 — より自然な環境音
  playCafe(dest) {
    // ベース低域（部屋の響き）
    const base = this.makeNoiseBuf('brown');
    const lpf = this.makeFilter('lowpass', 300);
    const gBase = this.ctx.createGain(); gBase.gain.value = 0.15;
    base.connect(lpf); lpf.connect(gBase); gBase.connect(dest);
    base.start();
    this.nodes.push(base);

    // 中域の環境音（人の声・食器のような）
    const mid = this.makeNoiseBuf('pink');
    const bpf = this.makeFilter('bandpass', 800, 0.4);
    const gMid = this.ctx.createGain(); gMid.gain.value = 0.12;
    mid.connect(bpf); bpf.connect(gMid); gMid.connect(dest);
    mid.start();
    this.nodes.push(mid);

    // 会話のざわめき（複数帯域）
    [600, 1200, 2400].forEach((freq, i) => {
      const n = this.makeNoiseBuf('pink');
      const bp = this.makeFilter('bandpass', freq, 1.5);
      const g = this.ctx.createGain(); g.gain.value = 0.04 + i * 0.01;
      // ランダムなボリューム変動（会話が始まったり終わったり）
      const modLfo = this.ctx.createOscillator();
      modLfo.type = 'sine';
      modLfo.frequency.value = 0.2 + Math.random() * 0.3;
      const modG = this.ctx.createGain(); modG.gain.value = 0.03;
      modLfo.connect(modG); modG.connect(g.gain);
      n.connect(bp); bp.connect(g); g.connect(dest);
      n.start(); modLfo.start();
      this.nodes.push(n, modLfo);
    });

    // 食器やカップの音（ランダムトランジェント）
    const scheduleClatter = () => {
      if (!this.ctx || !this.masterGain) return;
      const delay = 3000 + Math.random() * 8000;
      const id = setTimeout(() => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = 1800 + Math.random() * 1200;
        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0.04, this.ctx.currentTime);
        env.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        osc.connect(env); env.connect(dest);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.15);
        scheduleClatter(); // 繰り返し
      }, delay);
      this._schedulers.push(id);
    };
    scheduleClatter();
  },

  // ホワイトノイズ
  playWhite(dest) {
    const noise = this.makeNoiseBuf('white');
    const lpf = this.makeFilter('lowpass', 8000);
    const g = this.ctx.createGain(); g.gain.value = 0.18;
    noise.connect(lpf); lpf.connect(g); g.connect(dest);
    noise.start();
    this.nodes.push(noise);
  },

  play(type) {
    if (!this.init()) {
      toast('ブラウザがオーディオに対応していません', 'error');
      return;
    }
    this.stop();
    if (type === 'none') return;
    this.current = type;
    // マスターゲイン（フェードイン）
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.7, this.ctx.currentTime + 1.5);
    this.masterGain.connect(this.ctx.destination);

    if (type === 'rain') this.playRain(this.masterGain);
    else if (type === 'waves') this.playWaves(this.masterGain);
    else if (type === 'forest') this.playForest(this.masterGain);
    else if (type === 'cafe') this.playCafe(this.masterGain);
    else if (type === 'white') this.playWhite(this.masterGain);
  },
};

function setAmbientSound(type) {
  DB.set('ambient_sound', type);
  AmbientSound.play(type);
  // ボタンの active 状態を更新
  document.querySelectorAll('.timer-ambient-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick').includes(`'${type}'`));
  });
  const names = { none:'なし', rain:'雨音', waves:'波音', forest:'森の音', cafe:'カフェ', white:'ホワイトノイズ' };
  if (type !== 'none') toast(`${names[type]||type}を再生中`, 'info', 2000);
}

function timerDisplayClick() {
  if (TimerState.isRunning) return;
  const minStr = prompt('タイマーを何分に設定しますか？', String(Math.floor(TimerState.seconds / 60)));
  if (minStr === null) return;
  const min = parseInt(minStr);
  if (isNaN(min) || min < 1 || min > 180) { toast('1〜180の数値を入力してください', 'error'); return; }
  TimerState.seconds = min * 60;
  updateTimerDisplay();
}

function timerReset() {
  clearInterval(TimerState.interval);
  TimerState.isRunning = false;
  TimerState.isBreak = false;
  const workMin = parseInt($('#timer-work-min')?.value || '25');
  TimerState.seconds = workMin * 60;
  const btn = $('#timer-start-btn');
  if (btn) btn.innerHTML = '<i class="fas fa-play"></i> 開始';
  updateTimerDisplay();
}

function updateTimerLog() {
  const logEl = $('#timer-log');
  if (!logEl) return;
  if (TimerState.logs.length === 0) {
    logEl.innerHTML = '<div style="font-size:12px;color:var(--text-muted)">セッションを開始すると記録が表示されます</div>';
    return;
  }
  logEl.innerHTML = TimerState.logs.slice(0,10).map((l,i) => `
    <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:18px">${l.type==='work'?'🍅':'☕'}</span>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:600;color:var(--text-primary)">${l.type==='work'?`セッション ${TimerState.sessions - i}`:'休憩'}</div>
        ${l.goal ? `<div style="font-size:11px;color:var(--text-muted)">${esc(l.goal)}</div>` : ''}
      </div>
      <span style="font-size:10px;color:var(--text-muted)">${l.time}</span>
    </div>`).join('');
}

// ================================================================
//  TOOL: ピッチドックメーカー
// ================================================================
function renderToolPitch() {
  return `
  <div class="article-back-btn" onclick="navigate('tools')"><i class="fas fa-arrow-left"></i> ツール一覧</div>
  <div class="section-header">
    <div class="section-title"><i class="fas fa-bullhorn" style="color:var(--accent)"></i> ピッチドック・メーカー</div>
    <div class="section-desc">企画書・ピッチドキュメントを自動生成します</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-pen icon" style="color:var(--accent)"></i> 作品情報を入力</div></div>
        <div class="form-group"><label class="form-label">作品タイトル <span style="color:var(--accent)">*</span></label><input class="form-input" id="pitch-title" placeholder="例：夜明けの証言"></div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">ジャンル</label>
            <select class="form-select" id="pitch-genre">
              <option>ドラマ</option><option>サスペンス</option><option>コメディ</option><option>ホラー</option>
              <option>SF</option><option>ファンタジー</option><option>ラブストーリー</option><option>青春</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">フォーマット</label>
            <select class="form-select" id="pitch-format">
              <option>テレビドラマ（連続）</option><option>映画</option><option>短編映画</option><option>ウェブドラマ</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label class="form-label">ログライン（1〜2文）<span style="color:var(--accent)">*</span></label>
          <textarea class="form-textarea" id="pitch-logline" rows="2" placeholder="主人公が何をして何に直面する物語かを一言で"></textarea>
        </div>
        <div class="form-group"><label class="form-label">主人公</label><input class="form-input" id="pitch-hero" placeholder="名前・年齢・職業・性格特徴"></div>
        <div class="form-group"><label class="form-label">物語の核（テーマ）</label><input class="form-input" id="pitch-theme" placeholder="例：正義と友情の葛藤"></div>
        <div class="form-group"><label class="form-label">ターゲット視聴者</label><input class="form-input" id="pitch-target" placeholder="例：20〜40代、社会派ドラマファン"></div>
        <div class="form-group"><label class="form-label">作家の言葉（なぜこの話を書くか）</label>
          <textarea class="form-textarea" id="pitch-statement" rows="2" placeholder="この作品に込めた想い・社会的意義など"></textarea>
        </div>
        <button class="btn btn-primary" style="width:100%" onclick="generatePitch()">
          <i class="fas fa-file-alt"></i> ピッチドキュメントを生成
        </button>
      </div>
    </div>
    <div>
      <div class="card" style="min-height:500px">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-file-lines icon" style="color:var(--matcha)"></i> 生成されたピッチドック</div>
          <button class="btn btn-ghost btn-sm" id="pitch-copy-btn" style="display:none" onclick="copyPitchDoc()"><i class="fas fa-copy"></i> コピー</button>
        </div>
        <div id="pitch-result">
          <div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
            <i class="fas fa-bullhorn" style="font-size:36px;display:block;margin-bottom:12px;opacity:0.2"></i>
            <div style="font-size:13px">情報を入力して生成ボタンを押すと<br>ここにピッチドキュメントが表示されます</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function generatePitch() {
  const title    = $('#pitch-title')?.value?.trim() || '（タイトル未入力）';
  const genre    = $('#pitch-genre')?.value || 'ドラマ';
  const format   = $('#pitch-format')?.value || 'テレビドラマ（連続）';
  const logline  = $('#pitch-logline')?.value?.trim() || '（ログライン未入力）';
  const hero     = $('#pitch-hero')?.value?.trim();
  const theme    = $('#pitch-theme')?.value?.trim();
  const target   = $('#pitch-target')?.value?.trim();
  const statement = $('#pitch-statement')?.value?.trim();

  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日`;

  let doc = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
企　画　書
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ タイトル　　：${title}
■ ジャンル　　：${genre}
■ フォーマット：${format}
■ 作成日　　　：${dateStr}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【ログライン】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${logline}

`;
  if (hero) {
    doc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【主人公】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${hero}

`;
  }
  if (theme) {
    doc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【テーマ・物語の核】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${theme}

この作品は「${theme}」という問いを観客・読者に投げかけます。

`;
  }
  if (target) {
    doc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【ターゲット】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${target}

`;
  }
  if (statement) {
    doc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【作者より】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${statement}

`;
  }
  doc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
（以上）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  const resultEl = $('#pitch-result');
  if (resultEl) {
    resultEl.innerHTML = `<pre style="white-space:pre-wrap;font-family:'Noto Serif JP',serif;font-size:12.5px;line-height:1.9;color:var(--text-secondary);background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px;max-height:460px;overflow-y:auto">${esc(doc)}</pre>`;
  }
  const copyBtn = $('#pitch-copy-btn');
  if (copyBtn) copyBtn.style.display = '';
  window._pitchDoc = doc;
  toast('ピッチドキュメントを生成しました', 'success');
}

function copyPitchDoc() {
  const doc = window._pitchDoc || '';
  navigator.clipboard?.writeText(doc).then(() => toast('コピーしました', 'success'));
}

// ================================================================
//  TOOL: テンションカーブ設計
// ================================================================
function renderToolTension() {
  const defaultPoints = [20,30,25,45,40,60,55,70,65,80,75,90,100,60,30].map((v,i) => ({ x: i+1, y: v }));
  const saved = (() => { try { return JSON.parse(localStorage.getItem('sl_tension') || 'null'); } catch { return null; } })();
  const points = saved || defaultPoints;

  const W = 540, H = 220, PAD = { t:16, r:16, b:36, l:44 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const n = points.length;
  const xStep = iW / (n - 1);

  const pathD = points.map((p, i) => {
    const x = PAD.l + i * xStep;
    const y = PAD.t + iH * (1 - p.y / 100);
    return (i === 0 ? 'M' : 'L') + `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const areaD = pathD + ` L${(PAD.l + (n-1)*xStep).toFixed(1)},${(PAD.t+iH).toFixed(1)} L${PAD.l.toFixed(1)},${(PAD.t+iH).toFixed(1)} Z`;

  const yLines = [0,25,50,75,100].map(v => {
    const y = PAD.t + iH * (1 - v/100);
    return `<line x1="${PAD.l}" y1="${y}" x2="${W-PAD.r}" y2="${y}" stroke="var(--border)" stroke-width="0.8"/>
            <text x="${PAD.l-6}" y="${y+4}" text-anchor="end" font-size="10" fill="var(--text-light)">${v}</text>`;
  }).join('');

  const dots = points.map((p, i) => {
    const x = PAD.l + i * xStep;
    const y = PAD.t + iH * (1 - p.y / 100);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="var(--accent)" stroke="white" stroke-width="2" style="cursor:pointer" onclick="editTensionPoint(${i})" title="ポイント${i+1}: ${p.y}%"/>`;
  }).join('');

  const xLabels = points.map((p, i) => {
    const x = PAD.l + i * xStep;
    return `<text x="${x.toFixed(1)}" y="${H-4}" text-anchor="middle" font-size="9" fill="var(--text-light)">${i+1}</text>`;
  }).join('');

  const TENSION_LABELS = ['序幕','発端','葛藤開始','一時的解決','新たな危機','ミッドポイント','悪化','最低点','暗闇','突破口','クライマックス','余波','解決','収束','終幕'];

  return `
  <div class="article-back-btn" onclick="navigate('tools')"><i class="fas fa-arrow-left"></i> ツール一覧</div>
  <div class="section-header">
    <div class="section-title"><i class="fas fa-chart-line" style="color:var(--momo)"></i> テンションカーブ設計</div>
    <div class="section-desc">物語の緊張度を視覚化して、山場・谷・クライマックスの配置を確認・調整します</div>
  </div>
  <div class="card" style="margin-bottom:18px">
    <div class="card-header">
      <div class="card-title"><i class="fas fa-wave-square icon" style="color:var(--momo)"></i> テンションカーブ</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="resetTensionCurve()"><i class="fas fa-rotate-left"></i> リセット</button>
        <button class="btn btn-primary btn-sm" onclick="saveTensionCurve()"><i class="fas fa-floppy-disk"></i> 保存</button>
      </div>
    </div>
    <div style="overflow-x:auto">
      <svg width="${W}" height="${H}" style="display:block;max-width:100%">
        ${yLines}
        <path d="${areaD}" fill="var(--momo-bg)" stroke="none"/>
        <path d="${pathD}" fill="none" stroke="var(--momo)" stroke-width="2.5" stroke-linejoin="round"/>
        ${dots}
        ${xLabels}
        <text x="${PAD.l-2}" y="${PAD.t-4}" font-size="10" fill="var(--text-muted)">緊張度(%)</text>
      </svg>
    </div>
    <div style="font-size:11.5px;color:var(--text-muted);margin-top:8px"><i class="fas fa-hand-pointer" style="margin-right:4px"></i>各ポイント（●）をクリックして値を編集できます</div>
  </div>

  <div class="card">
    <div class="card-header"><div class="card-title"><i class="fas fa-list-ol icon" style="color:var(--momo)"></i> ポイント詳細編集</div></div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px" id="tension-grid">
      ${points.map((p, i) => `
        <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;text-align:center">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">${TENSION_LABELS[i] || `P${i+1}`}</div>
          <input type="number" class="form-input" id="tp-${i}" value="${p.y}" min="0" max="100" style="text-align:center;padding:4px;height:32px;font-size:13px;font-weight:700" onchange="updateTensionPoint(${i},this.value)">
          <div style="font-size:9px;color:var(--text-light);margin-top:2px">ポイント ${i+1}</div>
        </div>`).join('')}
    </div>
  </div>`;
}

let _tensionPoints = null;

function getTensionPoints() {
  if (_tensionPoints) return _tensionPoints;
  const saved = (() => { try { return JSON.parse(localStorage.getItem('sl_tension') || 'null'); } catch { return null; } })();
  _tensionPoints = saved || [20,30,25,45,40,60,55,70,65,80,75,90,100,60,30].map((v,i) => ({ x:i+1, y:v }));
  return _tensionPoints;
}

function updateTensionPoint(idx, val) {
  const pts = getTensionPoints();
  pts[idx].y = Math.max(0, Math.min(100, parseInt(val)||0));
  _tensionPoints = pts;
}

function editTensionPoint(idx) {
  const pts = getTensionPoints();
  const TENSION_LABELS = ['序幕','発端','葛藤開始','一時的解決','新たな危機','ミッドポイント','悪化','最低点','暗闇','突破口','クライマックス','余波','解決','収束','終幕'];
  openModal(
    `<i class="fas fa-pencil" style="color:var(--momo)"></i> ポイント${idx+1}（${TENSION_LABELS[idx]||''}）を編集`,
    `<div class="form-group">
      <label class="form-label">緊張度 (0〜100%)</label>
      <input class="form-input" id="tp-edit-val" type="number" value="${pts[idx].y}" min="0" max="100">
    </div>
    <div class="form-group">
      <label class="form-label">このポイントのメモ</label>
      <input class="form-input" id="tp-edit-memo" value="${pts[idx].memo||''}" placeholder="例：主人公が真実を知る瞬間">
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveTensionPointEdit(${idx})">保存</button>`
  );
}

function saveTensionPointEdit(idx) {
  const val = parseInt($('#tp-edit-val')?.value || '0');
  const memo = $('#tp-edit-memo')?.value || '';
  const pts = getTensionPoints();
  pts[idx].y = Math.max(0, Math.min(100, val));
  pts[idx].memo = memo;
  _tensionPoints = pts;
  closeModal();
  saveTensionCurve();
  navigate('tool-tension');
  toast('保存しました', 'success');
}

function saveTensionCurve() {
  const pts = getTensionPoints();
  // 画面上の入力値を反映
  pts.forEach((p, i) => {
    const inp = $(`#tp-${i}`);
    if (inp) p.y = Math.max(0, Math.min(100, parseInt(inp.value)||0));
  });
  localStorage.setItem('sl_tension', JSON.stringify(pts));
  toast('テンションカーブを保存しました', 'success');
}

function resetTensionCurve() {
  _tensionPoints = [20,30,25,45,40,60,55,70,65,80,75,90,100,60,30].map((v,i) => ({ x:i+1, y:v }));
  localStorage.setItem('sl_tension', JSON.stringify(_tensionPoints));
  navigate('tool-tension');
  toast('リセットしました', 'info');
}

// ================================================================
//  TOOL: キャラクター名ジェネレーター
// ================================================================
function renderToolNameGen() {
  const LAST_JA = ['山田','田中','佐藤','鈴木','渡辺','伊藤','中村','小林','加藤','吉田','松本','井上','木村','清水','山口','橋本','斎藤','石川','前田','藤原','西村','長谷川','村上','近藤','石田','坂本','遠藤','後藤','林','青木'];
  const FIRST_JA_M = ['拓也','雄太','健一','翔','大輝','優樹','蓮','颯太','悠人','凌','直人','一郎','裕樹','洸','昴'];
  const FIRST_JA_F = ['葵','陽菜','舞','美咲','凛','優','桜','紅葉','澪','莉子','彩','柚子','七海','麻衣','咲'];
  const ANCIENT_LAST = ['藤原','橘','源','平','徳川','織田','豊臣','上杉','武田','今川'];
  const ANCIENT_FIRST = ['義仲','頼朝','義経','忠信','清盛','秀吉','信長','輝元','謙信','信玄'];
  const EN_FIRST_M = ['James','Oliver','William','Henry','Arthur','Edward','George','Robert','Thomas','Richard'];
  const EN_FIRST_F = ['Emma','Alice','Eleanor','Catherine','Margaret','Anne','Charlotte','Elizabeth','Victoria','Clara'];
  const EN_LAST = ['Smith','Johnson','Williams','Brown','Jones','Miller','Davis','Wilson','Taylor','Anderson'];
  const SCI_PREFIX = ['リン','カエル','ノア','イェン','ゾル','タリア','ヴェン','クロス','シェン','フォン'];
  const SCI_SUFFIX = ['ネル','テル','ヴィ','サン','カル','リウス','ドーン','ベル','ゼル','アース'];

  const generated = [];
  function gen(style, gender) {
    if (style === 'japanese') {
      const l = LAST_JA[Math.floor(Math.random()*LAST_JA.length)];
      const f = (gender === 'female' ? FIRST_JA_F : FIRST_JA_M)[Math.floor(Math.random()*(gender==='female'?FIRST_JA_F.length:FIRST_JA_M.length))];
      return { name: l+' '+f, kana: '', style: '現代日本語' };
    }
    if (style === 'ancient') {
      const l = ANCIENT_LAST[Math.floor(Math.random()*ANCIENT_LAST.length)];
      const f = ANCIENT_FIRST[Math.floor(Math.random()*ANCIENT_FIRST.length)];
      return { name: l+' '+f, kana: '', style: '古風・時代劇' };
    }
    if (style === 'english') {
      const first = (gender === 'female' ? EN_FIRST_F : EN_FIRST_M)[Math.floor(Math.random()*(gender==='female'?EN_FIRST_F.length:EN_FIRST_M.length))];
      const last = EN_LAST[Math.floor(Math.random()*EN_LAST.length)];
      return { name: first+' '+last, kana: '', style: '洋風（英語）' };
    }
    if (style === 'scifi') {
      const p = SCI_PREFIX[Math.floor(Math.random()*SCI_PREFIX.length)];
      const s = SCI_SUFFIX[Math.floor(Math.random()*SCI_SUFFIX.length)];
      return { name: p+s, kana: '', style: 'SF/ファンタジー' };
    }
    return { name: '—', kana: '', style: '' };
  }

  return `
  <div class="article-back-btn" onclick="navigate('tools')"><i class="fas fa-arrow-left"></i> ツール一覧</div>
  <div class="section-header">
    <div class="section-title"><i class="fas fa-signature" style="color:var(--kon-lt)"></i> キャラクター名ジェネレーター</div>
    <div class="section-desc">様々なスタイルのキャラクター名を自動生成します</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
    <div>
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-sliders icon" style="color:var(--kon-lt)"></i> 設定</div></div>
        <div class="form-group">
          <label class="form-label">スタイル</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px" id="ng-style-selector">
            ${[
              { id:'japanese', label:'現代日本語', icon:'fa-torii-gate', color:'var(--accent)' },
              { id:'ancient',  label:'古風・時代劇',icon:'fa-scroll',    color:'var(--kogane)' },
              { id:'english',  label:'洋風（英語）', icon:'fa-globe',    color:'var(--kon-lt)' },
              { id:'scifi',    label:'SF/ファンタジー',icon:'fa-rocket', color:'var(--fuji)' },
            ].map(s => `
              <label style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg-subtle);border:1.5px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;font-size:12.5px;font-weight:600">
                <input type="checkbox" id="ng-style-${s.id}" name="ng-style" value="${s.id}" checked style="width:14px;height:14px;accent-color:${s.color}">
                <i class="fas ${s.icon}" style="color:${s.color}"></i>${s.label}
              </label>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">性別</label>
          <div style="display:flex;gap:8px">
            ${[
              { id:'male', label:'男性', icon:'fa-mars' },
              { id:'female', label:'女性', icon:'fa-venus' },
              { id:'any', label:'指定なし', icon:'fa-circle' },
            ].map(g => `
              <label style="display:flex;align-items:center;gap:6px;padding:7px 12px;background:var(--bg-subtle);border:1.5px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;font-size:12.5px;flex:1;justify-content:center">
                <input type="radio" name="ng-gender" value="${g.id}" ${g.id==='any'?'checked':''} style="accent-color:var(--kon-lt)">
                <i class="fas ${g.icon}" style="font-size:11px"></i>${g.label}
              </label>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">生成数</label>
          <input class="form-input" id="ng-count" type="number" value="10" min="5" max="30">
        </div>
        <button class="btn btn-primary" style="width:100%" onclick="generateNames()">
          <i class="fas fa-dice"></i> 名前を生成する
        </button>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="card-title" style="margin-bottom:10px"><i class="fas fa-heart icon" style="color:var(--momo)"></i> お気に入り</div>
        <div id="ng-favorites" style="min-height:60px;font-size:12.5px;color:var(--text-muted)">
          お気に入りはここに追加されます
        </div>
      </div>
    </div>

    <div>
      <div class="card" style="min-height:400px">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-list icon" style="color:var(--kon-lt)"></i> 生成された名前</div>
          <button class="btn btn-ghost btn-sm" onclick="generateNames()"><i class="fas fa-rotate"></i> 再生成</button>
        </div>
        <div id="ng-results">
          <div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
            <i class="fas fa-signature" style="font-size:36px;display:block;margin-bottom:12px;opacity:0.2"></i>
            <div style="font-size:13px">設定を選んでボタンを押すと<br>名前が生成されます</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function generateNames() {
  const styles = ['japanese','ancient','english','scifi'].filter(s => $(`#ng-style-${s}`)?.checked);
  const genderEl = document.querySelector('input[name="ng-gender"]:checked');
  const gender = genderEl?.value || 'any';
  const count = parseInt($('#ng-count')?.value || '10');

  if (styles.length === 0) { toast('スタイルを選択してください', 'error'); return; }

  const LAST_JA = ['山田','田中','佐藤','鈴木','渡辺','伊藤','中村','小林','加藤','吉田','松本','井上','木村','清水','山口','橋本','斎藤','石川','前田','藤原','西村','長谷川','村上','近藤','石田','坂本','遠藤','後藤','林','青木'];
  const FIRST_JA_M = ['拓也','雄太','健一','翔','大輝','優樹','蓮','颯太','悠人','凌','直人','一郎','裕樹','洸','昴'];
  const FIRST_JA_F = ['葵','陽菜','舞','美咲','凛','優','桜','紅葉','澪','莉子','彩','柚子','七海','麻衣','咲'];
  const ANCIENT_LAST = ['藤原','橘','源','平','徳川','織田','豊臣','上杉','武田','今川'];
  const ANCIENT_FIRST = ['義仲','頼朝','義経','忠信','清盛','秀吉','信長','輝元','謙信','信玄','姫','若菜','千代','糸','澄乃'];
  const EN_FIRST_M = ['James','Oliver','William','Henry','Arthur','Edward','George','Robert','Thomas','Richard'];
  const EN_FIRST_F = ['Emma','Alice','Eleanor','Catherine','Margaret','Anne','Charlotte','Elizabeth','Victoria','Clara'];
  const EN_LAST = ['Smith','Johnson','Williams','Brown','Jones','Miller','Davis','Wilson','Taylor','Anderson'];
  const SCI_PREFIX = ['リン','カエル','ノア','イェン','ゾル','タリア','ヴェン','クロス','シェン','フォン'];
  const SCI_SUFFIX = ['ネル','テル','ヴィ','サン','カル','リウス','ドーン','ベル','ゼル','アース'];

  const styleNames = { japanese:'現代日本語', ancient:'古風・時代劇', english:'洋風（英語）', scifi:'SF/ファンタジー' };
  const styleColors = { japanese:'var(--accent)', ancient:'var(--kogane)', english:'var(--kon-lt)', scifi:'var(--fuji)' };

  const results = [];
  for (let i = 0; i < count; i++) {
    const style = styles[i % styles.length];
    const g = gender === 'any' ? (i % 2 === 0 ? 'male' : 'female') : gender;
    let name = '';
    if (style === 'japanese') {
      const l = LAST_JA[Math.floor(Math.random()*LAST_JA.length)];
      const f = (g === 'female' ? FIRST_JA_F : FIRST_JA_M)[Math.floor(Math.random()*(g==='female'?FIRST_JA_F.length:FIRST_JA_M.length))];
      name = l + ' ' + f;
    } else if (style === 'ancient') {
      const l = ANCIENT_LAST[Math.floor(Math.random()*ANCIENT_LAST.length)];
      const f = ANCIENT_FIRST[Math.floor(Math.random()*ANCIENT_FIRST.length)];
      name = l + ' ' + f;
    } else if (style === 'english') {
      const first = (g === 'female' ? EN_FIRST_F : EN_FIRST_M)[Math.floor(Math.random()*(g==='female'?EN_FIRST_F.length:EN_FIRST_M.length))];
      const last = EN_LAST[Math.floor(Math.random()*EN_LAST.length)];
      name = first + ' ' + last;
    } else {
      const p = SCI_PREFIX[Math.floor(Math.random()*SCI_PREFIX.length)];
      const s = SCI_SUFFIX[Math.floor(Math.random()*SCI_SUFFIX.length)];
      name = p + s;
    }
    results.push({ name, style, color: styleColors[style], label: styleNames[style] });
  }

  const resultsEl = $('#ng-results');
  if (resultsEl) {
    resultsEl.innerHTML = `<div style="display:flex;flex-direction:column;gap:6px">` +
      results.map((r, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm)">
          <div style="font-size:14px;font-weight:700;color:var(--text-primary);flex:1;font-family:'Noto Serif JP',serif">${esc(r.name)}</div>
          <span style="font-size:10px;padding:2px 7px;background:white;border:1px solid var(--border);border-radius:var(--radius-xs);color:${r.color};font-weight:600">${r.label}</span>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="addNameFavorite('${esc(r.name)}','${r.label}')" title="お気に入りに追加"><i class="fas fa-heart" style="color:var(--momo);font-size:11px"></i></button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="copyToClipboard('${esc(r.name)}')" title="コピー"><i class="fas fa-copy" style="font-size:11px"></i></button>
        </div>`).join('') + `</div>`;
  }
  toast(`${count}件の名前を生成しました`, 'success');
}

function addNameFavorite(name, style) {
  const favs = JSON.parse(localStorage.getItem('sl_name_favs') || '[]');
  if (!favs.find(f => f.name === name)) {
    favs.unshift({ name, style, addedAt: new Date().toISOString() });
    localStorage.setItem('sl_name_favs', JSON.stringify(favs));
  }
  const el = $('#ng-favorites');
  if (el) {
    const items = JSON.parse(localStorage.getItem('sl_name_favs') || '[]');
    el.innerHTML = items.length === 0 ? 'お気に入りはここに追加されます' :
      `<div style="display:flex;flex-wrap:wrap;gap:6px">${items.map(f => `
        <div style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:var(--momo-bg);border:1px solid var(--momo-border);border-radius:var(--radius-full);font-size:12px;color:var(--momo)">
          ${esc(f.name)}
          <button class="btn btn-ghost btn-icon" style="padding:0;height:16px;width:16px" onclick="removeNameFavorite('${esc(f.name)}')"><i class="fas fa-xmark" style="font-size:9px"></i></button>
        </div>`).join('')}</div>`;
  }
  toast('お気に入りに追加しました', 'success');
}

function removeNameFavorite(name) {
  const favs = JSON.parse(localStorage.getItem('sl_name_favs') || '[]').filter(f => f.name !== name);
  localStorage.setItem('sl_name_favs', JSON.stringify(favs));
  const el = $('#ng-favorites');
  if (el) {
    el.innerHTML = favs.length === 0 ? 'お気に入りはここに追加されます' :
      `<div style="display:flex;flex-wrap:wrap;gap:6px">${favs.map(f => `
        <div style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:var(--momo-bg);border:1px solid var(--momo-border);border-radius:var(--radius-full);font-size:12px;color:var(--momo)">
          ${esc(f.name)}
          <button class="btn btn-ghost btn-icon" style="padding:0;height:16px;width:16px" onclick="removeNameFavorite('${esc(f.name)}')"><i class="fas fa-xmark" style="font-size:9px"></i></button>
        </div>`).join('')}</div>`;
  }
}

function copyToClipboard(text) {
  navigator.clipboard?.writeText(text).then(() => toast('コピーしました', 'success'));
}

// ================================================================
//  TOOL: 構成チェッカー
// ================================================================
function renderToolStructure() {
  return `
  <div class="article-back-btn" onclick="navigate('tools')"><i class="fas fa-arrow-left"></i> ツール一覧</div>
  <div class="section-header">
    <div class="section-title"><i class="fas fa-diagram-project" style="color:var(--kon-lt)"></i> 構成チェッカー</div>
    <div class="section-desc">三幕構成・Save the Cat・起承転結など複数フレームワークで物語の骨格を検証します</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-pen icon" style="color:var(--kon-lt)"></i> 物語の要素を入力</div></div>
        <div class="form-group"><label class="form-label">タイトル</label><input class="form-input" id="strchk-title" placeholder="例：夜明けの証言"></div>
        <div class="form-group"><label class="form-label">主人公と目標 <span style="color:var(--accent)">*</span></label><textarea class="form-textarea" id="strchk-hero" rows="2" placeholder="例：元刑事の木村が、15年前の冤罪事件の真犯人を見つけようとしている"></textarea></div>
        <div class="form-group"><label class="form-label">主な障害 <span style="color:var(--accent)">*</span></label><textarea class="form-textarea" id="strchk-obstacle" rows="2" placeholder="例：権力者による隠蔽工作、信頼できる証人の不在"></textarea></div>
        <div class="form-group"><label class="form-label">物語の中盤（ミッドポイント）</label><textarea class="form-textarea" id="strchk-mid" rows="2" placeholder="例：木村が真犯人の一部を掴んだが逆に追われる立場に"></textarea></div>
        <div class="form-group"><label class="form-label">クライマックス・結末</label><textarea class="form-textarea" id="strchk-climax" rows="2" placeholder="例：証拠を公開、真実が明かされ主人公が変化する"></textarea></div>
        <div class="form-group">
          <label class="form-label">チェックするフレームワーク</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${[
              {id:'three-act', label:'三幕構成'},
              {id:'save-cat', label:'Save the Cat'},
              {id:'kishotenketsu', label:'起承転結'},
              {id:'hero-journey', label:'英雄の旅'},
            ].map(f=>`<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:5px 10px;background:var(--bg-subtle);border:1.5px solid var(--border);border-radius:var(--radius-sm)">
              <input type="checkbox" id="strchk-fw-${f.id}" checked style="accent-color:var(--kon-lt)"> ${f.label}
            </label>`).join('')}
          </div>
        </div>
        <button class="btn btn-primary" style="width:100%" onclick="checkStructure()"><i class="fas fa-magnifying-glass"></i> 構成を分析する</button>
      </div>
    </div>
    <div>
      <div class="card" style="min-height:500px">
        <div class="card-header"><div class="card-title"><i class="fas fa-chart-bar icon" style="color:var(--kon-lt)"></i> 分析結果</div></div>
        <div id="strchk-results">
          <div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
            <i class="fas fa-diagram-project" style="font-size:40px;display:block;margin-bottom:14px;opacity:0.2"></i>
            <div style="font-size:13px">物語の要素を入力して<br>分析ボタンを押してください</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function checkStructure() {
  const hero = document.getElementById('strchk-hero')?.value.trim();
  const obstacle = document.getElementById('strchk-obstacle')?.value.trim();
  const mid = document.getElementById('strchk-mid')?.value.trim();
  const climax = document.getElementById('strchk-climax')?.value.trim();
  if (!hero || !obstacle) { toast('主人公と障害は必須です', 'error'); return; }

  const frameworks = [
    {id:'three-act', name:'三幕構成'},
    {id:'save-cat', name:'Save the Cat'},
    {id:'kishotenketsu', name:'起承転結'},
    {id:'hero-journey', name:'英雄の旅'},
  ].filter(f => document.getElementById(`strchk-fw-${f.id}`)?.checked);

  const scores = {};
  let totalScore = 0;
  const checks = {
    hasHero: hero.length >= 10,
    hasGoal: hero.includes('が') || hero.includes('を') || hero.includes('しよう'),
    hasObstacle: obstacle.length >= 8,
    hasMidpoint: mid.length >= 10,
    hasClimax: climax.length >= 10,
    hasChange: climax.includes('変化') || climax.includes('気づ') || climax.includes('成長') || climax.includes('解決'),
  };

  const items = [
    { key:'hasHero', label:'主人公の設定', desc:'主人公が具体的に設定されている', ok: checks.hasHero },
    { key:'hasGoal', label:'明確な目標', desc:'主人公が何を達成しようとするか明確', ok: checks.hasGoal },
    { key:'hasObstacle', label:'具体的な障害', desc:'目標達成を阻む障害が具体的', ok: checks.hasObstacle },
    { key:'hasMidpoint', label:'ミッドポイント', desc:'物語中盤に転換点がある', ok: checks.hasMidpoint },
    { key:'hasClimax', label:'クライマックス', desc:'物語の頂点と結末が設定されている', ok: checks.hasClimax },
    { key:'hasChange', label:'キャラクターの変化', desc:'主人公が変化・成長する要素がある', ok: checks.hasChange },
  ];

  const passCount = items.filter(i => i.ok).length;
  const pct = Math.round(passCount / items.length * 100);

  const checklistHtml = items.map(item => `
  <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-light)">
    <div style="width:22px;height:22px;border-radius:50%;background:${item.ok?'var(--matcha-bg)':'var(--bg-hover)'};color:${item.ok?'var(--matcha)':'var(--text-muted)'};display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0">
      <i class="fas ${item.ok?'fa-check':'fa-xmark'}"></i>
    </div>
    <div>
      <div style="font-size:12.5px;font-weight:600;color:${item.ok?'var(--text-primary)':'var(--text-muted)'}">${item.label}</div>
      <div style="font-size:11px;color:var(--text-muted)">${item.desc}</div>
    </div>
  </div>`).join('');

  const fwResultHtml = frameworks.map(fw => {
    const tips = {
      'three-act': !checks.hasMidpoint ? '⚠️ 第二幕のミッドポイントが不明確です。物語中盤の転換を追加してください。' : '✅ 三幕の基本構造が揃っています。',
      'save-cat': !checks.hasHero || !checks.hasChange ? '⚠️ Save the Catでは「オープニングイメージ」と「ファイナルイメージ」の対比が重要です。主人公の変化を明確に。' : '✅ Save the Cat の変化フレームに対応しています。',
      'kishotenketsu': !checks.hasObstacle ? '⚠️ 「転」の要素（予想外の転換）が弱いです。障害をさらに具体化してください。' : '✅ 起承転結の流れが確認できます。',
      'hero-journey': !checks.hasMidpoint ? '⚠️ 英雄の旅では「試練」の段階が重要です。中盤の挑戦を追加してください。' : '✅ 英雄の旅の基本要素が含まれています。',
    };
    return `
    <div style="padding:10px;background:var(--bg-subtle);border-radius:var(--radius-sm);border:1px solid var(--border);margin-bottom:8px">
      <div style="font-size:12px;font-weight:700;color:var(--kon-lt);margin-bottom:4px"><i class="fas fa-check-square" style="margin-right:5px"></i>${fw.name}</div>
      <div style="font-size:11.5px;color:var(--text-secondary)">${tips[fw.id]||''}</div>
    </div>`;
  }).join('');

  const el = document.getElementById('strchk-results');
  if (el) el.innerHTML = `
  <div style="margin-bottom:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div style="font-size:14px;font-weight:700;color:var(--text-primary)">総合スコア</div>
      <div style="font-size:20px;font-weight:700;color:${pct>=80?'var(--matcha)':pct>=50?'var(--kogane)':'var(--accent)'}">${pct}<span style="font-size:12px">%</span></div>
    </div>
    <div style="height:8px;background:var(--bg-hover);border-radius:4px;overflow:hidden;margin-bottom:6px">
      <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${pct>=80?'var(--matcha)':pct>=50?'var(--kogane)':'var(--accent)'},${pct>=80?'var(--matcha-lt)':pct>=50?'#e8c96e':'#f87a9a'});border-radius:4px;transition:width .6s"></div>
    </div>
    <div style="font-size:11.5px;color:var(--text-muted)">${pct>=80?'優れた構成です！':'いくつかの要素を追加するとさらに強くなります。'}</div>
  </div>
  <div style="margin-bottom:16px">
    <div style="font-size:12.5px;font-weight:700;color:var(--text-primary);margin-bottom:8px">要素チェックリスト</div>
    ${checklistHtml}
  </div>
  ${frameworks.length > 0 ? `<div><div style="font-size:12.5px;font-weight:700;color:var(--text-primary);margin-bottom:8px">フレームワーク別診断</div>${fwResultHtml}</div>` : ''}`;
  toast('分析完了！', 'success');
}

// ================================================================
//  TOOL: 感情アーク設計
// ================================================================
function renderToolEmotionArc() {
  const arcData = JSON.parse(localStorage.getItem('sl_emotion_arc') || '{"scenes":[],"title":""}');
  const scenes = arcData.scenes || [];

  return `
  <div class="article-back-btn" onclick="navigate('tools')"><i class="fas fa-arrow-left"></i> ツール一覧</div>
  <div class="section-header">
    <div class="section-title"><i class="fas fa-heart-pulse" style="color:var(--momo)"></i> 感情アーク設計</div>
    <div class="section-desc">各シーンのキャラクター感情変化を記録し、感情曲線を可視化します</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-plus icon" style="color:var(--momo)"></i> シーンを追加</div></div>
        <div class="form-group"><label class="form-label">シーン名/場面</label><input class="form-input" id="ea-scene-name" placeholder="例：警察署の尋問シーン"></div>
        <div class="form-group">
          <label class="form-label">感情レベル (1=最低 / 10=最高)</label>
          <div style="display:flex;align-items:center;gap:10px">
            <input type="range" id="ea-emotion-level" min="1" max="10" value="5" style="flex:1;accent-color:var(--momo)" oninput="document.getElementById('ea-level-display').textContent=this.value">
            <span id="ea-level-display" style="font-size:16px;font-weight:700;color:var(--momo);min-width:20px">5</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">感情タイプ</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px" id="ea-emotion-select">
            ${['希望','絶望','怒り','悲しみ','喜び','恐怖','驚き','安堵','葛藤','決意'].map(e=>`
              <button class="btn btn-ghost btn-sm" style="font-size:11px" onclick="this.classList.toggle('active');this.style.background=this.classList.contains('active')?'var(--momo-bg)':''">${e}</button>
            `).join('')}
          </div>
        </div>
        <div class="form-group"><label class="form-label">メモ</label><textarea class="form-textarea" id="ea-memo" rows="2" placeholder="感情が動く理由・演出のポイント"></textarea></div>
        <button class="btn btn-primary" style="width:100%" onclick="addEmotionScene()"><i class="fas fa-plus"></i> シーンを追加</button>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-list icon" style="color:var(--momo)"></i> シーン一覧</div>
          <button class="btn btn-ghost btn-sm" onclick="clearEmotionArc()"><i class="fas fa-trash"></i> クリア</button>
        </div>
        <div id="ea-scene-list">
          ${scenes.length === 0 ? '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:20px">シーンがありません</div>' :
            scenes.map((s,i) => `
            <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-light)">
              <div style="width:26px;height:26px;border-radius:50%;background:var(--momo-bg);color:var(--momo);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">${s.level}</div>
              <div style="flex:1;overflow:hidden">
                <div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.name)}</div>
                ${s.emotions?.length > 0 ? `<div style="font-size:10.5px;color:var(--text-muted)">${s.emotions.join('・')}</div>` : ''}
              </div>
              <button class="btn btn-ghost btn-icon btn-sm" onclick="removeEmotionScene(${i})"><i class="fas fa-xmark" style="font-size:10px"></i></button>
            </div>`).join('')}
        </div>
      </div>
    </div>
    <div>
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-chart-line icon" style="color:var(--momo)"></i> 感情曲線</div></div>
        <div id="ea-chart-wrap">
          ${scenes.length < 2 ? `<div style="text-align:center;padding:60px 20px;color:var(--text-muted)"><i class="fas fa-heart-pulse" style="font-size:40px;display:block;margin-bottom:14px;opacity:0.2"></i><div style="font-size:13px">2シーン以上追加すると<br>感情曲線が表示されます</div></div>` : renderEmotionArcChart(scenes)}
        </div>
        ${scenes.length >= 2 ? `
        <div style="margin-top:12px;padding:12px;background:var(--bg-subtle);border-radius:var(--radius-sm);font-size:12px">
          <div style="font-weight:700;color:var(--text-primary);margin-bottom:6px"><i class="fas fa-lightbulb" style="color:var(--kogane);margin-right:5px"></i>分析コメント</div>
          ${(() => {
            const avg = scenes.reduce((a,s)=>a+s.level,0)/scenes.length;
            const max = Math.max(...scenes.map(s=>s.level));
            const min = Math.min(...scenes.map(s=>s.level));
            const range = max - min;
            const tips = [];
            if (range < 3) tips.push('⚠️ 感情の振れ幅が小さいです。もっと起伏を作りましょう。');
            if (avg > 7) tips.push('⚠️ 平均テンションが高すぎます。低いシーンを意図的に作りましょう。');
            if (avg < 4) tips.push('⚠️ 全体的にテンションが低めです。山場の強化を検討してください。');
            const lastScene = scenes[scenes.length-1];
            if (lastScene && lastScene.level < 5) tips.push('💡 ラストシーンの感情レベルが低め。余韻を意識した設計かどうか確認してください。');
            if (tips.length === 0) tips.push('✅ バランスの良い感情曲線です！');
            return tips.map(t=>`<div style="color:var(--text-secondary);line-height:1.7">${t}</div>`).join('');
          })()}
        </div>` : ''}
      </div>
    </div>
  </div>`;
}

function renderEmotionArcChart(scenes) {
  if (!scenes || scenes.length < 2) return '';
  const w = 420, h = 160, pad = 30;
  const maxL = 10, minL = 1;
  const stepX = (w - pad*2) / (scenes.length - 1);
  const scaleY = (l) => pad + (h - pad*2) * (1 - (l - minL) / (maxL - minL));
  const pts = scenes.map((s,i) => ({ x: pad + i * stepX, y: scaleY(s.level), ...s }));
  const pathD = pts.map((p,i) => (i===0?`M${p.x},${p.y}`:`L${p.x},${p.y}`)).join(' ');
  const areaD = `${pathD} L${pts[pts.length-1].x},${h-pad} L${pad},${h-pad} Z`;

  const gridLines = [2,4,6,8,10].map(l => {
    const y = scaleY(l);
    return `<line x1="${pad}" y1="${y}" x2="${w-pad}" y2="${y}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,3"/>
    <text x="${pad-4}" y="${y+4}" font-size="8" fill="var(--text-muted)" text-anchor="end">${l}</text>`;
  }).join('');

  const dots = pts.map((p,i) => `
    <circle cx="${p.x}" cy="${p.y}" r="5" fill="var(--momo)" stroke="white" stroke-width="2"/>
    <text x="${p.x}" y="${h-10}" font-size="8" fill="var(--text-muted)" text-anchor="middle">${esc(p.name?.slice(0,6)||'')}</text>`).join('');

  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;overflow:visible">
    ${gridLines}
    <path d="${areaD}" fill="var(--momo)" opacity="0.08"/>
    <path d="${pathD}" fill="none" stroke="var(--momo)" stroke-width="2.5" stroke-linejoin="round"/>
    ${dots}
  </svg>`;
}

function addEmotionScene() {
  const name = document.getElementById('ea-scene-name')?.value.trim();
  const level = parseInt(document.getElementById('ea-emotion-level')?.value || '5');
  const emotions = [...document.querySelectorAll('#ea-emotion-select .btn.active')].map(b => b.textContent.trim());
  const memo = document.getElementById('ea-memo')?.value.trim();
  if (!name) { toast('シーン名を入力してください', 'error'); return; }
  const arcData = JSON.parse(localStorage.getItem('sl_emotion_arc') || '{"scenes":[]}');
  arcData.scenes = arcData.scenes || [];
  arcData.scenes.push({ name, level, emotions, memo, addedAt: new Date().toISOString() });
  localStorage.setItem('sl_emotion_arc', JSON.stringify(arcData));
  toast('シーンを追加しました', 'success');
  render();
}

function removeEmotionScene(idx) {
  const arcData = JSON.parse(localStorage.getItem('sl_emotion_arc') || '{"scenes":[]}');
  arcData.scenes.splice(idx, 1);
  localStorage.setItem('sl_emotion_arc', JSON.stringify(arcData));
  render();
}

function clearEmotionArc() {
  localStorage.removeItem('sl_emotion_arc');
  render();
}

// ================================================================
//  TOOL: 世界観メモパッド
// ================================================================
function renderToolWorldNotes() {
  const notes = JSON.parse(localStorage.getItem('sl_world_notes') || '[]');
  const WORLD_CATS = ['設定・ルール','地名・場所','用語・専門語','キャラ設定メモ','時代・時系列','その他'];
  const filterCat = localStorage.getItem('sl_world_filter') || '';
  const searchQ = localStorage.getItem('sl_world_search') || '';
  let filtered = notes;
  if (filterCat) filtered = filtered.filter(n => n.category === filterCat);
  if (searchQ) filtered = filtered.filter(n => n.title.includes(searchQ) || n.body.includes(searchQ));

  return `
  <div class="article-back-btn" onclick="navigate('tools')"><i class="fas fa-arrow-left"></i> ツール一覧</div>
  <div class="section-header">
    <div class="section-title"><i class="fas fa-globe" style="color:var(--asagi)"></i> 世界観メモパッド</div>
    <div class="section-desc">設定・ルール・用語・地名などを素早く記録し、カテゴリで管理します</div>
  </div>
  <div style="display:grid;grid-template-columns:340px 1fr;gap:20px">
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-plus icon" style="color:var(--asagi)"></i> メモを追加</div></div>
        <div class="form-group"><label class="form-label">タイトル <span style="color:var(--accent)">*</span></label><input class="form-input" id="wn-title" placeholder="例：魔法システムのルール"></div>
        <div class="form-group">
          <label class="form-label">カテゴリ</label>
          <select class="form-select" id="wn-category">
            ${WORLD_CATS.map(c=>`<option>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">内容</label><textarea class="form-textarea" id="wn-body" rows="4" placeholder="詳細を記入…"></textarea></div>
        <button class="btn btn-primary" style="width:100%" onclick="addWorldNote()"><i class="fas fa-plus"></i> 追加する</button>
      </div>
      <div class="card">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">カテゴリフィルター</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          <button class="btn btn-sm ${!filterCat?'btn-primary':'btn-ghost'}" onclick="setWorldFilter('')">すべて (${notes.length})</button>
          ${WORLD_CATS.map(c=>{
            const cnt = notes.filter(n=>n.category===c).length;
            return cnt>0?`<button class="btn btn-sm ${filterCat===c?'btn-primary':'btn-ghost'}" onclick="setWorldFilter('${c}')" style="font-size:11px">${c} (${cnt})</button>`:'';
          }).join('')}
        </div>
      </div>
    </div>
    <div>
      <div class="card" style="margin-bottom:12px;padding:10px 14px">
        <div style="position:relative">
          <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:12px;pointer-events:none"></i>
          <input class="form-input" style="padding-left:32px" placeholder="メモを検索…" value="${esc(searchQ)}" oninput="setWorldSearch(this.value)">
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px" id="wn-list">
        ${filtered.length === 0 ? `<div style="text-align:center;padding:60px 20px;color:var(--text-muted)"><i class="fas fa-globe" style="font-size:40px;display:block;margin-bottom:14px;opacity:0.2"></i><div style="font-size:13px">メモがありません<br>左のフォームから追加してください</div></div>` :
          filtered.map((n,i)=>{
            const realIdx = notes.indexOf(n);
            return `<div class="card" style="padding:14px">
              <div style="display:flex;align-items:flex-start;gap:10px">
                <div style="flex:1">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                    <div style="font-size:13.5px;font-weight:700;color:var(--text-primary)">${esc(n.title)}</div>
                    <span style="font-size:10px;padding:2px 7px;background:var(--asagi-bg);color:var(--asagi);border:1px solid var(--asagi-border);border-radius:10px;font-weight:600">${esc(n.category)}</span>
                  </div>
                  <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;white-space:pre-wrap">${esc(n.body)}</div>
                  <div style="font-size:10px;color:var(--text-muted);margin-top:6px">${n.createdAt?.slice(0,10)||''}</div>
                </div>
                <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteWorldNote(${realIdx})"><i class="fas fa-trash" style="font-size:11px;color:var(--text-muted)"></i></button>
              </div>
            </div>`;
          }).join('')}
      </div>
    </div>
  </div>`;
}

function addWorldNote() {
  const title = document.getElementById('wn-title')?.value.trim();
  const category = document.getElementById('wn-category')?.value;
  const body = document.getElementById('wn-body')?.value.trim();
  if (!title) { toast('タイトルを入力してください', 'error'); return; }
  const notes = JSON.parse(localStorage.getItem('sl_world_notes') || '[]');
  notes.unshift({ title, category, body, createdAt: new Date().toISOString() });
  localStorage.setItem('sl_world_notes', JSON.stringify(notes));
  toast('メモを追加しました', 'success');
  render();
}

function deleteWorldNote(idx) {
  const notes = JSON.parse(localStorage.getItem('sl_world_notes') || '[]');
  notes.splice(idx, 1);
  localStorage.setItem('sl_world_notes', JSON.stringify(notes));
  render();
}

function setWorldFilter(cat) {
  localStorage.setItem('sl_world_filter', cat);
  render();
}

function setWorldSearch(q) {
  localStorage.setItem('sl_world_search', q);
  render();
}

// ================================================================
// ── 新ツール: セリフ磨き診断 ─────────────────────────────────
function renderToolDialogueCheck() {
  return `
  <div class="page-header">
    <button class="btn btn-ghost btn-sm" onclick="navigate('tools')"><i class="fas fa-arrow-left"></i> ツール一覧</button>
  </div>
  <div style="background:linear-gradient(135deg,var(--fuji-bg),var(--bg-subtle));border:1px solid var(--fuji-border);border-radius:var(--radius-lg);padding:22px 26px;margin-bottom:22px;position:relative;overflow:hidden">
    <div style="position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:70px;font-weight:700;font-family:'Noto Serif JP',serif;color:var(--fuji);opacity:0.07;pointer-events:none">台</div>
    <div style="width:28px;height:2.5px;background:linear-gradient(90deg,var(--fuji),var(--momo));border-radius:2px;margin-bottom:10px"></div>
    <div style="font-size:20px;font-weight:700;font-family:'Noto Serif JP',serif;color:var(--text-primary);margin-bottom:5px">
      <i class="fas fa-comments" style="color:var(--fuji);margin-right:8px"></i>セリフ磨き診断
    </div>
    <div style="font-size:13px;color:var(--text-muted)">台詞を入力して品質チェック。8つの診断項目でセリフを採点・改善提案します。</div>
  </div>

  <div class="card" style="margin-bottom:16px">
    <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px"><i class="fas fa-pencil" style="color:var(--fuji);margin-right:6px"></i>キャラクター情報</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:5px;font-weight:600">キャラクター名</div>
        <input class="form-input" id="dc-char-name" placeholder="例: 田中誠" style="font-size:13px">
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:5px;font-weight:600">シーンの感情トーン</div>
        <select class="form-select" id="dc-tone" style="font-size:13px">
          <option value="">選択…</option>
          <option value="angry">怒り・対立</option>
          <option value="sad">悲しみ・喪失</option>
          <option value="happy">喜び・興奮</option>
          <option value="tense">緊張・恐怖</option>
          <option value="neutral">中立・情報</option>
          <option value="love">愛情・親密</option>
        </select>
      </div>
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:5px;font-weight:600">診断するセリフ（1〜3行推奨）</div>
    <textarea class="form-input" id="dc-dialogue" rows="4" placeholder="例：&#10;「あなたのことを思って言っているんだよ」&#10;「でも……私にはわからない。何が正しいのか」" style="font-size:13px;line-height:1.7;resize:vertical"></textarea>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:5px;margin-top:10px;font-weight:600">セリフの背景・文脈（任意）</div>
    <input class="form-input" id="dc-context" placeholder="例: 別れを告げる直前のシーン、相手は気づいていない" style="font-size:13px">
    <button class="btn btn-primary" style="margin-top:14px;width:100%" onclick="analyzeDialogue()">
      <i class="fas fa-magnifying-glass"></i> セリフを診断する
    </button>
  </div>

  <div id="dc-results" style="display:none">
    <div class="card" style="margin-bottom:16px;border-top:3px solid var(--fuji)">
      <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:14px;font-family:'Noto Serif JP',serif">
        <i class="fas fa-chart-bar" style="color:var(--fuji);margin-right:7px"></i>診断結果
      </div>
      <div id="dc-score-bar" style="margin-bottom:16px"></div>
      <div id="dc-items-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px"></div>
    </div>
    <div class="card" style="border-top:3px solid var(--matcha)">
      <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:12px">
        <i class="fas fa-lightbulb" style="color:var(--matcha);margin-right:7px"></i>改善アドバイス
      </div>
      <div id="dc-advice" style="font-size:13px;color:var(--text-secondary);line-height:1.8"></div>
    </div>
  </div>`;
}

function analyzeDialogue() {
  const dialogue = document.getElementById('dc-dialogue')?.value.trim();
  const charName = document.getElementById('dc-char-name')?.value.trim() || 'キャラクター';
  const tone = document.getElementById('dc-tone')?.value;
  const context = document.getElementById('dc-context')?.value.trim();
  if (!dialogue) { toast('セリフを入力してください', 'error'); return; }

  const checks = [
    { id:'len', label:'長さ', icon:'fa-ruler', desc:'1台詞あたりの適切な長さ',
      check: () => { const lines = dialogue.split('\n').filter(Boolean); const maxL = Math.max(...lines.map(l=>l.length)); return maxL <= 60 ? { pass:true, note:'適切な長さです' } : { pass:false, note:`${maxL}文字。1行60字以下が目安。分割を検討してください。` }; }
    },
    { id:'label', label:'感情ラベリング', icon:'fa-face-meh', desc:'感情を直接言っていないか',
      check: () => { const bad = ['悲しい','嬉しい','怖い','辛い','幸せ','寂しい','怒っている']; const found = bad.filter(w => dialogue.includes(w)); return found.length===0 ? { pass:true, note:'感情のラベリングなし（良好）' } : { pass:false, note:`「${found.join('・')}」を使用。感情は行動・言い回しで見せましょう。` }; }
    },
    { id:'explain', label:'説明過多', icon:'fa-scroll', desc:'テーマや状況を直接説明していないか',
      check: () => { const p = ['つまり','要するに','ということは','だから言っているんだ','結局のところ']; const f = p.filter(w=>dialogue.includes(w)); return f.length===0 ? { pass:true, note:'説明過多なし（良好）' } : { pass:false, note:`「${f.join('・')}」は説明的すぎる傾向があります。` }; }
    },
    { id:'onomatop', label:'語尾のバリエーション', icon:'fa-shuffle', desc:'語尾が単調でないか',
      check: () => { const ends = dialogue.replace(/」/g,'').split(/[。…！？\n]/).filter(Boolean).map(l=>l.slice(-2)); const uniq = new Set(ends); return uniq.size >= Math.min(2, ends.length) ? { pass:true, note:'語尾に変化あり（良好）' } : { pass:false, note:'語尾が単調かもしれません。リズムを変えてみましょう。' }; }
    },
    { id:'subtext', label:'サブテキスト', icon:'fa-comment-dots', desc:'言外の意味・裏の意図があるか',
      check: () => { const words = dialogue.length; const q = (dialogue.match(/[…。]/g)||[]).length; const score = q/Math.max(words,1); return q >= 1 || context ? { pass:true, note:'含みや余白が感じられます' } : { pass:false, note:'もう少し「言わない」部分を増やすとサブテキストが生まれます。' }; }
    },
    { id:'character', label:'キャラクター性', icon:'fa-user', desc:'このキャラクターらしさがあるか',
      check: () => { const n = charName !== 'キャラクター'; return n ? { pass:true, note:`${charName}のセリフとして記録しました。声の個性を意識しましょう。` } : { pass:'warn', note:'キャラクター名が未入力です。名前を入れると一貫性チェックがしやすくなります。' }; }
    },
    { id:'repeat', label:'繰り返し', icon:'fa-copy', desc:'同じ言葉の繰り返しがないか',
      check: () => { const ws = dialogue.replace(/[「」、。！？…\n]/g,' ').split(/\s+/).filter(w=>w.length>=2); const cnt = {}; ws.forEach(w=>cnt[w]=(cnt[w]||0)+1); const dup = Object.entries(cnt).filter(([w,c])=>c>=2).map(([w])=>w); return dup.length===0 ? { pass:true, note:'不要な繰り返しなし（良好）' } : { pass:false, note:`「${dup.join('・')}」が複数回出現。意図的でなければ削除を。` }; }
    },
    { id:'question', label:'余白・間', icon:'fa-ellipsis', desc:'沈黙・間・余白があるか',
      check: () => { const has = /[…。\u3002]{2,}|（沈黙|（間|（ポーズ/.test(dialogue); return has ? { pass:true, note:'間・余白の表現があります' } : { pass:'warn', note:'「……」や「（沈黙）」などで間を演出すると効果的な場合があります。' }; }
    },
  ];

  const results = checks.map(c => ({ ...c, result: c.check() }));
  const passCount = results.filter(r => r.result.pass === true).length;
  const warnCount = results.filter(r => r.result.pass === 'warn').length;
  const failCount = results.filter(r => r.result.pass === false).length;
  const score = Math.round((passCount + warnCount * 0.5) / results.length * 100);
  const scoreColor = score >= 80 ? 'var(--matcha)' : score >= 60 ? 'var(--kogane)' : 'var(--accent)';
  const scoreLabel = score >= 80 ? '優秀' : score >= 60 ? '良好' : '要改善';

  const scoreBar = `
  <div style="display:flex;align-items:center;gap:16px;padding:14px 18px;background:var(--bg-subtle);border-radius:var(--radius-md);border:1px solid var(--border)">
    <div style="width:60px;height:60px;border-radius:50%;background:var(--bg-card);border:3px solid ${scoreColor};display:flex;align-items:center;justify-content:center;flex-direction:column;flex-shrink:0">
      <div style="font-size:18px;font-weight:800;color:${scoreColor}">${score}</div>
      <div style="font-size:9px;color:var(--text-muted)">点</div>
    </div>
    <div style="flex:1">
      <div style="font-size:15px;font-weight:700;color:${scoreColor};margin-bottom:4px">${scoreLabel}</div>
      <div style="display:flex;gap:12px;font-size:12px">
        <span style="color:var(--matcha)"><i class="fas fa-check-circle"></i> 合格 ${passCount}</span>
        <span style="color:var(--kogane)"><i class="fas fa-exclamation-circle"></i> 注意 ${warnCount}</span>
        <span style="color:var(--accent)"><i class="fas fa-times-circle"></i> 要修正 ${failCount}</span>
      </div>
      <div style="margin-top:6px;height:5px;background:var(--bg-hover);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${score}%;background:${scoreColor};border-radius:3px;transition:width .6s ease"></div>
      </div>
    </div>
  </div>`;

  const items = results.map(r => {
    const status = r.result.pass === true ? { icon:'fa-check-circle', color:'var(--matcha)', bg:'var(--matcha-bg)', border:'var(--matcha-border)' }
      : r.result.pass === 'warn' ? { icon:'fa-exclamation-circle', color:'var(--kogane)', bg:'var(--kogane-bg)', border:'var(--kogane-border)' }
      : { icon:'fa-times-circle', color:'var(--accent)', bg:'var(--accent-bg)', border:'var(--accent-border)' };
    return `
    <div style="padding:10px 12px;background:${status.bg};border:1px solid ${status.border};border-radius:var(--radius-md)">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px">
        <i class="fas ${status.icon}" style="color:${status.color};font-size:13px"></i>
        <span style="font-size:12.5px;font-weight:700;color:var(--text-primary)">${r.label}</span>
      </div>
      <div style="font-size:11.5px;color:var(--text-secondary);line-height:1.6">${r.result.note}</div>
    </div>`;
  }).join('');

  // 改善アドバイス
  const advices = [];
  if (failCount === 0 && warnCount === 0) advices.push('🏆 すべての診断項目をクリアしました！このセリフは高品質です。声に出して読んで最終確認しましょう。');
  if (results.find(r=>r.id==='label' && r.result.pass===false)) advices.push('💡 <strong>感情を見せる</strong>: 「悲しい」→「…もう笑えない」のように、状態ではなく言動でキャラクターの感情を伝えましょう。');
  if (results.find(r=>r.id==='subtext' && r.result.pass!==true)) advices.push('💡 <strong>サブテキスト</strong>: 本音を言わせず、行間に意味を隠しましょう。「愛してる」より「なんで……こんなとこまで来たんだ」の方が深みが出ます。');
  if (results.find(r=>r.id==='len' && r.result.pass===false)) advices.push('💡 <strong>セリフの分割</strong>: 長いセリフは他のキャラクターのリアクションや間で分割すると、テンポが生まれます。');
  if (results.find(r=>r.id==='explain' && r.result.pass===false)) advices.push('💡 <strong>説明を削る</strong>: 観客に説明するのではなく、シーンで体験させましょう。登場人物は知っている情報を「説明」しません。');
  if (tone === 'tense' && !dialogue.includes('…')) advices.push('💡 <strong>緊張シーンのテクニック</strong>: 緊張場面では短いセリフ・沈黙・「……」を多用すると心拍数が上がります。');
  if (advices.length === 0) advices.push('📝 このセリフは概ね良好です。次は声に出して読み、自然さを確認しましょう。');

  document.getElementById('dc-score-bar').innerHTML = scoreBar;
  document.getElementById('dc-items-grid').innerHTML = items;
  document.getElementById('dc-advice').innerHTML = advices.join('<br><br>');
  document.getElementById('dc-results').style.display = 'block';
  document.getElementById('dc-results').scrollIntoView({ behavior:'smooth', block:'start' });
}

// ── 新ツール: プロット穴探し ──────────────────────────────────
function renderToolPlotHoles() {
  return `
  <div class="page-header">
    <button class="btn btn-ghost btn-sm" onclick="navigate('tools')"><i class="fas fa-arrow-left"></i> ツール一覧</button>
  </div>
  <div style="background:linear-gradient(135deg,var(--accent-bg),var(--bg-subtle));border:1px solid var(--accent-border);border-radius:var(--radius-lg);padding:22px 26px;margin-bottom:22px;position:relative;overflow:hidden">
    <div style="position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:70px;font-weight:700;font-family:'Noto Serif JP',serif;color:var(--accent);opacity:0.07;pointer-events:none">穴</div>
    <div style="width:28px;height:2.5px;background:linear-gradient(90deg,var(--accent),var(--kogane));border-radius:2px;margin-bottom:10px"></div>
    <div style="font-size:20px;font-weight:700;font-family:'Noto Serif JP',serif;color:var(--text-primary);margin-bottom:5px">
      <i class="fas fa-magnifying-glass" style="color:var(--accent);margin-right:8px"></i>プロット穴探し
    </div>
    <div style="font-size:13px;color:var(--text-muted)">物語の構造を入力して論理矛盾・伏線未回収・動機不備を自動検出します。</div>
  </div>

  <div class="card" style="margin-bottom:16px">
    <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:14px;font-family:'Noto Serif JP',serif">
      <i class="fas fa-layer-group" style="color:var(--accent);margin-right:7px"></i>物語の骨格を入力
    </div>
    <div style="display:grid;gap:14px">
      <div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:5px;font-weight:600">主人公の目標（何を達成しようとしているか）<span style="color:var(--accent)">*</span></div>
        <input class="form-input" id="ph-goal" placeholder="例: 失踪した妹を見つけ出す" style="font-size:13px">
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:5px;font-weight:600">主な障害・敵役（何が妨げているか）</div>
        <input class="form-input" id="ph-obstacle" placeholder="例: 組織に追われている・妹は死んでいると思っている" style="font-size:13px">
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:5px;font-weight:600">Act 1 の終わり（転換点1）</div>
        <textarea class="form-input" id="ph-act1" rows="2" placeholder="例: 妹から暗号メッセージを受け取り、追われる立場になる" style="font-size:13px;resize:vertical"></textarea>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:5px;font-weight:600">ミッドポイント（中盤の転換）</div>
        <textarea class="form-input" id="ph-mid" rows="2" placeholder="例: 協力者が組織の人間だと判明、信頼関係が崩れる" style="font-size:13px;resize:vertical"></textarea>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:5px;font-weight:600">クライマックス（最終対決）</div>
        <textarea class="form-input" id="ph-climax" rows="2" placeholder="例: 組織のアジトに単身乗り込み、妹を救出" style="font-size:13px;resize:vertical"></textarea>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:5px;font-weight:600">伏線リスト（張った伏線をカンマ区切りで）</div>
        <textarea class="form-input" id="ph-foreshadow" rows="2" placeholder="例: 協力者の左手首の傷、妹が残したメモ、謎の写真" style="font-size:13px;resize:vertical"></textarea>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:5px;font-weight:600">回収した伏線（カンマ区切りで）</div>
        <input class="form-input" id="ph-resolved" placeholder="例: 協力者の左手首の傷、謎の写真" style="font-size:13px">
      </div>
    </div>
    <button class="btn btn-primary" style="margin-top:16px;width:100%" onclick="analyzePlotHoles()">
      <i class="fas fa-magnifying-glass"></i> プロット穴を検出する
    </button>
  </div>

  <div id="ph-results" style="display:none"></div>`;
}

function analyzePlotHoles() {
  const goal = document.getElementById('ph-goal')?.value.trim();
  const obstacle = document.getElementById('ph-obstacle')?.value.trim();
  const act1 = document.getElementById('ph-act1')?.value.trim();
  const mid = document.getElementById('ph-mid')?.value.trim();
  const climax = document.getElementById('ph-climax')?.value.trim();
  const foreshadowRaw = document.getElementById('ph-foreshadow')?.value.trim();
  const resolvedRaw = document.getElementById('ph-resolved')?.value.trim();
  if (!goal) { toast('主人公の目標を入力してください', 'error'); return; }

  const foreshadows = foreshadowRaw ? foreshadowRaw.split(/[,、，]/).map(s=>s.trim()).filter(Boolean) : [];
  const resolved = resolvedRaw ? resolvedRaw.split(/[,、，]/).map(s=>s.trim()).filter(Boolean) : [];
  const unresolved = foreshadows.filter(f => !resolved.some(r => r.includes(f.slice(0,4)) || f.includes(r.slice(0,4))));

  const issues = [];
  const warnings = [];
  const ok = [];

  // 目標チェック
  if (goal.length < 8) issues.push({ title:'目標が漠然としている', desc:'主人公の目標は具体的で測定可能なものにしましょう。「何を、いつまでに達成するか」が明確であるほど物語の推進力が増します。' });
  else ok.push({ title:'目標が設定されている', desc:`「${goal}」という明確な目標があります。` });

  // 障害チェック
  if (!obstacle) warnings.push({ title:'障害・敵役の記述なし', desc:'主人公の目標を妨げる障害や対立が明記されていません。強い障害がないと物語は弛緩します。' });
  else ok.push({ title:'障害が設定されている', desc:'目標に対する対立構造があります。' });

  // 構造チェック
  if (!act1) warnings.push({ title:'Act1終了（転換点）が未記入', desc:'転換点1がないと物語が一本調子になります。主人公が「引き返せない選択」をする瞬間を設けましょう。' });
  else ok.push({ title:'転換点1が設定されている', desc:'' });
  if (!mid) warnings.push({ title:'ミッドポイントが未記入', desc:'ミッドポイントがないとAct2が間延びしやすくなります。主人公の目標・認識が変わる中間点を設けましょう。' });
  else ok.push({ title:'ミッドポイントが設定されている', desc:'' });
  if (!climax) issues.push({ title:'クライマックスが未記入', desc:'クライマックスは物語の「証明」です。主人公が変化したことを行動で示す最終対決を明確にしましょう。' });
  else ok.push({ title:'クライマックスが設定されている', desc:'' });

  // 伏線チェック
  if (foreshadows.length === 0) warnings.push({ title:'伏線が記録されていない', desc:'伏線と回収は物語に必然性を生みます。重要な設定・小道具・セリフを伏線リストで管理しましょう。' });
  else if (unresolved.length > 0) {
    issues.push({ title:`未回収の伏線: ${unresolved.length}件`, desc:`「${unresolved.join('・')}」が回収されていないようです。意図的でなければ物語の穴になります。` });
  } else {
    ok.push({ title:'全伏線が回収されている', desc:`${foreshadows.length}件の伏線がすべて回収されています。` });
  }

  // クライマックスと目標の整合
  if (climax && goal && !climax.includes(goal.slice(0,4)) && !goal.includes(climax.slice(0,4))) {
    warnings.push({ title:'クライマックスと目標の整合を確認', desc:`目標「${goal.slice(0,15)}…」とクライマックスの直接的なつながりが見えにくいかもしれません。目標の達成/失敗がクライマックスで明確に示されているか確認しましょう。` });
  }

  const totalIssues = issues.length;
  const totalWarnings = warnings.length;
  const healthScore = Math.max(0, 100 - totalIssues * 20 - totalWarnings * 8);
  const healthColor = healthScore >= 80 ? 'var(--matcha)' : healthScore >= 60 ? 'var(--kogane)' : 'var(--accent)';

  const makeItems = (arr, type) => arr.map(item => {
    const s = type === 'issue' ? { icon:'fa-circle-xmark', color:'var(--accent)', bg:'var(--accent-bg)', border:'var(--accent-border)' }
      : type === 'warn' ? { icon:'fa-triangle-exclamation', color:'var(--kogane)', bg:'var(--kogane-bg)', border:'var(--kogane-border)' }
      : { icon:'fa-circle-check', color:'var(--matcha)', bg:'var(--matcha-bg)', border:'var(--matcha-border)' };
    return `<div style="padding:12px 14px;background:${s.bg};border:1px solid ${s.border};border-radius:var(--radius-md);margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px">
        <i class="fas ${s.icon}" style="color:${s.color}"></i>
        <span style="font-size:13px;font-weight:700;color:var(--text-primary)">${item.title}</span>
      </div>
      ${item.desc ? `<div style="font-size:12px;color:var(--text-secondary);line-height:1.7;padding-left:20px">${item.desc}</div>` : ''}
    </div>`;
  }).join('');

  const html = `
  <div class="card" style="border-top:3px solid ${healthColor};margin-bottom:16px">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
      <div style="width:64px;height:64px;border-radius:50%;background:var(--bg-subtle);border:3px solid ${healthColor};display:flex;align-items:center;justify-content:center;flex-direction:column;flex-shrink:0">
        <div style="font-size:20px;font-weight:800;color:${healthColor}">${healthScore}</div>
        <div style="font-size:9px;color:var(--text-muted)">健全度</div>
      </div>
      <div>
        <div style="font-size:16px;font-weight:700;color:${healthColor};margin-bottom:4px">${healthScore >= 80 ? '物語構造は健全です' : healthScore >= 60 ? '一部要修正' : '重大な穴があります'}</div>
        <div style="font-size:12px;color:var(--text-muted)">問題 ${totalIssues}件 / 注意 ${totalWarnings}件 / 良好 ${ok.length}件</div>
      </div>
    </div>
    ${totalIssues > 0 ? `<div style="font-size:12.5px;font-weight:700;color:var(--accent);margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:6px"><i class="fas fa-circle-xmark"></i> 重大な問題 (${totalIssues})</div>${makeItems(issues,'issue')}` : ''}
    ${totalWarnings > 0 ? `<div style="font-size:12.5px;font-weight:700;color:var(--kogane);margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:6px;margin-top:${totalIssues>0?12:0}px"><i class="fas fa-triangle-exclamation"></i> 注意事項 (${totalWarnings})</div>${makeItems(warnings,'warn')}` : ''}
    ${ok.length > 0 ? `<div style="font-size:12.5px;font-weight:700;color:var(--matcha);margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:6px;margin-top:12px"><i class="fas fa-circle-check"></i> 良好な点 (${ok.length})</div>${makeItems(ok,'ok')}` : ''}
  </div>`;

  document.getElementById('ph-results').innerHTML = html;
  document.getElementById('ph-results').style.display = 'block';
  document.getElementById('ph-results').scrollIntoView({ behavior:'smooth', block:'start' });
}

// ── 新ツール: ビートカウンター (Save the Cat) ────────────────────
function renderToolBeatCounter() {
  const beats = DB.get('sl_beat_counter', {});
  const BEAT_LIST = [
    { id:'opening', name:'オープニングイメージ', pct:1, color:'var(--kon-lt)', desc:'物語の最初の印象。世界の状態を示す「静止画」' },
    { id:'theme', name:'テーマの提示', pct:5, color:'var(--fuji)', desc:'主人公が聞き流す、物語のテーマとなる一言' },
    { id:'setup', name:'設定', pct:10, color:'var(--fuji)', desc:'世界・主人公・友人・日常を紹介する' },
    { id:'catalyst', name:'触媒・発端', pct:12, color:'var(--accent)', desc:'主人公の日常を変える出来事' },
    { id:'debate', name:'議論', pct:25, color:'var(--kogane)', desc:'変化への恐れ。行くべきか留まるべきか' },
    { id:'act2start', name:'第二幕への突入', pct:25, color:'var(--accent)', desc:'主人公が選択し新世界へ踏み出す' },
    { id:'bstory', name:'Bストーリー開始', pct:30, color:'var(--momo)', desc:'サブプロット（恋愛・友情）の始まり。テーマの体現者' },
    { id:'fun', name:'楽しみと遊び', pct:50, color:'var(--matcha)', desc:'新世界での活動。映画の「予告編要素」' },
    { id:'midpoint', name:'ミッドポイント', pct:50, color:'var(--accent)', desc:'主人公が「これが欲しい」と認識する転換点' },
    { id:'badguys', name:'悪役の迫来', pct:75, color:'var(--accent)', desc:'敵が反撃。主人公への圧力が増す' },
    { id:'allis', name:'すべてを失う', pct:75, color:'var(--accent)', desc:'主人公が最低点に。すべてが崩壊する瞬間' },
    { id:'dark', name:'暗闇の魂', pct:85, color:'var(--fuji)', desc:'すべてを失った後の省察・再起のための沈黙' },
    { id:'finalact', name:'第三幕への突入', pct:85, color:'var(--accent)', desc:'クライマックスに向けた行動開始' },
    { id:'climax', name:'クライマックス', pct:99, color:'var(--accent)', desc:'主人公が変化を証明する最終対決' },
    { id:'closing', name:'クロージングイメージ', pct:100, color:'var(--kon-lt)', desc:'オープニングイメージの対になる「新しい世界」の静止画' },
  ];

  const completedCount = BEAT_LIST.filter(b => beats[b.id]?.completed).length;
  const pct = Math.round(completedCount / BEAT_LIST.length * 100);

  const beatItems = BEAT_LIST.map((b, i) => {
    const done = beats[b.id]?.completed;
    const note = beats[b.id]?.note || '';
    return `
    <div style="padding:12px 14px;background:${done ? 'var(--matcha-bg)' : 'var(--bg-subtle)'};border:1px solid ${done ? 'var(--matcha-border)' : 'var(--border)'};border-radius:var(--radius-md);margin-bottom:8px;transition:all .2s">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <div style="display:flex;align-items:center;gap:8px;flex:1">
          <input type="checkbox" id="beat-cb-${b.id}" ${done ? 'checked' : ''} onchange="toggleBeat('${b.id}')" style="width:16px;height:16px;accent-color:var(--matcha);flex-shrink:0;margin-top:2px">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-size:11px;background:${b.color}22;color:${b.color};padding:1px 7px;border-radius:var(--radius-full);font-weight:700">${i+1}</span>
              <span style="font-size:13.5px;font-weight:${done?'600':'700'};color:${done?'var(--text-muted)':'var(--text-primary)'};text-decoration:${done?'line-through':''}">${b.name}</span>
              <span style="font-size:10px;color:var(--text-muted)">p.${b.pct}</span>
            </div>
            <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px;padding-left:24px">${b.desc}</div>
            <input class="form-input" style="margin-top:6px;padding-left:24px;font-size:11.5px;height:30px;background:transparent;border-color:${done?'var(--matcha-border)':'var(--border)'}" placeholder="メモ（シーン番号、ページ数など）" value="${esc(note)}" oninput="saveBeatNote('${b.id}',this.value)">
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  return `
  <div class="page-header">
    <button class="btn btn-ghost btn-sm" onclick="navigate('tools')"><i class="fas fa-arrow-left"></i> ツール一覧</button>
  </div>
  <div style="background:linear-gradient(135deg,var(--kogane-bg),var(--bg-subtle));border:1px solid var(--kogane-border);border-radius:var(--radius-lg);padding:22px 26px;margin-bottom:22px;position:relative;overflow:hidden">
    <div style="position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:70px;font-weight:700;font-family:'Noto Serif JP',serif;color:var(--kogane);opacity:0.07;pointer-events:none">ビ</div>
    <div style="width:28px;height:2.5px;background:linear-gradient(90deg,var(--kogane),var(--accent));border-radius:2px;margin-bottom:10px"></div>
    <div style="font-size:20px;font-weight:700;font-family:'Noto Serif JP',serif;color:var(--text-primary);margin-bottom:5px">
      <i class="fas fa-list-ol" style="color:var(--kogane);margin-right:8px"></i>ビートカウンター
    </div>
    <div style="font-size:13px;color:var(--text-muted)">Save the Cat の15ビートを脚本に対応付け、進捗をトラッキング</div>
  </div>

  <div style="padding:12px 16px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-md);margin-bottom:16px;display:flex;align-items:center;gap:14px">
    <div style="flex:1">
      <div style="font-size:12.5px;font-weight:700;color:var(--text-primary);margin-bottom:5px">進捗: ${completedCount}/${BEAT_LIST.length}ビート完了 (${pct}%)</div>
      <div style="height:8px;background:var(--bg-hover);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${pct>=100?'var(--matcha)':'linear-gradient(90deg,var(--kogane),var(--accent))'};border-radius:4px;transition:width .5s ease"></div>
      </div>
    </div>
    <button class="btn btn-ghost btn-sm" onclick="if(confirm('進捗をリセットしますか？'))resetBeatCounter()"><i class="fas fa-rotate-left"></i></button>
  </div>

  <div class="card">
    <div style="font-size:13.5px;font-weight:700;color:var(--text-primary);margin-bottom:14px;font-family:'Noto Serif JP',serif">
      <i class="fas fa-cat" style="color:var(--kogane);margin-right:7px"></i>Save the Cat — 15ビートシート
    </div>
    ${beatItems}
  </div>`;
}

function toggleBeat(beatId) {
  const beats = DB.get('sl_beat_counter', {});
  if (!beats[beatId]) beats[beatId] = {};
  beats[beatId].completed = !beats[beatId].completed;
  DB.set('sl_beat_counter', beats);
  render();
}

function saveBeatNote(beatId, val) {
  const beats = DB.get('sl_beat_counter', {});
  if (!beats[beatId]) beats[beatId] = {};
  beats[beatId].note = val;
  DB.set('sl_beat_counter', beats);
}

function resetBeatCounter() {
  DB.set('sl_beat_counter', {});
  render();
}

// ================================================================
//  PAGE: テンプレート
// ================================================================
function renderTemplatesPage() {
  const cp = State.currentPage;

  const TEMPLATE_CATS = [
    {
      id: 'structure',
      title: '構成テンプレート',
      icon: 'fa-diagram-project',
      color: 'beni',
      items: [
        { id:'three-act', name:'三幕構成シート', desc:'Act1/Act2/Act3の主要ビートを埋めるだけ' },
        { id:'save-cat', name:'Save the Cat 15ビートシート', desc:'ブレイク・スナイダー式の15ポイント' },
        { id:'kishotenketsu', name:'起承転結設計シート', desc:'日本式四段構成の各フェーズを整理' },
      ]
    },
    {
      id: 'character',
      title: 'キャラクターシート',
      icon: 'fa-users',
      color: 'fuji',
      items: [
        { id:'char-basic', name:'キャラクター基本シート', desc:'名前・年齢・役割・外見・性格' },
        { id:'char-deep', name:'キャラクター深掘りシート', desc:'Want/Need/ウーンド/バックストーリー' },
        { id:'char-arc', name:'キャラクターアーク設計', desc:'ポジティブ/ネガティブ/フラットアーク' },
      ]
    },
    {
      id: 'scene',
      title: 'シーン・ト書き',
      icon: 'fa-film',
      color: 'momo',
      items: [
        { id:'scene-check', name:'シーンチェックリスト', desc:'1シーンの4要素確認' },
        { id:'dialogue-check', name:'セリフ診断リスト', desc:'サブテキスト・キャラクターの声' },
        { id:'format-sample', name:'脚本フォーマット見本', desc:'日本式フォーマットの記述例' },
      ]
    },
    {
      id: 'revision',
      title: '改稿・推敲',
      icon: 'fa-rotate',
      color: 'kogane',
      items: [
        { id:'revision-sheet', name:'改稿チェックシート', desc:'大改稿で確認すべき全項目' },
        { id:'polish-sheet', name:'精密推敲チェックシート', desc:'セリフ・ト書きの磨き方' },
        { id:'feedback-form', name:'フィードバック記録フォーム', desc:'読み合わせ後の整理に' },
      ]
    },
  ];

  const colorMap = { beni:'var(--accent)', fuji:'var(--fuji)', momo:'var(--momo)', kogane:'var(--kogane)' };
  const bgMap    = { beni:'var(--accent-bg)', fuji:'var(--fuji-bg)', momo:'var(--momo-bg)', kogane:'var(--kogane-bg)' };

  const sections = TEMPLATE_CATS.map(cat => {
    const col = colorMap[cat.color] || 'var(--text-muted)';
    const bg = bgMap[cat.color] || 'var(--bg-hover)';
    const cards = cat.items.map(item => `
      <div class="guide-card" onclick="showTemplate('${item.id}')">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <i class="fas ${cat.icon}" style="color:${col};font-size:14px"></i>
          <div class="guide-card-title" style="margin-bottom:0;font-size:13.5px">${esc(item.name)}</div>
        </div>
        <div class="guide-card-desc" style="font-size:11.5px">${esc(item.desc)}</div>
        <div style="margin-top:10px;text-align:right"><span style="font-size:11px;color:${col};font-weight:600">コピーして使う <i class="fas fa-copy" style="font-size:10px"></i></span></div>
      </div>`).join('');

    return `
    <div style="margin-bottom:26px">
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:14px">
        <div style="width:32px;height:32px;border-radius:var(--radius-sm);background:${bg};color:${col};display:flex;align-items:center;justify-content:center;font-size:14px">
          <i class="fas ${cat.icon}"></i>
        </div>
        <div style="font-size:15px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">${esc(cat.title)}</div>
      </div>
      <div class="guide-grid">${cards}</div>
    </div>`;
  }).join('');

  return `
  <div style="background:linear-gradient(135deg,var(--kogane-bg),var(--bg-subtle));border:1px solid var(--border);border-radius:var(--radius-lg);padding:22px 26px;margin-bottom:24px;position:relative;overflow:hidden">
    <div style="position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:70px;font-weight:700;font-family:'Noto Serif JP',serif;color:var(--kogane);opacity:0.06;pointer-events:none">型</div>
    <div style="width:28px;height:2.5px;background:linear-gradient(90deg,var(--kogane),var(--accent));border-radius:2px;margin-bottom:10px"></div>
    <div style="font-size:20px;font-weight:700;font-family:'Noto Serif JP',serif;color:var(--text-primary);margin-bottom:5px">
      <i class="fas fa-copy" style="color:var(--kogane);margin-right:8px"></i>テンプレート集
    </div>
    <div style="font-size:13px;color:var(--text-muted)">プロが使う設計シート・チェックリストをそのままコピーして使えます</div>
  </div>
  ${sections}`;
}

function showTemplate(id) {
  const TEMPLATES = {
    'three-act': `【三幕構成シート】\n\n■ Act1 — 序幕（約25%）\n・オープニングイメージ：\n・主人公の日常・欠如：\n・発端事件：\n・ターニングポイント1：\n\n■ Act2a — 本幕前半（約25%）\n・新世界への適応：\n・Bストーリー（サブプロット）開始：\n・ミッドポイント（転換）：\n\n■ Act2b — 本幕後半（約25%）\n・悪役の迫来・状況悪化：\n・すべてを失う（最低点）：\n・暗闇の魂：\n\n■ Act3 — 終幕（約25%）\n・クライマックスへの突入：\n・クライマックス（主人公の変化した選択）：\n・クロージングイメージ：\n\n■ テーマ：\n■ ターニングポイント2（Act2→3の境界）：`,
    'save-cat': `【Save the Cat — 15ビートシート】\n\n1. オープニングイメージ（p.1）：\n2. テーマの提示（p.5）：\n3. 設定（p.1〜10）：\n4. 触媒・発端（p.12）：\n5. 議論（p.12〜25）：\n6. 第二幕への突入（p.25）：\n7. Bストーリー（p.30）：\n8. 楽しみと遊び（p.30〜55）：\n9. ミッドポイント（p.55）：\n10. 悪役の迫来（p.55〜75）：\n11. すべてを失う（p.75）：\n12. 暗闇の魂（p.75〜85）：\n13. クライマックスへの突入（p.85）：\n14. クライマックス（p.85〜110）：\n15. クロージングイメージ（p.110）：`,
    'kishotenketsu': `【起承転結 設計シート】\n\n■ 起（約15-25%）\n・主人公：\n・設定・世界：\n・問題の提示：\n・なぜ今始まるか：\n\n■ 承（約40-50%）\n・展開・発展：\n・障害の登場：\n・転への伏線：\n\n■ 転（約15-25%）\n・転換の内容：\n・なぜ驚きがあるか：\n・なぜ必然性があるか：\n・感情的インパクト：\n\n■ 結（約15-20%）\n・収束の内容：\n・余韻・余白：\n・最後に何が残るか：`,
    'char-basic': `【キャラクター基本シート】\n\n■ 名前：\n■ ふりがな：\n■ 年齢：\n■ 性別：\n■ 役割（主人公・敵・相棒など）：\n■ 職業・立場：\n■ 外見・風貌：\n■ 性格（3〜5つの特徴）：\n■ 口癖・話し方：\n■ 趣味・特技：\n■ 弱点・コンプレックス：\n■ キャッチコピー（一言で言うなら）：`,
    'char-deep': `【キャラクター深掘りシート】\n\n■ Want（表面的な欲求）：\n  → 意識的に追い求める外的目標\n\n■ Need（内面の必要）：\n  → 無意識に必要としている内的成長\n\n■ 欠如・ウーンド（過去のトラウマ）：\n  → 現在の行動を歪めている過去の出来事\n\n■ ゴースト（過去の出来事）：\n  → バックストーリーの核心\n\n■ 誤った信念（Lie the Character Believes）：\n  → キャラクターが信じている誤りや思い込み\n\n■ 真実（Truth）：\n  → 物語を通じて学ぶべき真実\n\n■ Wantを追うことでNeedを見つける過程：\n`,
    'char-arc': `【キャラクターアーク設計シート】\n\nアークタイプ（◎を選ぶ）：\n[ ] ポジティブアーク（成長・変容）\n[ ] ネガティブアーク（堕落・悲劇）\n[ ] フラットアーク（信念・不変）\n\n■ 冒頭の状態：\n  欠如・誤信：\n  外的状況：\n\n■ 第一幕末（転換点1）での変化：\n\n■ ミッドポイントでの変化：\n\n■ 最低点での状態：\n\n■ クライマックスでの選択（変化の証明）：\n  以前なら→（旧来の選択）\n  今は→（変化後の選択）\n\n■ エピローグでの状態：\n`,
    'scene-check': `【シーンチェックリスト】\n\nシーン番号：　　場所：　　時間帯：\n登場人物：\n\n□ 入口（シーン前の状況）：\n□ このシーンの目的（誰が何を達成しようとするか）：\n□ 対立・障害（何が目的を妨げるか）：\n□ 出口（シーン後に何が変わるか）：\n\n品質チェック：\n□ このシーンは物語を前進させているか？\n□ 主人公の感情・認識が変化するか？\n□ 「遅く入り、早く出る」を守っているか？\n□ このシーンを削ったとき物語に穴があくか？（穴がなければ削るべき）\n□ 1シーンに複数の役割があるか？（情報提供+感情描写など）`,
    'dialogue-check': `【セリフ診断リスト】\n\nキャラクター名：\n\n□ このセリフに目的はあるか？（情報・感情・影響のどれか）\n□ このキャラクターらしいか？（名前を隠しても誰かわかる？）\n□ サブテキスト（言外の意味）はあるか？\n□ 直接的すぎないか？（嘘・隠す・遠回しにする）\n□ 説明的すぎないか？（セリフでテーマを直接言っていない？）\n□ 感情をラベリングしていないか？（「私は悲しい」はダメ）\n□ 声に出して読んで自然か？\n□ 長すぎないか？（3行以上は分割を検討）\n□ 沈黙・間を効果的に使っているか？`,
    'format-sample': `【日本式脚本フォーマット見本】\n\n　○内・警察署・取調室・夜\n\n　　蛍光灯の光。木村（38）が椅子に座っている。\n　　向かいの椅子は空だ。\n\n\n\t\t　　木村\n　　「……先生？」\n\n　　ドアが開く。田中教授（64）が入ってくる。\n\n\n\t\t　　田中教授\n　　「久しぶりだな、木村」\n\n\n\t\t　　木村\n\t\t　　（震える声で）\n　　「なぜ……なぜここに」\n\n\t\t\t\t\t\tカット ＴＯ：\n\n　○外・渋谷・雑踏・昼\n\n　　人々が行き交う。木村が一人、立ちつくしている。`,
    'revision-sheet': `【大改稿チェックシート】\n\n■ 構造レベル\n□ 第一幕で主人公・目標・障害が明確に提示されているか？\n□ ターニングポイント1・2・クライマックスが機能しているか？\n□ 各幕の長さバランスは適切か？（中弛みはないか？）\n□ ミッドポイントで主人公の立場・認識が変化しているか？\n□ キャラクターアークは完結しているか？（変化が証明されているか？）\n\n■ シーンレベル\n□ 不要なシーンを特定して削除したか？\n□ 各シーンが物語を前進させているか？\n□ 伏線とその回収を全て確認したか？\n□ サブプロットはメインと絡んでいるか？\n\n■ キャラクターレベル\n□ 主人公の動機・行動が一貫しているか？\n□ 敵役・障害の動機は理解できるか？\n□ テーマはセリフではなく行動で示されているか？`,
    'polish-sheet': `【精密推敲チェックシート】\n\n■ セリフ全般\n□ すべてのセリフを声に出して読んだか？\n□ 「言わなくてもわかるセリフ」を削ったか？\n□ 各キャラクターの口調が一貫しているか？\n□ 感情を直接言っているセリフはないか？\n□ テーマを直接言っているセリフはないか？\n\n■ ト書き全般\n□ 4行以上の長いト書きを分割したか？\n□ カメラに映らないものを書いていないか？\n□ 「〜と思う」など内面描写を避けているか？\n□ 主語が明確か？\n□ 演技指定（括弧書き）を最小限にしたか？\n\n■ 全体\n□ 誤字・脱字・表記ゆれを確認したか？\n□ 冒頭3ページにフックがあるか？\n□ ラストシーンに余韻があるか？`,
    'feedback-form': `【フィードバック記録フォーム】\n\n日時：　　　　出所（誰から）：\n\n■ 良い点（継続すべき）：\n1.\n2.\n3.\n\n■ 問題点（修正が必要）：\n1.　場所：　内容：　対応：\n2.　場所：　内容：　対応：\n3.　場所：　内容：　対応：\n\n■ 疑問・確認事項：\n1.\n2.\n\n■ その他メモ：\n\n対応優先度：\n□ 高（構造的問題）\n□ 中（シーン・キャラクター）\n□ 低（セリフ・細部）\n\n次の改稿で行うこと：\n`,
  };

  const content = TEMPLATES[id] || 'テンプレートが見つかりません';
  const name = id.replace(/-/g, ' ');

  openModal(
    `<i class="fas fa-copy" style="color:var(--kogane)"></i> テンプレート`,
    `<div style="white-space:pre-wrap;font-family:'Noto Serif JP',serif;font-size:12.5px;color:var(--text-secondary);line-height:1.9;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px;max-height:450px;overflow-y:auto" id="template-content">${esc(content)}</div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">閉じる</button>
     <button class="btn btn-primary" onclick="copyTemplate()"><i class="fas fa-copy"></i> クリップボードにコピー</button>`,
    { size: 'modal-lg' }
  );
  window._currentTemplate = content;
}

function copyTemplate() {
  const content = window._currentTemplate || '';
  navigator.clipboard?.writeText(content).then(() => toast('テンプレートをコピーしました！', 'success'));
}

// ================================================================
//  PAGE: 設定
// ================================================================
function renderSettingsPage() {
  const projects = DB.getProjects();
  const storageData = JSON.stringify(localStorage);
  const storageKB = (storageData.length / 1024).toFixed(1);
  const storageMax = 5120; // 5MB
  const storagePct = Math.min(100, Math.round(storageData.length / 1024 / storageMax * 100));

  // 統計情報
  const totalWords = projects.reduce((a,p) => a + (p.drafts||[]).reduce((b,d)=>b+countWords(d.content||''),0), 0);
  const totalChars = projects.reduce((a,p) => a + (p.characters||[]).length, 0);
  const totalDrafts = projects.reduce((a,p) => a + (p.drafts||[]).length, 0);
  const journalEntries = DB.get('journal_entries', []).length;
  const readArticles   = DB.get('read_articles', []).length;
  const scratchCount   = DB.get('inspiration_scratches', []).length;
  const nameDictCount  = DB.get('name_dict', []).length;

  const writingGoal = DB.get('writing_goal', { daily: 500, weekly: 2000 });

  return `
  <div class="section-header">
    <div class="section-title"><i class="fas fa-gear"></i> 設定</div>
    <div class="section-desc">シナリオラボの設定・データ管理・カスタマイズ</div>
  </div>

  <!-- 統計サマリー -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
    ${[
      { icon:'fa-film',      label:'プロジェクト',  val:projects.length+'本',    color:'var(--accent)' },
      { icon:'fa-font',      label:'総文字数',       val:totalWords>=10000?Math.round(totalWords/1000)+'k字':totalWords+'字', color:'var(--fuji)' },
      { icon:'fa-book-open', label:'学習記事読了',   val:readArticles+'本',       color:'var(--matcha)' },
      { icon:'fa-lightbulb', label:'スクラッチメモ', val:scratchCount+'件',       color:'var(--kogane)' },
    ].map(s => `
      <div style="padding:14px;background:var(--bg-white);border:1px solid var(--border);border-radius:var(--radius-md);text-align:center">
        <div style="font-size:16px;color:${s.color};margin-bottom:4px"><i class="fas ${s.icon}"></i></div>
        <div style="font-size:20px;font-weight:700;color:${s.color}">${s.val}</div>
        <div style="font-size:11px;color:var(--text-muted)">${s.label}</div>
      </div>`).join('')}
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:960px">
    <div style="display:flex;flex-direction:column;gap:16px">
      <!-- データ管理 -->
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-database icon" style="color:var(--kon-lt)"></i> データ管理</div></div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:2;margin-bottom:14px">
          <div>プロジェクト数: <strong>${projects.length}件</strong></div>
          <div>日誌エントリ: <strong>${journalEntries}件</strong></div>
          <div>キャラクター名辞典: <strong>${nameDictCount}件</strong></div>
          <div>稿数合計: <strong>${totalDrafts}稿</strong></div>
          <div>登場人物合計: <strong>${totalChars}人</strong></div>
        </div>
        <!-- ストレージメーター -->
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:12px;color:var(--text-secondary)">使用容量</span>
            <span style="font-size:12px;font-weight:600;color:${storagePct>80?'var(--accent)':'var(--text-secondary)'}">${storageKB}KB / ${storageMax}KB</span>
          </div>
          <div style="height:6px;background:var(--bg-hover);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${storagePct}%;background:${storagePct>80?'var(--accent)':storagePct>50?'var(--kogane)':'var(--matcha)'};border-radius:3px"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-secondary" onclick="exportAllData()"><i class="fas fa-file-export"></i> 全データをエクスポート（JSON）</button>
          <button class="btn btn-ghost btn-sm" onclick="openImportModal()"><i class="fas fa-file-import"></i> データをインポート（JSON）</button>
          <button class="btn btn-ghost btn-sm" onclick="confirmClearAllData()" style="color:var(--accent)"><i class="fas fa-trash"></i> 全データを削除</button>
        </div>
      </div>

      <!-- 執筆目標設定 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-bullseye icon" style="color:var(--matcha)"></i> 執筆目標</div>
          <button class="btn btn-primary btn-sm" onclick="saveGoalFromSettings()"><i class="fas fa-floppy-disk"></i> 保存</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">1日の目標文字数</label>
            <input class="form-input" id="cfg-daily" type="number" value="${writingGoal.daily}" min="100" max="50000" step="100">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">1週間の目標文字数</label>
            <input class="form-input" id="cfg-weekly" type="number" value="${writingGoal.weekly}" min="500" max="200000" step="500">
          </div>
        </div>
      </div>

      <!-- アプリ情報 -->
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-circle-info icon" style="color:var(--fuji)"></i> アプリ情報</div></div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:2.2">
          <div>バージョン: <strong>v5.0.0</strong></div>
          <div>名称: <strong>シナリオラボ</strong></div>
          <div>最終更新: <strong>2025年</strong></div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:6px;line-height:1.6">
            このアプリはブラウザのLocalStorageにデータを保存します。<br>
            ブラウザのキャッシュをクリアするとデータが消えることがあります。<br>
            定期的にエクスポートしてバックアップしてください。
          </div>
        </div>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:16px">
      <!-- 詳細統計 -->
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-chart-bar icon" style="color:var(--fuji)"></i> 使用状況サマリー</div></div>
        <div style="font-size:12.5px">
          ${[
            { label:'プロジェクト総数', val:projects.length+'本', pct: null, color:'var(--accent)' },
            { label:'執筆中', val:projects.filter(p=>!['最終稿','共有・出力'].includes(p.phase)).length+'本', pct:null, color:'var(--kon-lt)' },
            { label:'完成稿', val:projects.filter(p=>['最終稿','共有・出力'].includes(p.phase)).length+'本', pct:null, color:'var(--matcha)' },
            { label:'総文字数', val:(totalWords>=10000?Math.round(totalWords/1000)+'k':totalWords)+'字', pct:null, color:'var(--fuji)' },
            { label:'総稿数', val:totalDrafts+'稿', pct:null, color:'var(--fuji)' },
            { label:'学習記事読了', val:readArticles+'/8本', pct:Math.round(readArticles/8*100), color:'var(--matcha)' },
            { label:'執筆日誌', val:journalEntries+'日', pct:null, color:'var(--kogane)' },
            { label:'スクラッチメモ', val:scratchCount+'件', pct:null, color:'var(--kogane)' },
          ].map(s => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">
              <span style="color:var(--text-muted)">${s.label}</span>
              <div style="display:flex;align-items:center;gap:8px">
                ${s.pct!==null ? `<div style="width:60px;height:4px;background:var(--bg-hover);border-radius:2px;overflow:hidden"><div style="height:100%;width:${s.pct}%;background:${s.color};border-radius:2px"></div></div>` : ''}
                <span style="font-weight:700;color:${s.color}">${s.val}</span>
              </div>
            </div>`).join('')}
        </div>
      </div>

      <!-- キーボードショートカット -->
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-keyboard icon" style="color:var(--matcha)"></i> キーボードショートカット</div></div>
        <div style="font-size:12.5px;line-height:2.2">
          ${[
            ['Ctrl/⌘ + S', 'プロジェクトを保存'],
            ['Escape', 'モーダルを閉じる'],
            ['Ctrl/⌘ + N', '新規プロジェクト（準備中）'],
          ].map(([k,d]) => `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)">
            <code style="background:var(--bg-hover);padding:2px 7px;border-radius:4px;font-size:11.5px;border:1px solid var(--border)">${k}</code>
            <span style="color:var(--text-muted)">${d}</span>
          </div>`).join('')}
        </div>
      </div>

      <!-- 使い方のヒント -->
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-lightbulb icon" style="color:var(--kogane)"></i> 使い方のヒント</div></div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.9">
          <div>💾 エディタは1.5秒後に自動保存されます</div>
          <div>🔄 フェーズは上部「保存」ボタンで手動保存も可</div>
          <div>📋 テンプレートページに各種設計シートがあります</div>
          <div>📚 学習センターで脚本理論を体系的に学べます</div>
          <div>🛠️ ツールページに便利なユーティリティがあります</div>
          <div>💡 インスピレーションページでアイデアを整理</div>
          <div>📖 執筆日誌で執筆の習慣を記録・追跡</div>
        </div>
      </div>
    </div>
  </div>`;
}

function openImportModal() {
  openModal(
    `<i class="fas fa-file-import" style="color:var(--matcha)"></i> データをインポート`,
    `<div style="padding:10px 12px;background:var(--kogane-bg);border-radius:var(--radius-sm);border-left:3px solid var(--kogane);font-size:12.5px;color:var(--text-secondary);margin-bottom:14px;line-height:1.7">
       <strong>注意:</strong> インポートするとすべての現在のデータが上書きされます。<br>
       事前に「エクスポート」でバックアップを取ってください。
     </div>
     <div class="form-group">
       <label class="form-label">JSONファイルを選択</label>
       <input type="file" accept=".json" id="import-file" class="form-input" style="padding:6px">
     </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="importData()"><i class="fas fa-file-import"></i> インポート実行</button>`
  );
}

function importData() {
  const fileInput = $('#import-file');
  if (!fileInput?.files?.length) { toast('ファイルを選択してください', 'error'); return; }
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.projects || !Array.isArray(data.projects)) {
        toast('無効なフォーマットです', 'error'); return;
      }
      // プロジェクトを上書き
      localStorage.setItem('sl_projects', JSON.stringify(data.projects));
      closeModal();
      toast(`${data.projects.length}件のプロジェクトをインポートしました！`, 'success');
      State.currentProjectId = null;
      State.currentPage = 'dashboard';
      render();
    } catch(err) {
      toast('JSONの解析に失敗しました: '+err.message, 'error');
    }
  };
  reader.readAsText(file);
}

function saveGoalFromSettings() {
  const daily  = parseInt($('#cfg-daily')?.value  || 500);
  const weekly = parseInt($('#cfg-weekly')?.value || 2000);
  DB.set('writing_goal', { daily: isNaN(daily)?500:daily, weekly: isNaN(weekly)?2000:weekly });
  toast('目標を保存しました！', 'success');
}

function exportAllData() {
  const data = {
    version: '4.0.0',
    exportedAt: new Date().toISOString(),
    projects: DB.getProjects(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scenariolab_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('エクスポートしました', 'success');
}

function confirmClearAllData() {
  openModal(
    `<i class="fas fa-triangle-exclamation" style="color:var(--accent)"></i> 全データを削除`,
    `<p style="color:var(--text-secondary)">すべてのプロジェクトデータを削除します。<br><strong style="color:var(--accent)">この操作は元に戻せません。</strong></p>
     <p style="font-size:12.5px;color:var(--text-muted);margin-top:8px">削除前に「全データをエクスポート」でバックアップすることをお勧めします。</p>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-danger" onclick="clearAllData()"><i class="fas fa-trash"></i> すべて削除する</button>`
  );
}

function clearAllData() {
  localStorage.clear();
  closeModal();
  toast('データを削除しました', 'info');
  State.currentProjectId = null;
  State.currentPage = 'dashboard';
  render();
}

// ================================================================
//  PAGE: 執筆日誌
// ================================================================
function renderJournalPage() {
  const entries = DB.get('journal_entries', []);
  const today = new Date().toISOString().slice(0,10);
  const todayEntry = entries.find(e => e.date === today);
  const streak = calcWritingStreak(entries);
  const journalSearch = State.currentTab['journal-search'] || '';
  const journalMonth = State.currentTab['journal-month'] || '';

  // フィルタリングされたエントリ
  let filteredEntries = entries.slice();
  if (journalSearch) {
    const q = journalSearch.toLowerCase();
    filteredEntries = filteredEntries.filter(e =>
      (e.body||'').toLowerCase().includes(q) ||
      (e.goal||'').toLowerCase().includes(q) ||
      (e.reflection||'').toLowerCase().includes(q) ||
      e.date.includes(q)
    );
  }
  if (journalMonth) {
    filteredEntries = filteredEntries.filter(e => e.date.startsWith(journalMonth));
  }

  // 月別リスト（フィルター用）
  const monthSet = [...new Set(entries.map(e => e.date.slice(0,7)))].sort((a,b)=>b.localeCompare(a));

  const recentEntries = filteredEntries.slice(0, 50).map(e => {
    const wc = e.wordCount || 0;
    const mood = e.mood || '😐';
    const highlightText = (text) => {
      if (!journalSearch || !text) return esc(text||'');
      const q = journalSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return esc(text).replace(new RegExp(q, 'gi'), m => `<mark style="background:var(--kogane-bg);color:var(--kogane);border-radius:2px">${m}</mark>`);
    };
    return `
    <div class="card" style="padding:14px;margin-bottom:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">
          ${e.date} <span style="font-size:16px;margin-left:6px">${mood}</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          ${wc > 0 ? `<span class="tag tag-matcha"><i class="fas fa-font" style="font-size:9px"></i> ${wc.toLocaleString()}字</span>` : ''}
          <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteJournalEntry('${e.id}')"><i class="fas fa-trash" style="font-size:10px;color:var(--accent)"></i></button>
        </div>
      </div>
      ${e.goal ? `<div style="font-size:12px;font-weight:600;color:var(--matcha);margin-bottom:5px"><i class="fas fa-bullseye" style="font-size:10px;margin-right:4px"></i>目標: ${highlightText(e.goal)}</div>` : ''}
      <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;white-space:pre-wrap">${highlightText((e.body||'').slice(0,200))}${(e.body||'').length>200?'…':''}</div>
      ${e.reflection ? `<div style="margin-top:8px;font-size:12px;color:var(--text-muted);border-top:1px solid var(--border);padding-top:8px;font-style:italic"><i class="fas fa-comment" style="font-size:9px;margin-right:4px"></i>${highlightText(e.reflection)}</div>` : ''}
    </div>`;
  }).join('');

  // 月別統計
  const monthMap = {};
  entries.forEach(e => {
    const m = e.date.slice(0,7);
    monthMap[m] = (monthMap[m]||0) + (e.wordCount||0);
  });
  const monthStats = Object.entries(monthMap).slice(-6).map(([m, wc]) => {
    const max = Math.max(...Object.values(monthMap), 1);
    const pct = Math.round((wc/max)*100);
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
      <div style="width:32px;background:var(--bg-hover);border-radius:4px 4px 0 0;overflow:hidden;height:60px;display:flex;align-items:flex-end">
        <div style="width:100%;background:var(--matcha);border-radius:3px 3px 0 0;height:${pct}%;transition:height .3s"></div>
      </div>
      <div style="font-size:9px;color:var(--text-muted)">${m.slice(5)}月</div>
      <div style="font-size:10px;font-weight:700;color:var(--matcha)">${wc >= 1000 ? (wc/1000).toFixed(1)+'k' : wc}</div>
    </div>`;
  }).join('');

  const totalWords = entries.reduce((a, e) => a + (e.wordCount||0), 0);
  const avgWords = entries.length > 0 ? Math.round(totalWords / entries.length) : 0;

  return `
  <div class="section-header">
    <div class="section-title"><i class="fas fa-book"></i> 執筆日誌</div>
    <div class="section-desc">毎日の執筆記録・進捗・気づきを記録しましょう</div>
  </div>

  <!-- 統計バー -->
  <div class="stat-grid" style="margin-bottom:24px">
    <div class="stat-card matcha">
      <div class="stat-icon-wrap"><i class="fas fa-fire"></i></div>
      <div class="stat-value">${streak}</div>
      <div class="stat-label">連続執筆日数</div>
    </div>
    <div class="stat-card kon">
      <div class="stat-icon-wrap"><i class="fas fa-calendar-check"></i></div>
      <div class="stat-value">${entries.length}</div>
      <div class="stat-label">総記録日数</div>
    </div>
    <div class="stat-card kogane">
      <div class="stat-icon-wrap"><i class="fas fa-font"></i></div>
      <div class="stat-value">${totalWords >= 10000 ? Math.round(totalWords/1000)+'k' : totalWords.toLocaleString()}</div>
      <div class="stat-label">総執筆文字数</div>
    </div>
    <div class="stat-card beni">
      <div class="stat-icon-wrap"><i class="fas fa-chart-line"></i></div>
      <div class="stat-value">${avgWords >= 1000 ? (avgWords/1000).toFixed(1)+'k' : avgWords.toLocaleString()}</div>
      <div class="stat-label">平均文字/日</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 340px;gap:24px">
    <!-- 左: 記録フォーム + 一覧 -->
    <div>
      <!-- 今日の記録 -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-pen icon" style="color:var(--matcha)"></i> ${today} の記録</div>
          ${todayEntry ? '<span style="font-size:11px;color:var(--matcha);font-weight:600;padding:3px 9px;background:var(--matcha-bg);border-radius:var(--radius-full)">✓ 記録済み</span>' : ''}
        </div>
        <div class="grid-2" style="margin-bottom:10px">
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">今日の目標</label>
            <input class="form-input" id="j-goal" value="${todayEntry?.goal||''}" placeholder="例：第3シーンを書ききる">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">執筆文字数</label>
            <input class="form-input" id="j-wordcount" type="number" value="${todayEntry?.wordCount||''}" placeholder="0">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">気分・コンディション</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${['😊','🔥','😐','😔','😤','💤','✨','🤔'].map(m =>
              `<button onclick="selectMood('${m}')" id="mood-${m}" class="btn btn-ghost btn-sm" style="font-size:18px;padding:4px 8px;${(todayEntry?.mood||'😐')===m?'background:var(--bg-hover);border-color:var(--accent)':''}">${m}</button>`
            ).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">今日の執筆メモ・進捗</label>
          <textarea class="form-textarea" id="j-body" rows="4" placeholder="今日書いた内容・気づき・詰まった点などを自由に記録...">${todayEntry?.body||''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">振り返り・反省</label>
          <textarea class="form-textarea" id="j-reflection" rows="2" placeholder="明日に活かしたいこと...">${todayEntry?.reflection||''}</textarea>
        </div>
        <button class="btn btn-primary" onclick="saveJournalEntry()" style="width:100%">
          <i class="fas fa-floppy-disk"></i> ${todayEntry ? '更新する' : '記録を保存する'}
        </button>
      </div>

      <!-- 過去の記録 -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:15px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">
          <i class="fas fa-clock-rotate-left" style="color:var(--momo);margin-right:8px"></i>過去の記録
          <span style="font-size:12px;font-weight:400;color:var(--text-muted);margin-left:6px">(${filteredEntries.length} / ${entries.length}件)</span>
        </div>
      </div>
      <!-- 日誌検索バー -->
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <div style="flex:1;position:relative">
          <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:12px;pointer-events:none"></i>
          <input class="form-input" id="journal-search" value="${esc(journalSearch)}" placeholder="過去の日誌を全文検索…"
            style="padding-left:30px;font-size:12.5px;height:34px"
            oninput="setJournalSearch(this.value)">
        </div>
        <select class="form-select" style="font-size:12px;height:34px;padding:0 10px;width:auto" onchange="setJournalMonth(this.value)">
          <option value="">全期間</option>
          ${monthSet.map(m => {
            const [yr,mo] = m.split('-');
            return `<option value="${m}" ${journalMonth===m?'selected':''}>${yr}年${parseInt(mo)}月</option>`;
          }).join('')}
        </select>
        ${journalSearch||journalMonth ? `<button class="btn btn-ghost btn-sm" onclick="setJournalSearch('');setJournalMonth('')"><i class="fas fa-xmark"></i></button>` : ''}
      </div>
      ${filteredEntries.length === 0 ?
        `<div style="text-align:center;padding:40px;color:var(--text-muted);background:var(--bg-subtle);border-radius:var(--radius-md);border:2px dashed var(--border)">
          <i class="fas fa-search" style="font-size:32px;display:block;margin-bottom:10px;opacity:0.3"></i>
          ${journalSearch||journalMonth ? '条件に一致する記録がありません' : 'まだ記録がありません。今日の執筆を記録しましょう！'}
        </div>`
        : recentEntries}
    </div>

    <!-- 右: グラフ・カレンダー -->
    <div style="display:flex;flex-direction:column;gap:16px">
      <!-- 月別執筆量グラフ -->
      ${Object.keys(monthMap).length > 0 ? `
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg-subtle);font-size:13px;font-weight:600;color:var(--text-primary);font-family:'Noto Serif JP',serif">
          <i class="fas fa-chart-bar" style="color:var(--matcha);margin-right:6px"></i>月別執筆量
        </div>
        <div style="padding:16px;display:flex;align-items:flex-end;gap:8px;height:100px">
          ${monthStats}
        </div>
      </div>` : ''}

      <!-- 執筆習慣カレンダー -->
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg-subtle);font-size:13px;font-weight:600;color:var(--text-primary);font-family:'Noto Serif JP',serif">
          <i class="fas fa-calendar" style="color:var(--asagi);margin-right:6px"></i>執筆カレンダー
        </div>
        <div style="padding:14px">
          ${renderJournalCalendar(entries)}
        </div>
      </div>

      <!-- ヒント -->
      <div class="writing-tip-box">
        <div class="writing-tip-title"><i class="fas fa-lightbulb"></i> 継続のコツ</div>
        <div class="writing-tip-body">「毎日1行」を目標に設定すると継続しやすくなります。完璧な1時間より、不完全な10分の方が長期的に意味があります。日誌は振り返りのためのもので、評価されるためのものではありません。</div>
      </div>
    </div>
  </div>`;
}

function calcWritingStreak(entries) {
  if (entries.length === 0) return 0;
  const dates = [...new Set(entries.map(e => e.date))].sort().reverse();
  if (!dates.length) return 0;
  const today = new Date().toISOString().slice(0,10);
  let streak = 0;
  let cur = new Date(today);
  for (const d of dates) {
    const dc = cur.toISOString().slice(0,10);
    if (d === dc) {
      streak++;
      cur.setDate(cur.getDate()-1);
    } else break;
  }
  return streak;
}

function renderJournalCalendar(entries) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const entryDates = new Set(entries.map(e => e.date));
  const days = ['日','月','火','水','木','金','土'];

  let html = `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;font-size:10px;text-align:center;margin-bottom:6px">`;
  html += days.map(d => `<div style="color:var(--text-muted);font-weight:600;padding:2px 0">${d}</div>`).join('');
  html += '</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">';

  for (let i = 0; i < firstDay; i++) {
    html += `<div></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const hasEntry = entryDates.has(dateStr);
    const isToday = dateStr === today.toISOString().slice(0,10);
    html += `<div style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:10px;font-weight:${isToday?'700':'400'};
      ${hasEntry ? 'background:var(--matcha);color:white' : isToday ? 'background:var(--accent);color:white' : 'color:var(--text-muted)'}">${d}</div>`;
  }
  html += '</div>';
  html += `<div style="margin-top:8px;font-size:10.5px;color:var(--text-muted);display:flex;gap:10px;align-items:center">
    <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:10px;height:10px;background:var(--matcha);border-radius:50%;display:inline-block"></span>執筆記録あり</span>
    <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:10px;height:10px;background:var(--accent);border-radius:50%;display:inline-block"></span>今日</span>
  </div>`;
  return html;
}

let _selectedMood = '😐';
function selectMood(mood) {
  _selectedMood = mood;
  ['😊','🔥','😐','😔','😤','💤','✨','🤔'].forEach(m => {
    const btn = $(`#mood-${m}`);
    if (btn) btn.style.background = m === mood ? 'var(--bg-hover)' : '';
    if (btn) btn.style.borderColor = m === mood ? 'var(--accent)' : '';
  });
}

function saveJournalEntry() {
  const entries = DB.get('journal_entries', []);
  const today = new Date().toISOString().slice(0,10);
  const body = $('#j-body')?.value?.trim();
  const goal = $('#j-goal')?.value?.trim();
  const wordCount = parseInt($('#j-wordcount')?.value||'0') || 0;
  const reflection = $('#j-reflection')?.value?.trim();
  const mood = _selectedMood || '😐';

  const existing = entries.findIndex(e => e.date === today);
  const entry = { id: existing >= 0 ? entries[existing].id : uid(), date: today, body, goal, wordCount, reflection, mood, updatedAt: new Date().toISOString() };

  if (existing >= 0) entries[existing] = entry;
  else entries.unshift(entry);

  DB.set('journal_entries', entries);
  toast('執筆日誌を保存しました', 'success');
  navigate('journal');
}

function deleteJournalEntry(id) {
  openModal(
    `<i class="fas fa-trash" style="color:var(--accent)"></i> 記録を削除`,
    `<p style="color:var(--text-secondary)">この記録を削除しますか？元に戻せません。</p>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-danger" onclick="confirmDeleteJournalEntry('${id}')"><i class="fas fa-trash"></i> 削除</button>`
  );
}

function setJournalSearch(q) {
  State.currentTab['journal-search'] = q;
  navigate('journal');
}

function setJournalMonth(m) {
  State.currentTab['journal-month'] = m;
  navigate('journal');
}

function confirmDeleteJournalEntry(id) {
  const entries = DB.get('journal_entries', []).filter(e => e.id !== id);
  DB.set('journal_entries', entries);
  closeModal();
  toast('削除しました', 'info');
  navigate('journal');
}

function bindJournalPage() {
  const today = new Date().toISOString().slice(0,10);
  const entries = DB.get('journal_entries', []);
  const todayEntry = entries.find(e => e.date === today);
  _selectedMood = todayEntry?.mood || '😐';
}

// ================================================================
//  PAGE: キャラクター名辞典
// ================================================================
function renderNameDictPage() {
  const names = DB.get('namedict', []);
  const categories = ['主人公','敵役','脇役','助演','その他'];
  const catCounts = {};
  categories.forEach(c => { catCounts[c] = names.filter(n => n.category === c).length; });

  const nameCards = names.length === 0
    ? `<div style="text-align:center;padding:48px;color:var(--text-muted);grid-column:1/-1;border:2px dashed var(--border);border-radius:var(--radius-md)">
        <i class="fas fa-spell-check" style="font-size:32px;display:block;margin-bottom:10px;opacity:0.3"></i>
        名前辞典はまだ空です。キャラクターを追加しましょう。
      </div>`
    : names.map(n => {
        const catColor = { '主人公':'var(--accent)', '敵役':'var(--momo)', '脇役':'var(--asagi)', '助演':'var(--kogane)', 'その他':'var(--text-muted)' };
        return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div>
              <div style="font-size:16px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">${esc(n.name)}</div>
              ${n.kana ? `<div style="font-size:11px;color:var(--text-muted)">${esc(n.kana)}</div>` : ''}
            </div>
            <div style="display:flex;gap:4px">
              <span style="font-size:10px;padding:2px 8px;background:var(--bg-hover);border:1px solid var(--border);border-radius:var(--radius-full);color:${catColor[n.category]||'var(--text-muted)'};">${esc(n.category||'その他')}</span>
              <button class="btn btn-ghost btn-icon btn-sm" onclick="openEditNameDict('${n.id}')"><i class="fas fa-pen" style="font-size:10px"></i></button>
              <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteNameDict('${n.id}')"><i class="fas fa-trash" style="font-size:10px;color:var(--accent)"></i></button>
            </div>
          </div>
          ${n.reading ? `<div style="font-size:12px;color:var(--kon-lt);margin-bottom:4px"><i class="fas fa-volume-high" style="font-size:9px;margin-right:4px"></i>読み: ${esc(n.reading)}</div>` : ''}
          ${n.tags ? `<div style="margin-bottom:6px;display:flex;flex-wrap:wrap;gap:4px">${n.tags.split(',').map(t => `<span class="tag tag-gray" style="font-size:10px">${esc(t.trim())}</span>`).join('')}</div>` : ''}
          ${n.note ? `<div style="font-size:12px;color:var(--text-secondary);line-height:1.6">${esc(n.note)}</div>` : ''}
          ${n.project ? `<div style="font-size:10.5px;color:var(--text-muted);margin-top:6px"><i class="fas fa-film" style="font-size:9px;margin-right:3px"></i>${esc(n.project)}</div>` : ''}
        </div>`;
      }).join('');

  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div>
      <h2 style="font-size:22px;font-weight:700;font-family:'Noto Serif JP',serif;color:var(--text-primary);margin:0"><i class="fas fa-spell-check" style="color:var(--kon-lt);margin-right:10px"></i>キャラクター名辞典</h2>
      <div style="font-size:13px;color:var(--text-muted);margin-top:4px">登場人物の名前・読み・メモを一元管理</div>
    </div>
    <button class="btn btn-primary" onclick="openAddNameDict()"><i class="fas fa-plus"></i> 新規追加</button>
  </div>

  <!-- カテゴリー統計 -->
  <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
    <div style="padding:8px 16px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-full);font-size:12.5px">
      <i class="fas fa-users" style="color:var(--text-muted);margin-right:5px"></i>総登録数: <strong>${names.length}</strong>
    </div>
    ${categories.map(c => catCounts[c] > 0 ? `
      <div style="padding:8px 14px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-full);font-size:12px">
        ${c}: <strong>${catCounts[c]}</strong>
      </div>` : '').join('')}
  </div>

  <!-- 検索 -->
  ${names.length > 0 ? `
  <div style="position:relative;margin-bottom:16px;max-width:400px">
    <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:12px"></i>
    <input class="form-input" id="namedict-search" style="padding-left:30px" placeholder="名前・読みで検索..." oninput="filterNameDict(this.value)">
  </div>` : ''}

  <div class="project-grid" id="namedict-grid">${nameCards}</div>`;
}

function openAddNameDict() {
  const projects = DB.getProjects().map(p => `<option>${esc(p.title)}</option>`).join('');
  openModal(
    `<i class="fas fa-plus" style="color:var(--kon-lt)"></i> 名前を追加`,
    `<div class="form-group"><label class="form-label">名前 <span style="color:var(--accent)">*</span></label><input class="form-input" id="nd-name" placeholder="例：木村 拓也"></div>
     <div class="grid-2">
       <div class="form-group"><label class="form-label">読み（ひらがな）</label><input class="form-input" id="nd-kana" placeholder="例：きむら たくや"></div>
       <div class="form-group"><label class="form-label">カテゴリー</label>
         <select class="form-select" id="nd-cat">
           <option>主人公</option><option>敵役</option><option>脇役</option><option>助演</option><option>その他</option>
         </select>
       </div>
     </div>
     <div class="form-group"><label class="form-label">タグ（カンマ区切り）</label><input class="form-input" id="nd-tags" placeholder="例：刑事, 男性, 30代"></div>
     <div class="form-group"><label class="form-label">関連作品</label><select class="form-select" id="nd-project"><option value="">未選択</option>${projects}</select></div>
     <div class="form-group"><label class="form-label">メモ・説明</label><textarea class="form-textarea" id="nd-note" rows="2" placeholder="このキャラクターについてのメモ"></textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="addNameDict()"><i class="fas fa-plus"></i> 追加</button>`
  );
}

function addNameDict() {
  const name = $('#nd-name')?.value?.trim();
  if (!name) { toast('名前は必須です', 'error'); return; }
  const entry = {
    id: uid(), name,
    kana: $('#nd-kana')?.value?.trim() || '',
    category: $('#nd-cat')?.value || 'その他',
    tags: $('#nd-tags')?.value?.trim() || '',
    project: $('#nd-project')?.value || '',
    note: $('#nd-note')?.value?.trim() || '',
    createdAt: new Date().toISOString(),
  };
  const names = DB.get('namedict', []);
  names.unshift(entry);
  DB.set('namedict', names);
  closeModal();
  toast('追加しました', 'success');
  navigate('namedict');
}

function openEditNameDict(id) {
  const names = DB.get('namedict', []);
  const n = names.find(x => x.id === id);
  if (!n) return;
  const projects = DB.getProjects().map(p => `<option ${p.title===n.project?'selected':''}>${esc(p.title)}</option>`).join('');
  openModal(
    `<i class="fas fa-pen" style="color:var(--kon-lt)"></i> 名前を編集`,
    `<div class="form-group"><label class="form-label">名前</label><input class="form-input" id="nd-edit-name" value="${esc(n.name)}"></div>
     <div class="grid-2">
       <div class="form-group"><label class="form-label">読み</label><input class="form-input" id="nd-edit-kana" value="${esc(n.kana||'')}"></div>
       <div class="form-group"><label class="form-label">カテゴリー</label>
         <select class="form-select" id="nd-edit-cat">
           ${['主人公','敵役','脇役','助演','その他'].map(c => `<option ${c===n.category?'selected':''}>${c}</option>`).join('')}
         </select>
       </div>
     </div>
     <div class="form-group"><label class="form-label">タグ</label><input class="form-input" id="nd-edit-tags" value="${esc(n.tags||'')}"></div>
     <div class="form-group"><label class="form-label">関連作品</label><select class="form-select" id="nd-edit-project"><option value="">未選択</option>${projects}</select></div>
     <div class="form-group"><label class="form-label">メモ</label><textarea class="form-textarea" id="nd-edit-note" rows="2">${esc(n.note||'')}</textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveEditNameDict('${id}')">保存</button>`
  );
}

function saveEditNameDict(id) {
  const names = DB.get('namedict', []);
  const idx = names.findIndex(x => x.id === id);
  if (idx < 0) return;
  names[idx] = { ...names[idx],
    name: $('#nd-edit-name')?.value?.trim() || names[idx].name,
    kana: $('#nd-edit-kana')?.value?.trim() || '',
    category: $('#nd-edit-cat')?.value || 'その他',
    tags: $('#nd-edit-tags')?.value?.trim() || '',
    project: $('#nd-edit-project')?.value || '',
    note: $('#nd-edit-note')?.value?.trim() || '',
  };
  DB.set('namedict', names);
  closeModal();
  toast('更新しました', 'success');
  navigate('namedict');
}

function deleteNameDict(id) {
  openModal(
    `<i class="fas fa-trash" style="color:var(--accent)"></i> 名前を削除`,
    `<p style="color:var(--text-secondary)">この名前の記録を削除しますか？</p>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-danger" onclick="confirmDeleteNameDict('${id}')">削除</button>`
  );
}

function confirmDeleteNameDict(id) {
  const names = DB.get('namedict', []).filter(x => x.id !== id);
  DB.set('namedict', names);
  closeModal();
  toast('削除しました', 'info');
  navigate('namedict');
}

function filterNameDict(q) {
  const cards = $$('#namedict-grid .card');
  cards.forEach(card => {
    const text = card.textContent;
    card.style.display = !q || text.includes(q) ? '' : 'none';
  });
}

function bindNameDictPage() {}

// ================================================================
//  PAGE: 世界観設計
// ================================================================
function renderWorldBuildingPage() {
  const wb = DB.get('worldbuilding', {
    title: '',
    era: '',
    setting: '',
    rules: '',
    geography: '',
    culture: '',
    politics: '',
    technology: '',
    magic: '',
    history: '',
    conflicts: '',
    glossary: [],
  });

  const glossaryHtml = (wb.glossary || []).map((g, i) => `
    <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="flex:0 0 100px;font-size:12.5px;font-weight:700;color:var(--kon-lt);font-family:'Noto Serif JP',serif">${esc(g.term)}</div>
      <div style="flex:1;font-size:12.5px;color:var(--text-secondary);line-height:1.6">${esc(g.def)}</div>
      <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteWbGlossary(${i})"><i class="fas fa-trash" style="font-size:10px;color:var(--accent)"></i></button>
    </div>`).join('');

  const fields = [
    { id:'title',      label:'世界観タイトル',   placeholder:'例：近未来の新東京',         rows:1 },
    { id:'era',        label:'時代・時期設定',    placeholder:'例：2045年、AIが人権を獲得した時代', rows:1 },
    { id:'setting',    label:'舞台・場所',         placeholder:'例：海面上昇後の東京。高層都市と水上スラムが並立する', rows:2 },
    { id:'rules',      label:'世界のルール（物理法則・超自然）', placeholder:'例：特定の感情を持つ者だけが「境界」を越えられる', rows:2 },
    { id:'geography',  label:'地理・地図',         placeholder:'例：三つの島に分かれた都市構造。北島は富裕層、南島は労働者層', rows:2 },
    { id:'culture',    label:'文化・習慣・宗教',   placeholder:'例：死者の日は年に一度全市民が白い仮面を着けて外出する', rows:2 },
    { id:'politics',   label:'政治・権力構造',     placeholder:'例：三つの財閥が都市を分割支配。警察は財閥傭兵が担当', rows:2 },
    { id:'technology', label:'科学技術・魔法体系', placeholder:'例：記憶を「書き換え」できるナノマシン技術が普及している', rows:2 },
    { id:'history',    label:'重要な歴史・出来事', placeholder:'例：30年前の「大分断」で旧東京が三分割された', rows:2 },
    { id:'conflicts',  label:'内在する葛藤・矛盾', placeholder:'例：AI市民権vs人間優位主義の対立が社会の根底にある', rows:2 },
  ];

  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div>
      <h2 style="font-size:22px;font-weight:700;font-family:'Noto Serif JP',serif;color:var(--text-primary);margin:0"><i class="fas fa-globe" style="color:var(--asagi);margin-right:10px"></i>世界観設計ノート</h2>
      <div style="font-size:13px;color:var(--text-muted);margin-top:4px">作品の舞台・世界観・設定を詳細に設計・記録します</div>
    </div>
    <button class="btn btn-primary" onclick="saveWorldBuilding()"><i class="fas fa-floppy-disk"></i> 保存</button>
  </div>

  <div style="display:grid;grid-template-columns:1fr 340px;gap:24px">
    <div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><div class="card-title"><i class="fas fa-earth-asia icon" style="color:var(--asagi)"></i> 世界設定の基本</div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          ${fields.slice(0,2).map(f => `
            <div class="form-group">
              <label class="form-label">${f.label}</label>
              <input class="form-input" id="wb-${f.id}" value="${esc(wb[f.id]||'')}" placeholder="${f.placeholder}">
            </div>`).join('')}
        </div>
        ${fields.slice(2).map(f => `
          <div class="form-group">
            <label class="form-label">${f.label}</label>
            <textarea class="form-textarea" id="wb-${f.id}" rows="${f.rows}" placeholder="${f.placeholder}">${esc(wb[f.id]||'')}</textarea>
          </div>`).join('')}
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:16px">
      <!-- 用語集 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-book icon" style="color:var(--kon-lt)"></i> 用語集・固有名詞</div>
          <button class="btn btn-primary btn-sm" onclick="openAddWbGlossary()"><i class="fas fa-plus"></i></button>
        </div>
        ${(wb.glossary||[]).length === 0 ?
          `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:12.5px">用語を追加しましょう</div>`
          : `<div style="max-height:300px;overflow-y:auto">${glossaryHtml}</div>`}
      </div>

      <!-- ヒント -->
      <div class="card">
        <div class="card-title" style="margin-bottom:10px"><i class="fas fa-lightbulb icon" style="color:var(--kogane)"></i> 世界観構築のコツ</div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.9">
          <div>🌍 「見える世界」と「見えないルール」を分けて考える</div>
          <div>⚡ 内在する矛盾・葛藤が物語を生む</div>
          <div>🔬 設定は物語に使う分だけ深掘りする</div>
          <div>📚 固有名詞は読者が覚えやすい数に絞る</div>
          <div>🗺️ 地図・年表があると整合性が取りやすい</div>
        </div>
      </div>
    </div>
  </div>`;
}

function saveWorldBuilding() {
  const fields = ['title','era','setting','rules','geography','culture','politics','technology','history','conflicts'];
  const wb = DB.get('worldbuilding', { glossary: [] });
  fields.forEach(f => {
    const el = $(`#wb-${f}`);
    if (el) wb[f] = el.value.trim();
  });
  DB.set('worldbuilding', wb);
  toast('世界観設計を保存しました', 'success');
}

function openAddWbGlossary() {
  openModal(
    `<i class="fas fa-plus" style="color:var(--kon-lt)"></i> 用語を追加`,
    `<div class="form-group"><label class="form-label">用語・固有名詞 <span style="color:var(--accent)">*</span></label><input class="form-input" id="wbg-term" placeholder="例：境界石"></div>
     <div class="form-group"><label class="form-label">説明</label><textarea class="form-textarea" id="wbg-def" rows="3" placeholder="例：二つの世界の境界に存在する古代の石柱。特定の血筋を持つ者にのみ反応する"></textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="addWbGlossary()">追加</button>`
  );
}

function addWbGlossary() {
  const term = $('#wbg-term')?.value?.trim();
  const def = $('#wbg-def')?.value?.trim();
  if (!term) { toast('用語を入力してください', 'error'); return; }
  const wb = DB.get('worldbuilding', { glossary: [] });
  if (!wb.glossary) wb.glossary = [];
  wb.glossary.push({ term, def });
  DB.set('worldbuilding', wb);
  closeModal();
  toast('用語を追加しました', 'success');
  navigate('worldbuilding');
}

function deleteWbGlossary(idx) {
  const wb = DB.get('worldbuilding', { glossary: [] });
  if (!wb.glossary) return;
  wb.glossary.splice(idx, 1);
  DB.set('worldbuilding', wb);
  toast('削除しました', 'info');
  navigate('worldbuilding');
}

// ================================================================
//  PAGE: インスピレーション
// ================================================================
const INSPIRATION_DB = {
  prompts: [
    '二人の見知らぬ人が、同じ日に同じ電車で同じ席を予約していた。',
    '主人公が20年ぶりに実家に帰ったとき、自分の部屋がまるで別人のものになっていた。',
    '「もし昨日死んでいたら、今日誰が悲しんでいたか」と考えながら生きている人物。',
    '嘘をつくたびに体の一部が消えていく世界で、政治家として生きる話。',
    '末期がんの父親が残したのは不動産でもお金でもなく、一冊の「謝罪の手紙リスト」だった。',
    '音楽の天才だが、音楽を聞くと発作を起こす体になってしまった指揮者。',
    '「完璧な結婚」を演じてきた夫婦が、離婚届を書くその日に初めて本音で話す。',
    '探偵が依頼された失踪人は、20年前に自分が関わった事件の被害者の子供だった。',
    '記憶を売って生活できる社会で、「忘れたい記憶」を持つ人々の話。',
    '死ぬ前に「やり残したこと」を叶える会社に、自分自身を依頼しに来た老人。',
    '生まれた瞬間に「死ぬ日」が分かる世界で、今日死ぬはずの人が翌日も生きていた。',
    '島に残された最後の図書館司書と、その図書館を壊しに来た官僚の話。',
    '宇宙船の修理工が、廃棄予定の人工知能に「生きたい」と言われる。',
    '写真を撮るたびに、そこに写っていない「はずだった人」が映り込む。',
    '10年間文通を続けてきた相手が、実は亡くなっていたと知る日。',
    '街の落書きだけが事件の唯一の手がかりだった。',
    '最後の一人の翻訳家が、消えゆく言語を記録する旅に出る。',
    '教師が35年の教師生活の最後の日、最も嫌いだった生徒からの手紙を受け取る。',
    '過去に戻れるが、変えることはできない——ただ「見る」だけ。',
    '二人の刑事が同じ犯人を20年追い続けた。一方は定年退職、もう一方は犯人に恋をしていた。',
  ],
  themes: ['愛と喪失','アイデンティティの危機','許しと和解','正義と悪の曖昧な境界','成長と痛み','孤独と繋がり','真実と嘘','変化への抵抗','信頼と裏切り','自由の代償','記憶と忘却','夢と現実の乖離','家族という呪縛','贖罪の旅','沈黙の力'],
  genres: ['社会派サスペンス','青春ラブストーリー','SF的ディストピア','家族ドラマ','歴史×現代','犯罪捜査もの','心理ホラー','ロードムービー','コメディ×シリアス','武士道時代劇','ヒューマンドラマ','ミステリー×哲学','SF×ロマンス'],
  moods: ['静かな絶望の中に希望','笑いながら泣ける','息が詰まるほどの緊張','疾走感と爽快感','ゆったりとした余韻','うずうずするスリル','じわりと温かい','底冷えするような孤独','胸が締め付けられる切なさ','怒りと哀しみが交錯する'],
  characters: ['正義感が強すぎて孤立した刑事','嘘しかつけない外交官','自分が死ぬことを知っている医師','声を失った歌手','記憶を持つたびに人格が変わる研究者','守るべき人を傷つけてしまった父親','老いた革命家','子供のような老人と老人のような子供'],
  conflicts: ['愛する人を守るために嘘をつき続けなければならない','真実を言えば誰かが傷つく、黙れば自分が壊れる','敵の正しさを認めなければ戦えない','夢を諦めることで家族を救える','正しいことをすれば法を犯す羽目になる'],
  settings: ['24時間以内に何もかもが変わる','同じ場所に毎年戻ってくる二人','誰もいなくなった後の世界','終わらない夜','最後の列車','嘘がすべてバレてしまう装置が普及した社会'],
};

function renderInspirationPage() {
  const tab = State.currentTab['inspiration'] || 'scratch';
  const rp = INSPIRATION_DB.prompts[Math.floor(Math.random()*INSPIRATION_DB.prompts.length)];
  const scratches = DB.get('inspiration_scratches', []);
  const pinnedScratch = scratches.filter(s => s.pinned);
  const recentScratch = scratches.filter(s => !s.pinned).slice(0,5);

  const tabData = [
    { id:'scratch',  label:'スクラッチパッド', icon:'fa-pen-to-square' },
    { id:'generate', label:'ランダム生成',       icon:'fa-dice' },
    { id:'library',  label:'ライブラリ',          icon:'fa-books' },
    { id:'builder',  label:'構造化ビルダー',       icon:'fa-drafting-compass' },
    { id:'notes',    label:'プロジェクトノート',   icon:'fa-notebook' },
    { id:'mindmap',  label:'マインドマップ',        icon:'fa-diagram-project' },
  ];

  const tabs = tabData.map(t => `
    <button class="insp-tab ${tab===t.id?'active':''}" onclick="switchInspirationTab('${t.id}')">
      <i class="fas ${t.icon}"></i> ${t.label}
    </button>`).join('');

  let tabContent = '';
  if (tab === 'scratch') tabContent = renderInspirationScratch(scratches);
  else if (tab === 'generate') tabContent = renderInspirationGenerate(rp);
  else if (tab === 'library') tabContent = renderInspirationLibrary();
  else if (tab === 'builder') tabContent = renderInspirationBuilder();
  else if (tab === 'notes') tabContent = renderInspirationNotes();
  else if (tab === 'mindmap') tabContent = renderInspirationMindmap();

  return `
  <!-- ヒーローバナー -->
  <div style="background:linear-gradient(135deg,var(--kogane-bg) 0%,var(--fuji-bg) 60%,var(--bg-subtle) 100%);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px 24px;margin-bottom:20px;position:relative;overflow:hidden">
    <div style="position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:80px;font-weight:900;font-family:'Noto Serif JP',serif;color:var(--kogane);opacity:0.07;pointer-events:none">閃</div>
    <div style="width:28px;height:2.5px;background:linear-gradient(90deg,var(--kogane),var(--fuji));border-radius:2px;margin-bottom:8px"></div>
    <div style="font-size:20px;font-weight:700;font-family:'Noto Serif JP',serif;color:var(--text-primary)">
      <i class="fas fa-bolt" style="color:var(--kogane);margin-right:8px"></i>インスピレーション・ライブラリ
    </div>
    <div style="font-size:13px;color:var(--text-muted);margin-top:4px">アイデアを集め・分類し・物語の種へ育てる統合ライブラリ</div>
  </div>

  <!-- タブナビ -->
  <div class="insp-tabs" style="margin-bottom:20px">${tabs}</div>

  <!-- タブコンテンツ -->
  <div id="insp-tab-content">${tabContent}</div>`;
}

// ── スクラッチパッドタブ ──────────────────────────────────────
function renderInspirationScratch(scratches) {
  const tags = [...new Set(scratches.flatMap(s => s.tags||[]))].filter(Boolean);
  const filterTag = State.currentTab['insp-tag'] || '';
  const searchQ = State.currentTab['insp-search'] || '';
  const filterType = State.currentTab['insp-type'] || '';
  const sortMode = State.currentTab['insp-sort'] || 'newest';
  const filterPeriod = State.currentTab['insp-period'] || 'all';

  // 複合フィルタリング
  let filtered = scratches.slice();
  if (filterTag) filtered = filtered.filter(s => (s.tags||[]).includes(filterTag));
  if (filterType) filtered = filtered.filter(s => (s.type||'その他') === filterType);
  if (searchQ) {
    const q = searchQ.toLowerCase();
    filtered = filtered.filter(s =>
      (s.title||'').toLowerCase().includes(q) ||
      (s.body||'').toLowerCase().includes(q) ||
      (s.tags||[]).some(t => t.toLowerCase().includes(q))
    );
  }
  if (filterPeriod !== 'all') {
    const now = new Date();
    const limits = { today: 1, week: 7, month: 30, quarter: 90 };
    const days = limits[filterPeriod] || 9999;
    filtered = filtered.filter(s => (now - new Date(s.createdAt)) < days*86400000);
  }
  // ソート
  if (sortMode === 'newest') filtered.sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  else if (sortMode === 'oldest') filtered.sort((a,b) => new Date(a.createdAt)-new Date(b.createdAt));
  else if (sortMode === 'alpha') filtered.sort((a,b) => (a.title||a.body||'').localeCompare(b.title||b.body||''));
  else if (sortMode === 'pinned') filtered.sort((a,b) => (b.pinned?1:0)-(a.pinned?1:0));
  // ピン留めは常に上
  const pinnedFirst = [...filtered.filter(s=>s.pinned), ...filtered.filter(s=>!s.pinned)];
  const displayList = sortMode === 'pinned' ? filtered : pinnedFirst;

  const typeColor = { '着想':'var(--kogane)','シーン':'var(--momo)','セリフ':'var(--fuji)','テーマ':'var(--asagi)','キャラ':'var(--accent)','設定':'var(--matcha)','その他':'var(--text-muted)' };

  const scratchCards = displayList.length === 0
    ? `<div class="insp-empty">
        <i class="fas fa-search" style="font-size:32px;display:block;margin-bottom:10px;opacity:0.25"></i>
        <div style="font-size:14px;font-weight:600;margin-bottom:6px">${searchQ || filterTag || filterType ? '条件に一致するメモがありません' : 'まだメモがありません'}</div>
        <div style="font-size:12px;color:var(--text-muted)">${searchQ||filterTag||filterType ? 'フィルターをリセットしてみてください' : '上の入力欄からアイデアを書き留めましょう'}</div>
       </div>`
    : displayList.map(s => {
        const tagHtml = (s.tags||[]).map(t =>
          `<span class="insp-tag" onclick="filterScratchByTag('${esc(t)}')">${esc(t)}</span>`
        ).join('');
        const tc = typeColor[s.type||'その他'] || 'var(--text-muted)';
        // 検索ハイライト
        const highlightText = (text) => {
          if (!searchQ || !text) return esc(text||'');
          const q = searchQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return esc(text).replace(new RegExp(q, 'gi'), m => `<mark style="background:var(--kogane-bg);color:var(--kogane);border-radius:2px">${m}</mark>`);
        };
        return `
        <div class="insp-scratch-card ${s.pinned?'pinned':''}" id="sc-${s.id}">
          <div class="insp-scratch-top">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:10px;font-weight:700;color:${tc};padding:2px 8px;background:white;border:1px solid ${tc};border-radius:var(--radius-full)">${s.type||'その他'}</span>
              ${s.pinned?`<i class="fas fa-thumbtack" style="font-size:9px;color:var(--kogane)"></i>`:''}
            </div>
            <div style="display:flex;gap:4px;align-items:center">
              <span style="font-size:10px;color:var(--text-light)">${s.createdAt ? s.createdAt.slice(0,10) : ''}</span>
              <button class="btn btn-ghost btn-icon btn-sm" onclick="togglePinScratch('${s.id}')" title="${s.pinned?'ピン解除':'ピン留め'}">
                <i class="fas fa-thumbtack" style="font-size:10px;color:${s.pinned?'var(--kogane)':'var(--text-muted)'}"></i>
              </button>
              <button class="btn btn-ghost btn-icon btn-sm" onclick="openEditScratch('${s.id}')"><i class="fas fa-pen" style="font-size:10px"></i></button>
              <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteScratch('${s.id}')"><i class="fas fa-trash" style="font-size:10px;color:var(--accent)"></i></button>
            </div>
          </div>
          ${s.title ? `<div style="font-size:13px;font-weight:700;color:var(--text-primary);margin:6px 0 4px;font-family:'Noto Serif JP',serif">${highlightText(s.title)}</div>` : ''}
          <div class="insp-scratch-body">${highlightText(s.body||'')}</div>
          ${tagHtml ? `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px">${tagHtml}</div>` : ''}
          <div style="margin-top:10px;display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" style="font-size:11px" onclick="developScratch('${s.id}')"><i class="fas fa-wand-magic-sparkles"></i> 展開する</button>
            <button class="btn btn-ghost btn-sm" style="font-size:11px" onclick="sendScratchToProject('${s.id}')"><i class="fas fa-share"></i> 作品へ送る</button>
          </div>
        </div>`;
      }).join('');

  return `
  <div style="display:grid;grid-template-columns:1fr 300px;gap:20px">
    <!-- 左: 入力 + 検索 + カード一覧 -->
    <div>
      <!-- 素早く入力 -->
      <div class="card" style="margin-bottom:14px;border-top:3px solid var(--kogane)">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px"><i class="fas fa-bolt" style="color:var(--kogane);margin-right:6px"></i>アイデアをすぐに書き留める</div>
        <div class="grid-2" style="gap:8px;margin-bottom:8px">
          <input class="form-input" id="sc-title" placeholder="タイトル（任意）" style="font-size:13px">
          <select class="form-select" id="sc-type" style="font-size:13px">
            <option>着想</option><option>シーン</option><option>セリフ</option><option>テーマ</option><option>キャラ</option><option>設定</option><option>その他</option>
          </select>
        </div>
        <textarea class="form-textarea" id="sc-body" rows="3" placeholder="思いついたことを何でも…キーワード1個でも、一文でも、長文でもOK。" style="font-size:13px;resize:vertical"></textarea>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
          <input class="form-input" id="sc-tags-input" placeholder="タグ（カンマ区切り）例: 主人公, 終盤" style="font-size:12px;max-width:220px">
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="addScratch(true)"><i class="fas fa-thumbtack"></i> ピン</button>
            <button class="btn btn-primary" onclick="addScratch(false)"><i class="fas fa-plus"></i> 追加</button>
          </div>
        </div>
      </div>

      <!-- ブレインストーミングモード -->
      <div class="card" style="margin-bottom:14px;background:var(--fuji-bg);border:1.5px solid var(--fuji-border)">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:13px;font-weight:600;color:var(--fuji)"><i class="fas fa-brain" style="margin-right:6px"></i>ブレインストーミングモード</div>
          <button class="btn btn-sm" style="background:var(--fuji);color:white;border:none" onclick="startBrainStorm()"><i class="fas fa-play"></i> 開始</button>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:6px">タイマー付き自由連想。思いついた単語・フレーズをEnterで連続追加。5分間で最大のアイデア数を目指します。</div>
        <div id="bs-area" style="display:none;margin-top:12px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span id="bs-timer" style="font-size:22px;font-weight:700;color:var(--fuji);font-family:monospace">5:00</span>
            <span style="font-size:12px;color:var(--text-muted)">残り時間</span>
            <span id="bs-count" style="font-size:13px;font-weight:700;color:var(--accent);margin-left:auto">0個</span>
          </div>
          <input class="form-input" id="bs-input" placeholder="単語・フレーズを入力してEnter" style="font-size:14px" onkeydown="handleBsInput(event)">
          <div id="bs-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;max-height:120px;overflow-y:auto"></div>
          <button class="btn btn-ghost btn-sm" style="margin-top:8px;color:var(--accent)" onclick="stopBrainStorm()"><i class="fas fa-stop"></i> 終了してメモに追加</button>
        </div>
      </div>

      <!-- 🔍 万能検索・フィルターバー -->
      <div class="card" style="margin-bottom:14px;padding:12px 14px;background:var(--bg-subtle)">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
          <div style="flex:1;position:relative">
            <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:12px;pointer-events:none"></i>
            <input class="form-input" id="sc-search" value="${esc(searchQ)}" placeholder="タイトル・本文・タグを全文検索…"
              style="padding-left:30px;font-size:12.5px;height:34px"
              oninput="setScratchSearch(this.value)">
          </div>
          ${searchQ ? `<button class="btn btn-ghost btn-sm" onclick="setScratchSearch('')" style="white-space:nowrap"><i class="fas fa-xmark"></i></button>` : ''}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <!-- タイプフィルター -->
          <select class="form-select" style="font-size:11.5px;height:28px;padding:0 8px;width:auto" onchange="setScratchFilter('type',this.value)">
            <option value="" ${!filterType?'selected':''}>すべてのタイプ</option>
            ${['着想','シーン','セリフ','テーマ','キャラ','設定','その他'].map(t=>`<option value="${t}" ${filterType===t?'selected':''}>${t}</option>`).join('')}
          </select>
          <!-- 期間フィルター -->
          <select class="form-select" style="font-size:11.5px;height:28px;padding:0 8px;width:auto" onchange="setScratchFilter('period',this.value)">
            <option value="all" ${filterPeriod==='all'?'selected':''}>全期間</option>
            <option value="today" ${filterPeriod==='today'?'selected':''}>今日</option>
            <option value="week" ${filterPeriod==='week'?'selected':''}>今週</option>
            <option value="month" ${filterPeriod==='month'?'selected':''}>今月</option>
            <option value="quarter" ${filterPeriod==='quarter'?'selected':''}>過去3ヶ月</option>
          </select>
          <!-- ソート -->
          <select class="form-select" style="font-size:11.5px;height:28px;padding:0 8px;width:auto" onchange="setScratchFilter('sort',this.value)">
            <option value="newest" ${sortMode==='newest'?'selected':''}>新しい順</option>
            <option value="oldest" ${sortMode==='oldest'?'selected':''}>古い順</option>
            <option value="alpha" ${sortMode==='alpha'?'selected':''}>あいうえお順</option>
            <option value="pinned" ${sortMode==='pinned'?'selected':''}>ピン優先</option>
          </select>
          <!-- 件数表示 -->
          <span style="font-size:11px;color:var(--text-muted);margin-left:auto">${displayList.length} / ${scratches.length}件</span>
        </div>
        <!-- タグフィルター -->
        ${tags.length > 0 ? `
        <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
          <span style="font-size:10.5px;color:var(--text-muted)"><i class="fas fa-tag" style="margin-right:3px"></i></span>
          <span class="insp-tag ${!filterTag?'active':''}" onclick="filterScratchByTag('')">すべて</span>
          ${tags.slice(0, 15).map(t => `<span class="insp-tag ${filterTag===t?'active':''}" onclick="filterScratchByTag('${esc(t)}')">${esc(t)}</span>`).join('')}
          ${tags.length > 15 ? `<span style="font-size:10px;color:var(--text-muted)">他${tags.length-15}件…</span>` : ''}
        </div>` : ''}
      </div>

      <!-- カード一覧 -->
      <div id="scratch-list" style="display:flex;flex-direction:column;gap:10px">
        ${scratchCards}
      </div>
    </div>

    <!-- 右: サイドパネル -->
    <div style="display:flex;flex-direction:column;gap:14px">
      <!-- 統計 -->
      <div class="card" style="padding:14px">
        <div style="font-size:12.5px;font-weight:600;margin-bottom:10px;color:var(--text-secondary)"><i class="fas fa-chart-simple" style="color:var(--asagi);margin-right:6px"></i>メモ図書館</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${[
            { label:'総メモ', val: scratches.length, color:'var(--asagi)' },
            { label:'ピン留め', val: scratches.filter(s=>s.pinned).length, color:'var(--kogane)' },
            { label:'タグ数', val: tags.length, color:'var(--fuji)' },
            { label:'今週追加', val: scratches.filter(s => { const d=new Date(s.createdAt); const now=new Date(); return (now-d) < 7*86400000; }).length, color:'var(--matcha)' },
          ].map(s => `<div style="text-align:center;padding:8px;background:var(--bg-subtle);border-radius:var(--radius-sm);cursor:pointer">
            <div style="font-size:18px;font-weight:700;color:${s.color}">${s.val}</div>
            <div style="font-size:10.5px;color:var(--text-muted)">${s.label}</div>
          </div>`).join('')}
        </div>
      </div>

      <!-- タイプ別内訳 -->
      ${scratches.length > 0 ? `
      <div class="card" style="padding:14px">
        <div style="font-size:12.5px;font-weight:600;margin-bottom:10px;color:var(--text-secondary)"><i class="fas fa-layer-group" style="color:var(--momo);margin-right:6px"></i>タイプ別</div>
        ${(function(){
          const counts = {};
          scratches.forEach(s => { const t=s.type||'その他'; counts[t]=(counts[t]||0)+1; });
          return Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([t,c]) => {
            const pct = Math.round(c/scratches.length*100);
            const tc2 = typeColor[t]||'var(--text-muted)';
            return `<div style="margin-bottom:6px;cursor:pointer" onclick="setScratchFilter('type','${filterType===t?'':t}')">
              <div style="display:flex;justify-content:space-between;margin-bottom:2px">
                <span style="font-size:11.5px;color:${tc2};font-weight:${filterType===t?700:400}">${t}</span>
                <span style="font-size:11px;color:var(--text-light)">${c}</span>
              </div>
              <div style="height:4px;background:var(--bg-hover);border-radius:2px"><div style="height:100%;width:${pct}%;background:${tc2};border-radius:2px"></div></div>
            </div>`;
          }).join('');
        })()}
      </div>` : ''}

      <!-- ピン留めメモ（クイックアクセス） -->
      ${scratches.filter(s=>s.pinned).length > 0 ? `
      <div class="card" style="padding:14px">
        <div style="font-size:12.5px;font-weight:600;margin-bottom:10px;color:var(--text-secondary)"><i class="fas fa-thumbtack" style="color:var(--kogane);margin-right:6px"></i>ピン留め</div>
        ${scratches.filter(s=>s.pinned).map(s => `
          <div style="padding:8px 10px;background:var(--kogane-bg);border:1px solid var(--kogane-border);border-radius:var(--radius-sm);margin-bottom:5px;cursor:pointer" onclick="scrollToScratch('${s.id}')">
            <div style="font-size:11px;font-weight:600;color:var(--kogane);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.title||s.body?.slice(0,30)||'無題')}</div>
            <div style="font-size:10px;color:var(--text-muted)">${s.createdAt?s.createdAt.slice(0,10):''}</div>
          </div>`).join('')}
      </div>` : ''}

      <!-- 月別アーカイブ -->
      ${scratches.length > 0 ? `
      <div class="card" style="padding:14px">
        <div style="font-size:12.5px;font-weight:600;margin-bottom:10px;color:var(--text-secondary)"><i class="fas fa-calendar-days" style="color:var(--asagi);margin-right:6px"></i>月別アーカイブ</div>
        ${(function(){
          const months = {};
          scratches.forEach(s => {
            const m = (s.createdAt||'').slice(0,7);
            if (m) months[m] = (months[m]||0)+1;
          });
          return Object.entries(months).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,8).map(([m,c]) => {
            const [yr,mo] = m.split('-');
            return `<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="setScratchFilter('period','all');setScratchSearch('')">
              <span style="font-size:11.5px;color:var(--text-secondary)">${yr}年${parseInt(mo)}月</span>
              <span style="font-size:11px;font-weight:600;color:var(--asagi);background:var(--asagi-bg);padding:1px 7px;border-radius:10px">${c}</span>
            </div>`;
          }).join('');
        })()}
      </div>` : ''}

      <!-- タグクラウド -->
      ${tags.length > 0 ? `
      <div class="card" style="padding:14px">
        <div style="font-size:12.5px;font-weight:600;margin-bottom:10px;color:var(--text-secondary)"><i class="fas fa-tags" style="color:var(--fuji);margin-right:6px"></i>タグクラウド</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${tags.map(t => {
            const cnt = scratches.filter(s=>(s.tags||[]).includes(t)).length;
            const size = cnt>=5?'13.5px':cnt>=3?'13px':cnt>=2?'12px':'11px';
            const active = filterTag === t;
            return `<span class="insp-tag ${active?'active':''}" style="font-size:${size}" onclick="filterScratchByTag('${esc(t)}')">${esc(t)} <span style="opacity:0.6">${cnt}</span></span>`;
          }).join('')}
        </div>
      </div>` : ''}
    </div>
  </div>`;
}

// ── ランダム生成タブ ──────────────────────────────────────────
function renderInspirationGenerate(rp) {
  const rt = INSPIRATION_DB.themes[Math.floor(Math.random()*INSPIRATION_DB.themes.length)];
  const rg = INSPIRATION_DB.genres[Math.floor(Math.random()*INSPIRATION_DB.genres.length)];
  const rm = INSPIRATION_DB.moods[Math.floor(Math.random()*INSPIRATION_DB.moods.length)];
  const rc = INSPIRATION_DB.characters[Math.floor(Math.random()*INSPIRATION_DB.characters.length)];
  const rconf = INSPIRATION_DB.conflicts[Math.floor(Math.random()*INSPIRATION_DB.conflicts.length)];
  const rs = INSPIRATION_DB.settings[Math.floor(Math.random()*INSPIRATION_DB.settings.length)];

  return `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div>
      <!-- プロンプトカード -->
      <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,var(--kogane-bg),var(--bg-white));border-top:3px solid var(--kogane)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="font-size:13px;font-weight:600;color:var(--kogane)"><i class="fas fa-sparkles" style="margin-right:6px"></i>ランダムプロンプト</div>
          <button class="btn btn-ghost btn-sm" onclick="switchInspirationTab('generate')"><i class="fas fa-rotate"></i></button>
        </div>
        <div id="insp-prompt" style="font-size:14px;color:var(--text-primary);line-height:1.9;padding:16px;background:white;border-radius:var(--radius-md);border:1px solid var(--kogane-border);font-family:'Noto Serif JP',serif;font-style:italic">
          「${esc(rp)}」
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary btn-sm" onclick="copyPrompt()"><i class="fas fa-copy"></i> コピー</button>
          <button class="btn btn-ghost btn-sm" onclick="savePromptToScratch()"><i class="fas fa-pen-to-square"></i> スクラッチへ</button>
          <button class="btn btn-primary btn-sm" onclick="savePromptToIdeas()"><i class="fas fa-lightbulb"></i> 作品アイデアへ</button>
        </div>
      </div>

      <!-- 全プロンプト一覧 -->
      <div class="card">
        <div class="card-header"><div style="font-size:13px;font-weight:600;color:var(--text-secondary)"><i class="fas fa-list icon" style="color:var(--asagi)"></i> プロンプト一覧 (${INSPIRATION_DB.prompts.length})</div></div>
        <div style="max-height:360px;overflow-y:auto">
          ${INSPIRATION_DB.prompts.map((p, i) => `
            <div class="insp-prompt-item" onclick="setActivePrompt(${i})">
              <span style="font-size:10px;color:var(--text-muted);min-width:18px">${i+1}.</span>
              <span style="font-size:12.5px;color:var(--text-secondary);line-height:1.6">${esc(p)}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:14px">
      <!-- ランダム組み合わせ -->
      <div class="card" style="border-top:3px solid var(--fuji)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="font-size:13px;font-weight:600;color:var(--fuji)"><i class="fas fa-shuffle" style="margin-right:6px"></i>ランダム組み合わせ</div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="generateInspirationCombo()"><i class="fas fa-dice"></i> 再生成</button>
            <button class="btn btn-ghost btn-sm" onclick="saveComboToScratch()"><i class="fas fa-pen-to-square"></i> 保存</button>
          </div>
        </div>
        <div id="insp-combo">
          ${renderInspirationCombo(rt, rg, rm, rc, rconf, rs)}
        </div>
      </div>

      <!-- テーマ -->
      <div class="card" style="padding:14px">
        <div style="font-size:12.5px;font-weight:600;color:var(--momo);margin-bottom:8px"><i class="fas fa-heart" style="margin-right:5px"></i>テーマ集</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${INSPIRATION_DB.themes.map(t => `<span class="insp-tag momo" onclick="copyToClipboard('${esc(t)}')" title="コピー">${esc(t)}</span>`).join('')}
        </div>
      </div>

      <!-- ジャンル + ムード -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="card" style="padding:12px">
          <div style="font-size:11.5px;font-weight:600;color:var(--kon-lt);margin-bottom:7px"><i class="fas fa-film" style="margin-right:4px"></i>ジャンル</div>
          <div style="display:flex;flex-direction:column;gap:3px">
            ${INSPIRATION_DB.genres.map(g => `<span class="insp-tag kon" onclick="copyToClipboard('${esc(g)}')" style="font-size:10.5px">${esc(g)}</span>`).join('')}
          </div>
        </div>
        <div class="card" style="padding:12px">
          <div style="font-size:11.5px;font-weight:600;color:var(--asagi);margin-bottom:7px"><i class="fas fa-theater-masks" style="margin-right:4px"></i>ムード</div>
          <div style="display:flex;flex-direction:column;gap:3px">
            ${INSPIRATION_DB.moods.map(m => `<span class="insp-tag asagi" onclick="copyToClipboard('${esc(m)}')" style="font-size:10.5px">${esc(m)}</span>`).join('')}
          </div>
        </div>
      </div>

      <!-- キャラクター的特徴 -->
      <div class="card" style="padding:14px">
        <div style="font-size:12.5px;font-weight:600;color:var(--accent);margin-bottom:8px"><i class="fas fa-user-secret" style="margin-right:5px"></i>キャラクタータイプ</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${INSPIRATION_DB.characters.map(c => `<span class="insp-tag beni" onclick="copyToClipboard('${esc(c)}')" style="font-size:10.5px">${esc(c)}</span>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

// ── ライブラリタブ ────────────────────────────────────────────
function renderInspirationLibrary() {
  const bookmarks = DB.get('insp_bookmarks', []);
  const combos = DB.get('inspiration_history', []);

  return `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-header">
          <div style="font-size:13px;font-weight:600"><i class="fas fa-bookmark icon" style="color:var(--kogane)"></i> ブックマーク (${bookmarks.length})</div>
          ${bookmarks.length > 0 ? `<button class="btn btn-ghost btn-sm" onclick="clearBookmarks()"><i class="fas fa-trash"></i></button>` : ''}
        </div>
        ${bookmarks.length === 0
          ? `<div class="insp-empty"><i class="fas fa-bookmark" style="font-size:28px;display:block;margin-bottom:8px;opacity:0.2"></i>ランダム生成タブで「保存」するとここに追加されます</div>`
          : bookmarks.map(b => `
            <div style="padding:10px 12px;background:var(--bg-subtle);border-radius:var(--radius-sm);margin-bottom:8px;border:1px solid var(--border)">
              <div style="font-size:10px;color:var(--text-muted);margin-bottom:5px">${b.savedAt||''}</div>
              <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;white-space:pre-wrap">${esc(b.content)}</div>
              <div style="margin-top:8px;display:flex;gap:6px">
                <button class="btn btn-ghost btn-sm" style="font-size:11px" onclick="sendBookmarkToScratch(${bookmarks.indexOf(b)})"><i class="fas fa-pen-to-square"></i> スクラッチへ</button>
                <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteBookmark(${bookmarks.indexOf(b)})"><i class="fas fa-trash" style="font-size:10px;color:var(--accent)"></i></button>
              </div>
            </div>`).join('')}
      </div>
    </div>

    <div>
      <div class="card">
        <div class="card-header">
          <div style="font-size:13px;font-weight:600"><i class="fas fa-clock-rotate-left icon" style="color:var(--fuji)"></i> 生成履歴 (${combos.length})</div>
          ${combos.length > 0 ? `<button class="btn btn-ghost btn-sm" onclick="clearInspirationHistory()"><i class="fas fa-trash"></i></button>` : ''}
        </div>
        ${combos.length === 0
          ? `<div class="insp-empty">まだ生成履歴がありません</div>`
          : combos.slice(0,20).map((h,i) => `
            <div style="padding:10px;background:var(--bg-subtle);border-radius:var(--radius-sm);margin-bottom:6px;border:1px solid var(--border)">
              <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">${h.date}</div>
              <div style="font-size:12px;color:var(--text-secondary);line-height:1.6">${esc(h.combo)}</div>
              <button class="btn btn-ghost btn-sm" style="margin-top:6px;font-size:11px" onclick="reloadCombo(${i})"><i class="fas fa-rotate-left"></i> 再利用</button>
            </div>`).join('')}
      </div>
    </div>
  </div>`;
}

// ── 構造化ビルダータブ ────────────────────────────────────────
function renderInspirationBuilder() {
  const draft = DB.get('insp_builder_draft', {
    premise: '', protagonist: '', antagonist: '', conflict: '', theme: '', tone: '', hook: '', logline: ''
  });

  return `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div>
      <div class="card">
        <div class="card-header">
          <div style="font-size:13px;font-weight:600;color:var(--fuji)"><i class="fas fa-drafting-compass icon"></i> 物語の核を構造化する</div>
          <button class="btn btn-primary btn-sm" onclick="saveBuilderDraft()"><i class="fas fa-floppy-disk"></i> 保存</button>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px;padding:8px 10px;background:var(--fuji-bg);border-radius:var(--radius-sm);border-left:3px solid var(--fuji)">
          スクラッチパッドに集めた雑案を、物語の核となる要素に整理します。
        </div>

        <div class="form-group">
          <label class="form-label" style="color:var(--accent)">プレミス（一言で言うと？）</label>
          <textarea class="form-textarea" id="bld-premise" rows="2" placeholder="例：正義を信じた男が、正義そのものに裏切られる話">${esc(draft.premise||'')}</textarea>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label" style="color:var(--matcha)">主人公（誰が？）</label>
            <textarea class="form-textarea" id="bld-protagonist" rows="2" placeholder="職業・性格・最大の欠如">${esc(draft.protagonist||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="color:var(--momo)">敵役・障害（何が立ちはだかる？）</label>
            <textarea class="form-textarea" id="bld-antagonist" rows="2" placeholder="人・制度・内なる葛藤">${esc(draft.antagonist||'')}</textarea>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" style="color:var(--fuji)">中心的葛藤（何vs何？）</label>
          <input class="form-input" id="bld-conflict" value="${esc(draft.conflict||'')}" placeholder="例：愛する人を守りたい vs 真実を明かさなければならない">
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">テーマ（何を問う？）</label>
            <input class="form-input" id="bld-theme" value="${esc(draft.theme||'')}" placeholder="例：正義とは何か">
          </div>
          <div class="form-group">
            <label class="form-label">トーン（どんな空気感？）</label>
            <input class="form-input" id="bld-tone" value="${esc(draft.tone||'')}" placeholder="例：重厚・社会派">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" style="color:var(--kogane)">フック（冒頭の引き）</label>
          <textarea class="form-textarea" id="bld-hook" rows="2" placeholder="例：第1シーンで主人公は何を見て凍りつくか">${esc(draft.hook||'')}</textarea>
        </div>
      </div>
    </div>

    <div>
      <!-- ログライン自動合成 -->
      <div class="card" style="margin-bottom:16px;border-top:3px solid var(--accent)">
        <div class="card-header">
          <div style="font-size:13px;font-weight:600;color:var(--accent)"><i class="fas fa-wand-magic-sparkles icon"></i> ログライン自動合成</div>
          <button class="btn btn-primary btn-sm" onclick="synthesizeLogline()"><i class="fas fa-bolt"></i> 合成</button>
        </div>
        <div id="bld-logline-out" style="min-height:80px;padding:12px;background:var(--bg-subtle);border-radius:var(--radius-md);border:1px solid var(--border);font-family:'Noto Serif JP',serif;font-size:13.5px;color:var(--text-secondary);line-height:1.8;font-style:italic">
          ${draft.logline ? `「${esc(draft.logline)}」` : `左のフォームを記入して「合成」ボタンを押してください`}
        </div>
        <div style="margin-top:10px;display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="copyBuilderLogline()"><i class="fas fa-copy"></i> コピー</button>
          <button class="btn btn-ghost btn-sm" onclick="sendLoglineToProject()"><i class="fas fa-share"></i> 作品に設定</button>
        </div>
      </div>

      <!-- 構造チェックリスト -->
      <div class="card" style="margin-bottom:16px">
        <div style="font-size:13px;font-weight:600;margin-bottom:12px"><i class="fas fa-check-circle icon" style="color:var(--matcha)"></i> 物語の核 チェックリスト</div>
        ${[
          { id:'bld-premise', label:'プレミスが一文で言えるか', key:'premise' },
          { id:'bld-protagonist', label:'主人公に明確な欠如があるか', key:'protagonist' },
          { id:'bld-antagonist', label:'対立勢力が具体的か', key:'antagonist' },
          { id:'bld-conflict', label:'葛藤がA vs Bで表現できるか', key:'conflict' },
          { id:'bld-theme', label:'テーマが問いの形になっているか', key:'theme' },
          { id:'bld-hook', label:'冒頭3分で観客を引き込めるか', key:'hook' },
        ].map(c => {
          const filled = draft[c.key] && draft[c.key].trim().length > 0;
          return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
            <div style="width:18px;height:18px;border-radius:50%;border:2px solid ${filled?'var(--matcha)':'var(--border)'};background:${filled?'var(--matcha)':'white'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${filled?'<i class="fas fa-check" style="font-size:9px;color:white"></i>':''}
            </div>
            <span style="font-size:12.5px;color:${filled?'var(--text-primary)':'var(--text-muted)'}">${c.label}</span>
          </div>`;
        }).join('')}
      </div>

      <!-- スクラッチから取り込む -->
      <div class="card" style="padding:14px">
        <div style="font-size:12.5px;font-weight:600;color:var(--text-secondary);margin-bottom:10px"><i class="fas fa-import icon" style="color:var(--asagi)"></i> スクラッチから取り込む</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">スクラッチパッドのメモをビルダーに反映できます</div>
        <button class="btn btn-secondary" style="width:100%" onclick="switchInspirationTab('scratch')">
          <i class="fas fa-pen-to-square"></i> スクラッチパッドを開く
        </button>
      </div>
    </div>
  </div>`;
}

// ── プロジェクトノートタブ ────────────────────────────────────────
function renderInspirationNotes() {
  const projects = DB.getProjects();
  const selectedProj = State.currentTab['insp-notes-proj'] || (projects[0]?.id || '');
  const proj = projects.find(p => p.id === selectedProj);
  const notes = DB.get('project_notes_' + selectedProj, []);

  const projOptions = projects.map(p =>
    `<option value="${p.id}" ${p.id === selectedProj ? 'selected' : ''}>${esc(p.title)}</option>`
  ).join('');

  const noteCards = notes.length === 0
    ? `<div class="insp-empty"><i class="fas fa-notebook" style="font-size:28px;display:block;margin-bottom:8px;opacity:.2"></i>ノートがありません。追加してください。</div>`
    : notes.map((n, i) => `
      <div class="insp-note-card ${n.pinned?'pinned':''}" id="pn-${i}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:10px;padding:2px 8px;background:${n.color||'var(--bg-hover)'};border-radius:12px;font-weight:700;color:var(--text-secondary)">${esc(n.category||'一般')}</span>
            ${n.pinned?`<i class="fas fa-thumbtack" style="color:var(--kogane);font-size:10px"></i>`:''}
          </div>
          <div style="display:flex;gap:3px">
            <button class="btn btn-ghost btn-icon btn-sm" onclick="editProjectNote('${selectedProj}',${i})" title="編集"><i class="fas fa-pen" style="font-size:9px"></i></button>
            <button class="btn btn-ghost btn-icon btn-sm" onclick="togglePinProjectNote('${selectedProj}',${i})" title="ピン"><i class="fas fa-thumbtack" style="font-size:9px;color:${n.pinned?'var(--kogane)':'var(--text-muted)'}"></i></button>
            <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteProjectNote('${selectedProj}',${i})" title="削除"><i class="fas fa-trash" style="font-size:9px;color:var(--accent)"></i></button>
          </div>
        </div>
        ${n.title ? `<div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:5px;font-family:'Noto Serif JP',serif">${esc(n.title)}</div>` : ''}
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;white-space:pre-wrap">${esc((n.body||'').slice(0,200))}${(n.body||'').length>200?'…':''}</div>
        <div class="insp-note-tags">
          ${(n.tags||[]).map(t=>`<span class="insp-tag">#${esc(t)}</span>`).join('')}
        </div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:8px">${fmtDate(n.updatedAt||n.createdAt)}</div>
      </div>`
    ).join('');

  return `
  <div style="display:grid;grid-template-columns:1fr 300px;gap:20px">
    <div>
      <div class="card" style="margin-bottom:16px;border-top:3px solid var(--fuji)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <label style="font-size:12px;font-weight:600;color:var(--text-secondary)">作品を選択:</label>
          <select class="form-select" style="flex:1" onchange="switchInspirationNotesProj(this.value)">
            ${projects.length===0?'<option>作品がありません</option>':projOptions}
          </select>
          <button class="btn btn-primary btn-sm" onclick="openAddProjectNote('${selectedProj}')"><i class="fas fa-plus"></i> 追加</button>
        </div>
        ${proj ? `<div style="font-size:12px;color:var(--text-muted);padding:8px 12px;background:var(--bg-subtle);border-radius:var(--radius-sm)">
          <i class="fas fa-film" style="margin-right:6px;color:var(--accent)"></i>${esc(proj.title)} — ${esc(proj.phase)} フェーズ
        </div>` : ''}
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
        ${noteCards}
      </div>
    </div>

    <div>
      <div class="card" style="padding:14px">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px"><i class="fas fa-chart-simple" style="color:var(--fuji);margin-right:6px"></i>ノート統計</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${[
            { label:'総ノート数', val: notes.length, color:'var(--fuji)' },
            { label:'ピン留め', val: notes.filter(n=>n.pinned).length, color:'var(--kogane)' },
          ].map(s=>`<div style="text-align:center;padding:10px;background:var(--bg-subtle);border-radius:var(--radius-sm)">
            <div style="font-size:20px;font-weight:700;color:${s.color}">${s.val}</div>
            <div style="font-size:10.5px;color:var(--text-muted)">${s.label}</div>
          </div>`).join('')}
        </div>
      </div>

      <div class="card" style="margin-top:14px;padding:14px">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px"><i class="fas fa-layer-group" style="color:var(--momo);margin-right:6px"></i>カテゴリ別</div>
        ${(function(){
          const cats = {};
          notes.forEach(n => { const c=n.category||'一般'; cats[c]=(cats[c]||0)+1; });
          if(Object.keys(cats).length===0) return '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:12px">まだノートがありません</div>';
          return Object.entries(cats).map(([c,cnt])=>`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:12px;color:var(--text-secondary)">${esc(c)}</span>
              <span style="font-size:11px;font-weight:700;color:var(--fuji)">${cnt}</span>
            </div>`).join('');
        })()}
      </div>
    </div>
  </div>`;
}

// ── マインドマップタブ ────────────────────────────────────────
function renderInspirationMindmap() {
  const projects = DB.getProjects();
  const selectedProj = State.currentTab['insp-mm-proj'] || (projects[0]?.id || '');
  const scratches = DB.get('inspiration_scratches', []);
  const projNotes = DB.get('project_notes_' + selectedProj, []);
  const mmData = DB.get('mindmap_' + selectedProj, { center: '', nodes: [] });

  const projOptions = projects.map(p =>
    `<option value="${p.id}" ${p.id === selectedProj ? 'selected' : ''}>${esc(p.title)}</option>`
  ).join('');

  return `
  <div>
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px">
        <label style="font-size:12px;font-weight:600">作品:</label>
        <select class="form-select" style="flex:1;max-width:260px" onchange="switchMindmapProj(this.value)">
          ${projects.length===0?'<option>作品がありません</option>':projOptions}
        </select>
        <button class="btn btn-primary btn-sm" onclick="addMindmapNode('${selectedProj}')"><i class="fas fa-plus"></i> ノード追加</button>
        <button class="btn btn-ghost btn-sm" onclick="clearMindmap('${selectedProj}')"><i class="fas fa-trash"></i> クリア</button>
      </div>
    </div>

    <div class="card" style="padding:20px;min-height:400px;position:relative;overflow:hidden">
      <div style="font-size:13px;font-weight:600;margin-bottom:16px;color:var(--text-muted)"><i class="fas fa-diagram-project" style="color:var(--fuji);margin-right:6px"></i>マインドマップ（ノード接続図）</div>

      <!-- 中心ノード -->
      <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:24px">
        <div style="background:linear-gradient(135deg,var(--accent),var(--momo));color:white;padding:14px 24px;border-radius:30px;font-size:14px;font-weight:700;font-family:'Noto Serif JP',serif;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.12);min-width:160px;text-align:center"
          onclick="editMindmapCenter('${selectedProj}')">
          ${mmData.center ? esc(mmData.center) : '中心テーマをクリックして設定'}
        </div>
        <div style="width:2px;height:20px;background:var(--border)"></div>
      </div>

      <!-- ノード群 -->
      ${mmData.nodes.length === 0
        ? `<div style="text-align:center;padding:28px;color:var(--text-muted)"><i class="fas fa-plus-circle" style="font-size:28px;opacity:.3;display:block;margin-bottom:8px"></i>「ノード追加」でアイデアを追加してください</div>`
        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
          ${mmData.nodes.map((node, i) => `
          <div style="background:${node.color||'var(--bg-subtle)'};border:1.5px solid ${node.borderColor||'var(--border)'};border-radius:var(--radius);padding:12px 14px;position:relative;cursor:default">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
              <span style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">${esc(node.type||'アイデア')}</span>
              <div style="display:flex;gap:3px">
                <button class="btn btn-ghost btn-icon btn-sm" onclick="editMindmapNode('${selectedProj}',${i})" title="編集"><i class="fas fa-pen" style="font-size:9px"></i></button>
                <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteMindmapNode('${selectedProj}',${i})" title="削除"><i class="fas fa-xmark" style="font-size:10px;color:var(--accent)"></i></button>
              </div>
            </div>
            <div style="font-size:13px;font-weight:600;color:var(--text-primary);line-height:1.4">${esc(node.text)}</div>
            ${node.detail ? `<div style="font-size:11px;color:var(--text-muted);margin-top:5px;line-height:1.5">${esc(node.detail.slice(0,80))}${node.detail.length>80?'…':''}</div>` : ''}
            ${node.linkedTo ? `<div style="font-size:10px;color:var(--fuji);margin-top:6px"><i class="fas fa-link" style="font-size:9px"></i> ${esc(node.linkedTo)}</div>` : ''}
          </div>`).join('')}
        </div>`}

      <!-- スクラッチからインポート -->
      ${scratches.length > 0 ? `
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
        <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:10px"><i class="fas fa-import" style="margin-right:6px"></i>スクラッチパッドからインポート</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${scratches.slice(0,6).map((s,i) => `
          <button class="btn btn-ghost btn-sm" style="font-size:11px" onclick="importScratchToMindmap('${selectedProj}','${s.id}')">
            <i class="fas fa-plus" style="font-size:9px"></i> ${esc((s.title||s.body||'').slice(0,20))}…
          </button>`).join('')}
        </div>
      </div>` : ''}
    </div>
  </div>`;
}

// ── ノートヘルパー ────────────────────────────────────────
function switchInspirationNotesProj(projId) {
  State.currentTab['insp-notes-proj'] = projId;
  const el = document.getElementById('insp-tab-content');
  if (el) el.innerHTML = renderInspirationNotes();
}

function switchMindmapProj(projId) {
  State.currentTab['insp-mm-proj'] = projId;
  const el = document.getElementById('insp-tab-content');
  if (el) el.innerHTML = renderInspirationMindmap();
}

function openAddProjectNote(projId) {
  if (!projId) { toast('作品を選択してください', 'error'); return; }
  openModal(
    '<i class="fas fa-notebook" style="color:var(--fuji)"></i> プロジェクトノートを追加',
    `<div class="form-group">
      <label class="form-label">タイトル（任意）</label>
      <input class="form-input" id="pn-title" placeholder="例: 第2幕の転換点メモ">
    </div>
    <div class="form-group">
      <label class="form-label">内容 <span style="color:var(--accent)">*</span></label>
      <textarea class="form-textarea" id="pn-body" rows="6" placeholder="詳細なメモを自由に書いてください…"></textarea>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">カテゴリ</label>
        <select class="form-select" id="pn-cat">
          <option value="一般">一般</option>
          <option value="プロット">プロット</option>
          <option value="キャラクター">キャラクター</option>
          <option value="世界観">世界観</option>
          <option value="セリフ">セリフ</option>
          <option value="構成">構成</option>
          <option value="テーマ">テーマ</option>
          <option value="リサーチ">リサーチ</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">タグ（スペース区切り）</label>
        <input class="form-input" id="pn-tags" placeholder="例: 重要 第2幕">
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveProjectNote('${projId}')"><i class="fas fa-save"></i> 保存</button>`
  );
}

function saveProjectNote(projId) {
  const title = $('#pn-title')?.value?.trim() || '';
  const body = $('#pn-body')?.value?.trim() || '';
  const cat = $('#pn-cat')?.value || '一般';
  const tagsRaw = $('#pn-tags')?.value?.trim() || '';
  if (!body) { toast('内容を入力してください', 'error'); return; }
  const tags = tagsRaw ? tagsRaw.split(/\s+/).filter(Boolean) : [];
  const notes = DB.get('project_notes_' + projId, []);
  const n = { id: genId(), title, body, category: cat, tags, pinned: false, createdAt: now(), updatedAt: now() };
  notes.unshift(n);
  DB.set('project_notes_' + projId, notes);
  closeModal();
  toast('ノートを保存しました', 'success');
  const el = document.getElementById('insp-tab-content');
  if (el) el.innerHTML = renderInspirationNotes();
}

function editProjectNote(projId, idx) {
  const notes = DB.get('project_notes_' + projId, []);
  const n = notes[idx];
  if (!n) return;
  openModal(
    '<i class="fas fa-pen" style="color:var(--fuji)"></i> ノートを編集',
    `<div class="form-group">
      <label class="form-label">タイトル</label>
      <input class="form-input" id="pn-title" value="${esc(n.title||'')}">
    </div>
    <div class="form-group">
      <label class="form-label">内容</label>
      <textarea class="form-textarea" id="pn-body" rows="6">${esc(n.body||'')}</textarea>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">カテゴリ</label>
        <select class="form-select" id="pn-cat">
          ${['一般','プロット','キャラクター','世界観','セリフ','構成','テーマ','リサーチ'].map(c=>`<option value="${c}" ${c===n.category?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">タグ</label>
        <input class="form-input" id="pn-tags" value="${esc((n.tags||[]).join(' '))}">
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="updateProjectNote('${projId}',${idx})">保存</button>`
  );
}

function updateProjectNote(projId, idx) {
  const notes = DB.get('project_notes_' + projId, []);
  if (!notes[idx]) return;
  const tagsRaw = $('#pn-tags')?.value?.trim() || '';
  notes[idx] = {
    ...notes[idx],
    title: $('#pn-title')?.value?.trim() || '',
    body: $('#pn-body')?.value?.trim() || '',
    category: $('#pn-cat')?.value || '一般',
    tags: tagsRaw ? tagsRaw.split(/\s+/).filter(Boolean) : [],
    updatedAt: now(),
  };
  DB.set('project_notes_' + projId, notes);
  closeModal();
  toast('ノートを更新しました', 'success');
  const el = document.getElementById('insp-tab-content');
  if (el) el.innerHTML = renderInspirationNotes();
}

function deleteProjectNote(projId, idx) {
  if (!confirm('このノートを削除しますか？')) return;
  const notes = DB.get('project_notes_' + projId, []);
  notes.splice(idx, 1);
  DB.set('project_notes_' + projId, notes);
  toast('ノートを削除しました', 'info');
  const el = document.getElementById('insp-tab-content');
  if (el) el.innerHTML = renderInspirationNotes();
}

function togglePinProjectNote(projId, idx) {
  const notes = DB.get('project_notes_' + projId, []);
  if (!notes[idx]) return;
  notes[idx].pinned = !notes[idx].pinned;
  DB.set('project_notes_' + projId, notes);
  const el = document.getElementById('insp-tab-content');
  if (el) el.innerHTML = renderInspirationNotes();
}

// ── マインドマップヘルパー ────────────────────────────────────────
function editMindmapCenter(projId) {
  const mmData = DB.get('mindmap_' + projId, { center: '', nodes: [] });
  const val = prompt('中心テーマを入力してください:', mmData.center || '');
  if (val === null) return;
  mmData.center = val.trim();
  DB.set('mindmap_' + projId, mmData);
  const el = document.getElementById('insp-tab-content');
  if (el) el.innerHTML = renderInspirationMindmap();
}

function addMindmapNode(projId) {
  openModal(
    '<i class="fas fa-diagram-project" style="color:var(--fuji)"></i> ノードを追加',
    `<div class="form-group">
      <label class="form-label">テキスト <span style="color:var(--accent)">*</span></label>
      <input class="form-input" id="mm-text" placeholder="例: 主人公の動機" autofocus>
    </div>
    <div class="form-group">
      <label class="form-label">詳細メモ（任意）</label>
      <textarea class="form-textarea" id="mm-detail" rows="3" placeholder="補足説明…"></textarea>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">タイプ</label>
        <select class="form-select" id="mm-type">
          <option>アイデア</option><option>キャラクター</option><option>シーン</option>
          <option>テーマ</option><option>設定</option><option>セリフ</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">接続先（任意）</label>
        <input class="form-input" id="mm-link" placeholder="例: 第2幕の転換点">
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveMindmapNode('${projId}')">追加</button>`
  );
}

function saveMindmapNode(projId) {
  const text = $('#mm-text')?.value?.trim();
  if (!text) { toast('テキストを入力してください', 'error'); return; }
  const mmData = DB.get('mindmap_' + projId, { center: '', nodes: [] });
  const typeColors = {
    'アイデア': { bg: 'var(--kogane-bg)', border: 'var(--kogane)' },
    'キャラクター': { bg: 'var(--fuji-bg)', border: 'var(--fuji)' },
    'シーン': { bg: 'var(--momo-bg)', border: 'var(--momo)' },
    'テーマ': { bg: 'var(--asagi-bg)', border: 'var(--asagi)' },
    '設定': { bg: 'var(--matcha-bg)', border: 'var(--matcha)' },
    'セリフ': { bg: 'var(--kon-bg)', border: 'var(--kon-lt)' },
  };
  const type = $('#mm-type')?.value || 'アイデア';
  const colors = typeColors[type] || { bg: 'var(--bg-subtle)', border: 'var(--border)' };
  mmData.nodes.push({
    id: genId(), text, detail: $('#mm-detail')?.value?.trim() || '',
    type, linkedTo: $('#mm-link')?.value?.trim() || '',
    color: colors.bg, borderColor: colors.border, createdAt: now(),
  });
  DB.set('mindmap_' + projId, mmData);
  closeModal();
  toast('ノードを追加しました', 'success');
  const el = document.getElementById('insp-tab-content');
  if (el) el.innerHTML = renderInspirationMindmap();
}

function deleteMindmapNode(projId, idx) {
  const mmData = DB.get('mindmap_' + projId, { center: '', nodes: [] });
  mmData.nodes.splice(idx, 1);
  DB.set('mindmap_' + projId, mmData);
  const el = document.getElementById('insp-tab-content');
  if (el) el.innerHTML = renderInspirationMindmap();
}

function editMindmapNode(projId, idx) {
  const mmData = DB.get('mindmap_' + projId, { center: '', nodes: [] });
  const node = mmData.nodes[idx];
  if (!node) return;
  openModal(
    '<i class="fas fa-pen"></i> ノードを編集',
    `<div class="form-group">
      <label class="form-label">テキスト</label>
      <input class="form-input" id="mm-text" value="${esc(node.text)}">
    </div>
    <div class="form-group">
      <label class="form-label">詳細メモ</label>
      <textarea class="form-textarea" id="mm-detail" rows="3">${esc(node.detail||'')}</textarea>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="updateMindmapNode('${projId}',${idx})">保存</button>`
  );
}

function updateMindmapNode(projId, idx) {
  const mmData = DB.get('mindmap_' + projId, { center: '', nodes: [] });
  if (!mmData.nodes[idx]) return;
  mmData.nodes[idx].text = $('#mm-text')?.value?.trim() || mmData.nodes[idx].text;
  mmData.nodes[idx].detail = $('#mm-detail')?.value?.trim() || '';
  DB.set('mindmap_' + projId, mmData);
  closeModal();
  const el = document.getElementById('insp-tab-content');
  if (el) el.innerHTML = renderInspirationMindmap();
}

function clearMindmap(projId) {
  if (!confirm('マインドマップをクリアしますか？')) return;
  DB.set('mindmap_' + projId, { center: '', nodes: [] });
  const el = document.getElementById('insp-tab-content');
  if (el) el.innerHTML = renderInspirationMindmap();
}

function importScratchToMindmap(projId, scratchId) {
  const scratches = DB.get('inspiration_scratches', []);
  const s = scratches.find(sc => sc.id === scratchId);
  if (!s) return;
  const mmData = DB.get('mindmap_' + projId, { center: '', nodes: [] });
  mmData.nodes.push({
    id: genId(), text: s.title || s.body?.slice(0,40) || '無題',
    detail: s.body || '', type: s.type || 'アイデア',
    linkedTo: '', color: 'var(--kogane-bg)', borderColor: 'var(--kogane)', createdAt: now(),
  });
  DB.set('mindmap_' + projId, mmData);
  toast('スクラッチからインポートしました', 'success');
  const el = document.getElementById('insp-tab-content');
  if (el) el.innerHTML = renderInspirationMindmap();
}

function renderInspirationCombo(theme, genre, mood) {
  return [
    { label:'テーマ', val: theme, color:'var(--momo)', bg:'var(--momo-bg)' },
    { label:'ジャンル', val: genre, color:'var(--kon-lt)', bg:'var(--kon-bg)' },
    { label:'ムード', val: mood, color:'var(--asagi)', bg:'var(--asagi-bg)' },
  ].map(item => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${item.bg};border-radius:var(--radius-sm);border-left:3px solid ${item.color}">
      <span style="font-size:10px;font-weight:700;color:${item.color};min-width:48px;letter-spacing:0.05em">${item.label}</span>
      <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${esc(item.val)}</span>
    </div>`).join('');
}

function refreshInspiration() {
  navigate('inspiration');
}

function generateInspirationCombo() {
  const rt = INSPIRATION_DB.themes[Math.floor(Math.random()*INSPIRATION_DB.themes.length)];
  const rg = INSPIRATION_DB.genres[Math.floor(Math.random()*INSPIRATION_DB.genres.length)];
  const rm = INSPIRATION_DB.moods[Math.floor(Math.random()*INSPIRATION_DB.moods.length)];
  const comboEl = $('#insp-combo');
  if (comboEl) comboEl.innerHTML = renderInspirationCombo(rt, rg, rm);

  // 履歴に保存
  const history = DB.get('inspiration_history', []);
  const combo = `テーマ: ${rt} / ジャンル: ${rg} / ムード: ${rm}`;
  history.unshift({ combo, date: new Date().toLocaleDateString('ja-JP') });
  DB.set('inspiration_history', history.slice(0,20));

  const histEl = $('#insp-history');
  if (histEl) {
    histEl.innerHTML = history.slice(0,10).map(h => `
      <div style="padding:10px 12px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:6px">
        <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">${h.date}</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.6">${esc(h.combo)}</div>
      </div>`).join('');
  }
  toast('新しい組み合わせを生成しました', 'success');
}

function selectPrompt(idx) {
  const p = INSPIRATION_DB.prompts[idx];
  const promptEl = $('#insp-prompt');
  if (promptEl) promptEl.textContent = `「${p}」`;
  window._currentPrompt = p;
}

function copyPrompt() {
  const promptEl = $('#insp-prompt');
  const text = promptEl?.textContent || '';
  navigator.clipboard?.writeText(text.replace(/^「|」$/g,'')).then(() => toast('コピーしました', 'success'));
}

function savePromptToIdeas() {
  const promptEl = $('#insp-prompt');
  const text = (promptEl?.textContent || '').replace(/^「|」$/g,'');
  if (!text) return;
  const projects = DB.getProjects();
  if (projects.length === 0) {
    toast('先に作品を作成してください', 'error');
    return;
  }
  const projOptions = projects.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('');
  openModal(
    `<i class="fas fa-lightbulb" style="color:var(--kogane)"></i> アイデアとして保存`,
    `<div class="form-group"><label class="form-label">保存する作品</label><select class="form-select" id="insp-save-proj">${projOptions}</select></div>
     <div style="padding:10px 12px;background:var(--bg-subtle);border-radius:var(--radius-sm);font-size:13px;color:var(--text-secondary);line-height:1.6;font-style:italic">${esc(text)}</div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="confirmSavePromptToIdeas('${esc(text).replace(/'/g,'\\\'').replace(/"/g,'\\"')}')">保存</button>`
  );
}

function confirmSavePromptToIdeas(text) {
  const projId = $('#insp-save-proj')?.value;
  if (!projId) return;
  const proj = DB.getProject(projId);
  if (!proj) return;
  if (!proj.ideas) proj.ideas = [];
  proj.ideas.unshift({ id: uid(), title: text.slice(0,30)+'…', body: text, type: 'メモ', priority: '中', createdAt: new Date().toISOString() });
  DB.saveProject(proj);
  closeModal();
  toast('アイデアに保存しました！', 'success');
}

function bindInspirationPage() {}

// ── Inspiration: スクラッチパッド操作 ────────────────────────────
function switchInspirationTab(tab) {
  State.currentTab['inspiration'] = tab;
  navigate('inspiration');
}

function addScratch(pinned = false) {
  const title = $('#sc-title')?.value?.trim() || '';
  const body  = $('#sc-body')?.value?.trim()  || '';
  const type  = $('#sc-type')?.value           || 'その他';
  const tags  = ($('#sc-tags-input')?.value || '').split(',').map(t=>t.trim()).filter(Boolean);
  if (!body) { toast('本文を入力してください', 'error'); return; }
  const scratches = DB.get('inspiration_scratches', []);
  scratches.unshift({ id: uid(), title, body, type, tags, pinned, createdAt: new Date().toISOString() });
  DB.set('inspiration_scratches', scratches);
  toast(pinned ? 'ピン留めして追加しました' : '追加しました', 'success');
  navigate('inspiration');
}

function togglePinScratch(id) {
  const scratches = DB.get('inspiration_scratches', []);
  const idx = scratches.findIndex(s => s.id === id);
  if (idx < 0) return;
  scratches[idx].pinned = !scratches[idx].pinned;
  DB.set('inspiration_scratches', scratches);
  navigate('inspiration');
}

function openEditScratch(id) {
  const scratches = DB.get('inspiration_scratches', []);
  const s = scratches.find(x => x.id === id);
  if (!s) return;
  openModal(
    `<i class="fas fa-pen" style="color:var(--fuji)"></i> メモを編集`,
    `<div class="form-group">
       <label class="form-label">タイトル</label>
       <input class="form-input" id="es-title" value="${esc(s.title||'')}" placeholder="タイトル（任意）">
     </div>
     <div class="grid-2" style="gap:8px">
       <div class="form-group">
         <label class="form-label">タイプ</label>
         <select class="form-select" id="es-type">
           ${['着想','シーン','セリフ','テーマ','キャラ','設定','その他'].map(t=>`<option ${t===s.type?'selected':''}>${t}</option>`).join('')}
         </select>
       </div>
       <div class="form-group">
         <label class="form-label">タグ（カンマ区切り）</label>
         <input class="form-input" id="es-tags" value="${esc((s.tags||[]).join(', '))}">
       </div>
     </div>
     <div class="form-group">
       <label class="form-label">本文</label>
       <textarea class="form-textarea" id="es-body" rows="5">${esc(s.body||'')}</textarea>
     </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveEditScratch('${id}')"><i class="fas fa-floppy-disk"></i> 保存</button>`
  );
}

function saveEditScratch(id) {
  const scratches = DB.get('inspiration_scratches', []);
  const idx = scratches.findIndex(s => s.id === id);
  if (idx < 0) return;
  scratches[idx].title = $('#es-title')?.value?.trim() || '';
  scratches[idx].body  = $('#es-body')?.value?.trim()  || '';
  scratches[idx].type  = $('#es-type')?.value           || 'その他';
  scratches[idx].tags  = ($('#es-tags')?.value||'').split(',').map(t=>t.trim()).filter(Boolean);
  DB.set('inspiration_scratches', scratches);
  closeModal();
  toast('保存しました', 'success');
  navigate('inspiration');
}

function deleteScratch(id) {
  let scratches = DB.get('inspiration_scratches', []);
  scratches = scratches.filter(s => s.id !== id);
  DB.set('inspiration_scratches', scratches);
  toast('削除しました', 'info');
  navigate('inspiration');
}

function filterScratchByTag(tag) {
  State.currentTab['insp-tag'] = tag;
  navigate('inspiration');
}

function setScratchSearch(q) {
  State.currentTab['insp-search'] = q;
  navigate('inspiration');
}

function setScratchFilter(key, val) {
  if (key === 'type') State.currentTab['insp-type'] = val;
  else if (key === 'period') State.currentTab['insp-period'] = val;
  else if (key === 'sort') State.currentTab['insp-sort'] = val;
  navigate('inspiration');
}

function scrollToScratch(id) {
  const el = document.getElementById('sc-' + id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── 展開モーダル ─────────────────────────────────────────────────
function developScratch(id) {
  const scratches = DB.get('inspiration_scratches', []);
  const s = scratches.find(x => x.id === id);
  if (!s) return;
  const body = s.body || '';
  // 簡易展開パターン
  const patterns = [
    `【シーンに落とす】\n${body}\n↓\n情景: \nキャラの行動: \nセリフ（一言）: `,
    `【テーマを掘り下げる】\n「${body}」\n↓\nなぜこれが重要か: \n主人公との関係: \n物語への影響: `,
    `【対立軸を作る】\n${body}\n↓\nAの立場: \nBの立場: \n衝突する瞬間: `,
    `【5W1Hで展開】\n${body}\n↓\nWho: \nWhat: \nWhen: \nWhere: \nWhy: \nHow: `,
  ];
  openModal(
    `<i class="fas fa-wand-magic-sparkles" style="color:var(--fuji)"></i> アイデアを展開する`,
    `<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;padding:10px;background:var(--bg-subtle);border-radius:var(--radius-sm);font-style:italic">元メモ: ${esc(body.slice(0,80))}${body.length>80?'…':''}</div>
     <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">展開パターンを選択</div>
     <div style="display:flex;flex-direction:column;gap:8px">
       ${patterns.map((p,i) => `
         <div class="tool-result-card" style="cursor:pointer" onclick="applyDevelopPattern(${i},'${id}')">
           <div style="font-size:11.5px;color:var(--text-muted);white-space:pre-line;line-height:1.8">${esc(p)}</div>
         </div>`).join('')}
     </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">閉じる</button>`,
    { size: 'modal-md' }
  );
}

function applyDevelopPattern(patIdx, scratchId) {
  const scratches = DB.get('inspiration_scratches', []);
  const s = scratches.find(x => x.id === scratchId);
  if (!s) return;
  const body = s.body || '';
  const patterns = [
    `【シーンに落とす】\n${body}\n↓\n情景: \nキャラの行動: \nセリフ（一言）: `,
    `【テーマを掘り下げる】\n「${body}」\n↓\nなぜこれが重要か: \n主人公との関係: \n物語への影響: `,
    `【対立軸を作る】\n${body}\n↓\nAの立場: \nBの立場: \n衝突する瞬間: `,
    `【5W1Hで展開】\n${body}\n↓\nWho: \nWhat: \nWhen: \nWhere: \nWhy: \nHow: `,
  ];
  const newBody = patterns[patIdx];
  scratches.unshift({
    id: uid(), title: `[展開] ${(s.title||s.body?.slice(0,20)||'メモ')}`,
    body: newBody, type: s.type, tags: s.tags, pinned: false,
    createdAt: new Date().toISOString()
  });
  DB.set('inspiration_scratches', scratches);
  closeModal();
  toast('展開メモを追加しました', 'success');
  navigate('inspiration');
}

function sendScratchToProject(id) {
  const scratches = DB.get('inspiration_scratches', []);
  const s = scratches.find(x => x.id === id);
  if (!s) return;
  const projects = DB.getProjects();
  if (projects.length === 0) { toast('先に作品を作成してください', 'error'); return; }
  const opts = projects.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('');
  openModal(
    `<i class="fas fa-share" style="color:var(--matcha)"></i> 作品へ送る`,
    `<div class="form-group"><label class="form-label">送り先の作品</label><select class="form-select" id="str-proj">${opts}</select></div>
     <div class="form-group">
       <label class="form-label">送る先</label>
       <select class="form-select" id="str-dest">
         <option value="ideas">アイデアリスト</option>
         <option value="research">リサーチノート</option>
       </select>
     </div>
     <div style="padding:10px;background:var(--bg-subtle);border-radius:var(--radius-sm);font-size:12.5px;color:var(--text-secondary);white-space:pre-wrap;line-height:1.7;font-style:italic">${esc((s.title?s.title+'\n':'')+s.body)}</div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="confirmSendScratch('${id}')"><i class="fas fa-share"></i> 送る</button>`
  );
}

function confirmSendScratch(scratchId) {
  const scratches = DB.get('inspiration_scratches', []);
  const s = scratches.find(x => x.id === scratchId);
  if (!s) return;
  const projId = $('#str-proj')?.value;
  const dest   = $('#str-dest')?.value || 'ideas';
  const proj = DB.getProject(projId);
  if (!proj) return;
  if (dest === 'ideas') {
    if (!proj.ideas) proj.ideas = [];
    proj.ideas.unshift({ id: uid(), title: s.title || s.body?.slice(0,30) || 'スクラッチメモ',
      body: s.body, type: 'メモ', priority: '中', createdAt: new Date().toISOString() });
  } else {
    if (!proj.researchNotes) proj.researchNotes = [];
    proj.researchNotes.unshift({ id: uid(), title: s.title || 'スクラッチメモ',
      body: s.body, createdAt: new Date().toISOString() });
  }
  DB.saveProject(proj);
  closeModal();
  toast('作品に送りました！', 'success');
}

// ── ブレインストーミング ─────────────────────────────────────────
window._bsState = { interval: null, remaining: 300, items: [] };

function startBrainStorm() {
  const bsArea = $('#bs-area');
  if (bsArea) bsArea.style.display = 'block';
  window._bsState.remaining = 300;
  window._bsState.items = [];
  window._bsState.interval = setInterval(() => {
    window._bsState.remaining--;
    const t = window._bsState.remaining;
    const timerEl = $('#bs-timer');
    if (timerEl) timerEl.textContent = `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;
    if (window._bsState.remaining <= 0) stopBrainStorm();
  }, 1000);
  const inp = $('#bs-input');
  if (inp) inp.focus();
}

function handleBsInput(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const val = e.target.value.trim();
    if (!val) return;
    window._bsState.items.push(val);
    e.target.value = '';
    const chips = $('#bs-chips');
    if (chips) {
      const chip = document.createElement('div');
      chip.style.cssText = 'padding:4px 10px;background:var(--fuji-bg);border:1px solid var(--fuji-border);border-radius:var(--radius-full);font-size:12px;color:var(--fuji);font-weight:600;animation:fadeIn 0.2s';
      chip.textContent = val;
      chips.appendChild(chip);
      chips.scrollTop = chips.scrollHeight;
    }
    const cnt = $('#bs-count');
    if (cnt) cnt.textContent = `${window._bsState.items.length}個`;
  }
}

function stopBrainStorm() {
  if (window._bsState.interval) clearInterval(window._bsState.interval);
  const items = window._bsState.items;
  if (items.length === 0) { toast('アイデアが0個でした', 'info'); return; }
  const scratches = DB.get('inspiration_scratches', []);
  scratches.unshift({
    id: uid(),
    title: `ブレインストーム (${items.length}個)`,
    body: items.join('\n'),
    type: '着想', tags: ['BS'], pinned: false,
    createdAt: new Date().toISOString()
  });
  DB.set('inspiration_scratches', scratches);
  toast(`${items.length}個のアイデアをメモに追加しました！`, 'success');
  navigate('inspiration');
}

// ── ランダム生成タブの関数 ───────────────────────────────────────
function setActivePrompt(idx) {
  const p = INSPIRATION_DB.prompts[idx];
  const promptEl = $('#insp-prompt');
  if (promptEl) promptEl.innerHTML = `「${esc(p)}」`;
  window._currentPrompt = p;
  toast('プロンプトを選択しました', 'success');
}

function savePromptToScratch() {
  const promptEl = $('#insp-prompt');
  const text = (promptEl?.textContent || '').replace(/^「|」$/g, '');
  if (!text) return;
  const scratches = DB.get('inspiration_scratches', []);
  scratches.unshift({ id: uid(), title: 'プロンプト', body: text,
    type: '着想', tags: ['prompt'], pinned: false, createdAt: new Date().toISOString() });
  DB.set('inspiration_scratches', scratches);
  toast('スクラッチパッドに追加しました', 'success');
}

function saveComboToScratch() {
  const comboEl = $('#insp-combo');
  const text = comboEl?.innerText || '';
  if (!text) return;
  const scratches = DB.get('inspiration_scratches', []);
  scratches.unshift({ id: uid(), title: 'ランダム組み合わせ', body: text.replace(/\s+/g,' ').trim(),
    type: '着想', tags: ['combo'], pinned: false, createdAt: new Date().toISOString() });
  DB.set('inspiration_scratches', scratches);
  // ブックマークにも保存
  const bookmarks = DB.get('insp_bookmarks', []);
  bookmarks.unshift({ content: text.replace(/\s+/g,' ').trim(), savedAt: new Date().toLocaleDateString('ja-JP') });
  DB.set('insp_bookmarks', bookmarks.slice(0,30));
  toast('スクラッチ＆ブックマークに保存しました', 'success');
}

function clearBookmarks() {
  DB.set('insp_bookmarks', []);
  navigate('inspiration');
  toast('ブックマークをクリアしました', 'info');
}

function clearInspirationHistory() {
  DB.set('inspiration_history', []);
  navigate('inspiration');
  toast('履歴をクリアしました', 'info');
}

function deleteBookmark(idx) {
  const bm = DB.get('insp_bookmarks', []);
  bm.splice(idx, 1);
  DB.set('insp_bookmarks', bm);
  navigate('inspiration');
}

function sendBookmarkToScratch(idx) {
  const bm = DB.get('insp_bookmarks', []);
  const b = bm[idx];
  if (!b) return;
  const scratches = DB.get('inspiration_scratches', []);
  scratches.unshift({ id: uid(), title: 'ブックマークから', body: b.content,
    type: '着想', tags: ['bookmark'], pinned: false, createdAt: new Date().toISOString() });
  DB.set('inspiration_scratches', scratches);
  toast('スクラッチに追加しました', 'success');
  State.currentTab['inspiration'] = 'scratch';
  navigate('inspiration');
}

function reloadCombo(idx) {
  const h = DB.get('inspiration_history', []);
  const item = h[idx];
  if (!item) return;
  const comboEl = $('#insp-combo');
  if (comboEl) {
    const parts = item.combo.split(' / ');
    const theme = (parts[0]||'').replace('テーマ: ','');
    const genre = (parts[1]||'').replace('ジャンル: ','');
    const mood  = (parts[2]||'').replace('ムード: ','');
    comboEl.innerHTML = renderInspirationCombo(theme, genre, mood);
  }
  toast('組み合わせを再利用しました', 'success');
}

// ── 構造化ビルダー関数 ───────────────────────────────────────────
function saveBuilderDraft() {
  const draft = {
    premise:     $('#bld-premise')?.value     || '',
    protagonist: $('#bld-protagonist')?.value || '',
    antagonist:  $('#bld-antagonist')?.value  || '',
    conflict:    $('#bld-conflict')?.value     || '',
    theme:       $('#bld-theme')?.value        || '',
    tone:        $('#bld-tone')?.value         || '',
    hook:        $('#bld-hook')?.value         || '',
    logline:     DB.get('insp_builder_draft', {}).logline || '',
  };
  DB.set('insp_builder_draft', draft);
  toast('ビルダーを保存しました', 'success');
  // チェックリスト更新
  navigate('inspiration');
}

function synthesizeLogline() {
  const premise     = $('#bld-premise')?.value?.trim()     || '';
  const protagonist = $('#bld-protagonist')?.value?.trim() || '';
  const antagonist  = $('#bld-antagonist')?.value?.trim()  || '';
  const conflict    = $('#bld-conflict')?.value?.trim()     || '';
  const theme       = $('#bld-theme')?.value?.trim()        || '';
  if (!premise && !protagonist) { toast('プレミスか主人公を入力してください', 'error'); return; }

  const patterns = [
    protagonist && conflict ? `${protagonist}が、${conflict}という状況の中で、${premise || 'すべてを変える選択をする'}。` : null,
    premise ? `${premise}${theme ? ` ——${theme}をめぐる、普遍的な物語。` : ''}` : null,
    protagonist && antagonist ? `${protagonist}と${antagonist}の対立を通じて、${conflict || theme || 'その真実'} が明らかになる。` : null,
    `${premise || protagonist}。${theme ? `テーマ：${theme}。` : ''}${conflict ? `中心的な葛藤：${conflict}` : ''}`,
  ].filter(Boolean);

  const logline = patterns[0] || premise;
  const outEl = $('#bld-logline-out');
  if (outEl) outEl.innerHTML = `「${esc(logline)}」`;

  // ドラフトに保存
  const draft = DB.get('insp_builder_draft', {});
  draft.logline = logline;
  DB.set('insp_builder_draft', draft);
  toast('ログラインを合成しました', 'success');
}

function copyBuilderLogline() {
  const el = $('#bld-logline-out');
  const text = (el?.textContent || '').replace(/^「|」$/g, '');
  if (!text || text.includes('左のフォームを記入')) { toast('先に合成してください', 'error'); return; }
  navigator.clipboard?.writeText(text).then(() => toast('コピーしました', 'success'));
}

function sendLoglineToProject() {
  const el = $('#bld-logline-out');
  const text = (el?.textContent || '').replace(/^「|」$/g, '');
  if (!text || text.includes('左のフォームを記入')) { toast('先に合成してください', 'error'); return; }
  const projects = DB.getProjects();
  if (projects.length === 0) { toast('先に作品を作成してください', 'error'); return; }
  const opts = projects.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('');
  openModal(
    `<i class="fas fa-share" style="color:var(--accent)"></i> ログラインを作品に設定`,
    `<div class="form-group"><label class="form-label">設定する作品</label><select class="form-select" id="ll-proj">${opts}</select></div>
     <div style="padding:10px;background:var(--bg-subtle);border-radius:var(--radius-sm);font-size:13px;color:var(--text-secondary);line-height:1.7;font-style:italic">${esc(text)}</div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="confirmSendLoglineToProject('${esc(text).replace(/'/g,"\\'")}')">設定する</button>`
  );
}

function confirmSendLoglineToProject(text) {
  const projId = $('#ll-proj')?.value;
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj.logline = text;
  DB.saveProject(proj);
  closeModal();
  toast('ログラインを設定しました！', 'success');
}

// ================================================================
//  TASK & SCHEDULE MANAGER — Phase 4 強化版
// ================================================================

// ── Task DB helpers ──────────────────────────────────────────
const TASK_DB = {
  getTasks()       { return DB.get('tasks', []); },
  saveTasks(ts)    { DB.set('tasks', ts); },
  getTask(id)      { return this.getTasks().find(t => t.id === id) || null; },
  saveTask(task)   {
    const ts = this.getTasks();
    const idx = ts.findIndex(t => t.id === task.id);
    if (idx >= 0) ts[idx] = task; else ts.unshift(task);
    this.saveTasks(ts);
  },
  deleteTask(id)   { this.saveTasks(this.getTasks().filter(t => t.id !== id)); },
};

// ── Project Sections (task grouping within a project) ────────
const TASK_SECTIONS_DB = {
  getSections() { return DB.get('task_sections', [
    { id:'sect-default', name:'一般タスク', color:'var(--text-muted)', icon:'fa-list' },
    { id:'sect-writing', name:'執筆作業', color:'var(--accent)', icon:'fa-pen-nib' },
    { id:'sect-research', name:'リサーチ', color:'var(--fuji)', icon:'fa-search' },
    { id:'sect-polish', name:'推敲・仕上げ', color:'var(--momo)', icon:'fa-star' },
  ]); },
  saveSections(ss) { DB.set('task_sections', ss); },
};

function newTask(data = {}) {
  return {
    id: uid(),
    title: data.title || '',
    body: data.body || '',
    done: false,
    priority: data.priority || 'medium',
    category: data.category || 'writing',
    dueDate: data.dueDate || '',
    dueTime: data.dueTime || '',
    projectId: data.projectId || null,
    sectionId: data.sectionId || '',
    repeat: data.repeat || 'none', // none/daily/weekly/monthly
    tags: data.tags || [],
    subtasks: data.subtasks || [],
    estimatedMin: data.estimatedMin || 0,  // 見積もり時間（分）
    actualMin: data.actualMin || 0,         // 実際にかかった時間
    completedAt: null,
    createdAt: now(),
    updatedAt: now(),
  };
}

const TASK_CATEGORIES = [
  { id:'writing',   label:'執筆',     icon:'fa-pen-nib',    color:'var(--accent)' },
  { id:'research',  label:'リサーチ', icon:'fa-search',     color:'var(--fuji)' },
  { id:'revision',  label:'推敲',     icon:'fa-rotate',     color:'var(--momo)' },
  { id:'planning',  label:'計画',     icon:'fa-map',        color:'var(--matcha)' },
  { id:'meeting',   label:'打合せ',   icon:'fa-comments',   color:'var(--asagi)' },
  { id:'reading',   label:'読書',     icon:'fa-book',       color:'var(--kon)' },
  { id:'other',     label:'その他',   icon:'fa-ellipsis',   color:'var(--text-muted)' },
];

const TASK_PRIORITIES = {
  low:    { label:'低',   icon:'fa-arrow-down',   color:'var(--fuji)',   bg:'var(--fuji-bg)' },
  medium: { label:'中',   icon:'fa-minus',        color:'var(--kogane)', bg:'var(--kogane-bg)' },
  high:   { label:'高',   icon:'fa-arrow-up',     color:'var(--accent)', bg:'var(--accent-bg)' },
  urgent: { label:'緊急', icon:'fa-fire',         color:'#d01050',       bg:'#fde8ef' },
};

// ── Tasks Page State ─────────────────────────────────────────
const TasksState = {
  view: 'list',   // list | calendar | kanban | weekly
  filter: { category: '', priority: '', search: '', dueFilter: 'all', projectId: '', sectionId: '' },
  calendarMonth: null,  // null = current month
  weekOffset: 0,         // 0 = this week
  expandedTaskId: null,  // inline expansion
};

// ── Render Tasks Page ────────────────────────────────────────
function renderTasksPage() {
  const tasks = TASK_DB.getTasks();
  const today = new Date().toISOString().slice(0,10);
  const view = TasksState.view;

  const todayTasks = tasks.filter(t => !t.done && t.dueDate === today);
  const overdueTasks = tasks.filter(t => !t.done && t.dueDate && t.dueDate < today);
  const doneTasks = tasks.filter(t => t.done);
  const totalDone = doneTasks.length;
  const totalAll = tasks.length;
  const streakDays = calcTaskStreak(tasks);
  const urgentTasks = tasks.filter(t => !t.done && t.priority === 'urgent');

  // ── Quick Stats ──
  const weekDates = getWeekDates();
  const weekDone = tasks.filter(t => t.done && weekDates.includes(t.completedAt?.slice(0,10))).length;
  const estimatedTotal = tasks.filter(t=>!t.done).reduce((a,t)=>a+(t.estimatedMin||0),0);

  // フィルター適用
  const f = TasksState.filter;
  let filteredTasks = tasks.filter(t => {
    if (f.search && !t.title.toLowerCase().includes(f.search.toLowerCase()) && !(t.body||'').toLowerCase().includes(f.search.toLowerCase())) return false;
    if (f.category && t.category !== f.category) return false;
    if (f.priority && t.priority !== f.priority) return false;
    if (f.projectId && t.projectId !== f.projectId) return false;
    if (f.sectionId && t.sectionId !== f.sectionId) return false;
    if (f.dueFilter === 'today' && t.dueDate !== today) return false;
    if (f.dueFilter === 'overdue' && (t.dueDate >= today || !t.dueDate)) return false;
    if (f.dueFilter === 'upcoming' && (!t.dueDate || t.dueDate <= today)) return false;
    if (f.dueFilter === 'nodone' && t.done) return false;
    if (f.dueFilter === 'urgent' && (t.priority !== 'urgent' || t.done)) return false;
    return true;
  });

  const projects = DB.getProjects();

  const viewTabs = `
  <div class="tasks-view-tabs">
    <button class="tasks-view-tab ${view==='list'?'active':''}" onclick="setTasksView('list')"><i class="fas fa-list"></i> リスト</button>
    <button class="tasks-view-tab ${view==='weekly'?'active':''}" onclick="setTasksView('weekly')"><i class="fas fa-calendar-week"></i> 週間</button>
    <button class="tasks-view-tab ${view==='calendar'?'active':''}" onclick="setTasksView('calendar')"><i class="fas fa-calendar"></i> 月間</button>
    <button class="tasks-view-tab ${view==='kanban'?'active':''}" onclick="setTasksView('kanban')"><i class="fas fa-columns"></i> かんばん</button>
  </div>`;

  // サマリーバー
  const summaryBar = `
  <div class="tasks-summary-bar">
    <div class="tasks-stat-card" onclick="setTaskFilter('dueFilter','today');setTasksView('list')" style="cursor:pointer">
      <div class="tasks-stat-icon" style="background:var(--accent-bg)"><i class="fas fa-sun" style="color:var(--accent)"></i></div>
      <div>
        <div class="tasks-stat-num" style="color:var(--accent)">${todayTasks.length}</div>
        <div class="tasks-stat-lbl">今日の予定</div>
      </div>
    </div>
    <div class="tasks-stat-card" onclick="setTaskFilter('dueFilter','overdue');setTasksView('list')" style="cursor:pointer">
      <div class="tasks-stat-icon" style="background:var(--momo-bg)"><i class="fas fa-exclamation-circle" style="color:var(--momo)"></i></div>
      <div>
        <div class="tasks-stat-num" style="color:var(--momo)">${overdueTasks.length}</div>
        <div class="tasks-stat-lbl">期限切れ</div>
      </div>
    </div>
    <div class="tasks-stat-card" onclick="setTaskFilter('priority','urgent');setTasksView('list')" style="cursor:pointer">
      <div class="tasks-stat-icon" style="background:#fde8ef"><i class="fas fa-fire" style="color:#d01050"></i></div>
      <div>
        <div class="tasks-stat-num" style="color:#d01050">${urgentTasks.length}</div>
        <div class="tasks-stat-lbl">緊急</div>
      </div>
    </div>
    <div class="tasks-stat-card">
      <div class="tasks-stat-icon" style="background:var(--matcha-bg)"><i class="fas fa-check-double" style="color:var(--matcha)"></i></div>
      <div>
        <div class="tasks-stat-num" style="color:var(--matcha)">${totalDone}</div>
        <div class="tasks-stat-lbl">完了済み</div>
      </div>
    </div>
    <div class="tasks-stat-card">
      <div class="tasks-stat-icon" style="background:var(--fuji-bg)"><i class="fas fa-fire-flame-curved" style="color:var(--fuji)"></i></div>
      <div>
        <div class="tasks-stat-num" style="color:var(--fuji)">${streakDays}</div>
        <div class="tasks-stat-lbl">連続達成日</div>
      </div>
    </div>
    <div class="tasks-stat-card tasks-stat-progress">
      <div style="font-size:10.5px;color:var(--text-muted);margin-bottom:5px;display:flex;justify-content:space-between">
        <span>今週の達成</span><span style="font-weight:700;color:var(--matcha)">${weekDone} タスク</span>
      </div>
      <div style="font-size:10.5px;color:var(--text-muted);display:flex;justify-content:space-between;margin-bottom:5px">
        <span>達成率</span><span style="font-weight:700">${totalAll>0?Math.round(totalDone/totalAll*100):0}%</span>
      </div>
      <div style="height:6px;background:var(--bg-hover);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${totalAll>0?Math.round(totalDone/totalAll*100):0}%;background:linear-gradient(90deg,var(--matcha),var(--matcha-lt));border-radius:3px;transition:width .5s"></div>
      </div>
    </div>
  </div>`;

  let mainContent = '';
  if (view === 'calendar') {
    mainContent = renderTasksCalendar(tasks);
  } else if (view === 'weekly') {
    mainContent = renderTasksWeekly(tasks);
  } else if (view === 'kanban') {
    mainContent = renderTasksKanban(tasks);
  } else {
    // ── リストビュー ──
    const filterBar = `
    <div class="tasks-filter-bar">
      <div class="tasks-search-wrap">
        <i class="fas fa-search tasks-search-icon"></i>
        <input class="form-input tasks-search-input" id="tasks-search" placeholder="タスクを検索…" value="${esc(f.search)}" oninput="setTaskFilter('search',this.value)">
        ${f.search ? `<button class="tasks-search-clear" onclick="setTaskFilter('search','')">✕</button>` : ''}
      </div>
      <div class="tasks-filter-chips">
        <select class="form-select tasks-filter-select" onchange="setTaskFilter('dueFilter',this.value)">
          <option value="all" ${f.dueFilter==='all'?'selected':''}>📅 すべて</option>
          <option value="today" ${f.dueFilter==='today'?'selected':''}>☀️ 今日</option>
          <option value="overdue" ${f.dueFilter==='overdue'?'selected':''}>🔴 期限切れ</option>
          <option value="upcoming" ${f.dueFilter==='upcoming'?'selected':''}>📆 予定あり</option>
          <option value="nodone" ${f.dueFilter==='nodone'?'selected':''}>⬜ 未完了のみ</option>
          <option value="urgent" ${f.dueFilter==='urgent'?'selected':''}>🔥 緊急</option>
        </select>
        <select class="form-select tasks-filter-select" onchange="setTaskFilter('category',this.value)">
          <option value="">全カテゴリ</option>
          ${TASK_CATEGORIES.map(c=>`<option value="${c.id}" ${f.category===c.id?'selected':''}>${c.label}</option>`).join('')}
        </select>
        <select class="form-select tasks-filter-select" onchange="setTaskFilter('priority',this.value)">
          <option value="">全優先度</option>
          ${Object.entries(TASK_PRIORITIES).map(([k,v])=>`<option value="${k}" ${f.priority===k?'selected':''}>${v.label}</option>`).join('')}
        </select>
        <select class="form-select tasks-filter-select" onchange="setTaskFilter('projectId',this.value)">
          <option value="">全作品</option>
          ${projects.map(p=>`<option value="${p.id}" ${f.projectId===p.id?'selected':''}>${esc(p.title.slice(0,12))}</option>`).join('')}
        </select>
        ${(f.search||f.category||f.priority||f.projectId||f.dueFilter!=='all') ? `<button class="btn btn-ghost btn-sm" onclick="clearTaskFilters()" style="white-space:nowrap;font-size:11px"><i class="fas fa-rotate-left"></i> リセット</button>` : ''}
      </div>
    </div>`;

    // グループ分け
    const groups = [
      { key:'urgent',   label:'🔥 緊急',     color:'#d01050', tasks: filteredTasks.filter(t=>!t.done && t.priority==='urgent') },
      { key:'overdue',  label:'🔴 期限切れ', color:'var(--momo)', tasks: filteredTasks.filter(t=>!t.done && t.dueDate && t.dueDate<today) },
      { key:'today',    label:'📅 今日',     color:'var(--accent)', tasks: filteredTasks.filter(t=>!t.done && t.dueDate===today && t.priority!=='urgent') },
      { key:'upcoming', label:'📆 今後の予定',color:'var(--matcha)', tasks: filteredTasks.filter(t=>!t.done && t.dueDate && t.dueDate>today && t.priority!=='urgent') },
      { key:'nodate',   label:'📋 未分類',   color:'var(--text-muted)', tasks: filteredTasks.filter(t=>!t.done && !t.dueDate && t.priority!=='urgent') },
      { key:'done',     label:'✅ 完了済み',  color:'var(--text-light)', tasks: filteredTasks.filter(t=>t.done), collapsed: true },
    ];

    const groupsHtml = groups.map(g => {
      if (g.tasks.length === 0 && g.key !== 'nodate') return '';
      const isCollapsed = DB.get(`task_group_${g.key}_collapsed`, g.collapsed || false);
      return `
      <div class="task-group" id="tg-${g.key}">
        <div class="task-group-header" onclick="toggleTaskGroup('${g.key}')" style="border-left:3px solid ${g.color}">
          <span class="task-group-label">${g.label} <span class="task-group-count">${g.tasks.length}</span></span>
          <div style="display:flex;align-items:center;gap:8px">
            ${g.key !== 'done' && g.key !== 'nodate' && !isCollapsed ? `
              <span style="font-size:10px;color:var(--text-light)">${g.tasks.filter(t=>t.estimatedMin>0).reduce((a,t)=>a+t.estimatedMin,0)}分</span>
            ` : ''}
            <i class="fas fa-chevron-${isCollapsed?'right':'down'}" style="font-size:10px;color:var(--text-muted)"></i>
          </div>
        </div>
        <div class="task-group-body" style="display:${isCollapsed?'none':''}">
          ${g.tasks.length === 0 ? `<div class="task-empty-group">タスクがありません — <button class="btn btn-ghost btn-sm" style="padding:0;font-size:11px" onclick="openNewTaskModal()">追加</button></div>` :
            g.tasks.map(t => renderTaskItem(t)).join('')}
        </div>
      </div>`;
    }).join('');

    const quickAddBar = `
    <div class="tasks-quick-add" id="tasks-quick-add">
      <i class="fas fa-plus" style="color:var(--text-muted);font-size:12px;flex-shrink:0"></i>
      <input class="tasks-quick-add-input" id="tqa-input" placeholder="タスクをすばやく追加… (Enterで確定)" onkeydown="if(event.key==='Enter')quickAddTask()">
      <button class="btn btn-primary btn-sm" onclick="quickAddTask()" style="flex-shrink:0"><i class="fas fa-plus"></i></button>
    </div>`;

    mainContent = filterBar + groupsHtml + quickAddBar;
  }

  // 期限が迫るタスク（今後7日間）
  const next7Days = Array.from({length:7},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate()+i);
    return d.toISOString().slice(0,10);
  });
  const upcomingDeadlines = TASK_DB.getTasks().filter(t=>!t.done && t.dueDate && next7Days.includes(t.dueDate));
  const deadlinePanel = upcomingDeadlines.length > 0 && (view==='list') ? `
  <div class="card" style="padding:0;overflow:hidden;border-top:3px solid var(--kogane);margin-bottom:16px">
    <div style="padding:10px 14px;background:var(--kogane-bg);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
      <div style="font-size:12.5px;font-weight:700;color:var(--kogane)"><i class="fas fa-clock" style="margin-right:6px"></i>今後7日間の締切 (${upcomingDeadlines.length})</div>
    </div>
    <div style="padding:10px 14px;display:flex;flex-direction:column;gap:6px">
      ${upcomingDeadlines.sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,5).map(t=>{
        const daysLeft = Math.ceil((new Date(t.dueDate)-new Date())/86400000);
        const urgColor = daysLeft <= 1 ? 'var(--accent)' : daysLeft <= 3 ? 'var(--kogane)' : 'var(--matcha)';
        const pri = TASK_PRIORITIES[t.priority]||TASK_PRIORITIES.medium;
        return `<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg-subtle);border-radius:var(--radius-sm);border-left:3px solid ${urgColor}" onclick="expandTask('${t.id}');setTasksView('list')" style="cursor:pointer">
          <div style="flex:1;overflow:hidden">
            <div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.title)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <span style="font-size:10px;font-weight:700;color:${urgColor};background:${urgColor}22;padding:2px 6px;border-radius:10px">${daysLeft===0?'今日':daysLeft===1?'明日':daysLeft+'日後'}</span>
            <span style="font-size:10px;color:${pri.color}">${pri.label}</span>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>` : '';

  return `
  <div class="tasks-page-wrap">
    <div class="tasks-page-header">
      <div>
        <h1 class="tasks-page-title">
          <i class="fas fa-calendar-check" style="color:var(--matcha)"></i> タスク・スケジュール
        </h1>
        <p class="tasks-page-sub">執筆タスク・スケジュール・習慣を一元管理</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="openScheduleEventModal()"><i class="fas fa-calendar-plus" style="color:var(--matcha)"></i> イベント追加</button>
        <button class="btn btn-secondary btn-sm" onclick="openHabitModal()"><i class="fas fa-fire" style="color:var(--accent)"></i> 習慣</button>
        <button class="btn btn-primary" onclick="openNewTaskModal()"><i class="fas fa-plus"></i> タスク追加</button>
      </div>
    </div>
    ${summaryBar}
    ${(todayTasks.length > 0 || overdueTasks.length > 0 || urgentTasks.length > 0) && view === 'list' ? `
    <div class="tasks-focus-card">
      <div class="tasks-focus-header">
        <i class="fas fa-crosshairs" style="color:var(--accent)"></i>
        <span>今日のフォーカス</span>
        <span style="font-size:11px;color:var(--text-muted);margin-left:auto">${(todayTasks.length+urgentTasks.filter(t=>t.dueDate!==today).length)} 件優先</span>
      </div>
      <div class="tasks-focus-list">
        ${[...urgentTasks.filter(t=>t.dueDate!==today).slice(0,2), ...todayTasks.slice(0,4)].map(t => {
          const pr = TASK_PRIORITIES[t.priority] || TASK_PRIORITIES.medium;
          return `<div class="tasks-focus-item" style="border-left:3px solid ${pr.color}">
            <div class="tasks-focus-check" onclick="toggleTaskDone('${t.id}')"><i class="fas fa-circle" style="color:${pr.color};font-size:12px"></i></div>
            <div class="tasks-focus-text">${esc(t.title.slice(0,35))}${t.title.length>35?'…':''}</div>
            ${t.priority==='urgent'?`<span style="font-size:9px;background:#fde8ef;color:#d01050;border-radius:3px;padding:1px 5px;font-weight:700">緊急</span>`:''}
            ${t.estimatedMin>0?`<span style="font-size:9px;color:var(--text-muted)">${t.estimatedMin}分</span>`:''}
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}
    <div class="tasks-main-card">
      ${viewTabs}
      <div class="tasks-view-content">
        ${deadlinePanel}
        ${mainContent}
      </div>
    </div>
  </div>`;
}

// ── Task Item ─────────────────────────────────────────────────
function renderTaskItem(task) {
  const cat = TASK_CATEGORIES.find(c=>c.id===task.category) || TASK_CATEGORIES[0];
  const pri = TASK_PRIORITIES[task.priority] || TASK_PRIORITIES.medium;
  const subtaskDone = (task.subtasks||[]).filter(s=>s.done).length;
  const subtaskTotal = (task.subtasks||[]).length;
  const today = new Date().toISOString().slice(0,10);
  const isOverdue = !task.done && task.dueDate && task.dueDate < today;
  const isToday = task.dueDate === today;
  const isUrgent = task.priority === 'urgent' && !task.done;
  const proj = task.projectId ? DB.getProject(task.projectId) : null;
  const isExpanded = TasksState.expandedTaskId === task.id;

  const dueDateStr = task.dueDate ? (() => {
    const diff = Math.ceil((new Date(task.dueDate) - new Date(today)) / 86400000);
    if (isToday) return `<span class="task-due-badge today">今日</span>`;
    if (isOverdue) return `<span class="task-due-badge overdue">期限切れ (${Math.abs(diff)}日)</span>`;
    if (diff === 1) return `<span class="task-due-badge soon">明日</span>`;
    if (diff <= 3) return `<span class="task-due-badge soon">${diff}日後</span>`;
    return `<span class="task-due-badge normal"><i class="fas fa-calendar"></i> ${task.dueDate}</span>`;
  })() : '';

  const subtasksExpanded = isExpanded && subtaskTotal > 0 ? `
  <div class="task-subtasks-list">
    ${(task.subtasks||[]).map(s=>`
    <div class="task-subtask-row" onclick="toggleSubtask('${task.id}','${s.id}')">
      <div class="task-subtask-check ${s.done?'done':''}">${s.done?'<i class="fas fa-check" style="font-size:8px"></i>':''}</div>
      <span style="font-size:12px;color:var(--text-secondary);${s.done?'text-decoration:line-through;opacity:.6':''}">${esc(s.text)}</span>
    </div>`).join('')}
    <button class="btn btn-ghost btn-sm" style="margin-top:4px;font-size:11px" onclick="addSubtaskInline('${task.id}')"><i class="fas fa-plus"></i> サブタスク追加</button>
  </div>` : '';

  const bodyExpanded = isExpanded && task.body ? `
  <div class="task-body-expanded">${esc(task.body)}</div>` : '';

  const timeExpanded = isExpanded ? `
  <div class="task-time-row">
    <span style="font-size:11px;color:var(--text-muted)"><i class="fas fa-clock" style="margin-right:3px"></i>見積 </span>
    <input type="number" class="task-time-input" value="${task.estimatedMin||0}" min="0" max="480" step="5"
      onchange="updateTaskField('${task.id}','estimatedMin',parseInt(this.value)||0)"
      onclick="event.stopPropagation()" title="見積もり時間（分）">
    <span style="font-size:11px;color:var(--text-muted)">分</span>
    ${task.estimatedMin > 0 ? `<span style="font-size:11px;color:var(--text-muted);margin-left:8px"><i class="fas fa-stopwatch" style="margin-right:3px"></i>実績 ${task.actualMin||0}分</span>` : ''}
    ${task.repeat && task.repeat !== 'none' ? `<span style="font-size:11px;color:var(--fuji);margin-left:8px"><i class="fas fa-rotate" style="margin-right:3px"></i>${task.repeat==='daily'?'毎日':task.repeat==='weekly'?'毎週':'毎月'}</span>` : ''}
  </div>` : '';

  const repeatLabel = task.repeat && task.repeat !== 'none'
    ? (task.repeat==='daily'?'毎日':task.repeat==='weekly'?'毎週':'毎月') : '';

  return `
  <div class="task-item ${task.done?'done':''} ${isOverdue?'overdue':''} ${isUrgent?'urgent':''} ${isExpanded?'expanded':''}" id="task-${task.id}">
    <!-- チェックボックス -->
    <div class="task-check-area" onclick="toggleTaskDone('${task.id}')" title="${task.done?'未完了に戻す':'完了にする'}">
      <div class="task-checkbox ${task.done?'checked':''} ${isUrgent?'urgent':''}">${task.done?'<i class="fas fa-check" style="font-size:9px;color:white"></i>':''}</div>
    </div>
    <!-- メインコンテンツ -->
    <div class="task-content" onclick="expandTask('${task.id}')">
      <div class="task-title-row">
        <span class="task-title ${task.done?'done':''}">${isUrgent ? '<i class="fas fa-fire" style="color:#d01050;font-size:10px;margin-right:3px"></i>' : ''}${esc(task.title)}</span>
        <div class="task-meta-chips">
          <span class="task-cat-chip" style="background:${cat.color}18;color:${cat.color};border:1px solid ${cat.color}30"><i class="fas ${cat.icon}" style="font-size:8px"></i> ${cat.label}</span>
          <span class="task-pri-chip" style="color:${pri.color};background:${pri.bg}"><i class="fas ${pri.icon}" style="font-size:8px"></i> ${pri.label}</span>
          ${dueDateStr}
          ${proj ? `<span class="task-proj-chip"><i class="fas fa-film" style="font-size:8px"></i> ${esc(proj.title.slice(0,10))}</span>` : ''}
          ${subtaskTotal > 0 ? `<span class="task-sub-chip" style="color:${subtaskDone===subtaskTotal?'var(--matcha)':'var(--text-muted)'}"><i class="fas fa-list-check" style="font-size:8px"></i> ${subtaskDone}/${subtaskTotal}</span>` : ''}
          ${repeatLabel ? `<span class="task-sub-chip" style="color:var(--fuji)"><i class="fas fa-rotate" style="font-size:8px"></i> ${repeatLabel}</span>` : ''}
          ${(task.tags||[]).slice(0,2).map(tg=>`<span class="task-tag-chip">#${esc(tg)}</span>`).join('')}
        </div>
      </div>
      ${!isExpanded && task.body ? `<div class="task-body" style="font-size:11.5px;color:var(--text-secondary);margin-top:3px;line-height:1.5">${esc(task.body.slice(0,100))}${task.body.length>100?'…':''}</div>` : ''}
      ${bodyExpanded}
      ${subtasksExpanded}
      ${timeExpanded}
      ${subtaskTotal > 0 && !isExpanded ? `
      <div class="task-subtask-progress">
        <div style="height:3px;flex:1;background:var(--bg-hover);border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${Math.round(subtaskDone/subtaskTotal*100)}%;background:${subtaskDone===subtaskTotal?'var(--matcha)':'var(--fuji)'};transition:width .3s"></div>
        </div>
        <span style="font-size:10px;color:var(--text-muted)">${subtaskDone}/${subtaskTotal}</span>
      </div>` : ''}
    </div>
    <!-- アクションボタン -->
    <div class="task-item-actions">
      <button class="btn btn-ghost btn-icon btn-sm" onclick="event.stopPropagation();openEditTaskModal('${task.id}')" title="編集"><i class="fas fa-pen" style="font-size:10px"></i></button>
      <button class="btn btn-ghost btn-icon btn-sm" onclick="event.stopPropagation();deleteTask('${task.id}')" title="削除"><i class="fas fa-trash" style="font-size:10px;color:var(--text-light)"></i></button>
      <button class="btn btn-ghost btn-icon btn-sm" onclick="event.stopPropagation();expandTask('${task.id}')" title="${isExpanded?'折りたたむ':'詳細を表示'}">
        <i class="fas fa-chevron-${isExpanded?'up':'down'}" style="font-size:9px;color:var(--text-muted)"></i>
      </button>
    </div>
  </div>`;
}

function renderTasksCalendar(tasks) {
  const events = DB.get('schedule_events', []);
  const calMonth = TasksState.calendarMonth;
  const base = calMonth ? new Date(calMonth) : new Date();
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const dayNames = ['日','月','火','水','木','金','土'];
  const todayStr = new Date().toISOString().slice(0,10);

  const cells = [];
  for (let i=0; i<firstDay; i++) cells.push('<div class="cal-cell empty"></div>');
  for (let d=1; d<=daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayTasks = tasks.filter(t=>t.dueDate===dateStr);
    const dayEvents = events.filter(e=>e.date===dateStr);
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    const allDone = dayTasks.length > 0 && dayTasks.every(t=>t.done);
    const hasOverdue = dayTasks.some(t=>!t.done) && isPast;
    cells.push(`
    <div class="cal-cell ${isToday?'today':''} ${allDone?'all-done':''} ${hasOverdue?'has-overdue':''}" onclick="openNewTaskModalForDate('${dateStr}')">
      <div class="cal-day-num ${isToday?'today':''}">${d}</div>
      <div class="cal-cell-items">
        ${dayEvents.slice(0,1).map(e=>`<div class="cal-event-chip" style="background:${e.color}22;color:${e.color}" title="${esc(e.title)}">${esc(e.title.slice(0,8))}</div>`).join('')}
        ${dayTasks.slice(0,2).map(t=>`<div class="cal-task-item ${t.done?'done':''} ${!t.done&&isPast?'overdue':''}" title="${esc(t.title)}">${esc(t.title.slice(0,12))}</div>`).join('')}
        ${(dayTasks.length+dayEvents.length) > 2 ? `<div class="cal-more-badge">+${dayTasks.length+dayEvents.length-2}</div>` : ''}
      </div>
    </div>`);
  }

  return `
  <div class="cal-view-wrap">
    <div class="cal-nav">
      <button class="btn btn-ghost btn-icon btn-sm" onclick="shiftCalMonth(-1)"><i class="fas fa-chevron-left"></i></button>
      <span class="cal-nav-title">${year}年 ${monthNames[month]}</span>
      <button class="btn btn-ghost btn-icon btn-sm" onclick="shiftCalMonth(1)"><i class="fas fa-chevron-right"></i></button>
      ${calMonth ? `<button class="btn btn-ghost btn-sm" onclick="resetCalMonth()" style="font-size:11px">今月</button>` : ''}
      <button class="btn btn-ghost btn-sm" onclick="openScheduleEventModal()" style="margin-left:auto;font-size:11px"><i class="fas fa-plus" style="color:var(--matcha)"></i> イベント</button>
      <button class="btn btn-ghost btn-sm" onclick="openNewTaskModal()" style="font-size:11px"><i class="fas fa-plus" style="color:var(--fuji)"></i> タスク</button>
    </div>
    <div style="display:flex;gap:12px;padding:8px 0;font-size:11px;color:var(--text-muted);flex-wrap:wrap;margin-bottom:4px">
      <div style="display:flex;align-items:center;gap:4px"><div style="width:10px;height:10px;border-radius:2px;background:var(--matcha-bg);border:1px solid var(--matcha)"></div> 全完了</div>
      <div style="display:flex;align-items:center;gap:4px"><div style="width:10px;height:10px;border-radius:2px;background:var(--momo-bg);border:1px solid var(--momo)"></div> 期限切れ</div>
      <div style="display:flex;align-items:center;gap:4px"><div style="width:10px;height:10px;border-radius:2px;background:var(--accent-bg);border:1px solid var(--accent)"></div> 今日</div>
    </div>
    <div class="cal-grid-header">
      ${dayNames.map((d,i)=>`<div class="cal-header-cell" style="color:${i===0?'var(--accent)':i===6?'var(--fuji)':'var(--text-muted)'}">${d}</div>`).join('')}
    </div>
    <div class="cal-grid">${cells.join('')}</div>
  </div>`;
}

function shiftCalMonth(dir) {
  const base = TasksState.calendarMonth ? new Date(TasksState.calendarMonth) : new Date();
  base.setMonth(base.getMonth() + dir);
  TasksState.calendarMonth = base.toISOString().slice(0,7) + '-01';
  render();
}
function resetCalMonth() { TasksState.calendarMonth = null; render(); }

function renderTasksKanban(tasks) {
  const today = new Date().toISOString().slice(0,10);
  const cols = [
    { id:'urgent',     label:'🔥 緊急',  color:'#d01050', tasks: tasks.filter(t=>!t.done && t.priority==='urgent') },
    { id:'todo',       label:'📋 To Do', color:'var(--fuji)', tasks: tasks.filter(t=>!t.done && t.priority!=='urgent' && !t.dueDate) },
    { id:'today',      label:'📅 今日',  color:'var(--kogane)', tasks: tasks.filter(t=>!t.done && t.dueDate===today && t.priority!=='urgent') },
    { id:'upcoming',   label:'📆 予定',  color:'var(--matcha)', tasks: tasks.filter(t=>!t.done && t.dueDate && t.dueDate>today && t.priority!=='urgent') },
    { id:'done',       label:'✅ 完了',  color:'var(--text-muted)', tasks: tasks.filter(t=>t.done).slice(0,8) },
  ];
  return `<div class="kanban-wrap">
    ${cols.map(col=>`
    <div class="kanban-col">
      <div class="kanban-col-header" style="border-bottom:2px solid ${col.color}">
        <span style="font-size:12.5px;font-weight:700;color:var(--text-primary)">${col.label}</span>
        <span style="font-size:11px;color:${col.color};background:${col.color}22;padding:1px 7px;border-radius:10px;font-weight:600">${col.tasks.length}</span>
      </div>
      <div class="kanban-cards">
        ${col.tasks.map(t=>{
          const pri = TASK_PRIORITIES[t.priority]||TASK_PRIORITIES.medium;
          const cat = TASK_CATEGORIES.find(c=>c.id===t.category)||TASK_CATEGORIES[0];
          return `<div class="kanban-card ${t.done?'done':''}" style="border-left:3px solid ${pri.color}" onclick="openEditTaskModal('${t.id}')">
            <div class="kanban-card-title">${esc(t.title.slice(0,50))}</div>
            <div class="kanban-card-meta">
              <span style="color:${cat.color}"><i class="fas ${cat.icon}"></i></span>
              ${t.dueDate?`<span style="color:var(--text-muted);font-size:10px"><i class="fas fa-calendar"></i> ${t.dueDate.slice(5)}</span>`:''}
              ${t.estimatedMin>0?`<span style="color:var(--text-muted);font-size:10px"><i class="fas fa-clock"></i> ${t.estimatedMin}分</span>`:''}
            </div>
            ${(t.subtasks||[]).length>0?`<div class="kanban-subtask-bar">
              <div style="height:2px;flex:1;background:var(--bg-hover);border-radius:1px;overflow:hidden"><div style="height:100%;width:${Math.round((t.subtasks||[]).filter(s=>s.done).length/(t.subtasks||[]).length*100)}%;background:var(--matcha)"></div></div>
              <span style="font-size:9px;color:var(--text-muted)">${(t.subtasks||[]).filter(s=>s.done).length}/${(t.subtasks||[]).length}</span>
            </div>`:''}
          </div>`;
        }).join('')}
        ${col.id !== 'done' ? `<button class="kanban-add-btn" onclick="openNewTaskModal()"><i class="fas fa-plus"></i> 追加</button>` : ''}
      </div>
    </div>`).join('')}
  </div>`;
}

// ── Weekly View ───────────────────────────────────────────────
function renderTasksWeekly(tasks) {
  const offset = TasksState.weekOffset || 0;
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + offset * 7);
  const weekDates = Array.from({length:7},(_,i)=>{
    const d = new Date(weekStart); d.setDate(weekStart.getDate()+i);
    return d.toISOString().slice(0,10);
  });
  const todayStr = today.toISOString().slice(0,10);
  const dayNames = ['日','月','火','水','木','金','土'];
  const events = DB.get('schedule_events', []);

  const weekLabel = (() => {
    const s = new Date(weekDates[0]); const e = new Date(weekDates[6]);
    return `${s.getFullYear()}年 ${s.getMonth()+1}月${s.getDate()}日 〜 ${e.getMonth()+1}月${e.getDate()}日`;
  })();

  // 週間サマリー
  const weekTasks = tasks.filter(t => weekDates.includes(t.dueDate));
  const weekDone = weekTasks.filter(t => t.done).length;
  const weekTotal = weekTasks.length;
  const weekOverdue = tasks.filter(t => !t.done && t.dueDate && t.dueDate < todayStr && weekDates.includes(t.dueDate)).length;
  const totalEstMin = weekTasks.filter(t=>!t.done&&t.estimatedMin>0).reduce((a,t)=>a+t.estimatedMin,0);

  const weekSummaryBar = `
  <div style="display:flex;gap:12px;flex-wrap:wrap;padding:10px 14px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-md);margin-bottom:12px">
    <div style="display:flex;align-items:center;gap:6px;font-size:12px">
      <i class="fas fa-calendar-week" style="color:var(--fuji)"></i>
      <span style="font-weight:700;color:var(--fuji)">${weekDone}/${weekTotal}</span>
      <span style="color:var(--text-muted)">タスク完了</span>
    </div>
    ${weekOverdue > 0 ? `<div style="display:flex;align-items:center;gap:6px;font-size:12px">
      <i class="fas fa-exclamation-circle" style="color:var(--momo)"></i>
      <span style="font-weight:700;color:var(--momo)">${weekOverdue}</span>
      <span style="color:var(--text-muted)">期限切れ</span>
    </div>` : ''}
    ${totalEstMin > 0 ? `<div style="display:flex;align-items:center;gap:6px;font-size:12px">
      <i class="fas fa-clock" style="color:var(--kogane)"></i>
      <span style="font-weight:700;color:var(--kogane)">${Math.floor(totalEstMin/60)}h${totalEstMin%60}m</span>
      <span style="color:var(--text-muted)">残り作業時間</span>
    </div>` : ''}
    ${weekTotal > 0 ? `<div style="flex:1;display:flex;align-items:center;gap:8px;min-width:120px">
      <div style="flex:1;height:5px;background:var(--bg-hover);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${Math.round(weekDone/weekTotal*100)}%;background:var(--matcha);border-radius:3px"></div>
      </div>
      <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">${Math.round(weekDone/weekTotal*100)}%</span>
    </div>` : ''}
  </div>`;

  const colsHtml = weekDates.map((ds, di) => {
    const dayTasks = tasks.filter(t=>t.dueDate===ds);
    const dayEvents = events.filter(e=>e.date===ds);
    const isToday = ds === todayStr;
    const isPast = ds < todayStr;
    const done = dayTasks.filter(t=>t.done).length;
    const total = dayTasks.length;
    const d = new Date(ds);
    const hasOverdue = isPast && dayTasks.some(t=>!t.done);

    // Sort events by time
    const sortedEvents = [...dayEvents].sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    const sortedTasks = [...dayTasks].sort((a,b)=>{
      if (a.done !== b.done) return a.done ? 1 : -1;
      const priOrder = {urgent:0, high:1, medium:2, low:3};
      return (priOrder[a.priority]||2) - (priOrder[b.priority]||2);
    });

    return `<div class="weekly-day-col ${isToday?'today':''} ${hasOverdue?'has-overdue':''}">
      <div class="weekly-day-header">
        <div class="weekly-day-label ${isToday?'today':''}" style="color:${di===0?'var(--accent)':di===6?'var(--fuji)':''}">
          <span class="weekly-day-name">${dayNames[di]}</span>
          <span class="weekly-day-date">${d.getDate()}</span>
        </div>
        <div style="display:flex;align-items:center;gap:4px">
          ${total>0 ? `<span class="weekly-day-count ${done===total&&total>0?'all-done':hasOverdue?'has-overdue':''}">${done}/${total}</span>` : ''}
          ${hasOverdue ? `<i class="fas fa-exclamation-circle" style="font-size:9px;color:var(--momo)" title="期限切れタスクあり"></i>` : ''}
        </div>
      </div>
      <div class="weekly-day-body">
        ${sortedEvents.map(ev=>`
        <div class="weekly-event-chip" style="background:${ev.color||'var(--fuji)'}22;border-left:3px solid ${ev.color||'var(--fuji)'}" onclick="editScheduleEvent('${ev.id}')">
          <i class="fas ${ev.icon||'fa-calendar'}" style="color:${ev.color||'var(--fuji)'};font-size:10px"></i>
          <span>${esc(ev.title.slice(0,20))}</span>
          ${ev.time ? `<span class="weekly-event-time">${ev.time}</span>` : ''}
        </div>`).join('')}
        ${sortedTasks.map(t=>{
          const pri = TASK_PRIORITIES[t.priority]||TASK_PRIORITIES.medium;
          const isOverdue = !t.done && t.dueDate < todayStr;
          return `<div class="weekly-task-chip ${t.done?'done':''} ${isOverdue?'overdue':''}" style="border-left:3px solid ${isOverdue?'var(--momo)':pri.color}" onclick="expandTask('${t.id}')">
            <div class="weekly-task-check ${t.done?'done':''}" onclick="event.stopPropagation();toggleTaskDone('${t.id}')">
              ${t.done?'<i class="fas fa-check" style="font-size:8px;color:white"></i>':''}
            </div>
            <span class="weekly-task-title ${t.done?'done':''}">${esc(t.title.slice(0,24))}</span>
            <div style="display:flex;align-items:center;gap:3px;flex-shrink:0">
              ${t.estimatedMin>0?`<span class="weekly-task-time">${t.estimatedMin}分</span>`:''}
              ${isOverdue?`<i class="fas fa-exclamation-triangle" style="font-size:8px;color:var(--momo)" title="期限切れ"></i>`:''}
            </div>
          </div>`;
        }).join('')}
        <button class="weekly-add-btn" onclick="openNewTaskModalForDate('${ds}')">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    </div>`;
  }).join('');

  return `
  <div class="weekly-view-wrap">
    <div class="weekly-nav">
      <button class="btn btn-ghost btn-sm btn-icon" onclick="shiftWeek(-1)"><i class="fas fa-chevron-left"></i></button>
      <span class="weekly-nav-label">${weekLabel}</span>
      <button class="btn btn-ghost btn-sm btn-icon" onclick="shiftWeek(1)"><i class="fas fa-chevron-right"></i></button>
      ${offset!==0?`<button class="btn btn-ghost btn-sm" onclick="shiftWeek(0,true)" style="font-size:11px">今週</button>`:''}
      <button class="btn btn-ghost btn-sm" onclick="openScheduleEventModal()" style="margin-left:auto;font-size:11px"><i class="fas fa-calendar-plus" style="color:var(--matcha)"></i> イベント</button>
    </div>
    ${weekSummaryBar}
    <div class="weekly-grid">${colsHtml}</div>
  </div>`;
}

function calcTaskStreak(tasks) {
  const today = new Date();
  let streak = 0;
  for (let i=0; i<60; i++) {
    const d = new Date(today); d.setDate(today.getDate()-i);
    const ds = d.toISOString().slice(0,10);
    const dayDoneTasks = tasks.filter(t=>t.done && t.completedAt?.slice(0,10)===ds);
    if (dayDoneTasks.length > 0) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function getWeekDates() {
  const today = new Date();
  const start = new Date(today); start.setDate(today.getDate()-today.getDay());
  return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d.toISOString().slice(0,10);});
}

// ── Tasks Actions ────────────────────────────────────────────
function setTasksView(view) {
  TasksState.view = view;
  render();
}

function shiftWeek(dir, reset = false) {
  if (reset) TasksState.weekOffset = 0;
  else TasksState.weekOffset = (TasksState.weekOffset || 0) + dir;
  render();
}

function setTaskFilter(key, val) {
  TasksState.filter[key] = val;
  render();
}

function clearTaskFilters() {
  TasksState.filter = { category:'', priority:'', search:'', dueFilter:'all', projectId:'', sectionId:'' };
  render();
}

function expandTask(id) {
  TasksState.expandedTaskId = TasksState.expandedTaskId === id ? null : id;
  const el = document.getElementById('task-' + id);
  if (el) {
    const task = TASK_DB.getTask(id);
    if (task) el.outerHTML = renderTaskItem(task);
  }
}

function quickAddTask() {
  const input = document.getElementById('tqa-input');
  if (!input) return;
  const title = input.value.trim();
  if (!title) return;
  const today = new Date().toISOString().slice(0,10);
  // 簡単なパース: "タイトル !high @category 2024-01-15"
  let priority = 'medium';
  let category = 'writing';
  let dueDate = '';
  let cleanTitle = title;
  const priMatch = cleanTitle.match(/\s!(\w+)/);
  if (priMatch) { priority = priMatch[1]; cleanTitle = cleanTitle.replace(priMatch[0],'').trim(); }
  const catMatch = cleanTitle.match(/\s@(\w+)/);
  if (catMatch) { category = catMatch[1]; cleanTitle = cleanTitle.replace(catMatch[0],'').trim(); }
  const dateMatch = cleanTitle.match(/\s(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) { dueDate = dateMatch[1]; cleanTitle = cleanTitle.replace(dateMatch[0],'').trim(); }
  if (!dueDate && TasksState.filter.dueFilter === 'today') dueDate = today;
  const task = newTask({ title: cleanTitle, priority, category, dueDate });
  TASK_DB.saveTask(task);
  input.value = '';
  toast('タスクを追加しました ✅', 'success');
  render();
}

function openNewTaskModalForDate(dateStr) {
  openNewTaskModal(dateStr);
}

function toggleTaskGroup(key) {
  const cur = DB.get(`task_group_${key}_collapsed`, key === 'done');
  DB.set(`task_group_${key}_collapsed`, !cur);
  const body = document.querySelector(`#tg-${key} .task-group-body`);
  const icon = document.querySelector(`#tg-${key} .task-group-header i`);
  if (body) body.style.display = cur ? '' : 'none';
  if (icon) icon.className = `fas fa-chevron-${cur?'down':'right'}`;
  DB.set(`task_group_${key}_collapsed`, !cur);
}

function toggleTaskDone(taskId) {
  const task = TASK_DB.getTask(taskId);
  if (!task) return;
  task.done = !task.done;
  task.completedAt = task.done ? now() : null;
  task.updatedAt = now();
  TASK_DB.saveTask(task);
  const el2 = document.getElementById('task-' + taskId);
  if (el2) el2.outerHTML = renderTaskItem(task);
  toast(task.done ? '✅ タスク完了！' : 'タスクを未完了に戻しました', task.done ? 'success' : 'info');
}

function deleteTask(taskId) {
  TASK_DB.deleteTask(taskId);
  const el2 = document.getElementById('task-' + taskId);
  if (el2) el2.remove();
  toast('タスクを削除しました', 'info');
}

function openAddTaskModal(prefillDate = '') {
  return openNewTaskModal(prefillDate);
}

function openNewTaskModal(prefillDate = '') {
  const projects = DB.getProjects();
  const today = new Date().toISOString().slice(0,10);
  const sections = TASK_SECTIONS_DB.getSections();
  openModal(
    `<i class="fas fa-plus" style="color:var(--matcha)"></i> タスクを追加`,
    `<div class="form-group">
      <label class="form-label">タスク名 <span style="color:var(--accent)">*</span></label>
      <input class="form-input" id="nt-title" placeholder="例: 第3話の初稿を書く" autofocus>
    </div>
    <div class="form-group">
      <label class="form-label">メモ・詳細</label>
      <textarea class="form-textarea" id="nt-body" rows="2" placeholder="補足・詳細メモ…"></textarea>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">カテゴリ</label>
        <select class="form-select" id="nt-cat">
          ${TASK_CATEGORIES.map(c=>`<option value="${c.id}">${c.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">優先度</label>
        <select class="form-select" id="nt-pri">
          ${Object.entries(TASK_PRIORITIES).map(([k,v])=>`<option value="${k}" ${k==='medium'?'selected':''}>${v.label}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">期限日</label>
        <input class="form-input" type="date" id="nt-due" value="${prefillDate||today}">
      </div>
      <div class="form-group">
        <label class="form-label">時刻</label>
        <input class="form-input" type="time" id="nt-time">
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">見積もり時間（分）</label>
        <input class="form-input" type="number" id="nt-est" value="0" min="0" max="480" step="5" placeholder="0">
      </div>
      <div class="form-group">
        <label class="form-label">繰り返し</label>
        <select class="form-select" id="nt-repeat">
          <option value="none">なし</option>
          <option value="daily">毎日</option>
          <option value="weekly">毎週</option>
          <option value="monthly">毎月</option>
        </select>
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">リンクする作品</label>
        <select class="form-select" id="nt-proj">
          <option value="">なし</option>
          ${projects.map(p=>`<option value="${p.id}">${esc(p.title)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">セクション</label>
        <select class="form-select" id="nt-sect">
          <option value="">未分類</option>
          ${sections.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">タグ（スペース区切り）</label>
      <input class="form-input" id="nt-tags" placeholder="例: 第3話 ドラフト 重要">
    </div>
    <div class="form-group">
      <label class="form-label" style="display:flex;justify-content:space-between">
        サブタスク
        <button class="btn btn-ghost btn-sm" onclick="addSubtaskInput()" style="padding:0;height:auto;font-size:11px"><i class="fas fa-plus"></i> 追加</button>
      </label>
      <div id="nt-subtasks"></div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveNewTask()"><i class="fas fa-plus"></i> 追加</button>`,
    { size: 'modal-lg' }
  );
}

function addSubtaskInput() {
  const cont = document.getElementById('nt-subtasks');
  if (!cont) return;
  const div = document.createElement('div');
  div.className = 'subtask-add-row';
  div.innerHTML = `<input class="form-input subtask-input" placeholder="サブタスク名…">
    <button class="btn btn-ghost btn-icon btn-sm" onclick="this.closest('.subtask-add-row').remove()" title="削除"><i class="fas fa-xmark" style="font-size:10px;color:var(--accent)"></i></button>`;
  cont.appendChild(div);
  div.querySelector('input')?.focus();
}

function saveNewTask() {
  const title = document.getElementById('nt-title')?.value?.trim();
  if (!title) { toast('タスク名を入力してください', 'error'); return; }
  const subtaskInputs = [...$$('.subtask-input')].map(i=>i.value.trim()).filter(Boolean).map(t=>({id:uid(),text:t,done:false}));
  const tagsRaw = document.getElementById('nt-tags')?.value?.trim() || '';
  const tags = tagsRaw ? tagsRaw.split(/\s+/).filter(Boolean) : [];
  const task = newTask({
    title,
    body: document.getElementById('nt-body')?.value?.trim() || '',
    category: document.getElementById('nt-cat')?.value || 'writing',
    priority: document.getElementById('nt-pri')?.value || 'medium',
    dueDate: document.getElementById('nt-due')?.value || '',
    dueTime: document.getElementById('nt-time')?.value || '',
    projectId: document.getElementById('nt-proj')?.value || null,
    sectionId: document.getElementById('nt-sect')?.value || '',
    repeat: document.getElementById('nt-repeat')?.value || 'none',
    estimatedMin: parseInt(document.getElementById('nt-est')?.value)||0,
    subtasks: subtaskInputs,
    tags,
  });
  TASK_DB.saveTask(task);
  closeModal();
  toast('タスクを追加しました ✅', 'success');
  render();
}

function openEditTaskModal(taskId) {
  const task = TASK_DB.getTask(taskId);
  if (!task) return;
  const projects = DB.getProjects();
  const sections = TASK_SECTIONS_DB.getSections();
  const subtasksHtml = (task.subtasks||[]).map((s,i)=>`
    <div class="subtask-add-row" id="stask-${i}">
      <input type="checkbox" id="std-${i}" ${s.done?'checked':''} style="width:14px;height:14px;cursor:pointer;flex-shrink:0">
      <input class="form-input subtask-input" id="stt-${i}" value="${esc(s.text)}">
      <button class="btn btn-ghost btn-icon btn-sm" onclick="document.getElementById('stask-${i}').remove()" title="削除"><i class="fas fa-xmark" style="font-size:10px;color:var(--accent)"></i></button>
    </div>`).join('');
  openModal(
    `<i class="fas fa-pen" style="color:var(--matcha)"></i> タスクを編集`,
    `<div class="form-group">
      <label class="form-label">タスク名</label>
      <input class="form-input" id="et-title" value="${esc(task.title)}">
    </div>
    <div class="form-group">
      <label class="form-label">メモ・詳細</label>
      <textarea class="form-textarea" id="et-body" rows="3">${esc(task.body||'')}</textarea>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">カテゴリ</label>
        <select class="form-select" id="et-cat">
          ${TASK_CATEGORIES.map(c=>`<option value="${c.id}" ${task.category===c.id?'selected':''}>${c.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">優先度</label>
        <select class="form-select" id="et-pri">
          ${Object.entries(TASK_PRIORITIES).map(([k,v])=>`<option value="${k}" ${task.priority===k?'selected':''}>${v.label}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">期限日</label>
        <input class="form-input" type="date" id="et-due" value="${task.dueDate||''}">
      </div>
      <div class="form-group">
        <label class="form-label">時刻</label>
        <input class="form-input" type="time" id="et-time" value="${task.dueTime||''}">
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">見積もり（分）</label>
        <input class="form-input" type="number" id="et-est" value="${task.estimatedMin||0}" min="0" max="480" step="5">
      </div>
      <div class="form-group">
        <label class="form-label">実績（分）</label>
        <input class="form-input" type="number" id="et-actual" value="${task.actualMin||0}" min="0" max="480" step="5">
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">リンクする作品</label>
        <select class="form-select" id="et-proj">
          <option value="">なし</option>
          ${projects.map(p=>`<option value="${p.id}" ${task.projectId===p.id?'selected':''}>${esc(p.title)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">繰り返し</label>
        <select class="form-select" id="et-repeat">
          <option value="none" ${task.repeat==='none'?'selected':''}>なし</option>
          <option value="daily" ${task.repeat==='daily'?'selected':''}>毎日</option>
          <option value="weekly" ${task.repeat==='weekly'?'selected':''}>毎週</option>
          <option value="monthly" ${task.repeat==='monthly'?'selected':''}>毎月</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">タグ（スペース区切り）</label>
      <input class="form-input" id="et-tags" value="${esc((task.tags||[]).join(' '))}">
    </div>
    <div class="form-group">
      <label class="form-label" style="display:flex;justify-content:space-between">
        サブタスク
        <button class="btn btn-ghost btn-sm" onclick="addSubtaskInput()" style="padding:0;height:auto;font-size:11px"><i class="fas fa-plus"></i> 追加</button>
      </label>
      <div id="nt-subtasks">${subtasksHtml}</div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-danger btn-sm" onclick="deleteTask('${taskId}');closeModal();render()" title="削除"><i class="fas fa-trash"></i></button>
     <button class="btn btn-primary" onclick="saveEditTask('${taskId}')"><i class="fas fa-floppy-disk"></i> 保存</button>`,
    { size: 'modal-lg' }
  );
}

function saveEditTask(taskId) {
  const task = TASK_DB.getTask(taskId);
  if (!task) return;
  const title = document.getElementById('et-title')?.value?.trim();
  if (!title) { toast('タスク名を入力してください', 'error'); return; }
  const subtasks = [];
  const stItems = document.querySelectorAll('[id^=stask-]');
  stItems.forEach((item, i) => {
    const text = document.getElementById(`stt-${i}`)?.value?.trim();
    const done = !!document.getElementById(`std-${i}`)?.checked;
    if (text) subtasks.push({ id: uid(), text, done });
  });
  const tagsRaw = document.getElementById('et-tags')?.value?.trim() || '';
  task.title = title;
  task.body = document.getElementById('et-body')?.value?.trim() || '';
  task.category = document.getElementById('et-cat')?.value || 'writing';
  task.priority = document.getElementById('et-pri')?.value || 'medium';
  task.dueDate = document.getElementById('et-due')?.value || '';
  task.dueTime = document.getElementById('et-time')?.value || '';
  task.projectId = document.getElementById('et-proj')?.value || null;
  task.repeat = document.getElementById('et-repeat')?.value || 'none';
  task.estimatedMin = parseInt(document.getElementById('et-est')?.value)||0;
  task.actualMin = parseInt(document.getElementById('et-actual')?.value)||0;
  task.tags = tagsRaw ? tagsRaw.split(/\s+/).filter(Boolean) : [];
  task.subtasks = subtasks;
  task.updatedAt = now();
  TASK_DB.saveTask(task);
  closeModal();
  toast('タスクを保存しました ✅', 'success');
  render();
}

function updateTaskField(taskId, field, value) {
  const task = TASK_DB.getTask(taskId);
  if (!task) return;
  task[field] = value;
  task.updatedAt = now();
  TASK_DB.saveTask(task);
}

function toggleSubtask(taskId, subtaskId) {
  const task = TASK_DB.getTask(taskId);
  if (!task) return;
  const sub = (task.subtasks||[]).find(s=>s.id===subtaskId);
  if (sub) { sub.done = !sub.done; task.updatedAt = now(); TASK_DB.saveTask(task); }
  const el = document.getElementById('task-' + taskId);
  if (el) el.outerHTML = renderTaskItem(task);
}

function addSubtaskInline(taskId) {
  const text = prompt('サブタスク名を入力:');
  if (!text?.trim()) return;
  const task = TASK_DB.getTask(taskId);
  if (!task) return;
  task.subtasks = task.subtasks || [];
  task.subtasks.push({ id: uid(), text: text.trim(), done: false });
  task.updatedAt = now();
  TASK_DB.saveTask(task);
  const el = document.getElementById('task-' + taskId);
  if (el) el.outerHTML = renderTaskItem(task);
}

function bindTasksPage() {
  // イベントは全て属性で設定済み
}

// ── Schedule Events ───────────────────────────────────────────
const SCHEDULE_EVENT_COLORS = [
  { id:'accent', label:'朱', color:'var(--accent)' },
  { id:'fuji', label:'藤', color:'var(--fuji)' },
  { id:'matcha', label:'抹茶', color:'var(--matcha)' },
  { id:'momo', label:'桃', color:'var(--momo)' },
  { id:'kogane', label:'黄金', color:'var(--kogane)' },
  { id:'asagi', label:'浅葱', color:'var(--asagi)' },
];
const SCHEDULE_EVENT_ICONS = [
  { id:'fa-calendar', label:'予定' },
  { id:'fa-film', label:'作品' },
  { id:'fa-pen-nib', label:'執筆' },
  { id:'fa-comments', label:'打合せ' },
  { id:'fa-clock', label:'締切' },
  { id:'fa-star', label:'重要' },
  { id:'fa-graduation-cap', label:'学習' },
  { id:'fa-bullhorn', label:'発表' },
];

function openScheduleEventModal(date = '') {
  const today = new Date().toISOString().slice(0,10);
  openModal(
    `<i class="fas fa-calendar-plus" style="color:var(--matcha)"></i> スケジュールイベントを追加`,
    `<div class="form-group">
      <label class="form-label">イベント名 <span style="color:var(--accent)">*</span></label>
      <input class="form-input" id="ev-title" placeholder="例: 脚本提出締切" autofocus>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">日付</label>
        <input class="form-input" type="date" id="ev-date" value="${date||today}">
      </div>
      <div class="form-group">
        <label class="form-label">時刻</label>
        <input class="form-input" type="time" id="ev-time">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">メモ</label>
      <textarea class="form-textarea" id="ev-note" rows="2" placeholder="詳細・場所など…"></textarea>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">アイコン</label>
        <select class="form-select" id="ev-icon">
          ${SCHEDULE_EVENT_ICONS.map(ic=>`<option value="${ic.id}">${ic.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">カラー</label>
        <select class="form-select" id="ev-color">
          ${SCHEDULE_EVENT_COLORS.map(c=>`<option value="${c.color}">${c.label}</option>`).join('')}
        </select>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveScheduleEvent()"><i class="fas fa-plus"></i> 追加</button>`
  );
}

function saveScheduleEvent() {
  const title = document.getElementById('ev-title')?.value?.trim();
  if (!title) { toast('イベント名を入力してください', 'error'); return; }
  const events = DB.get('schedule_events', []);
  const ev = {
    id: uid(),
    title,
    date: document.getElementById('ev-date')?.value || new Date().toISOString().slice(0,10),
    time: document.getElementById('ev-time')?.value || '',
    note: document.getElementById('ev-note')?.value?.trim() || '',
    icon: document.getElementById('ev-icon')?.value || 'fa-calendar',
    color: document.getElementById('ev-color')?.value || 'var(--fuji)',
    createdAt: now(),
  };
  events.unshift(ev);
  DB.set('schedule_events', events);
  closeModal();
  toast('イベントを追加しました', 'success');
  render();
}

function editScheduleEvent(evId) {
  const events = DB.get('schedule_events', []);
  const ev = events.find(e=>e.id===evId);
  if (!ev) return;
  openModal(
    `<i class="fas fa-calendar" style="color:var(--matcha)"></i> イベントを編集`,
    `<div class="form-group">
      <label class="form-label">イベント名</label>
      <input class="form-input" id="ev-title" value="${esc(ev.title)}">
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">日付</label>
        <input class="form-input" type="date" id="ev-date" value="${ev.date}">
      </div>
      <div class="form-group"><label class="form-label">時刻</label>
        <input class="form-input" type="time" id="ev-time" value="${ev.time||''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">メモ</label>
      <textarea class="form-textarea" id="ev-note" rows="2">${esc(ev.note||'')}</textarea>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">アイコン</label>
        <select class="form-select" id="ev-icon">
          ${SCHEDULE_EVENT_ICONS.map(ic=>`<option value="${ic.id}" ${ev.icon===ic.id?'selected':''}>${ic.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">カラー</label>
        <select class="form-select" id="ev-color">
          ${SCHEDULE_EVENT_COLORS.map(c=>`<option value="${c.color}" ${ev.color===c.color?'selected':''}>${c.label}</option>`).join('')}
        </select>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-danger btn-sm" onclick="deleteScheduleEvent('${evId}')" title="削除"><i class="fas fa-trash"></i></button>
     <button class="btn btn-primary" onclick="updateScheduleEvent('${evId}')"><i class="fas fa-floppy-disk"></i> 保存</button>`
  );
}

function updateScheduleEvent(evId) {
  const events = DB.get('schedule_events', []);
  const ev = events.find(e=>e.id===evId);
  if (!ev) return;
  ev.title = document.getElementById('ev-title')?.value?.trim() || ev.title;
  ev.date = document.getElementById('ev-date')?.value || ev.date;
  ev.time = document.getElementById('ev-time')?.value || '';
  ev.note = document.getElementById('ev-note')?.value?.trim() || '';
  ev.icon = document.getElementById('ev-icon')?.value || 'fa-calendar';
  ev.color = document.getElementById('ev-color')?.value || 'var(--fuji)';
  DB.set('schedule_events', events);
  closeModal();
  toast('イベントを更新しました', 'success');
  render();
}

function deleteScheduleEvent(evId) {
  const events = DB.get('schedule_events', []).filter(e=>e.id!==evId);
  DB.set('schedule_events', events);
  closeModal();
  toast('イベントを削除しました', 'info');
  render();
}

// ── Habit Modal (Enhanced) ────────────────────────────────────
function openHabitModal() {
  const habits = DB.get('habits', [
    { id:'h1', name:'毎日執筆', target:1, unit:'セッション', icon:'fa-pen-nib', color:'var(--accent)' },
    { id:'h2', name:'リサーチ', target:30, unit:'分', icon:'fa-search', color:'var(--fuji)' },
    { id:'h3', name:'読書',     target:20, unit:'分', icon:'fa-book', color:'var(--matcha)' },
    { id:'h4', name:'アウトライン確認', target:1, unit:'回', icon:'fa-list-check', color:'var(--momo)' },
  ]);
  const today = new Date().toISOString().slice(0,10);
  const logs = DB.get('habit_logs', {});
  const todayLogs = logs[today] || {};

  // 過去7日のストリーク計算
  const getHabitStreak = (hid) => {
    let s = 0;
    for (let i=1; i<=30; i++) {
      const d = new Date(); d.setDate(d.getDate()-i);
      const ds = d.toISOString().slice(0,10);
      if (logs[ds]?.[hid]) s++; else break;
    }
    return s;
  };

  // 週間達成グリッド
  const weekDates = Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return d.toISOString().slice(0,10);});

  const habitsHtml = habits.map(h=>{
    const isDone = !!todayLogs[h.id];
    const streak = getHabitStreak(h.id);
    const weekGrid = weekDates.map(d=>`<div style="width:14px;height:14px;border-radius:3px;background:${logs[d]?.[h.id]?h.color:'var(--bg-hover)'};border:1px solid var(--border)" title="${d}"></div>`).join('');
    return `
    <div class="habit-item ${isDone?'done':''}">
      <div class="habit-check-btn" onclick="toggleHabit('${h.id}')" style="background:${isDone?h.color:'transparent'};border-color:${h.color}">
        ${isDone?'<i class="fas fa-check" style="font-size:10px;color:white"></i>':''}
      </div>
      <i class="fas ${h.icon}" style="color:${h.color};font-size:14px;flex-shrink:0"></i>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${esc(h.name)}</div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:4px">
          <div style="display:flex;gap:2px">${weekGrid}</div>
          ${streak>0?`<span style="font-size:11px;color:var(--kogane);font-weight:700">🔥 ${streak}日連続</span>`:''}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        ${isDone?`<span style="font-size:12px;color:var(--matcha);font-weight:700">✅ 達成</span>`:
          `<span style="font-size:11px;color:var(--text-muted)">目標 ${h.target}${h.unit}</span>`}
      </div>
    </div>`;
  }).join('');

  const doneCount = habits.filter(h=>!!todayLogs[h.id]).length;

  openModal(
    `<i class="fas fa-fire" style="color:var(--accent)"></i> 習慣トラッカー`,
    `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div style="font-size:12px;color:var(--text-muted)">${today} の達成状況</div>
      <div style="font-size:13px;font-weight:700;color:${doneCount===habits.length?'var(--matcha)':'var(--text-primary)'}">
        ${doneCount}/${habits.length} 達成 ${doneCount===habits.length?'🎉':''}
      </div>
    </div>
    <div style="height:6px;background:var(--bg-hover);border-radius:3px;overflow:hidden;margin-bottom:16px">
      <div style="height:100%;width:${habits.length>0?Math.round(doneCount/habits.length*100):0}%;background:linear-gradient(90deg,var(--matcha),var(--matcha-lt));border-radius:3px;transition:width .5s"></div>
    </div>
    <div class="habit-list">${habitsHtml}</div>
    <div style="padding:10px 12px;background:var(--fuji-bg);border-radius:var(--radius-sm);font-size:12px;color:var(--fuji);border-left:3px solid var(--fuji);margin-top:12px">
      <i class="fas fa-fire" style="margin-right:6px"></i>習慣は毎日続けることで執筆力が向上します。小さな行動が大きな結果につながります。
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">閉じる</button>`
  );
}

function toggleHabit(habitId) {
  const today = new Date().toISOString().slice(0,10);
  const logs = DB.get('habit_logs', {});
  if (!logs[today]) logs[today] = {};
  logs[today][habitId] = !logs[today][habitId];
  DB.set('habit_logs', logs);
  closeModal();
  openHabitModal();
}

// ================================================================
//  STORY MAP — Phase 4 ストーリー構成マップ
// ================================================================

const STORYMAP_DB = {
  getMaps()   { return DB.get('storymaps', []); },
  saveMaps(ms){ DB.set('storymaps', ms); },
  getMap(id)  { return this.getMaps().find(m=>m.id===id)||null; },
  saveMap(map){ const ms=this.getMaps(); const idx=ms.findIndex(m=>m.id===map.id); if(idx>=0)ms[idx]=map;else ms.unshift(map); this.saveMaps(ms); },
  deleteMap(id){ this.saveMaps(this.getMaps().filter(m=>m.id!==id)); },
};

function newStoryMap(data={}) {
  return {
    id: uid(), title: data.title||'新しいストーリーマップ', description: data.description||'',
    projectId: data.projectId||null, structure: data.structure||'3act',
    acts: data.acts || [
      { id:uid(), title:'第一幕 (Act I)', color:'#6ab8f7', cards:[] },
      { id:uid(), title:'第二幕 (Act II)', color:'#f76ca0', cards:[] },
      { id:uid(), title:'第三幕 (Act III)', color:'#6af7a0', cards:[] },
    ],
    createdAt: now(), updatedAt: now(),
  };
}

function newSceneCard(data={}) {
  return {
    id: uid(),
    title: data.title||'新しいシーン',
    synopsis: data.synopsis||'',
    location: data.location||'',
    characters: data.characters||[],
    emotion: data.emotion||'',
    tension: data.tension||5,
    type: data.type||'', // 通常/転換/クライマックス/etc
    notes: data.notes||'',
    color: data.color||'#ffffff',
    order: data.order||0,
    createdAt: now(), updatedAt: now(),
  };
}

const SCENE_TYPES = ['通常','伏線','転換点','クライマックス','解決','コメディリリーフ','アクション','回想','夢'];
const StorymapState = { currentMapId: null };

function renderStoryMapPage() {
  const maps = STORYMAP_DB.getMaps();
  const currentMap = StorymapState.currentMapId ? STORYMAP_DB.getMap(StorymapState.currentMapId) : null;
  if (!currentMap) return renderStorymapList(maps);
  return renderStorymapBoard(currentMap);
}

function renderStorymapList(maps) {
  const projects = DB.getProjects();
  const cardsHtml = maps.length === 0
    ? `<div style="text-align:center;padding:80px 20px;color:var(--text-muted)">
        <div style="font-size:60px;margin-bottom:20px;opacity:0.25">🎬</div>
        <div style="font-size:16px;font-weight:700;margin-bottom:8px;font-family:'Noto Serif JP',serif">まだマップがありません</div>
        <div style="font-size:13px;margin-bottom:24px;line-height:1.7">ストーリーマップを作成して<br>物語の構成を視覚的に設計しましょう</div>
        <button class="btn btn-primary btn-lg" onclick="openNewStorymapModal()"><i class="fas fa-plus"></i> 最初のマップを作成</button>
      </div>`
    : maps.map(m=>{
        const proj = m.projectId ? projects.find(p=>p.id===m.projectId) : null;
        const sceneCount = (m.acts||[]).reduce((a,act)=>a+(act.cards||[]).length,0);
        return `<div class="board-list-card" onclick="openStorymap('${m.id}')" style="border-left:4px solid #6ab8f7">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div style="display:flex;gap:12px;align-items:center">
              <div style="width:40px;height:40px;border-radius:var(--radius-sm);background:#e8f4fd;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🎬</div>
              <div>
                <div style="font-size:15px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">${esc(m.title)}</div>
                ${m.description?`<div style="font-size:12px;color:var(--text-muted);margin-top:2px">${esc(m.description.slice(0,60))}</div>`:''}
                ${proj?`<div style="font-size:11px;color:var(--text-light);margin-top:3px"><i class="fas fa-film" style="margin-right:3px"></i>${esc(proj.title)}</div>`:''}
              </div>
            </div>
            <div style="display:flex;gap:4px">
              <button class="btn btn-ghost btn-icon btn-sm" onclick="event.stopPropagation();confirmDeleteStorymap('${m.id}')" title="削除"><i class="fas fa-trash" style="font-size:10px;color:var(--accent)"></i></button>
            </div>
          </div>
          <div style="display:flex;gap:12px;margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
            <span style="font-size:12px;color:var(--text-muted)"><i class="fas fa-layer-group" style="margin-right:4px;color:#6ab8f7"></i>${(m.acts||[]).length}幕</span>
            <span style="font-size:12px;color:var(--text-muted)"><i class="fas fa-film" style="margin-right:4px;color:#6ab8f7"></i>${sceneCount}シーン</span>
            <span style="font-size:12px;color:var(--text-muted);margin-left:auto"><i class="fas fa-clock" style="margin-right:4px"></i>${fmtDate(m.updatedAt)}</span>
          </div>
        </div>`;
      }).join('');

  return `<div style="max-width:960px;margin:0 auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:22px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif;margin-bottom:4px">🎬 ストーリーマップ</h1>
        <p style="font-size:13px;color:var(--text-muted)">幕・シーケンス・シーンを視覚的に設計</p>
      </div>
      <button class="btn btn-primary" onclick="openNewStorymapModal()"><i class="fas fa-plus"></i> 新しいマップ</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px">${cardsHtml}</div>
  </div>`;
}

function renderStorymapBoard(map) {
  const acts = map.acts || [];

  const actsHtml = acts.map((act, ai) => {
    const cards = act.cards || [];
    const cardsHtml = cards.map((card, ci) => renderSceneCard(card, map.id, ai, ci)).join('');
    const actColor = act.color || '#6ab8f7';

    return `<div class="smap-act-col" id="smap-act-${ai}" data-actidx="${ai}">
      <div class="smap-act-header" style="border-bottom:3px solid ${actColor}">
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
          <div style="width:10px;height:10px;border-radius:50%;background:${actColor};flex-shrink:0"></div>
          <span class="smap-act-title">${esc(act.title)}</span>
          <span class="smap-act-count">${cards.length}</span>
        </div>
        <div style="display:flex;gap:2px;flex-shrink:0">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="openEditActModal('${map.id}',${ai})" title="幕を編集"><i class="fas fa-pen" style="font-size:10px"></i></button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteAct('${map.id}',${ai})" title="幕を削除"><i class="fas fa-xmark" style="font-size:10px;color:var(--text-light)"></i></button>
        </div>
      </div>
      <div class="smap-cards-col" id="smcards-${ai}"
           ondragover="smapDragOver(event)"
           ondrop="smapDrop(event,'${map.id}',${ai})"
           ondragleave="this.closest('.smap-act-col').classList.remove('smap-drag-over')"
           ondragenter="this.closest('.smap-act-col').classList.add('smap-drag-over')">
        ${cardsHtml}
        <button class="smap-add-card-btn" onclick="addSceneCard('${map.id}',${ai})">
          <i class="fas fa-plus" style="font-size:11px"></i> シーンを追加
        </button>
      </div>
    </div>`;
  }).join('');

  return `<div class="smap-page-wrap">
    <!-- Map Topbar -->
    <div class="smap-topbar">
      <div style="display:flex;align-items:center;gap:10px;min-width:0">
        <button class="btn btn-ghost btn-sm" onclick="closeStorymapToList()"><i class="fas fa-arrow-left"></i></button>
        <div style="font-size:16px">🎬</div>
        <div style="min-width:0">
          <div style="font-size:15px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(map.title)}</div>
          ${map.description?`<div style="font-size:11px;color:var(--text-muted)">${esc(map.description)}</div>`:''}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <span style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:4px;background:var(--bg-subtle);padding:4px 10px;border-radius:12px">
          <i class="fas fa-layer-group"></i> ${acts.length}幕
        </span>
        <span style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:4px;background:var(--bg-subtle);padding:4px 10px;border-radius:12px">
          <i class="fas fa-film"></i> ${acts.reduce((a,act)=>a+(act.cards||[]).length,0)}シーン
        </span>
        <button class="btn btn-ghost btn-sm" onclick="addActToMap('${map.id}')"><i class="fas fa-plus"></i> 幕を追加</button>
      </div>
    </div>
    <!-- Board -->
    <div class="smap-board-wrap" id="smap-board">
      ${actsHtml}
      <div class="smap-add-act" onclick="addActToMap('${map.id}')">
        <i class="fas fa-plus" style="font-size:18px;color:var(--text-light)"></i>
        <span style="font-size:13px;color:var(--text-light)">幕を追加</span>
      </div>
    </div>
  </div>`;
}

function renderSceneCard(card, mapId, actIdx, cardIdx) {
  const sceneType = card.type || '';
  const tension = card.tension || 5;
  const typeColors = { '転換点':'var(--momo)','クライマックス':'var(--accent)','伏線':'var(--fuji)','解決':'var(--matcha)', };
  const typeColor = typeColors[sceneType] || 'var(--text-light)';

  return `<div class="smap-scene-card ${card.color && card.color!=='#ffffff'?'colored':''}"
       id="sc-${card.id}"
       draggable="true"
       ondragstart="smapDragStart(event,'${card.id}','${mapId}',${actIdx})"
       ondragend="smapDragEnd(event)"
       style="${card.color&&card.color!=='#ffffff'?`background:${card.color}18;`:''}border-left:3px solid ${typeColor}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
      <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0">
        ${sceneType?`<span style="font-size:9px;padding:1px 6px;border-radius:6px;background:${typeColor}22;color:${typeColor};font-weight:600;white-space:nowrap">${sceneType}</span>`:''}
        <span style="font-size:10px;color:var(--text-light);white-space:nowrap">#{${cardIdx+1}}</span>
      </div>
      <div style="display:flex;gap:1px;opacity:0;transition:opacity .15s" class="scene-card-actions">
        <button class="btn btn-ghost btn-icon" style="width:20px;height:20px;padding:0" onclick="openEditSceneCard('${card.id}','${mapId}',${actIdx})" title="編集"><i class="fas fa-pen" style="font-size:9px"></i></button>
        <button class="btn btn-ghost btn-icon" style="width:20px;height:20px;padding:0" onclick="deleteSceneCard('${card.id}','${mapId}',${actIdx})" title="削除"><i class="fas fa-xmark" style="font-size:9px;color:var(--text-light)"></i></button>
      </div>
    </div>
    <div style="font-size:12.5px;font-weight:700;color:var(--text-primary);line-height:1.4;margin-bottom:4px">${esc(card.title)}</div>
    ${card.synopsis?`<div style="font-size:11px;color:var(--text-secondary);line-height:1.5">${esc(card.synopsis.slice(0,80))}${card.synopsis.length>80?'…':''}</div>`:''}
    ${card.location?`<div style="font-size:10px;color:var(--text-muted);margin-top:4px"><i class="fas fa-map-marker-alt" style="margin-right:2px;color:var(--asagi)"></i>${esc(card.location)}</div>`:''}
    ${(card.characters||[]).length>0?`<div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:4px">${card.characters.map(c=>`<span style="font-size:10px;padding:1px 5px;background:var(--fuji-bg);color:var(--fuji);border-radius:5px">${esc(c)}</span>`).join('')}</div>`:''}
    ${card.emotion?`<div style="font-size:10px;color:var(--momo);margin-top:4px"><i class="fas fa-heart" style="margin-right:2px"></i>${esc(card.emotion)}</div>`:''}
    <!-- テンションバー -->
    <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:var(--bg-hover);border-radius:0 0 var(--radius-sm) var(--radius-sm);overflow:hidden">
      <div style="height:100%;width:${tension*10}%;background:${tension>7?'var(--accent)':tension>4?'var(--kogane)':'var(--fuji)'};border-radius:2px;transition:width .3s"></div>
    </div>
  </div>`;
}

// ── StoryMap Functions ──────────────────────────────────────
function openStorymap(mapId) { StorymapState.currentMapId = mapId; render(); }
function closeStorymapToList() { StorymapState.currentMapId = null; BoardState.listTab = 'maps'; render(); }

function addActToMap(mapId) {
  const map = STORYMAP_DB.getMap(mapId);
  if (!map) return;
  const colors = ['#6ab8f7','#f76ca0','#6af7a0','#f7c56a','#c86af7','#f76a6a','#6af7f7'];
  const actNum = (map.acts||[]).length + 1;
  map.acts = [...(map.acts||[]), { id:uid(), title:`第${actNum}幕`, color:colors[(actNum-1)%colors.length], cards:[] }];
  map.updatedAt = now();
  STORYMAP_DB.saveMap(map);
  render();
}

function deleteAct(mapId, actIdx) {
  const map = STORYMAP_DB.getMap(mapId);
  if (!map || !map.acts[actIdx]) return;
  if ((map.acts[actIdx].cards||[]).length > 0) {
    if (!confirm(`「${map.acts[actIdx].title}」の${map.acts[actIdx].cards.length}シーンも削除されます。続けますか？`)) return;
  }
  map.acts.splice(actIdx, 1);
  map.updatedAt = now();
  STORYMAP_DB.saveMap(map);
  render();
}

function openEditActModal(mapId, actIdx) {
  const map = STORYMAP_DB.getMap(mapId);
  if (!map) return;
  const act = map.acts[actIdx];
  openModal(
    `<i class="fas fa-pen" style="color:var(--fuji)"></i> 幕を編集`,
    `<div class="form-group"><label class="form-label">幕のタイトル</label><input class="form-input" id="ea-title" value="${esc(act.title)}" autofocus></div>
     <div class="form-group"><label class="form-label">幕のカラー</label>
       <div style="display:flex;gap:8px;flex-wrap:wrap">
         ${['#6ab8f7','#f76ca0','#6af7a0','#f7c56a','#c86af7','#f76a6a','#6af7f7','#7c6af7'].map(c=>`
           <div onclick="document.getElementById('ea-color').value='${c}'" style="width:26px;height:26px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${act.color===c?'var(--text-primary)':'transparent'}"></div>`).join('')}
         <input type="color" id="ea-color" value="${act.color||'#6ab8f7'}" style="width:26px;height:26px;border:none;padding:0;cursor:pointer;border-radius:50%">
       </div>
     </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveEditAct('${mapId}',${actIdx})">保存</button>`
  );
}

function saveEditAct(mapId, actIdx) {
  const map = STORYMAP_DB.getMap(mapId);
  if (!map) return;
  map.acts[actIdx].title = document.getElementById('ea-title')?.value?.trim() || map.acts[actIdx].title;
  map.acts[actIdx].color = document.getElementById('ea-color')?.value || map.acts[actIdx].color;
  map.updatedAt = now();
  STORYMAP_DB.saveMap(map);
  closeModal(); render();
}

function addSceneCard(mapId, actIdx) {
  const map = STORYMAP_DB.getMap(mapId);
  if (!map) return;
  openModal(
    `<i class="fas fa-plus" style="color:var(--fuji)"></i> シーンを追加`,
    `<div class="form-group"><label class="form-label">シーンタイトル <span style="color:var(--accent)">*</span></label><input class="form-input" id="asc-title" placeholder="例: 主人公と犯人の対面" autofocus></div>
     <div class="form-group"><label class="form-label">あらすじ</label><textarea class="form-textarea" id="asc-synopsis" rows="3" placeholder="このシーンで何が起きるか…"></textarea></div>
     <div class="grid-2">
       <div class="form-group"><label class="form-label">場所</label><input class="form-input" id="asc-loc" placeholder="例: 警察署 取調室"></div>
       <div class="form-group"><label class="form-label">シーンタイプ</label>
         <select class="form-select" id="asc-type"><option value="">通常</option>${SCENE_TYPES.map(t=>`<option>${t}</option>`).join('')}</select>
       </div>
     </div>
     <div class="grid-2">
       <div class="form-group"><label class="form-label">感情</label>
         <select class="form-select" id="asc-emotion"><option value="">未設定</option>${EMOTION_LIST.map(e=>`<option>${e}</option>`).join('')}</select>
       </div>
       <div class="form-group"><label class="form-label">テンション (5/10)</label>
         <input type="range" id="asc-tension" min="1" max="10" value="5" style="width:100%;margin-top:8px">
       </div>
     </div>
     <div class="form-group"><label class="form-label">登場キャラクター（カンマ区切り）</label><input class="form-input" id="asc-chars" placeholder="田中, 山田"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveSceneCard('${mapId}',${actIdx})"><i class="fas fa-plus"></i> 追加</button>`
  );
}

function saveSceneCard(mapId, actIdx) {
  const title = document.getElementById('asc-title')?.value?.trim();
  if (!title) { toast('シーンタイトルを入力してください', 'error'); return; }
  const map = STORYMAP_DB.getMap(mapId);
  if (!map) return;
  const act = map.acts[actIdx];
  if (!act) return;
  const chars = document.getElementById('asc-chars')?.value?.split(/[,、]/).map(s=>s.trim()).filter(Boolean)||[];
  const card = newSceneCard({
    title,
    synopsis: document.getElementById('asc-synopsis')?.value?.trim()||'',
    location: document.getElementById('asc-loc')?.value?.trim()||'',
    type: document.getElementById('asc-type')?.value||'',
    emotion: document.getElementById('asc-emotion')?.value||'',
    tension: parseInt(document.getElementById('asc-tension')?.value||'5'),
    characters: chars,
    order: (act.cards||[]).length,
  });
  act.cards = [...(act.cards||[]), card];
  map.updatedAt = now();
  STORYMAP_DB.saveMap(map);
  closeModal(); toast('シーンを追加しました', 'success'); render();
}

function openEditSceneCard(cardId, mapId, actIdx) {
  const map = STORYMAP_DB.getMap(mapId);
  if (!map) return;
  const act = map.acts[actIdx];
  if (!act) return;
  const card = (act.cards||[]).find(c=>c.id===cardId);
  if (!card) return;

  openModal(
    `<i class="fas fa-pen" style="color:var(--fuji)"></i> シーンを編集`,
    `<div class="form-group"><label class="form-label">シーンタイトル</label><input class="form-input" id="esc-title" value="${esc(card.title)}"></div>
     <div class="form-group"><label class="form-label">あらすじ</label><textarea class="form-textarea" id="esc-synopsis" rows="3">${esc(card.synopsis||'')}</textarea></div>
     <div class="grid-2">
       <div class="form-group"><label class="form-label">場所</label><input class="form-input" id="esc-loc" value="${esc(card.location||'')}"></div>
       <div class="form-group"><label class="form-label">シーンタイプ</label>
         <select class="form-select" id="esc-type"><option value="">通常</option>${SCENE_TYPES.map(t=>`<option ${card.type===t?'selected':''}>${t}</option>`).join('')}</select>
       </div>
     </div>
     <div class="grid-2">
       <div class="form-group"><label class="form-label">感情</label>
         <select class="form-select" id="esc-emotion"><option value="">未設定</option>${EMOTION_LIST.map(e=>`<option ${card.emotion===e?'selected':''}>${e}</option>`).join('')}</select>
       </div>
       <div class="form-group"><label class="form-label">テンション (${card.tension||5}/10)</label>
         <input type="range" id="esc-tension" min="1" max="10" value="${card.tension||5}" style="width:100%;margin-top:8px">
       </div>
     </div>
     <div class="form-group"><label class="form-label">登場キャラクター（カンマ区切り）</label><input class="form-input" id="esc-chars" value="${esc((card.characters||[]).join(', '))}"></div>
     <div class="form-group"><label class="form-label">メモ</label><textarea class="form-textarea" id="esc-notes" rows="2">${esc(card.notes||'')}</textarea></div>
     <div class="form-group"><label class="form-label">カードカラー</label>
       <div style="display:flex;gap:6px;flex-wrap:wrap">
         ${['#ffffff','#fff9e6','#e8f4fd','#fde8e8','#e8fde8','#f3e8fd','#fde8f0','#e8fdfd'].map(c=>`<div onclick="document.getElementById('esc-color').value='${c}'" style="width:22px;height:22px;border-radius:50%;background:${c};border:2px solid ${card.color===c?'var(--fuji)':'var(--border)'};cursor:pointer"></div>`).join('')}
         <input type="color" id="esc-color" value="${card.color||'#ffffff'}" style="width:22px;height:22px;border:none;padding:0;cursor:pointer;border-radius:50%">
       </div>
     </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-danger btn-sm" onclick="deleteSceneCard('${cardId}','${mapId}',${actIdx});closeModal()"><i class="fas fa-trash"></i></button>
     <button class="btn btn-primary" onclick="saveEditSceneCard('${cardId}','${mapId}',${actIdx})"><i class="fas fa-floppy-disk"></i> 保存</button>`,
    { size: 'modal-lg' }
  );
}

function saveEditSceneCard(cardId, mapId, actIdx) {
  const map = STORYMAP_DB.getMap(mapId);
  if (!map) return;
  const act = map.acts[actIdx];
  const cardIdx = (act.cards||[]).findIndex(c=>c.id===cardId);
  if (cardIdx<0) return;
  const chars = document.getElementById('esc-chars')?.value?.split(/[,、]/).map(s=>s.trim()).filter(Boolean)||[];
  act.cards[cardIdx] = { ...act.cards[cardIdx],
    title: document.getElementById('esc-title')?.value?.trim()||'',
    synopsis: document.getElementById('esc-synopsis')?.value||'',
    location: document.getElementById('esc-loc')?.value?.trim()||'',
    type: document.getElementById('esc-type')?.value||'',
    emotion: document.getElementById('esc-emotion')?.value||'',
    tension: parseInt(document.getElementById('esc-tension')?.value||'5'),
    characters: chars,
    notes: document.getElementById('esc-notes')?.value||'',
    color: document.getElementById('esc-color')?.value||'#ffffff',
    updatedAt: now(),
  };
  map.updatedAt = now();
  STORYMAP_DB.saveMap(map);
  closeModal(); toast('シーンを保存しました', 'success'); render();
}

function deleteSceneCard(cardId, mapId, actIdx) {
  const map = STORYMAP_DB.getMap(mapId);
  if (!map) return;
  map.acts[actIdx].cards = (map.acts[actIdx].cards||[]).filter(c=>c.id!==cardId);
  map.updatedAt = now();
  STORYMAP_DB.saveMap(map);
  document.getElementById('sc-'+cardId)?.remove();
  toast('シーンを削除しました', 'info');
}

// ── StoryMap DnD ─────────────────────────────────────────────
const SmapDrag = { cardId:null, mapId:null, fromActIdx:null };
function smapDragStart(ev, cardId, mapId, actIdx) { SmapDrag.cardId=cardId; SmapDrag.mapId=mapId; SmapDrag.fromActIdx=actIdx; ev.dataTransfer.effectAllowed='move'; ev.currentTarget.style.opacity='0.5'; }
function smapDragEnd(ev) { ev.currentTarget.style.opacity=''; $$('.smap-act-col').forEach(c=>c.classList.remove('smap-drag-over')); }
function smapDragOver(ev) { ev.preventDefault(); ev.dataTransfer.dropEffect='move'; }
function smapDrop(ev, mapId, toActIdx) {
  ev.preventDefault();
  $$('.smap-act-col').forEach(c=>c.classList.remove('smap-drag-over'));
  if (!SmapDrag.cardId) return;
  const map = STORYMAP_DB.getMap(mapId);
  if (!map) return;
  const fromAct = map.acts[SmapDrag.fromActIdx];
  const toAct = map.acts[toActIdx];
  if (!fromAct||!toAct) return;
  const cardIdx = fromAct.cards.findIndex(c=>c.id===SmapDrag.cardId);
  if (cardIdx<0) return;
  const [card] = fromAct.cards.splice(cardIdx, 1);
  card.updatedAt = now();
  toAct.cards.push(card);
  map.updatedAt = now();
  STORYMAP_DB.saveMap(map);
  SmapDrag.cardId=null;
  render();
}

// ── StoryMap Modals ──────────────────────────────────────────
function openNewStorymapModal() {
  const projects = DB.getProjects();
  const structs = [
    { id:'3act', label:'三幕構成（標準）', acts:['第一幕','第二幕','第三幕'] },
    { id:'4act', label:'四幕構成（起承転結）', acts:['起','承','転','結'] },
    { id:'hero', label:'英雄の旅（二幕）', acts:['出発','帰還'] },
    { id:'blank', label:'カスタム（空白）', acts:[] },
  ];
  openModal(
    `<i class="fas fa-plus" style="color:var(--fuji)"></i> ストーリーマップを作成`,
    `<div class="form-group"><label class="form-label">マップ名 <span style="color:var(--accent)">*</span></label><input class="form-input" id="nsm-title" placeholder="例: 第1話 構成マップ" autofocus></div>
     <div class="form-group"><label class="form-label">説明</label><input class="form-input" id="nsm-desc" placeholder="このマップの目的…"></div>
     <div class="form-group"><label class="form-label">リンクする作品</label>
       <select class="form-select" id="nsm-proj"><option value="">なし</option>${projects.map(p=>`<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select>
     </div>
     <div class="form-group"><label class="form-label">構成テンプレート</label>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
         ${structs.map(s=>`<div class="smap-struct-opt" id="sopt-${s.id}" onclick="selectMapStruct('${s.id}')" style="border:2px solid ${s.id==='3act'?'var(--fuji)':'var(--border)'}">
           <div style="font-size:12px;font-weight:600;color:var(--text-primary)">${s.label}</div>
           <div style="font-size:11px;color:var(--text-muted)">${s.acts.join(' → ')||'自由設計'}</div>
         </div>`).join('')}
       </div>
     </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveNewStorymap()"><i class="fas fa-plus"></i> 作成</button>`
  );
  _selectedMapStruct = '3act';
}
let _selectedMapStruct = '3act';
function selectMapStruct(structId) {
  _selectedMapStruct = structId;
  $$('[id^=sopt-]').forEach(el=>el.style.border='2px solid var(--border)');
  document.getElementById('sopt-'+structId).style.border='2px solid var(--fuji)';
}
function saveNewStorymap() {
  const title = document.getElementById('nsm-title')?.value?.trim();
  if (!title) { toast('マップ名を入力してください','error'); return; }
  const structs = {
    '3act': [{id:uid(),title:'第一幕 (Act I)',color:'#6ab8f7',cards:[]},{id:uid(),title:'第二幕 (Act II)',color:'#f76ca0',cards:[]},{id:uid(),title:'第三幕 (Act III)',color:'#6af7a0',cards:[]}],
    '4act': [{id:uid(),title:'起',color:'#f7c56a',cards:[]},{id:uid(),title:'承',color:'#6ab8f7',cards:[]},{id:uid(),title:'転',color:'#f76ca0',cards:[]},{id:uid(),title:'結',color:'#6af7a0',cards:[]}],
    'hero': [{id:uid(),title:'出発',color:'#6ab8f7',cards:[]},{id:uid(),title:'帰還',color:'#6af7a0',cards:[]}],
    'blank': [],
  };
  const map = newStoryMap({
    title,
    description: document.getElementById('nsm-desc')?.value?.trim()||'',
    projectId: document.getElementById('nsm-proj')?.value||null,
    acts: structs[_selectedMapStruct] || [],
  });
  STORYMAP_DB.saveMap(map);
  closeModal(); toast(`「${title}」を作成しました`,'success');
  StorymapState.currentMapId = map.id;
  render();
}

function confirmDeleteStorymap(mapId) {
  const map = STORYMAP_DB.getMap(mapId);
  if (!map) return;
  openModal(
    `<i class="fas fa-trash" style="color:var(--accent)"></i> マップを削除`,
    `<div style="text-align:center;padding:16px 0">
      <div style="font-size:40px;margin-bottom:12px">🗑️</div>
      <div style="font-size:14px;color:var(--text-primary);margin-bottom:8px;font-weight:600">「${esc(map.title)}」を削除しますか？</div>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.7">この操作は元に戻せません。</div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-danger" onclick="deleteStorymap('${mapId}')"><i class="fas fa-trash"></i> 削除</button>`
  );
}
function deleteStorymap(mapId) {
  STORYMAP_DB.deleteMap(mapId);
  closeModal();
  if (StorymapState.currentMapId===mapId) StorymapState.currentMapId=null;
  toast('マップを削除しました','info'); render();
}

// ================================================================
//  STORY BOARD — Phase 3 スーパーボード機能
// ================================================================

// ── Board DB ──────────────────────────────────────────────────
const BOARD_DB = {
  getBoards() { return DB.get('boards', []); },
  saveBoards(bs) { DB.set('boards', bs); },
  getBoard(id) { return this.getBoards().find(b => b.id === id) || null; },
  saveBoard(board) {
    const bs = this.getBoards();
    const idx = bs.findIndex(b => b.id === board.id);
    if (idx >= 0) bs[idx] = board; else bs.unshift(board);
    this.saveBoards(bs);
  },
  deleteBoard(id) { this.saveBoards(this.getBoards().filter(b => b.id !== id)); },
  getCards(boardId) {
    const b = this.getBoard(boardId);
    return b ? (b.cards || []) : [];
  },
  saveCards(boardId, cards) {
    const b = this.getBoard(boardId);
    if (b) { b.cards = cards; b.updatedAt = now(); this.saveBoard(b); }
  },
};

function newBoard(data = {}) {
  return {
    id: uid(),
    title: data.title || '新しいボード',
    description: data.description || '',
    projectId: data.projectId || null,
    color: data.color || '#7c6af7',
    icon: data.icon || 'fa-table-cells-large',
    columns: data.columns || ['アイデア','構成中','完成','保留'],
    cards: data.cards || [],
    connectors: data.connectors || [],
    tags: data.tags || [],
    createdAt: now(),
    updatedAt: now(),
  };
}

function newCard(data = {}) {
  return {
    id: uid(),
    title: data.title || '新しいカード',
    body: data.body || '',
    column: data.column || 0,
    color: data.color || '#ffffff',
    label: data.label || '',
    labelColor: data.labelColor || 'var(--fuji)',
    priority: data.priority || 'medium', // low/medium/high/urgent
    tags: data.tags || [],
    // 裏面データ
    back: {
      notes: data.back?.notes || '',
      characters: data.back?.characters || [],
      emotion: data.back?.emotion || '',
      tension: data.back?.tension || 5,
      sceneDetail: data.back?.sceneDetail || '',
      nextScenes: data.back?.nextScenes || [],
      references: data.back?.references || '',
      checklist: data.back?.checklist || [],
      storyFunction: data.back?.storyFunction || '',
    },
    // メタ
    pinned: data.pinned || false,
    flipped: false,
    order: data.order || 0,
    createdAt: now(),
    updatedAt: now(),
    dueDate: data.dueDate || '',
    attachedTo: data.attachedTo || null, // プロジェクトID
    connectedCards: data.connectedCards || [],
  };
}

// ── Board State ─────────────────────────────────────────────
const BoardState = {
  currentBoardId: null,
  view: 'kanban', // kanban | grid | timeline | mindmap
  filter: { label: '', priority: '', tag: '', search: '' },
  dragCard: null,
  dragCol: null,
  flippedCards: new Set(),
  listTab: 'boards', // boards | maps (統合タブ)
};

// ── CARD LABEL COLORS ───────────────────────────────────────
const CARD_LABELS = [
  { name:'シーン',      color:'#6ab8f7', bg:'#e8f4fd' },
  { name:'キャラクター',color:'#c86af7', bg:'#f3e8fd' },
  { name:'テーマ',      color:'#f76ca0', bg:'#fde8f0' },
  { name:'プロット',    color:'#6af7a0', bg:'#e8fdf0' },
  { name:'セリフ',      color:'#f7c56a', bg:'#fdf5e8' },
  { name:'設定・舞台',  color:'#6af7f7', bg:'#e8fdfd' },
  { name:'伏線',        color:'#f76a6a', bg:'#fde8e8' },
  { name:'感情',        color:'#f7a06a', bg:'#fdf0e8' },
  { name:'リサーチ',    color:'#7c6af7', bg:'#ebe8fd' },
  { name:'メモ',        color:'#a0a0a0', bg:'#f0f0f0' },
];

const PRIORITY_CONFIG = {
  low:    { label:'低',   icon:'fa-arrow-down',   color:'#6ab8f7', bg:'#e8f4fd' },
  medium: { label:'中',   icon:'fa-minus',        color:'#f7c56a', bg:'#fdf5e8' },
  high:   { label:'高',   icon:'fa-arrow-up',     color:'#f76a6a', bg:'#fde8e8' },
  urgent: { label:'緊急', icon:'fa-exclamation',  color:'#f76ca0', bg:'#fde8f0' },
};

const EMOTION_LIST = ['喜び','悲しみ','怒り','恐れ','驚き','嫌悪','期待','信頼','緊張','安堵','絶望','希望','好奇心','羞恥','嫉妬'];
const STORY_FUNCTIONS = ['日常を示す','事件の発端','関係性の構築','対立の激化','転換点','クライマックス','解決・カタルシス','余韻・エピローグ','伏線設置','伏線回収','キャラクターの成長','情報提示','テーマの明示'];

// ── Render Board Page ────────────────────────────────────────
function renderBoardPage() {
  const boards = BOARD_DB.getBoards();
  const currentBoard = BoardState.currentBoardId ? BOARD_DB.getBoard(BoardState.currentBoardId) : null;

  // シーンマップが開かれている場合はそちらを優先表示
  if (StorymapState.currentMapId) {
    const currentMap = STORYMAP_DB.getMap(StorymapState.currentMapId);
    if (currentMap) return renderStorymapBoard(currentMap);
    StorymapState.currentMapId = null; // マップが見つからない場合はリセット
  }

  if (!currentBoard) {
    return renderBoardList(boards);
  }
  return renderBoardKanban(currentBoard);
}

function renderBoardList(boards) {
  const projects = DB.getProjects();
  const boardCards = boards.length === 0
    ? `<div style="text-align:center;padding:80px 20px;color:var(--text-muted)">
        <div style="font-size:60px;margin-bottom:20px;opacity:0.25">🗂️</div>
        <div style="font-size:16px;font-weight:700;margin-bottom:8px;font-family:'Noto Serif JP',serif">ボードがありません</div>
        <div style="font-size:13px;margin-bottom:24px;line-height:1.7">ストーリーボードを作成して<br>カードで物語を視覚的に整理しましょう</div>
        <button class="btn btn-primary btn-lg" onclick="openNewBoardModal()"><i class="fas fa-plus"></i> 最初のボードを作成</button>
      </div>`
    : boards.map(b => {
        const cardCount = (b.cards || []).length;
        const proj = b.projectId ? projects.find(p => p.id === b.projectId) : null;
        return `
        <div class="board-list-card" onclick="openBoard('${b.id}')" style="border-left:4px solid ${b.color || '#7c6af7'}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div style="display:flex;gap:12px;align-items:center">
              <div style="width:40px;height:40px;border-radius:var(--radius-sm);background:${b.color}22;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">
                <i class="fas ${b.icon || 'fa-table-cells-large'}" style="color:${b.color}"></i>
              </div>
              <div>
                <div style="font-size:15px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">${esc(b.title)}</div>
                ${b.description ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px">${esc(b.description.slice(0,60))}${b.description.length>60?'…':''}</div>` : ''}
                ${proj ? `<div style="font-size:11px;color:var(--text-light);margin-top:3px"><i class="fas fa-film" style="margin-right:3px"></i>${esc(proj.title)}</div>` : ''}
              </div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0">
              <button class="btn btn-ghost btn-icon btn-sm" onclick="event.stopPropagation();openEditBoardModal('${b.id}')" title="編集"><i class="fas fa-pen" style="font-size:10px"></i></button>
              <button class="btn btn-ghost btn-icon btn-sm" onclick="event.stopPropagation();confirmDeleteBoard('${b.id}')" title="削除"><i class="fas fa-trash" style="font-size:10px;color:var(--accent)"></i></button>
            </div>
          </div>
          <div style="display:flex;gap:12px;margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
            <span style="font-size:12px;color:var(--text-muted)"><i class="fas fa-clone" style="margin-right:4px;color:${b.color}"></i>${cardCount}枚のカード</span>
            <span style="font-size:12px;color:var(--text-muted)"><i class="fas fa-columns" style="margin-right:4px;color:${b.color}"></i>${(b.columns||[]).length}列</span>
            <span style="font-size:12px;color:var(--text-muted);margin-left:auto"><i class="fas fa-clock" style="margin-right:4px"></i>${fmtDate(b.updatedAt)}</span>
          </div>
        </div>`;
      }).join('');

  // ── ストーリーマップ統合タブ ──
  const maps = STORYMAP_DB.getMaps();
  const boardTab = BoardState.listTab || 'boards';

  const mapCardsHtml = maps.length === 0
    ? `<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
        <div style="font-size:52px;margin-bottom:16px;opacity:0.2">🎬</div>
        <div style="font-size:15px;font-weight:700;margin-bottom:6px;font-family:'Noto Serif JP',serif">シーンマップがありません</div>
        <div style="font-size:12px;margin-bottom:20px;line-height:1.7;color:var(--text-muted)">幕・シーンを横スクロールで視覚的に設計</div>
        <button class="btn btn-primary" onclick="openNewStorymapModal()"><i class="fas fa-plus"></i> 最初のマップを作成</button>
      </div>`
    : maps.map(m => {
        const proj = m.projectId ? projects.find(p => p.id === m.projectId) : null;
        const sceneCount = (m.acts||[]).reduce((a,act) => a+(act.cards||[]).length, 0);
        return `
        <div class="board-list-card" onclick="openStorymap('${m.id}')" style="border-left:4px solid #6ab8f7">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div style="display:flex;gap:12px;align-items:center">
              <div style="width:40px;height:40px;border-radius:var(--radius-sm);background:#e8f4fd;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🎬</div>
              <div>
                <div style="font-size:15px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">${esc(m.title)}</div>
                ${m.description ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px">${esc(m.description.slice(0,60))}${m.description.length>60?'…':''}</div>` : ''}
                ${proj ? `<div style="font-size:11px;color:var(--text-light);margin-top:3px"><i class="fas fa-film" style="margin-right:3px"></i>${esc(proj.title)}</div>` : ''}
              </div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0">
              <button class="btn btn-ghost btn-icon btn-sm" onclick="event.stopPropagation();confirmDeleteStorymap('${m.id}')" title="削除"><i class="fas fa-trash" style="font-size:10px;color:var(--accent)"></i></button>
            </div>
          </div>
          <div style="display:flex;gap:12px;margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
            <span style="font-size:12px;color:var(--text-muted)"><i class="fas fa-layer-group" style="margin-right:4px;color:#6ab8f7"></i>${(m.acts||[]).length}幕</span>
            <span style="font-size:12px;color:var(--text-muted)"><i class="fas fa-film" style="margin-right:4px;color:#6ab8f7"></i>${sceneCount}シーン</span>
            <span style="font-size:12px;color:var(--text-muted);margin-left:auto"><i class="fas fa-clock" style="margin-right:4px"></i>${fmtDate(m.updatedAt)}</span>
          </div>
        </div>`;
      }).join('');

  return `
  <div style="max-width:1020px;margin:0 auto;padding:0 4px">
    <!-- ヘッダー -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:22px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif;margin-bottom:4px">
          <i class="fas fa-film" style="color:var(--fuji);margin-right:8px"></i>ストーリーボード
        </h1>
        <p style="font-size:13px;color:var(--text-muted)">カンバンボードとシーンマップで物語を視覚的に設計</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${boardTab === 'boards'
          ? `<button class="btn btn-primary" onclick="openNewBoardModal()"><i class="fas fa-plus"></i> 新しいボード</button>`
          : `<button class="btn btn-primary" onclick="openNewStorymapModal()"><i class="fas fa-plus"></i> 新しいマップ</button>`
        }
      </div>
    </div>
    <!-- タブ切り替え -->
    <div class="sb-list-tabs">
      <button class="sb-list-tab ${boardTab==='boards'?'active':''}" onclick="setBoardListTab('boards')">
        <i class="fas fa-table-cells-large"></i> カンバンボード <span class="sb-tab-count">${boards.length}</span>
      </button>
      <button class="sb-list-tab ${boardTab==='maps'?'active':''}" onclick="setBoardListTab('maps')">
        <i class="fas fa-film"></i> シーンマップ <span class="sb-tab-count">${maps.length}</span>
      </button>
    </div>
    <!-- コンテンツ -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;margin-top:16px">
      ${boardTab === 'boards' ? boardCards : mapCardsHtml}
    </div>
  </div>`;
}

function renderBoardKanban(board) {
  const cards = board.cards || [];
  const columns = board.columns || ['アイデア','構成中','完成','保留'];
  const f = BoardState.filter;

  const filteredCards = cards.filter(c => {
    if (f.search && !c.title.includes(f.search) && !c.body.includes(f.search)) return false;
    if (f.label && c.label !== f.label) return false;
    if (f.priority && c.priority !== f.priority) return false;
    if (f.tag && !c.tags.includes(f.tag)) return false;
    return true;
  });

  const allTags = [...new Set(cards.flatMap(c => c.tags))];
  const totalCards = cards.length;
  const pinnedCount = cards.filter(c => c.pinned).length;
  const highPriority = cards.filter(c => c.priority === 'high' || c.priority === 'urgent').length;

  const colHtml = columns.map((col, ci) => {
    const colCards = filteredCards.filter(c => c.column === ci).sort((a,b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (a.order||0) - (b.order||0);
    });

    const cardHtml = colCards.map(c => renderBoardCard(c, board.id)).join('');

    return `
    <div class="board-column" data-col="${ci}" 
         ondragover="boardDragOver(event)" 
         ondrop="boardDrop(event,'${board.id}',${ci})"
         ondragleave="this.classList.remove('drag-over')">
      <div class="board-col-header">
        <div style="display:flex;align-items:center;gap:8px;min-width:0">
          <span class="board-col-title">${esc(col)}</span>
          <span class="board-col-count">${colCards.length}</span>
        </div>
        <div style="display:flex;gap:3px">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="addQuickCard('${board.id}',${ci})" title="カードを追加">
            <i class="fas fa-plus" style="font-size:10px"></i>
          </button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="openEditColumnModal('${board.id}',${ci})" title="列を編集">
            <i class="fas fa-pen" style="font-size:10px"></i>
          </button>
        </div>
      </div>
      <div class="board-col-cards" id="col-${ci}" 
           ondragenter="this.closest('.board-column').classList.add('drag-over')">
        ${cardHtml}
        <button class="board-add-card-btn" onclick="addQuickCard('${board.id}',${ci})">
          <i class="fas fa-plus" style="font-size:11px"></i> カードを追加
        </button>
      </div>
    </div>`;
  }).join('');

  return `
  <div class="board-page-wrap">
    <!-- Board Topbar -->
    <div class="board-topbar">
      <div style="display:flex;align-items:center;gap:12px;min-width:0">
        <button class="btn btn-ghost btn-sm" onclick="closeBoardToList()">
          <i class="fas fa-arrow-left"></i>
        </button>
        <div style="width:32px;height:32px;border-radius:var(--radius-sm);background:${board.color}22;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="fas ${board.icon}" style="color:${board.color};font-size:14px"></i>
        </div>
        <div style="min-width:0">
          <div style="font-size:15px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(board.title)}</div>
          ${board.description ? `<div style="font-size:11px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(board.description)}</div>` : ''}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        <!-- 統計チップ -->
        <span class="board-stat-chip"><i class="fas fa-clone"></i> ${totalCards}</span>
        ${pinnedCount > 0 ? `<span class="board-stat-chip" style="color:var(--kogane)"><i class="fas fa-thumbtack"></i> ${pinnedCount}</span>` : ''}
        ${highPriority > 0 ? `<span class="board-stat-chip" style="color:var(--accent)"><i class="fas fa-exclamation-triangle"></i> ${highPriority}</span>` : ''}
        <!-- 検索 -->
        <input class="board-search-input" id="board-search" placeholder="カードを検索…" value="${esc(f.search)}" oninput="boardSearch(this.value,'${board.id}')">
        <!-- フィルター -->
        <button class="btn btn-ghost btn-sm" onclick="toggleBoardFilterPanel('${board.id}')" title="フィルター">
          <i class="fas fa-filter"></i>
        </button>
        <!-- 列追加 -->
        <button class="btn btn-ghost btn-sm" onclick="openAddColumnModal('${board.id}')" title="列を追加">
          <i class="fas fa-plus"></i> 列
        </button>
        <!-- ボード設定 -->
        <button class="btn btn-ghost btn-sm" onclick="openEditBoardModal('${board.id}')" title="ボード設定">
          <i class="fas fa-gear"></i>
        </button>
      </div>
    </div>

    <!-- Filter Panel (hidden by default) -->
    <div class="board-filter-panel" id="board-filter-panel" style="display:none">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span style="font-size:12px;font-weight:600;color:var(--text-secondary)">フィルター:</span>
        <select class="form-select" style="width:auto;padding:4px 8px;font-size:12px;height:32px" onchange="setBoardFilter('${board.id}','label',this.value)">
          <option value="">すべてのラベル</option>
          ${CARD_LABELS.map(l => `<option value="${l.name}" ${f.label===l.name?'selected':''}>${l.name}</option>`).join('')}
        </select>
        <select class="form-select" style="width:auto;padding:4px 8px;font-size:12px;height:32px" onchange="setBoardFilter('${board.id}','priority',this.value)">
          <option value="">すべての優先度</option>
          ${Object.entries(PRIORITY_CONFIG).map(([k,v]) => `<option value="${k}" ${f.priority===k?'selected':''}>${v.label}</option>`).join('')}
        </select>
        ${allTags.length > 0 ? `<select class="form-select" style="width:auto;padding:4px 8px;font-size:12px;height:32px" onchange="setBoardFilter('${board.id}','tag',this.value)">
          <option value="">すべてのタグ</option>
          ${allTags.map(t => `<option value="${t}" ${f.tag===t?'selected':''}>${esc(t)}</option>`).join('')}
        </select>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="clearBoardFilters('${board.id}')"><i class="fas fa-xmark"></i> クリア</button>
      </div>
    </div>

    <!-- Kanban Board -->
    <div class="board-kanban-wrap" id="board-kanban">
      ${colHtml}
      <!-- 列追加ゾーン -->
      <div class="board-add-column" onclick="openAddColumnModal('${board.id}')">
        <i class="fas fa-plus" style="font-size:16px;color:var(--text-light)"></i>
        <span style="font-size:13px;color:var(--text-light)">列を追加</span>
      </div>
    </div>
  </div>`;
}

function renderBoardCard(card, boardId) {
  const isFlipped = BoardState.flippedCards.has(card.id);
  const pri = PRIORITY_CONFIG[card.priority] || PRIORITY_CONFIG.medium;
  const label = CARD_LABELS.find(l => l.name === card.label);
  const checkTotal = (card.back?.checklist || []).length;
  const checkDone = (card.back?.checklist || []).filter(i => i.done).length;

  if (isFlipped) {
    return renderCardBack(card, boardId);
  }

  return `
  <div class="board-card ${card.pinned ? 'pinned' : ''}" 
       id="bc-${card.id}"
       draggable="true"
       ondragstart="boardDragStart(event,'${card.id}','${boardId}')"
       ondragend="boardDragEnd(event)"
       style="border-left:3px solid ${pri.color};${card.color && card.color !== '#ffffff' ? `background:${card.color}18;` : ''}">
    <!-- Card Header -->
    <div class="board-card-header">
      <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1">
        ${card.pinned ? `<i class="fas fa-thumbtack" style="color:var(--kogane);font-size:10px;flex-shrink:0"></i>` : ''}
        ${label ? `<span class="card-label-chip" style="background:${label.bg};color:${label.color}">${label.name}</span>` : ''}
      </div>
      <div class="board-card-actions">
        <span class="priority-chip" style="background:${pri.bg};color:${pri.color}" title="${pri.label}優先度">
          <i class="fas ${pri.icon}" style="font-size:8px"></i>
        </span>
        <button class="btn btn-ghost btn-icon" style="width:22px;height:22px;padding:0" onclick="flipCard('${card.id}')" title="裏面を見る">
          <i class="fas fa-rotate" style="font-size:10px;color:var(--fuji)"></i>
        </button>
        <button class="btn btn-ghost btn-icon" style="width:22px;height:22px;padding:0" onclick="openCardEditModal('${card.id}','${boardId}')" title="編集">
          <i class="fas fa-pen" style="font-size:10px"></i>
        </button>
        <button class="btn btn-ghost btn-icon" style="width:22px;height:22px;padding:0" onclick="deleteCard('${card.id}','${boardId}')" title="削除">
          <i class="fas fa-xmark" style="font-size:10px;color:var(--text-light)"></i>
        </button>
      </div>
    </div>
    <!-- Card Body -->
    <div class="board-card-title">${esc(card.title)}</div>
    ${card.body ? `<div class="board-card-body">${esc(card.body.slice(0,120))}${card.body.length>120?'…':''}</div>` : ''}
    <!-- Tags -->
    ${(card.tags||[]).length > 0 ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">${card.tags.map(t=>`<span class="board-tag-chip">${esc(t)}</span>`).join('')}</div>` : ''}
    <!-- Footer -->
    <div class="board-card-footer">
      ${checkTotal > 0 ? `<span style="font-size:10px;color:${checkDone===checkTotal?'var(--matcha)':'var(--text-muted)'}"><i class="fas fa-check-square" style="margin-right:2px"></i>${checkDone}/${checkTotal}</span>` : ''}
      ${card.back?.emotion ? `<span style="font-size:10px;color:var(--momo)"><i class="fas fa-heart" style="margin-right:2px"></i>${esc(card.back.emotion)}</span>` : ''}
      ${card.dueDate ? `<span style="font-size:10px;color:var(--text-muted);margin-left:auto"><i class="fas fa-calendar" style="margin-right:2px"></i>${card.dueDate}</span>` : '<span style="margin-left:auto"></span>'}
      <button class="btn btn-ghost btn-icon" style="width:20px;height:20px;padding:0;flex-shrink:0" onclick="togglePinCard('${card.id}','${boardId}')" title="${card.pinned?'ピン解除':'ピン留め'}">
        <i class="fas fa-thumbtack" style="font-size:10px;color:${card.pinned?'var(--kogane)':'var(--text-light)'}"></i>
      </button>
    </div>
    ${card.back?.tension > 0 ? `<div class="card-tension-bar" title="テンション:${card.back.tension}/10">
      <div style="height:100%;width:${card.back.tension*10}%;background:${card.back.tension>7?'var(--accent)':card.back.tension>4?'var(--kogane)':'var(--fuji)'};border-radius:2px;transition:width .3s"></div>
    </div>` : ''}
  </div>`;
}

function renderCardBack(card, boardId) {
  const pri = PRIORITY_CONFIG[card.priority] || PRIORITY_CONFIG.medium;
  const checklist = card.back?.checklist || [];

  return `
  <div class="board-card board-card-back ${card.pinned ? 'pinned' : ''}"
       id="bc-${card.id}"
       style="border-left:3px solid ${pri.color}">
    <!-- Back Header -->
    <div class="board-card-header">
      <div style="display:flex;align-items:center;gap:6px;min-width:0">
        <i class="fas fa-rotate" style="color:var(--fuji);font-size:10px"></i>
        <span style="font-size:11px;color:var(--fuji);font-weight:600">裏面</span>
        <span style="font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(card.title)}</span>
      </div>
      <div class="board-card-actions">
        <button class="btn btn-ghost btn-icon" style="width:22px;height:22px;padding:0" onclick="flipCard('${card.id}')" title="表面に戻る">
          <i class="fas fa-rotate-left" style="font-size:10px;color:var(--fuji)"></i>
        </button>
        <button class="btn btn-ghost btn-icon" style="width:22px;height:22px;padding:0" onclick="openCardEditModal('${card.id}','${boardId}')" title="編集">
          <i class="fas fa-pen" style="font-size:10px"></i>
        </button>
      </div>
    </div>

    <!-- Back Content -->
    <div style="display:grid;gap:8px;margin-top:4px">
      ${card.back?.storyFunction ? `
      <div style="padding:6px 8px;background:var(--fuji-bg);border-radius:var(--radius-sm);border-left:2px solid var(--fuji)">
        <span style="font-size:10px;color:var(--fuji);font-weight:600;display:block;margin-bottom:2px">物語機能</span>
        <span style="font-size:11px;color:var(--text-secondary)">${esc(card.back.storyFunction)}</span>
      </div>` : ''}
      ${card.back?.emotion ? `
      <div style="padding:6px 8px;background:var(--momo-bg);border-radius:var(--radius-sm);border-left:2px solid var(--momo)">
        <span style="font-size:10px;color:var(--momo);font-weight:600;display:block;margin-bottom:2px">感情・トーン</span>
        <span style="font-size:11px;color:var(--text-secondary)">${esc(card.back.emotion)}</span>
        ${card.back.tension ? `<div style="margin-top:4px;height:4px;background:var(--bg-hover);border-radius:2px;overflow:hidden"><div style="height:100%;width:${card.back.tension*10}%;background:var(--momo);border-radius:2px"></div></div>` : ''}
      </div>` : ''}
      ${(card.back?.characters || []).length > 0 ? `
      <div style="padding:6px 8px;background:var(--bg-subtle);border-radius:var(--radius-sm)">
        <span style="font-size:10px;color:var(--text-secondary);font-weight:600;display:block;margin-bottom:4px">登場キャラクター</span>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${card.back.characters.map(ch => `<span style="padding:2px 7px;background:var(--fuji-bg);color:var(--fuji);border-radius:10px;font-size:10px">${esc(ch)}</span>`).join('')}
        </div>
      </div>` : ''}
      ${card.back?.sceneDetail ? `
      <div style="padding:6px 8px;background:var(--bg-subtle);border-radius:var(--radius-sm)">
        <span style="font-size:10px;color:var(--text-secondary);font-weight:600;display:block;margin-bottom:2px">シーン詳細</span>
        <span style="font-size:11px;color:var(--text-secondary);line-height:1.5">${esc(card.back.sceneDetail.slice(0,150))}${card.back.sceneDetail.length>150?'…':''}</span>
      </div>` : ''}
      ${card.back?.notes ? `
      <div style="padding:6px 8px;background:var(--kogane-bg);border-radius:var(--radius-sm);border-left:2px solid var(--kogane)">
        <span style="font-size:10px;color:var(--kogane);font-weight:600;display:block;margin-bottom:2px">メモ</span>
        <span style="font-size:11px;color:var(--text-secondary);line-height:1.5">${esc(card.back.notes.slice(0,100))}${card.back.notes.length>100?'…':''}</span>
      </div>` : ''}
      ${checklist.length > 0 ? `
      <div style="padding:6px 8px;background:var(--matcha-bg);border-radius:var(--radius-sm)">
        <span style="font-size:10px;color:var(--matcha);font-weight:600;display:block;margin-bottom:6px">チェックリスト (${checklist.filter(i=>i.done).length}/${checklist.length})</span>
        ${checklist.slice(0,4).map(item => `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <div style="width:12px;height:12px;border-radius:2px;border:1.5px solid ${item.done?'var(--matcha)':'var(--border)'};background:${item.done?'var(--matcha)':'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            ${item.done ? '<i class="fas fa-check" style="font-size:7px;color:white"></i>' : ''}
          </div>
          <span style="font-size:10px;color:var(--text-secondary);${item.done?'text-decoration:line-through;opacity:0.6':''}">${esc(item.text)}</span>
        </div>`).join('')}
        ${checklist.length > 4 ? `<span style="font-size:10px;color:var(--text-muted)">…他${checklist.length-4}件</span>` : ''}
      </div>` : ''}
      ${!card.back?.storyFunction && !card.back?.emotion && !card.back?.sceneDetail && !card.back?.notes && checklist.length === 0 && !(card.back?.characters||[]).length ? `
      <div style="text-align:center;padding:16px 8px;color:var(--text-muted)">
        <i class="fas fa-pen" style="font-size:20px;margin-bottom:8px;opacity:0.3;display:block"></i>
        <span style="font-size:12px">裏面はまだ空です<br>編集して詳細を追加しましょう</span>
      </div>` : ''}
    </div>
    <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px;font-size:11px" onclick="openCardEditModal('${card.id}','${boardId}')">
      <i class="fas fa-pen"></i> 裏面を編集
    </button>
  </div>`;
}

// ── Board Functions ──────────────────────────────────────────

function openBoard(boardId) {
  BoardState.currentBoardId = boardId;
  BoardState.flippedCards.clear();
  render();
}

function closeBoardToList() {
  BoardState.currentBoardId = null;
  BoardState.flippedCards.clear();
  render();
}

function setBoardListTab(tab) {
  BoardState.listTab = tab;
  render();
}

function flipCard(cardId) {
  if (BoardState.flippedCards.has(cardId)) {
    BoardState.flippedCards.delete(cardId);
  } else {
    BoardState.flippedCards.add(cardId);
  }
  // 個別カードのみ再レンダリング
  const board = BOARD_DB.getBoard(BoardState.currentBoardId);
  if (!board) return;
  const card = (board.cards || []).find(c => c.id === cardId);
  if (!card) return;
  const el2 = document.getElementById('bc-' + cardId);
  if (el2) {
    el2.outerHTML = renderBoardCard(card, board.id);
  }
}

function togglePinCard(cardId, boardId) {
  const board = BOARD_DB.getBoard(boardId);
  if (!board) return;
  const card = (board.cards || []).find(c => c.id === cardId);
  if (!card) return;
  card.pinned = !card.pinned;
  card.updatedAt = now();
  BOARD_DB.saveBoard(board);
  const el2 = document.getElementById('bc-' + cardId);
  if (el2) el2.outerHTML = renderBoardCard(card, boardId);
}

function deleteCard(cardId, boardId) {
  const board = BOARD_DB.getBoard(boardId);
  if (!board) return;
  board.cards = (board.cards || []).filter(c => c.id !== cardId);
  board.updatedAt = now();
  BOARD_DB.saveBoard(board);
  const el2 = document.getElementById('bc-' + cardId);
  if (el2) el2.remove();
  toast('カードを削除しました', 'info');
}

function addQuickCard(boardId, colIdx) {
  const board = BOARD_DB.getBoard(boardId);
  if (!board) return;
  openModal(
    `<i class="fas fa-plus" style="color:var(--fuji)"></i> カードを追加 — ${esc((board.columns||[])[colIdx]||'')}`,
    `<div class="form-group">
      <label class="form-label">タイトル <span style="color:var(--accent)">*</span></label>
      <input class="form-input" id="qc-title" placeholder="カードのタイトル…" autofocus>
    </div>
    <div class="form-group">
      <label class="form-label">内容</label>
      <textarea class="form-textarea" id="qc-body" placeholder="詳細・メモ…" rows="3"></textarea>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">ラベル</label>
        <select class="form-select" id="qc-label">
          <option value="">なし</option>
          ${CARD_LABELS.map(l => `<option value="${l.name}">${l.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">優先度</label>
        <select class="form-select" id="qc-priority">
          ${Object.entries(PRIORITY_CONFIG).map(([k,v]) => `<option value="${k}" ${k==='medium'?'selected':''}>${v.label}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">タグ（スペース区切り）</label>
      <input class="form-input" id="qc-tags" placeholder="例: 第1話 クライマックス">
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveQuickCard('${boardId}',${colIdx})"><i class="fas fa-plus"></i> 追加</button>`
  );
}

function saveQuickCard(boardId, colIdx) {
  const title = $('#qc-title')?.value?.trim();
  if (!title) { toast('タイトルを入力してください', 'error'); return; }
  const board = BOARD_DB.getBoard(boardId);
  if (!board) return;
  const tags = $('#qc-tags')?.value?.trim().split(/\s+/).filter(Boolean) || [];
  const maxOrder = Math.max(0, ...(board.cards||[]).filter(c=>c.column===colIdx).map(c=>c.order||0));
  const card = newCard({
    title,
    body: $('#qc-body')?.value?.trim() || '',
    column: colIdx,
    label: $('#qc-label')?.value || '',
    priority: $('#qc-priority')?.value || 'medium',
    tags,
    order: maxOrder + 1,
  });
  board.cards = [...(board.cards||[]), card];
  board.updatedAt = now();
  BOARD_DB.saveBoard(board);
  closeModal();
  toast('カードを追加しました', 'success');
  render();
}

function openCardEditModal(cardId, boardId) {
  const board = BOARD_DB.getBoard(boardId);
  if (!board) return;
  const card = (board.cards||[]).find(c => c.id === cardId);
  if (!card) return;
  const back = card.back || {};
  const checklist = back.checklist || [];
  const checklistHtml = checklist.map((item, idx) => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px" id="cl-item-${idx}">
      <input type="checkbox" id="cl-done-${idx}" ${item.done?'checked':''} style="width:14px;height:14px;cursor:pointer">
      <input class="form-input" id="cl-text-${idx}" value="${esc(item.text)}" style="flex:1;padding:4px 8px;font-size:12px">
      <button class="btn btn-ghost btn-icon btn-sm" onclick="removeChecklistItem(${idx})" title="削除">
        <i class="fas fa-xmark" style="font-size:10px;color:var(--accent)"></i>
      </button>
    </div>`).join('');

  openModal(
    `<i class="fas fa-pen" style="color:var(--fuji)"></i> カード編集`,
    `<div style="display:flex;flex-direction:column;gap:0">
      <!-- タブ -->
      <div style="display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:16px">
        <button class="card-edit-tab active" id="ced-tab-front" onclick="switchCardEditTab('front')">表面</button>
        <button class="card-edit-tab" id="ced-tab-back" onclick="switchCardEditTab('back')">裏面・詳細</button>
      </div>

      <!-- 表面 -->
      <div id="ced-front">
        <div class="form-group">
          <label class="form-label">タイトル <span style="color:var(--accent)">*</span></label>
          <input class="form-input" id="ced-title" value="${esc(card.title)}">
        </div>
        <div class="form-group">
          <label class="form-label">内容・メモ</label>
          <textarea class="form-textarea" id="ced-body" rows="4">${esc(card.body||'')}</textarea>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">ラベル</label>
            <select class="form-select" id="ced-label">
              <option value="">なし</option>
              ${CARD_LABELS.map(l => `<option value="${l.name}" ${card.label===l.name?'selected':''}>${l.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">優先度</label>
            <select class="form-select" id="ced-priority">
              ${Object.entries(PRIORITY_CONFIG).map(([k,v]) => `<option value="${k}" ${card.priority===k?'selected':''}>${v.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">カードカラー</label>
            <div style="display:flex;gap:6px;flex-wrap:wrap;padding:8px 0">
              ${['#ffffff','#fff9e6','#e8f4fd','#fde8e8','#e8fde8','#f3e8fd','#fde8f0','#e8fdfd'].map(c=>`
                <div onclick="document.getElementById('ced-color').value='${c}'" 
                     style="width:22px;height:22px;border-radius:50%;background:${c};border:2px solid ${card.color===c?'var(--fuji)':'var(--border)'};cursor:pointer" 
                     title="${c}"></div>`).join('')}
              <input type="color" id="ced-color" value="${card.color||'#ffffff'}" style="width:22px;height:22px;border:none;padding:0;cursor:pointer;border-radius:50%">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">期限日</label>
            <input class="form-input" type="date" id="ced-due" value="${card.dueDate||''}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">タグ（スペース区切り）</label>
          <input class="form-input" id="ced-tags" value="${esc((card.tags||[]).join(' '))}">
        </div>
      </div>

      <!-- 裏面 -->
      <div id="ced-back" style="display:none">
        <div class="form-group">
          <label class="form-label"><i class="fas fa-theater-masks" style="color:var(--fuji);margin-right:4px"></i>物語機能</label>
          <select class="form-select" id="ced-storyfunc">
            <option value="">未設定</option>
            ${STORY_FUNCTIONS.map(f => `<option value="${f}" ${back.storyFunction===f?'selected':''}>${f}</option>`).join('')}
          </select>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label"><i class="fas fa-heart" style="color:var(--momo);margin-right:4px"></i>感情・トーン</label>
            <select class="form-select" id="ced-emotion">
              <option value="">未設定</option>
              ${EMOTION_LIST.map(e => `<option value="${e}" ${back.emotion===e?'selected':''}>${e}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">テンション (${back.tension||5}/10)</label>
            <input type="range" id="ced-tension" min="1" max="10" value="${back.tension||5}" style="width:100%;margin-top:8px" oninput="document.querySelector('[for=ced-tension]').textContent='テンション ('+this.value+'/10)'">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label"><i class="fas fa-users" style="color:var(--fuji);margin-right:4px"></i>登場キャラクター（カンマ区切り）</label>
          <input class="form-input" id="ced-chars" value="${esc((back.characters||[]).join(', '))}" placeholder="例: 田中, 山田, 鈴木">
        </div>
        <div class="form-group">
          <label class="form-label"><i class="fas fa-film" style="color:var(--matcha);margin-right:4px"></i>シーン詳細</label>
          <textarea class="form-textarea" id="ced-scenedtl" rows="3" placeholder="場所・時間・状況など">${esc(back.sceneDetail||'')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label"><i class="fas fa-note-sticky" style="color:var(--kogane);margin-right:4px"></i>メモ</label>
          <textarea class="form-textarea" id="ced-notes" rows="2" placeholder="自由メモ…">${esc(back.notes||'')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" style="display:flex;justify-content:space-between">
            <span><i class="fas fa-check-square" style="color:var(--matcha);margin-right:4px"></i>チェックリスト</span>
            <button class="btn btn-ghost btn-sm" onclick="addChecklistItem()" style="padding:0;font-size:11px;height:auto"><i class="fas fa-plus"></i> 追加</button>
          </label>
          <div id="checklist-editor">${checklistHtml}</div>
        </div>
        <div class="form-group">
          <label class="form-label"><i class="fas fa-link" style="color:var(--text-muted);margin-right:4px"></i>参考資料・URL</label>
          <input class="form-input" id="ced-refs" value="${esc(back.references||'')}" placeholder="https://...">
        </div>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveCardEdit('${cardId}','${boardId}')"><i class="fas fa-floppy-disk"></i> 保存</button>`,
    { size: 'modal-lg' }
  );
}

function switchCardEditTab(tab) {
  const front = document.getElementById('ced-front');
  const back = document.getElementById('ced-back');
  const tabFront = document.getElementById('ced-tab-front');
  const tabBack = document.getElementById('ced-tab-back');
  if (!front || !back) return;
  if (tab === 'front') {
    front.style.display = ''; back.style.display = 'none';
    tabFront?.classList.add('active'); tabBack?.classList.remove('active');
  } else {
    front.style.display = 'none'; back.style.display = '';
    tabFront?.classList.remove('active'); tabBack?.classList.add('active');
  }
}

let _tempChecklist = [];
function addChecklistItem() {
  const container = document.getElementById('checklist-editor');
  if (!container) return;
  const idx = container.querySelectorAll('[id^=cl-text-]').length;
  const newItem = document.createElement('div');
  newItem.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px';
  newItem.id = `cl-item-${idx}`;
  newItem.innerHTML = `
    <input type="checkbox" id="cl-done-${idx}" style="width:14px;height:14px;cursor:pointer">
    <input class="form-input" id="cl-text-${idx}" placeholder="チェック項目…" style="flex:1;padding:4px 8px;font-size:12px">
    <button class="btn btn-ghost btn-icon btn-sm" onclick="this.closest('[id^=cl-item]').remove()" title="削除">
      <i class="fas fa-xmark" style="font-size:10px;color:var(--accent)"></i>
    </button>`;
  container.appendChild(newItem);
  newItem.querySelector('input[type=text], .form-input:not([type=checkbox])')?.focus?.();
}

function removeChecklistItem(idx) {
  document.getElementById(`cl-item-${idx}`)?.remove();
}

function saveCardEdit(cardId, boardId) {
  const board = BOARD_DB.getBoard(boardId);
  if (!board) return;
  const cardIdx = (board.cards||[]).findIndex(c => c.id === cardId);
  if (cardIdx < 0) return;

  const title = document.getElementById('ced-title')?.value?.trim();
  if (!title) { toast('タイトルを入力してください', 'error'); return; }

  // チェックリスト収集
  const container = document.getElementById('checklist-editor');
  const checklist = [];
  if (container) {
    const inputs = container.querySelectorAll('.form-input');
    inputs.forEach((input, i) => {
      const text = input.value?.trim();
      if (text) {
        const done = !!document.getElementById(`cl-done-${i}`)?.checked;
        checklist.push({ text, done });
      }
    });
  }

  const chars = document.getElementById('ced-chars')?.value?.split(/[,、]/).map(s=>s.trim()).filter(Boolean) || [];

  board.cards[cardIdx] = {
    ...board.cards[cardIdx],
    title,
    body: document.getElementById('ced-body')?.value || '',
    label: document.getElementById('ced-label')?.value || '',
    priority: document.getElementById('ced-priority')?.value || 'medium',
    color: document.getElementById('ced-color')?.value || '#ffffff',
    dueDate: document.getElementById('ced-due')?.value || '',
    tags: (document.getElementById('ced-tags')?.value || '').split(/\s+/).filter(Boolean),
    back: {
      ...board.cards[cardIdx].back,
      storyFunction: document.getElementById('ced-storyfunc')?.value || '',
      emotion: document.getElementById('ced-emotion')?.value || '',
      tension: parseInt(document.getElementById('ced-tension')?.value || '5'),
      characters: chars,
      sceneDetail: document.getElementById('ced-scenedtl')?.value || '',
      notes: document.getElementById('ced-notes')?.value || '',
      checklist,
      references: document.getElementById('ced-refs')?.value || '',
    },
    updatedAt: now(),
  };
  board.updatedAt = now();
  BOARD_DB.saveBoard(board);
  closeModal();
  toast('カードを保存しました', 'success');
  render();
}

// ── Drag & Drop ─────────────────────────────────────────────
function boardDragStart(event, cardId, boardId) {
  BoardState.dragCard = cardId;
  BoardState.dragBoardId = boardId;
  event.dataTransfer.effectAllowed = 'move';
  event.currentTarget.style.opacity = '0.5';
}

function boardDragEnd(event) {
  event.currentTarget.style.opacity = '';
  $$('.board-column').forEach(c => c.classList.remove('drag-over'));
}

function boardDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function boardDrop(event, boardId, colIdx) {
  event.preventDefault();
  $$('.board-column').forEach(c => c.classList.remove('drag-over'));
  if (!BoardState.dragCard) return;
  const board = BOARD_DB.getBoard(boardId);
  if (!board) return;
  const cardIdx = (board.cards||[]).findIndex(c => c.id === BoardState.dragCard);
  if (cardIdx < 0) return;
  board.cards[cardIdx].column = colIdx;
  board.cards[cardIdx].updatedAt = now();
  board.updatedAt = now();
  BOARD_DB.saveBoard(board);
  BoardState.dragCard = null;
  render();
}

// ── Filter & Search ──────────────────────────────────────────
function boardSearch(val, boardId) {
  BoardState.filter.search = val;
  render();
}

function setBoardFilter(boardId, key, val) {
  BoardState.filter[key] = val;
  render();
}

function clearBoardFilters(boardId) {
  BoardState.filter = { label: '', priority: '', tag: '', search: '' };
  render();
}

function toggleBoardFilterPanel(boardId) {
  const panel = document.getElementById('board-filter-panel');
  if (panel) panel.style.display = panel.style.display === 'none' ? '' : 'none';
}

// ── Board Modals ─────────────────────────────────────────────
function openNewBoardModal() {
  const projects = DB.getProjects();
  openModal(
    `<i class="fas fa-plus" style="color:var(--fuji)"></i> 新しいボードを作成`,
    `<div class="form-group">
      <label class="form-label">ボード名 <span style="color:var(--accent)">*</span></label>
      <input class="form-input" id="nb-title" placeholder="例: 第1話コンテ、キャラ関係図" autofocus>
    </div>
    <div class="form-group">
      <label class="form-label">説明</label>
      <input class="form-input" id="nb-desc" placeholder="このボードの目的…">
    </div>
    <div class="form-group">
      <label class="form-label">リンクする作品（任意）</label>
      <select class="form-select" id="nb-proj">
        <option value="">なし</option>
        ${projects.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">ボードカラー</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${['#7c6af7','#f76ca0','#6ab8f7','#6af7a0','#f7c56a','#c86af7','#f76a6a','#6af7f7'].map(c=>`
          <div onclick="selectBoardColor('${c}')" id="bc-${c.replace('#','')}" 
               style="width:28px;height:28px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${'#7c6af7'===c?'var(--text-primary)':'transparent'};transition:border .15s"></div>`).join('')}
        <input type="color" id="nb-color" value="#7c6af7" style="width:28px;height:28px;border:none;padding:0;cursor:pointer;border-radius:50%">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">カラム（列）設定</label>
      <div id="nb-cols-wrap" style="display:flex;flex-direction:column;gap:6px">
        ${['アイデア','構成中','完成','保留'].map((c,i) => `
          <div style="display:flex;gap:6px;align-items:center">
            <input class="form-input nb-col-input" value="${c}" style="flex:1">
            <button class="btn btn-ghost btn-icon btn-sm" onclick="this.closest('div').remove()" title="削除"><i class="fas fa-xmark" style="font-size:10px;color:var(--accent)"></i></button>
          </div>`).join('')}
      </div>
      <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="addColumnInput()"><i class="fas fa-plus"></i> 列を追加</button>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveNewBoard()"><i class="fas fa-plus"></i> 作成</button>`
  );
}

let _selectedBoardColor = '#7c6af7';
function selectBoardColor(color) {
  _selectedBoardColor = color;
  $$('[id^=bc-]').forEach(el => el.style.border = '3px solid transparent');
  const el2 = document.getElementById('bc-' + color.replace('#', ''));
  if (el2) el2.style.border = '3px solid var(--text-primary)';
  const colorInput = document.getElementById('nb-color');
  if (colorInput) colorInput.value = color;
}

function addColumnInput() {
  const wrap = document.getElementById('nb-cols-wrap');
  if (!wrap) return;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:6px;align-items:center';
  div.innerHTML = `<input class="form-input nb-col-input" placeholder="新しい列名…" style="flex:1">
    <button class="btn btn-ghost btn-icon btn-sm" onclick="this.closest('div').remove()" title="削除"><i class="fas fa-xmark" style="font-size:10px;color:var(--accent)"></i></button>`;
  wrap.appendChild(div);
  div.querySelector('input')?.focus();
}

function saveNewBoard() {
  const title = document.getElementById('nb-title')?.value?.trim();
  if (!title) { toast('ボード名を入力してください', 'error'); return; }
  const columns = [...$$('.nb-col-input')].map(i => i.value.trim()).filter(Boolean);
  if (columns.length === 0) { toast('列を最低1つ追加してください', 'error'); return; }
  const color = document.getElementById('nb-color')?.value || _selectedBoardColor;
  const board = newBoard({
    title,
    description: document.getElementById('nb-desc')?.value?.trim() || '',
    projectId: document.getElementById('nb-proj')?.value || null,
    color,
    columns,
  });
  BOARD_DB.saveBoard(board);
  closeModal();
  toast(`「${title}」を作成しました`, 'success');
  BoardState.currentBoardId = board.id;
  render();
}

function openEditBoardModal(boardId) {
  const board = BOARD_DB.getBoard(boardId);
  if (!board) return;
  const projects = DB.getProjects();
  openModal(
    `<i class="fas fa-gear" style="color:var(--fuji)"></i> ボード設定`,
    `<div class="form-group">
      <label class="form-label">ボード名</label>
      <input class="form-input" id="eb-title" value="${esc(board.title)}">
    </div>
    <div class="form-group">
      <label class="form-label">説明</label>
      <input class="form-input" id="eb-desc" value="${esc(board.description||'')}">
    </div>
    <div class="form-group">
      <label class="form-label">リンクする作品</label>
      <select class="form-select" id="eb-proj">
        <option value="">なし</option>
        ${projects.map(p => `<option value="${p.id}" ${board.projectId===p.id?'selected':''}>${esc(p.title)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">列管理</label>
      <div id="eb-cols-wrap" style="display:flex;flex-direction:column;gap:6px">
        ${(board.columns||[]).map(c => `
          <div style="display:flex;gap:6px;align-items:center">
            <input class="form-input nb-col-input" value="${esc(c)}" style="flex:1">
            <button class="btn btn-ghost btn-icon btn-sm" onclick="this.closest('div').remove()" title="削除"><i class="fas fa-xmark" style="font-size:10px;color:var(--accent)"></i></button>
          </div>`).join('')}
      </div>
      <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="addColumnInputEdit()"><i class="fas fa-plus"></i> 列を追加</button>
    </div>
    <div style="padding:10px 12px;background:var(--accent-bg);border-radius:var(--radius-sm);border-left:3px solid var(--accent);font-size:12px;color:var(--accent)">
      <i class="fas fa-exclamation-triangle" style="margin-right:6px"></i>列の順序変更・削除は既存カードの列割り当てに影響します
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveEditBoard('${boardId}')"><i class="fas fa-floppy-disk"></i> 保存</button>`
  );
}

function addColumnInputEdit() {
  const wrap = document.getElementById('eb-cols-wrap');
  if (!wrap) return;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:6px;align-items:center';
  div.innerHTML = `<input class="form-input nb-col-input" placeholder="新しい列名…" style="flex:1">
    <button class="btn btn-ghost btn-icon btn-sm" onclick="this.closest('div').remove()" title="削除"><i class="fas fa-xmark" style="font-size:10px;color:var(--accent)"></i></button>`;
  wrap.appendChild(div);
  div.querySelector('input')?.focus();
}

function saveEditBoard(boardId) {
  const board = BOARD_DB.getBoard(boardId);
  if (!board) return;
  const title = document.getElementById('eb-title')?.value?.trim();
  if (!title) { toast('ボード名を入力してください', 'error'); return; }
  const columns = [...$$('.nb-col-input')].map(i => i.value.trim()).filter(Boolean);
  board.title = title;
  board.description = document.getElementById('eb-desc')?.value?.trim() || '';
  board.projectId = document.getElementById('eb-proj')?.value || null;
  board.columns = columns.length > 0 ? columns : board.columns;
  board.updatedAt = now();
  BOARD_DB.saveBoard(board);
  closeModal();
  toast('ボード設定を保存しました', 'success');
  render();
}

function confirmDeleteBoard(boardId) {
  const board = BOARD_DB.getBoard(boardId);
  if (!board) return;
  openModal(
    `<i class="fas fa-trash" style="color:var(--accent)"></i> ボードを削除`,
    `<div style="text-align:center;padding:16px 0">
      <div style="font-size:40px;margin-bottom:12px">🗑️</div>
      <div style="font-size:14px;color:var(--text-primary);margin-bottom:8px;font-weight:600">「${esc(board.title)}」を削除しますか？</div>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.7">ボード内の全カード（${(board.cards||[]).length}枚）も削除されます。<br>この操作は元に戻せません。</div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-danger" onclick="deleteBoard('${boardId}')"><i class="fas fa-trash"></i> 削除する</button>`
  );
}

function deleteBoard(boardId) {
  BOARD_DB.deleteBoard(boardId);
  closeModal();
  if (BoardState.currentBoardId === boardId) {
    BoardState.currentBoardId = null;
  }
  toast('ボードを削除しました', 'info');
  render();
}

function openAddColumnModal(boardId) {
  openModal(
    `<i class="fas fa-plus" style="color:var(--fuji)"></i> 列を追加`,
    `<div class="form-group">
      <label class="form-label">列名 <span style="color:var(--accent)">*</span></label>
      <input class="form-input" id="acol-name" placeholder="例: レビュー中、下書き" autofocus>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveAddColumn('${boardId}')"><i class="fas fa-plus"></i> 追加</button>`
  );
}

function saveAddColumn(boardId) {
  const name = document.getElementById('acol-name')?.value?.trim();
  if (!name) { toast('列名を入力してください', 'error'); return; }
  const board = BOARD_DB.getBoard(boardId);
  if (!board) return;
  board.columns = [...(board.columns||[]), name];
  board.updatedAt = now();
  BOARD_DB.saveBoard(board);
  closeModal();
  toast(`「${name}」列を追加しました`, 'success');
  render();
}

function openEditColumnModal(boardId, colIdx) {
  const board = BOARD_DB.getBoard(boardId);
  if (!board) return;
  const colName = (board.columns||[])[colIdx] || '';
  openModal(
    `<i class="fas fa-pen" style="color:var(--fuji)"></i> 列を編集`,
    `<div class="form-group">
      <label class="form-label">列名</label>
      <input class="form-input" id="ecol-name" value="${esc(colName)}" autofocus>
    </div>
    <div style="padding:10px 12px;background:var(--accent-bg);border-radius:var(--radius-sm);font-size:12px;color:var(--accent);border-left:3px solid var(--accent)">
      <i class="fas fa-info-circle"></i> 列を削除するにはボード設定から行ってください
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
     <button class="btn btn-primary" onclick="saveEditColumn('${boardId}',${colIdx})">保存</button>`
  );
}

function saveEditColumn(boardId, colIdx) {
  const name = document.getElementById('ecol-name')?.value?.trim();
  if (!name) { toast('列名を入力してください', 'error'); return; }
  const board = BOARD_DB.getBoard(boardId);
  if (!board) return;
  board.columns[colIdx] = name;
  board.updatedAt = now();
  BOARD_DB.saveBoard(board);
  closeModal();
  toast('列名を変更しました', 'success');
  render();
}

// ── Board Page Bind ───────────────────────────────────────────
function bindBoardPage() {
  // DnD系はHTML attributeで処理済み
}

// ── Dashboard: Board Quick Access ────────────────────────────
function renderDashboardBoardWidget() {
  const boards = BOARD_DB.getBoards();
  if (boards.length === 0) {
    return `<div class="card" style="padding:20px;text-align:center;border:2px dashed var(--border)">
      <i class="fas fa-table-cells-large" style="font-size:28px;color:var(--fuji);opacity:0.4;display:block;margin-bottom:10px"></i>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">ストーリーボードがありません</div>
      <button class="btn btn-ghost btn-sm" onclick="navigate('board')"><i class="fas fa-plus"></i> ボードを作成</button>
    </div>`;
  }
  const recent = boards.slice(0, 3);
  return `
  <div class="card" style="padding:0;overflow:hidden">
    <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg-subtle)">
      <div style="display:flex;align-items:center;gap:8px">
        <i class="fas fa-table-cells-large" style="color:var(--fuji);font-size:13px"></i>
        <span style="font-size:13px;font-weight:600;color:var(--text-primary);font-family:'Noto Serif JP',serif">ストーリーボード</span>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="navigate('board')" style="font-size:11px">すべて見る</button>
    </div>
    <div style="padding:8px 12px">
      ${recent.map(b => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--border);cursor:pointer" onclick="BoardState.currentBoardId='${b.id}';navigate('board')">
        <div style="width:28px;height:28px;border-radius:var(--radius-sm);background:${b.color}22;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="fas ${b.icon||'fa-table-cells-large'}" style="color:${b.color};font-size:12px"></i>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(b.title)}</div>
          <div style="font-size:10px;color:var(--text-muted)">${(b.cards||[]).length}枚のカード · ${(b.columns||[]).length}列</div>
        </div>
        <i class="fas fa-chevron-right" style="color:var(--text-light);font-size:10px;flex-shrink:0"></i>
      </div>`).join('')}
    </div>
    <div style="padding:8px 12px;border-top:1px solid var(--border)">
      <button class="btn btn-ghost btn-sm" style="width:100%;font-size:12px" onclick="navigate('board');setTimeout(openNewBoardModal,100)">
        <i class="fas fa-plus" style="color:var(--fuji)"></i> 新しいボードを作成
      </button>
    </div>
  </div>`;
}

// ================================================================
//  PAGE: コラボメモ（キャラクター・世界観・あらすじ統合管理）
// ================================================================
function renderCollabMemo(proj) {
  const memo = DB.get(`collab_memo_${proj.id}`, {
    synopsis: proj.logline || '',
    worldNotes: '',
    characterNotes: '',
    themeNotes: '',
    plotMemo: '',
    researchMemo: '',
    miscNotes: '',
  });
  const chars = proj.characters || [];

  const tabKey = DB.get(`collab_memo_tab_${proj.id}`, 'synopsis');

  const tabs = [
    { key:'synopsis',    icon:'fa-align-left',        label:'あらすじ・概要',   color:'var(--accent)' },
    { key:'characters',  icon:'fa-users',              label:'キャラクター一覧', color:'var(--momo)' },
    { key:'world',       icon:'fa-globe',              label:'世界観・設定',     color:'var(--asagi)' },
    { key:'theme',       icon:'fa-lightbulb',          label:'テーマ・意図',     color:'var(--kogane)' },
    { key:'plot',        icon:'fa-diagram-project',    label:'プロット覚書',     color:'var(--fuji)' },
    { key:'research',    icon:'fa-flask',              label:'リサーチメモ',     color:'var(--matcha)' },
    { key:'misc',        icon:'fa-sticky-note',        label:'その他メモ',       color:'var(--kon-lt)' },
  ];

  const tabNav = `
  <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:16px;border-bottom:1px solid var(--border);padding-bottom:12px">
    ${tabs.map(t => `
    <button class="btn ${tabKey===t.key?'btn-primary':'btn-ghost'} btn-sm" onclick="setCollabTab('${proj.id}','${t.key}')" style="font-size:11.5px">
      <i class="fas ${t.icon}" style="color:${tabKey===t.key?'white':t.color}"></i> ${t.label}
    </button>`).join('')}
  </div>`;

  let tabContent = '';
  if (tabKey === 'synopsis') {
    tabContent = `
    <div class="card" style="padding:0;overflow:hidden;border-top:3px solid var(--accent)">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg-subtle);display:flex;align-items:center;gap:8px">
        <i class="fas fa-align-left" style="color:var(--accent)"></i>
        <span style="font-size:13px;font-weight:700;font-family:'Noto Serif JP',serif">あらすじ・概要</span>
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div>
          <label style="font-size:11.5px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px">ログライン（1文）</label>
          <textarea class="form-input" rows="2" style="resize:vertical;font-size:13px;line-height:1.7" placeholder="主人公が○○という目的のために～する物語" onchange="saveCollabField('${proj.id}','logline',this.value)">${esc(proj.logline||'')}</textarea>
        </div>
        <div>
          <label style="font-size:11.5px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px">あらすじ（100〜300字）</label>
          <textarea class="form-input" rows="6" style="resize:vertical;font-size:13px;line-height:1.9" placeholder="物語の全体的な流れを書きましょう" onchange="saveCollabMemoField('${proj.id}','synopsis',this.value)">${esc(memo.synopsis||'')}</textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label style="font-size:11.5px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px">ジャンル</label>
            <input class="form-input" type="text" value="${esc(proj.genre||'')}" placeholder="例: サスペンス" onchange="saveCollabField('${proj.id}','genre',this.value)" style="font-size:13px">
          </div>
          <div>
            <label style="font-size:11.5px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px">フォーマット</label>
            <input class="form-input" type="text" value="${esc(proj.format||'')}" placeholder="例: 映画・TVドラマ" onchange="saveCollabField('${proj.id}','format',this.value)" style="font-size:13px">
          </div>
        </div>
        <div>
          <label style="font-size:11.5px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px">コンセプト・作品の核心</label>
          <textarea class="form-input" rows="4" style="resize:vertical;font-size:13px;line-height:1.9" placeholder="この作品が伝えたいこと、中心となるアイデア" onchange="saveCollabMemoField('${proj.id}','themeNotes',this.value)">${esc(memo.themeNotes||'')}</textarea>
        </div>
      </div>
    </div>`;
  } else if (tabKey === 'characters') {
    const charCards = chars.length === 0
      ? `<div style="text-align:center;padding:40px;color:var(--text-muted)"><i class="fas fa-users" style="font-size:32px;opacity:0.3;display:block;margin-bottom:10px"></i>キャラクターが登録されていません。<br><small>「キャラクター」フェーズで追加してください</small></div>`
      : chars.map(c => {
          const arcColors = { positive:'var(--matcha)', negative:'var(--accent)', flat:'var(--fuji)', neutral:'var(--text-muted)' };
          return `
          <div class="card" style="padding:14px;border-left:3px solid ${c.color||'var(--fuji)'}">
            <div style="display:flex;gap:12px">
              <div style="width:42px;height:42px;border-radius:50%;background:${(c.color||'var(--fuji)')}22;border:2px solid ${c.color||'var(--fuji)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px">${c.emoji||'👤'}</div>
              <div style="flex:1">
                <div style="font-size:14px;font-weight:700;color:var(--text-primary)">${esc(c.name||'')}</div>
                <div style="font-size:11px;color:var(--text-muted)">
                  ${c.kana?esc(c.kana)+' / ':''}${c.age?esc(c.age)+'歳 / ':''}${c.role?esc(c.role):''}
                </div>
                ${c.tagline?`<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;font-style:italic">"${esc(c.tagline)}"</div>`:''}
                ${c.goal?`<div style="font-size:11.5px;color:var(--text-secondary);margin-top:6px"><span style="font-weight:600;color:var(--fuji)">目標：</span>${esc(c.goal)}</div>`:''}
                ${c.flaw?`<div style="font-size:11.5px;color:var(--text-secondary)"><span style="font-weight:600;color:var(--accent)">弱点：</span>${esc(c.flaw)}</div>`:''}
                ${c.arc?`<div style="font-size:11px;margin-top:6px"><span style="padding:2px 8px;border-radius:10px;background:${(arcColors[c.arc]||'var(--fuji)').replace('var(--','var(--').replace(')','-bg)')||'var(--fuji-bg)'};color:${arcColors[c.arc]||'var(--fuji)'};font-weight:600">アーク: ${c.arc}</span></div>`:''}
              </div>
            </div>
            ${c.backstory?`<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:11.5px;color:var(--text-secondary);line-height:1.8"><span style="font-weight:600">背景：</span>${esc(c.backstory)}</div>`:''}
          </div>`;
        }).join('');
    tabContent = `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div style="font-size:13px;font-weight:700;font-family:'Noto Serif JP',serif"><i class="fas fa-users" style="color:var(--momo);margin-right:6px"></i>登場人物一覧（${chars.length}人）</div>
        <button class="btn btn-ghost btn-sm" onclick="navigate('characters','${proj.id}')"><i class="fas fa-pen"></i> キャラクター編集</button>
      </div>
      ${charCards}
    </div>`;
  } else if (tabKey === 'world') {
    tabContent = `
    <div class="card" style="padding:0;overflow:hidden;border-top:3px solid var(--asagi)">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg-subtle);display:flex;align-items:center;gap:8px">
        <i class="fas fa-globe" style="color:var(--asagi)"></i>
        <span style="font-size:13px;font-weight:700;font-family:'Noto Serif JP',serif">世界観・設定メモ</span>
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div>
          <label style="font-size:11.5px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px">時代・場所・社会設定</label>
          <textarea class="form-input" rows="5" style="resize:vertical;font-size:13px;line-height:1.9" placeholder="いつ、どこ、どんな社会背景の物語か" onchange="saveCollabMemoField('${proj.id}','worldNotes',this.value)">${esc(memo.worldNotes||'')}</textarea>
        </div>
        <div>
          <label style="font-size:11.5px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px">ルール・制約・世界の法則</label>
          <textarea class="form-input" rows="4" style="resize:vertical;font-size:13px;line-height:1.9" placeholder="この世界固有のルールや制約（SF・ファンタジーなど）" onchange="saveCollabMemoField('${proj.id}','researchMemo',this.value)">${esc(memo.researchMemo||'')}</textarea>
        </div>
        <div>
          <label style="font-size:11.5px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px">重要な場所・ロケーション</label>
          <textarea class="form-input" rows="4" style="resize:vertical;font-size:13px;line-height:1.9" placeholder="物語に登場する主要な場所の説明" onchange="saveCollabMemoField('${proj.id}','miscNotes',this.value)">${esc(memo.miscNotes||'')}</textarea>
        </div>
      </div>
    </div>`;
  } else if (tabKey === 'theme') {
    tabContent = `
    <div class="card" style="padding:0;overflow:hidden;border-top:3px solid var(--kogane)">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg-subtle);display:flex;align-items:center;gap:8px">
        <i class="fas fa-lightbulb" style="color:var(--kogane)"></i>
        <span style="font-size:13px;font-weight:700;font-family:'Noto Serif JP',serif">テーマ・意図・メッセージ</span>
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div>
          <label style="font-size:11.5px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px">中心テーマ（一言で）</label>
          <input class="form-input" type="text" value="${esc(proj.theme||'')}" placeholder="例: 赦し、自由、孤独からの解放" onchange="saveCollabField('${proj.id}','theme',this.value)" style="font-size:14px;font-weight:600">
        </div>
        <div>
          <label style="font-size:11.5px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px">作品のメッセージ・伝えたいこと</label>
          <textarea class="form-input" rows="5" style="resize:vertical;font-size:13px;line-height:1.9" placeholder="この作品を通して観客・読者に何を感じてほしいか" onchange="saveCollabMemoField('${proj.id}','themeNotes',this.value)">${esc(memo.themeNotes||'')}</textarea>
        </div>
        <div>
          <label style="font-size:11.5px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px">ターゲット観客・想定視聴者</label>
          <textarea class="form-input" rows="3" style="resize:vertical;font-size:13px;line-height:1.9" placeholder="誰に向けた作品か。年齢層、感情的ニーズなど" onchange="saveCollabMemoField('${proj.id}','characterNotes',this.value)">${esc(memo.characterNotes||'')}</textarea>
        </div>
      </div>
    </div>`;
  } else if (tabKey === 'plot') {
    const plots = proj.plots || [];
    const plotSummary = plots.map((p,i) => `<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:11px;color:var(--text-muted);width:56px;flex-shrink:0">幕${p.act+1}/S${p.num||i+1}</span>
      <div>
        <div style="font-size:12.5px;font-weight:600;color:var(--text-primary)">${esc(p.title||'無題')}</div>
        ${p.synopsis?`<div style="font-size:11.5px;color:var(--text-secondary);line-height:1.7">${esc(p.synopsis)}</div>`:''}
      </div>
      ${p.tension?`<div style="margin-left:auto;font-size:10px;color:var(--text-muted);flex-shrink:0">T:${p.tension}</div>`:''}
    </div>`).join('');
    tabContent = `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="card" style="padding:0;overflow:hidden;border-top:3px solid var(--fuji)">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg-subtle);display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:8px">
            <i class="fas fa-diagram-project" style="color:var(--fuji)"></i>
            <span style="font-size:13px;font-weight:700;font-family:'Noto Serif JP',serif">プロット覚書（${plots.length}シーン）</span>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="navigate('plot','${proj.id}')"><i class="fas fa-pen"></i> 編集</button>
        </div>
        <div style="padding:14px">
          ${plots.length === 0
            ? `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">プロットがまだ設計されていません</div>`
            : plotSummary}
        </div>
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg-subtle)">
          <span style="font-size:13px;font-weight:700;font-family:'Noto Serif JP',serif"><i class="fas fa-sticky-note" style="color:var(--fuji);margin-right:6px"></i>プロットメモ</span>
        </div>
        <div style="padding:14px">
          <textarea class="form-input" rows="6" style="resize:vertical;font-size:13px;line-height:1.9" placeholder="プロット設計に関する覚書・アイデアなど" onchange="saveCollabMemoField('${proj.id}','plotMemo',this.value)">${esc(memo.plotMemo||'')}</textarea>
        </div>
      </div>
    </div>`;
  } else if (tabKey === 'research') {
    tabContent = `
    <div class="card" style="padding:0;overflow:hidden;border-top:3px solid var(--matcha)">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg-subtle);display:flex;align-items:center;gap:8px">
        <i class="fas fa-flask" style="color:var(--matcha)"></i>
        <span style="font-size:13px;font-weight:700;font-family:'Noto Serif JP',serif">リサーチメモ・参考資料</span>
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div>
          <label style="font-size:11.5px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px">リサーチ内容・調査メモ</label>
          <textarea class="form-input" rows="7" style="resize:vertical;font-size:13px;line-height:1.9" placeholder="調査した事実、参考にした資料、気づきなど" onchange="saveCollabMemoField('${proj.id}','researchMemo',this.value)">${esc(memo.researchMemo||'')}</textarea>
        </div>
        <div>
          <label style="font-size:11.5px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px">参考作品・インスピレーション源</label>
          <textarea class="form-input" rows="4" style="resize:vertical;font-size:13px;line-height:1.9" placeholder="影響を受けた映画・ドラマ・小説など" onchange="saveCollabMemoField('${proj.id}','characterNotes',this.value)">${esc(memo.characterNotes||'')}</textarea>
        </div>
      </div>
    </div>`;
  } else {
    tabContent = `
    <div class="card" style="padding:0;overflow:hidden;border-top:3px solid var(--kon-lt)">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg-subtle);display:flex;align-items:center;gap:8px">
        <i class="fas fa-sticky-note" style="color:var(--kon-lt)"></i>
        <span style="font-size:13px;font-weight:700;font-family:'Noto Serif JP',serif">その他メモ・自由記入欄</span>
      </div>
      <div style="padding:16px">
        <textarea class="form-input" rows="12" style="resize:vertical;font-size:13px;line-height:1.9" placeholder="なんでも書いておける自由なメモ欄。思いつき、懸念点、改稿時のアイデアなど" onchange="saveCollabMemoField('${proj.id}','miscNotes',this.value)">${esc(memo.miscNotes||'')}</textarea>
      </div>
    </div>`;
  }

  return `
  <div class="section-header">
    <div class="section-title"><i class="fas fa-book-bookmark" style="color:var(--kogane)"></i> コラボメモ <span class="phase-badge-lg" style="background:var(--kogane-bg);color:var(--kogane);border-color:var(--kogane-border)">作品ドキュメント</span></div>
    <div class="section-desc">キャラクター・世界観・あらすじ・テーマを一元管理。作品の全情報をここで確認・編集できます。</div>
  </div>
  ${tabNav}
  ${tabContent}`;
}

function saveCollabMemoField(projId, field, value) {
  const memo = DB.get(`collab_memo_${projId}`, {});
  memo[field] = value;
  DB.set(`collab_memo_${projId}`, memo);
}

function saveCollabField(projId, field, value) {
  const proj = DB.getProject(projId);
  if (!proj) return;
  proj[field] = value;
  proj.updatedAt = now();
  DB.saveProject(proj);
}

function setCollabTab(projId, tabKey) {
  DB.set(`collab_memo_tab_${projId}`, tabKey);
  render();
}

// ================================================================
//  PAGE: プロジェクトダッシュボード v2（個別作品ハブページ）
// ================================================================
function renderProjectDash(proj) {
  const drafts = proj.drafts || [];
  const chars = proj.characters || [];
  const plots = proj.plots || [];
  const phaseIdx = { '着想':0,'リサーチ':1,'コンセプト設計':2,'プロット設計':3,'キャラクター':4,'アウトライン':5,'初稿':6,'大改稿':7,'精密推敲':8,'フィードバック':9,'最終稿':10,'共有・出力':11 };
  const curPhaseIdx = phaseIdx[proj.phase] ?? 0;
  const progressPct = Math.round((curPhaseIdx / 11) * 100);
  const waColor = PHASE_COLORS_WA[proj.phase] || { bg:'#fef2ee', color:'#d94f2a', border:'#f5c4b4' };

  const totalWords = drafts.reduce((a, d) => a + countWords(d.content||''), 0);
  const latestDraft = drafts[drafts.length - 1];
  const latestWords = countWords(latestDraft?.content || '');

  // タスク統計
  const allTasks = TASK_DB.getTasks().filter(t => t.projectId === proj.id);
  const doneTasks = allTasks.filter(t => t.done).length;
  const pendingTasks = allTasks.filter(t => !t.done).length;
  const overdueTasks = allTasks.filter(t => !t.done && t.dueDate && t.dueDate < new Date().toISOString().slice(0,10)).length;
  const taskPct = allTasks.length > 0 ? Math.round(doneTasks / allTasks.length * 100) : 0;

  // 執筆目標・週間データ（グローバルダッシュボードから統合）
  const journalEntries = DB.get('journal_entries', []);
  const today = new Date();
  const weekDays = Array.from({length:7}, (_,i) => {
    const d = new Date(today); d.setDate(today.getDate()-6+i);
    return d.toISOString().slice(0,10);
  });
  const weekData = weekDays.map(day => {
    const e = journalEntries.find(e => e.date === day);
    return { day: day.slice(5), wc: e?.wordCount||0 };
  });
  const weekMax = Math.max(...weekData.map(d=>d.wc), 1);
  const writingGoal = DB.get('writing_goal', { daily: 500, weekly: 2000 });
  const todayWc = journalEntries.find(e=>e.date===today.toISOString().slice(0,10))?.wordCount||0;
  const weekWc = weekData.reduce((a,d)=>a+d.wc,0);
  const goalPct = Math.min(100, Math.round(todayWc / writingGoal.daily * 100));

  // 12フェーズの詳細進捗
  const phaseProgress = PHASES.map((ph, i) => {
    let status = 'pending';
    if (i < curPhaseIdx) status = 'done';
    else if (i === curPhaseIdx) status = 'current';
    const phC = PHASE_COLORS_WA[ph.id] || waColor;
    return { ph, i, status, phC };
  });

  const phaseSteps = phaseProgress.map(({ph, i, status, phC}) => `
  <div class="pd-phase-step ${status}" onclick="navigate('${ph.nav}','${proj.id}')">
    <div class="pd-phase-circle">
      ${status==='done'
        ? `<i class="fas fa-check" style="color:white;font-size:10px"></i>`
        : `<i class="fas ${ph.icon}" style="color:${status==='current'?phC.color:'var(--text-muted)'};font-size:10px"></i>`}
    </div>
    <div class="pd-phase-info">
      <span class="pd-phase-name" style="color:${status==='current'?phC.color:status==='done'?'var(--text-secondary)':'var(--text-muted)'}">${ph.id}</span>
    </div>
    <span class="pd-phase-badge" style="background:${status==='done'?'var(--matcha-bg)':status==='current'?phC.bg:'transparent'};color:${status==='done'?'var(--matcha)':status==='current'?phC.color:'transparent'};border-color:${status==='done'?'var(--matcha-border)':status==='current'?phC.border:'transparent'}">${status==='done'?'完了':status==='current'?'現在':''}</span>
  </div>`).join('');

  // 最近タスク
  const recentTasks = allTasks.filter(t=>!t.done).slice(0,5).map(t => {
    const isOverdue = t.dueDate && t.dueDate < new Date().toISOString().slice(0,10);
    const PRIO = { urgent:'var(--accent)', high:'var(--momo)', medium:'var(--kogane)', low:'var(--matcha)' };
    return `
    <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
      <div style="width:8px;height:8px;border-radius:50%;background:${PRIO[t.priority]||'var(--fuji)'};flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12.5px;font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.title)}</div>
        ${t.dueDate?`<div style="font-size:10px;color:${isOverdue?'var(--accent)':'var(--text-muted)'};font-weight:${isOverdue?600:400}">${isOverdue?'⚠ 期限切れ — ':'期限: '}${fmtDate(t.dueDate)}</div>`:''}
      </div>
    </div>`;
  }).join('') || `<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px"><i class="fas fa-check-circle" style="color:var(--matcha);margin-right:4px"></i>すべてのタスクが完了</div>`;

  // 改稿履歴
  const draftHistory = drafts.map((d, i) => {
    const wc = countWords(d.content||'');
    return `
    <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
      <div style="width:26px;height:26px;border-radius:50%;background:var(--fuji-bg);border:1.5px solid var(--fuji-border);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;font-weight:700;color:var(--fuji)">${i+1}</div>
      <div style="flex:1">
        <div style="font-size:12.5px;font-weight:600;color:var(--text-primary)">${esc(d.label||`第${i+1}稿`)}</div>
        <div style="font-size:10.5px;color:var(--text-muted)">${wc.toLocaleString()}字 · ${fmtDate(d.updatedAt||d.createdAt)}</div>
      </div>
      ${i === drafts.length-1?`<span style="font-size:10px;padding:2px 7px;background:var(--fuji-bg);color:var(--fuji);border:1px solid var(--fuji-border);border-radius:8px;font-weight:600">最新稿</span>`:''}
    </div>`;
  }).join('') || `<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px">まだ稿がありません。<button class="btn btn-ghost btn-sm" onclick="navigate('editor','${proj.id}')">執筆を開始</button></div>`;

  // キャラクタープレビュー（最大3人）
  const charPreview = chars.slice(0,3).map(ch => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
      <div style="width:30px;height:30px;border-radius:50%;background:${ch.color||'var(--fuji-bg)'};display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0">${ch.emoji||'👤'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12.5px;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ch.name)}</div>
        <div style="font-size:10.5px;color:var(--text-muted)">${esc(ch.role||'')}${ch.age?` · ${ch.age}歳`:''}</div>
      </div>
    </div>`).join('') || `<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:12px"><i class="fas fa-users" style="opacity:.4;display:block;font-size:20px;margin-bottom:4px"></i>キャラクター未登録</div>`;

  // クイックアクションボタン一覧（全フェーズへのアクセス）
  const quickPhaseButtons = PHASES.map(ph => {
    const phC = PHASE_COLORS_WA[ph.id] || { bg:'#f8f6f1', color:'#7a6e5e', border:'#e4ddd3' };
    const isCurrentPh = ph.id === proj.phase;
    return `<button class="pd-quick-btn ${isCurrentPh?'current':''}" onclick="navigate('${ph.nav}','${proj.id}')" style="--ph-color:${phC.color};--ph-bg:${phC.bg};--ph-border:${phC.border}">
      <i class="fas ${ph.icon}"></i>
      <span>${ph.id}</span>
      ${isCurrentPh?`<span class="pd-quick-now">現在</span>`:''}
    </button>`;
  }).join('');

  return `
  <!-- ═══ 作品ダッシュボード v3 ═══ -->
  <div class="pdv3-wrap">

    <!-- ① ヒーローヘッダー -->
    <div class="pdv3-hero" style="--ph-color:${waColor.color};--ph-bg:${waColor.bg};--ph-border:${waColor.border}">
      <div class="pdv3-hero-content">
        <div class="pdv3-hero-main">
          <div class="pdv3-hero-badge" style="background:${waColor.bg};color:${waColor.color};border-color:${waColor.border}">
            <i class="fas ${PHASES[curPhaseIdx]?.icon||'fa-circle'}"></i>
            ${esc(proj.phase)}フェーズ
          </div>
          <h1 class="pdv3-hero-title">${esc(proj.title)}</h1>
          <div class="pdv3-hero-meta">
            <span><i class="fas fa-film"></i> ${esc(proj.genre)}</span>
            <span><i class="fas fa-tv"></i> ${esc(proj.format)}</span>
            ${overdueTasks > 0 ? `<span class="pdv3-overdue-chip"><i class="fas fa-triangle-exclamation"></i> ${overdueTasks}件遅延</span>` : `<span style="color:var(--text-muted);font-size:11px"><i class="fas fa-clock"></i> 更新: ${fmtDate(proj.updatedAt)}</span>`}
          </div>
          ${proj.logline ? `<p class="pdv3-logline">${esc(proj.logline)}</p>` : ''}
        </div>
        <div class="pdv3-hero-aside">
          <div class="pdv3-ring-wrap">
            <svg viewBox="0 0 72 72" width="72" height="72">
              <circle cx="36" cy="36" r="30" fill="none" stroke="var(--border)" stroke-width="6"/>
              <circle cx="36" cy="36" r="30" fill="none" stroke="${waColor.color}" stroke-width="6"
                stroke-dasharray="${Math.round(2*Math.PI*30*progressPct/100)} ${Math.round(2*Math.PI*30*(100-progressPct)/100)}"
                stroke-dashoffset="${Math.round(2*Math.PI*30*0.25)}"
                stroke-linecap="round"/>
              <text x="36" y="40" text-anchor="middle" font-size="14" font-weight="800" fill="${waColor.color}" font-family="inherit">${progressPct}%</text>
            </svg>
            <div class="pdv3-ring-lbl">全体進捗</div>
          </div>
          <div class="pdv3-hero-btns">
            <button class="btn btn-primary" onclick="navigate('${PHASES[curPhaseIdx]?.nav||'ideas'}','${proj.id}')">
              <i class="fas fa-pen-nib"></i><span>現フェーズへ</span>
            </button>
            <div class="pdv3-hero-sub-btns">
              <button class="btn btn-secondary btn-sm" onclick="navigate('editor','${proj.id}')"><i class="fas fa-file-lines"></i><span class="pdv3-btn-label"> 執筆</span></button>
              <button class="btn btn-secondary btn-sm" onclick="navigate('collab','${proj.id}')"><i class="fas fa-book-bookmark"></i><span class="pdv3-btn-label"> メモ</span></button>
              <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditProjectModal('${proj.id}')" title="作品情報を編集"><i class="fas fa-pen"></i></button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ② 統計バー（6枚横並び → レスポンシブ） -->
    <div class="pdv3-stats">
      <div class="pdv3-stat" style="--sc:${waColor.color};--sbg:${waColor.bg}">
        <div class="pdv3-stat-icon"><i class="fas fa-map"></i></div>
        <div class="pdv3-stat-body">
          <div class="pdv3-stat-val">${curPhaseIdx+1}<span>/12</span></div>
          <div class="pdv3-stat-lbl">フェーズ</div>
        </div>
      </div>
      <div class="pdv3-stat" style="--sc:var(--fuji);--sbg:var(--fuji-bg)">
        <div class="pdv3-stat-icon"><i class="fas fa-font"></i></div>
        <div class="pdv3-stat-body">
          <div class="pdv3-stat-val">${latestWords>=1000?(latestWords/1000).toFixed(1)+'k':latestWords.toLocaleString()}<span>字</span></div>
          <div class="pdv3-stat-lbl">最新稿</div>
        </div>
      </div>
      <div class="pdv3-stat" style="--sc:var(--matcha);--sbg:var(--matcha-bg)">
        <div class="pdv3-stat-icon"><i class="fas fa-calendar-check"></i></div>
        <div class="pdv3-stat-body">
          <div class="pdv3-stat-val">${doneTasks}<span>/${allTasks.length}</span></div>
          <div class="pdv3-stat-lbl">タスク完了</div>
        </div>
      </div>
      <div class="pdv3-stat" style="--sc:var(--momo,#f76ca0);--sbg:var(--momo-bg,#fff0f5)">
        <div class="pdv3-stat-icon"><i class="fas fa-users"></i></div>
        <div class="pdv3-stat-body">
          <div class="pdv3-stat-val">${chars.length}<span>人</span></div>
          <div class="pdv3-stat-lbl">登場人物</div>
        </div>
      </div>
      <div class="pdv3-stat" style="--sc:var(--kogane);--sbg:var(--kogane-bg)">
        <div class="pdv3-stat-icon"><i class="fas fa-scroll"></i></div>
        <div class="pdv3-stat-body">
          <div class="pdv3-stat-val">${drafts.length}<span>稿</span></div>
          <div class="pdv3-stat-lbl">改稿数</div>
        </div>
      </div>
      <div class="pdv3-stat" style="--sc:var(--asagi,#6ddede);--sbg:var(--asagi-bg,#e6f7f7)">
        <div class="pdv3-stat-icon"><i class="fas fa-map-pin"></i></div>
        <div class="pdv3-stat-body">
          <div class="pdv3-stat-val">${plots.length}<span>場面</span></div>
          <div class="pdv3-stat-lbl">プロット</div>
        </div>
      </div>
    </div>

    <!-- ③ フェーズナビ -->
    <div class="pdv3-pnav-wrap">
      <div class="pdv3-pnav">
        ${PHASES.map((ph, i) => {
          const s = i < curPhaseIdx ? 'done' : i === curPhaseIdx ? 'cur' : 'todo';
          const phC = PHASE_COLORS_WA[ph.id] || waColor;
          return `<button class="pdv3-pnav-btn ${s}" onclick="navigate('${ph.nav}','${proj.id}')"
            style="${s==='cur'?`--pnc:${phC.color};--pnbg:${phC.bg};--pnbd:${phC.color}`:''}">
            <i class="fas ${ph.icon}"></i>
            <span class="pdv3-pnav-lbl">${ph.id}</span>
            ${s==='done'?`<i class="fas fa-check pdv3-pnav-check"></i>`:s==='cur'?`<span class="pdv3-pnav-now">NOW</span>`:''}
          </button>`;
        }).join('')}
        <div class="pdv3-pnav-sep"></div>
        <button class="pdv3-pnav-btn pdv3-pnav-extra" onclick="navigate('collab','${proj.id}')">
          <i class="fas fa-book-bookmark"></i><span class="pdv3-pnav-lbl">メモ</span>
        </button>
        <button class="pdv3-pnav-btn pdv3-pnav-extra" onclick="navigate('export','${proj.id}')">
          <i class="fas fa-share-nodes"></i><span class="pdv3-pnav-lbl">出力</span>
        </button>
      </div>
    </div>

    <!-- ④ メインボディ（2カラム） -->
    <div class="pdv3-body">

      <!-- 左メイン -->
      <div class="pdv3-col-main">

        <!-- フェーズ進捗 -->
        <div class="pdv3-card">
          <div class="pdv3-card-head" style="--hc:${waColor.color}">
            <i class="fas fa-map" style="color:${waColor.color}"></i>
            <span>フェーズ進捗</span>
            <span class="pdv3-head-chip" style="background:${waColor.bg};color:${waColor.color};border-color:${waColor.border}">${curPhaseIdx+1}/12 · ${progressPct}%</span>
            <button class="pdv3-collapse-btn" onclick="this.closest('.pdv3-card').classList.toggle('pdv3-card-collapsed')" title="折りたたみ"><i class="fas fa-chevron-up"></i></button>
          </div>
          <div class="pdv3-card-body">
            <div class="pdv3-phase-grid">
              ${PHASES.map((ph, i) => {
                const s = i < curPhaseIdx ? 'done' : i === curPhaseIdx ? 'cur' : 'todo';
                const phC = PHASE_COLORS_WA[ph.id] || waColor;
                return `<div class="pdv3-phase-item ${s}" onclick="navigate('${ph.nav}','${proj.id}')">
                  <div class="pdv3-phase-dot" style="${s==='done'?'background:var(--matcha);border-color:var(--matcha)':s==='cur'?`border-color:${phC.color};box-shadow:0 0 0 3px ${phC.bg}`:''}">
                    ${s==='done'?`<i class="fas fa-check" style="color:white;font-size:8px"></i>`:`<i class="fas ${ph.icon}" style="color:${s==='cur'?phC.color:'var(--text-muted)'};font-size:8px"></i>`}
                  </div>
                  <span class="pdv3-phase-name" style="color:${s==='cur'?phC.color:s==='done'?'var(--text-secondary)':'var(--text-muted)'};font-weight:${s==='cur'?700:400}">${ph.id}</span>
                  ${s==='cur'?`<span class="pdv3-phase-now-dot" style="background:${phC.color}"></span>`:''}
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- キャラクター -->
        <div class="pdv3-card">
          <div class="pdv3-card-head" style="--hc:var(--momo,#f76ca0)">
            <i class="fas fa-users" style="color:var(--momo,#f76ca0)"></i>
            <span>登場人物</span>
            <span class="pdv3-head-chip" style="background:var(--momo-bg,#fff0f5);color:var(--momo,#f76ca0);border-color:var(--momo-border,#f5c4d8)">${chars.length}人</span>
            <button class="btn btn-ghost btn-sm" onclick="navigate('characters','${proj.id}')" style="margin-left:auto;font-size:11px">全員 <i class="fas fa-arrow-right" style="font-size:9px"></i></button>
          </div>
          <div class="pdv3-card-body">
            ${chars.length === 0
              ? `<div class="pdv3-empty"><i class="fas fa-user-plus"></i><span>まだキャラクターがいません</span><button class="btn btn-secondary btn-sm" onclick="navigate('characters','${proj.id}')">追加する</button></div>`
              : `<div class="pdv3-char-grid">
                  ${chars.slice(0,6).map(ch=>`<div class="pdv3-char-card" onclick="navigate('characters','${proj.id}')">
                    <div class="pdv3-char-avatar" style="background:${ch.color||'var(--fuji-bg)'}">${ch.emoji||'👤'}</div>
                    <div class="pdv3-char-name">${esc(ch.name)}</div>
                    <div class="pdv3-char-role">${esc(ch.role||'')}</div>
                  </div>`).join('')}
                  ${chars.length>6?`<div class="pdv3-char-more" onclick="navigate('characters','${proj.id}')">+${chars.length-6}人</div>`:''}
                </div>`
            }
          </div>
        </div>

        <!-- 改稿履歴 -->
        <div class="pdv3-card">
          <div class="pdv3-card-head" style="--hc:var(--fuji)">
            <i class="fas fa-file-lines" style="color:var(--fuji)"></i>
            <span>改稿履歴</span>
            <span class="pdv3-head-chip" style="background:var(--fuji-bg);color:var(--fuji);border-color:var(--fuji-border)">${drafts.length}稿</span>
            <button class="btn btn-ghost btn-sm" onclick="navigate('editor','${proj.id}')" style="margin-left:auto;font-size:11px"><i class="fas fa-pen"></i> 執筆へ</button>
          </div>
          <div class="pdv3-card-body">
            ${drafts.length === 0
              ? `<div class="pdv3-empty"><i class="fas fa-file-circle-plus"></i><span>まだ稿がありません</span><button class="btn btn-primary btn-sm" onclick="navigate('editor','${proj.id}')">執筆を開始</button></div>`
              : drafts.map((d,i)=>{
                  const wc = countWords(d.content||'');
                  return `<div class="pdv3-draft-row">
                    <div class="pdv3-draft-num">${i+1}</div>
                    <div class="pdv3-draft-info">
                      <span class="pdv3-draft-label">${esc(d.label||`第${i+1}稿`)}</span>
                      <span class="pdv3-draft-meta">${wc.toLocaleString()}字 · ${fmtDate(d.updatedAt||d.createdAt)}</span>
                    </div>
                    ${i===drafts.length-1?`<span class="pdv3-draft-latest">最新</span>`:''}
                  </div>`;
                }).join('')
            }
          </div>
        </div>

      </div>

      <!-- 右サイド -->
      <div class="pdv3-col-side">

        <!-- 今日の目標 -->
        <div class="pdv3-card pdv3-goal-card">
          <div class="pdv3-card-head" style="--hc:var(--matcha)">
            <i class="fas fa-bullseye" style="color:var(--matcha)"></i>
            <span>今日の目標</span>
            <button class="btn btn-ghost btn-icon btn-sm" onclick="openGoalSettingModal()" style="margin-left:auto" title="目標を設定"><i class="fas fa-pen" style="font-size:10px"></i></button>
          </div>
          <div class="pdv3-card-body">
            <div class="pdv3-goal-row">
              <div class="pdv3-goal-item" style="--gc:var(--matcha);--gbg:var(--matcha-bg)">
                <div class="pdv3-goal-val">${todayWc.toLocaleString()}</div>
                <div class="pdv3-goal-lbl">今日 / ${writingGoal.daily.toLocaleString()}字</div>
              </div>
              <div class="pdv3-goal-sep"></div>
              <div class="pdv3-goal-item" style="--gc:var(--kogane);--gbg:var(--kogane-bg)">
                <div class="pdv3-goal-val">${weekWc.toLocaleString()}</div>
                <div class="pdv3-goal-lbl">今週 / ${writingGoal.weekly.toLocaleString()}字</div>
              </div>
            </div>
            <div class="pdv3-goal-bar-head">
              <span>今日の進捗</span>
              <span style="color:${goalPct>=100?'var(--matcha)':'var(--text-secondary)'};font-weight:700">${goalPct}%${goalPct>=100?' 🎉':''}</span>
            </div>
            <div class="pdv3-goal-bar"><div style="width:${goalPct}%;background:${goalPct>=100?'var(--matcha)':'linear-gradient(90deg,var(--matcha),var(--kogane))'}"></div></div>
            <div class="pdv3-week-chart">
              ${weekData.map(d=>{
                const h = Math.max(4, Math.round((d.wc/weekMax)*36));
                const isTd = d.day===today.toISOString().slice(5,10);
                return `<div class="pdv3-week-col">
                  <div class="pdv3-week-bar" style="height:${h}px;background:${isTd?'var(--fuji)':'var(--fuji-bg)'};border-color:${isTd?'var(--fuji)':'var(--fuji-border)'}" title="${d.day}: ${d.wc}字"></div>
                  <div class="pdv3-week-day" style="color:${isTd?'var(--fuji)':'var(--text-muted)'};font-weight:${isTd?700:400}">${d.day.slice(3)}</div>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- タスク -->
        <div class="pdv3-card">
          <div class="pdv3-card-head" style="--hc:var(--matcha)">
            <i class="fas fa-calendar-check" style="color:var(--matcha)"></i>
            <span>タスク</span>
            ${overdueTasks>0?`<span class="pdv3-overdue-chip"><i class="fas fa-triangle-exclamation"></i>${overdueTasks}件遅延</span>`:''}
            <button class="btn btn-ghost btn-sm" onclick="navigate('tasks')" style="margin-left:auto;font-size:10.5px">全件 <i class="fas fa-arrow-right" style="font-size:9px"></i></button>
          </div>
          <div class="pdv3-card-body">
            ${allTasks.length>0?`<div class="pdv3-task-bar-wrap">
              <div class="pdv3-task-bar"><div style="width:${taskPct}%;background:var(--matcha)"></div></div>
              <span style="font-size:10.5px;color:var(--matcha);font-weight:700">${taskPct}%</span>
            </div>`:''}
            ${allTasks.filter(t=>!t.done).slice(0,5).map(t=>{
              const isOverdue = t.dueDate && t.dueDate < new Date().toISOString().slice(0,10);
              const PRIO = {urgent:'var(--accent)',high:'var(--momo,#f76ca0)',medium:'var(--kogane)',low:'var(--matcha)'};
              return `<div class="pdv3-task-row">
                <div class="pdv3-task-dot" style="background:${PRIO[t.priority]||'var(--fuji)'}"></div>
                <div class="pdv3-task-info">
                  <span class="pdv3-task-title">${esc(t.title)}</span>
                  ${t.dueDate?`<span class="pdv3-task-due" style="color:${isOverdue?'var(--accent)':'var(--text-muted)'}">${isOverdue?'⚠ 期限切れ':'期限: '}${fmtDate(t.dueDate)}</span>`:''}
                </div>
              </div>`;
            }).join('')||`<div class="pdv3-empty-sm"><i class="fas fa-check-circle" style="color:var(--matcha)"></i> タスクはすべて完了</div>`}
            ${pendingTasks>5?`<div style="text-align:center;font-size:10.5px;color:var(--text-muted);margin-top:6px">他 ${pendingTasks-5}件</div>`:''}
          </div>
        </div>

        <!-- ツールリンク -->
        <div class="pdv3-card">
          <div class="pdv3-card-head" style="--hc:var(--kogane)">
            <i class="fas fa-compass" style="color:var(--kogane)"></i>
            <span>ツール・機能</span>
          </div>
          <div class="pdv3-card-body pdv3-links-grid">
            ${[
              {icon:'fa-book',label:'執筆日誌',page:'journal',color:'var(--matcha)'},
              {icon:'fa-table-cells-large',label:'ストーリーボード',page:'board',color:'var(--fuji)'},
              {icon:'fa-bolt',label:'インスピレーション',page:'inspiration',color:'var(--kogane)'},
              {icon:'fa-graduation-cap',label:'学習センター',page:'learn',color:'var(--fuji)'},
              {icon:'fa-toolbox',label:'ツール集',page:'tools',color:'var(--asagi,#6ddede)'},
              {icon:'fa-globe',label:'世界観設計',page:'worldbuilding',color:'var(--asagi,#6ddede)'},
            ].map(l=>`<button class="pdv3-link-btn" onclick="navigate('${l.page}')">
              <i class="fas ${l.icon}" style="color:${l.color}"></i>${l.label}
            </button>`).join('')}
            <div class="pdv3-links-sep"></div>
            <button class="pdv3-link-btn" onclick="openEditProjectModal('${proj.id}')">
              <i class="fas fa-pen" style="color:var(--text-muted)"></i>作品情報を編集
            </button>
            <button class="pdv3-link-btn pdv3-link-danger" onclick="confirmDeleteProject('${proj.id}')">
              <i class="fas fa-trash"></i>この作品を削除
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>`;

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
