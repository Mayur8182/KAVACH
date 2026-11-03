/**
 * Kavach Security Platform — Unified Gateway
 * Binds immediately to 0.0.0.0:$PORT so cloud load balancers (Render) detect an open port instantly.
 * Routes /api/* requests to FastAPI (127.0.0.1:8000)
 * Routes all other requests to Next.js (127.0.0.1:3000)
 * Supports HTTP/1.1 streaming, chunking, and WebSocket proxying.
 */

const http = require('http');
const net = require('net');

const PORT = parseInt(process.env.PORT || '10000', 10);
const FRONTEND_PORT = parseInt(process.env.FRONTEND_PORT || '3000', 10);
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '8000', 10);

const WARMUP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="2">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kavach Security Platform</title>
  <style>
    body {
      background: #090d16;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      text-align: center;
      padding: 32px 40px;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(8px);
      max-width: 420px;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(59, 130, 246, 0.2);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 20px; font-weight: 600; margin: 0 0 8px 0; letter-spacing: -0.02em; }
    p { font-size: 14px; color: #94a3b8; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>Kavach Security Platform</h1>
    <p>Starting secure control plane... Loading in seconds.</p>
  </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  // Health check endpoint for Render/uptime probes
  if (req.url === '/healthz' || req.url === '/render-healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('OK');
  }

  const isApi =
    req.url.startsWith('/api/') ||
    req.url === '/api' ||
    req.url.startsWith('/docs') ||
    req.url === '/openapi.json';
  const targetPort = isApi ? BACKEND_PORT : FRONTEND_PORT;

  const originalHost = req.headers.host || 'kavachsecurity.me';
  const headers = { ...req.headers };

  headers['x-forwarded-for'] = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  headers['x-forwarded-proto'] = req.headers['x-forwarded-proto'] || 'https';
  headers['x-forwarded-host'] = originalHost;
  headers['host'] = `127.0.0.1:${targetPort}`;

  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    }
  );

  // Set timeout to prevent indefinitely hanging connections
  proxyReq.setTimeout(45000, () => {
    proxyReq.destroy(new Error('Gateway Target Timeout'));
  });

  proxyReq.on('error', (err) => {
    console.error(`[Gateway] Error forwarding ${req.method} ${req.url} -> :${targetPort}:`, err.message);
    if (!res.headersSent) {
      if (!isApi) {
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        });
        return res.end(WARMUP_HTML);
      }
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Backend service warming up', code: err.code || 'UNAVAILABLE' }));
    }
  });

  // CRITICAL: In Node.js, GET/HEAD requests have no body. We MUST call proxyReq.end()!
  if (req.method === 'GET' || req.method === 'HEAD') {
    proxyReq.end();
  } else {
    req.pipe(proxyReq, { end: true });
  }
});

// Support WebSocket proxying (e.g. live telemetry streams, terminal sessions)
server.on('upgrade', (req, socket, head) => {
  const isApi = req.url.startsWith('/api/') || req.url === '/api';
  const targetPort = isApi ? BACKEND_PORT : FRONTEND_PORT;

  const proxySocket = net.connect(targetPort, '127.0.0.1', () => {
    proxySocket.write(
      `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
        Object.entries(req.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\r\n') +
        '\r\n\r\n'
    );
    if (head && head.length > 0) proxySocket.write(head);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxySocket.on('error', (err) => {
    console.error(`[Gateway WebSocket Error] -> :${targetPort}:`, err.message);
    socket.destroy();
  });
  socket.on('error', () => {
    proxySocket.destroy();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`==================================================`);
  console.log(`  KAVACH UNIFIED GATEWAY`);
  console.log(`  Listening on 0.0.0.0:${PORT}`);
  console.log(`  Frontend: 127.0.0.1:${FRONTEND_PORT}`);
  console.log(`  Backend:  127.0.0.1:${BACKEND_PORT}`);
  console.log(`==================================================`);
});
