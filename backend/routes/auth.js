const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Register user (Admin only)
// @access  Private (Admin)
router.post(
  '/register',
  [
    auth, // Protect the route with authentication middleware
    check('username', 'Username is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check(
      'password',
      'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if the logged-in user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admins only.' });
    }

    const { username, email, password } = req.body;

    try {
      let user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({ msg: 'User already exists' });
      }

      user = new User({
        username,
        email,
        password
      });

      // Save user to database
      await user.save();

      res.status(201).json({ msg: 'User registered successfully' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);


// @route   POST api/auth/Adminregister
// @desc    Register user
// @access  Public
router.post(
  '/Adminregister',
  [
    check('username', 'Username is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check(
      'password',
      'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
      let user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({ msg: 'User already exists' });
      }

      user = new User({
        username,
        email,
        password,
        role : 'admin'
      });

      await user.save();

      const payload = {
        user: {
          id: user.id,
          role: user.role
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '1h' },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public. 
router.post( 
  '/login', 
  [
    check('email', 'Please include a valid email').isEmail(), 
    check('password', 'Password is required').exists() 
  ], 
  async (req, res) => { 
    const errors = validationResult(req); 
    if (!errors.isEmpty()) { 
      return res.status(400).json({ errors: errors.array() }); 
    } 

    const { email, password } = req.body;

    try {
      let user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(400).json({ msg: 'Invalid Credentials' });
      }

      const isMatch = await user.matchPassword(password);

      if (!isMatch) {
        return res.status(400).json({ msg: 'Invalid Credentials' });
      }

      const payload = {
        user: {
          id: user.id,
          role: user.role
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '7d' },
        (err, token) => {
          if (err) throw err;
          res.json({ token, role: user.role });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/auth/users
// @desc    Get all users (Admin only)
// @access  Private (Admin)
router.get('/users', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Access denied. Admins only.' });
  }

  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/auth/users/:id
// @desc    Delete user (Admin only)
// @access  Private (Admin)
router.delete('/users/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Access denied. Admins only.' });
  }

  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    await user.remove();
    res.json({ msg: 'User deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


module.exports = router;

// "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjc2M2RkNTY3ZjYwYTM0MmM5ZmM5NjJmIiwicm9sZSI6Im1lbWJlciJ9LCJpYXQiOjE3MzQ1OTc5NzQsImV4cCI6MTczNDYwMTU3NH0.8_lMHruy-CT0R3ymvaKhF5A67KM2J86-PKrCA8cDbK4"


// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjc2M2RkNTY3ZjYwYTM0MmM5ZmM5NjJmIiwicm9sZSI6Im1lbWJlciJ9LCJpYXQiOjE3MzQ2MjIwMDksImV4cCI6MTczNTIyNjgwOX0.10ARN4mflTmHhxJxos_IuQk8N5W1uqkn0s9SzwBl-_Y



// // admin 
//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjc3OTRkOTIwMGI5NDllZjI5MGIyNGU5Iiwicm9sZSI6ImFkbWluIn0sImlhdCI6MTczNjAwMjk2MiwiZXhwIjoxNzM2MDA2NTYyfQ.kvE_fRjy-fW-LkN8OAbGjBuTMYYLkPlYwK91Jx7hSFA