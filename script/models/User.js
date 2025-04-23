const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, minlength: 3, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6, select: false },
  createdAt: { type: Date, default: Date.now }
});

// 🔐 Hashaa salasana ennen tallennusta
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 🔐 Salasanan vertailu kirjautuessa
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
