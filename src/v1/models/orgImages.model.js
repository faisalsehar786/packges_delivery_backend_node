const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");

const imagesSchema = new mongoose.Schema(
  {
    image_url: { type: String },
    images_type: {
      type: String,
      enum: ["banner", "logo"],
    },
    status: {
      type: String,
      enum: ["active", "deleted"],
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
imagesSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("OrgImages", imagesSchema);
