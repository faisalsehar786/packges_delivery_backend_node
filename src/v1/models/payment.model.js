const mongoose = require('mongoose')
const mongooseDelete = require('mongoose-delete')

const orderSchema = new mongoose.Schema(
  {
    receiver_id: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    picker_id: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    tender_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Tender'},
    order_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Order'},
    total_price: {type: Number, default: 0},
    fee: {type: Number, default: 0},
    tax: {type: Number, default: 0},
    receiver_share: {type: Number, default: 0},
    picker_share: {type: Number, default: 0},
    charge_date: {type: Date, default: Date.now},
    status: {
      type: String,
      enum: ['published', 'processing', 'completed', 'cancelled', 'refunded'],
      default: 'published',
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
)
orderSchema.plugin(mongooseDelete, {overrideMethods: 'all'})

module.exports = mongoose.model('Order', orderSchema)
