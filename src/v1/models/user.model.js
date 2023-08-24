/* eslint-disable arrow-body-style */
const mongoose = require('mongoose')
const mongooseDelete = require('mongoose-delete')
const bcrypt = require('bcrypt')

const userSchema = new mongoose.Schema(
  {
    first_name: {type: String, default: ''},
    last_name: {type: String, default: ''},
    email: {
      type: String,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
    },
    mobile_number: {type: String, default: ''},
    birth_date: {type: String, default: Date.now},
    image: {type: String, default: ''},
    status: { 
      type: String,
      enum: ['active', 'blocked', 'pending_verification'],
      default: 'active',
    },
    current_location: {
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
        default: [0,0],
      },
    },
    user_type: {type: Array, default: [{role: 'customer'}, {role: 'driver'}]},
    push_token: {type: String},
    ip_address: {type: String, default: ''},
    access_token: {type: String, default: ''},
    refresh_token: {type: String, default: ''},
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
)

userSchema.pre('save', function (next) {
  if (!this.isModified('password')) {
    return next()
  }

  bcrypt.hash(this.password, 10, (err, hash) => {
    if (err) {
      return next(err)
    }
    this.password = hash
    next()
  })
})

userSchema.methods.checkPassword = (password, passwordHash) => {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, passwordHash, (err, same) => {
      if (err) {
        return reject(err)
      }

      resolve(same)
    })
  })
}

userSchema.virtual('fullName').get(() => `${this.firstName} ${this.lastName}`)

userSchema.plugin(mongooseDelete, {overrideMethods: 'all'})

module.exports = mongoose.model('User', userSchema)
