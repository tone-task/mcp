# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のCllaude Code (claude.ai/code) へのガイダンスを提供します。

## プロジェクト概要

これはtoneタスク管理プラットフォームとの統合を提供するModel Context Protocol (MCP) サーバーです。`@modelcontextprotocol/sdk`を使用してMCPサーバーを実装し、構造化されたツールを通じてtoneのタスク管理機能を公開します。

## ビルドと開発コマンド

- `npm run build` - TypeScriptをdist/ディレクトリ内のJavaScriptにコンパイル
- `npm run dev` - tsxを使用して開発モードでサーバーを実行
- `npm start` - dist/index.jsからコンパイルされたサーバーを実行

## アーキテクチャ

### 認証
サーバーは以下の方法で渡されるtone AIユーザーシークレットトークンを必要とします：
- コマンドライン: `--secret` または `-s` フラグ
- 環境変数: `TONE_AI_USER_SECRET`

### コアコンポーネント

#### APIクライアント層
- `makeToneRequestGet()` - tone APIへのGETスタイルリクエストを処理
- `makeToneRequestCreate()` - tone APIへのCREATEスタイルリクエストを処理
- ベースAPI URL: `https://api.tone-task.app`

#### ツールカテゴリ
1. **ユーザー管理**: `get_myself`, `get_users`
2. **ワークスペース管理**: `get_workspaces` 
3. **タスク取得**: `get_mytasks`, `get_tasks`
4. **タスク作成/更新**: `create_task`, `update_task_*`, `create_list`

#### データフォーマット
- `formatTasks()` - 適切なエスケープを伴うタスクデータのフォーマット
- `formatUser()` - ユーザー情報のフォーマット
- `formatWorkspace()` - ワークスペース階層のフォーマット

### 主要な設計パターン

サーバーはMCP標準に従います：
- ツールはパラメーター検証のためのZodスキーマで定義
- すべてのレスポンスは一貫した `{ content: [{ type: "text", text: string }] }` フォーマットを使用
- エラーハンドリングはユーザーフレンドリーなメッセージを返す
- すべてのAPIリクエストに30秒のタイムアウト

### 依存関係

- `@modelcontextprotocol/sdk` - MCPサーバーフレームワーク
- `zod` - ツールパラメーターのスキーマ検証
- `node-fetch` - tone API用HTTPクライアント
- `tsx` - 開発用TypeScript実行

サーバーは、API通信、データフォーマット、MCPツール定義の明確な分離を持つ単一ファイル実装として設計されています。