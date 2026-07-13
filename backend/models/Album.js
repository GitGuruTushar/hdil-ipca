const mongoose = require('mongoose');
const { localizedFieldSchema } = require('../utils/localizedField');

const AlbumSchema = new mongoose.Schema({
  title: localizedFieldSchema({ required: [true, 'Please add a title'], maxlength: [150, 'Title can not be more than 150 characters'] }),
  description: localizedFieldSchema({ maxlength: [500, 'Description can not be more than 500 characters'] }),
  eventDate: {
    type: Date,
    required: [true, 'Please add an event date']
  },
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category can not be more than 50 characters']
  },
  keywords: {
    type: [String],
    default: []
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
    caption: localizedFieldSchema()
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Album', AlbumSchema);
