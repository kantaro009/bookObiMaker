<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# bookObiMaker

書籍の帯をAIで簡単に作成できるWebアプリケーションです。ISBNや書籍名から書籍情報を検索し、魅力的な帯のデザインを生成できます。

🌐 **デプロイ先**: https://kantaro009.github.io/bookObiMaker/

## ✨ 機能

- 📚 **書籍検索**: ISBNコード、書籍名、著者名で書籍を検索
- 🎨 **帯デザイン生成**: 書籍情報から自動的に帯のデザインを生成
- 🖼️ **書籍カバー取得**: 複数のAPIから書籍カバー画像を自動取得
- 💾 **画像ダウンロード**: 生成した帯画像をダウンロード可能
- 🔄 **複数API対応**: NDL、openBD、Open Libraryの3つのAPIから最適な情報を取得

## 🛠️ 技術スタック

- **フレームワーク**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **ビルドツール**: [Vite 6](https://vitejs.dev/)
- **スタイリング**: [Tailwind CSS 4](https://tailwindcss.com/)
- **アイコン**: [Lucide React](https://lucide.dev/)
- **デプロイ**: GitHub Pages

## 📁 プロジェクト構造

```
bookobimaker/
├── components/          # Reactコンポーネント
│   ├── Button.tsx      # 汎用ボタンコンポーネント
│   ├── EditorSection.tsx   # 帯編集セクション
│   ├── Header.tsx      # ヘッダーコンポーネント
│   └── SearchSection.tsx   # 書籍検索セクション
├── services/           # 外部API連携サービス
│   ├── ndlService.ts   # 国立国会図書館API
│   ├── openBdService.ts    # openBD API
│   ├── openLibraryService.ts   # Open Library API
│   └── imageUtils.ts   # 画像処理ユーティリティ
├── utils/              # ユーティリティ関数
│   ├── isbnUtils.ts    # ISBN処理
│   └── textMatchUtils.ts   # テキストマッチング
├── App.tsx             # メインアプリケーション
├── types.ts            # TypeScript型定義
└── vite.config.ts      # Vite設定
```

## 🚀 ローカル環境での実行

**必要要件:** Node.js (推奨: v18以上)

1. 依存関係のインストール:
   ```bash
   npm install
   ```

2. 開発サーバーの起動:
   ```bash
   npm run dev
   ```

3. ブラウザで `http://localhost:3000` を開く

## 📦 ビルド

本番用ビルドを作成:
```bash
npm run build
```

ビルド結果のプレビュー:
```bash
npm run preview
```

## 🌐 デプロイ

### GitHub Pagesへの自動デプロイ

このプロジェクトはGitHub Actionsで自動デプロイされます。

#### 初回セットアップ

1. GitHubリポジトリの設定:
   - **Settings** > **Pages** > **Source** を「**GitHub Actions**」に設定

2. `main`ブランチにpushすると自動的にデプロイが実行されます

### 手動デプロイ

```bash
npm run deploy
```

## 🔌 使用API

- **国立国会図書館サーチAPI**: 日本の書籍情報検索
- **openBD**: 日本の書籍情報・カバー画像取得
- **Open Library API**: 国際的な書籍情報・カバー画像取得

## 📝 ライセンス

このプロジェクトは個人利用を目的としています。生成された画像の著作権は各権利者に帰属します。私的使用の範囲内でご利用ください。

## ⚠️ 注意事項

- CORS制限により一部の画像が正しく読み込まれない場合があります
- APIの利用規約を遵守してご利用ください
- 商用利用の際は各APIの利用規約をご確認ください

---

© 2024 bookObiMaker
