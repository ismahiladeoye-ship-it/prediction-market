const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;

const ROLES = ['user', 'admin', 'super_admin'];

// User Schema Object
const UserSchema = new Schema({
  firstName: {
    type: String,
    trim: true,
    required: 'Please enter your first name',
  },
  lastName: {
    type: String,
    trim: true,
    required: 'Please enter your last name',
  },
  username: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    required: 'Please enter a username',
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    required: 'Please enter your email address',
  },
  password: {
    type: String,
    required: 'Please enter a password',
    select: false,
  },
  roles: {
    type: [{ type: String, enum: ROLES }],
    default: ['user'],
  },
  // Incremented on logout / password change; refresh tokens carrying an older
  // version are rejected, which revokes every outstanding session.
  tokenVersion: { type: Number, default: 0 },
  wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  passwordReset: {
    tokenHash: { type: String, select: false },
    expiresAt: { type: Date, select: false },
  },
  authProvider: { type: String, enum: ['password', 'google'], default: 'password' },
  // Two-factor sign-in (authenticator app); required for admins. Secrets are
  // AES-GCM encrypted (services/mfa.js); recovery codes are stored hashed.
  mfa: {
    enabled: { type: Boolean, default: false },
    enabledAt: Date,
    secret: { type: String, select: false },
    pendingSecret: { type: String, select: false },
    lastStep: { type: Number, select: false },
    recoveryCodes: { type: [String], select: false },
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, rounds);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method (requires the document to be loaded with +password)
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password || typeof candidatePassword !== 'string') return false;
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.isAdmin = function () {
  return this.roles.includes('admin') || this.roles.includes('super_admin');
};

UserSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    username: this.username,
    email: this.email,
    roles: this.roles,
    mfaEnabled: Boolean(this.mfa?.enabled),
  };
};

UserSchema.statics.ROLES = ROLES;

// Create and export the User model
module.exports = mongoose.model('User', UserSchema);
