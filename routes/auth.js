const router = require('express').Router();
const User = require('../models/User');
const ipCheck = require('../middleware/ipCheck');

// Register new user with face
router.post('/register', ipCheck, async (req, res) => {
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
router.get('/descriptors', ipCheck, async (req, res) => {
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

module.exports = router;
