const Product = require('../models/productModel');
const { conflict } = require('../utils/httpError');

// Atomically decrements stock for every line. A line only succeeds when enough
// stock remains, so two shoppers can never buy the last unit twice. If any line
// fails, the lines already taken are put back (MongoDB transactions need a
// replica set, so this uses compensation instead).
const reserveStock = async (lines) => {
  const taken = [];
  for (const line of lines) {
    const updated = await Product.findOneAndUpdate(
      { _id: line.productId, isActive: true, stock: { $gte: line.quantity } },
      { $inc: { stock: -line.quantity } },
      { new: true, projection: { _id: 1 } }
    );
    if (!updated) {
      await releaseStock(taken);
      throw conflict(`Not enough stock for "${line.name}"`, [{ productId: String(line.productId), field: 'quantity' }]);
    }
    taken.push(line);
  }
};

const releaseStock = async (lines) => {
  for (const line of lines) {
    await Product.updateOne({ _id: line.productId }, { $inc: { stock: line.quantity } });
  }
};

module.exports = { reserveStock, releaseStock };
