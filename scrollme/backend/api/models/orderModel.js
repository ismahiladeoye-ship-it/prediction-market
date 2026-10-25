const mongoose = require('mongoose');
const { Schema } = mongoose;

const STATUSES = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

// Allowed status changes. Anything else is rejected by the order service.
const TRANSITIONS = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['processing', 'shipped', 'cancelled', 'refunded'],
  processing: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    brand: String,
    category: String,
    imageUrl: String,
    size: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    unitPriceCents: { type: Number, required: true, min: 0 },
    lineTotalCents: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const addressSchema = new Schema(
  {
    fullName: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: String,
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    email: { type: String, required: true },
    items: { type: [orderItemSchema], validate: [(v) => v.length > 0, 'Order must contain items'] },
    shippingAddress: { type: addressSchema, required: true },
    deliveryMethod: { type: String, enum: ['standard', 'express'], required: true },
    currency: { type: String, required: true },
    amounts: {
      subtotalCents: { type: Number, required: true },
      taxCents: { type: Number, required: true },
      shippingCents: { type: Number, required: true },
      totalCents: { type: Number, required: true },
    },
    status: { type: String, enum: STATUSES, default: 'pending_payment', index: true },
    statusHistory: [
      {
        _id: false,
        status: { type: String, enum: STATUSES },
        at: { type: Date, default: Date.now },
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        note: String,
      },
    ],
    // True while this order holds stock that has been decremented on its behalf.
    stockReserved: { type: Boolean, default: false },
    reservationExpiresAt: { type: Date, index: true },
    payment: {
      provider: { type: String, enum: ['stripe', 'mock'] },
      // What the shopper chose at checkout (the provider records what was actually used).
      method: { type: String, enum: ['apple_pay', 'google_pay', 'card', 'paypal', 'klarna'] },
      status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
      sessionId: { type: String, index: true },
      attempts: { type: Number, default: 0 },
      reference: String,
      paidAt: Date,
    },
    trackingNumber: String,
    // Set when something needs a human, e.g. payment arrived after the stock was released.
    attention: String,
    // When each email about this order was sent (each goes out once).
    notifications: { confirmation: Date, ownerAlert: Date, shipped: Date, refunded: Date },
  },
  { timestamps: true }
);

// Monthly sales (order book) are selected by payment date.
orderSchema.index({ 'payment.paidAt': 1 });

orderSchema.statics.STATUSES = STATUSES;
orderSchema.statics.TRANSITIONS = TRANSITIONS;

module.exports = mongoose.model('Order', orderSchema);
