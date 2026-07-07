const mongoose = require('mongoose');

const EmergencyContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name can not be more than 50 characters']
  },
  number: {
    type: String,
    required: [true, 'Please add a number'],
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum:  ['Emergency', 'Service Provider', 'Other']
  }
});

module.exports = mongoose.model('EmergencyContact', EmergencyContactSchema);

