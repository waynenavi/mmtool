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
  const path = url.searchParams.get('path') || '/markets';
  const params = url.searchParams.get('params') || '';
  const debug = url.searchParams.get('debug') === '1';

  // 动态拼接请求，不再硬编码死数据
  const upstream = `https://gamma-api.polymarket.com${path}${params ? '?' + params : ''}`;

  try {
    const res = await fetch(upstream, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://polymarket.com/',
        'Origin': 'https://polymarket.com'
      }
    });

    const text = await res.text();

    if (debug) {
      return new Response(JSON.stringify({
        status: res.status,
        url: upstream,
        sample: text.slice(0, 2000),
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Gamma API 错误，状态码: ${res.status}`, raw: text.slice(0, 100) }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    let parsed = JSON.parse(text);
    const arr = Array.isArray(parsed) ? parsed : (parsed.markets || parsed.data || parsed.results || []);

    // 格式标准化清洗
    const normalized = arr.map(m => {
      let yesPrice = null, noPrice = null;

      if (m.outcomePrices && Array.isArray(m.outcomePrices) && m.outcomePrices.length >= 2) {
        yesPrice = parseFloat(m.outcomePrices[0]);
        noPrice  = parseFloat(m.outcomePrices[1]);
      }

      if ((yesPrice == null || isNaN(yesPrice)) && m.tokens && Array.isArray(m.tokens)) {
        const t0 = m.tokens[0], t1 = m.tokens[1];
        if (t0) yesPrice = parseFloat(t0.price ?? t0.outcome_price ?? t0.bestBid ?? t0.last_trade_price ?? 0);
        if (t1) noPrice  = parseFloat(t1.price ?? t1.outcome_price ?? t1.bestBid ?? t1.last_trade_price ?? 0);
      }

      if ((yesPrice == null || isNaN(yesPrice)) && m.bestBid != null) {
        yesPrice = parseFloat(m.bestBid);
        noPrice  = parseFloat(m.bestAsk ?? (1 - yesPrice));
      }

      if ((yesPrice == null || isNaN(yesPrice)) && m.price != null) {
        yesPrice = parseFloat(m.price);
        noPrice  = 1 - yesPrice;
      }

      return {
        ...m,
        _yesPrice: isNaN(yesPrice) ? 0 : yesPrice,
        _noPrice:  isNaN(noPrice)  ? 0 : noPrice,
        _rawTokens: m.tokens ? JSON.stringify(m.tokens).slice(0, 200) : null,
        _rawOutcomePrices: m.outcomePrices || null,
      };
    });

    return new Response(JSON.stringify(normalized), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=15, stale-while-revalidate=30',
      },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}