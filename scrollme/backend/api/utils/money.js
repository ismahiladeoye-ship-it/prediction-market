// All money arithmetic is done in integer minor units (cents) to avoid
// floating point drift; values are converted back only for JSON responses.
const toCents = (amount) => Math.round(Number(amount) * 100);
const fromCents = (cents) => Math.round(cents) / 100;

module.exports = { toCents, fromCents };
