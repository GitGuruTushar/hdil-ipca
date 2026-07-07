const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const EmergencyContact = require('../models/EmergencyContact');
const auth = require('../middleware/auth');

// @route   GET api/emergency
// @desc    Get all emergency contacts
// @access  Public
router.get('/', async (req, res) => {
  try {
    const contacts = await EmergencyContact.find().sort({ category: 1, name: 1 });
    res.json(contacts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/emergency
// @desc    Create a new emergency contact
// @access  Private (Admin only)
router.post(
  '/',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('number', 'Number is required').not().isEmpty(),
      check('category', 'Category is required').not().isEmpty()
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

      const { name, number, category } = req.body;

      const newContact = new EmergencyContact({
        name,
        number,
        category
      });

      const contact = await newContact.save();

      res.json(contact);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/emergency/:id
// @desc    Update an emergency contact
// @access  Private (Admin only)
router.put('/:id', [auth, [
  check('name', 'Name is required').not().isEmpty(),
  check('number', 'Number is required').not().isEmpty(),
  check('category', 'Category is required').not().isEmpty()
]], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    if (req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    let contact = await EmergencyContact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ msg: 'Emergency contact not found' });
    }

    contact = await EmergencyContact.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    res.json(contact);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Emergency contact not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/emergency/:id
// @desc    Delete an emergency contact
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    const contact = await EmergencyContact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ msg: 'Emergency contact not found' });
    }

    await contact.remove();

    res.json({ msg: 'Emergency contact removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Emergency contact not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;

