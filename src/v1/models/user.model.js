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
    user_type: {type: Array, default: [{role: 'customer'}, {role: 'driver'}]},
    session_id: {type: String, default: ''}, // session id that will help fetch accounts and transactions
    session_id_date: {type: Date}, // When the neonomic bank fetch session is created
    bank_id: {type: String, default: ''}, // the bank id we get from get all banks api
    bank_name: {type: String, default: ''},
    account_id: {type: String, default: ''}, // the account id we have get consent to charge
    agreement_id: {type: String}, // vipps agreement id
    bank_account: {type: String, default: ''},
    bank_connection_list: [
      {
        id: {type: String},
        iban: {type: String},
        bban: {type: String},
        accountName: {type: String},
        accountType: {type: String},
        ownerName: {type: String},
        displayName: {type: String},
        status: {
          type: String,
          enum: ['active', 'expired', 'pause'],
          default: 'active',
        },
      },
    ], // the detail account list payload for which we have consent to charge
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
