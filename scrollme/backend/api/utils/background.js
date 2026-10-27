const { waitUntil } = require('@vercel/functions');

// Work that finishes after the response has been sent (emails). On Vercel a
// function is suspended once it replies, so the work is handed to waitUntil
// to let it complete; on an always-on server it simply keeps running.
const afterResponse = (promise) => {
  waitUntil(promise);
  return promise;
};

module.exports = { afterResponse };
