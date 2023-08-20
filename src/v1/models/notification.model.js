const mongoose = require('mongoose')
const mongooseDelete = require('mongoose-delete')

const notificationSchema = new mongoose.Schema(
  {
    admin_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Admin'},
    sender_id: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    receiver_id: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    type: {
      type: String,
      default: 'other',
      enum: ['tender', 'order', 'payment', 'other'],
    },
    body: {
      title: {
        type: String,
        default: '',
      },
      object: {
        type: Object,
      },
    },
    read: {type: Boolean, default: false},
  },
  {
    timestamps: true,
  }
)
notificationSchema.plugin(mongooseDelete, {overrideMethods: 'all'})

module.exports = mongoose.model('Notification', notificationSchema)
