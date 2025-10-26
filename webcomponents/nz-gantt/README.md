# nz-gantt

Litを使用したガントチャート Web Component

## 特徴

- **アンカーベースの配置**: タスクの「n日目＝この日付」という形式でタスクを暦に固定
- **依存関係のサポート**: FS (Finish-to-Start) 関係、AND条件の複数依存
- **営業日カウント**: 指定した曜日のみを営業日としてカウント
- **カレンダー統合**: 祝日、休業期間、例外的な営業日を指定可能
- **エラー検証**: 循環依存、アンカー矛盾、未配置タスクの検出

## インストール

```bash
npm install
npm run build
```

## 使用方法

### 基本的な使用例

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <script type="module" src="./dist/index.js"></script>
</head>
<body>
  <gantt-chart working-days="月,火,水,木,金" locale="ja-JP" timezone="Asia/Tokyo">
    <!-- タスク定義 -->
    <gantt-task id="A" name="要件定義" duration="3" assignee="佐藤"></gantt-task>
    <gantt-task id="B" name="設計" duration="5" assignee="鈴木">
      <depends-on task="A"></depends-on>
    </gantt-task>
    <gantt-task id="M" name="リリース" duration="0" assignee="PM">
      <depends-on task="B"></depends-on>
    </gantt-task>

    <!-- カレンダー -->
    <gantt-calendar>
      <gantt-holiday date="2025-10-13" label="スポーツの日"></gantt-holiday>
    </gantt-calendar>

    <!-- アンカー -->
    <gantt-anchors>
      <gantt-anchor task="A" day="1" date="2025-10-06"></gantt-anchor>
    </gantt-anchors>
  </gantt-chart>
</body>
</html>
```

## 要素リファレンス

### `<gantt-chart>`

ガントチャートのルート要素。

**属性:**
- `scale`: `"day" | "week" | "month"` (デフォルト: `"day"`)
- `first-day`: `YYYY-MM-DD` 形式 (表示開始の推奨アンカー、未指定でも可)
- `working-days`: 和名の曜日をカンマ区切り (例: `"月,火,水,木,金"`)
- `locale`: 例 `"ja-JP"` (ラベル表示用)
- `timezone`: IANA TZ 例 `"Asia/Tokyo"`

**子要素:**
- 0..n × `<gantt-task>`
- 0..1 × `<gantt-calendar>`
- 1..1 × `<gantt-anchors>` (必須)

---

### `<gantt-task>`

タスク定義。開始日属性は持たず、アンカーと依存関係で位置が決定される。

**属性:**
- `id`: **必須**。ユニークID (例: `"T1"`)
- `name`: 表示名 (例: `"設計"`)
- `duration`: 所要日数 (営業日換算、`0` はマイルストーン)
- `assignee`: 任意。担当者名/ID (例: `"佐藤"`)

**子要素:**
- 0..n × `<depends-on>` (依存先タスクIDを列挙)

---

### `<depends-on>`

タスクの依存関係を定義。

**属性:**
- `task`: **必須**。依存先タスクID

**関係の解釈:**
- すべて **FS (Finish-to-Start)** 固定、ラグ無し
- 複数の `<depends-on>` は **AND条件**
- 依存先タスクの終了翌営業日からカウント開始可能

---

### `<gantt-calendar>`

祝祭日や例外の営業/非営業日を指定 (任意)。

**子要素:**
- 0..n × `<gantt-holiday>` … 単発の非営業日
- 0..n × `<gantt-closed>` … 連続範囲の非営業日  
- 0..n × `<gantt-workday>` … 例外的な営業日

**優先順位:**
1. `<gantt-workday>` (強制営業)
2. `<gantt-holiday>` / `<gantt-closed>` (強制休業)
3. `working-days` (週次パターン)

---

### `<gantt-holiday>`

単発の非営業日を定義。

**属性:**
- `date`: YYYY-MM-DD 形式 (**必須**)
- `label`: 任意 (例: `"スポーツの日"`)

---

### `<gantt-closed>`

連続範囲の非営業日を定義。

**属性:**
- `from`: YYYY-MM-DD 形式 (**必須**)
- `to`: YYYY-MM-DD 形式 (**必須**、両端含む)
- `label`: 任意 (例: `"年末年始"`)

---

### `<gantt-workday>`

例外的な営業日を定義 (通常は休業だが営業する日)。

**属性:**
- `date`: YYYY-MM-DD 形式 (**必須**)
- `label`: 任意 (例: `"特別稼働日"`)

---

### `<gantt-anchors>`

タスクの「n日目」を暦日に固定するためのアンカー群。

**子要素:**
- 1..n × `<gantt-anchor>`

**注意:**
- 少なくとも1つのアンカーが必要
- 同一連結成分内のタスクすべてに影響が伝播すること

---

### `<gantt-anchor>`

タスクの特定日を暦日に固定。

**属性:**
- `task`: タスクID (**必須**)
- `day`: **1以上の整数** (**必須**)。営業日カウントの1日目=1
- `date`: 暦日 (YYYY-MM-DD、**必須**)

**意味:**
- タスク T の n日目 (営業日カウント) が暦の D になるように配置
- これによりタスク開始日は内部的に逆算される

---

## 営業日と日数の定義

- **営業日**: `working-days` に該当する曜日かつ、`<gantt-calendar>` による非営業指定を除外。`<workday>` は営業に復帰。
- **n日目**: 営業日で 1, 2, 3… とカウント。`duration=3` のタスクは「1日目/2日目/3日目」を塗りつぶす。
- **マイルストーン** (`duration=0`): **1日目のみ**を持つ点表示。アンカーは `day="1"` のみ許可。

---

## 依存の解釈

- すべて **FS (Finish-to-Start)**・**ラグ無し** 固定
- 1つの `<gantt-task>` に複数 `<depends-on>` がある場合、**AND条件**:
  - 依存先タスクの**終了翌営業日**からカウント開始可能
  - 実際の開始 (1日目) は**各制約の最も遅い日**に揃う

---

## エラールール

- **循環依存**: エラー (対象タスクIDを含むメッセージ)
- **アンカー矛盾**: 同一タスクに対する複数アンカーから算出した開始日が一致しない場合はエラー
- **未配置**: アンカーが無い、またはアンカーから依存伝播できない連結成分が存在する場合はエラー
- **日付/曜日の不正**: 無視して警告 (コンソール等)

---

## 完全な例

```html
<gantt-chart first-day="2025-10-01" working-days="月,火,水,木,金" locale="ja-JP" timezone="Asia/Tokyo">
  <!-- タスク定義 -->
  <gantt-task id="A" name="要件定義" duration="3" assignee="佐藤"></gantt-task>
  <gantt-task id="B" name="UI設計" duration="4" assignee="鈴木">
    <depends-on task="A"></depends-on>
  </gantt-task>
  <gantt-task id="C" name="API設計" duration="5" assignee="田中">
    <depends-on task="A"></depends-on>
  </gantt-task>
  <gantt-task id="D" name="実装" duration="8" assignee="山本">
    <depends-on task="B"></depends-on>
    <depends-on task="C"></depends-on>
  </gantt-task>
  <gantt-task id="M" name="リリース" duration="0" assignee="PM">
    <depends-on task="D"></depends-on>
  </gantt-task>

  <!-- カレンダー（祝祭日等） -->
  <gantt-calendar>
    <gantt-holiday date="2025-10-13" label="スポーツの日"></gantt-holiday>
    <gantt-closed from="2025-12-28" to="2026-01-05" label="年末年始"></gantt-closed>
    <gantt-workday date="2025-10-12" label="特別稼働日"></gantt-workday>
  </gantt-calendar>

  <!-- アンカー：Aの1日目=2025-10-06、Dの5日目=2025-11-04 -->
  <gantt-anchors>
    <gantt-anchor task="A" day="1" date="2025-10-06"></gantt-anchor>
    <gantt-anchor task="D" day="5" date="2025-11-04"></gantt-anchor>
  </gantt-anchors>
</gantt-chart>
```

この例では:
- タスクAの1日目を2025-10-06に固定
- タスクDの5日目を2025-11-04に固定
- 依存関係に基づいて他のタスクの位置が自動的に計算される
- 営業日は月〜金（土日除く）
- 2025-10-13は祝日（非営業日）
- 2025-10-12は例外的な営業日（通常は日曜日だが営業）
- 2025-12-28〜2026-01-05は年末年始で非営業日

---

## ライセンス

MIT
