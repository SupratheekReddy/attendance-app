const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: String, required: true },        // "2026-05-11"
  entryTime: { type: Date },
  exitTime: { type: Date },
  status: { type: String, enum: ['present', 'incomplete'], default: 'incomplete' }
});

// Index for faster queries, but not unique to allow multiple sessions or overnight shifts
AttendanceSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('Attendance', AttendanceSchema);
