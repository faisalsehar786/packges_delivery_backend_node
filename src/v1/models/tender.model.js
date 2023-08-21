const mongoose = require('mongoose')
const mongooseDelete = require('mongoose-delete')

const tenderSchema = new mongoose.Schema(
  {
    receiver_id: {type: mongoose.Schema.Types.ObjectId, ref: 'User',default: null},
    picker_id: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
    title: {type: String, default: ''},
    slug: {type: String, default: ''},
    files: [
      {
        path: {type: String, default: ''},
      },
    ],
    total_price: {type: Number, default: 0},
    pickup_date: {type: Date, default: Date.now},
    delivery_date: {type: Date, default: Date.now},
    tender_variations: [
      {
        text: {type: String, default: ''},
        weight: {type: Number, default: 0},
        width: {type: Number, default: 0},
        height: {type: Number, default: 0},
        created_date: {type: Date, default: Date.now},
      },
    ],
    location_from: {
      address: {
        type: String,
        default: '',
      },
      coordinates: {
        longitude: {type: Number, default: 0},
        latitude: {type: Number, default: 0},
      },
    },
    location_to: {
      address: {
        type: String,
        default: '',
      },
      coordinates: {
        longitude: {type: Number, default: 0},
        latitude: {type: Number, default: 0},
      },
    },

    status: {
      type: String,
      enum: ['published', 'accepted'],
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
tenderSchema.plugin(mongooseDelete, {overrideMethods: 'all'})

module.exports = mongoose.model('Tender', tenderSchema)
