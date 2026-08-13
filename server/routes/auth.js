const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { signSession } = require('../utils/session');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;

const client = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// POST /api/auth/google
// Body: { credential: "<Google ID token from the Sign In With Google button>" }
// Verifies the token really came from Google and is meant for THIS app
// (audience check), then creates or updates the matching MongoDB user
// document — Create on a brand new Google account, Update (name/picture/
// lastLoginAt) on every sign-in after that — and issues our own session
// token.
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

        let payload;
        try {
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: GOOGLE_CLIENT_ID,
            });
            payload = ticket.getPayload();
        } catch (err) {
            res.writeHead(401);
            res.end(JSON.stringify({ error: 'Invalid or expired Google credential', details: err.message }));
            return;
        }

        try {
            // Upsert: creates the document on a brand new Google account,
            // updates it on every return visit — both in one query.
            const doc = await User.findOneAndUpdate({ googleId: payload.sub }, {
                $set: {
                    email: payload.email,
                    name: payload.name,
                    picture: payload.picture || '',
                    lastLoginAt: new Date(),
                },
                $setOnInsert: { googleId: payload.sub, createdAt: new Date() },
            }, { upsert: true, new: true });

            const user = doc.toJSON();
            const token = signSession(user);

            res.writeHead(200);
            res.end(JSON.stringify({ token, user }));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Database error while saving your account', details: err.message }));
        }
    });
}

module.exports = { handleGoogleAuth };