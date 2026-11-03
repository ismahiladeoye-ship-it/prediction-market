const Subscriber = require('../models/subscriberModel');

// Idempotent: signing up twice is not an error and does not reveal whether
// the address was already on the list.
exports.subscribe = async (req, res) => {
  await Subscriber.updateOne({ email: req.body.email }, { $setOnInsert: { email: req.body.email }, $unset: { unsubscribedAt: 1 } }, { upsert: true });
  res.status(200).json({ message: 'Thanks for subscribing! You will hear about new drops and restocks first.' });
};

// A page at a time, newest first, so a long list stays quick to load.
exports.listSubscribers = async (req, res) => {
  const { page, limit } = req.validatedQuery;
  const filter = { unsubscribedAt: { $exists: false } };
  const [subscribers, total] = await Promise.all([
    Subscriber.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('email createdAt -_id')
      .lean(),
    Subscriber.countDocuments(filter),
  ]);
  res.json({ page, limit, total, totalPages: Math.ceil(total / limit), subscribers });
};
