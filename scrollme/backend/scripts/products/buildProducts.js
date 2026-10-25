const raw = require('./products.json');
const generated = require('./generatedProducts.json');

// The original generator stored the brand in `category`, replaced the real
// sizes with random numbers and randomised `isActive`. This rebuilds the seed
// documents from the scraped source (products.json) and keeps only the
// generated fields that have no source equivalent (stock, material, weight...).
const splitList = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const buildProducts = () =>
  raw.map((src, i) => {
    const gen = generated[i] || {};
    const sizes = splitList(src.sizes).filter((s) => !/^one ?size$/i.test(s));
    return {
      name: src.product_name,
      description: src.meta_description || gen.description || '',
      price: src.marked_price,
      discounted_price: src.discounted_price,
      category: String(src.product_tag || 'other').toLowerCase(),
      brand: src.brand_tag,
      imageUrl: src.img_link,
      stock: Number.isInteger(gen.stock) ? gen.stock : 25,
      weight: gen.weight || 0,
      dimensions: gen.dimensions,
      material: gen.material,
      color: gen.color,
      sizes,
      tags: splitList(src.tags),
      ratings: { averageRating: Number(src.rating) || 0, numberOfReviews: Number(src.rating_count) || 0 },
      isActive: true,
      createdAt: gen.createdAt ? new Date(gen.createdAt) : new Date(),
      updatedAt: gen.updatedAt ? new Date(gen.updatedAt) : new Date(),
    };
  });

module.exports = buildProducts;
