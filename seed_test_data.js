require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Attendance = require('./models/Attendance');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // 1. Create Test User
    const userId = 'TEST';
    await User.deleteOne({ userId });
    await Attendance.deleteMany({ userId });

    const testUser = new User({
      userId,
      name: 'Test Employee',
      faceDescriptor: new Array(128).fill(0) // Dummy descriptor
    });
    await testUser.save();
    console.log('Test User created');

    const logs = [
      {
        date: '2026-05-01',
        entryTime: new Date('2026-05-01T10:00:00+05:30'),
        exitTime: new Date('2026-05-01T18:00:00+05:30'),
        status: 'present'
      },
      // May 2: Absent
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

    console.log('Seed data inserted successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
