const mongoose = require('mongoose');

const ServiceRatingSchema = new mongoose.Schema({
  contact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyContact',
    required: true
  },
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Please add a rating'],
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: [500, 'Comment can not be more than 500 characters']
  }
}, { timestamps: true });

// One rating per member per contact — resubmitting updates their existing rating.
ServiceRatingSchema.index({ contact: 1, member: 1 }, { unique: true });

module.exports = mongoose.model('ServiceRating', ServiceRatingSchema);
