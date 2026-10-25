const ContactMessage = require('../models/contactMessageModel');
const { notifyNewMessage } = require('../services/notifications');
const { notFound } = require('../utils/httpError');
const logger = require('../utils/logger');

const THANKS = "Thanks, we've got your message and will reply by email.";

const serialize = (m) => ({
  id: String(m._id),
  kind: m.kind,
  name: m.name,
  email: m.email,
  phone: m.phone || '',
  orderNumber: m.orderNumber || '',
  item: m.item || '',
  size: m.size || '',
  budget: m.budget || '',
  message: m.message,
  status: m.status,
  createdAt: m.createdAt,
  updatedAt: m.updatedAt,
});

// Public: the contact page form (questions and sourcing requests).
exports.createMessage = async (req, res) => {
  const { website, ...fields } = req.body;
  if (website) {
    // Filled-in hidden field: a bot. Answer as usual so it learns nothing.
    logger.warn('contact_spam_dropped', {});
    return res.status(201).json({ message: THANKS });
  }
  const msg = await ContactMessage.create({ ...fields, userId: req.user?._id });
  logger.info('contact_message', { messageId: String(msg._id), kind: msg.kind });
  notifyNewMessage(msg);
  return res.status(201).json({ message: THANKS });
};

// Admin → Messages.
exports.listMessages = async (req, res) => {
  const { status, page, limit } = req.validatedQuery;
  const filter = status === 'all' ? {} : { status };
  const [messages, total, counts] = await Promise.all([
    ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ContactMessage.countDocuments(filter),
    ContactMessage.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  res.json({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    counts: { new: 0, replied: 0, closed: 0, ...Object.fromEntries(counts.map((c) => [c._id, c.count])) },
    messages: messages.map(serialize),
  });
};

exports.updateMessage = async (req, res) => {
  const msg = await ContactMessage.findByIdAndUpdate(req.params.messageId, { $set: { status: req.body.status } }, { new: true }).lean();
  if (!msg) throw notFound('Message not found');
  logger.info('admin_action', { action: 'message_status', adminId: String(req.user._id), messageId: String(msg._id), status: msg.status });
  res.json({ message: 'Message updated', item: serialize(msg) });
};
