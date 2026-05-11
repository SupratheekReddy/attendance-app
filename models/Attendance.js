const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: String, required: true },        // "2026-05-11"
  entryTime: { type: Date },
  exitTime: { type: Date },
  status: { type: String, enum: ['present', 'incomplete'], default: 'incomplete' }
});

// One record per user per day
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
