# Tone MCP Server (Node.js/TypeScript)

ToneのタスクやワークスペースをMCP (Model Context Protocol) 経由で操作するためのサーバーです。

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
export TONE_AI_USER_SECRET='あなたのToneシークレット値'
```

### 3. ビルド

```bash
npm run build
```

### 4. 実行

```bash
npm start
```

または開発モードで実行:

```bash
npm run dev
```

## 利用可能なツール

### ユーザー情報
- `get_myself`: 自分自身のユーザー情報を取得
- `get_users`: ワークスペース内のユーザー一覧を取得

### ワークスペース
- `get_workspaces`: ワークスペース、チームスペース、リスト情報を取得

### タスク管理
- `get_mytasks`: 自分のタスク一覧を取得
- `get_tasks`: 指定したリストのタスク一覧を取得
- `create_task`: 新しいタスクを作成
- `update_task_title`: タスクのタイトルを更新
- `update_task_description`: タスクの説明を更新
- `update_task_status`: タスクのステータスを更新
- `update_task_assignees`: タスクの担当者を更新

### リスト管理
- `create_list`: 新しいリストを作成

## 使用例

1. まずワークスペース情報を取得:
   ```
   get_workspaces()
   ```

2. ユーザー一覧を取得:
   ```
   get_users(workspace_id="ws-xxxxx")
   ```

3. タスクを作成:
   ```
   create_task(
     workspace_id="ws-xxxxx",
     teamspace_id="ts-xxxxx", 
     list_id="li-xxxxx",
     title="新しいタスク",
     description="タスクの説明",
     assign_user_ids=["user-id-1"]
   )
   ```

## 必要な環境

- Node.js 18以上
- TypeScript 5.0以上
- Tone API アクセス権限

## ライセンス

MIT License 