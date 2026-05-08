# 書影取得率向上（Copilot CLI 実装内容）

## 概要

- 取得率改善の中心を「単一URL依存」から「候補URLの段階フォールバック」に変更。
- 国内向け（NDL + openBD）に加えて、海外補完（Open Library）と追加補完（Google Books）を統合。
- 検索一覧と編集画面の両方で、画像読み込み失敗時に次候補へ自動遷移するように変更。

## 変更点（ファイル別）

### 1. `Book` 型の拡張
- 対象: `types.ts`
- 追加:
	- `coverCandidates?: string[]`
	- `source` に `'googlebooks'` を追加
- 目的:
	- 画像候補を複数保持し、UI側で順次フォールバックできるようにする。

### 2. 画像URLユーティリティの追加
- 対象: `services/imageUtils.ts`
- 追加:
	- `dedupeUrls(urls)`
- 目的:
	- 各サービスから集めた候補URLの重複を除去し、無駄な再試行を防ぐ。

### 3. ISBN変換の強化
- 対象: `utils/isbnUtils.ts`
- 追加:
	- `toIsbn13(isbn10)`
- 目的:
	- ISBN10入力時でも openBD / Google Books 連携の成功率を上げる。

### 4. Open Library 候補の拡張
- 対象: `services/openLibraryService.ts`
- 主な変更:
	- `edition_key` を取得対象に追加
	- `buildOpenLibraryCoverCandidates` を追加
	- 候補生成を `ISBN / OLID / cover_i` × `L -> M -> S` の順に拡張
	- `coverCandidates` を `Book` に格納
	- 短すぎるクエリを早期リターン（`query.trim().length < 3`）
- 目的:
	- Open Library単体でのカバー発見率を改善し、サイズ違いフォールバックを可能にする。

### 5. openBD 連携の強化
- 対象: `services/openBdService.ts`
- 主な変更:
	- ISBN正規化・重複除去
	- ISBN10のISBN13変換
	- `coverCandidates` を付与
	- `source: 'openbd'` を明示
- 目的:
	- 国内書籍の補完精度と取りこぼし耐性を向上。

### 6. NDL統合ロジックの改善
- 対象: `services/ndlService.ts`
- 主な変更:
	- NDL検索を `title` と `creator` の2経路で実行
	- 結果を重複統合（ISBN + 正規化タイトル/著者）
	- NDL/openBD/Open Library の候補URLを `coverCandidates` に統合
	- Open Library統合時も `coverCandidates` をマージ
	- Google Books補完を追加（`fetchBooksFromGoogleBooks`）
- 目的:
	- 国内優先の取得率を維持しつつ、未取得分を海外ソースで補完する。

### 7. Google Books 補完サービスを追加
- 対象: `services/googleBooksService.ts`（新規）
- 主な実装:
	- ISBN検索（`q=isbn:`）
	- `imageLinks` から `extraLarge -> ... -> smallThumbnail` で候補生成
	- ISBN同定（industryIdentifiers）
	- `coverCandidates` 付き `Book` を返却
- 目的:
	- Open LibraryやNDLで拾えないケースの補完率をさらに上げる。

### 8. 検索結果UIの段階フォールバック
- 対象: `components/SearchSection.tsx`
- 主な変更:
	- `BookCover` コンポーネントを追加
	- `imageUrl + coverCandidates` を順に試行
	- すべて失敗時のみプレースホルダ表示
	- `source` バッジに `Google Books` 表示を追加
- 目的:
	- 表示段階での失敗を吸収し、実効取得率を改善。

### 9. 編集画面の段階フォールバック
- 対象: `components/EditorSection.tsx`
- 主な変更:
	- アップロード画像がない場合、`imageUrl + coverCandidates` を順次ロード
	- 1件失敗しても次候補へ遷移
- 目的:
	- 検索一覧で表示できた書影が編集画面で落ちるケースを減らす。

## 期待される効果

- 候補URLの多段化で、書影取得の成功率が向上。
- 国内（openBD/NDL）に加えて、Open Library + Google Books による補完経路を確保。
- 一時的なURL失敗やサイズ不一致時でも、UIで自動復旧しやすくなる。

## 補足

- 本変更はクライアント内完結（サーバー保存なし）。
- 追加の改善余地として、失敗理由ログ収集・タイムアウト/再試行ポリシー・セッションキャッシュがある。
