// Minimal structured (JSON lines) logger so production logs can be shipped
// and queried without an extra dependency.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

const threshold = () => LEVELS[process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info')] ?? 20;

const serialize = (value) => {
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  return value;
};

const log = (level, msg, fields = {}) => {
  if (LEVELS[level] < threshold()) return;
  const entry = { time: new Date().toISOString(), level, msg };
  for (const [k, v] of Object.entries(fields)) entry[k] = serialize(v);
  const line = JSON.stringify(entry);
  if (LEVELS[level] >= LEVELS.warn) process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
};

module.exports = {
  debug: (msg, fields) => log('debug', msg, fields),
  info: (msg, fields) => log('info', msg, fields),
  warn: (msg, fields) => log('warn', msg, fields),
  error: (msg, fields) => log('error', msg, fields),
};
