const mongoose = require('mongoose')
const mongooseDelete = require('mongoose-delete')

const chatSchema = new mongoose.Schema(
  {
    tender_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Tender', default: null},
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    recepientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    messageType: {
      type: String,
      enum: ['text', 'image'],
      default: 'text',
    },
    message: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    message_date: {type: Date, default: Date.now},
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
)
chatSchema.plugin(mongooseDelete, {overrideMethods: 'all'})

module.exports = mongoose.model('Chat', chatSchema)
