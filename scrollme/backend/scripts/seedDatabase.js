// Usage: npm run seed [-- --reset] [-- --limit=500] [-- --no-users]
require('dotenv').config();
const mongoose = require('mongoose');
const seedProducts = require('./products/seedProducts');
const seedUsers = require('./users/seedUsers');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const limitArg = args.find((a) => a.startsWith('--limit='));

const seedAll = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined');
  if (process.env.NODE_ENV === 'production' && !flag('force')) {
    throw new Error('Refusing to seed demo data in production (pass --force for a catalogue-only seed; demo users are never created in production)');
  }
  await mongoose.connect(uri);
  try {
    await seedProducts({ reset: flag('reset'), limit: limitArg ? Number(limitArg.split('=')[1]) : undefined });
    if (process.env.NODE_ENV !== 'production' && !flag('no-users')) await seedUsers({ reset: flag('reset') });
    console.log('All data seeded successfully');
  } finally {
    await mongoose.disconnect();
  }
};

seedAll().catch((error) => {
  console.error('Error seeding data:', error.message);
  process.exit(1);
});
