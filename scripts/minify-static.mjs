// ================================================================
// ビルド後処理: dist/static/app.js と app.css を esbuild でminify
// public/static/ 側のソースは開発者が読みやすい非圧縮版のまま維持し、
// 配信物（dist/）だけをモバイル向けに軽量化する。
// 狙い: 初回ロード時のダウンロード量削減 + パース時間短縮
//   （「起動までが時間かかる」というモバイルUX課題への対応）
// ================================================================
import { build } from 'esbuild';
import { readFileSync, writeFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distStatic = path.join(__dirname, '..', 'dist', 'static');

const targets = [
  { file: 'app.js', loader: 'js' },
  { file: 'app.css', loader: 'css' },
];

for (const { file, loader } of targets) {
  const filePath = path.join(distStatic, file);
  let before;
  try {
    before = statSync(filePath).size;
  } catch (e) {
    console.warn(`[minify-static] skip ${file}: not found in dist/static/`);
    continue;
  }

  const result = await build({
    entryPoints: [filePath],
    write: false,
    minify: true,
    charset: 'utf8',
    target: loader === 'js' ? ['es2018'] : undefined,
    loader: { [`.${file.split('.').pop()}`]: loader },
    logLevel: 'silent',
  });

  const minified = result.outputFiles[0].text;
  writeFileSync(filePath, minified, 'utf8');
  const after = statSync(filePath).size;
  console.log(`[minify-static] ${file}: ${before} -> ${after} bytes (${Math.round((1 - after / before) * 100)}% reduction)`);
}
