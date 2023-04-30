var { query } = require('express-validator');

var Utils = require('../../utils');

const validateAddressValidator = [
    query("street").exists({checkFalsy: true}).withMessage("Please input street"),
    query("city").exists({checkFalsy: true}).withMessage("Please input city"),
    query("state").exists({checkFalsy: true}).withMessage("Please input state"),
    query("zipCode").exists({checkFalsy: true}).withMessage("please input zipCode").isInt().withMessage("Invalid zip code, it must be 5 digits").isLength({min: 5, max:5}).withMessage("Invalid zip code, it must be 5 digits"),
    Utils.validate
];

module.exports = {
    validateAddressValidator
}