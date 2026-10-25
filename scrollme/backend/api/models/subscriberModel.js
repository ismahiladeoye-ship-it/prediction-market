const mongoose = require('mongoose');

// Newsletter sign-ups from the footer form.
const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    source: { type: String, default: 'footer' },
    unsubscribedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscriber', subscriberSchema);
