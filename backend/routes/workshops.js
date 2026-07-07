const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Workshop = require('../models/Workshop');
const auth = require('../middleware/auth');

// @route   GET api/workshops
// @desc    Get all workshops
// @access  Public
router.get('/', async (req, res) => {
  try {
    const workshops = await Workshop.find().sort({ date: 1 }).populate('createdBy', 'username');
    res.json(workshops);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/workshops
// @desc    Create a new workshop
// @access  Private (Admin only)
router.post(
  '/',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('description', 'Description is required').not().isEmpty(),
      check('date', 'Date is required').not().isEmpty(),
      check('location', 'Location is required').not().isEmpty(),
      check('capacity', 'Capacity is required').isNumeric()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (req.user.role !== 'admin') {
        return res.status(401).json({ msg: 'Not authorized' });
      }

      const { title, description, date, location, capacity } = req.body;

      const newWorkshop = new Workshop({
        title,
        description,
        date,
        location,
        capacity,
        createdBy: req.user.id
      });

      const workshop = await newWorkshop.save();

      res.json(workshop);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/workshops/:id
// @desc    Update a workshop
// @access  Private (Admin only)
router.put('/:id', [auth, [
  check('title', 'Title is required').not().isEmpty(),
  check('description', 'Description is required').not().isEmpty(),
  check('date', 'Date is required').not().isEmpty(),
  check('location', 'Location is required').not().isEmpty(),
  check('capacity', 'Capacity is required').isNumeric()
]], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    if (req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    let workshop = await Workshop.findById(req.params.id);

    if (!workshop) {
      return res.status(404).json({ msg: 'Workshop not found' });
    }

    workshop = await Workshop.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    res.json(workshop);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Workshop not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/workshops/:id
// @desc    Delete a workshop
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    const workshop = await Workshop.findById(req.params.id);

    if (!workshop) {
      return res.status(404).json({ msg: 'Workshop not found' });
    }

    await workshop.remove();

    res.json({ msg: 'Workshop removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Workshop not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/workshops/:id/register
// @desc    Register for a workshop
// @access  Private
router.post('/:id/register', auth, async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);

    if (!workshop) {
      return res.status(404).json({ msg: 'Workshop not found' });
    }

    if (workshop.registeredUsers.includes(req.user.id)) {
      return res.status(400).json({ msg: 'User already registered' });
    }

    if (workshop.registeredUsers.length >= workshop.capacity) {
      return res.status(400).json({ msg: 'Workshop is full' });
    }

    workshop.registeredUsers.push(req.user.id);
    await workshop.save();

    res.json(workshop);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Workshop not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;

