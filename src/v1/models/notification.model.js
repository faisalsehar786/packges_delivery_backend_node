const mongoose = require('mongoose')
const mongooseDelete = require('mongoose-delete')

const notificationSchema = new mongoose.Schema(
  {
    user_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Admin'},
    sender_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Admin'},
    receiver_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Admin'},
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
    },
    item_id: {type: String, default: ''},
    title: {type: String, default: ''},
    type: {
      type: String,
      default: 'other',
      enum: ['goal_support', 'consent', 'other'],
    },
    body: {type: String, default: ''},
    read: {type: Boolean, default: false},
  },
  {
    timestamps: true,
  }
)
notificationSchema.plugin(mongooseDelete, {overrideMethods: 'all'})

module.exports = mongoose.model('Notification', notificationSchema)
