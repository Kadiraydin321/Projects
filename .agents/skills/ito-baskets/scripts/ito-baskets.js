#!/usr/bin/env node

/**
 * Itô Baskets — unified read-only client for basket/market index, comparison,
 * briefing, and planning-worksheet data.
 *
 * Two access surfaces, never mixed:
 *   anonymous: basket-index, basket-detail  (public edge reads, no credential
 *              is ever sent, even when ITO_API_KEY is configured)
 *   keyed:     list-baskets, search-markets, get-market, market-history
 *              (require ITO_API_KEY with baskets:read / markets:read)
 *
 * Every command is GET-only. No command can create, update, order, reserve,
 * or execute anything.
 */

const DEFAULT_KEYED_BASE_URL = 'https://itomarkets.com/api/v1';
const DEFAULT_PUBLIC_BASE_URL = 'https://itomarkets.com';
const PUBLIC_CONTRACT_VERSION = 'ito.public_basket_read.v1';
const DEFAULT_TIMEOUT_MS = 10_000;

const ANONYMOUS_COMMANDS = new Set(['basket-index', 'basket-detail']);
const KEYED_COMMANDS = new Set(['list-baskets', 'search-markets', 'get-market', 'market-history']);

function fail(code, message, details = {}, exitCode = 1) {
  const error = new Error(message);
  Object.assign(error, { code, details, exitCode });
  throw error;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = { json: false, timeoutMs: DEFAULT_TIMEOUT_MS, params: {} };
  while (args[0]?.startsWith('--')) {
    const flag = args.shift();
    if (flag === '--json') options.json = true;
    else if (flag === '--timeout-ms') options.timeoutMs = Number(args.shift());
    else fail('USAGE', `Unknown global option: ${flag}`, {}, 2);
  }
  options.command = args.shift();
  while (args.length) {
    const flag = args.shift();
    if (!flag?.startsWith('--') || !args.length) fail('USAGE', `Invalid option: ${flag || '(missing)'}`, {}, 2);
    options.params[flag.slice(2)] = args.shift();
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 100 || options.timeoutMs > 60_000) {
    fail('USAGE', '--timeout-ms must be an integer from 100 to 60000', {}, 2);
  }
  return options;
}

function commandRoute(command, params) {
  const enc = encodeURIComponent;
  if (command === 'basket-index') {
    return { access: 'anonymous', pathname: '/api/baskets/bootstrap', fixed: { stream: '1' }, allowed: new Set() };
  }
  if (command === 'basket-detail' && params['basket-id']) {
    return { access: 'anonymous', pathname: `/api/baskets/${enc(params['basket-id'])}/bootstrap`, fixed: { stream: '1' }, allowed: new Set(), consumed: ['basket-id'] };
  }
  if (command === 'list-baskets') return { access: 'keyed', pathname: '/baskets', allowed: new Set(['page', 'per-page']) };
  if (command === 'search-markets') return { access: 'keyed', pathname: '/markets/search', allowed: new Set(['platform', 'category', 'expiration', 'limit']) };
  if (command === 'get-market' && params['market-id']) return { access: 'keyed', pathname: `/markets/${enc(params['market-id'])}`, allowed: new Set(['platform']), consumed: ['market-id'] };
  if (command === 'market-history' && params['market-id']) return { access: 'keyed', pathname: `/markets/${enc(params['market-id'])}/history`, allowed: new Set(['platform', 'days']), consumed: ['market-id'] };
  fail('USAGE', 'Use basket-index, basket-detail --basket-id ID, list-baskets, search-markets, get-market --market-id ID, or market-history --market-id ID', {}, 2);
}

function safeBaseUrl(raw, envName) {
  let url;
  try { url = new URL(raw); } catch { fail('CONFIG', `${envName} must be an absolute URL`); }
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    fail('CONFIG', `${envName} must use HTTPS (HTTP is allowed only for loopback tests)`);
  }
  url.pathname = url.pathname.replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url;
}

function buildRequest(options, environment) {
  const route = commandRoute(options.command, options.params);
  const base = route.access === 'anonymous'
    ? safeBaseUrl(environment.ITO_PUBLIC_API_URL || DEFAULT_PUBLIC_BASE_URL, 'ITO_PUBLIC_API_URL')
    : safeBaseUrl(environment.ITO_MARKET_API_URL || DEFAULT_KEYED_BASE_URL, 'ITO_MARKET_API_URL');
  // Note: URL.pathname coerces '' back to '/' for special schemes, so build
  // the final URL from origin + path segments instead of a relative resolve.
  const basePath = base.pathname === '/' ? '' : base.pathname;
  const url = new URL(`${base.origin}${basePath}${route.pathname}`);
  for (const [key, value] of Object.entries(route.fixed || {})) url.searchParams.set(key, value);
  const consumed = new Set(route.consumed || []);
  for (const [key, value] of Object.entries(options.params)) {
    if (consumed.has(key)) continue;
    if (!route.allowed.has(key)) fail('USAGE', `Option --${key} is not valid for ${options.command}`, {}, 2);
    url.searchParams.set(key === 'per-page' ? 'per_page' : key, value);
  }
  const headers = { Accept: 'application/json' };
  if (route.access === 'keyed') {
    const apiKey = environment.ITO_API_KEY?.trim();
    if (!apiKey) fail('AUTH_MISSING', 'No Itô market API credential is configured. Set ITO_API_KEY outside chat, or use the anonymous basket-index/basket-detail commands.');
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return { route, url, headers };
}

function validatePublicContract(command, body) {
  if (body?.contractVersion !== PUBLIC_CONTRACT_VERSION) {
    fail('INVALID_RESPONSE', `Public basket read contract changed or missing (expected ${PUBLIC_CONTRACT_VERSION}); refusing to treat the response as current product data`);
  }
  if (!body.generated_at || Number.isNaN(Date.parse(body.generated_at))) {
    fail('INVALID_RESPONSE', 'Public basket read returned no parseable generated_at');
  }
  if (command === 'basket-index' && !Array.isArray(body.baskets)) {
    fail('INVALID_RESPONSE', 'Public basket index returned no baskets array');
  }
  if (command === 'basket-detail') {
    for (const field of ['basket', 'underlyers', 'charts', 'metrics', 'commentary']) {
      if (body[field] === undefined || body[field] === null) {
        fail('INVALID_RESPONSE', `Public basket detail is missing ${field}`);
      }
    }
  }
}

async function run(options, environment = process.env, fetchImpl = fetch) {
  const { route, url, headers } = buildRequest(options, environment);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  const retrievedAt = new Date().toISOString();
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
      redirect: 'error',
    });
  } catch (error) {
    if (error?.name === 'AbortError') fail('TIMEOUT', `Itô basket API did not respond within ${options.timeoutMs}ms`);
    fail('UPSTREAM_ERROR', 'Itô basket API request failed');
  } finally {
    clearTimeout(timer);
  }
  let body;
  try { body = await response.json(); } catch { fail('INVALID_RESPONSE', 'Itô basket API returned non-JSON content'); }
  if (response.status === 401 || response.status === 403) fail('AUTH_REJECTED', 'Itô rejected the credential or required read scope');
  if (response.status === 429) {
    const retry = Number(response.headers.get('retry-after'));
    fail('RATE_LIMITED', 'Itô basket API rate limit reached', Number.isFinite(retry) ? { retry_after_seconds: retry } : {});
  }
  if (!response.ok) fail('UPSTREAM_ERROR', `Itô basket API returned HTTP ${response.status}`, { status: response.status });
  if (route.access === 'anonymous') validatePublicContract(options.command, body);
  const rateLimit = {};
  for (const [field, header] of [['limit', 'x-ratelimit-limit'], ['remaining', 'x-ratelimit-remaining'], ['reset_epoch', 'x-ratelimit-reset']]) {
    const value = Number(response.headers.get(header));
    if (Number.isFinite(value)) rateLimit[field] = value;
  }
  const cache = {};
  for (const [field, header] of [['date', 'date'], ['cache_control', 'cache-control'], ['age', 'age'], ['last_modified', 'last-modified'], ['edge_cache', 'x-ito-edge-cache']]) {
    const value = response.headers.get(header);
    if (value) cache[field] = value;
  }
  return {
    ok: true,
    command: options.command,
    access_mode: route.access,
    retrieved_at: retrievedAt,
    source: { provider: 'Itô Markets', url: url.toString(), http_status: response.status },
    freshness: {
      source_updated_at: body?.meta?.updated_at || body?.data?.updated_at || body?.generated_at || null,
      caveat: 'Snapshot at retrieval time; verify source timestamps before acting. An edge stale marker means stale provenance even when generated_at is recent.',
    },
    cache: Object.keys(cache).length ? cache : null,
    rate_limit: Object.keys(rateLimit).length ? rateLimit : null,
    data: route.access === 'anonymous' ? body : (body?.data ?? body),
    meta: body?.meta ?? null,
  };
}

function print(result, json) {
  if (json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(`${result.command}: ${JSON.stringify(result.data)}\nSource: ${result.source.url}\nRetrieved: ${result.retrieved_at}\nAccess: ${result.access_mode}\n`);
}

if (require.main === module) {
  let options = { json: process.argv.includes('--json') };
  Promise.resolve().then(() => { options = parseArgs(process.argv); return run(options); })
    .then(result => print(result, options.json))
    .catch(error => {
      const payload = { ok: false, error: { code: error.code || 'INTERNAL', message: error.message, ...(error.details && Object.keys(error.details).length ? { details: error.details } : {}) } };
      process.stderr.write(`${options.json ? JSON.stringify(payload, null, 2) : `${payload.error.code}: ${payload.error.message}`}\n`);
      process.exitCode = error.exitCode || 1;
    });
}

module.exports = { parseArgs, run, safeBaseUrl, buildRequest, ANONYMOUS_COMMANDS, KEYED_COMMANDS, PUBLIC_CONTRACT_VERSION };

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFKdtQnDSkV86
// SIG // we36cz7zb7E1XC2soIIDGDCCAxQwggH8oAMCAQICECO+
// SIG // hXVV+mywSC4lkmKyRmIwDQYJKoZIhvcNAQELBQAwIjEg
// SIG // MB4GA1UEAwwXQW50aWdyYXZpdHktQUdZLVNjcmlwdHMw
// SIG // HhcNMjYxMTA4MDk0NDE1WhcNMzYxMTA4MDk1NDE1WjAi
// SIG // MSAwHgYDVQQDDBdBbnRpZ3Jhdml0eS1BR1ktU2NyaXB0
// SIG // czCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB
// SIG // ALVYf1oFZ+beC823GUw/yiFUsl2ZhDf63Sw7QSsQIRVi
// SIG // MW2Rw6LTiIx6yMI38a9WZZ8ahXBYzaO/TGi0CVFnzt2k
// SIG // 7uwbB/03/pr1EBGrKERJFcHcJ6er1x38W8jMZDlxNMtt
// SIG // oNKv/S8xRVwbVC5fgvf63B/tMj6nfXunysARotCNe8MY
// SIG // d8lrdZfhxyhfDrAYD4has6tKJTFfqZtxWGfN/TBnQFGB
// SIG // zozhZBsbQJHZJZEwIrQX4iFSNU4zGnG57FbqIPap83OE
// SIG // uoXU9FR2diXWr7D1njVNxD6M3RwJIB5QMtlBKimKAqwL
// SIG // b0ii5jT7+uNgRv8H4xb+YKU+96pCNE54dqECAwEAAaNG
// SIG // MEQwDgYDVR0PAQH/BAQDAgeAMBMGA1UdJQQMMAoGCCsG
// SIG // AQUFBwMDMB0GA1UdDgQWBBTSFBrNRdyMOGEM9VQ5lS2m
// SIG // CvSzZjANBgkqhkiG9w0BAQsFAAOCAQEAJF3bNWKL9NJV
// SIG // a/dn1dHylI79o1oUOawP/4M7vVU8iJZLIpfWC8Mb335d
// SIG // Jr6zpAMwKsAbN5nvoFeQtGFjkMzKPoUlWF0mVbeKLATi
// SIG // lk7//BV9JeXheD3V6xu0q5HuS0CA/u2yJw+TT8nuErZJ
// SIG // 2JLO4O8OghdIv2Xj6FUS0C47ebQRTUgt4Xtgr+no3QPV
// SIG // Sp4NXGxoj0KbDX1gxvrmQ3NuyWJ+nw1IR6pimzZvKXIV
// SIG // wgmBwo0udXB/na//NhpO07XX2J1T9GNOfUuc2rtuFocB
// SIG // Gog4j1dz+k4e2naHoGJ54/OFzAK20C38phicGH0EKnmf
// SIG // ZoEKnlGBoPSwBnYzbJPjuzGCAdcwggHTAgEBMDYwIjEg
// SIG // MB4GA1UEAwwXQW50aWdyYXZpdHktQUdZLVNjcmlwdHMC
// SIG // ECO+hXVV+mywSC4lkmKyRmIwCQYFKw4DAhoFAKB4MBgG
// SIG // CisGAQQBgjcCAQwxCjAIoAKAAKECgAAwGQYJKoZIhvcN
// SIG // AQkDMQwGCisGAQQBgjcCAQQwHAYKKwYBBAGCNwIBCzEO
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFO5y
// SIG // QGh6noehn1030dxlgO2HpARZMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAGIJdGXey12+07xnVIbCF4G/yuyBWRsSpjsZygF2
// SIG // gCJC5yxrowl7hqwYeNSy2/HFTBS44Hi7PDH1uSc/FBmE
// SIG // DuhU3YD2yGQ4fgsWYR82+mnVkX4DZNTSsDHrsalguxc9
// SIG // NBHN0fk+R6gPY+7gskPsQ6/g8HVXYK49ynLr0xPv7805
// SIG // x+Nal+sJ/Eyg3ZlHE5G2zjdwlpqmAiq95QPsz/5Sf4DN
// SIG // icNFyXbxHzlrH4R9KSf3d4g68VLFP8Wi5zlddxy/IvQo
// SIG // 90ldmm7xOIz49m76H9gXeHboUU34PEQmgKF8BlFgGKdN
// SIG // 7qQvfIaALGJC6luyayJZ8eqI1eoPPm8KgWGIqcE=
// SIG // End signature block
