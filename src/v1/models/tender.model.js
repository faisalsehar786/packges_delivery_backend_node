const mongoose = require('mongoose')
const mongooseDelete = require('mongoose-delete')

const tenderSchema = new mongoose.Schema(
  {
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    title: { type: String, default: '' },
    slug: { type: String, default: '' },
    deliver_to_details: { type: String, default: '' },
    description: { type: String, default: '' },
    files: [
      {
        path: { type: String, default: '' },
      },
    ],
    total_price: { type: Number, default: 0 },
    tender_variations: [
      {
        text: { type: String, default: '' },
        weight: { type: Number, default: 0 },
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 },
        created_date: { type: Date, default: Date.now },
      },
    ],
    order_awarded: [
      {
        awarded_to_driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        order_awarded_status: {
          type: String,
          enum: ['accepted', 'cancel', 'completed', 'awaiting_for_approval'],
          default: 'accepted',
        },
        created_date: { type: Date, default: Date.now },
      },
    ],
    pickup_date: { type: Date, default: Date.now },
    delivery_date: { type: Date, default: Date.now },
    order: {
      order_no: { type: String, default: '' },
      order_status: {
        type: String,
        enum: [
          'awaiting_for_payment',
          'payment_done',
          'processing',
          'on_the_way',
          'awaiting_for_approval',
          'completed',
          'cancel',
        ],
        default: 'awaiting_for_payment',
      },
      order_current_location: {
        order_address: {
          type: String,
          default: '',
        },
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number],
          default: [0, 0],
        },
      },
    },

    location_from: {
      address: {
        type: String,
        default: '',
      },
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    location_to: {
      address: {
        type: String,
        default: '',
      },
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },

    tender_status: {
      type: String,
      enum: ['published', 'accepted', 'completed', 'cancel', 'draft', 'awaiting_for_approval'],
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
tenderSchema.index({ location_from: '2dsphere' })
tenderSchema.plugin(mongooseDelete, { overrideMethods: 'all' })

module.exports = mongoose.model('Tender', tenderSchema)
