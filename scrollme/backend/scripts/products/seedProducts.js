const Product = require('../../api/models/productModel');
const buildProducts = require('./buildProducts');

const seedProducts = async ({ reset = false, limit } = {}) => {
  if (reset) await Product.deleteMany({});
  else if (await Product.estimatedDocumentCount()) {
    console.log('Products already present, skipping (use --reset to replace them)');
    return 0;
  }
  let products = buildProducts();
  if (limit) products = products.slice(0, limit);
  const BATCH = 2000;
  for (let i = 0; i < products.length; i += BATCH) {
    await Product.insertMany(products.slice(i, i + BATCH), { ordered: false });
  }
  console.log(`${products.length} products inserted`);
  return products.length;
};

module.exports = seedProducts;
