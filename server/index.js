require('dotenv').config();
const http = require('http');
const { handleReview } = require('./routes/review');
const { handleExecute } = require('./routes/execute');
const { handleVisualize } = require('./routes/visualize');
const { getHistory } = require('./routes/history');
const { handleGoogleAuth } = require('./routes/auth');
const { reviewEmitter, getStats } = require('./events/emitter');

const PORT = process.env.PORT || 3001;

// SSE clients listening to /api/events
const sseClients = new Set();

reviewEmitter.on('review:started', () => broadcastStats());
reviewEmitter.on('review:complete', () => broadcastStats());

function broadcastStats() {
    const data = `data: ${JSON.stringify(getStats())}\n\n`;
    for (const client of sseClients) {
        try { client.write(data); } catch (_) { sseClients.delete(client); }
    }
}

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer((req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const path = url.pathname;

    // ── POST /api/execute ── run any language via Piston API
    if (path === '/api/execute' && req.method === 'POST') {
        handleExecute(req, res);
        return;
    }

    // ── POST /api/visualize ── instrument + trace execution
    if (path === '/api/visualize' && req.method === 'POST') {
        handleVisualize(req, res);
        return;
    }

    // ── POST /api/review ── AI streaming review via Claude SSE
    if (path === '/api/review' && req.method === 'POST') {
        handleReview(req, res);
        return;
    }

    // ── POST /api/auth/google ── verify Google Sign-In token, issue session ──
    if (path === '/api/auth/google' && req.method === 'POST') {
        handleGoogleAuth(req, res);
        return;
    }

    // ── GET /api/history ──
    if (path === '/api/history' && req.method === 'GET') {
        const history = getHistory();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ history }));
        return;
    }

    // ── GET /api/stats ──
    if (path === '/api/stats' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getStats()));
        return;
    }

    // ── GET /api/events  (SSE live stats) ──
    if (path === '/api/events' && req.method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
        });
        res.write(`data: ${JSON.stringify(getStats())}\n\n`);
        sseClients.add(res);
        req.on('close', () => sseClients.delete(res));
        return;
    }

    // ── 404 ──
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', path }));
});

server.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════╗');
    console.log('  ║   CodeLens Server  ·  Running            ║');
    console.log(`  ║   http://localhost:${PORT}                ║`);
    console.log('  ╠══════════════════════════════════════════╣');
    console.log('  ║  POST /api/execute   — run any language  ║');
    console.log('  ║  POST /api/visualize — line-by-line trace║');
    console.log('  ║  POST /api/review    — AI code review    ║');
    console.log('  ║  POST /api/auth/google — Google sign-in  ║');
    console.log('  ║  GET  /api/history   — review history    ║');
    console.log('  ║  GET  /api/events    — SSE live stats    ║');
    console.log('  ╚══════════════════════════════════════════╝');
    console.log('');
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_api_key_here') {
        console.warn('  ⚠  GROQ_API_KEY not set — add it to server/.env');
        console.warn('     (AI Review will show an error without it)');
    } else {
        console.log('  ✓  Groq API key loaded');
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
        console.warn('  ⚠  GOOGLE_CLIENT_ID not set — add it to server/.env');
        console.warn('     (Google Sign-In will show an error without it)');
    } else {
        console.log('  ✓  Google Client ID loaded');
    }
    if (!process.env.JWT_SECRET) {
        console.warn('  ⚠  JWT_SECRET not set — add it to server/.env');
        console.warn('     (any random long string works, e.g. openssl rand -hex 32)');
    }
    console.log('');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`  ✗  Port ${PORT} is already in use.`);
    } else {
        console.error('  ✗  Server error:', err.message);
    }
    process.exit(1);
});