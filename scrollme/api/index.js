// Vercel Function: the whole API (see backend/api/serverless.js). vercel.json
// sends every /api/* request here; Express routes them as usual.
module.exports = require('../backend/api/serverless');
