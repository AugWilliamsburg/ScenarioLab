import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { cors } from 'hono/cors'

const app = new Hono()

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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
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
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&family=Noto+Serif+JP:wght@400;500;600;700&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs" type="module" id="pdfjs-script"></script>
  <script>
    // PDF.js worker path (loaded via module, accessible globally after load)
    window.PDFJS_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
  </script>
  <link rel="stylesheet" href="/static/app.css">
  <style>
    /* Tailwind 競合防止 — カスタムCSSが必ず優先 */
    html { font-size: 14px; }
    body { background: #f4f1eb !important; color: #16120a !important; font-family: 'Noto Sans JP', sans-serif !important; margin: 0; padding: 0; }
    #app { min-height: 100vh; }
  </style>
</head>
<body>
  <div id="app">
    <div id="initial-loader" style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f4f1eb;flex-direction:column;gap:16px">
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
</body>
</html>`)
})

export default app
