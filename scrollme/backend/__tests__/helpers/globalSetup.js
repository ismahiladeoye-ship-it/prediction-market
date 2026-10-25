const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  // Use an existing server when provided (CI service container), else start one.
  if (!process.env.TEST_MONGODB_URI) {
    const mongod = await MongoMemoryServer.create();
    global.__MONGOD__ = mongod;
    process.env.TEST_MONGODB_URI = mongod.getUri();
  }
  fs.writeFileSync(path.join(os.tmpdir(), 'scrollme-test-mongo-uri'), process.env.TEST_MONGODB_URI);
};
