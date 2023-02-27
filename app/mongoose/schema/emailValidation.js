var mongoose = require('mongoose');
const { Schema } = mongoose;

const emailValidationSchema = new Schema({
    email: String,
    code: String,
    accountType: String,
    createdAt: { 
        type: Date, 
        expires: 300, 
        default: Date.now 
    }
});

module.exports = mongoose.model("emailValidation", emailValidationSchema, "emailValidation");