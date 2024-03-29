var mongoose = require('mongoose');
const { Schema } = mongoose;

const driverLocationSchema = new Schema({
    location: {
        type: {
          type: String,
          enum: ['Point'], 
        },
        coordinates: {
          type: [Number],
          index: '2dsphere'
        }
    },
    driverId: Number,
    createdAt: { 
        type: Date,
        default: Date.now 
    }
});

driverLocationSchema.index({ location: "2dsphere" });

module.exports = new mongoose.model('driverLocation', driverLocationSchema, "driverLocation");