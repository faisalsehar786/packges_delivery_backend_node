/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const mongooseDelete = require("mongoose-delete");

const organisationUserSchema = new mongoose.Schema(
  {
    first_name: { type: String, default: "" },
    last_name: { type: String, default: "" },
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      // required: true,
    },
    last_login: { type: Date, default: Date.now },
    user_type: { type: String, enum: ["admin", "manager"], default: "admin" },
    dob: { type: String, default: "" },
    mobile_number: { type: String, default: "" },
    image: { type: String, default: "" },
    ip_address: { type: String, default: "" },
    access_token: { type: String, default: "" },
    refresh_token: { type: String, default: "" },
    sports_list: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrganisationSport",
      },
    ],
    status: {
      type: String,
      enum: ["active", "blocked", "pending_verification"],
      default: "active",
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

organisationUserSchema.pre("save", function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  bcrypt.hash(this.password, 10, (err, hash) => {
    if (err) {
      return next(err);
    }
    this.password = hash;
    next();
  });
});

organisationUserSchema.methods.checkPassword = (password, passwordHash) => {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, passwordHash, (err, same) => {
      if (err) {
        return reject(err);
      }

      resolve(same);
    });
  });
};

organisationUserSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("OrganisationUser", organisationUserSchema);
