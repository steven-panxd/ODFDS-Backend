var { body, param, query } = require('express-validator');
var emailValidate = require("../../../mongoose/schema/emailValidation");

var { PrismaClient } = require('@prisma/client');
const db = new PrismaClient()

var Utils = require('../../utills');

const getDriverEmailCodeValidator = [
  query('email').exists().withMessage("Please input email").isEmail().withMessage("Invalid email address").bail().custom(async value => {
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

const postDriverSignUpValidator = [
  body('email').exists().isEmail().withMessage("Invalid email address").bail().custom(async value => {
    const accountExist = await db.driver.findFirst({where: {email: value}});
    if (accountExist) {
      return Promise.reject("Email is already taken, please try another email address");
    }
  }),
  body('password').exists().isStrongPassword({ minLength: 6, minLowercase: 1, minUppercase: 1, minSymbols: 1 }).withMessage("Invalid password, a password must contain at least 6 characters with at least 1 lowercase letter, 1 uppercase letter, and 1 symbol"),
  body('phone').exists().isMobilePhone().withMessage("Invalid phone number"),
  body('driverLicenseNumber').exists().withMessage("Please input driver license number"),
  body('driverLicenseImage').exists().withMessage('Please input driver license image url').isURL({require_tld: false}).withMessage('Invalid driver license image url'),
  body('firstName').exists().withMessage("Please input first name"),
  body('lastName').exists().withMessage("Please input last name"),
  body('middleName').optional(),
  body('bankAccountNumber').exists().withMessage("Please input bank account number"),
  body('bankRoutingNumber').exists().withMessage("Please input bank routing number"),
  body('code').exists().withMessage("Please input your email verification code").isLength({max: 6, min: 6}).withMessage("Invalid email verification code format").bail().custom(async (value, { req }) => {
    const codeExist = await emailValidate.findOne({email: req.body.email, accountType: "Driver"});
    if (!codeExist) {
      return Promise.reject("Email verification code is expired, please try to request a new one");
    }

    if (codeExist.code != value) {
      return Promise.reject("Email verification code is wrong, please try again");
    }

    await codeExist.remove();
  }),
  Utils.validate
]

const postDriverLoginValidator = [
  body('email').exists().isEmail().withMessage("Invalid email address").bail().custom(async (value, { req }) => {
    const accountExist = await db.driver.findFirst({where: {email: value}});
    if (!accountExist) {
        return Promise.reject("Account does not exist");
    }
    req.user = accountExist;
    }),
    body('password').isStrongPassword({ minLength: 6, minLowercase: 1, minUppercase: 1, minSymbols: 1 }).withMessage("Invalid password, a password must contain at least 6 characters with at least 1 lowercase letter, 1 uppercase letter, and 1 symbol").bail().custom(async (value, { req }) => {
    if(!Utils.checkPasswordHash(value, req.user.passwordHash)) {
        return Promise.reject("Incorrect password");
    };
  }),
  Utils.validate
]

const patchDriverProfileValidator = [
  body('phone').optional().isMobilePhone().withMessage("Invalid phone number"),
  body('driverLicenseNumber').optional(),
  body('driverLicenseImage').optional().isURL({require_tld: false}).withMessage('Invalid driver license image url'),
  body('firstName').optional(),
  body('lastName').optional(),
  body('middleName').optional(),
  body('bankAccountNumber').optional(),
  body('bankRoutingNumber').optional(),
  Utils.validate
]

const getDriverResetPasswordEmailCodeValidator = [
  query('email').exists().withMessage("Please input email").isEmail().withMessage("Invalid email address").bail().custom(async value => {
    const accountExist = await db.driver.findFirst({where: {email: value}});
    if (!accountExist) {
        return Promise.reject("Driver account does not exist");
    }

    const codeExist = await emailValidate.findOne({email: value, accountType: "DriverReset"});
    if (codeExist) {
        return Promise.reject("Code is already sent, please try again after 5 mins");
    }
  }),
  Utils.validate
]

const postDriverResetPasswordValidator = [
  body('email').exists().isEmail().withMessage("Invalid email address").bail().custom(async (value, { req }) => {
    const accountExist = await db.driver.findFirst({where: {email: value}});
    if (!accountExist) {
      return Promise.reject("Driver account does not exist");
    }
    req.user = accountExist;
  }),
  body('password').exists().isStrongPassword({ minLength: 6, minLowercase: 1, minUppercase: 1, minSymbols: 1 }).withMessage("Invalid password, a password must contain at least 6 characters with at least 1 lowercase letter, 1 uppercase letter, and 1 symbol"),
  body('code').exists().withMessage("Please input your email verification code").isLength({max: 6, min: 6}).withMessage("Invalid email verification code format").bail().custom(async (value, { req }) => {
    const codeExist = await emailValidate.findOne({email: req.body.email, accountType: "DriverReset"});
    if (!codeExist) {
      return Promise.reject("Email verification code is expired, please try to request a new one");
    }

    if (codeExist.code != value) {
      return Promise.reject("Email verification code is wrong, please try again");
    }

    await codeExist.remove();
  }),
  Utils.validate
]

const deleteDriverAccountValidator = [
  query("email").exists().withMessage("Please input email address").isEmail().withMessage("Invalid email address").bail().custom(async function(value, { req }) {
      const account = await db.driver.findUnique({
        where: {
          email: value
        }
      });

      if (!account) {
        return Promise.reject("Driver account does not exist");
      }
      req.user = account;
  }),
  Utils.validate
]

const getDriverOrdersValidator = [
  query('page').exists().withMessage("Please input page number").isInt({min: 1}).withMessage("Page number must be an integer that is greater than or equal to 1").toInt(),
  query('pageSize').exists().withMessage("Please input page size").isInt({min: 1}).withMessage("Page size must be an integer that is greater than or equal to 1").toInt(),
  Utils.validate
];

const updateLocationValidator = [
  body('latitude').exists().withMessage("Please input latiude").isDecimal().withMessage("Invalid latitude").bail().custom(value => {
    if (Math.abs(value) > 90) {
      throw Error("Invalid latitude");
    }
    return true;
  }),
  body('longitude').exists().withMessage("Please input longitude").isDecimal().withMessage('Invalid longitude').bail().custom(value => {
    if (Math.abs(value) > 180) {
      throw Error("Invalid longitude");
    }
    return true;
  }),
  Utils.validate
]

module.exports = {
    getDriverEmailCodeValidator,
    postDriverSignUpValidator,
    postDriverLoginValidator,
    patchDriverProfileValidator,
    getDriverResetPasswordEmailCodeValidator,
    postDriverResetPasswordValidator,
    deleteDriverAccountValidator,
    getDriverOrdersValidator,
    updateLocationValidator
}