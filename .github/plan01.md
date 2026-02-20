# 書影取得率の改善と海外対応（欧州・英語圏）検討メモ

## 現状と課題

- 書影はNDL OpenSearchの検索結果からISBNを抽出し、NDLのサムネイルURLを参照している。
- ISBNが取れない資料は書影を作れないため取得率が下がる。
- CORS回避のため画像は `wsrv.nl` 経由にしているが、失敗時はデモデータにフォールバックしている。
- 海外作品（欧州・英語圏）のカバー取得ルートが未整備。

## 目標

- 無料・APIキー不要・CORS対応・高解像度書影が得られる範囲で取得率を上げる。
- 欧州/英語圏の作品に対応する。
- 失敗時は別APIへ自動切替し、ユーザー体験を保つ。
- キャッシュはクライアント内のみ（永続保存なし）。

## 無料API候補（キー不要）

### 1) Internet Archive / Open Library連携

- Open Libraryの背後にあるデータとして機能するため、個別連携は優先度低。

### 2) Open Library（海外対応）

- Search API: `https://openlibrary.org/search.json?q=...`
- Covers API: `https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg`
- OLIDが取れれば `https://covers.openlibrary.org/b/olid/{OLID}-L.jpg` も使える。
- CORSが通りやすく、英語圏/欧州作品の母数が多い。
- 取得粒度: ISBN/OLID/ISBN10/ISBN13の柔軟性が高い。
- 失敗時のフォールバック候補としても有力。


### 4) openBD（国内向け補完）

- 無料・APIキー不要でISBNから書誌/書影を取得できる。
- 日本国内の書籍データに強く、NDL補完として有効。
- 利用規約で「本の販促・紹介目的に限る」「改変禁止」「削除要請への対応」などが明記。
- 海外（欧州/英語圏）の網羅性は低く、海外対応の主軸にはしにくい。
- CORS可否は実地確認が必要（通らない場合はプロキシ前提）。

## 方針（フォールバック順）

### 国内作品向け（推奨案）
1. NDL OpenSearch: タイトル/著者検索でISBN取得
2. openBD: 取得したISBNで書誌/書影を取得（高解像度・国内データに強い）
3. 失敗時はNDLサムネイルURL（既存）にフォールバック
4. それも失敗時はプレースホルダ

**メリット**: openBDは国内書影の品質・網羅性が高く、NDLサムネイルより高解像度が期待できる  
**注意点**: openBDがISBN前提なので、NDLでISBNが取れないケースでは効果なし

### 海外作品向け
1. Open Library Search: タイトル/著者検索でISBN/OLID取得
2. Open Library Covers API: 取得したISBN/OLIDで書影取得
3. 失敗時はプレースホルダ

## 想定フロー（概要）

### 国内作品（NDL → openBD）
1. NDL OpenSearchでタイトル/著者検索 → ISBN取得
2. 取得したISBNでopenBD APIを叩く → 書誌詳細 + 書影URL取得
3. openBD失敗時は従来のNDLサムネイルURLにフォールバック
4. それも失敗時はプレースホルダ

### 海外作品（Open Library）
1. Open Library SearchでISBN/OLID取得
2. Open Library Covers APIで書影取得
3. 失敗時はプレースホルダ

## 実装時の変更点（最小）

### 国内作品対応（NDL → openBD）
- `services/openBdService.ts` を新規追加: ISBN配列からopenBD APIで書誌/書影取得
- `services/ndlService.ts` の検索結果にISBNがあればopenBDを優先、なければNDLサムネイル
- openBD APIエンドポイント: `https://api.openbd.jp/v1/get?isbn={ISBN}`
- 書影URLは `summary.cover` フィールドから取得（CORS確認が必要）

### 海外作品対応（Open Library）
- `services/openLibraryService.ts` を新規追加してSearch/Coversを分離
- タイトル/著者検索でISBN/OLIDを取得し、Covers APIで書影URL生成

### 共通
- `Book` 型に `source` フィールド追加を検討（'ndl' | 'openbd' | 'openlibrary'）
- UIの文言更新（フッター/ヘッダー: 「NDL + openBD + Open Library」など）

## 注意点

- 利用規約/レート制限はAPIごとに確認し、将来の制限変更に備える。
- 高解像度（Lサイズ）を優先するが、失敗時はM/Sに落とす選択肢も検討。
- 海外作品で著者名の表記揺れが多いので、検索クエリの正規化（小文字化、記号除去）を行う余地あり。

## 次のアクション

- Open Libraryでの検索精度と書影成功率を数件サンプルで検証。
- NDLとOpen Libraryのヒット率を比較してフォールバック順を確定。
- UI文言と権利表記の更新方針を決定。
