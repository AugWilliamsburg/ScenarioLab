import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { cors } from 'hono/cors'
import swSource from '../public/static/sw.js?raw'

const app = new Hono()

// Service Workerはルート直下（/sw.js）で配信する。
// /static/* はCloudflare Pagesの_routes.jsonでexcludeされ、Workerを
// バイパスして静的アセットとして直接配信される（=Honoミドルウェアで
// ヘッダーを付与できない）ため、SWだけはWorker側のルートとして
// 明示的に処理し、ここでScope拡張ヘッダーを付与する。
// （ファイル本体は public/static/sw.js を単一の原本として保持し、
//   ?raw インポートでビルド時に文字列として取り込むだけ。二重管理はしない）
app.get('/sw.js', (c) => {
  c.header('Content-Type', 'application/javascript; charset=UTF-8')
  c.header('Service-Worker-Allowed', '/')
  return c.body(swSource)
})

app.use('/static/*', serveStatic({ root: './' }))
app.use('/api/*', cors())

// API: Projects CRUD (localStorage-based on frontend)
app.get('/api/health', (c) => c.json({ status: 'ok', service: 'シナリオラボ' }))

// PDF extraction proxy - forwards requests to the Python pdfminer server (port 3001)
// This avoids mixed-content (HTTPS→HTTP) issues in the browser.
// The Hono worker calls the Python server server-to-server (HTTP is fine).
app.post('/api/extract-pdf', async (c) => {
  try {
    const body = await c.req.arrayBuffer();
    const contentType = c.req.header('content-type') || 'multipart/form-data';

    const resp = await fetch('http://localhost:3001/extract', {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: body,
    });

    if (!resp.ok) {
      return c.json({ error: `PDF server returned ${resp.status}` }, 502);
    }

    const data = await resp.json() as Record<string, unknown>;
    return c.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: `PDF proxy error: ${msg}` }, 500);
  }
})

// Main app - serve the full SPA
app.get('*', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover">
  <title>シナリオラボ — 脚本執筆支援ツール</title>
  <link rel="icon" type="image/png" sizes="16x16" href="/static/icons/favicon-16x16.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/static/icons/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="48x48" href="/static/icons/favicon-48x48.png">
  <link rel="shortcut icon" href="/static/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="/static/icons/apple-touch-icon.png">
  <link rel="manifest" href="/static/manifest.json">
  <meta name="theme-color" content="#e8593f">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="シナリオラボ">
  <!-- モバイル高速化: 外部オリジンへの接続を先行確立（DNS+TLSハンドシェイクを事前に済ませる） -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&family=Noto+Serif+JP:wght@400;500;600;700&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet">
  <script>
    // PDF.js worker path（本体は実際に使う瞬間まで動的import。head での事前ロード(327KB)は
    // モバイル初期表示を大きく遅らせるため廃止し、workerSrcの参照だけ用意しておく）
    window.PDFJS_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
  </script>
  <link rel="stylesheet" href="/static/app.css">
  <style>
    /* Tailwind 競合防止 — カスタムCSSが必ず優先 */
    /* ダークモード対応: !importantでのハードコード指定は data-theme切替後の
       app.css側のCSS変数を上書きしてしまうため、CSS変数経由に変更 */
    html { font-size: 14px; }
    body { background: var(--bg-base, #f4f1eb); color: var(--text-primary, #16120a); font-family: 'Noto Sans JP', sans-serif; margin: 0; padding: 0; }
    #app { min-height: 100vh; }
  </style>
  <script>
    // ダークモード設定を最初のペイント前に適用（フラッシュ防止）。
    // app.js本体の読み込み前に実行する必要があるため、ここに直接記述する。
    (function() {
      try {
        var raw = localStorage.getItem('sl_theme_setting');
        var setting = raw ? JSON.parse(raw) : 'light';
        var effective = setting === 'dark' ? 'dark'
          : setting === 'system' ? ((window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light')
          : 'light';
        document.documentElement.setAttribute('data-theme', effective);
      } catch (e) {}
    })();
  </script>
</head>
<body>
  <div id="app">
    <div id="initial-loader" style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:var(--bg-base,#f4f1eb);flex-direction:column;gap:16px">
      <div style="text-align:center;color:#7a6050">
        <div style="font-size:28px;margin-bottom:6px;font-family:'Noto Serif JP',serif;font-weight:700;color:#3d2b1e">シナリオラボ</div>
        <div style="font-size:12px;color:#a0896a;margin-bottom:16px">脚本執筆支援ツール — 起動中</div>
        <div style="width:200px;height:3px;background:#e8dfd0;border-radius:2px;overflow:hidden;margin:0 auto">
          <div id="loader-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#c8a882,#7a4e2d);border-radius:2px;transition:width .4s ease;animation:loaderPulse 1.5s ease-in-out infinite"></div>
        </div>
        <div id="loader-msg" style="font-size:11px;color:#b0906a;margin-top:10px">初期化中…</div>
      </div>
      <style>
        @keyframes loaderPulse { 0%{opacity:.6} 50%{opacity:1} 100%{opacity:.6} }
      </style>
    </div>
  </div>
  <script>
    // Progressive loader — show progress while app.js parses
    (function() {
      var bar = document.getElementById('loader-bar');
      var msg = document.getElementById('loader-msg');
      var pct = 0;
      var msgs = ['エンジン読み込み中…','評価システム初期化中…','UIコンポーネント準備中…','もうすぐ完成…'];
      var mi = 0;
      var timer = setInterval(function() {
        pct = Math.min(pct + (pct < 70 ? 8 : pct < 90 ? 3 : 1), 95);
        if (bar) bar.style.width = pct + '%';
        if (msg && mi < msgs.length && pct > mi * 25) { msg.textContent = msgs[mi++]; }
      }, 200);
      window.__loaderTimer = timer;
      window.__loaderDone = function() {
        clearInterval(timer);
        if (bar) bar.style.width = '100%';
        if (msg) msg.textContent = '完了';
        setTimeout(function() {
          var el = document.getElementById('initial-loader');
          if (el) el.style.display = 'none';
        }, 200);
      };
    })();
  </script>
  <script src="/static/app.js"></script>
  <script>
    // Service Worker登録：ホーム画面追加時のオフライン起動対応。
    // 対応ブラウザのみ実行（try/catchで非対応環境は安全に無視）。
    // メイン処理をブロックしないよう、ページのload完了後に登録する。
    //
    // ＋アップデート通知：新しいSWがインストール済み(waiting状態)になったら
    // 画面下に「更新があります」バナーを出す。sw.js側はinstall時に
    // skipWaiting()しない設計にしているため、ユーザーがバナーをタップして
    // 明示的に確認するまでは古い画面のまま安全に使い続けられる。
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        try {
          navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function(reg) {
            if (!reg) return;
            function notifyIfWaiting() {
              if (reg.waiting && navigator.serviceWorker.controller) {
                if (typeof window.__showUpdateBanner === 'function') window.__showUpdateBanner(reg);
              }
            }
            // 登録直後、すでにwaitingが存在するケース（前回訪問時の残り）
            notifyIfWaiting();
            reg.addEventListener('updatefound', function() {
              var installing = reg.installing;
              if (!installing) return;
              installing.addEventListener('statechange', function() {
                if (installing.state === 'installed') notifyIfWaiting();
              });
            });
          }).catch(function() {});
          // 新SWが実際に有効化されたらページを一度だけ再読込して最新版を反映
          var reloaded = false;
          navigator.serviceWorker.addEventListener('controllerchange', function() {
            if (reloaded) return;
            reloaded = true;
            window.location.reload();
          });
        } catch (e) {}
      });
    }
  </script>
</body>
</html>`)
})

export default app
