export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const url = new URL(req.url);
  const debug = url.searchParams.get('debug') === '1';

  // Polymarket Gamma API - try multiple query formats
  const queries = [
    'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100&order=volume24hr&ascending=false',
    'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100',
    'https://gamma-api.polymarket.com/markets?limit=100&active=true',
  ];

  for (const upstream of queries) {
    try {
      const res = await fetch(upstream, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://polymarket.com/',
        },
        cf: { cacheTtl: 30 },
      });

      const text = await res.text();

      // If debug mode, return raw response for inspection
      if (debug) {
        return new Response(JSON.stringify({
          status: res.status,
          url: upstream,
          sample: text.slice(0, 2000),
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      if (!res.ok || !text || text.length < 10) continue;

      // Validate JSON
      let parsed;
      try { parsed = JSON.parse(text); } catch { continue; }

      const arr = Array.isArray(parsed)
        ? parsed
        : (parsed.markets || parsed.data || parsed.results || []);

      if (arr.length === 0) continue;

      // Normalize each market to consistent price format
      const normalized = arr.map(m => {
        // Extract prices from all possible field locations
        let yesPrice = null, noPrice = null;

        // Method 1: outcomePrices array
        if (m.outcomePrices && Array.isArray(m.outcomePrices) && m.outcomePrices.length >= 2) {
          yesPrice = parseFloat(m.outcomePrices[0]);
          noPrice  = parseFloat(m.outcomePrices[1]);
        }

        // Method 2: tokens array with price field
        if ((yesPrice == null || isNaN(yesPrice)) && m.tokens && Array.isArray(m.tokens)) {
          const t0 = m.tokens[0], t1 = m.tokens[1];
          if (t0) yesPrice = parseFloat(t0.price ?? t0.outcome_price ?? t0.bestBid ?? t0.last_trade_price ?? 0);
          if (t1) noPrice  = parseFloat(t1.price ?? t1.outcome_price ?? t1.bestBid ?? t1.last_trade_price ?? 0);
        }

        // Method 3: direct bestBid/bestAsk
        if ((yesPrice == null || isNaN(yesPrice)) && m.bestBid != null) {
          yesPrice = parseFloat(m.bestBid);
          noPrice  = parseFloat(m.bestAsk ?? (1 - yesPrice));
        }

        // Method 4: price field directly
        if ((yesPrice == null || isNaN(yesPrice)) && m.price != null) {
          yesPrice = parseFloat(m.price);
          noPrice  = 1 - yesPrice;
        }

        return {
          ...m,
          _yesPrice: isNaN(yesPrice) ? 0 : yesPrice,
          _noPrice:  isNaN(noPrice)  ? 0 : noPrice,
          // Expose raw field samples for debugging
          _rawTokens: m.tokens ? JSON.stringify(m.tokens).slice(0, 200) : null,
          _rawOutcomePrices: m.outcomePrices || null,
        };
      });

      return new Response(JSON.stringify(normalized), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
        },
      });

    } catch (e) {
      if (debug) {
        return new Response(JSON.stringify({ error: e.message }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      continue;
    }
  }

  return new Response(JSON.stringify({ error: 'All endpoints failed', markets: [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
