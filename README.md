# ScamCheck MCP Server

Scan suspicious messages, URLs, and text for scams inside any AI assistant that supports MCP (Claude Desktop, Claude Code, Cursor, and more). **No signup or API key needed** — works out of the box on the free anonymous tier.

## Quick start (no API key)

Add to your Claude Desktop / Cursor config:

```json
{
  "mcpServers": {
    "scamcheck": {
      "command": "npx",
      "args": ["scamcheck-mcp-server"]
    }
  }
}
```

That's it. Ask your assistant *"is this message a scam?"* and paste the message.

## Higher limits (optional API key)

The anonymous tier is rate-limited per IP. For higher limits, grab a free key at [scamcheck.tech/dashboard/developer](https://www.scamcheck.tech/dashboard/developer) and add it:

```json
{
  "mcpServers": {
    "scamcheck": {
      "command": "npx",
      "args": ["scamcheck-mcp-server"],
      "env": {
        "SCAMCHECK_API_KEY": "sk-live-your-key-here"
      }
    }
  }
}
```

## Tool: `scan_message`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input` | string | ✓ | The message, URL, or text to scan |
| `source` | `text` \| `url` \| `screenshot` | — | Content type (default: `text`) |

## Example response

```
🔴 Likely Scam — Risk Score: 89/100
Category: phishing · Confidence: 92%

Summary: This message impersonates a bank to steal credentials.

Why this was flagged:
• Creates false urgency with account suspension threat
• Uses a URL that does not match the official bank domain
• Requests sensitive personal information via link

What to do:
✓ Do not click any links in this message
✓ Contact your bank directly using the number on your card
✓ Report to your bank's fraud department

Full report: https://www.scamcheck.tech/result/abc123
```

## Rate limits

- Anonymous (no key): IP rate-limited
- Free API key: 100 scans/month
- Pro/Business: Unlimited
