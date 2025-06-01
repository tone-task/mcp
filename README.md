# tone MCP Server (Node.js/TypeScript)

ToneのタスクやワークスペースをMCP (Model Context Protocol) 経由で操作するためのサーバーです。

## How to use in MCP Client

```
{
  "mcpServers": {
    "tone-node": {
      "command": "env",
      "args": [
        "TONE_AI_USER_SECRET=aitk-xxxxxxxxxxxxxx",
        "node",
        "/path/to/script/index.js"
      ]
    }
  }
}
```