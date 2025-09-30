# Chrome 拡張テンプレート（WXT・サイドパネル対応）

このディレクトリは、WXT を用いて作成した Chrome 拡張（Manifest V3）の最小構成テンプレートです。サイドパネルの表示に対応しており、拡張機能の基本的なエントリポイント（background、content script、popup、side panel）を含みます。

## 概要
- WXT による開発体験（ホットリロード、型サポートなど）
- Manifest V3 対応
- サイドパネル（Side Panel API）を有効化
- Popup／Content Script のサンプル実装
- TypeScript ベース

## 主要機能
- サイドパネル
  - `wxt.config.ts` で `manifest.side_panel.default_path` を設定
  - `entrypoints/background.ts` にて `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` を設定
  - 拡張アイコンをクリックすると、サイドパネルが開きます（対応する Chrome バージョンが必要）
- Popup
  - シンプルなカウンター UI のサンプル
- Content Script
  - `*://*.google.com/*` で動作する簡単なログ出力

## ディレクトリ構成（抜粋）
```
templates/extensions/chrome-basic/
├─ components/
│  └─ counter.ts               # Popup用の簡易カウンター
├─ entrypoints/
│  ├─ background.ts            # バックグラウンド（MV3 Service Worker）
│  ├─ content.ts               # コンテントスクリプト
│  ├─ popup/
│  │  ├─ main.ts
│  │  └─ style.css
│  └─ sidepanel/
│     ├─ index.html            # サイドパネルのHTML
│     └─ main.ts               # サイドパネルのスクリプト
├─ wxt.config.ts               # WXT設定（side_panelのデフォルトパスなど）
├─ package.json                # スクリプトやdevDependencies
└─ .npmrc / .gitignore など
```

## 前提条件
- Node.js（推奨: LTS）
- パッケージマネージャ（pnpm / npm / yarn のいずれか）
- Google Chrome（サイドパネル対応は Chrome 114+、`chrome.sidePanel.open` などの機能は Chrome 116+ 以降を推奨）

## セットアップ
このテンプレート単体でセットアップする場合:

- pnpm
  ```bash
  pnpm install
  ```
- npm
  ```bash
  npm install
  ```
- yarn
  ```bash
  yarn install
  ```

本リポジトリは pnpm ワークスペース構成です。リポジトリルートで依存関係をまとめてインストールしても構いません。

## 開発（ローカル）
- Chrome 向け開発サーバ（ホットリロード）
  ```bash
  pnpm dev
  ```
  または `npm run dev` / `yarn dev`

- Firefox 向け（必要な場合）
  ```bash
  pnpm dev:firefox
  ```

実行後、`.output/chrome-mv3-dev`（またはブラウザ別ディレクトリ）にビルド成果物が出力されます。Chrome の拡張機能ページ（chrome://extensions）で「デベロッパーモード」を ON にし、「パッケージ化されていない拡張機能を読み込む」で出力ディレクトリを指定してください。

## ビルド／Zip 作成
- 本番ビルド
  ```bash
  pnpm build
  ```
- Zip の作成
  ```bash
  pnpm zip
  ```
- Firefox 向けビルド/Zip
  ```bash
  pnpm build:firefox
  pnpm zip:firefox
  ```

## サイドパネルの使い方
- 拡張機能のアイコンをクリックすると、サイドパネルが自動的に開くように設定されています。
- `wxt.config.ts` で `manifest.side_panel.default_path` を `entrypoints/sidepanel/index.html` に設定しています。
- `entrypoints/background.ts` では、Side Panel API の存在チェックを行い、未対応環境では警告を表示します。
- `entrypoints/sidepanel/main.ts` は簡易なカウンター UI の例です。必要に応じて任意の UI フレームワークへ置き換えてください。

## 実装上のポイント
- Background（`entrypoints/background.ts`）
  - サイドパネルの自動オープン設定
  - アイコンクリック時に `chrome.sidePanel.open({ windowId })` を呼び出し
- Content Script（`entrypoints/content.ts`）
  - 対象マッチ: `*://*.google.com/*`
- Popup（`entrypoints/popup/`）
  - 画像やスタイルの取り込みサンプル
- WXT 設定（`wxt.config.ts`）
  - `manifest` セクションで `side_panel` を設定

## よくある問題
- サイドパネルが開かない
  - Chrome のバージョンを確認（最新版を推奨）
  - 拡張機能ページで拡張が有効になっているか確認
  - `background.ts` のコンソールログ（拡張の Service Worker ログ）を確認
- Content Script が動作しない
  - 対象サイト（google.com など）であるか確認
  - コンソールにエラーがないか確認

## 参考リンク
- WXT 公式ドキュメント: https://wxt.dev/
- Chrome Extensions（Manifest V3）: https://developer.chrome.com/docs/extensions/
- Side Panel API: https://developer.chrome.com/docs/extensions/reference/sidePanel

## ライセンス
このテンプレートのライセンスについては、リポジトリ全体のライセンス方針に従います。必要に応じて各プロジェクトでライセンス表記を追加してください。
