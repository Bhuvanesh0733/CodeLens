const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;

const client = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// POST /api/auth/google
// Body: { credential: "<Google ID token from the Sign In With Google button>" }
// Verifies the token really came from Google and is meant for THIS app
// (audience check), then issues our own short-lived session token so the
// frontend doesn't have to keep re-verifying with Google on every request.
async function handleGoogleAuth(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async() => {
        let body;
        try {
            body = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
        } catch (e) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
            return;
        }

        const credential = body.credential;
        if (!credential || typeof credential !== 'string') {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'No credential provided' }));
            return;
        }

        if (!GOOGLE_CLIENT_ID || !client) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Server is missing GOOGLE_CLIENT_ID — add it to server/.env' }));
            return;
        }
        if (!JWT_SECRET) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Server is missing JWT_SECRET — add it to server/.env' }));
            return;
        }

        try {
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();

            const user = {
                id: payload.sub,
                name: payload.name,
                email: payload.email,
                picture: payload.picture,
            };

            // Our own session token — the frontend uses THIS from now on, not
            // Google's token, which is only meant to be used once at sign-in time.
            const token = jwt.sign(user, JWT_SECRET, { expiresIn: '30d' });

            res.writeHead(200);
            res.end(JSON.stringify({ token, user }));
        } catch (err) {
            res.writeHead(401);
            res.end(JSON.stringify({ error: 'Invalid or expired Google credential', details: err.message }));
        }
    });
}

module.exports = { handleGoogleAuth };