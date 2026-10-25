const mongoose = require('mongoose');

// A message from the contact page: a general question or a sourcing request
// ("find me this item"). Read and answered in Admin → Messages.
const contactMessageSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['general', 'sourcing'], default: 'general', index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: String,
    orderNumber: String,
    item: String,
    size: String,
    budget: String,
    message: { type: String, required: true },
    status: { type: String, enum: ['new', 'replied', 'closed'], default: 'new', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
