export const config = { runtime: 'edge' };

const GAMMA = 'https://gamma-api.polymarket.com';

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

  const upstream = `${GAMMA}${path}${params ? '?' + params : ''}`;

  try {
    const res = await fetch(upstream, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'mmtool/2.0' },
    });
    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
