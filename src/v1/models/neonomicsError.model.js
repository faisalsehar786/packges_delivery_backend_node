const mongoose = require("mongoose");

const neonomicsErrorSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    message: { type: String }, // error message
    timestamp: { type: Date, default: Date.now }, // error timestamp
    metadata: { type: Object }, // error metadata
  },
  {
    timeseries: {
      timeField: "timestamp", // field name for timestamp
      metaField: "metadata", // field name for metadata document
      granularity: "hours", // Default is "seconds" but we have to change it to "hours" as we do not have data for every second
    },
    autoCreate: false, // disable `autoCreate` since `timestamps` is enabled
    expireAfterSeconds: 60 * 60 * 24 * 30, // 30 days
  }
);

module.exports = mongoose.model("NeonomicsError", neonomicsErrorSchema);
