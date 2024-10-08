const mongoose = require("mongoose");

/**
 * @type {mongoose.SchemaDefinitionProperty}
 */
const orderSchema = new mongoose.Schema({
  products: [
    {
      product: { type: Object, required: true },
      quantity: {
        type: Number,
        required: true,
      },
    },
  ],
  user: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    email: {
      type: String,
      required: true,
    },
  },
});

module.exports = mongoose.model("Order", orderSchema);
