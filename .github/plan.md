# 今回の修正内容

## 目的
- ISBN取得率と書影取得率の改善
- NDL/Open Library/openBD の併用時の精度向上
- No Image時の編集体験改善

## 実装内容

### 1. 画像URLのCORS対策統一
- wsrv.nl を共通で使えるように `services/imageUtils.ts` を追加
- openBD/Open Library の書影URLを必ずプロキシ経由に変更

### 2. NDLのISBN抽出強化
- `dc:identifier` からの正規化抽出（接頭辞や記号を除去）
- `rdfs:seeAlso` URL からISBNを補完
- ISBN-13 を優先し、`books.or.jp` の数値ID誤検出を回避
- 図書カテゴリのみを対象にしてISBN取得率を改善

### 3. Open Library補完
- ISBN-13優先の選択ロジックを追加
- タイトル+著者一致でISBN補完するAPIを追加

### 4. 結果統合ロジックの改善
- タイトル+著者一致でNDL結果を優先
- NDLにISBNや書影がない場合のみOpen Libraryで補完
- AmazonリンクのISBNずれを抑制

### 5. UI改善
- 検索結果カードにISBNを表示
- 帯編集画面にISBN表示を追加
- No Image時にアップロードできるUIを追加
- ファイル選択をボタン化し、選択ファイル名を表示

## 変更ファイル
- services/imageUtils.ts (新規)
- services/openBdService.ts
- services/openLibraryService.ts
- services/ndlService.ts
- components/SearchSection.tsx
- components/EditorSection.tsx
- utils/isbnUtils.ts (新規)
- utils/textMatchUtils.ts (新規)

## 動作確認観点
- 検索結果のISBN表示が正しいか（例: 青天 → 9784163920665）
- 検索結果の書影が取得できるか（NDL/openBD/Open Library）
- 検索結果を選択後、編集画面のISBNが一致するか
- Amazonリンクが正しいISBN-10に変換されるか
- No Image時のアップロードが動作するか（選択名表示、プレビュー反映）
- ISBN未取得の本でも保存できるか（ファイル名 book-obi.png）
