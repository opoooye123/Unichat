const express = require('express');
const router = express.Router();
const School = require('../models/School');

router.get('/', async (req, res) => {
  try {
    const schools = await School.find({}).select('_id name');
    res.json(schools.map(s => ({ id: s._id.toString(), name: s.name })));
  } catch (err) {
    console.error('Schools error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;