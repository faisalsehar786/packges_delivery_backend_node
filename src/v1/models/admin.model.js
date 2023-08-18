/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");
const bcrypt = require("bcrypt");

const adminSchema = new mongoose.Schema(
  {
    first_name: { type: String, default: "" },
    last_name: { type: String, default: "" },
    company: { type: String, default: "" },
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
    two_step: { type: String, default: "" },
    dob: { type: String, default: "" },
    mobile_number: { type: String, default: "" },
    communication: { type: String, enum: ["email", "phone"], default: "email" },
    image: { type: String, default: "" },
    user_type: { type: String, enum: ["admin", "manager"], default: "admin" },
    ip_address: { type: String, default: "" },
    access_token: { type: String, default: "" },
    refresh_token: { type: String, default: "" },
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

adminSchema.pre("save", function (next) {
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

adminSchema.methods.checkPassword = (password, passwordHash) => {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, passwordHash, (err, same) => {
      if (err) {
        return reject(err);
      }
      resolve(same);
    });
  });
};

adminSchema.virtual("fullName").get(() => `${this.firstName} ${this.lastName}`);

adminSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("Admin", adminSchema);
