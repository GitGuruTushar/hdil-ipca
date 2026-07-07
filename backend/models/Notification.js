const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: [true, 'Please add a type'],
    maxlength: [40, 'Type can not be more than 40 characters']
  },
  title: {
    type: String,
    required: [true, 'Please add a title'],
    maxlength: [150, 'Title can not be more than 150 characters']
  },
  body: {
    type: String,
    maxlength: [500, 'Body can not be more than 500 characters']
  },
  link: {
    type: String
  },
  read: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
