const router = require('express').Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');

// Mark attendance (entry or exit)
router.post('/mark', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' });
    }

    // Get local date in YYYY-MM-DD format (India Time)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); 
    const now = new Date();

    // Find the LATEST record for this user (regardless of date)
    let record = await Attendance.findOne({ userId: userId.toUpperCase() }).sort({ entryTime: -1 });

    // If the latest record exists and has no exitTime, mark this scan as EXIT
    if (record && record.entryTime && !record.exitTime) {
      record.exitTime = now;
      record.status = 'present';
      await record.save();

      // Calculate hours worked
      const diff = (now - record.entryTime) / 3600000;
      return res.json({
        type: 'exit',
        time: now,
        entryTime: record.entryTime,
        hoursWorked: diff.toFixed(2),
        message: `Exit recorded! You worked ${diff.toFixed(1)} hours.`
      });
    }

    // Otherwise (no record or already has exitTime), start a NEW ENTRY
    
    // BUT FIRST: Check for 1-hour cooldown if there was a previous exit
    if (record && record.exitTime) {
      const cooldownMs = 60 * 60 * 1000; // 1 hour
      const timeSinceExit = now - new Date(record.exitTime);
      
      if (timeSinceExit < cooldownMs) {
        const minsRemaining = Math.ceil((cooldownMs - timeSinceExit) / 60000);
        return res.status(429).json({ 
          error: `Cooldown active. Please wait ${minsRemaining} minutes before marking a new entry.` 
        });
      }
    }

    record = new Attendance({
      userId: userId.toUpperCase(),
      date: today,
      entryTime: now
    });
    await record.save();
    return res.json({
      type: 'entry',
      time: now,
      message: 'Entry time recorded!'
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: get attendance logs
router.get('/logs', async (req, res) => {
  try {
    const { password, date, userId } = req.query;
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized. Invalid admin password.' });
    }

    const query = {};
    if (date) query.date = date;
    if (userId) query.userId = userId.toUpperCase();

    const logs = await Attendance.find(query).sort({ date: -1, entryTime: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all attendance logs for the last 24 hours (with names)
router.get('/today', async (req, res) => {
  try {
    const { password } = req.query;
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the 50 most recent logs (for debugging)
    const logs = await Attendance.find().sort({ entryTime: -1 }).limit(30);

    // Get user names
    const userIds = logs.map(l => l.userId);
    const users = await User.find({ userId: { $in: userIds } }, 'userId name');

    const result = logs.map(log => {
      const user = users.find(u => u.userId === log.userId);
      return {
        userId: log.userId,
        name: user ? user.name : 'Unknown',
        entryTime: log.entryTime,
        exitTime: log.exitTime,
        status: log.status,
        date: log.date
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Reset exit time for a specific record
router.post('/reset-exit', async (req, res) => {
  try {
    const { password, userId, date } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const record = await Attendance.findOne({ userId: userId.toUpperCase(), date });
    if (!record) return res.status(404).json({ error: 'Record not found' });

    record.exitTime = undefined;
    record.status = 'incomplete';
    await record.save();

    res.json({ success: true, message: `Exit time reset for ${userId}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
