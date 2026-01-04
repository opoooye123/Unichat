// backend/controllers/authController.js - Refactored to password-based auth
const User = require('../models/User');
const School = require('../models/School');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // UPDATED: Add bcrypt for password hashing

// Register with password
exports.register = async (req, res) => {
  try {
    console.log("Register BODY:", req.body);
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password required' });

    const domain = email.split('@')[1];
    const school = await School.findOne({ email_domain: domain });
    if (!school) return res.status(400).json({ message: 'Email domain not allowed' });
    const schoolId = school._id;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = await User.create({ name, email, schoolId, password: hashedPassword, verified: true }); // Set verified to true since no OTP

    // Issue JWT immediately
    const token = jwt.sign(
      { id: user._id, schoolId: user.schoolId, status: user.status },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ message: 'Registered successfully', token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login with password
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, schoolId: user.schoolId } }); // Return user data
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};