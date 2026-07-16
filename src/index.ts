interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Decodo MCP — wraps the Decodo Web Scraping API (decodo.com, formerly
 * Smartproxy). Rotating residential/datacenter proxies + headless-browser
 * rendering + structured parsers for popular targets.
 *
 * Single endpoint: POST https://scraper-api.decodo.com/v2/scrape
 * Response envelope: { results: [{ content, status_code, url, task_id, ... }] }
 * With parse:true, `content` is a parsed JSON object instead of raw HTML.
 *
 * Tools:
 * - decodo_scrape:         universal scrape of any URL (optional JS rendering,
 *                          geo targeting, markdown output)
 * - decodo_google_search:  target "google_search" with parse:true → structured
 *                          organic SERP results
 * - decodo_amazon_product: target "amazon" with parse:true → structured product
 *                          JSON (by URL or ASIN)
 *
 * BYO-key only — auth is HTTP Basic with the Web Scraping API username and
 * password from dashboard.decodo.com. Pass _apiKey as the combined
 * "username:password" string; this pack base64-encodes it for Basic auth.
 * Free plan (no credit card): 2,000 standard-proxy requests (fewer with JS
 * rendering or premium proxies).
 *
 * WEB-VERIFIED (2026-07-15) against:
 *   https://help.decodo.com/docs/web-scraping-api-parameters   (body params)
 *   https://help.decodo.com/docs/web-scraping-api-google-search (google_search target)
 *   https://help.decodo.com/docs/web-scraping-api-amazon-url    (amazon target, URL-based)
 *   https://github.com/Decodo/Web-Scraping-API                  (response envelope)
 * Endpoint probe: bogus Basic creds → HTTP 401; missing auth header → HTTP 400.
 */


const ENDPOINT = 'https://scraper-api.decodo.com/v2/scrape';

const DASHBOARD_URL = 'https://dashboard.decodo.com';
const DOCS_URL = 'https://help.decodo.com/docs/web-scraping-api-introduction';

// Cap raw page content in responses (matches the firecrawl pack's cap).
const CONTENT_LIMIT = 100000;

const KEY_HINT =
  'Pass _apiKey as "username:password" — the Web Scraping API authentication credentials from your Decodo dashboard ' +
  `(${DASHBOARD_URL}, Web Scraping API section). Free plan available (2,000 requests, no credit card). Docs: ${DOCS_URL}`;

const tools: McpToolExport['tools'] = [
  {
    name: 'decodo_scrape',
    description:
      'Scrape any web page through Decodo (formerly Smartproxy) rotating proxies and return its content. ' +
      'Handles anti-bot pages; use render_js:true for JavaScript-heavy sites (headless-browser rendering) and ' +
      'markdown:true for clean LLM-ready markdown instead of raw HTML. BYOK — _apiKey is your Decodo Web Scraping API ' +
      '"username:password" credentials. Example: decodo_scrape({ url: "https://example.com", render_js: true, _apiKey: "user:pass" })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        url: {
          type: 'string',
          description: 'The absolute URL of the page to scrape, e.g. "https://example.com/products"',
        },
        render_js: {
          type: 'boolean',
          description:
            'Render the page in a headless browser (executes JavaScript) before returning content. Default false (faster raw fetch of static pages).',
        },
        geo: {
          type: 'string',
          description:
            'Proxy exit location as a location name, e.g. "United States", "Germany", "Japan". Default: randomized.',
        },
        markdown: {
          type: 'boolean',
          description: 'Return the page as clean markdown instead of raw HTML (ideal for feeding an LLM). Default false.',
        },
        _apiKey: {
          type: 'string',
          description:
            'Decodo Web Scraping API credentials as "username:password" (from the dashboard at https://dashboard.decodo.com — free plan available).',
        },
      },
      required: ['url', '_apiKey'],
    },
  },
  {
    name: 'decodo_google_search',
    description:
      'Google search results scraping via Decodo (formerly Smartproxy) — runs a Google search through rotating proxies and ' +
      'returns structured organic results (position, title, url, snippet) plus related searches when parsing succeeds. ' +
      'BYOK — _apiKey is your Decodo Web Scraping API "username:password" credentials. ' +
      'Example: decodo_google_search({ query: "best running shoes 2026", geo: "United States", _apiKey: "user:pass" })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'The Google search query, e.g. "best running shoes 2026"',
        },
        geo: {
          type: 'string',
          description: 'Location name to geotarget the search, e.g. "United States", "United Kingdom". Optional.',
        },
        locale: {
          type: 'string',
          description: 'Language code for the Google interface, e.g. "en-US", "de-DE". Optional.',
        },
        page_count: {
          type: 'number',
          description: 'Number of result pages to retrieve (1-10). Default 1.',
        },
        _apiKey: {
          type: 'string',
          description:
            'Decodo Web Scraping API credentials as "username:password" (from https://dashboard.decodo.com).',
        },
      },
      required: ['query', '_apiKey'],
    },
  },
  {
    name: 'decodo_amazon_product',
    description:
      'Get structured Amazon product data via Decodo (formerly Smartproxy) — title, pricing, rating, reviews, images, ' +
      'availability — parsed into JSON. Pass either a full Amazon product URL or an ASIN. BYOK — _apiKey is your Decodo ' +
      'Web Scraping API "username:password" credentials. Example: decodo_amazon_product({ asin: "B09H74FXNW", _apiKey: "user:pass" })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        url: {
          type: 'string',
          description: 'Full Amazon product page URL, e.g. "https://www.amazon.com/dp/B09H74FXNW". Provide this or `asin`.',
        },
        asin: {
          type: 'string',
          description: 'Amazon ASIN (product identifier), e.g. "B09H74FXNW". Used to build the product URL when `url` is omitted.',
        },
        domain: {
          type: 'string',
          description: 'Amazon marketplace domain used with `asin`, e.g. "com" (default), "co.uk", "de".',
        },
        geo: {
          type: 'string',
          description: 'Proxy exit location as a location name, e.g. "United States". Optional.',
        },
        _apiKey: {
          type: 'string',
          description:
            'Decodo Web Scraping API credentials as "username:password" (from https://dashboard.decodo.com).',
        },
      },
      required: ['_apiKey'],
    },
  },
];

// ---------------------------------------------------------------------------

function pick<T = unknown>(obj: unknown, key: string): T | undefined {
  if (obj && typeof obj === 'object' && key in (obj as Record<string, unknown>)) {
    return (obj as Record<string, unknown>)[key] as T;
  }
  return undefined;
}

// Turn a Decodo HTTP error into an actionable message.
function decodoError(status: number, tool: string, detail?: string): Error {
  const tail = detail ? ` — ${detail}` : '';
  if (status === 400 || status === 401 || status === 403) {
    return new Error(
      `Decodo ${tool}: auth failed (HTTP ${status}). Check your Decodo credentials — ${KEY_HINT}${tail}`,
    );
  }
  if (status === 429) {
    return new Error(
      `Decodo ${tool}: rate-limited (HTTP 429). You've hit your plan's request or rate limit — slow down, or check your plan at ${DASHBOARD_URL}${tail}`,
    );
  }
  return new Error(`Decodo ${tool} error: HTTP ${status}${tail}`);
}

// Pull a message out of a non-2xx body, best-effort.
async function readErrorDetail(res: Response): Promise<string | undefined> {
  try {
    const text = await res.text();
    if (!text) return undefined;
    try {
      const j = JSON.parse(text) as { message?: unknown; detail?: unknown };
      const d = j.message ?? j.detail;
      if (typeof d === 'string') return d;
      if (d != null) return JSON.stringify(d);
    } catch {
      return text.slice(0, 300);
    }
  } catch {
    // ignore
  }
  return undefined;
}

// Cap a string and report whether it was cut.
function truncate(text: string): { content: string; truncated: boolean } {
  return {
    content: text.length > CONTENT_LIMIT ? text.slice(0, CONTENT_LIMIT) : text,
    truncated: text.length > CONTENT_LIMIT,
  };
}

// First result object from the { results: [...] } envelope.
type DecodoResult = {
  content?: unknown;
  status_code?: number;
  url?: string;
  task_id?: string;
};

// POST the /v2/scrape endpoint with HTTP Basic ("username:password") auth and
// return the first entry of the results envelope.
async function decodoPost(
  body: Record<string, unknown>,
  apiKey: string,
  tool: string,
): Promise<DecodoResult> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(apiKey),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(
      `Decodo ${tool}: network error reaching scraper-api.decodo.com — ${(err as Error).message}`,
    );
  }

  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw decodoError(res.status, tool, detail);
  }

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Decodo ${tool}: unexpected non-JSON response from scraper-api.decodo.com (HTTP ${res.status}, first 200 chars: ${text.slice(0, 200)}).`,
    );
  }

  const results = pick<DecodoResult[]>(data, 'results');
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error(
      `Decodo ${tool}: response had an empty \`results\` array — the scrape may have failed upstream. Raw keys: ${Object.keys(
        (data ?? {}) as Record<string, unknown>,
      ).join(', ')}`,
    );
  }
  return results[0];
}

// ---------------------------------------------------------------------------

async function scrape(args: Record<string, unknown>, apiKey: string) {
  const url = args.url as string | undefined;
  if (!url) {
    throw new Error('decodo_scrape requires a `url` (absolute, e.g. "https://example.com").');
  }

  const body: Record<string, unknown> = { url, target: 'universal' };
  if (args.render_js === true) body.headless = 'html';
  if (typeof args.geo === 'string' && args.geo) body.geo = args.geo;
  if (args.markdown === true) body.markdown = true;

  const result = await decodoPost(body, apiKey, 'decodo_scrape');
  const raw = typeof result.content === 'string' ? result.content : JSON.stringify(result.content ?? '');
  const { content, truncated } = truncate(raw);

  return {
    url: result.url ?? url,
    status_code: result.status_code ?? null,
    rendered: args.render_js === true,
    format: args.markdown === true ? 'markdown' : 'html',
    content,
    length: raw.length,
    truncated,
  };
}

// Normalize one parsed organic entry (docs: pos/title/url/desc).
function organicEntry(e: unknown) {
  return {
    position: pick<number>(e, 'pos'),
    title: pick<string>(e, 'title'),
    url: pick<string>(e, 'url'),
    snippet: pick<string>(e, 'desc') ?? pick<string>(e, 'snippet'),
  };
}

async function googleSearch(args: Record<string, unknown>, apiKey: string) {
  const query = args.query as string | undefined;
  if (!query) {
    throw new Error('decodo_google_search requires a `query` (e.g. "best running shoes 2026").');
  }

  const body: Record<string, unknown> = { target: 'google_search', query, parse: true };
  if (typeof args.geo === 'string' && args.geo) body.geo = args.geo;
  if (typeof args.locale === 'string' && args.locale) body.locale = args.locale;
  if (typeof args.page_count === 'number' && args.page_count > 1) {
    body.page_count = Math.min(Math.floor(args.page_count), 10);
  }

  const result = await decodoPost(body, apiKey, 'decodo_google_search');
  const content = result.content;

  // Parsed content carries an `organic` array — sometimes nested under `results`.
  const parsed =
    pick<unknown[]>(content, 'organic') ??
    pick<unknown[]>(pick(content, 'results'), 'organic');

  if (Array.isArray(parsed)) {
    return {
      query,
      status_code: result.status_code ?? null,
      organic_results: parsed.map(organicEntry),
      related_searches:
        pick<unknown>(content, 'related_searches') ??
        pick<unknown>(pick(content, 'results'), 'related_searches') ??
        null,
      count: parsed.length,
    };
  }

  // Parsing came back in an unexpected shape — return truncated raw content
  // so the caller still gets the page.
  const raw = typeof content === 'string' ? content : JSON.stringify(content ?? '');
  const { content: text, truncated } = truncate(raw);
  return {
    query,
    status_code: result.status_code ?? null,
    organic_results: null,
    note: 'Decodo parsing returned an unexpected shape; raw content included instead.',
    content: text,
    length: raw.length,
    truncated,
  };
}

async function amazonProduct(args: Record<string, unknown>, apiKey: string) {
  let url = args.url as string | undefined;
  const asin = args.asin as string | undefined;
  if (!url && asin) {
    const domain = (typeof args.domain === 'string' && args.domain) || 'com';
    url = `https://www.amazon.${domain}/dp/${encodeURIComponent(asin)}`;
  }
  if (!url) {
    throw new Error(
      'decodo_amazon_product requires a `url` (full Amazon product page URL) or an `asin` (e.g. "B09H74FXNW").',
    );
  }

  const body: Record<string, unknown> = { target: 'amazon', url, parse: true };
  if (typeof args.geo === 'string' && args.geo) body.geo = args.geo;

  const result = await decodoPost(body, apiKey, 'decodo_amazon_product');
  const content = result.content;

  if (content && typeof content === 'object') {
    return {
      url: result.url ?? url,
      asin: asin ?? null,
      status_code: result.status_code ?? null,
      product: content,
    };
  }

  // parse fell back to raw HTML — return it truncated.
  const raw = typeof content === 'string' ? content : JSON.stringify(content ?? '');
  const { content: text, truncated } = truncate(raw);
  return {
    url: result.url ?? url,
    asin: asin ?? null,
    status_code: result.status_code ?? null,
    product: null,
    note: 'Decodo returned unparsed content for this page; raw content included instead.',
    content: text,
    length: raw.length,
    truncated,
  };
}

// ---------------------------------------------------------------------------

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = args._apiKey as string;
  delete args._apiKey;

  if (!apiKey) {
    throw new Error(`Decodo requires API credentials. ${KEY_HINT}`);
  }
  if (!apiKey.includes(':')) {
    throw new Error(
      `Decodo _apiKey must be the combined "username:password" string (a ":" separating the two) — got a value with no ":". ${KEY_HINT}`,
    );
  }

  switch (name) {
    case 'decodo_scrape':
      return scrape(args, apiKey);
    case 'decodo_google_search':
      return googleSearch(args, apiKey);
    case 'decodo_amazon_product':
      return amazonProduct(args, apiKey);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
