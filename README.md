---
marp: true
theme: default
paginate: true
---

<!-- _class: lead -->
# Web Marp Editor for AITuberKit

ブラウザ上でスムーズにMarpスライドを作成・プレビュー・出力できるエディタです。
AITuberKit用のスライドシナリオ作成に最適化されています。

---

## 🌟 主な特徴

- **リアルタイムプレビュー:** Markdownの変更が即座にスライドデザインに反映されます。
- **PowerPoint (PPTX) インポート対応:** 手持ちのPPTXファイルをMarp Markdownと台本枠に自動変換。スライド全体が画像で構成されている場合も自動抽出して背景に設定します。
- **ドラッグ＆ドロップ画像対応:** プレビュー画面のSlide上で画像を直接D&D。プロジェクト固有ディレクトリに自動配置され、Markdownに追記されます。
- **表示幅の自動最適化:** ScriptやNotes列を折りたたむことで、プレビュー画面（Slide）を自動的に拡大し、画面を最大限広く使えます。
- **完璧なHTMLエクスポート:** 挿入されたローカル画像もすべてBase64で直接埋め込み、他環境に持ち出しても画像が消えない完全ポータブルなHTMLファイルとして出力が可能です。

---

## 🚀 機能プレビュー

**📝 Scripts JSON モード & Notes 展開時**
![Script Editor](./public/images/screenshot-notes-open.png)

**👀 Notes 折りたたみ時**
![Script Editor Closed Notes](./public/images/screenshot-notes-closed.png)

*画面の左側がMarkdown / Scripts JSONエディタ、右側がリアルタイムなプレビュー兼Script/Note確認画面となっています。無駄な列を折りたたむことでプレビュー幅を広げることができます。*

---

## 🛠️ インストール＆起動方法

```bash
# パッケージのインストール
pnpm install

# 開発サーバーの起動
pnpm run dev
```

起動後、ローカルサーバー（\`http://localhost:5173\` 等）にアクセスしてご利用ください。

---

## 📝 使い方・操作ガイド

1. **プロジェクトロード:** 右上の入力欄にプロジェクトパス（例: `slides/demo`）を入れて「Load」を押します。
2. **スライド編集:** 左パネルのMarkdownを編集するとリアルタイムに右パネルに反映されます。
3. **画像挿入:** ローカルの画像を右パネルの **Slide領域** に直接ドラッグ＆ドロップすると、該当スライドのMarkdown内に画像が自動挿入されます。
4. **表示切り替え:** 各列のヘッダー「Script」「Notes」をクリックで、見ない列を折りたたんでプレビューを広くできます。
5. **出力:** 「Export HTML」クリックでそのまま配布可能なHTMLスライドを取得できます。

---

## 🎨 PPTXファイルのインポート

既存のPowerPointファイルをスライドエディタに取り込むことができます。

```bash
# public/ppts フォルダにPPTXファイルを配置し、以下のコマンドを実行
pnpm run import-pptx public/ppts/your-presentation.pptx
```

実行後、`public/slides/<ファイル名>` ディレクトリに `slides.md` と `scripts.json` が生成されます。エディタのプロジェクトパス欄にそのディレクトリ名を入力してロードしてください。

---

# 📚 技術スタック & ライセンス

### 使用技術
- React
- Vite
- TypeScript
- @marp-team/marp-core

### ライセンス
MIT License

---
**Author: RimgO**
