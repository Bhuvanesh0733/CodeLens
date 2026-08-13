const mongoose = require('mongoose');

// One document per Google account. googleId (Google's stable "sub" claim)
// is what we look up on every sign-in — it doesn't change even if the
// person's email or name does, unlike email which isn't a safe primary key.
const userSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    picture: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: Date.now },
}, {
    toJSON: {
        // Reshape every doc that leaves this file via .toJSON(): map Mongo's
        // _id to a plain "id" (matches what the frontend already expects
        // from the old Google-only JWT), and never leak googleId or __v to
        // the client — googleId is an internal lookup key, not something
        // any route response needs to expose.
        transform(_doc, ret) {
            ret.id = ret._id.toString();
            delete ret._id;
            delete ret.__v;
            delete ret.googleId;
            return ret;
        },
    },
});

module.exports = mongoose.model('User', userSchema);