const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const targetUrl = NVIDIA_BASE + url.pathname.replace('/api/v1', '') + url.search;

  const apiKey = req.headers.get('authorization');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = req.method !== 'GET' ? await req.text() : undefined;
  const isStream = body ? JSON.parse(body)?.stream === true : false;

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
      'Accept': isStream ? 'text/event-stream' : 'application/json',
    },
    body,
  });

  const headers = {
    'Content-Type': isStream ? 'text/event-stream' : 'application/json',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  };

  return new Response(upstream.body, { status: upstream.status, headers });
}
