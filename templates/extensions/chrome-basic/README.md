# Chrome 拡張テンプレート（WXT・サイドパネル＋DevTools連携）

このディレクトリは、WXT を用いて作成した Chrome 拡張（Manifest V3）の最小構成テンプレートです。サイドパネル表示に対応し、DevTools（Elements）で選択した要素情報（XPath/CSS など）をサイドパネルへ表示する実装を含みます。

## 概要
- WXT による開発体験（ホットリロード、型サポートなど）
- Manifest V3 対応
- サイドパネル（Side Panel API）対応
- DevTools（Elements）との連携（選択要素の情報をサイドパネルに表示）
- Popup／Content Script のサンプル実装
- TypeScript ベース

## 主要機能
- サイドパネル
  - `wxt.config.ts` で `manifest.side_panel.default_path` を設定
  - `entrypoints/background.ts` にて `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` を設定
  - 拡張アイコンをクリックすると、サイドパネルが開きます（対応する Chrome バージョンが必要）
- DevTools 連携（Elements）
  - DevTools の Elements ペインで要素を選択すると、その要素情報（URL、タイトル、XPath、CSS セレクタ、属性、outerHTML/text スニペット、取得時刻）を収集
  - 収集データはバックグラウンドを経由してサイドパネルに表示され、コピー操作も可能
  - 備考: 現状は選択変更トリガーで動作。Elements のコンテキストメニュー項目の追加は将来的に対応予定
- Popup
  - シンプルなサンプル UI
- Content Script
  - `*://*.google.com/*` で動作する簡単なログ出力

## ディレクトリ構成（抜粋）
```
templates/extensions/chrome-basic/
├─ components/
│  └─ counter.ts                 # Popup用の簡易カウンター
├─ entrypoints/
│  ├─ background.ts              # バックグラウンド（MV3 Service Worker）
│  ├─ content.ts                 # コンテントスクリプト
│  ├─ devtools/                  # DevTools ページ
│  │  ├─ index.html
│  │  └─ main.ts
│  ├─ popup/
│  │  ├─ main.ts
│  │  └─ style.css
│  └─ sidepanel/
│     ├─ index.html              # サイドパネルのHTML
│     └─ main.ts                 # サイドパネルのスクリプト（要素情報表示 + コピー）
├─ wxt.config.ts                 # WXT設定（side_panel, devtools_page, permissionsなど）
├─ package.json                  # スクリプトやdevDependencies
└─ .npmrc / .gitignore など
```

## 前提条件
- Node.js（推奨: LTS）
- パッケージマネージャ（pnpm / npm / yarn のいずれか）
- Google Chrome
  - サイドパネル対応は Chrome 114+
  - `chrome.sidePanel.open` などの拡張は Chrome 116+ を推奨
  - DevTools 拡張 API は最新版 Chrome を推奨

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

## 使い方
- サイドパネルの基本
  - 拡張機能のアイコンをクリックすると、サイドパネルが自動的に開くように設定されています。
  - `wxt.config.ts` で `manifest.side_panel.default_path` を `entrypoints/sidepanel/index.html` に設定しています。
- DevTools（Elements）から要素情報を表示
  1. 任意のタブで DevTools を開き、Elements ペインで要素を選択します。
  2. 選択と同時に、拡張がページコンテキストで情報を収集し、バックグラウンド経由でサイドパネルに送信します。
  3. サイドパネルが自動で開き（またはフォアグラウンドに表示され）、URL/タイトル、XPath、CSS セレクタ、属性、outerHTML／text のスニペットが表示されます。
  4. XPath/CSS は「コピー」ボタンでクリップボードにコピーできます。
  - 備考: 直近の取得結果は `chrome.storage.session` に保存され、サイドパネルを開き直しても直前の情報を復元します。

## 実装上のポイント
- Background（`entrypoints/background.ts`）
  - サイドパネルの自動オープン設定（`setPanelBehavior`）
  - DevTools からの `ELEMENT_INFO` メッセージを受け取り、`chrome.storage.session` に保存しつつサイドパネルを開く
  - 受け取ったデータを拡張内のページへブロードキャスト
- Side Panel（`entrypoints/sidepanel/`）
  - 初期表示時に `lastElementInfo` を session storage から読み込み
  - ランタイムメッセージで受信次第、UI を更新。コピー操作を提供
- DevTools ページ（`entrypoints/devtools/`）
  - DevTools 上で選択された `$0`（現在の要素）に対して `chrome.devtools.inspectedWindow.eval` を使って情報を抽出
  - 取得データを `chrome.runtime.sendMessage({ type: 'ELEMENT_INFO', payload, tabId })` で送信
- WXT 設定（`wxt.config.ts`）
  - `manifest.side_panel.default_path` を設定
  - `manifest.devtools_page` に `entrypoints/devtools/index.html` を設定
  - `permissions` には `storage`, `tabs` を付与

## 追加ドキュメント
- 設計と実装計画の詳細は docs を参照:
  - `docs/devtools-elements-context-menu-to-sidepanel.md`

## よくある問題
- サイドパネルが開かない
  - Chrome のバージョンを確認（最新版を推奨）
  - 拡張機能ページで拡張が有効になっているか確認
  - `background.ts` のコンソールログ（拡張の Service Worker ログ）を確認
- DevTools から情報が送られてこない
  - DevTools を開いたタブで Elements の選択が変わっているか確認
  - 拡張の Service Worker ログと DevTools ページ側のコンソールログを確認
- Content Script が動作しない
  - 対象サイト（google.com など）であるか確認
  - コンソールにエラーがないか確認

## 参考リンク
- WXT 公式ドキュメント: https://wxt.dev/
- Chrome Extensions（Manifest V3）: https://developer.chrome.com/docs/extensions/
- Side Panel API: https://developer.chrome.com/docs/extensions/reference/sidePanel
- DevTools Extensions: https://developer.chrome.com/docs/extensions/reference/devtools
- `chrome.devtools.inspectedWindow`: https://developer.chrome.com/docs/extensions/reference/devtools_inspectedWindow
- Storage（Session）: https://developer.chrome.com/docs/extensions/reference/storage

## ライセンス
このテンプレートのライセンスについては、リポジトリ全体のライセンス方針に従います。必要に応じて各プロジェクトでライセンス表記を追加してください。
