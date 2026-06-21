export const config = { runtime: 'edge' };

const CLOB = 'https://clob.polymarket.com';

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
  const endpoint = url.searchParams.get('endpoint') || 'book';
  const params   = url.searchParams.get('params') || '';

  const upstream = `${CLOB}/${endpoint}${params ? '?' + params : ''}`;

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
        'Cache-Control': 's-maxage=10, stale-while-revalidate=20',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
