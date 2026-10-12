// Live USD -> ZMW rate. Mobile money settles in Kwacha while courses may be
// priced in dollars, and the rate moves, so it is fetched rather than fixed.
//
// Two independent free sources are tried in turn. The last good value is cached
// and kept as a fallback, so a brief outage at the provider never stops a
// student paying.

const SOURCES = [
  {
    name: 'open.er-api.com',
    url: 'https://open.er-api.com/v6/latest/USD',
    pick: (d) => (d?.result === 'success' ? Number(d?.rates?.ZMW) : null)
  },
  {
    name: 'currency-api',
    url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
    pick: (d) => Number(d?.usd?.zmw)
  }
];

const CACHE_MS = Number(process.env.FX_CACHE_MINUTES || 180) * 60 * 1000;

// Sanity bounds. A rate outside this range is almost certainly a bad feed
// rather than a real move, and charging on it would be costly.
const MIN_RATE = 5;
const MAX_RATE = 200;

let cache = { rate: null, source: null, fetchedAt: 0 };

async function fetchFrom(source) {
  const res = await fetch(source.url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`${source.name} returned ${res.status}`);
  const rate = source.pick(await res.json());
  if (!Number.isFinite(rate) || rate < MIN_RATE || rate > MAX_RATE) {
    throw new Error(`${source.name} gave an implausible rate: ${rate}`);
  }
  return rate;
}

/**
 * Current USD -> ZMW rate, including any configured margin.
 * Returns { rate, baseRate, source, fetchedAt, stale }.
 */
export async function getUsdToZmw({ force = false } = {}) {
  const fresh = Date.now() - cache.fetchedAt < CACHE_MS;
  if (!force && fresh && cache.rate) {
    return { ...withMargin(cache.rate), source: cache.source, fetchedAt: cache.fetchedAt, stale: false };
  }

  for (const source of SOURCES) {
    try {
      const rate = await fetchFrom(source);
      cache = { rate, source: source.name, fetchedAt: Date.now() };
      return { ...withMargin(rate), source: source.name, fetchedAt: cache.fetchedAt, stale: false };
    } catch (err) {
      console.warn(`[fx] ${err.message}`);
    }
  }

  // Every source failed. Use the last good value if we have one.
  if (cache.rate) {
    console.warn('[fx] all sources failed — serving the last known rate');
    return { ...withMargin(cache.rate), source: `${cache.source} (cached)`, fetchedAt: cache.fetchedAt, stale: true };
  }

  const configured = Number(process.env.FX_FALLBACK_USD_ZMW);
  if (Number.isFinite(configured) && configured > 0) {
    return { ...withMargin(configured), source: 'configured fallback', fetchedAt: Date.now(), stale: true };
  }

  throw Object.assign(
    new Error('Could not get an exchange rate just now. Please try again shortly.'),
    { status: 503 }
  );
}

/**
 * FX feeds quote the mid-market rate; what actually settles is usually a little
 * worse. FX_MARGIN_PERCENT adds a buffer so the academy isn't short-changed.
 */
function withMargin(baseRate) {
  const margin = Number(process.env.FX_MARGIN_PERCENT || 0);
  const rate = margin ? baseRate * (1 + margin / 100) : baseRate;
  return { rate: Number(rate.toFixed(6)), baseRate: Number(baseRate.toFixed(6)), marginPercent: margin };
}

/**
 * Convert a price into Kwacha, server-side. The browser is never trusted to
 * work out what a student should be charged.
 * Returns { amountZmw, rate, source }.
 */
export async function toKwacha(amountCents, currency = 'USD') {
  const cents = Number(amountCents);
  if (!Number.isFinite(cents) || cents <= 0) {
    throw Object.assign(new Error('That payment amount is not valid.'), { status: 400 });
  }

  if (String(currency).toUpperCase() === 'ZMW') {
    return { amountZmw: Number((cents / 100).toFixed(2)), rate: 1, source: 'priced in ZMW' };
  }

  const { rate, source, stale } = await getUsdToZmw();
  return {
    amountZmw: Number(((cents / 100) * rate).toFixed(2)),
    rate,
    source,
    stale
  };
}
