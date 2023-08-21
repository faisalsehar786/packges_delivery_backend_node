const mongoose = require('mongoose')
const mongooseDelete = require('mongoose-delete')

const orderSchema = new mongoose.Schema(
  {
    order_no: {type: String, default: ''},
    receiver_id: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    picker_id: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    tender_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Tender'},
    payment_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Payment'},
    picker_current_location: {
      address: {
        type: String,
        default: '',
      },
      coordinates: {
        longitude: {type: Number, default: 0},
        latitude: {type: Number, default: 0},
      },
    },
    receiver_current_location: {
      address: {
        type: String,
        default: '',
      },
      coordinates: {
        longitude: {type: Number, default: 0},
        latitude: {type: Number, default: 0},
      },
    },
    order_date: {type: Date, default: Date.now},
    status: {
      type: String,
      enum: ['published', 'processing', 'completed'],
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
 