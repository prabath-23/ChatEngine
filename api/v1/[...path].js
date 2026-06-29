const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    });
  }

  const apiKey = req.headers.get('authorization');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Strip /v1 or /api/v1 prefix to get the NVIDIA API path
  const url = new URL(req.url);
  const apiPath = url.pathname.replace(/^\/(?:api\/)?v1/, '') || '/';
  const targetUrl = NVIDIA_BASE + apiPath + url.search;

  const body = req.method !== 'GET' ? await req.text() : undefined;
  const isStream = body ? (() => { try { return JSON.parse(body)?.stream === true; } catch { return false; } })() : false;

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
