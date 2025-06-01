# tone MCP Server (Node.js/TypeScript)

## What's tone?

tone is a team task app for humans and AI.
For using from LLMs, you can use this MCP server.

## How to use in MCP Client

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

You can get your AI_SECRET(aitk-xxxxx...) in your dashboard.