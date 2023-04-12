var mongoose = require('mongoose');
const { Schema } = mongoose;

const orderAssignHistorySchema = new Schema({
    driverId: Number,
    orderId: Number
});

module.exports = new mongoose.model('orderAssignHistory', orderAssignHistorySchema, "orderAssignHistory");