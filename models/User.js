const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String, required: true },
  faceDescriptor: { type: [Number], required: true }, // 128-float array from face-api.js
  registeredAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
