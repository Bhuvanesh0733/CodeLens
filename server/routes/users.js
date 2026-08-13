const mongoose = require('mongoose');
const User = require('../models/User');
const { getSessionUser, signSession } = require('../utils/session');

// Shared by all three handlers below: confirms there's a valid session AND
// that its id is a real Mongo ObjectId. That second check matters because
// any JWT issued before this MongoDB upgrade would have Google's numeric
// "sub" in the id field, not a Mongo _id — findById() would otherwise
// throw a confusing CastError instead of a clean "please sign in again".
function requireSession(req, res) {
    const session = getSessionUser(req);
    if (!session || !mongoose.Types.ObjectId.isValid(session.id)) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Not signed in — please sign in again' }));
        return null;
    }
    return session;
}

// GET /api/users/me — Read.
// Returns the current database record rather than trusting whatever was
// baked into the JWT at sign-in time — those two can drift apart, e.g.
// right after a PATCH from another tab/device.
async function handleGetMe(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const session = requireSession(req, res);
    if (!session) return;

    try {
        const doc = await User.findById(session.id);
        if (!doc) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Account no longer exists' }));
            return;
        }
        res.writeHead(200);
        res.end(JSON.stringify({ user: doc.toJSON() }));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Database error', details: err.message }));
    }
}

// PATCH /api/users/me — Update.
// Body: { name }
// Currently the only editable field is the display name, but any other
// editable field would follow this same shape. Re-issues a session token
// afterward so the new name takes effect immediately — the OLD token still
// had the stale name baked into it, and would keep showing it until it
// naturally expired otherwise.
async function handleUpdateMe(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const session = requireSession(req, res);
    if (!session) return;

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

        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Name cannot be empty' }));
            return;
        }
        if (name.length > 80) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Name is too long (max 80 characters)' }));
            return;
        }

        try {
            const doc = await User.findByIdAndUpdate(
                session.id, { $set: { name } }, { new: true }
            );
            if (!doc) {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Account no longer exists' }));
                return;
            }

            const user = doc.toJSON();
            const token = signSession(user);

            res.writeHead(200);
            res.end(JSON.stringify({ user, token }));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Database error', details: err.message }));
        }
    });
}

// DELETE /api/users/me — Delete.
// Removes the account entirely. There's nothing left server-side to
// invalidate for a stateless JWT, so the frontend is responsible for
// clearing its own local session right after this succeeds.
async function handleDeleteMe(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const session = requireSession(req, res);
    if (!session) return;

    try {
        await User.findByIdAndDelete(session.id);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Database error', details: err.message }));
    }
}

module.exports = { handleGetMe, handleUpdateMe, handleDeleteMe };