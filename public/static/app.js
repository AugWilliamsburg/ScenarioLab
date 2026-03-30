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

  const p = State.currentPage;

  // 学習センター
  if (p === 'learn' || p === 'learn-guide' || p === 'learn-articles' || (p && p.startsWith('article-'))) {
    app.innerHTML = renderLayout(renderLearnPage());
    return;
  }

  // ツールページ
  if (p === 'tools' || p === 'tool-logline' || p === 'tool-char-diag' || p === 'tool-scene' || p === 'tool-timer') {
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

  if (p === 'dashboard' || !State.currentProjectId) {
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

  const cp = State.currentPage;
  const isLearnPage = cp === 'learn' || cp === 'learn-guide' || cp === 'learn-articles' || (cp && cp.startsWith('article-'));
  const isToolsPage = cp === 'tools' || cp === 'tool-logline' || cp === 'tool-char-diag' || cp === 'tool-scene' || cp === 'tool-timer' || cp === 'tool-pitch' || cp === 'tool-tension' || cp === 'tool-name-gen';
  const isTemplatesPage = cp === 'templates' || (cp && cp.startsWith('template-'));
  const isSettingsPage = cp === 'settings';
  const isJournalPage = cp === 'journal';
  const isNameDictPage = cp === 'namedict';
  const isWorldPage = cp === 'worldbuilding';
  const isInspirationPage = cp === 'inspiration';
  const isSpecialPage = isLearnPage || isToolsPage || isTemplatesPage || isSettingsPage || isJournalPage || isNameDictPage || isWorldPage || isInspirationPage;

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
    inspiration:      { icon:'fa-bolt',      color:'var(--kogane)', title:'インスピレーション', sub:'アイデア・刺激・乱数プロンプト' },
  };
  const cpKey = TOPBAR_PAGES[cp] ? cp : (cp && cp.startsWith('article-') ? 'learn' : null);
  const tbData = cpKey ? TOPBAR_PAGES[cpKey] : null;

  const topbarContent = proj ? `
    <div>
      <div class="topbar-title">${esc(proj.title)}</div>
      <div class="topbar-subtitle">${esc(proj.genre)} / ${esc(proj.format)}</div>
    </div>
    <div class="topbar-actions">
      <button class="btn btn-secondary btn-sm" onclick="navigate('dashboard')"><i class="fas fa-arrow-left"></i> 一覧</button>
      <button class="btn btn-primary btn-sm" onclick="quickSaveProject('${proj.id}')"><i class="fas fa-floppy-disk"></i> 保存</button>
    </div>` : tbData ? `
    <div>
      <div class="topbar-title"><i class="fas ${tbData.icon}" style="color:${tbData.color};margin-right:7px"></i>${tbData.title}</div>
      <div class="topbar-subtitle">${tbData.sub}</div>
    </div>
    <div class="topbar-actions">
      <button class="btn btn-secondary btn-sm" onclick="navigate('dashboard')"><i class="fas fa-house"></i> ホーム</button>
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
          <div class="sidebar-section-title">メインメニュー</div>
          <div class="nav-item ${(!proj && cp==='dashboard')?'active':''}" onclick="navigate('dashboard')">
            <span class="nav-icon"><i class="fas fa-house"></i></span> ダッシュボード
          </div>
          <div class="nav-item ${isJournalPage?'active':''}" onclick="navigate('journal')">
            <span class="nav-icon"><i class="fas fa-book" style="color:var(--matcha-lt)"></i></span> 執筆日誌
          </div>
          <div class="nav-item ${isInspirationPage?'active':''}" onclick="navigate('inspiration')">
            <span class="nav-icon"><i class="fas fa-bolt" style="color:var(--kogane-lt)"></i></span> インスピレーション
          </div>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-section-title">執筆サポート</div>
          <div class="nav-item ${isLearnPage?'active':''}" onclick="navigate('learn')">
            <span class="nav-icon"><i class="fas fa-graduation-cap" style="color:var(--fuji-lt)"></i></span> 学習センター
          </div>
          <div class="nav-item ${isToolsPage?'active':''}" onclick="navigate('tools')">
            <span class="nav-icon"><i class="fas fa-toolbox" style="color:var(--asagi-lt)"></i></span> ツール
          </div>
          <div class="nav-item ${isTemplatesPage?'active':''}" onclick="navigate('templates')">
            <span class="nav-icon"><i class="fas fa-copy" style="color:var(--kogane-lt)"></i></span> テンプレート
          </div>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-section-title">設計・資料</div>
          <div class="nav-item ${isNameDictPage?'active':''}" onclick="navigate('namedict')">
            <span class="nav-icon"><i class="fas fa-spell-check" style="color:var(--kon-lt)"></i></span> 名前辞典
          </div>
          <div class="nav-item ${isWorldPage?'active':''}" onclick="navigate('worldbuilding')">
            <span class="nav-icon"><i class="fas fa-globe" style="color:var(--asagi-lt)"></i></span> 世界観設計
          </div>
          <div class="nav-item ${isSettingsPage?'active':''}" onclick="navigate('settings')">
            <span class="nav-icon"><i class="fas fa-gear" style="color:var(--text-sidebar)"></i></span> 設定
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
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-size:16px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif">
          <i class="fas fa-folder-open" style="color:var(--accent);margin-right:8px"></i>作品一覧
          ${projects.length > 0 ? '<span style="font-size:12px;font-weight:400;color:var(--text-muted);font-family:inherit;margin-left:6px">(' + projects.length + '件)</span>' : ''}
        </div>
        <button class="btn btn-primary btn-sm" onclick="openNewProjectModal()">
          <i class="fas fa-plus"></i> 新規作成
        </button>
      </div>
      ${projects.length > 0 ? `
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
        <div style="position:relative;flex:1;min-width:160px">
          <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:12px"></i>
          <input id="db-search" class="form-input" style="padding-left:30px;height:34px;font-size:12.5px" placeholder="作品を検索...">
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          <button class="phase-filter-btn active btn btn-ghost btn-sm" data-phase="all" style="font-size:11px">すべて</button>
          ${['着想','リサーチ','コンセプト設計','プロット設計','キャラクター','アウトライン','初稿','大改稿','精密推敲','フィードバック','最終稿','共有・出力'].slice(0,6).map(ph => `<button class="phase-filter-btn btn btn-ghost btn-sm" data-phase="${ph}" style="font-size:11px">${ph}</button>`).join('')}
        </div>
      </div>` : ''}
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

      <!-- クイックリンク -->
      <div class="card" style="padding:14px">
        <div style="font-size:12.5px;font-weight:600;color:var(--text-secondary);margin-bottom:10px;font-family:'Noto Serif JP',serif"><i class="fas fa-compass" style="color:var(--accent);margin-right:6px"></i>クイックアクセス</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          ${[
            { icon:'fa-book', label:'執筆日誌', page:'journal', color:'var(--matcha)' },
            { icon:'fa-bolt', label:'インスピレーション', page:'inspiration', color:'var(--kogane)' },
            { icon:'fa-graduation-cap', label:'学習センター', page:'learn', color:'var(--fuji)' },
            { icon:'fa-toolbox', label:'ツール', page:'tools', color:'var(--asagi)' },
            { icon:'fa-globe', label:'世界観設計', page:'worldbuilding', color:'var(--asagi)' },
            { icon:'fa-spell-check', label:'名前辞典', page:'namedict', color:'var(--kon-lt)' },
          ].map(l => `<button class="btn btn-ghost btn-sm" style="justify-content:flex-start;gap:7px;font-size:11.5px" onclick="navigate('${l.page}')">
            <i class="fas ${l.icon}" style="color:${l.color};width:14px"></i>${l.label}
          </button>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
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

  // デフォルトはガイドタブ
  const activeTab = page === 'learn-articles' ? 'articles' : 'guide';

  const subnav = `
  <div class="learn-subnav">
    <div class="learn-subnav-item ${activeTab==='guide'?'active':''}" onclick="navigate('learn-guide')">
      <i class="fas fa-map"></i> ガイド
    </div>
    <div class="learn-subnav-item ${activeTab==='articles'?'active':''}" onclick="navigate('learn-articles')">
      <i class="fas fa-newspaper"></i> 記事
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
    // 記事一覧
    const articleCards = ARTICLES.map(a => {
      const c = COLOR_MAP[a.categoryColor] || COLOR_MAP['beni'];
      return `
      <div class="article-card" onclick="navigate('article-${a.id}')">
        <div class="article-card-header">
          <div class="article-card-icon" style="background:${c.bg};color:${c.color}">
            <i class="fas ${a.icon}"></i>
          </div>
          <div>
            <div class="article-card-title">${esc(a.title)}</div>
          </div>
        </div>
        <div class="article-card-body">
          <div class="article-card-desc">${esc(a.desc)}</div>
          <div class="article-card-tags">
            ${a.tags.map(t => `<span class="tag tag-gray">${t}</span>`).join('')}
          </div>
        </div>
        <div class="article-card-footer">
          <div class="article-read-time"><i class="fas fa-clock"></i> 約${a.readTime}分で読む</div>
          <span style="font-size:11px;color:var(--accent);font-weight:600">読む <i class="fas fa-arrow-right" style="font-size:9px"></i></span>
        </div>
      </div>`;
    }).join('');

    return `${hero}${subnav}
    <div style="margin-bottom:18px">
      <div style="font-size:15px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif;margin-bottom:4px">
        <i class="fas fa-newspaper" style="color:var(--fuji);margin-right:7px"></i>構成理論 記事
      </div>
      <div style="font-size:12px;color:var(--text-muted)">各構成理論を詳細に解説した専用記事です。クリックして読む。</div>
    </div>
    <div class="article-grid">${articleCards}</div>`;

  } else {
    // ガイド一覧
    const guideCards = GUIDES.map(g => {
      const c = COLOR_MAP[g.color] || COLOR_MAP['fuji'];
      return `
      <div class="guide-card" onclick="navigate('article-guide-${g.id}')">
        <div class="guide-card-icon" style="background:${c.bg};color:${c.color}">
          <i class="fas ${g.icon}"></i>
        </div>
        <div class="guide-card-title">${esc(g.title)}</div>
        <div class="guide-card-desc">${esc(g.desc)}</div>
        <div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:10.5px;color:var(--text-muted)"><i class="fas fa-list-check" style="font-size:9px;margin-right:3px"></i>${g.steps}ステップ</span>
          <span style="font-size:11px;color:${c.color};font-weight:600">読む <i class="fas fa-arrow-right" style="font-size:9px"></i></span>
        </div>
      </div>`;
    }).join('');

    return `${hero}${subnav}
    <div style="margin-bottom:18px">
      <div style="font-size:15px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif;margin-bottom:4px">
        <i class="fas fa-map" style="color:var(--fuji);margin-right:7px"></i>ステップバイステップガイド
      </div>
      <div style="font-size:12px;color:var(--text-muted)">脚本執筆の各テーマを段階的に解説。初心者から上級者まで対応。</div>
    </div>
    <div class="guide-grid">${guideCards}</div>`;
  }
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
    'story-circle': renderArticleStoryCircle(),
    'hero-journey': renderArticleHeroJourney(),
    'character-arc': renderArticleCharacterArc(),
  };

  const body = bodies[articleId] || `<p>コンテンツは準備中です。</p>`;

  return `
  <div style="max-width:820px">
    <div class="article-back-btn" onclick="navigate('learn-articles')">
      <i class="fas fa-arrow-left"></i> 記事一覧に戻る
    </div>
    <div class="article-header" style="margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid var(--border);position:relative">
      <div class="article-header::after" style="display:none"></div>
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
  };

  const body = guideContents[`guide-${guideId}`] || guideContents[guideId] || `<p>ガイドコンテンツは準備中です。</p>`;

  return `
  <div style="max-width:820px">
    <div class="article-back-btn" onclick="navigate('learn-guide')">
      <i class="fas fa-arrow-left"></i> ガイド一覧に戻る
    </div>
    <div class="article-header" style="margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid var(--border);position:relative">
      <div style="position:absolute;bottom:-1px;left:0;width:40px;height:2px;background:${c.color};border-radius:1px"></div>
      <div class="article-category-tag" style="background:${c.bg};color:${c.color};border:1px solid ${c.border}">
        <i class="fas ${guide.icon}"></i> ステップバイステップガイド
      </div>
      <div class="article-title">${esc(guide.title)}</div>
      <div class="article-subtitle">${esc(guide.desc)}</div>
      <div class="article-meta-row">
        <span><i class="fas fa-list-check" style="margin-right:3px"></i>${guide.steps}ステップ</span>
      </div>
    </div>
    <div class="article-body">${body}</div>
    <div style="margin-top:36px;padding-top:20px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
      <button class="btn btn-secondary" onclick="navigate('learn-guide')">
        <i class="fas fa-arrow-left"></i> ガイド一覧
      </button>
      <button class="btn btn-ghost btn-sm" onclick="navigate('learn-articles')"><i class="fas fa-newspaper"></i> 記事も見る</button>
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
  </div>
  <h2>Step 2 — 小説との違い</h2>
  <p>最大の違いは「内面を直接書けない」こと。「彼女は悲しかった」ではなく「彼女は窓の外を見つめ、何も言わなかった」と書く。感情は行動と映像で表現します。</p>
  <h2>Step 3 — 必要なマインドセット</h2>
  <p>脚本執筆に最も大切な心構えは「<strong>完璧な初稿は存在しない</strong>」ということ。プロの脚本家も初稿は荒削りです。まず書き切ることを最優先にしましょう。</p>
  <h2>Step 4 — ツールと環境</h2>
  <p>専用ソフトは不要。シナリオラボを使えば日本式フォーマットで書けます。重要なのはツールより習慣。毎日少しでも書く時間を確保することです。</p>
  <h2>Step 5 — 最初の一歩</h2>
  <p>まずは「どんな物語を書きたいか」を一文で書きましょう。「誰が」「何をしたいのか」「何が邪魔をするのか」の三要素が揃えば、あなたはもう脚本を書き始められます。</p>`;
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

  // ツール一覧
  const TOOL_LIST = [
    {
      id: 'tool-logline',
      title: 'ログラインメーカー',
      icon: 'fa-quote-left',
      color: 'beni',
      desc: '主人公・ゴール・障害・テーマの4要素を入力するだけでプロ品質のログラインを生成。何パターンも試せます。',
      badge: 'おすすめ',
    },
    {
      id: 'tool-pitch',
      title: 'ピッチドック・メーカー',
      icon: 'fa-bullhorn',
      color: 'beni',
      desc: '企画書・あらすじ・ピッチドキュメントを自動生成。プロデューサーや読者への売り込みに使える文書を即作成。',
      badge: '新機能',
    },
    {
      id: 'tool-char-diag',
      title: 'キャラクター診断シート',
      icon: 'fa-user-check',
      color: 'fuji',
      desc: 'Want/Need・バックストーリー・口癖・性格特徴を整理してキャラクターの深みを診断。アーク設計のヒントも。',
    },
    {
      id: 'tool-name-gen',
      title: 'キャラクター名ジェネレーター',
      icon: 'fa-signature',
      color: 'kon',
      desc: '和風・洋風・古風・SF/ファンタジー系のキャラクター名を自動生成。苗字・名前・読み仮名も提案します。',
      badge: '新機能',
    },
    {
      id: 'tool-scene',
      title: 'シーン構造チェッカー',
      icon: 'fa-film',
      color: 'momo',
      desc: '1シーンを分析して「入口・目的・対立・出口」の4要素が機能しているか診断。シーンの問題点を発見。',
    },
    {
      id: 'tool-tension',
      title: 'テンションカーブ設計',
      icon: 'fa-chart-line',
      color: 'momo',
      desc: '物語全体の緊張度を視覚化してカーブを設計。山場・谷・クライマックスの配置を確認・調整できます。',
      badge: '新機能',
    },
    {
      id: 'tool-timer',
      title: '執筆タイマー（ポモドーロ）',
      icon: 'fa-stopwatch',
      color: 'kogane',
      desc: '25分執筆＋5分休憩のポモドーロテクニック。執筆セッション数・文字数目標を管理して集中力を高めます。',
    },
  ];

  const toolCards = TOOL_LIST.map(t => {
    const c = { beni:'var(--accent)', fuji:'var(--fuji)', momo:'var(--momo)', kogane:'var(--kogane)', asagi:'var(--asagi)', kon:'var(--kon-lt)' };
    const bg = { beni:'var(--accent-bg)', fuji:'var(--fuji-bg)', momo:'var(--momo-bg)', kogane:'var(--kogane-bg)', asagi:'var(--asagi-bg)', kon:'var(--kon-bg)' };
    return `
    <div class="guide-card" style="cursor:pointer" onclick="navigate('${t.id}')">
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px">
        <div style="width:48px;height:48px;border-radius:var(--radius-md);background:${bg[t.color]||'var(--bg-hover)'};color:${c[t.color]||'var(--text-muted)'};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">
          <i class="fas ${t.icon}"></i>
        </div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px">
            <div class="guide-card-title" style="margin-bottom:0">${esc(t.title)}</div>
            ${t.badge ? `<span class="tag tag-beni" style="font-size:9.5px">${t.badge}</span>` : ''}
          </div>
          <div class="guide-card-desc">${esc(t.desc)}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end">
        <span style="font-size:11.5px;color:${c[t.color]||'var(--text-muted)'};font-weight:600">開く <i class="fas fa-arrow-right" style="font-size:10px"></i></span>
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
    <div style="font-size:13px;color:var(--text-muted)">執筆プロセスを加速する専用ツール集。アイデア出しから推敲まで、あらゆる場面をサポートします。</div>
  </div>
  <div class="guide-grid">${toolCards}</div>`;
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
  const d = $('#timer-display');
  const ml = $('#timer-mode-label');
  const sc = $('#timer-session-count');
  const tm = $('#timer-total-min');
  if (d) {
    const m = Math.floor(TimerState.seconds / 60);
    const s = TimerState.seconds % 60;
    d.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    d.style.color = TimerState.isBreak ? 'var(--matcha)' : (TimerState.seconds < 60 ? 'var(--accent)' : 'var(--text-primary)');
  }
  if (ml) ml.textContent = TimerState.isBreak ? '休憩タイム' : '執筆タイム';
  if (sc) sc.textContent = String(TimerState.sessions);
  if (tm) tm.textContent = String(TimerState.totalMinutes);
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
  const storageUsed = JSON.stringify(projects).length;
  const storageKB = (storageUsed / 1024).toFixed(1);

  return `
  <div class="section-header">
    <div class="section-title"><i class="fas fa-gear"></i> 設定</div>
    <div class="section-desc">シナリオラボの設定・データ管理</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:900px">
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-database icon" style="color:var(--kon-lt)"></i> データ管理</div></div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:2;margin-bottom:14px">
          <div>プロジェクト数: <strong>${projects.length}件</strong></div>
          <div>使用容量: <strong>約 ${storageKB} KB</strong></div>
          <div>保存先: <strong>ブラウザ LocalStorage</strong></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-secondary" onclick="exportAllData()"><i class="fas fa-file-export"></i> 全データをエクスポート（JSON）</button>
          <button class="btn btn-ghost btn-sm" onclick="confirmClearAllData()" style="color:var(--accent)"><i class="fas fa-trash"></i> 全データを削除</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-circle-info icon" style="color:var(--fuji)"></i> アプリ情報</div></div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:2.2">
          <div>バージョン: <strong>v4.0.0</strong></div>
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
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-keyboard icon" style="color:var(--matcha)"></i> キーボードショートカット</div></div>
        <div style="font-size:12.5px;line-height:2.2">
          ${[
            ['Ctrl/⌘ + S', 'プロジェクトを保存'],
            ['Escape', 'モーダルを閉じる'],
          ].map(([k,d]) => `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)">
            <code style="background:var(--bg-hover);padding:2px 7px;border-radius:4px;font-size:11.5px;border:1px solid var(--border)">${k}</code>
            <span style="color:var(--text-muted)">${d}</span>
          </div>`).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-lightbulb icon" style="color:var(--kogane)"></i> 使い方のヒント</div></div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.9">
          <div>💾 エディタは1.5秒後に自動保存されます</div>
          <div>🔄 フェーズは上部「保存」ボタンで手動保存も可</div>
          <div>📋 テンプレートページに各種設計シートがあります</div>
          <div>📚 学習センターで脚本理論を体系的に学べます</div>
          <div>🛠️ ツールページに便利なユーティリティがあります</div>
        </div>
      </div>
    </div>
  </div>`;
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

  const recentEntries = entries.slice(0, 30).map(e => {
    const wc = e.wordCount || 0;
    const mood = e.mood || '😐';
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
      ${e.goal ? `<div style="font-size:12px;font-weight:600;color:var(--matcha);margin-bottom:5px"><i class="fas fa-bullseye" style="font-size:10px;margin-right:4px"></i>目標: ${esc(e.goal)}</div>` : ''}
      <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;white-space:pre-wrap">${esc(e.body||'').slice(0,200)}${(e.body||'').length>200?'…':''}</div>
      ${e.reflection ? `<div style="margin-top:8px;font-size:12px;color:var(--text-muted);border-top:1px solid var(--border);padding-top:8px;font-style:italic"><i class="fas fa-comment" style="font-size:9px;margin-right:4px"></i>${esc(e.reflection)}</div>` : ''}
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
      <div style="font-size:15px;font-weight:700;color:var(--text-primary);font-family:'Noto Serif JP',serif;margin-bottom:12px">
        <i class="fas fa-clock-rotate-left" style="color:var(--momo);margin-right:8px"></i>過去の記録
        <span style="font-size:12px;font-weight:400;color:var(--text-muted);margin-left:6px">(${entries.length}件)</span>
      </div>
      ${entries.length === 0 ?
        `<div style="text-align:center;padding:40px;color:var(--text-muted);background:var(--bg-subtle);border-radius:var(--radius-md);border:2px dashed var(--border)">
          <i class="fas fa-book" style="font-size:32px;display:block;margin-bottom:10px;opacity:0.3"></i>
          まだ記録がありません。今日の執筆を記録しましょう！
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
  ],
  themes: ['愛と喪失','アイデンティティの危機','許しと和解','正義と悪の曖昧な境界','成長と痛み','孤独と繋がり','真実と嘘','変化への抵抗','信頼と裏切り','自由の代償'],
  genres: ['社会派サスペンス','青春ラブストーリー','SF的ディストピア','家族ドラマ','歴史×現代','犯罪捜査もの','心理ホラー','ロードムービー','コメディ×シリアス','武士道時代劇'],
  moods: ['静かな絶望の中に希望','笑いながら泣ける','息が詰まるほどの緊張','疾走感と爽快感','ゆったりとした余韻','うずうずするスリル','じわりと温かい','底冷えするような孤独'],
};

function renderInspirationPage() {
  const saved = DB.get('inspiration_history', []);
  const rp = INSPIRATION_DB.prompts[Math.floor(Math.random()*INSPIRATION_DB.prompts.length)];
  const rt = INSPIRATION_DB.themes[Math.floor(Math.random()*INSPIRATION_DB.themes.length)];
  const rg = INSPIRATION_DB.genres[Math.floor(Math.random()*INSPIRATION_DB.genres.length)];
  const rm = INSPIRATION_DB.moods[Math.floor(Math.random()*INSPIRATION_DB.moods.length)];

  const historyHtml = saved.length > 0
    ? saved.slice(0,10).map(h => `
      <div style="padding:10px 12px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:6px">
        <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">${h.date}</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.6">${esc(h.combo)}</div>
      </div>`).join('')
    : `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">「アイデアを生成」ボタンで組み合わせが保存されます</div>`;

  return `
  <div class="section-header">
    <div class="section-title"><i class="fas fa-bolt"></i> インスピレーション</div>
    <div class="section-desc">執筆のきっかけ・刺激・アイデアプロンプトを取得しましょう</div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
    <!-- 左: プロンプトジェネレーター -->
    <div>
      <!-- ランダムプロンプト -->
      <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,var(--kogane-bg),var(--bg-white));border-top:3px solid var(--kogane)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="card-title"><i class="fas fa-random icon" style="color:var(--kogane)"></i> 今日のプロンプト</div>
          <button class="btn btn-ghost btn-sm" onclick="refreshInspiration()"><i class="fas fa-rotate"></i> 別のを見る</button>
        </div>
        <div id="insp-prompt" style="font-size:14px;color:var(--text-primary);line-height:1.8;padding:14px;background:white;border-radius:var(--radius-md);border:1px solid var(--kogane-border);font-family:'Noto Serif JP',serif;font-style:italic">
          「${esc(rp)}」
        </div>
        <div style="margin-top:10px;display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="copyPrompt()"><i class="fas fa-copy"></i> コピー</button>
          <button class="btn btn-primary btn-sm" onclick="savePromptToIdeas()"><i class="fas fa-lightbulb"></i> アイデアに追加</button>
        </div>
      </div>

      <!-- ランダムコンビネーター -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><div class="card-title"><i class="fas fa-shuffle icon" style="color:var(--fuji)"></i> ランダム組み合わせ</div></div>
        <div id="insp-combo" style="display:flex;flex-direction:column;gap:8px">
          ${renderInspirationCombo(rt, rg, rm)}
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:12px" onclick="generateInspirationCombo()">
          <i class="fas fa-dice"></i> 別の組み合わせを生成
        </button>
      </div>

      <!-- 全プロンプト一覧 -->
      <div class="card">
        <div class="card-header"><div class="card-title"><i class="fas fa-list icon" style="color:var(--asagi)"></i> プロンプト集</div></div>
        <div style="max-height:300px;overflow-y:auto">
          ${INSPIRATION_DB.prompts.map((p, i) => `
            <div style="padding:8px 10px;border-bottom:1px solid var(--border);font-size:12.5px;color:var(--text-secondary);line-height:1.6;cursor:pointer" onclick="selectPrompt(${i})">
              ${i+1}. ${esc(p)}
            </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- 右: カテゴリー別ブレスト + 履歴 -->
    <div style="display:flex;flex-direction:column;gap:16px">
      <!-- テーマ集 -->
      <div class="card">
        <div class="card-title" style="margin-bottom:10px"><i class="fas fa-heart icon" style="color:var(--momo)"></i> テーマ集</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${INSPIRATION_DB.themes.map(t => `
            <span class="tag" style="cursor:pointer;background:var(--momo-bg);color:var(--momo);border-color:var(--momo-border)" onclick="copyToClipboard('${esc(t)}')" title="クリックでコピー">${t}</span>`).join('')}
        </div>
      </div>

      <!-- ジャンル -->
      <div class="card">
        <div class="card-title" style="margin-bottom:10px"><i class="fas fa-film icon" style="color:var(--kon-lt)"></i> ジャンルヒント</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${INSPIRATION_DB.genres.map(g => `
            <span class="tag" style="cursor:pointer;background:var(--kon-bg);color:var(--kon-lt);border-color:var(--kon-border)" onclick="copyToClipboard('${esc(g)}')" title="クリックでコピー">${g}</span>`).join('')}
        </div>
      </div>

      <!-- ムード -->
      <div class="card">
        <div class="card-title" style="margin-bottom:10px"><i class="fas fa-theater-masks icon" style="color:var(--asagi)"></i> 作品のムード</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${INSPIRATION_DB.moods.map(m => `
            <span class="tag" style="cursor:pointer;background:var(--asagi-bg);color:var(--asagi);border-color:var(--asagi-border)" onclick="copyToClipboard('${esc(m)}')" title="クリックでコピー">${m}</span>`).join('')}
        </div>
      </div>

      <!-- 生成履歴 -->
      <div class="card">
        <div class="card-title" style="margin-bottom:10px"><i class="fas fa-clock-rotate-left icon" style="color:var(--text-muted)"></i> 生成履歴</div>
        <div id="insp-history">${historyHtml}</div>
      </div>
    </div>
  </div>`;
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
