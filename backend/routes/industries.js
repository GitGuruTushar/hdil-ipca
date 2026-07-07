const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Industry = require('../models/Industry');
const auth = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// @route   GET api/industries
// @desc    Get all industries
// @access  Public
router.get('/', async (req, res) => {
  try {
    const industries = await Industry.find().populate('owner', 'username');
    res.json(industries);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/industries/:id
// @desc    Get industry by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const industry = await Industry.findById(req.params.id).populate('owner', 'username');

    if (!industry) {
      return res.status(404).json({ msg: 'Industry not found' });
    }

    res.json(industry);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Industry not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/industries/owner/:ownerId
// @desc    Get industries by owner ID
// @access  Public
router.get('/owner/:ownerId', async (req, res) => {
  try {
    const industries = await Industry.find({ owner: req.params.ownerId }).populate('owner', 'username');

    if (!industries.length) {
      return res.status(404).json({ msg: 'No industries found for this owner' });
    }

    res.json(industries);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'No industries found for this owner' });
    }
    res.status(500).send('Server Error');
  }
});

// Helper function for uploading images to Cloudinary
const uploadImagesToCloudinary = async (files) => {
  const uploadPromises = files.map((file) =>
    cloudinary.uploader.upload(file.path, { folder: 'industries' })
  );
  const uploadResults = await Promise.all(uploadPromises);

  // Delete local files after uploading
  files.forEach((file) => fs.unlinkSync(file.path));

  return uploadResults.map((result) => result.secure_url);
};

// @route   POST api/industries
// @desc    Create an industry
// @access  Private
router.post(
  '/',
  [
    auth,
    upload.array('images', 5), // Max 5 images
    [
      check('name', 'Name is required').not().isEmpty(),
      check('description', 'Description is required').not().isEmpty(),
      check('gstInfo', 'GST information is required').not().isEmpty(),
      check('contactNumber', 'Contact number is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, description, products, materials, gstInfo, contactNumber, vacancy } = req.body;

      // Upload industry images to Cloudinary
      const images = await uploadImagesToCloudinary(req.files);

      // Parse and process products
      const parsedProducts = typeof products === 'string' ? JSON.parse(products) : products;

      const newIndustry = new Industry({
        name,
        description,
        products: parsedProducts,
        materials: typeof materials === 'string' ? JSON.parse(materials) : materials,
        gstInfo,
        contactNumber,
        vacancy: typeof vacancy === 'string' ? JSON.parse(vacancy) : vacancy,
        owner: req.user.id,
        images,
      });

      const industry = await newIndustry.save();

      res.json(industry);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/industries/:id
// @desc    Update an industry
// @access  Private
router.put(
  '/:id',
  [auth, upload.array('images', 5)],
  async (req, res) => {
    try {
      let industry = await Industry.findById(req.params.id);

      if (!industry) {
        return res.status(404).json({ msg: 'Industry not found' });
      }

      // Make sure user owns industry or is an admin
      if (industry.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(401).json({ msg: 'Not authorized' });
      }

      const { products, ...updates } = req.body;

      // Upload new images to Cloudinary if provided
      if (req.files.length > 0) {
        updates.images = await uploadImagesToCloudinary(req.files);
      }

      // Parse and update products
      updates.products = typeof products === 'string' ? JSON.parse(products) : products;

      industry = await Industry.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });

      res.json(industry);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Industry not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   DELETE api/industries/:id
// @desc    Delete an industry
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const industry = await Industry.findById(req.params.id);

    if (!industry) {
      return res.status(404).json({ msg: 'Industry not found' });
    }

    // Make sure user owns industry or is an admin
    if (industry.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await industry.remove();

    res.json({ msg: 'Industry removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Industry not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
