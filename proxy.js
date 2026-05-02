const http = require('http');
const httpProxy = require('http-proxy');

// Create a proxy server with custom application logic
const proxy = httpProxy.createProxyServer({
  ws: true,
  xfwd: true // add x-forwarded headers
});

// Error handling to prevent crashing
proxy.on('error', function (err, req, res) {
  console.error('Proxy Error:', err.message);
  if (res && res.writeHead) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Proxy Error: ' + err.message);
  }
});

const WEB_PORT = 3000;
const API_PORT = 4000;

// The main server that handles all requests
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api') || req.url.startsWith('/socket.io')) {
    // Route API and Socket.IO polling to the NestJS backend
    proxy.web(req, res, { target: `http://127.0.0.1:${API_PORT}` });
  } else {
    // Route everything else to Next.js frontend
    proxy.web(req, res, { target: `http://127.0.0.1:${WEB_PORT}` });
  }
});

// Listen to the `upgrade` event and proxy the WebSocket requests
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/api') || req.url.startsWith('/socket.io')) {
    proxy.ws(req, socket, head, { target: `http://127.0.0.1:${API_PORT}` });
  } else {
    proxy.ws(req, socket, head, { target: `http://127.0.0.1:${WEB_PORT}` });
  }
});

// Railway will inject the PORT environment variable here
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Unified Reverse Proxy listening on port ${PORT}`);
  console.log(`- Routing /api and /socket.io -> port ${API_PORT}`);
  console.log(`- Routing /* -> port ${WEB_PORT}`);
});
