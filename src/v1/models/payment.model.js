const mongoose = require('mongoose')
const mongooseDelete = require('mongoose-delete')

const paymentSchema = new mongoose.Schema(
  {
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender', default: null },
    order_no: { type: String, required: true },
    payment_method: { type: String },
    paid_price: { type: Number, default: 0 },
    fee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    customer_share_amount: { type: Number, default: 0 },
    driver_share_amount: { type: Number, default: 0 },
    platfrom_share: {
      platfrom_name: {
        type: String,
        default: '',
      },
      name: {
        type: String,
        default: '',
      },
      email: {
        type: String,
        default: '',
      },
      phone: {
        type: String,
        default: '',
      },
      share_amount: { type: Number, default: 0 },
      transfer_date: { type: Date, default: Date.now },
    },
    charge_date: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['awaiting_for_payment', 'completed', 'cancel'],
      default: 'awaiting_for_payment',
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
)
paymentSchema.plugin(mongooseDelete, { overrideMethods: 'all' })

module.exports = mongoose.model('Payment', paymentSchema)
