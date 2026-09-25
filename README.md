# mcp-decodo

Decodo MCP — wraps the Decodo Web Scraping API (decodo.com, formerly

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1683+ live data sources.

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

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/decodo/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1683+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

This pack takes your own API key (`_apiKey`) — we don't front one for it, so there's no curl here that would run without it. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/decodo_scrape`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Standalone (no gateway account)

This package also runs as a local stdio MCP server — no Pipeworx account, no
gateway round-trip:

```json
{
  "mcpServers": {
    "decodo": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-decodo"]
    }
  }
}
```

Or run it directly to confirm it starts:

```bash
npx -y @pipeworx/mcp-decodo
```

It speaks MCP over stdin/stdout and answers `initialize`/`tools/list`/`tools/call`
for **only** this pack's tools — none of the shared meta-tools the gateway
connection above adds. Same source, same tools, no ask_pipeworx routing.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Decodo data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
