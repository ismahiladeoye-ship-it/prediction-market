const Subscriber = require('../models/subscriberModel');

// Idempotent: signing up twice is not an error and does not reveal whether
// the address was already on the list.
exports.subscribe = async (req, res) => {
  await Subscriber.updateOne({ email: req.body.email }, { $setOnInsert: { email: req.body.email }, $unset: { unsubscribedAt: 1 } }, { upsert: true });
  res.status(200).json({ message: 'Thanks for subscribing! You will hear about new drops and restocks first.' });
};

exports.listSubscribers = async (req, res) => {
  const subscribers = await Subscriber.find({ unsubscribedAt: { $exists: false } })
    .sort({ createdAt: -1 })
    .select('email createdAt -_id')
    .lean();
  res.json({ total: subscribers.length, subscribers });
};
