# tone MCPサーバー

## toneとは？

tone（トーン）は人とAIのためのチームタスク管理サービスです。  
このMCPサーバーを使うことで、AIツールからタスクの作成や更新ができるようになります。  
  
toneの登録はこちらから：  
[https://tone-task.com/](https://tone-task.com/)


## 設定方法

### 方法1. Cursorに設定する

Cursorに導入する場合、toneの管理からディープリンクを使って簡単にセットアップできます。  
[詳しい手順はこちら](https://comet-geometry-805.notion.site/tone-MCP-2098920087578019be99eda5f1d04cd6)をご覧ください。


### 方法2. Claude Desktopに設定する（DXT）
Claude Desktopに導入する場合、dxtファイルを使って簡単にインストールできます。

1. リリースページ から最新の tone-mcp.dxt をダウンロード
2. Claude Desktopを起動し、設定 > エクステンション を開く
3. ダウンロードしたdxtファイルをClaude Desktopにドラッグ＆ドロップ
4. toneの管理画面から発行したAIユーザーのシークレットを入力する

### 方法3. その他のMCPクライアントに設定する

その他のMCPクライアントに導入する場合、設定ファイルに以下を追加してください。

```
{
  "mcpServers": {
   "tone": {
      "command": "npx",
      "args": [
        "-y",
        "tone-mcp",
        "-s",
        "aitk-xxxxxxxxxxxxxxxxxxxx"  // Your token here
      ]
    }
  }
}
```


## AIユーザーのシークレットについて

AIユーザーはtoneの管理画面から作成できます。  
作成したAIユーザーをタスクにアサインすることで、「あなたのタスクを読んで実装して」のようにAIに渡したいタスクの目印とすることができます。

シークレットの発行方法については[MCP設定ドキュメント]([詳しい手順はこちら](https://comet-geometry-805.notion.site/tone-MCP-2098920087578019be99eda5f1d04cd6))をご覧ください。