# mcp-decodo

Decodo MCP — wraps the Decodo Web Scraping API (decodo.com, formerly

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `decodo_scrape` | Scrape any web page through Decodo (formerly Smartproxy) rotating proxies and return its content. Handles anti-bot pages; use render_js:true for JavaScript-heavy sites (headless-browser rendering) and markdown:true for clean LLM-ready markdown instead of raw HTML. BYOK — _apiKey is your Decodo Web Scraping API "username:password" credentials. Example: decodo_scrape({ url: "https://example.com", render_js: true, _apiKey: "user:pass" }) |
| `decodo_google_search` | Google search results scraping via Decodo (formerly Smartproxy) — runs a Google search through rotating proxies and returns structured organic results (position, title, url, snippet) plus related searches when parsing succeeds. BYOK — _apiKey is your Decodo Web Scraping API "username:password" credentials. Example: decodo_google_search({ query: "best running shoes 2026", geo: "United States", _apiKey: "user:pass" }) |
| `decodo_amazon_product` | Get structured Amazon product data via Decodo (formerly Smartproxy) — title, pricing, rating, reviews, images, availability — parsed into JSON. Pass either a full Amazon product URL or an ASIN. BYOK — _apiKey is your Decodo Web Scraping API "username:password" credentials. Example: decodo_amazon_product({ asin: "B09H74FXNW", _apiKey: "user:pass" }) |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "decodo": {
      "url": "https://gateway.pipeworx.io/decodo/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Decodo data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
