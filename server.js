const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3456;
const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Proxy all /v1/* requests to NVIDIA API
app.all('/api/v1/*path', async (req, res) => {
  const apiKey = req.headers['authorization'];
  if (!apiKey) return res.status(401).json({ error: 'Missing Authorization header' });

  const targetUrl = NVIDIA_BASE + req.path.replace('/api/v1', '');
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
      res.setHeader('Connection', 'keep-alive');
      upstream.body.pipe(res);
      req.on('close', () => upstream.body.destroy());
    } else {
      const data = await upstream.json();
      res.status(upstream.status).json(data);
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n⚡ NVIDIA Chat Engine running at http://localhost:${PORT}\n`);
});
