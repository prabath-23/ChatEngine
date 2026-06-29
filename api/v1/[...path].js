const fetch = require('node-fetch');

const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const apiKey = req.headers['authorization'];
  if (!apiKey) return res.status(401).json({ error: 'Missing Authorization header' });

  const apiPath = req.url.replace(/^\/api\/v1/, '') || '/';
  const targetUrl = NVIDIA_BASE + apiPath;

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
      upstream.body.pipe(res);
      req.on('close', () => upstream.body.destroy());
    } else {
      const data = await upstream.json();
      res.status(upstream.status).json(data);
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
