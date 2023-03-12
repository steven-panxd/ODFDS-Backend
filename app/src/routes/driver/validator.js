var { body, param, query } = require('express-validator');
var emailValidate = require("../../../mongoose/schema/emailValidation");

var { PrismaClient } = require('@prisma/client');
const db = new PrismaClient()

var Utils = require('../../utills');

const getDriverEmailCodeValidator = [
  query('email').exists().withMessage("Please input email").isEmail().withMessage("Invalid email address").custom(async value => {
    const accountExist = await db.driver.findFirst({where: {email: value}});
    if (accountExist) {
        return Promise.reject("Email is already taken, please try another email address");
    }

    const codeExist = await emailValidate.findOne({email: value, accountType: "Driver"});
    if (codeExist) {
        return Promise.reject("Code is already sent, please try again after 5 mins");
    }
  }),
  Utils.validate
]

module.exports = {
    getDriverEmailCodeValidator,
}