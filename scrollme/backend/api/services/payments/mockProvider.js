const crypto = require('node:crypto');
const { getConfig } = require('../../config/env');

// Development/test-only provider: sends the shopper to a local page that
// simulates a successful card payment. Refused in production by config.
const createCheckout = async (order) => {
  const sessionId = `mock_${crypto.randomBytes(8).toString('hex')}`;
  return { sessionId, url: `${getConfig().APP_URL}/checkout/mock?order=${order._id}` };
};

const getSessionStatus = async () => ({ paid: false });

module.exports = { name: 'mock', createCheckout, getSessionStatus };
