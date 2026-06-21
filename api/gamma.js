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
      // 💡 容错升级：遇到外部 API 被墙或异常时返回安全格式，防止 Vercel 抛出未捕获网关错误
      return new Response(JSON.stringify({ error: `Gamma 节点暂不可达 (HTTP ${res.status})`, markets: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return new Response(JSON.stringify({ error: '数据转换故障', markets: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const arr = Array.isArray(parsed) ? parsed : ((parsed && (parsed.markets || parsed.data || parsed.results)) || []);

    const normalized = arr.map(m => {
      if (!m) return {};
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
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=15, stale-while-revalidate=30',
      },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, markets: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}