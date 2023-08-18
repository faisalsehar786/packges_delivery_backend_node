const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");

const tripleTaxOrdersSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
    },
    total_amount: { type: Number },
    charge_amount: { type: Number },
    order_id: { type: Number },
    invoice_id: { type: Number },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);
tripleTaxOrdersSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("TripleTaxOrders", tripleTaxOrdersSchema);
