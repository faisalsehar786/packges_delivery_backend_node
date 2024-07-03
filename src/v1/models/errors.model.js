const mongoose = require('mongoose')
const mongooseDelete = require('mongoose-delete')

const errorMessageSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    error_message: { type: String },
    route: { type: String },
    status: { type: String },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
)
errorMessageSchema.plugin(mongooseDelete, { overrideMethods: 'all' })

module.exports = mongoose.model('ErrorMessage', errorMessageSchema)
