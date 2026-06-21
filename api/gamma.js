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

  // Try multiple endpoint formats
  const endpoints = [
    `https://gamma-api.polymarket.com${path}${params ? '?' + params : ''}`,
    `https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100`,
  ];

  let lastError = '';
  for (const upstream of endpoints) {
    try {
      const res = await fetch(upstream, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 mmtool/2.1',
          'Origin': 'https://polymarket.com',
        },
      });
      if (!res.ok) { lastError = `${res.status} ${res.statusText}`; continue; }
      const text = await res.text();
      // Validate it's JSON
      JSON.parse(text);
      return new Response(text, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
        },
      });
    } catch (e) {
      lastError = e.message;
      continue;
    }
  }

  return new Response(JSON.stringify({ error: lastError, markets: [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
