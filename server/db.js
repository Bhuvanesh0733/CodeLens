const mongoose = require('mongoose');

let connectPromise = null;

// Connects once at server startup and lets Mongoose pool/reuse that same
// connection for every request after that — this should be called once
// from index.js before server.listen(), never per-request.
function connectDB() {
    if (connectPromise) return connectPromise;

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        return Promise.reject(new Error('MONGODB_URI is not set — add it to server/.env'));
    }

    mongoose.set('strictQuery', true);

    connectPromise = mongoose.connect(uri).then((conn) => {
        console.log(`  ✓  MongoDB connected (${conn.connection.name})`);
        return conn;
    });

    return connectPromise;
}

module.exports = { connectDB };