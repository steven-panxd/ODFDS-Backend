var mongoose = require('mongoose');
const { Schema } = mongoose;

const uploadedImageSchema = new Schema({
    name: String,
    path: String
});

module.exports = new mongoose.model('uploadedImage', uploadedImageSchema, "uploadedImage");