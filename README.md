# シナリオラボ (Scenario Lab)

## Project Overview
- **Name**: シナリオラボ（脚本執筆支援ツール）
- **Goal**: 脚本・シナリオ執筆の全フェーズ（着想 → 構成 → 執筆 → 添削 → 管理）を一元的に支援するWebアプリケーション
- **Main Features**:
  - プロジェクト管理（作品ごとのアイデア・キャラクター・世界観・タスク管理）
  - 職員室：AI風の精密採点エンジンによる脚本添削（8カテゴリ・24項目、複数審査員視点でのフィードバック）
  - **道場**：学習センター内の演習型トレーニング機能。全16演習の自動採点・添削、稽古履歴ライブラリ、自作演習、段位システム、成長ダッシュボード（フェーズ4で抜本改良）
  - 執筆サポート：学習センター／ツール／テンプレート／**書斎（NEW）**
  - PDFファイルからの脚本テキスト自動抽出（縦書き・横書き対応、pdfminerベースの専用サーバー）
  - ジャーナル、名前辞典、世界観設定、インスピレーションボード、ストーリーマップ等の設計支援機能
  - PWA対応（ホーム画面への追加、専用アイコン）

## URLs
- **開発環境（サンドボックス）**: PM2にて `scenario-lab`（ポート3000）と `pdf-extractor`（ポート3001）が稼働
- **GitHub**: （未設定 — 必要に応じて `setup_github_environment` 実行後にpushしてください）

## 書斎（Study Room）— 抜本強化版
「執筆サポート」セクションに追加された、インプットとアウトプットの集積・執筆空間。

### 統計ダッシュボード・目標管理
- 総原稿数・総文字数・添削済み数・平均スコア・連続執筆日数（ストリーク）を集計表示
- 週間執筆アクティビティチャート
- 執筆目標の設定と進捗バー表示
- **デイリー執筆目標の達成リング（NEW）**：1日の目標文字数を設定すると、当日の増加文字数をSVGドーナツリングでリアルタイム表示（クリックで目標を編集、達成時はチェックマーク表示）。`renderStudyDailyGoalRing` / `study_daily_goal`

### アウトプットモード（自由執筆）
- ブラウザのタブのような複数原稿管理（タブバーで開閉・切替）
- ギャラリー表示：保存済み原稿をカード形式でコンパクトに一覧化、検索・複数選択対応
  - **タグクラウド絞り込み（NEW）**：ギャラリー内の全タグを頻出順に表示し、クリックでそのタグの原稿だけに絞り込み（`renderStudyGalleryTagCloud`）
  - **アクセントストライプ（NEW）**：カード左端に藤色〜桃色のグラデーションストライプを配置し、ホバー時に強調（UI/UX改良）
- 原稿テンプレート（自由メモ、脚本フォーマット等）から新規作成
- 高度なエディタ：フォント切替（ゴシック／明朝／タイプ）、タグ付け、Tabキーでの字下げ、集中執筆モード（Zenモード）
  - **Zenモード強化（NEW）**：集中執筆モード中はセッションタイマー（経過時間）と、そのセッション開始からの文字数増減をリアルタイム表示（`studyStartZenTimer`）
  - **読み上げ機能（NEW）**：Web Speech API（`SpeechSynthesisUtterance`）を用いてエディタ本文を音声で読み上げ（`studyToggleReadAloud`、日本語対応環境限定）
- 自動保存（900ms デバウンス）＋手動保存
- サイドパネルは4タブ構成：「添削」「**構成（NEW）**」「インプット」「履歴」
  - **構成ナビゲーター（NEW）**：本文から見出し相当行（【】括り、〇/○始まり、#見出し、「第◯幕/場/話/章」「シーン◯」等）を自動抽出し、クリックでエディタ内の該当位置へジャンプ。本文中の相対位置（%）も表示（`studyExtractHeadings` / `renderStudyOutlinePanel` / `studyJumpToHeading`）
- バージョン履歴（スナップショット保存・比較）
  - **版間diff比較（NEW）**：任意の過去版を選択し「現在と比較」で行単位LCSアルゴリズムによる追加/削除/共通行のdiffをモーダル表示。追加・削除行数も集計表示（`studyComputeLineDiff` / `studyDiffVersion`）
- キーボードショートカット対応
- 書き出し機能：原稿単位・全データのエクスポート
- **添削機能**：「この原稿を添削する」ボタンから、既存の「職員室」の精密採点エンジン（`staffRoomRunAnalysis`）を再利用してスコアリング・フィードバックを取得
  - サイドパネルにスコア・グレード・カテゴリ別採点を表示（バッジに光沢エフェクトを追加）
  - 「詳細」ボタンで総評・良い点・課題点・改稿提案・審査員コメントをモーダル表示
  - **添削スコアの推移スパークライン（NEW）**：再添削するたびに前回のスコアを履歴として保持し、直近10回分の推移を手描き風SVGスパークラインで可視化。初回との点差（上昇／下降）も色分け表示（`renderStudyScoreTrend` / `scoreHistory`）
- 削除操作にはブラウザ確認ダイアログを実装済み（`studyDeleteDraft`）

### インプットモード（学び・引用の集積）
- トグルボタンでアウトプットモードから切替
- 作家名・作品名・引用・気づき・タグを自由記録できるメモカード
- 5カテゴリ分類（名文・引用／技法・手法／気づき・発見／語彙・表現／構成メモ）
- 検索・カテゴリフィルタ対応
- インプット⇄アウトプット連携（インプットメモを原稿執筆時に参照）
- 編集・削除機能あり（削除は確認ダイアログ付き `studyDeleteInputConfirm`）

## Data Architecture
- **Data Models**:
  - `study_drafts`（書斎の原稿：id, title, content, tags, font, scoreResult, scoredAt, **scoreHistory[]（NEW：再添削ごとの過去スコア履歴、直近20件保持）**, linkedInputIds, pinned, goalWords, versions[], createdAt/updatedAt 等）
  - `study_daily_goal`（**NEW**：1日の執筆目標文字数。0で未設定）
  - `study_inputs`（書斎のインプットメモ：id, category, author, workTitle, quote, memo, tags, folderId 等）
  - `study_collections`（書斎インプットのコレクション：id, name, desc, inputIds[], color, createdAt/updatedAt）
  - `tasks`（タスク：id, title, body, done, priority, category, dueDate, folderId, estimatedMin, actualMin 等）
  - 既存モデル：projects, characters, ideas, journal entries, staffroom sessions 等
  - `sl_folders_<scopeKey>`（フォルダ定義：id, name, color。スコープキー例: `ideas_<projId>`, `researchnotes_<projId>`, `researchlinks_<projId>`, `world_notes`, `inspiration_scratches`, `projectnotes_<projId>`, `templates_custom`）
  - 各メモ・カードには任意項目 `folderId` を追加（未設定時は「未分類」として扱われ、既存データとの後方互換性を維持）
  - `sl_fav_tool` / `sl_fav_template`（お気に入りIDリスト）、`sl_history_tool` / `sl_history_template`（最近使ったIDリスト、最大8件）
  - `sl_usage_count_tool` / `sl_usage_count_template`（**NEW**：ツール／テンプレートIDごとの使用回数を集計するオブジェクト。`ToolHistoryDB.record`から自動加算）
  - `sl_tool_cat_collapsed`（**NEW**：ツールページのカテゴリID→開閉状態のマップ）
  - `sl_tool_today_dismissed`（**NEW**：「今日のツール」バナーを非表示にした日付文字列）
  - `sl_template_tag_filter`（**NEW**：テンプレート集で現在選択中のタグ絞り込み文字列）
  - `sl_custom_templates`（自作テンプレート：id, name, desc, content, tags, folderId, createdAt/updatedAt。複製・JSONエクスポート/インポートに対応）
  - `sl_foreshadowing_<projId>`（伏線トラッカーのデータ）、`sl_motifs_<projId>`（モチーフ・シンボルDBのデータ）、`sl_title_gen_saved`（保存済み生成タイトル）
  - `sl_template_form_<templateId>`（インタラクティブフォームの入力値、three-act/logline-sheet/char-basic対応）
  - `sl_inspiration_scratch_qm_draft`（**NEW**：クイックメモの自動保存ドラフト。本文/タイトル/タグ/タイプ/ピン状態を保持、保存確定または全欄空でクリア）
- **Storage Services**: ブラウザ `localStorage`（`sl_` プレフィックス付きキー、`DB.get/set` ラッパー経由）。サーバー側でのデータ永続化は行っていません。
- **Data Flow**: クライアントサイドSPA（`State.currentPage` による画面切替 + `render()` による再描画）。バックエンド（Hono）はHTML/静的アセット配信とPDF抽出プロキシのみを担当。

## User Guide
1. サイドバー「執筆サポート」セクションの「書斎」をクリックして書斎ページへ移動
2. 右上のトグルで「アウトプット」（執筆）と「インプット」（学びの収集）を切替
3. アウトプット：「新しい原稿」で執筆開始 → 自動保存 → 「この原稿を添削する」でAI添削 → ギャラリーで一覧管理
4. インプット：「インプットを追加」で好きな作家・作品からの学びを記録・分類・検索

## Favicon / PWA アイコン
- ブラウザタブのファビコン、および「ホーム画面に追加」時のアイコンを、ユーザー提供の羽根ペン(赤)ロゴに変更
- `public/static/icons/` に各サイズ（16/32/48/180/192/512/maskable-512）を生成し配置
- `public/static/manifest.json` でPWAアイコンを定義、`src/index.tsx` の `<head>` にfavicon/apple-touch-icon/manifestのメタタグを追加
- サイト内のロゴ・デザインはこの変更の対象外（変更なし）

## Deployment
- **Platform**: Cloudflare Pages（Hono + Vite + Wrangler）
- **Status**: 開発中（サンドボックス環境で稼働確認済み、本番デプロイは未実施）
- **Tech Stack**: Hono (backend/static配信) + Vanilla JS SPA (`public/static/app.js`) + Python/Flask（PDF抽出専用サーバー、`pdf_server.py`）
- **Local Dev**:
  ```bash
  npm run build
  pm2 start ecosystem.config.cjs       # メインアプリ (port 3000)
  pm2 start pdf_ecosystem.config.cjs   # PDF抽出サーバー (port 3001)
  ```
- **Last Updated**: 2026-07-22（モバイル版 構造独立化 第2弾＋起動速度改善＋ページ遷移アニメーション＋トップバーCSS優先順位バグ修正＋フォーム自動ズーム対策の実効性修正＋hover依存カードアクションのタッチ対応＋スクラッチパッド/かんばん/シーンマップ/ストーリーボードのD&Dタッチ対応（全4箇所完了）＋長押し時のネイティブ挙動抑制＋アイコン画像の軽量化＋モーダルのボトムシート化＋「戻る」ボタン対応(history.pushState連携)＋フェーズバーのモバイルUX改善(現在地の視認性・自動追従)＋モーダルのhistory非連動を解消＋触覚フィードバック(Vibration API)導入・適用箇所拡大(トグル・移動系11箇所)＋Service Worker導入(ホーム画面追加時のオフライン起動対応)＋オンライン/オフライン状態の可視化＋Service Workerのアップデート通知＋タスクリストのスワイプアクション＋エッジスワイプで戻る(PWA standalone限定)を反映）

## タスクリストのスワイプアクション（NEW・完了）
「モバイル版のモバイルアプリとしての抜本改良」の一環として、ネイティブのタスク管理アプリ（メール/ToDo系アプリ）で標準的な「一覧項目を左右にスワイプしてクイック操作する」ジェスチャーをタスク一覧に追加した。従来はボタンタップ（かつ`:hover`依存で見えにくい）のみで、片手操作での高速な処理ができなかった。

### 実装内容
- 各タスク項目を`.task-swipe-wrap`（背景の完了/削除アクション表示用の`.task-swipe-bg`＋実際の`.task-item`）で包む構造に変更。`renderTaskItem()`自体は変更せず、呼び出し側でラップするだけなので既存の`outerHTML`差し替えロジック（`toggleTaskDone`等）への影響はない
- `document`直下のイベントデリゲーション（`initTaskSwipeGesture`）でタッチ操作を検知。都度再レンダリングされるタスク一覧に対して個別リスナーの再バインドが不要な設計
- **右スワイプ**（緑背景「完了/未完了」が見える）: しきい値(70px)を超えたら`haptic('medium')`→`toggleTaskDone()`
- **左スワイプ**（赤背景「削除」が見える）: しきい値を超えたら`haptic('medium')`→`confirmDeleteTask()`（誤削除防止のため確認ダイアログを必ず経由。キャンセル時は見た目を元に戻す）
- 縦方向の動きが大きい場合は`axisLocked='y'`と判定してジェスチャーを即座に諦め、通常の縦スクロールに委ねる（誤操作防止）
- ボタン・入力欄・リンクからのタッチ開始は`closest('button, input, textarea, select, a')`で検知して除外（既存の編集/削除ボタン・サブタスク操作等との衝突を回避）
- 複数選択モード中（`TasksState.selecting`）はスワイプ自体を無効化し、チェックボックスでの選択操作を優先
- PC版（901px超）は`window.innerWidth`チェックで完全に無効化。CSSも`@media (max-width:900px)`内のみに閉じているため、PC版の見た目・操作は無変更

### 検証
- Node.js `vm`モジュールでジェスチャー本体を抽出実行し、以下を全て確認：
  - 右スワイプ(dx≥70px)で`medium`触覚＋`toggleTaskDone`呼び出し
  - 左スワイプ(dx≤-70px)で`medium`触覚＋`confirmDeleteTask`呼び出し
  - しきい値未満のスワイプでは何も起きず、位置が元に戻る
  - 縦方向優位の動き（axisLocked='y'）では完全に無視される
  - 複数選択モード中／PC幅(901px以上)では無効化される
  - ボタン等から開始したタッチは誤爆せず無視される
- `node -c`構文チェックOK、CSS波括弧対応チェック（open=close=2520）
- ビルド成功（`_worker.js` 38.95kB）、PM2再起動・HTTP 200確認、Playwrightコンソールキャプチャ（公開URL経由）でエラー0件、`dist/static/app.js`・`app.css`双方に反映を確認

## エッジスワイプで戻る（NEW・完了）
「モバイル版のモバイルアプリとしての抜本改良」の一環として、iOS/Androidネイティブアプリの標準的なナビゲーションジェスチャーである「画面左端から右方向へスワイプして1つ前のページに戻る」操作を追加した。

### 発見した問題・設計方針
- 通常のブラウザタブ表示では、OS/ブラウザ自体が既に「エッジスワイプで戻る」機能を提供している場合があり、アプリ側で同じジェスチャーを追加実装すると二重発火や操作感の齟齬が起きるおそれがある
- そのため、**ホーム画面に追加してPWA standaloneモードで起動した場合のみ**有効化する方針とした。`window.matchMedia('(display-mode: standalone)')`（Android Chrome等）と`navigator.standalone`（iOS Safari独自プロパティ）の両方で判定し、通常のブラウザタブ表示では一切発火しない
- モーダルが開いている・サイドバーが開いている間は、既存の「モーダルを下スワイプで閉じる」機能や`popstate`ハンドラとの競合を避けるため、このジェスチャー自体を無効化
- トップページ（`State.currentPage === 'top'`、戻り先がない画面）では発火させない

### 実装内容
- `document`直下のタッチイベントデリゲーション（`initEdgeSwipeBack`）で、画面左端24px以内から始まるタッチのみを検知
- 右方向へのドラッグに追従して`#page-content`を`translateX`で右にずらし、画面左端に半円形の矢印インジケーター（`.edge-back-indicator`）をドラッグ量に応じてフェードインさせる、ネイティブアプリ風の視覚的手応えを実装
- しきい値(80px)を超えたところで指を離すと`haptic('medium')`→ページを右へ滑らせるアニメーション→`history.back()`（既存の`popstate`ハンドラ経由で`navigate()`が呼ばれ、通常の「戻る」導線と完全に一致する動作になる）
- しきい値未満で指を離した場合や、縦方向優位の動き・左方向への動きを検知した場合は即座にジェスチャーを諦め、`transform`を`.2s`のトランジションで元の位置へ戻す
- `touchcancel`でも同様に安全にリセットされる
- PC版（901px超）は`window.innerWidth`チェックで完全に無効化。インジケーターCSSも`@media (min-width:901px) { display:none; }`で二重に無効化

### 検証
- Node.js `vm`モジュールでジェスチャー本体を抽出実行し、以下14ケース全てPASSを確認：
  - 非standalone環境では一切発火しない（`history.back()`未呼び出し）
  - standalone環境＋左端＋しきい値超えで`medium`触覚＋`history.back()`が正しく1回呼ばれる
  - しきい値未満では戻らず、位置がリセットされる
  - 左端以外から開始した場合・縦スワイプ優位・左方向スワイプでは無効
  - モーダルオープン中／サイドバーオープン中／トップページ／PC幅(901px以上)では無効
  - `touchcancel`で安全にリセットされ、戻る処理は発火しない
- `node -c`構文チェックOK、CSS波括弧対応チェック（open=close=2523）
- ビルド成功（`_worker.js` 38.95kB）、PM2再起動・HTTP 200確認、Playwrightコンソールキャプチャ（公開URL経由）でエラー0件、`dist/static/app.js`・`app.css`双方に反映を確認

### 既知の制約
- 実機のPWA standaloneモードでの実際の操作感（矢印インジケーターの見た目・タイミング感）は未検証。ロジックはVMサンドボックスで検証済みだが、実機での最終確認は今後の課題として残る

## モバイル版 構造独立化 第2弾：PC版とは別の独自モバイルUXへ（NEW・進行中）
「モバイル版はWebサイト版とはまた別の独自のものとして改良・進化させていこう」という要望に基づき、モバイル版を単なるPC版の縮小レイアウトから、構造そのものが異なる独立したモバイルアプリ的UXへ刷新した。

### 横切れ問題の根本解消
- 多くのページ（プロジェクトダッシュボード・書斎・世界観設計・学習センター等）がPC向けに組んだ「本文＋固定px幅の補足カラム」インラインgrid（例：`grid-template-columns:1fr 340px`）を持ち、モバイル幅ではそのまま展開されて右側カラムが画面から見切れていた
- 個別ページのJS修正では工数が膨大なため、CSS属性セレクタによる一括対策を採用。実コード内に存在する固定パターンを網羅的に集計し、13種類のパターンを`@media (max-width:900px)`内で`grid-template-columns:1fr !important`に一括変換（`app.css`末尾）
- 数値カラム（曜日カレンダー等、`repeat(7,1fr)`）は1列化すると意味を失うため、横スクロール可能な形で情報を保持
- 保険として`.page-content`等のページ本体レベルで`overflow-x:hidden; max-width:100vw`、テーブルは横スクロール対応

### ハンバーガー/オフキャンバスサイドバーの解体
- モバイルでは`.sidebar`を`visibility:hidden; pointer-events:none`で完全無効化し、PC版のスライドイン型サイドバーという概念自体を廃止
- 既存のハンバーガーボタン（`sidebar-toggle-btn`）の関数（`toggleSidebar()`）をモバイル幅（≦900px）でのみ分岐させ、新設「メニューハブ」ページへの直接遷移に変更。ボタンの見た目は保ちつつ、挙動を「サイドバーが横から出る」から「専用ページへ飛ぶ」という別パラダイムに置き換えた

### 新設「メニューハブ」ページ（`renderMenuHubPage` / `menu-hub`）
- サイドバーの3セクション構成（メインメニュー/執筆サポート/設計・資料）をそのままカードグリッド（2カラム）に変換し、全機能をアプリのホーム画面のようにカード一覧で提示
- 現在選択中の作品カード（タップで作品概要へ）、タスクの期限バッジ、新規作品作成ボタンも集約
- PC版はこのページへ遷移しない設計（保険として901px以上では非表示）

### ボトムナビの再構成（5項目）
- 従来「ホーム/書斎/ツール/日誌/メモ」→「ホーム/書斎/タスク/メモ/メニュー」に変更
- 頻繁にアクセスする機能（タスク管理、締切バッジ付き）を優先配置し、低頻度機能は新設メニューハブに集約する設計判断
- 「メニュー」タップでメニューハブへ、「メモ」タップは従来通りスクラッチパッドへ直接遷移

### トップバーの簡易化
- モバイルでは「一覧」「ダッシュボード」ボタン（secondary）を撤去（メニューハブに導線を集約済みのため）。保存・新規作品（primary）のみ残す
- ロゴのサブテキスト・区切り線を非表示にし、アプリのタイトルバーのように最小限の情報量に絞った

### 対応状況
- 構文チェック（`node -c`／CSS波括弧対応チェック）OK、ビルド成功（`dist/_worker.js` 32.81 kB）、PM2再起動・HTTP 200確認済み
- 実コード内の`grid-template-columns`インラインstyle文字列とCSS属性セレクタの完全一致を`grep`で検証済み（スペース有無等の不一致なし）
- `renderMenuHubPage()`内で参照する`TASK_DB.getTasks()` / `DB.getProject()` / `openNewProjectModal()`等の既存関数定義を確認し、整合性を静的検証済み
- Playwrightコンソールキャプチャでロード確認（コンソールエラー0件）

### 残タスク（次ターン対応予定）
- 実機（iOS/Androidの実ブラウザ、DevToolsモバイルエミュレーション）での視覚的な最終確認（横切れ解消・メニューハブ・ボトムナビ・サイドバー解体後の見た目）
- `app.js`本体自体のコード分割・遅延ロード（ページ単位でのdynamic import化）は未着手。現状のminify化は「同じ内容をより軽く送る」対応であり、「初期表示に不要なコードを後回しにする」対応ではないため、さらなる高速化の余地は残る

## オンライン/オフライン状態の可視化（NEW・完了）
Service Worker導入によりオフラインでもアプリ自体は開けるようになったが、「今オフラインなのかどうか」がユーザーに全く伝わらない状態だった（データはlocalStorage保存のため実害はないが、PDF抽出等の通信を要する操作だけが理由不明に失敗する体験になってしまう）。

### 実装内容
- `navigator.onLine`の変化を`window.addEventListener('online'/'offline', ...)`で検知
- トップバーに`#offline-indicator`（Wi-Fi切断アイコン＋「オフライン」ラベル、ゆっくり点滅するバッジ）を新設。初期表示は`navigator.onLine === false`時のみ`display:flex`
- オフライン化した瞬間：インジケーター表示＋`toast('オフラインになりました。データはこの端末に保存されます', 'error')`（`toast()`内部の仕組みにより自動的に`warning`触覚も発火）
- オンライン復帰時：インジケーター非表示＋`toast('オンラインに復帰しました', 'success')`（同様に`light`触覚が自動発火）
- 480px以下では省スペース化のためラベルを隠し、アイコンのみに省略

### 検証
- Node.js `vm`モジュールでイベントリスナー本体を抽出実行し、`offline`イベント発火時にインジケーターが`flex`表示・エラートースト・`warning`パターン（[12,40,12]）の振動、`online`イベント発火時に非表示・成功トースト・`light`パターン（8ms）の振動が正しく呼ばれることを確認
- CSS波括弧対応チェック（open=close=2497）、`node -c`構文チェックOK
- ビルド成功、PM2再起動・HTTP 200確認、Playwrightコンソールキャプチャ（公開URL経由）でエラー0件確認、`dist/static/app.js`・`app.css`双方に反映されていることを確認

## 触覚フィードバック（Vibration API）の導入（NEW・完了）
モバイルアプリらしい操作感を高めるため、主要な操作タイミングで軽い触覚フィードバック（バイブレーション）を追加した。ネイティブアプリでは標準的な「タップした感触が指に返ってくる」UXをWebアプリでも再現する。

### 実装内容
- 共通ヘルパー`haptic(kind)`を新設（`kind`: `'light'`=軽いタップ確認・8ms、`'medium'`=標準操作・15ms、`'warning'`=エラー・削除等の強め・[12,40,12]msパターン）
- `navigator.vibrate`未対応の環境（iOS Safariなど）では`try/catch`で安全に無視され、エラーは発生しない
- 適用箇所（第1弾）：
  - `toast()`：`success`表示時に`light`、`error`表示時に`warning`
  - ボトムナビ（`mobileNavGo`）タップ時：`light`
  - 「メモ」ボトムナビ（`goToScratchpad`）・クイックメモFAB（`openQuickMemo`）タップ時：`light`
  - 削除確認モーダル（`confirmDeleteGeneric`）の「削除する」実行時：`warning`
  - モーダルのボトムシートをスワイプで閉じきった瞬間：`light`
- **適用箇所拡大（第2弾・NEW）**：トグル系・移動系の操作全11箇所にも追加し、タップした瞬間に確実にフィードバックが返る網羅性を高めた
  - タスク完了トグル（`toggleTaskDone`）：完了にする瞬間は達成感のある`medium`、未完了に戻す時は`light`（トグル方向で強度を変える唯一の箇所）
  - サブタスク完了トグル（`toggleSubtask`）：`light`
  - ピン留めトグル4種（学習メモ`toggleNotePin`／プロジェクトノート`togglePinProjectNote`／スクラッチ`togglePinScratch`／ストーリーボードカード`togglePinCard`、書斎`studyTogglePin`）：`light`
  - 書斎インプットのお気に入りトグル（`studyToggleInputFavorite`）：`light`
  - D&D代替の「⇄移動」メニュー確定時（かんばん`moveKanbanTaskToColumn`／シーンマップ`moveSceneCardToAct`／ストーリーボード`moveBoardCardToColumn`）：`light`

### 検証
- Node.js `vm`モジュールで`haptic()`を抽出実行し、各`kind`で正しいバイブレーションパターンが`navigator.vibrate`に渡されることを確認
- `navigator.vibrate`が存在しない環境（iOS Safari相当）でも例外を投げず安全に動作することを確認
- 第2弾では`toggleTaskDone`のトグル方向依存ロジック（完了時`medium`／未完了復帰時`light`）をVMサンドボックスで2回連続トグルさせ、`navigator.vibrate`への引数が`[15, 8]`の順で正しく渡ることを確認
- `node -c`で構文チェックOK、ビルド成功、PM2再起動・HTTP 200確認、Playwrightコンソールキャプチャ（公開URL経由）でエラー0件確認

## Service Worker導入：ホーム画面追加時のオフライン起動対応（NEW・完了）
「モバイルアプリとしての抜本構造改革」の一環として、PWAとしての基盤（`manifest.json`・`apple-mobile-web-app-*` meta tag）は既に整っていたが、Service Workerが未実装で、ホーム画面に追加してもオフライン/不安定回線時に真っ白な画面になる問題があった。

### 実装内容
- `public/static/sw.js`（単一の原本）を新設。データはすべて`localStorage`側にあるため、SWは配信アセット（HTML/CSS/JS）のキャッシュのみを担当する軽量な設計
  - ナビゲーション（HTML）: **network-first**。オンライン時は常に最新版を優先し、オフライン時のみキャッシュへフォールバック（アプリ更新の反映漏れを避ける安全志向）
  - 静的アセット（`/static/app.js`・`/static/app.css`等）: **stale-while-revalidate**。キャッシュを即返して起動を速くしつつ、裏で最新版を取得して次回起動に反映
  - `/api/*`（PDF抽出プロキシ等の動的処理）は一切キャッシュ対象外
- **配信ルートの設計**：Cloudflare Pagesの`_routes.json`で`/static/*`はWorkerをバイパスして直接配信される（`exclude`設定）ため、`/static/sw.js`のままではHono側で`Service-Worker-Allowed`ヘッダーを付与できない。そこで`/sw.js`をHonoの明示的なルート（`app.get('/sw.js', ...)`）として新設し、`?raw`インポートで`public/static/sw.js`を文字列として取り込んで返す方式に変更。これにより単一の原本を保ったまま、Service Workerのスコープをサイト全体（`/`）まで正しく拡張できた
- 登録側は`</body>`直前で`navigator.serviceWorker.register('/sw.js', { scope: '/' })`をload後に実行。`'serviceWorker' in navigator`で未対応環境は安全にスキップ

### 検証
- Node.js `vm`モジュールでService Worker本体をモックキャッシュ・モックfetchと共に実行し、以下を確認：
  - `install`イベントでコア資産（`/`・`app.css`・`app.js`・`manifest.json`）がキャッシュされること
  - ナビゲーションリクエストがオンライン時はネットワークから取得されること
  - ナビゲーションリクエストがオフライン時はキャッシュへ正しくフォールバックすること
  - 静的アセットがキャッシュヒット時に即座にキャッシュから返り、裏で再取得が走ること
  - POSTリクエスト・`/api/*`・クロスオリジンリクエストがいずれも`respondWith`を呼ばず素通しされること（意図しないキャッシュ介入の防止を確認）
- `curl`で`/sw.js`に`Service-Worker-Allowed: /`ヘッダーが正しく付与されていることを確認（ローカル・公開URL双方）
- `node -c`で構文チェックOK、ビルド成功（モジュール数38→39、`?raw`インポートが正しく機能）、PM2再起動・HTTP 200確認、Playwrightコンソールキャプチャ（公開URL経由）でエラー0件確認

### 補足
- `dist/static/sw.js`（ビルド時の静的コピー）も残るが、実運用では`/sw.js`ルートのみが使われるため無害な残留物。原本は`public/static/sw.js`の一箇所のみで二重管理はしていない

## Service Workerのアップデート通知（NEW・完了）
Service Worker導入時は`install`時に即`skipWaiting()`する設計にしていなかった（意図的）ため、新バージョンをデプロイしても、開いたままのタブでは古いキャッシュのまま動き続け、ユーザーが手動でアプリを閉じて再度開くまで更新が反映されない問題があった。かつ「今、更新がある」ことに気づく手段が一切ないため、実質的に更新が反映されないまま使われ続けるリスクがあった。

### 設計方針
- **勝手にリロードしない**：新バージョンを検知した瞬間に裏で自動リロードすると、フォーム入力中や執筆中の作業が予告なく中断されてしまう。ユーザーが明示的に「更新する」をタップするまでは、古い画面のままでも安全に使い続けられる設計を維持した
- **sw.js側**：`install`イベントで`skipWaiting()`を呼ばない（既存の挙動を維持）。新たに`message`イベントを追加し、`'SKIP_WAITING'`を受け取った時だけ`self.skipWaiting()`を呼ぶようにした
- **index.tsx（登録スクリプト）側**：`register()`後、`reg.waiting`が存在する（＝新バージョンが待機中）ことを検知したら`window.__showUpdateBanner(reg)`を呼ぶ。検知タイミングは2つ：①登録直後に既に`waiting`が存在するケース（前回訪問時の残り）、②`updatefound`→`installing`の`statechange`が`'installed'`になったタイミング
- **app.js側**：`window.__showUpdateBanner(reg)`を新設。画面下部に「新しいバージョンがあります／更新する」バナーを表示し、タップされたら`medium`触覚→`reg.waiting.postMessage('SKIP_WAITING')`→バナーを閉じるアニメーション。二重表示防止のため既にバナーが存在する場合は何もしない
- **反映**：`navigator.serviceWorker.addEventListener('controllerchange', ...)`で、新SWが実際に有効化された瞬間（＝上記postMessageの結果）に一度だけ`window.location.reload()`し、最新版を画面に反映する

### 実装内容
- `public/static/sw.js`：`activate`直後に`message`イベントリスナーを追加（`event.data === 'SKIP_WAITING'`時のみ`self.skipWaiting()`）
- `src/index.tsx`：SW登録スクリプトを拡張し、`updatefound`/`statechange`/`controllerchange`のハンドリングを追加
- `public/static/app.js`：`haptic()`関数の直後に`window.__showUpdateBanner`を新設
- `public/static/app.css`：`.sw-update-banner`（画面下部固定・safe-area対応・PC版は右下寄せの小型表示に切替）と更新ボタンのスタイルを追加

### 検証
- Node.js `vm`モジュールでsw.js本体を実行し、`install`時に`skipWaiting()`が呼ばれないこと、`message('SKIP_WAITING')`受信時のみ`skipWaiting()`が呼ばれること、他のメッセージでは呼ばれないことを確認
- 同様に`__showUpdateBanner`関数本体を`el()`・`haptic()`と共に抽出実行し、①バナーがbodyに追加されること・②二重呼び出し時は追加されないこと（既存バナーのチェック）・③ボタンクリック時に`medium`触覚(15ms)発火・`postMessage('SKIP_WAITING')`送信・クロージングクラス付与・`setTimeout`によるバナー削除が正しく行われることを確認
- `node -c`で構文チェックOK、CSS波括弧対応チェック（open=close=2511）、ビルド成功（`_worker.js` 36.5KB→38.95KB、`SKIP_WAITING`/`updatefound`が正しく反映）、PM2再起動・HTTP 200確認、`/sw.js`への`Service-Worker-Allowed: /`ヘッダー付与を再確認、Playwrightコンソールキャプチャ（公開URL経由）でエラー0件確認

## フェーズバーのモバイルUX改善：現在地の視認性・自動追従（NEW・完了）
12フェーズを横スクロールで一覧するトップの「フェーズバー」について、モバイル幅（768px以下）ではアイコンのみになりラベルが完全に消えるため「今どのフェーズにいるか」がタップしないと分からない問題があった。

### 発見した問題
- `.phase-topbar` / `.phase-top-btn` 等の主要CSSが `app.css` 内に2箇所（約4694行目・約6270行目）重複定義されており、レイアウト方向（`flex-direction`の有無）等が微妙に異なっていた。ソース順で後方の定義が優先されるため実害はないが、保守性の観点で混乱を招く状態だった（重複統合は視覚回帰リスクが高いため今回は見送り、影響のない加算的な改善のみ実施）
- 768px以下でフェーズボタンのラベル（`.phase-top-label`）が一律`display:none`になり、アイコンだけの横スクロールリストになる。フェーズ変更後にバー自体が自動スクロールせず、現在地のボタンが横に長いリストの見切れた位置にあると気づきにくい

### 実装内容
- **現在地への自動スクロール追従**：`bindProjectPage()`内で、レンダリング後に`.phase-top-btn.active`要素を取得し、`scrollIntoView({inline:'center', block:'nearest'})`でフェーズバーの表示中央に自動的にスクロールするようにした（ページ遷移のたびに実行）
- **現在地のみラベルを復元表示**：768px以下でも`.phase-top-btn.active`だけは`flex-direction:row`＋ラベル表示（`max-width:60px`で省略表示）に変更し、アイコンのみの中でも「今どこにいるか」が一目で分かるようにした（他のフェーズボタンはアイコンのみのまま変更なし）
- **タップ領域の微増**：`.phase-top-btn`に`min-height:40px`を追加し、タップミスを軽減

### 検証
- Node.js `vm`モジュールで`bindProjectPage()`を抽出実行し、`.phase-top-btn.active`要素に対して`scrollIntoView({inline:'center',...})`が呼ばれることを確認
- `node -c`で構文チェックOK、ビルド成功、PM2再起動・HTTP 200確認、Playwrightコンソールキャプチャでエラー0件確認

### 既知の残課題
- CSS重複定義（4694行目付近・6270行目付近）自体の統合整理は、実機スクリーンショットでの視覚確認手段がない現状ではリスクが高いため見送り。将来的に実機確認が可能になった段階で対応するのが望ましい

## 「戻る」ボタン対応：history.pushState連携（NEW・完了）
モバイルアプリとして重大な欠陥だった「ブラウザ/Androidの戻るボタンを押すと、ページ内遷移が一切できずアプリが即座に終了する」問題を解消した。

### 発見した問題
`navigate()`関数がURL/履歴に一切関与しない単純なSPA内state切り替え（`State.currentPage`書き換え＋再render）だったため、`history.pushState`によるエントリが全く積まれていなかった。この状態でAndroid実機の「戻る」ボタンやブラウザの「戻る」を押すと、ブラウザ的には「これより前の履歴がない」と判定され、アプリ自体が終了・前のサイトへ離脱してしまう。ページを何回移動しても、一段ずつ戻ることができない構造的欠陥だった。

### 実装内容
- `navigate(page, projectId)`内で、ページ遷移ごとに`history.pushState({slPage, slProjectId}, '', location.href)`を発行し、遷移履歴をブラウザの履歴スタックに積むようにした
- `window.addEventListener('popstate', ...)`を新設し、戻る操作が発生したら`e.state`からページ情報を復元して`navigate()`を再実行（このときは`pushState`を再発行しないよう`_isPopStateNav`フラグで抑止し、無限にスタックが積まれることを防止）
- 戻る操作時に開いているモーダルが前のページの上に浮いた状態で残ってしまう見た目の破綻を防ぐため、`popstate`受信時に`closeModal()`を先に呼ぶ
- `init()`の初回描画後に`history.replaceState(...)`で最初のページ状態も履歴に登録し、1回目の「戻る」でも空のstateにならないようにした

### 検証
- Node.js `vm`モジュールで`history.pushState`/`popstate`を模したサンドボックスを構築し、`top → tasks → study`と遷移した後、`戻る`を2回シミュレートして`study → tasks → top`と正しく後退することを確認（スタックの先頭に達した後の3回目の`戻る`は何も起きないことも確認）
- `node -c`で構文チェックOK、ビルド成功、PM2再起動・HTTP 200確認、Playwrightコンソールキャプチャでエラー0件確認

### 既知の残課題（解消済み。下記「モーダルのhistory非連動を解消」セクション参照）
- ~~モーダル自体は履歴に連動していない（モーダルを開いた状態で戻るボタンを押すと、モーダルが閉じるだけでなく1つ前のページへも同時に遷移する）~~ → 対応済み

## モーダルのhistory非連動を解消（NEW・完了）
上記の既知の残課題として残していた「モーダルを開いた状態で戻るボタンを押すと、モーダルが閉じるのと同時に1つ前のページへも遷移してしまう」問題を解消した。

### 採用した方針
`openModal()`は内部で必ず`closeModal()`を呼ぶ設計になっており、実際には複数のモーダルが同時に積み重なる「ネスト」状態は発生しない（常に1つのモーダルに置き換わる）ことをコード全体（`openModal(`呼び出し102箇所）から確認した。これにより、当初懸念していた「ネストしたモーダルでの複雑化リスク」は実質的に存在しないと判断し、`popstate`ハンドラ側のみを修正する低リスクな方式を採用した。`openModal()`/`closeModal()`本体や、既存の`closeModal();navigate(...)`という組み合わせ呼び出し（14箇所）には一切手を加えていない。

### 実装内容
- `popstate`ハンドラの先頭で、`$('#modal-overlay')`の有無により「戻る操作の時点でモーダルが開いていたか」を判定
- モーダルが開いていた場合：`closeModal()`でモーダルを閉じるのみとし、`navigate()`は呼ばない（ページ遷移はしない）。ただしブラウザは`popstate`発火時点で既に1つ前の履歴に移動済みのため、現在のページ状態を`history.pushState(...)`で再度積み直し、「戻る1回分」を打ち消す（次に戻るボタンを押した際、正しく1つ前のページへ移動できるよう履歴の深さを復元する）
- モーダルが開いていなかった場合：従来通り`navigate()`でページ遷移

### 検証
- Node.js `vm`モジュールで独自の履歴スタックシミュレータ（`pushState`/`replaceState`/`back()`を模した`FakeHistory`クラス）を構築し、`navigate()`と`popstate`リスナーを実コードから抽出して実行：
  - 通常時（モーダルなし）：`top→tasks→study`と遷移後、戻る2回で`study→tasks→top`と正しく後退することを確認
  - モーダルが開いた状態での戻る：ページは移動せず`study`のまま維持され、モーダルのみ閉じることを確認。その後の戻る操作でも履歴の深さが壊れておらず、`tasks→top`と正しく後退することを確認
- `node -c`で構文チェックOK、ビルド成功、PM2再起動・HTTP 200確認、Playwrightコンソールキャプチャでエラー0件確認

## モーダルのボトムシート化（NEW・完了）
「モバイルアプリとしての抜本構造改革」の一環として、アプリ全体で共通利用している`openModal()`/`closeModal()`基盤を、モバイル幅（900px以下）ではネイティブアプリのボトムシートに近いUXへ転換した。PC版は従来の中央ダイアログのまま変更なし。

### 実装内容
- **表示位置・出現アニメーション**：900px以下では画面下端に貼り付き、下からスライドインする（`modalSheetIn`キーフレーム）。角丸は上部のみ（`border-radius:18px 18px 0 0`）
- **ドラッグハンドル**：モバイル時のみモーダル上部に指でつまめる視覚的な棒状ハンドル（`.modal-drag-handle`）を追加表示
- **スワイプで閉じる**：ドラッグハンドルまたはヘッダー部分を下方向にタッチスワイプすると、指の動きに追随してモーダルが下にずれ、90px以上ドラッグした時点で離すと`closeModal()`が呼ばれて閉じる。90px未満で離した場合は元の位置に戻る（`_setupModalSwipeToClose`関数、`touchstart`/`touchmove`/`touchend`）
- **背面スクロールロック**：モーダル表示中は`body`に`position:fixed`を付与して背面のスクロールを禁止し、閉じた際に元のスクロール位置へ正確に復帰する（iOS Safariでのスクロール位置ジャンプ対策として`scrollY`を保存し、`body.style.top`で相殺してから`window.scrollTo`で復元）

### 対象範囲
- 共通基盤`openModal()`/`closeModal()`を経由する全モーダル（フォルダ管理・削除確認・タスク編集など大部分）が自動的にボトムシート化される
- 独自に`modal-overlay`をJSで直接構築している一部の個別実装（例：脚本添削のアノテーション付き詳細表示）は対象外（別途対応が必要な場合は今後検討）

### 検証
- Node.js `vm`モジュールでDOM/windowを最小限モックしたサンドボックス上で`openModal()`実行→`body`に`modal-open-lock`クラスが付与されること、`closeModal()`実行→同クラスが除去されることを確認
- `node -c`で構文チェックOK
- ビルド成功、PM2再起動・HTTP 200確認、Playwrightコンソールキャプチャでエラー0件確認

## 起動速度改善：ビルド時minifyパイプライン導入（NEW・完了）
「起動までが時間かかる」というモバイルUX課題に対応し、配信物（`dist/`）だけを対象にminify処理を導入した。開発時に読み書きする`public/static/app.js` / `app.css`のソースは非圧縮の読みやすい状態のまま維持し、`npm run build`実行時にのみ軽量化を適用する方式。

### 実装内容
- `scripts/minify-static.mjs`（新規）：`vite build`完了後に`dist/static/app.js`と`dist/static/app.css`をesbuildで上書きminifyするNodeスクリプト
- `package.json`の`build`スクリプトを`vite build && node scripts/minify-static.mjs`に変更し、通常の`npm run build`実行だけで自動的に軽量化が適用されるようにした
- `esbuild`（`--minify --charset=utf8`）を使用。`--charset=utf8`を指定することで、日本語文字列が`\uXXXX`エスケープに展開されてサイズが増えてしまう問題を回避

### 効果（配信物のみ、ソースは変更なし）
- `app.js`: 2,583,869 bytes → 2,150,998 bytes（17%減、gzip後は634KB→557KB）
- `app.css`: 334,147 bytes → 235,310 bytes（30%減、gzip後は55.9KB→37.8KB）
- グローバル関数名・文字列リテラル（`onclick="funcName(...)"`等のインラインイベントハンドラ文字列参照、`navigate('menu-hub')`等のページID文字列）はminify後も保持されることを確認済み（esbuildのデフォルト動作：トップレベルのグローバルスコープ識別子は安全のためリネームしない）

### 安全性検証
- Node.jsの`vm.runInThisContext`でオリジナル版とminify版の両方をサンドボックス実行し、`renderMenuHubPage()`が両方で完全に同一のHTML文字列（5102文字、内容一致）を返すことを確認
- `toggleSidebar()`をモバイル幅（375px）を模した環境で呼び出し、両方で同一の挙動（例外なく実行完了）を確認
- 主要関数（`renderMenuHubPage` / `toggleSidebar` / `mobileNavGo` / `goToScratchpad` / `navigate` / `renderLayout` / `render`）が両方の版で`function`型として定義されていることを確認
- `npm run build`実行後、PM2再起動・`curl`での実配信物取得（`/static/app.js`が2,150,998 bytes、`/static/app.css`が235,310 bytesで配信されていることを確認）・HTTP 200・Playwrightコンソールキャプチャ（エラー0件）まで完了済み

### 今後の候補
- ページ単位でのコード分割・遅延ロード（現状は全ページの全関数を1ファイルに含めて配信しているため、初期表示に不要なコードもダウンロード・パースされる）

## アイコン画像の軽量化（NEW・完了）
`public/static/icons/`配下のPWA/faviconアイコン8ファイルについて、既存依存関係（`sharp`、`miniflare`経由で既にインストール済み）を使ってPNG再圧縮（`compressionLevel: 9` + パレット化）を試行し、効果が確認できたファイルのみ選択的に適用した。

### 適用結果
| ファイル | Before | After | 削減率 |
|---|---|---|---|
| apple-touch-icon.png | 13,234 B | 7,749 B | 41% |
| icon-192.png | 14,632 B | 8,650 B | 41% |
| icon-512.png | 70,744 B | 42,454 B | 40% |
| maskable-icon-512.png | 51,952 B | 30,041 B | 42% |

上記4ファイル合計で約41KB削減。目視比較でも視覚的劣化は確認されなかった（単色ベタ塗り主体のシンプルなロゴのため、パレット化による損失が発生しにくい）。

### 適用しなかったファイル
以下は同条件で再圧縮するとむしろサイズが悪化したため、そのまま維持：
- `favicon-16x16.png`（470B→521B）・`favicon-32x32.png`（1084B→1190B）：極小サイズのためPNGヘッダ等のオーバーヘッド比率が高く、パレット化のメリットが出ない
- `favicon-48x48.png`：7%減のみで効果僅少のため見送り
- `logo_source.png`（62,235B→125,430B、-102%）：既に高度に最適化された状態、またはグラデーション/半透明を含む画像特性によりパレット化で逆にサイズ増

### 検証
- `npm run build` → PM2再起動 → `curl`でHTTP 200・アイコン配信確認
- Playwrightコンソールキャプチャでエラー0件確認

## カンバンボード・シーンマップ・ストーリーボードのD&Dタッチ対応（NEW・完了）
スクラッチパッドに続き、残る3箇所のHTML5ネイティブドラッグ&ドロップ依存箇所（タスク管理のかんばんビュー／ストーリーマップの幕間シーン移動／ストーリーボードの列間カード移動）にもモバイル代替手段を実装した。

### 発見した問題
- タスク管理「かんばんビュー」（`.kanban-card` draggable + `onKanbanCardDrop`）：緊急・To Do・今日・予定・完了の5列間をドラッグでタスクを移動する仕組みが、タッチデバイスでは一切機能しなかった
- ストーリーマップ（`.smap-scene-card` draggable + `smapDrop`）：幕（Act）間でシーンカードをドラッグ移動する仕組みが同様に機能しなかった
- ストーリーボード（`.board-card` draggable + `boardDrop`）：カスタム列（アイデア/構成中/完成/保留など）間でカードをドラッグ移動する仕組みが同様に機能しなかった
- いずれも「列 or 幕をまたぐ移動」というパターンで、スクラッチパッドの「同一リスト内の前後移動」とは性質が異なるため、上下ボタンではなく「移動先を選ぶモーダルメニュー」方式を採用した

### 修正内容
- 各D&D実装から移動ロジックを共通関数として抽出：`moveKanbanTaskToColumn(taskId, colId)` / `moveSceneCardToAct(cardId, mapId, fromActIdx, toActIdx)` / `moveBoardCardToColumn(cardId, boardId, colIdx)`。既存のドロップハンドラ（`onKanbanCardDrop`/`smapDrop`/`boardDrop`）はこの共通関数を呼ぶだけに整理
- 各カードに「⇄移動」ボタン（`.kanban-move-btn` / `.smap-move-btn` / `.board-move-btn`）を追加し、タップすると移動先（列名・幕名、現在の列/幕は除外）を選ぶ簡易モーダル（`openKanbanMoveMenu` / `openSmapMoveMenu` / `openBoardMoveMenu`）を表示
- ボタンは900px以下でのみ表示し、PC版では既存のドラッグ&ドロップ操作をそのまま維持

### 対応状況
- CSS波括弧対応チェック: `2470:2470 OK`
- JS構文チェック: `node --check` OK
- `npm run build`実行・minifyパイプライン適用済み（`app.js`: 2,154,328 bytes / `app.css`: 237,900 bytes）
- PM2再起動・HTTP 200確認・Playwrightコンソールエラー0件を確認

### 対応状況まとめ
これにより、確認できていたHTML5ネイティブD&D依存箇所（スクラッチパッド・かんばんビュー・ストーリーマップ・ストーリーボードの合計4箇所）すべてにモバイル代替操作を実装完了。

### 追加対応：長押し時のネイティブ挙動抑制
移動ボタンに一本化した後も、`draggable="true"`属性自体はモバイルのDOMにも残っているため、カードを長押しした際にiOS/Android標準のテキスト選択メニューやゴーストドラッグ画像が誤って表示される可能性が残っていた。対象4種のカード（`.kanban-card` / `.smap-scene-card` / `.board-card` / `.insp-scratch-card`）の`[draggable="true"]`セレクタに対し、900px以下で`-webkit-touch-callout: none` と `-webkit-user-drag: none` を追加し、ネイティブの長押し挙動を明示的に抑制した。
- CSS波括弧対応チェック: `2474:2474 OK`
- `npm run build`実行・minifyパイプライン適用済み（`app.js`: 2,154,328 bytes / `app.css`: 238,225 bytes）
- PM2再起動・HTTP 200確認・Playwrightコンソールエラー0件を確認

## スクラッチパッド「カスタム順」並び替えのタッチ対応（NEW・完了）
インスピレーション・ライブラリのスクラッチパッドで「カスタム順」ソートを選択すると、各メモカードにHTML5ネイティブドラッグ&ドロップ（`draggable="true"` + `ondragstart`/`ondragover`/`ondragend`/`ondrop`）による並び替えハンドル（`.sc-drag-handle`）が表示される。

### 発見した問題
- HTML5ネイティブD&D APIはタッチデバイスでは基本的に発火しない既知の制限があり、モバイルではドラッグハンドルが見えているのに並び替えが一切できなかった
- 同様のHTML5ネイティブD&Dはカンバンボード・シーンマップ・ストーリーボードの合計3箇所でも使われているが、影響範囲が大きいため、まず独立性が高くシンプルなスクラッチパッドから対応することにした

### 修正内容
- `scratchDrop`と同じ配列操作ロジック（`inspiration_scratches`から要素を取り出し目的位置に`splice`で挿入）を再利用した`scratchMoveByStep(id, dir)`関数を新規追加
- スクラッチカードのHTML生成部分に、900px以下でのみ表示される「↑」「↓」ボタン（`.sc-move-btns`）を追加し、それぞれ`scratchMoveByStep(id, -1)`／`scratchMoveByStep(id, 1)`を呼び出すようにした（先頭/末尾のカードでは対応するボタンを`disabled`化）
- PC版では`.sc-move-btns`を非表示のまま維持し、既存のドラッグ&ドロップ操作（`.sc-drag-handle`）を継続利用できるようにした。900px以下では逆に`.sc-drag-handle`を非表示にし、ボタン操作に一本化

### 対応状況
- CSS波括弧対応チェック: `2458:2458 OK`
- `npm run build`実行・minifyパイプライン適用済み（`app.js`: 2,151,757 bytes / `app.css`: 236,865 bytes）
- PM2再起動・HTTP 200確認・Playwrightコンソールエラー0件を確認

### 補足
- カンバンボード・シーンマップ・ストーリーボードの3箇所も同様のHTML5ネイティブD&D依存問題を抱えていたが、直後の「カンバンボード・シーンマップ・ストーリーボードのD&Dタッチ対応」で対応済み（下記参照）

## hover依存カードアクションのタッチ対応（NEW・完了）
`.idea-card-actions`（インスピレーション・ライブラリ）・`.board-card-actions`（ストーリーボード）・`.task-item-actions`（タスク管理、2箇所）・`.scene-card-actions`（シーンマップ）の合計4種のカード内アクションボタン群が、いずれも「デフォルト`opacity:0`、`:hover`で`opacity:1`」という設計になっていた。

### 発見した問題
- PC版ではカードにマウスを乗せた時だけ編集・削除等の操作ボタンが浮かび上がる、よくあるインタラクションパターン
- しかしタッチデバイスには`:hover`状態が発火しないため、モバイルではこれらのボタンが**常に透明のまま**残り、ボタン自体は存在するのに視覚的に見えず、結果的にタップもできない致命的な問題があった（ユーザーからは「編集・削除ボタンがどこにあるのか分からない」という体感になる）

### 修正内容
- `@media (max-width: 900px)`内で該当4クラスすべてに`opacity: 1 !important`を指定し、モバイルでは常時ボタンを表示・操作可能にした

### 対応状況
- CSS波括弧対応チェック: `2451:2451 OK`
- `npm run build`実行・minifyパイプライン適用済み（`app.css`: 236,507 bytes）
- PM2再起動・HTTP 200確認・Playwrightコンソールエラー0件を確認

## フォーム自動ズーム対策の実効性修正（完了）
既存の「iOSでの自動ズーム防止（16px未満のinputはフォーカス時に強制ズームされる）」対策CSSが、実際にはほとんど効いていなかった問題を発見・修正した。

### 発見した問題
- `app.js`内の`<input>`・`<textarea>`・`<select>`要素76箇所が、検索欄・タグ入力・タイマー設定・ノート編集など様々な場面でインラインstyleに`font-size:9px`〜`15px`を個別指定していた
- インラインstyleはCSSクラスセレクタより詳細度が高いため、`.form-input, .form-textarea, .form-select { font-size:16px }`という`@media (max-width:900px)`側の対策（`!important`なし）はこれらの要素に対して**一切上書きできていなかった**
- 結果として、フォーカス時に16px未満のフォントを持つ多数の入力欄で、実機のiOS Safariでは意図せず画面全体がズームインし、ユーザーが手動でズームを戻す必要がある状態だった

### 修正内容
- 対策ルールに`!important`を追加し、インラインstyleを確実に上書きするようにした
- `height:34px`前後で運用されている該当input/selectについて、16pxフォント+既存paddingでも収まる十分な余裕があることを確認（22px高さの要素は`<button>`のアイコンで対象外）
- IDセレクタで個別にfont-sizeを指定している`#template-search-input`等も、`!important`により正しく16pxへ上書きされることを確認（`!important`は詳細度に関わらず優先されるため）

### 対応状況
- CSS波括弧対応チェック: `2449:2449 OK`
- `npm run build`実行・minifyパイプライン適用済み（`app.css`: 236,384 bytes）
- PM2再起動・HTTP 200確認・Playwrightコンソールエラー0件を確認

## トップバー精査：CSS優先順位バグ修正＋副題の一貫非表示（完了）
「トップバー簡易化」実装後の詳細レビューで、CSSの優先順位に起因する不整合を発見・修正した。

### 発見した問題
- `.topbar-title`のfont-sizeが480px用（12.5px）・600px用（13px）・900px用（14px、簡易化で新規追加）の3箇所で定義されていたが、同じセレクタ・同じ詳細度のためCSSは**ソース内の記述順**で決まる。900px用ルールが最後に書かれていたため、480px/600pxの狭い画面でも常に14pxが適用され、意図した段階的な縮小が効かなくなっていた
- `.topbar-proj-info`/`.topbar-page-info`内の副題（`.topbar-subtitle`：作品ジャンル/フェーズや、ページの説明文）が、900px〜601pxの範囲でのみ非表示指定が漏れており、「アプリのタイトルバーのように最小限に絞る」という簡易化の意図に対し中間幅で情報量が戻ってしまっていた

### 修正内容
- `.topbar-title { font-size: 14px }`を`@media (max-width: 900px) and (min-width: 601px)`に範囲を絞り、600px/480px側の既存の縮小指定と競合しないようにした
- `.topbar-proj-info .topbar-subtitle`・`.topbar-page-info .topbar-subtitle`を900px以下で一括非表示にし、画面幅に関わらずトップバーは常に「現在地1行のみ」を表示するよう統一
- クイックメモFAB（`qm-fab`：どこからでも即時メモ）とボトムナビ「メモ」（`goToScratchpad()`：スクラッチパッド一覧へ遷移）は目的が異なる別機能であり、役割重複はないことを確認

### 対応状況
- CSS波括弧対応チェック: `2449:2449 OK`
- `npm run build`実行・minifyパイプライン適用済み（`app.css`: 236,374 bytes）
- PM2再起動・HTTP 200確認・Playwrightコンソールエラー0件を確認

## ページ遷移アニメーション（モバイル専用）（完了）
render()によるinnerHTML差し替えが「一瞬でページが切り替わる」PCサイト的な体感だったのを、モバイルアプリらしい滑らかな画面遷移に近づけた。DOM構造・JS側のロジックは変更せず、CSSのアニメーション定義のみで対応。

### 実装内容
- `#page-content`に`mobilePageIn`キーフレームアニメーション（`opacity:0→1` + `translateY(8px)→0`、0.22秒 ease）を適用。ページ遷移ごとにコンテンツがふわっと浮き上がるように表示される
- メニューハブのカード（`.menu-hub-card`）にも同アニメーションを適用し、`nth-of-type`/`nth-child`で各グループ・各カードごとに`animation-delay`（0秒〜0.16秒）をずらして設定。カードが一枚ずつ連続的に浮き上がる段階的（スタッガー）演出にした
- `@media (prefers-reduced-motion: reduce)`でアニメーションを`none`に無効化し、モーション過敏な利用者にも配慮
- すべて`@media (max-width: 900px)`内に限定し、PC版の表示・挙動には一切影響しない

### 対応状況
- CSS波括弧対応チェック: `2447:2447 OK`
- `npm run build`実行・minifyパイプライン適用済み（`app.css`: 236,245 bytes）
- PM2再起動・HTTP 200確認・実配信物サイズ確認（`/static/app.css`が236,245 bytesで配信されることを確認）
- Playwrightコンソールキャプチャでエラー0件を確認（ページタイトル・最終URLとも正常）

## モバイル最適化 第1弾：safe-area対応・タップ領域拡大・初期ロード軽量化（完了）
「モバイル版の使い心地」向上のための抜本対応、第1弾として以下を実施した。

**1. ノッチ／ステータスバーとの重なり解消（safe-area-inset対応）**
- `viewport-fit=cover`は指定済みだったが `env(safe-area-inset-top)` が未使用で、トップバー・サイドバーがステータスバー領域に食い込んでいた
- `@media (max-width:900px)` 内で `.topbar` に `padding-top: env(safe-area-inset-top,0px)` を追加し高さも動的に加算、`.sidebar` は `top`/`height` をsafe-area分ずらして重なりを解消
- トップバー直下に固定表示される `.timer-popup` の `top` 位置も追従するよう修正

**2. タップ領域拡大・タッチフィードバック改善（「ボタンの感度が悪い」への対応）**
- `.sidebar-toggle-btn`(34px→44px)・`.sidebar-close-btn`(28px→40px)・`.btn-icon`(30px→38px) など、Apple/Google推奨の44px基準に満たなかった主要ボタンをモバイル幅でのみ拡大
- `.btn`/`.nav-item` 等に `min-height` を追加してタップ判定領域を確保
- 従来 `:hover` にしか用意されていなかった押下時の視覚フィードバックを `:active { transform: scale(...) }` で追加し、タッチデバイスでも「押した」実感が即座に得られるようにした
- フォーム入力欄（`.form-input`等）をモバイルで `font-size:16px` に統一し、iOS Safariの自動ズーム（フォーカス時に画面が拡大されてしまう現象）を防止

**3. 初期ロード軽量化**
- `<head>`で常時読み込んでいた未使用の Sortable.js（44KB）と、pdf.js本体の事前ロード（327KB、実際は各利用箇所で動的`import()`済みで不要）を撤去 → 初回ロードで371KB分のブロッキングリクエストを削減
- Google Fonts / FontAwesome / jsDelivr への `<link rel="preconnect">` を追加し、DNS・TLSハンドシェイクを先行実行
- `app.css` 内に残っていた `@import url(Google Fonts...)` （`<head>`の`<link>`と重複し直列ブロッキングの原因）を削除

**対応状況**：構文チェック（`node -c`／CSS波括弧対応チェック）OK、ビルド成功、PM2再起動・HTTP 200確認、Playwright実機確認（コンソールエラーなし）済み。

**残タスク（次ターン対応予定）**：
- ボトムナビ・FAB・トースト等、モバイル固定要素同時表示時の重なり最終チェック
- モーダル操作性（スクロールロック・フォーカストラップ）の見直し
- 大きい`app.js`(2.5MB)自体の遅延ロード／コード分割の検討（現状は初期表示に直結する箇所ではないため優先度中）
- 実機（iOS/Androidの実ブラウザ）での最終確認

## インスピレーション・スクラッチパッド：抜本強化＋モバイル「メモ」ナビ新設（完了）
「スクラッチパッドをより飛躍的に進化させたい（いつでも手軽に着想やアイディアをメモにパッと書いていく用途）」という要望に対応し、クイックキャプチャ体験を核にUI/UXを抜本強化しました。あわせてモバイル版ボトムナビの「メニュー」を「メモ」に変更し、スクラッチパッドへワンタップでアクセスできるようにしました。

### モバイルボトムナビ「メモ」ボタン（変更）
- 従来「メニュー」（ハンバーガーメニュー起動）だったボトムナビ5項目目を「メモ」に変更（`goToScratchpad()`）。タップで即座にインスピレーション・スクラッチパッドタブへ直接遷移
- サイドバー（ハンバーガーメニュー）へのアクセス手段は、トップバーの`.sidebar-toggle-btn`（`toggleSidebar()`）がモバイル幅でも常時表示され続けるため、機能後退なく引き続き利用可能
- 現在ページがインスピレーションページのときは「メモ」ボタンをアクティブ表示

### クイックメモ機能（NEW・全ページ共通）
- モバイル幅（900px以下）で、インスピレーションページ以外のあらゆる画面に**クイックメモFAB**（右下固定・ペンアイコン）を新設。「今すぐ思いついたことをどこからでもパッと書ける」を実現（`openQuickMemo` / `.qm-fab`）
- タップでボトムシート風のフルスクリーンキャプチャUIが立ち上がる：
  - タイプ選択はワンタップのチップUI（着想／シーン／セリフ／テーマ／キャラ／設定／その他）
  - **音声入力（NEW）**：Web Speech API（`SpeechRecognition`）でマイクボタンを押して話すだけで本文欄に文字起こし追記（`voiceInputToggle`共通ヘルパー、書斎の読み上げ機能と対をなす音声入力機能）
  - **ドラフト自動保存（NEW）**：入力するたびに`localStorage`へドラフトを自動保存。誤ってページを閉じても、再度クイックメモを開くと自動的に復元（`qmAutoSaveDraft` / `QM_DRAFT_KEY`）
  - **「保存して次へ」連続キャプチャ（NEW）**：保存後にモーダルを閉じずフォームだけクリアし、続けて次の着想をすぐに書ける（`qmSaveAndNext`）
  - Escキー・オーバーレイ外タップで閉じる操作にも対応
- 既存のスクラッチパッド本体のクイック入力欄にも同じ音声入力ボタンを追加（`sc-mic-btn`）

### 「メモの掘り出し」ランダム再発見ウィジェット（NEW）
- スクラッチパッドタブのサイドパネル最上部に新設。クリックで過去のメモをランダムに1件呼び出し、モーダルで再表示（`shuffleScratchDiscovery`）
- モーダルからそのまま「別のメモ」で再シャッフル、または「展開する」で既存の展開パターン機能へ直接遷移

### モバイルレイアウト最適化
- スクラッチパッド本体の2カラムグリッド（入力・一覧／統計サイドパネル）を900px以下で1カラムに切替（`#insp-tab-content`内のグリッドを`flex-direction:column`へオーバーライド）

### 対応状況
- JS構文チェック・ビルド（`vite build`）・PM2再起動・稼働確認（200 OK、コンソールエラーなし、Playwrightコンソールキャプチャで実機確認）まで完了済み
- 関数定義／DOM ID宣言と参照の整合性を静的検証済み（重複定義・未定義参照なし）

## スクラッチパッド：継続記録streak・一括選択操作・ドラッグ&ドロップ並び替え（NEW・完了）
「引き続きよろしく：インスピレーションのスクラッチパッドをより素晴らしいものへ」という要望に基づき、前回の抜本強化に続けて、既存の実装ギャップ（一括操作・並び替え・習慣化促進）を軸に3つの新機能を追加しました。他機能（タスク・道場・ボード）の既存実装パターンを応用し、コードベースの一貫性を保っています。

### 継続記録（streak）ウィジェット（NEW）
- スクラッチパッドのサイドパネル最上部に、メモを書いた日をトラッキングして連続記録日数を表示するウィジェットを新設（`getScratchStreak` / `.sc-streak-card`）
- 道場の`ex_streak`と同様のロジックで、メモの`createdAt`日付集合から今日を起点とした連続日数を算出。今日まだメモを書いていない場合は「書いて記録を継続しよう」、記録が0の場合は「今日から記録を始めよう」とメッセージを変化させ、習慣化を後押し
- これまでの総記録日数（のべ日数）も併記

### 一括選択・一括操作（NEW）
- 検索・フィルターバーに「複数選択」ボタンを追加（`toggleScratchSelectMode`）。ONにするとカードにチェックボックスが表示され、タップで複数メモを選択可能（`toggleScratchSelected`）
- 選択中は一括操作バーが表示され、以下をまとめて実行できる：
  - **一括ピン留め**（`bulkPinSelectedScratches`）
  - **一括タグ付け**：既存タグから選んで選択メモ全件に追加（`bulkTagSelectedScratches`）
  - **一括フォルダ移動**（`bulkSetFolderSelectedScratches`）
  - **一括削除**：確認モーダル付き（`bulkDeleteSelectedScratchesConfirm` / `bulkDeleteSelectedScratches`、既存の`confirmDeleteGeneric`を再利用）
  - 「全選択」ボタンで表示中の全メモを一括選択/解除
- 実装はタスク管理機能（`TasksState`・`bulk*SelectedTasks`系）の既存パターンを踏襲し、コードベース全体の一貫性を維持

### ドラッグ&ドロップによる並び替え（NEW）
- ソート選択肢に「カスタム順（ドラッグ）」を追加。選択するとカードにドラッグハンドル（`.sc-drag-handle`）が表示され、HTML5ネイティブD&Dで手動並び替えが可能（`scratchDragStart` / `scratchDragOver` / `scratchDrop`）
- 並び替えた順序はそのまま`localStorage`の配列順として永続化。ボードカード（`boardDragStart`系）の既存実装パターンを応用
- ピン留め・複数選択モードとの併用時は競合を避けるため、通常表示時のみドラッグ操作を有効化

### 対応状況
- JS構文チェック・ビルド（`vite build`）・PM2再起動・稼働確認（200 OK、コンソールエラーなし）まで完了済み
- Playwrightによる実機動作検証：streakウィジェット・一括操作バー・選択チェックボックス・ドラッグハンドルの表示確認、および一括ピン留め・一括タグ付け・D&D並び替え・一括削除・streak計算の各処理を実際に呼び出して結果を検証し、全て期待通りの動作であることを確認済み（テスト用一時ファイルは検証後に削除）

## メモ・カード系機能：詳細ハブポップアップ化＋高度編集機能（完了）
「メモやステッカー系の機能に高度な編集機能を搭載し、コンテンツカードをクリックすると詳細ポップアップがダッシュボード的・ハブ的・タブ的に機能して、詳細情報を集約する」という要望に対応し、アプリ内の主要なメモ・カード系UIをタブ式の「詳細ハブポップアップ」に横断的に刷新しました。

### 共通基盤（新規）
- **`renderHubTabs(hubId, tabs, panelsHtml, activeKey)` / `switchHubTab`**：タブバー＋パネル切替を汎用化した共通関数。ボードカード編集（`openCardEditModal`）のタブ構造を参考に、全メモ系機能で再利用可能な形に一般化
- **タグチップエディタ（`renderHubTagEditor` / `addHubTag` / `removeHubTag` / `getHubTags`）**：クリックで削除・Enterで追加できるタグ管理UI。従来タグ機能を持たなかったアイデア・リサーチノート・世界観メモに新規追加
- **`renderHubMetaGrid(items)`**：作成日・更新日・文字数・カテゴリ等のメタ情報をチップ形式で一覧表示する共通ヘルパー（後述の改修でどのハブからも呼ばれなくなり、後方互換のため関数のみ残置）
- **`.hub-tabs` / `.hub-tab` / `.hub-tab-panel` / `.hub-meta-grid` / `.hub-tag-editor` / `.hub-link-list` / `.hub-clickable-card`** 等のCSSを新設（`app.css`末尾）。600px以下のレスポンシブ調整も対応

### 対象機能とハブ構成
- **アイデアカード（`openIdeaHub`）**：カード全体クリックで開くタブ式ポップアップ（編集／メタ情報）。タグ機能を新規追加、「他機能へ送る」機能を追加
- **インスピレーション・スクラッチ（`openScratchHub`）**：編集／展開する（4パターン）／作品へ送る、の3タブに既存の分散機能を統合
- **リサーチノート（`openResearchNoteHub`）**：編集／メタ情報の2タブ、タグ機能を新規追加。カテゴリ選択肢の既存タイプミスも修正
- **世界観メモ（`openWorldNoteHub`）**：編集／メタ情報の2タブ、タグ機能を新規追加
- **書斎インプットメモ（`studyEditInput`）**：編集／**関連**／メタ情報の3タブ。「関連」タブでは、このインプットを使用中の原稿一覧・所属コレクション一覧を集約表示し、クリックでそれぞれへジャンプ、コレクションからは個別に「外す」操作も可能（ダッシュボード的機能の核心部分）
- **ストーリーボードカード（`openCardEditModal`）**：カード全体クリックで編集モーダルを開けるように変更（従来は編集ボタンのみ）、既存の表面／裏面タブに加えて新規で「メタ情報」タブを追加
- **ムードボードアイテム（`editMoodItem`）**：軽量に更新日・文字数のメタ情報を表示するよう改良

### 後方互換性
- 既存の関数名（`editIdea` / `openEditScratch` / `editResearchNote` / `editWorldNote`）は、他箇所からの呼び出しに影響を与えないよう、新ハブ関数へのエイリアスとして保持

### 対応状況
- JS構文チェック・ビルド（`vite build`）・PM2再起動・稼働確認（200 OK、コンソールエラーなし）まで完了済み

## メモ・ステッカー系ハブ：自動保存化＋補足欄化＋リッチテキスト編集（NEW・完了）
上記「詳細ハブポップアップ化」で刷新した9箇所すべての内容入力ハブ（ダッシュボードのアイデアボード・リサーチノート・世界観メモ・ムードボード・プロジェクトノート、インスピレーションメモ、ストーリーボードカード編集、書斎インプットメモ、学習ノート）について、「①保存ボタンを押さないと保存されない」「②メタ情報欄が不要」「③内容欄の編集機能が貧弱」という3つの課題に対応し、サイト全体のメモ・ステッカー機能を横断的に改修しました。

### ①自動保存化（共通基盤：`hubAutoSave` / `hubFlushAutoSave` / `hubFlashSaved` / `renderHubAutoSaveIndicator`）
- 各入力欄（タイトル・本文・タグ・カラー等）の`oninput`/`onchange`に600msデバウンスの自動保存処理（`hubAutoSave`）を配線。入力を止めて600ms経過すると自動的にDB（localStorage経由）へ保存される
- モーダルを閉じる操作（背景クリック・キャンセルボタン等）では`hubFlushAutoSave`でデバウンス待ちの変更を即時確定保存してから閉じるため、入力直後に閉じても内容がロストしない
- 保存処理が走るとフッター付近に「保存済み」インジケーター（`renderHubAutoSaveIndicator`）が一時的に表示され、保存されたことが視覚的にわかる
- 従来の「保存」ボタンは全ハブで撤去（新規作成モードのみ、初回保存のトリガーとして残置するケースあり）

### ②メタ情報欄の廃止 → 「補足」欄への転換
- `renderHubMetaGrid`ベースの「メタ情報」タブ（作成日・更新日・文字数などの読み取り専用チップ表示）は全ハブから撤去
- 代わりに自由記述の「補足」欄（テキストエリア、新規`notesHtml`等のフィールド）をタブとして新設。用途・参考情報・関連メモなどユーザーが自由に書き込める欄に転換
- 新規作成モード（idがまだ無い状態）のハブでは、初回保存が済むまで補足タブを「保存後に補足を追加できます」という案内表示にとどめる設計で統一

### ③内容欄のリッチテキスト化（共通基盤：`renderHubRichEditor` / `hubRichExec` / `getHubRichValue` / `sanitizeRichHtml`）
- 主要な「内容」系欄（アイデア本文、リサーチノート内容、世界観メモ内容、ムードボードメモ、プロジェクトノート内容、スクラッチメモ、カード表・裏面、インプットの引用・気づきメモ、学習ノート内容）を`contenteditable`ベースのリッチテキストエディタに変更
- ツールバーから見出し（H1〜H3）・小見出し・**太字**・~~取り消し線~~・箇条書き・番号付きリスト・引用（blockquote）の書式を適用可能（`document.execCommand`使用）
- 貼り付け・入力されたHTMLは許可タグホワイトリスト（`HUB_RICH_ALLOWED_TAGS`）でサニタイズ（`sanitizeRichHtml`）し、スクリプトや不要なインラインスタイルの混入を防止
- 既存のプレーンテキストフィールド（`body`/`content`/`quote`/`memo`等）は一覧カード表示用として維持しつつ、新規の`*Html`フィールドにサニタイズ済みリッチHTMLを保存する二重管理方式とし、既存の一覧表示・検索・エクスポート等の処理を破壊しない後方互換設計を徹底

### 対象ハブ一覧（全9箇所・完了）
1. アイデアボード（`openIdeaHub`）
2. ムードボード（`editMoodItem`）
3. リサーチノート（`openResearchNoteHub`）
4. 世界観メモ（`openWorldNoteHub`）
5. プロジェクトノート（`editProjectNote`）
6. インスピレーションメモ（`openScratchHub`）
7. ストーリーボードカード編集（`openCardEditModal`）
8. 書斎インプットメモ（`studyEditInput`）
9. 学習ノート（`editLearnNote`、モーダル型ではなくページ内インライン編集構造）

### 命名パターン（各ハブ共通）
- `persistXxxEdit(...)`：DBへの書き込みのみを行い、モーダルのクローズや再描画は行わない（自動保存のコア処理）
- `closeXxxHub(...)`：`hubFlushAutoSave`で確定保存 → `closeModal()` → `render()`
- 旧関数名（`saveEditXxx`等）は`persistXxxEdit`を呼んでからclose・toast表示・renderを行うラッパーとして後方互換のため残置

### 対応状況
- 全9ハブについて、JS構文チェック（`node -c`）・ビルド（`vite build`）・PM2再起動・HTTP稼働確認（200 OK）・実ブラウザでのコンソールエラー確認（Playwright、エラー0件）まで完了済み
- 段階的に4回のコミットに分割して実施（1/9〜4/9・最終）

### リッチエディタ機能拡充（追加改良・完了）
9ハブ共通のリッチテキストエディタ基盤（`renderHubRichEditor`）に、以下の機能を追加しました。共通基盤への変更のため9箇所全てのハブに自動的に反映されます。
- **書式ボタン追加**：斜体・下線・番号付きリストのツールバーボタンを新設（既存の見出し／小見出し／太字／取り消し線／箇条書き／引用／書式クリアに追加）
- **アクティブ状態のハイライト（`hubRichUpdateToolbarState`）**：カーソル位置の書式（太字・斜体・下線・取り消し線・箇条書き・番号付きリスト）に応じて、該当するツールバーボタンが自動的にハイライト表示される（`document.queryCommandState`使用）
- **貼り付け時の自動サニタイズ（`hubRichHandlePaste`）**：Word・Webページ等からのコピー＆ペースト時、装飾過多なHTMLをそのまま挿入せず許可タグのみのHTMLに変換して挿入。プレーンテキストのみの場合は改行を維持して挿入
- **リアルタイム文字数カウンター（`hubRichOnInput`）**：エディタ直下に現在の文字数を常時表示。入力するたびにリアルタイム更新

### 対応状況（追加改良分）
- サンドボックスの一時フリーズ（ビルドプロセスのリソース超過）が発生したため`ResetSandbox`で復旧、ファイル・git状態は保持されたまま再ビルド・再起動を実施
- JS構文チェック（`node -c`）・ビルド（`vite build`）・PM2再起動・HTTP稼働確認（200 OK）・実ブラウザでのコンソールエラー確認（Playwright、エラー0件）まで完了済み

### クイック追加フォームのリッチエディタ化（追加改良・完了）
9ハブのうち、詳細ハブ（編集用ポップアップ）とは別に「クイック追加」専用のシンプルなフォームを持つ4箇所（アイデアボード・リサーチノート・世界観メモ・プロジェクトノート）について、追加時点ではまだプレーンテキストの`<textarea>`のままだった内容欄をリッチエディタ化し、編集時との一貫性を確保しました。
- `openAddIdeaModal`（アイデアを追加）／`openAddResearchNote`（リサーチノート追加）／世界観メモパッドの追加フォーム／`openAddProjectNote`（プロジェクトノートを追加）の4箇所を改修
- 追加時に入力したリッチHTMLは`bodyHtml`として保存し、`richHtmlToPlainText`で生成したプレーンテキストを既存の`body`フィールドにも同時保存（一覧表示・検索・エクスポート等の既存処理は無変更で動作）
- スクラッチパッドの「素早く書き留める」欄（音声入力対応、あえてシンプルな一言メモ用途）とストーリーボードの新規カード作成（タイトルのみ）は、用途上プレーンテキストのままとし対象外とした

### 対応状況（クイック追加フォーム分）
- JS構文チェック（`node -c`）・ビルド（`vite build`）・PM2再起動・HTTP稼働確認（200 OK）・実ブラウザでのコンソールエラー確認（Playwright、エラー0件）まで完了済み
- 既存の一覧表示・検索処理（`n.body`/`idea.body`等のプレーンテキスト参照）が壊れていないことをコード上で確認済み

### リンク挿入・元に戻す/やり直し機能の追加（追加改良・完了）
9ハブ共通のリッチエディタ基盤に、以下の機能をさらに追加しました。
- **リンク挿入/解除（`hubRichToggleLink`）**：ツールバーのリンクボタンで、選択中の文字列にURLリンクを付与。カーソルが既存リンク内にある場合はボタンを押すとリンクを解除。入力URLは`http://`/`https://`スキームのみ許可（`_hubRichIsSafeHref`で検証、`javascript:`等の危険なスキームは拒否）
- **サニタイズ側の`<a>`タグ対応（`sanitizeRichHtml`拡張）**：許可タグに`A`を追加し、`href`属性のみ安全性を検証した上で保持。保存されるリンクには`target="_blank" rel="noopener noreferrer"`を常に強制付与（タブジャッキング対策）。不正なhrefの場合はタグを除去し文字列だけ残す
- **プレーンテキスト変換時のURL保持（`richHtmlToPlainText`拡張）**：リンクテキストの後に`(URL)`を括弧書きで残すことで、検索・エクスポート時にリンク先URLも参照可能に
- **元に戻す/やり直しボタン**：`document.execCommand('undo'/'redo')`を使ったツールバーボタンを追加（ブラウザ標準のCtrl+Z/Ctrl+Yショートカットと併用可能）
- リンクボタンのアクティブハイライトは、`document.queryCommandState('createLink')`の信頼性が低いため、カーソル位置の祖先要素を直接走査して`<a>`要素内かどうかを判定する独自ロジックで実現

### 対応状況（リンク・Undo/Redo機能分）
- JS構文チェック（`node -c`）・ビルド（`vite build`）・PM2再起動・HTTP稼働確認（200 OK）・実ブラウザでのコンソールエラー確認（Playwright、エラー0件）まで完了済み

## テンプレート集：全31種をフォーム／チェック式／記事カード化（完了）
テンプレート集の各テンプレートを、内容の性質に応じて3タイプの専用UIに再構成しました。従来の「テキストをコピーするだけ」という一律の見せ方を廃し、記入すべきものはフォームに、チェックすべきものはチェックリストに、読んで理解すべきものは学習センター記事風のコンテンツカードに、それぞれ最適化しています。

### 3タイプの分類
- **フォーム型（24種）**：三幕構成、Save the Cat、起承転結、ストーリーサークル、ログライン＆企画書、非線形構成、複数視点構成、キャラクター基本／深掘り／アーク、敵役設計、関係性マップ、キャラクターボイス、バックストーリー、シーン・シーケンス、アクションシーン、フィードバックフォーム、執筆ログ、ピッチシート、テーマシート、世界観設計、シリーズバイブル、想定読者分析、ペーシング診断 — 各項目を入力すると自動整形されたテンプレート本文を生成（`TEMPLATE_FORM_SCHEMAS` / `openTemplateForm`）。select型フィールドにも対応
- **チェックリスト型（7種、NEW）**：シーンチェック、セリフチェック、オープニングシーンチェック、改稿シート、仕上げチェック、整合性チェック、ジャンルチェック — 項目ごとにチェックボックスで進捗管理し、チェック状態は自動保存。「未チェック/チェック済み」を反映したテキストを生成（`TEMPLATE_CHECKLIST_SCHEMAS` / `openTemplateChecklist`、専用6関数）
- **コンテンツカード型（2種、NEW）**：脚本フォーマット見本、サブテキスト変換ガイド — 学習センター記事「シナリオ十箇条」と同じ`.sct-overview`/`.sct-item-card`構造で、円形バッジ付きの詳細カード・サンプル・よくあるミス・チェックシート・活用法をひとつのモーダルに集約表示（`TEMPLATE_CARD_SCHEMAS` / `openTemplateCard`）

### 実装詳細
- `templateTypeIds(type)`：`TEMPLATE_CATS_DATA`を走査し`type`が一致するIDを動的収集する関数を新設。従来のハードコード配列を置き換え、テンプレート追加時の保守性を向上
- `showTemplate(id)`：フォーム／チェックリスト／カードの3分岐を追加し、該当タイプの専用UIへ自動振り分け
- テンプレート一覧カードに種別バッジ（フォーム対応／チェック式／読む）を表示（`renderTemplateCardHtml`）

### 対応状況
- JS構文チェック・ビルド（`vite build`）・PM2再起動・稼働確認（200 OK）まで完了済み
- iframeベースの独自テストハーネス＋Playwrightコンソールキャプチャによる実機検証：ボトムナビ表示、three-actフォーム（22フィールド）、scene-checkチェックリスト（13項目）、format-sampleカード（6項目）、いずれも正常動作を確認済み

## モバイル版アプリ最適化 — ボトムナビゲーション新設＋レスポンシブ強化（完了）
「モバイル版アプリを完成させて最高のものに仕上げたい：画面下にナビゲーションメニューを設けて感覚的にいつでもサッと開いて手軽に使えるように」という要望に対応し、モバイル表示をネイティブアプリに近い操作感へ強化しました。

### ボトムナビゲーション（NEW）
- 画面幅900px以下で画面下部に固定表示される5項目のナビゲーションバーを新設：「ホーム」「書斎」「ツール」「日誌」「メニュー」
- 「メニュー」タップで既存のサイドバー（ハンバーガーメニュー）をオーバーレイ表示、他4項目は該当ページへワンタップ遷移
- 現在ページに応じてアイコンをハイライト表示（アクティブ状態の視覚フィードバック）
- iPhoneのノッチ・ホームバー領域に対応する`env(safe-area-inset-bottom)`によるsafe-area対応、`viewport-fit=cover`をviewportメタタグに追加
- サイドバーが開いている状態でボトムナビをタップした場合は自動的にサイドバーを閉じてから遷移（`mobileNavGo`）

### 固定要素の重なり解消・レスポンシブ強化
- ページ本体（`.page-content`）にボトムナビの高さ分の下部余白を追加し、コンテンツがナビに隠れないよう調整
- トースト通知・集中執筆モードの切替ボタンなど、画面下部に固定表示される既存UIをボトムナビの上に持ち上がるよう位置調整
- 集中執筆モード中はボトムナビを自動的に隠し、フルスクリーン執筆に集中できるよう調整
- モーダルの最大高さ・フッターのフレックスラップをモバイル幅で調整し、ボトムナビ環境下でもボタンが隠れないよう対応
- テンプレート一覧グリッドを600px以下で1カラム化

### 対応状況
- JS構文チェック・ビルド（`vite build`）・PM2再起動・稼働確認（200 OK）まで完了済み
- iframeベースの独自テストハーネスによる実機検証：ボトムナビの表示・5項目のレンダリング・タップ遷移が正常動作することを確認済み

## モバイル最適化（PC版は無変更）
既存のCSSはPC版を含め一切変更せず、`@media (max-width: ...)` の追加のみでモバイル表示を改善しました。
- 脚本エディタ（メイン執筆画面）：900px以下でサイドパネルを縦積みに変更
- モーダル内フォーム（`grid-2`/`grid-3`）：600px以下で1カラム化、モーダル余白を縮小
- ムードボード／ストーリーサークル／カレンダー／各種リンクグリッド／タイマーのアンビエント選択：画面幅に応じて列数を調整
- フォーム入力欄・ボタン：600px以下でタップしやすいサイズに調整
- 書斎ページ独自の `@media (max-width: 900px)` ブロックは既に実装済み（別項参照）
- 既存のサイドバー開閉（ハンバーガーメニュー）、トップバー、ダッシュボード等のモバイル対応は元から実装されていたものを維持

## 今後の開発候補（未実装）
- 書斎の原稿を既存プロジェクトのシーン/アイデアへ取り込む連携機能
- インプットメモから執筆エディタへのドラッグ＆ドロップ的な参照挿入
- 実機/複数ビューポートでの視覚的モバイルQA（本セッションでは構文・依存関係の静的検証・Node.jsシムでのレンダリング検証のみ実施、実ブラウザでのクリック操作E2Eは未実施）
- タスクのかんばんD&Dはモバイル（タッチ操作）には未対応（HTML5 D&DはPCマウス操作前提）
- フォーカスタイマーはモーダルを閉じる/ページ離脱すると計測が途中でリセットされる（バックグラウンド継続には非対応）
- 道場：カテゴリ別レーダーチャート（多角形での得意・不得意の一望表示）は未実装（現状はバーチャートのみ）
- 道場：難易度別（初級/中級/上級）の成長トレンド分離表示は未実装（現状は全難易度混合の時系列のみ）
- 道場：稽古履歴ライブラリのエクスポート機能（書斎の原稿エクスポートと同様の仕組み）は未実装
- **app.jsのページ単位コード分割・遅延ロード（調査済み・見送り）**：`ARTICLES`/`GUIDES`/`window._EXERCISES`/`GLOSSARY_DATA`等の学習センター静的データ＋記事本文レンダリング関数群を合計しても`app.js`全体の7%程度（データ配列自体は約2.4%、記事本文関数群が約5%）であり、分割による初期表示高速化の効果が労力に対して限定的と判断。加えて`render()`関数がページ切替を完全に同期的に行う設計のため、`dynamic import`による遅延ロード化にはレンダリングパイプライン全体の非同期化が必要になり、回帰リスクが労力・効果に対して過大と判断し見送った。CSS/JS圧縮（minify）による軽量化（app.js 17%減・app.css 31%減）は既に適用済みで、これは「コードを分割する」のではなく「同じコードをより軽く送る」対応として別途完結している

## 削除確認・編集機能の統一 ＋ フォルダ分類機能（完了）
サイト内の各種メモ・カード類について、削除確認モーダルと編集ボタンを全対象で統一し、さらに新たに「フォルダ」による分類・集約機能を追加しました。

### 削除確認の統一
以下の全ての機能で、ブラウザ標準の `confirm()` を廃止し、共通の確認モーダル（`confirmDeleteGeneric`）に統一しました。誤操作防止のため、削除ボタン押下時に必ず確認モーダルが表示されます。
- 着想アイデア／キーワードタグ／リサーチノート／リサーチリンク／世界観メモ／タスク／ストーリーボードカード／インスピレーション・スクラッチパッド／インスピレーション・プロジェクトノート／学習メモ／書斎インプットメモ

### 編集ボタンの新規追加
編集ボタンが存在しなかった以下の機能に、新規で編集機能を追加しました。
- リサーチノート（`editResearchNote`）／リサーチリンク（`editResearchLink`）／世界観メモ（`editWorldNote`）

### フォルダ分類機能（新規）
既存のカテゴリ／タイプ分類を変更せず、その上位層として「フォルダ」による分類・集約機能を追加しました（共通モジュール `FolderDB`）。
- 対象：着想アイデア、リサーチノート、リサーチリンク、世界観メモ、インスピレーション・スクラッチパッド、インスピレーション・プロジェクトノート、**タスク・スケジュール（Phase 3で追加）**、**書斎インプット（Phase 3で追加）**
- 各アイテムには任意項目 `folderId` が追加されます（未設定時は「未分類」として扱われ、既存データへの後方互換性を維持）
- フォルダはスコープ（プロジェクトごと／グローバル）単位で独立管理され、フォルダバー（チップ表示）での絞り込みと、「管理」ボタンからのフォルダ追加・色変更・削除が可能です
- ストーリーボードカードは既存のカンバン・カレンダー等の整理体系があるため、フォルダ機能の対象外としています（削除確認のみ追加）

### 対応状況
- JS構文チェック・ビルド（`vite build`）・PM2再起動・稼働確認（200 OK）まで完了済み
- フォルダチップ・管理モーダル用のCSSも追加済み

## ライターズツール・テンプレート集 — 抜本進化（完了）
「ライターズツール」ページと「テンプレート集」ページに対し、UI/UXの抜本改良・機能強化・機能拡充を2波にわたって実施しました。既存データ構造・既存UIパターンは変更せず、上位層として拡張しています。

### 共通基盤（新規）
- **`ToolFavDB`**：ツール／テンプレート共通の「お気に入り」管理（`kind`パラメータで名前空間を分離、`fav_tool` / `fav_template` キー）
- **`ToolHistoryDB`**：ツール／テンプレート共通の「最近使った」履歴管理（最大8件、`history_tool` / `history_template` キー）。記録時に`ToolUsageDB`へ自動加算
- **`ToolUsageDB`（NEW）**：ツール／テンプレートの「使用回数」を永続集計（`usage_count_tool` / `usage_count_template` キー）。総利用回数・個別カウント・よく使う上位N件の取得に対応
- **`ToolCategoryCollapseDB`（NEW）**：ツールページのカテゴリごとの開閉状態を保持（`tool_cat_collapsed` キー）

### UI/UXの抜本改良
- ツール一覧・テンプレート集の両ページにデバウンス検索バーを追加（200ms遅延、フォーカス位置保持）
- 「お気に入り」「最近使った」のクイックアクセスセクションをページ上部に追加
- ツールカード／テンプレートカードのデザインを刷新し、カード上に★お気に入りボタンを統一配置
- **カードのアクセントストライプ（NEW）**：カード左端にカテゴリカラーのストライプを配置し、ホバー時に強調表示（`.toolx-card`）
- **統計チップバー（NEW）**：各ページヘッダーに「総数・お気に入り数・総利用回数」等をピル型チップで表示（`.toolx-stats-bar`）

### ライターズツール：新規ツール追加（3種）＋機能拡充
- **伏線トラッカー**：仕込んだ伏線をプロジェクトごとに一覧管理。4状態（仕込み中／強化中／回収済み／放棄）のステータス管理、進捗バー、ステータスフィルタ
- **タイトルジェネレーター**：ジャンル・キーワードを選ぶだけで作品タイトル案を大量生成（12パターンのテンプレート×6ジャンルの単語群）。生成結果は保存可能
- **モチーフ・シンボル管理**：反復モチーフ・象徴・小道具をプロジェクトごとに一覧管理し、作中の出現箇所（シーン等）を追跡記録
- **今日のツール（NEW）**：日付ベースのハッシュで毎日固有のツールを1件バナー提案。「今日は表示しない」で当日だけ非表示化可能（`renderTodayToolPick`）
- **よく使うツールランキング（NEW）**：使用回数トップ5をランキング表示（金・銀・銅のランクアイコン付き）
- **カテゴリのアコーディオン折りたたみ（NEW）**：カテゴリヘッダークリックで開閉可能。状態は永続化（`toggleToolCategoryCollapse`）
- **使用回数バッジ（NEW）**：各ツールカードに「◯回使用」の実績バッジを表示

### テンプレート集：機能強化・機能拡充
- **自作テンプレート機能（新規）**：ユーザー自身がテンプレートを作成・編集・削除できる専用タブを追加（`CustomTemplateDB`）。`FolderDB`によるフォルダ分類にも対応
- **インタラクティブフォーム化**：主要テンプレート3種（三幕構成シート／ログライン＆企画書シート／キャラクター基本シート）をフォーム入力対応に改修。項目ごとに入力するだけで自動整形されたテンプレート本文を生成し、入力内容は自動保存、プレビュー・コピー・ノート保存が可能
- **新規テンプレート追加（10種）**：非線形構成シート、複数視点構成シート、キャラクターボイス設計シート、バックストーリー設計シート、アクションシーン設計シート、オープニングシーンチェックリスト、ペーシング診断シート、整合性チェックリスト、シリーズバイブルシート、想定読者分析シート（既存5カテゴリに各2種を追加）
- **自作テンプレートの複製（NEW）**：ワンクリックで既存の自作テンプレートを複製し編集の出発点にできる（`CustomTemplateDB.duplicate`）
- **JSONエクスポート／インポート（NEW）**：自作テンプレート一式をJSONファイルとして書き出し・別環境から取り込み可能（`exportCustomTemplates` / `importCustomTemplatesFile`）
- **タグクラウド絞り込み（NEW）**：既存テンプレートの全タグを頻出順に表示し、クリックでそのタグのテンプレートに絞り込み（`renderTemplateTagCloud` / `setTemplateTagFilter`）
- **よく使うランキング（NEW）**：テンプレートの使用回数トップ5をクイックアクセス欄に表示

### 対応状況
- JS構文チェック・ビルド（`vite build`）・PM2再起動・稼働確認（200 OK）・Node.js evalテスト（`ToolUsageDB`／`renderTodayToolPick`／`CustomTemplateDB.duplicate`、全PASS）まで完了済み
- お気に入りボタン・クイックアクセス行・アクセントストライプ・統計チップ・ランキング・今日のツールバナー・アコーディオン用のCSSも追加済み

## タスク・スケジュール ＋ 書斎インプット — 抜本改良（Phase 3・完了）
「タスク・スケジュール」機能の感覚的な使いやすさと、「書斎」インプットモードの整理・活用性を大幅に強化しました。既存データ構造・既存UIパターンは破壊せず、上位層として拡張しています。

### タスク・スケジュール：UI/UX改良・機能拡充
- **「次にやること」スマート提案カード**：緊急×今日期限 → 期限切れ → 緊急タスク → 今日期限（見積時間短い順） → すぐ終わる(20分以内) → 未着手、の優先順位ロジックで自動的に「今やるべき1件」を提案。カードから直接「集中する」（フォーカスタイマー起動）や完了操作が可能
- **フォルダ分類（`FolderDB`統合、スコープ`tasks`）**：タスクをフォルダで横断的に整理。リストビューにフォルダバーを表示、新規／編集モーダルにフォルダ選択欄を追加
- **複数選択→一括操作**：リストビューで「複数選択」モードに切り替え、選択したタスクをまとめて「完了にする」「優先度を変更」「フォルダへ移動」「削除」（確認モーダル付き）
- **ワンタップ再スケジュール**：タスク項目を展開すると「今日／明日／来週／なし」のワンタップボタンで期限を即座に変更可能
- **フォーカスタイマー（ポモドーロ）**：タスクごとに25分の集中タイマーを起動。タイマー完了で実績時間（`actualMin`）に自動加算
- **かんばんビューのドラッグ＆ドロップ**：HTML5ネイティブD&Dで各カードを列間（緊急／ToDo／今日／予定／完了）にドラッグ移動、ドロップ時に優先度・期限日・完了状態を自動更新

### 書斎インプット：抜本改良（フォルダ・アクセス性・組み合わせ）
- **フォルダ分類（`FolderDB`統合、スコープ`study_inputs`）**：インプットメモをフォルダで整理。フォルダバー表示、編集モーダルにフォルダ選択欄を追加
- **並び替え機能**：更新が新しい順／追加が新しい順／使用回数が多い順／作家名（あ→ん）順
- **「使用中」バッジ（逆引き表示）**：各インプットカードに、原稿側の`linkedInputIds`から逆算した「この原稿で使用中」の使用回数バッジを表示。埋もれていたメモの活用状況が一目でわかる
- **複数選択→「コレクション」機能（新規、`StudyCollectionDB`）**：インプットを複数選択して「コレクション」としてまとめ、テーマ・目的別に組み合わせて保管。コレクション一覧・詳細ビュー（閲覧／インプットの追加・除去／まとめてコピー／削除確認）を新設
- インプット削除時、関連するコレクション・原稿連携（`linkedInputIds`）からも自動的に除去し、データ整合性を維持

### 対応状況
- JS構文チェック・ビルド（`vite build`）・PM2再起動・稼働確認（200 OK）まで完了済み
- Node.jsシムによるレンダリング関数の単体検証（`renderTasksPage`のリスト/かんばん/選択モード、`renderStudyInputMode`の一覧/選択モード/コレクションビュー）でエラーが無いことを確認済み
- タスク・書斎インプット関連の追加CSSも反映済み

## 道場（脚本家の鍛錬場） — 抜本改良（フェーズ4・完了）
ユーザー要望「道場をより道場として改善してほしい：過去のプロンプト/鍛錬もしっかりとライブラリ形式に保存されるべきだし、編集機能も充実させて、脚本家としての特訓を積み重ね確かに実力を高められるようにあらゆる指標で厳密で成長するためのアルゴリズムや仕組みを」に基づき、道場機能（学習センター内の演習型トレーニング）を全面的に強化しました。

### 稽古履歴ライブラリ（`DojoLibraryDB`）
- 演習ごとの全提出（解答＋添削結果）を新しい順に最大50件まで履歴として蓄積（従来は最新1件のみのキャッシュ）
- 演習ページに稽古履歴パネルを追加：過去の全提出を一覧表示し、自己ベストには王冠マークを表示
- 個別の提出履歴の削除、全履歴の一括削除に対応（削除確認モーダル付き）
- `allEntries()`で全演習・全カテゴリを横断した提出ログを取得可能（成長ダッシュボードの集計基盤）

### 自作演習（`CustomExerciseDB`）
- ユーザー自身が演習（設問・ルーブリック・ヒント・模範解答等）を自由に作成・編集・削除できる機能を追加
- 自作演習は既存の静的16演習と同じ構造で道場一覧に統合表示（「自作」バッジ付き）
- 自作演習削除時は関連する稽古履歴・下書きも自動的にクリーンアップ

### 添削アルゴリズムの精度向上・全16演習完全対応
- 専用評価エンジン（`generateExerciseFeedback`内の`evaluators`）を全16演習分完全カバー化（ルーブリック項目ごとに個別の判定ロジック・添削コメントを実装）
- 師範コメント（`masterComments`）を全演習で網羅し、点数帯に応じた総評・改善提案を生成
- ランダム問題生成エンジン（サイコロ稽古）の対象を全16演習に拡大

### UI/UX抜本改良：武道場デザイン言語（`.dojo-*` CSS基盤）
- 道場木札風の総合ヘッダーバナー、朱印風の添削結果パネル、印章風の実績バッジ、稽古履歴タイムライン等、武道・鍛錬のメタファーを強化したデザインに刷新
- **段位システム（`getDojoRank`）**：演習の達成率に応じて「見習い→五級→四級→三級→二級→初段→師範」の7段階で段位を判定し、道場バナーにエンブレムとして表示
- 演習カード・問題カード・解答カード・フィードバックパネル・サイドバー等、道場ページ全体のインラインstyleを統一クラス体系に移行し保守性を向上

### 成長ダッシュボード（新設）
「脚本家としての特訓を積み重ね確かに実力を高められるように」「あらゆる指標で厳密に成長を測るアルゴリズム」への対応として、稽古履歴ライブラリのデータを横断分析するダッシュボードを道場トップに常設しました。
- **総合統計**：総稽古数、全体平均点、最も得意なカテゴリ、伸びしろのあるカテゴリ、直近5稽古と前の5稽古を比較した成長度（＋/−点）を表示
- **成長トレンドグラフ**：直近20回の稽古スコアを時系列の折れ線グラフ（SVG手描き、外部ライブラリ非依存）で可視化。各点にタイトル・得点をツールチップ表示
- **カテゴリ別実力バー**：11カテゴリ（企画・構成、シーン設計、セリフ技法、キャラクター、構成分析、執筆技術、テーマ・構造、感情設計、キャラクター設計、葛藤・対立、推敲・リライト）それぞれの平均点をカラーバーで可視化。未稽古のカテゴリも「未稽古」ラベル付きで表示し、次に取り組むべき領域が一目でわかる
- 開閉トグル式パネルで、道場一覧の視認性を損なわない配置

### 対応状況
- JS構文チェック・ビルド（`vite build`）・PM2再起動・稼働確認（200 OK）まで完了済み
- Node.jsシムによるレンダリング関数の単体検証：`renderLearnExercises`（フィードバック有無・履歴有無・achievements有無の各分岐）、`renderExercisePage`（全16演習IDでの一括レンダリング、フィードバック有無）、成長ダッシュボード関連関数（空データ時／提出データあり時／開閉トグル時）でエラーが無いことを確認済み
- 道場専用CSS基盤（`.dojo-*`、`.dojo-growth-*`）を新設・反映済み
- 実ブラウザでのスクリーンショット目視確認は未実施（サンドボックスにChromiumバイナリが未インストール）。Node.jsによるHTML文字列レンダリング検証で品質を保証
