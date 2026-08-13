const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Pulls the "Bearer <token>" our own /api/auth/google (or a profile
// update) issued out of the Authorization header and verifies it. Shared
// by every route that needs to know "who is making this request", so the
// verification logic — and what happens when it fails — lives in one place
// instead of being copy-pasted per route.
function getSessionUser(req) {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token || !JWT_SECRET) return null;

    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
}

// Issues a session token for a user (a Mongoose doc's .toJSON() shape, or
// anything with the same four fields). Centralized so the token's shape
// can't quietly drift between where it's first issued (sign-in) and where
// it gets re-issued (profile update).
function signSession(user) {
    return jwt.sign({ id: user.id, name: user.name, email: user.email, picture: user.picture },
        JWT_SECRET, { expiresIn: '30d' }
    );
}

module.exports = { getSessionUser, signSession };