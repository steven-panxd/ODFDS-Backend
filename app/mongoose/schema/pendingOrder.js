var mongoose = require('mongoose');
const { Schema } = mongoose;

const pendingOrderSchema = new Schema({
    driverId: Number,
    orderId: Number
});

module.exports = new mongoose.model('pendingOrder', pendingOrderSchema, "pendingOrder");