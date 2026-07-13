const mongoose = require('mongoose');
const { localizedFieldSchema } = require('../utils/localizedField');

const EmergencyContactSchema = new mongoose.Schema({
  name: localizedFieldSchema({ required: [true, 'Please add a name'], maxlength: [50, 'Name can not be more than 50 characters'] }),
  number: {
    type: String,
    required: [true, 'Please add a number'],
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: ['Emergency', 'Park', 'Service Provider', 'Other']
  },
  note: localizedFieldSchema({ maxlength: [140, 'Note can not be more than 140 characters'] }),
  hours: localizedFieldSchema({ maxlength: [60, 'Hours can not be more than 60 characters'] }),
  available247: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('EmergencyContact', EmergencyContactSchema);

