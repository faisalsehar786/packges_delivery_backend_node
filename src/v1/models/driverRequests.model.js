const mongoose = require('mongoose')
const mongooseDelete = require('mongoose-delete')

const driverRequestsSchema = new mongoose.Schema(
  {
  
    customer_id: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
    driver_id: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
    tender_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Tender', default: null},
    status: {
      type: String,
      enum: ['published','awaiting', 'accepted'],
      default: 'awaiting',
    },
  },
  {   
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
)  
driverRequestsSchema.plugin(mongooseDelete, {overrideMethods: 'all'})
module.exports = mongoose.model('driverRequests', driverRequestsSchema)
  