import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('/static/*', serveStatic({ root: './' }))
app.use('/api/*', cors())

// API: Projects CRUD (localStorage-based on frontend)
app.get('/api/health', (c) => c.json({ status: 'ok', service: 'シナリオラボ' }))

// Main app - serve the full SPA
app.get('*', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>シナリオラボ — 脚本執筆支援ツール</title>
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
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f4f1eb">
      <div style="text-align:center;color:#7a6050">
        <div style="font-size:24px;margin-bottom:8px">シナリオラボ</div>
        <div style="font-size:13px">読み込み中…</div>
      </div>
    </div>
  </div>
  <script src="/static/app.js"></script>
</body>
</html>`)
})

export default app
