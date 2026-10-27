const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Product Schema
const ProductSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price must be a positive number'],
    },
    discounted_price: {
      type: Number,
      min: 0,
    },
    // Men, women or unisex (shown under both). See config/taxonomy.json.
    department: {
      type: String,
      enum: ['men', 'women', 'unisex'],
      index: true,
    },
    // Category within the department, e.g. "shoes-boots", and optionally a
    // subcategory within that, e.g. "trainers".
    category: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
      lowercase: true,
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
      validate: { validator: Number.isInteger, message: 'Stock must be a whole number' },
    },
    // Shop's own stock-keeping code; bulk uploads update products by SKU.
    sku: {
      type: String,
      trim: true,
      maxlength: 64,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    // All photos in display order (the first is also imageUrl).
    images: {
      type: [String],
      default: [],
    },
    brand: {
      type: String,
      trim: true,
      index: true,
    },
    weight: {
      type: Number,
      default: 0,
    },
    dimensions: {
      length: {
        type: Number,
        default: 0,
      },
      width: {
        type: Number,
        default: 0,
      },
      height: {
        type: Number,
        default: 0,
      },
    },
    material: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    // Size labels as sold, e.g. ["S", "M", "L"] or ["38", "40"]. Empty means one size.
    sizes: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    ratings: {
      averageRating: {
        type: Number,
        default: 0,
      },
      numberOfReviews: {
        type: Number,
        default: 0,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'products' }
);

ProductSchema.index({ isActive: 1, category: 1, createdAt: -1 });
ProductSchema.index({ isActive: 1, department: 1, category: 1, subcategory: 1 });
ProductSchema.index({ isActive: 1, price: 1 });
ProductSchema.index({ sku: 1 }, { unique: true, partialFilterExpression: { sku: { $type: 'string' } } });

// Middleware to update `updatedAt` before saving
ProductSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});
ProductSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

// Create and export the Product model
module.exports = mongoose.model('Product', ProductSchema);
