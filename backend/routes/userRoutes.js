// backend/routes/userRoutes.js (add this if separate from auth; or merge into authRoutes)
const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth'); // Your JWT protect middleware
const User = require('../models/User');

router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password'); // Exclude password
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// In app.js or server.js: app.use('/api/users', require('./routes/userRoutes'));
module.exports = router;