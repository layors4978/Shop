const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const orderSchema = new Schema({
  //商品列表
  products: [
    {
      //商品
      product: {
        type: Object,
        required: true,
      },
      //數量
      quantity: {
        type: Number,
        required: true,
      },
    },
  ],
  user: {
    email: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
});

module.exports = mongoose.model("Order", orderSchema);
