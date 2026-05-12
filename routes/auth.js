const User = require('../models/User');
const router = require('express').Router();

// Register new user with face
router.post('/register', async (req, res) => {
  try {
    const { userId, name, faceDescriptor } = req.body;

    if (!userId || !name || !faceDescriptor || faceDescriptor.length !== 128) {
      return res.status(400).json({ error: 'Invalid data. Provide userId, name, and 128-float faceDescriptor.' });
    }

    const existing = await User.findOne({ userId: userId.toUpperCase() });
    if (existing) {
      return res.status(409).json({ error: 'User ID already registered.' });
    }

    const user = new User({ userId, name, faceDescriptor });
    await user.save();
    res.json({ success: true, message: `${name} registered successfully!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all face descriptors for client-side matching
router.get('/descriptors', async (req, res) => {
  try {
    const users = await User.find({}, 'userId name faceDescriptor');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all users list
router.get('/users', async (req, res) => {
  try {
    const { password } = req.query;
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const users = await User.find({}, 'userId name registeredAt').sort({ name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete user and all their attendance logs
router.delete('/user/:userId', async (req, res) => {
  try {
    const { password } = req.query;
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId } = req.params;
    
    // 1. Delete the user
    const deletedUser = await User.findOneAndDelete({ userId: userId.toUpperCase() });
    if (!deletedUser) return res.status(404).json({ error: 'User not found' });

    // 2. Delete all their attendance records
    const Attendance = require('../models/Attendance');
    await Attendance.deleteMany({ userId: userId.toUpperCase() });

    res.json({ success: true, message: `User ${userId} and all their records deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Temporary: Seed test data for UI verification
router.get('/seed', async (req, res) => {
  try {
    const userId = 'TEST';
    const Attendance = require('../models/Attendance');
    
    // Cleanup old test data
    await User.deleteOne({ userId });
    await Attendance.deleteMany({ userId });

    // 1. Create Test User
    const testUser = new User({
      userId,
      name: 'Test Employee',
      faceDescriptor: new Array(128).fill(0)
    });
    await testUser.save();

    // 2. Create Sample Logs
    const logs = [
      {
        date: '2026-05-01',
        entryTime: new Date('2026-05-01T10:00:00+05:30'),
        exitTime: new Date('2026-05-01T18:00:00+05:30'),
        status: 'present'
      },
      {
        date: '2026-05-03',
        entryTime: new Date('2026-05-03T22:00:00+05:30'),
        exitTime: new Date('2026-05-04T06:00:00+05:30'),
        status: 'present'
      },
      {
        date: '2026-05-05',
        entryTime: new Date('2026-05-05T09:00:00+05:30'),
        exitTime: new Date('2026-05-05T17:00:00+05:30'),
        status: 'present'
      },
      {
        date: '2026-05-06',
        entryTime: new Date('2026-05-06T23:00:00+05:30'),
        exitTime: new Date('2026-05-07T08:00:00+05:30'),
        status: 'present'
      },
      {
        date: '2026-05-08',
        entryTime: new Date('2026-05-08T10:00:00+05:30'),
        status: 'incomplete'
      }
    ];

    for (const log of logs) {
      await new Attendance({ userId, ...log }).save();
    }

    res.json({ success: true, message: 'Test data for "TEST" created! You can now check it in the Admin Panel.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
