const mongoose = require('mongoose');

const AlbumSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [150, 'Title can not be more than 150 characters']
  },
  eventDate: {
    type: Date,
    required: [true, 'Please add an event date']
  },
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category can not be more than 50 characters']
  },
  items: [{
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    caption: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Album', AlbumSchema);
