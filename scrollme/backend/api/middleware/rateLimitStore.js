const crypto = require('node:crypto');
const mongoose = require('mongoose');

// Rate-limit counters kept in MongoDB, so every running copy of the API shares
// them. On serverless hosting (Vercel) each copy has its own memory and copies
// come and go, so counters kept in memory would let an attacker multiply the
// limits by spreading requests over copies. Counters expire on their own.
const counterSchema = new mongoose.Schema({ _id: String, hits: Number, resetAt: Date }, { versionKey: false, collection: 'ratelimits' });
counterSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });
const Counter = mongoose.models.RateLimitCounter || mongoose.model('RateLimitCounter', counterSchema);

class MongoStore {
  constructor(prefix) {
    this.prefix = prefix;
    // Tells express-rate-limit the counts are shared, not per process.
    this.localKeys = false;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  // Keys are IP addresses, emails or account ids: store a hash, not the value.
  id(key) {
    return `${this.prefix}:${crypto.createHash('sha256').update(String(key)).digest('base64url').slice(0, 32)}`;
  }

  async increment(key) {
    const now = new Date();
    const live = { $gt: ['$resetAt', now] };
    // One atomic update: count up within the current window, or start a new one.
    const doc = await Counter.collection.findOneAndUpdate(
      { _id: this.id(key) },
      [
        {
          $set: {
            hits: { $cond: [live, { $add: ['$hits', 1] }, 1] },
            resetAt: { $cond: [live, '$resetAt', new Date(now.getTime() + this.windowMs)] },
          },
        },
      ],
      { upsert: true, returnDocument: 'after' }
    );
    return { totalHits: doc.hits, resetTime: doc.resetAt };
  }

  async decrement(key) {
    await Counter.updateOne({ _id: this.id(key), resetAt: { $gt: new Date() }, hits: { $gt: 0 } }, { $inc: { hits: -1 } });
  }

  async resetKey(key) {
    await Counter.deleteOne({ _id: this.id(key) });
  }
}

module.exports = { MongoStore, Counter };
