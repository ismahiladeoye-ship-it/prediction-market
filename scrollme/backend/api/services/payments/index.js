const { getConfig } = require('../../config/env');
const stripeProvider = require('./stripeProvider');
const mockProvider = require('./mockProvider');

const getProvider = () => (getConfig().PAYMENT_PROVIDER === 'mock' ? mockProvider : stripeProvider);

module.exports = { getProvider, stripeProvider, mockProvider };
