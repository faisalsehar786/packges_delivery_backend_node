const mongoose = require('mongoose')
const mongooseDelete = require('mongoose-delete')

const chatSchema = new mongoose.Schema(
  {
    order_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Order'},
    tender_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Tender'},
    sender_id: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    receiver_id: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    files: [
      {
        path: {type: String, default: ''},
      }, 
    ],
    body: {type: String, default: ''},
    read: {type: Boolean, default: false},
  },
  {
    timestamps: true,
  }
)
chatSchema.plugin(mongooseDelete, {overrideMethods: 'all'})

module.exports = mongoose.model('Chat', chatSchema)
