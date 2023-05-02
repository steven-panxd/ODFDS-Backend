var { query } = require('express-validator');

var Utils = require('../../utils');

const validateAddressValidator = [
    query("street").exists({checkFalsy: true}).withMessage("Please input street"),
    query("city").exists({checkFalsy: true}).withMessage("Please input city"),
    query("state").exists({checkFalsy: true}).withMessage("Please input state"),
    query("zipCode").exists({checkFalsy: true}).withMessage("please input zipCode").isPostalCode("US").withMessage("Invalid U.S. zipcode"),
    Utils.validate
];

module.exports = {
    validateAddressValidator
}