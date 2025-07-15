import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: null
  },
  magicLinks: [{
    token: String,
    expiresAt: Date,
    used: {
      type: Boolean,
      default: false
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.index({ 'magicLinks.token': 1 });

// Method to add a magic link
userSchema.methods.addMagicLink = function() {
  const token = require('crypto').randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  
  this.magicLinks.push({
    token,
    expiresAt
  });
  
  return { token, expiresAt };
};

// Method to verify a magic link
userSchema.statics.verifyMagicLink = async function(token) {
  return this.findOneAndUpdate(
    {
      'magicLinks.token': token,
      'magicLinks.expiresAt': { $gt: new Date() },
      'magicLinks.used': false
    },
    {
      $set: {
        'magicLinks.$.used': true,
        'magicLinks.$.usedAt': new Date(),
        lastLogin: new Date()
      },
      $setOnInsert: { isEmailVerified: true }
    },
    { new: true }
  );
};

const User = mongoose.model('User', userSchema);
export { User };