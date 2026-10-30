const nodemailer = require('nodemailer');
const { getConfig } = require('../config/env');
const logger = require('../utils/logger');

// Resend's SMTP server from just its API key, or any service from SMTP_URL.
const transportOptions = ({ RESEND_API_KEY, SMTP_URL }) =>
  RESEND_API_KEY ? { host: 'smtp.resend.com', port: 465, secure: true, auth: { user: 'resend', pass: RESEND_API_KEY } } : SMTP_URL;

let transport;
const getTransport = () => {
  const options = transportOptions(getConfig());
  if (!options) return null;
  if (!transport) transport = nodemailer.createTransport(options);
  return transport;
};

// Without SMTP configured, development logs the message (so reset links can be
// used locally) while production only logs that mail is not configured.
const sendMail = async ({ to, subject, text, html, replyTo }) => {
  const config = getConfig();
  const t = getTransport();
  if (!t) {
    if (config.isProd) logger.warn('mail_not_configured', { subject });
    else logger.info('mail_dev_outbox', { to, subject, text });
    return { delivered: false };
  }
  await t.sendMail({ from: config.MAIL_FROM, to, subject, text, ...(html ? { html } : {}), ...(replyTo ? { replyTo } : {}) });
  return { delivered: true };
};

module.exports = { sendMail };
