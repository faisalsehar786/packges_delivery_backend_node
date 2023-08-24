const mongoose = require('mongoose')
const mongooseDelete = require('mongoose-delete')

const notificationSchema = new mongoose.Schema(
  {
    admin_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null},
    sender_id: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
    receiver_id: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
    noti_type: {
      type: String,
      default: 'other',
      enum: ['tender', 'order', 'payment', 'other'],
    },
    title: {
      type: String,
      default: '',
    },
    data_object: {
     
      type: [Object], blackbox: true 
    },

    read: {type: Boolean, default: false},
  },
  {
    timestamps: true,
  }
)
notificationSchema.plugin(mongooseDelete, {overrideMethods: 'all'})

module.exports = mongoose.model('Notification', notificationSchema)
