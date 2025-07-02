## ローカル環境で試す手順

1. `index.ts` の `API_BASE` を `http://localhost:8080` に変更
2. ファイルを修正して `npm run build`
3. ローカルで動くAIシークレットを用意
4. 好きなLLMでデバッグする
  4-1. Cursorの場合、 `mcp.json` に以下のように記載
  ```
    "tone-local": {
      "command": "/pat/to/node",
      "args": [
        "/path/to/workDir/dist/index.js",
        "-s",
        "aitk-*****"
      ]
    },
  ```

  4-2. MCP Inspectorの場合、以下のように実行
  ```
  npx @modelcontextprotocol/inspector node dist/index.js -s aitk-*****    
  ```
  ターミナルにURLが表示されるのでクリックして開く

## 修正が完了したら

1. `index.ts`の`API_BASE`を戻す
2. `npm run build`でビルド
3. `npm version patch`などでバージョンを更新
4. `npm publish`で本番公開する