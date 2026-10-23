const User = require('../../api/models/userModel');
const usersData = require('./users.json');

// Demo accounts for local development only (password: see users.json).
const seedUsers = async ({ reset = false } = {}) => {
  if (reset) await User.deleteMany({ username: { $in: usersData.map((u) => u.username) } });
  let created = 0;
  for (const data of usersData) {
    if (await User.exists({ $or: [{ username: data.username }, { email: data.email }] })) continue;
    await User.create(data); // the model hashes the password
    created += 1;
  }
  console.log(`${created} users inserted`);
  return created;
};

module.exports = seedUsers;
