const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const apiKey = req.headers['authorization'];
  if (!apiKey) return res.status(401).json({ error: 'Missing Authorization header' });

  // Vercel may pass /api/v1/... or just /v1/... — strip either prefix
  const rawPath = req.url.split('?')[0];
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const apiPath = rawPath.replace(/^\/(api\/)?v1/, '') || '/';
  const targetUrl = NVIDIA_BASE + apiPath + query;

  const isStream = req.body?.stream === true;

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
        'Accept': isStream ? 'text/event-stream' : 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    if (isStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      req.on('close', () => reader.cancel());
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } else {
      const data = await upstream.json();
      res.status(upstream.status).json(data);
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
