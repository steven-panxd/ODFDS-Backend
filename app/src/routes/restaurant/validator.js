var { body, param, query } = require('express-validator');
var emailValidate = require("../../../mongoose/schema/emailValidation");

var { PrismaClient } = require('@prisma/client');
const db = new PrismaClient()

var Utils = require('../../utills');

const getRestaurantEmailCodeValidator = [
  query('email').exists().withMessage("Please input email").isEmail().withMessage("Invalid email address").custom(async value => {
    const accountExist = await db.restaurant.findFirst({where: {email: value}});
    if (accountExist) {
        return Promise.reject("Email is already taken, please try another email address");
    }

    const codeExist = await emailValidate.findOne({email: value, accountType: "Restaurant"});
    if (codeExist) {
        return Promise.reject("Code is already sent, please try again after 5 mins");
    }
  }),
  Utils.validate
]

const postRestaurantSignUpValidator = [
  body('email').exists().isEmail().withMessage("Invalid email address").custom(async value => {
    const accountExist = await db.restaurant.findFirst({where: {email: value}});
    if (accountExist) {
      return Promise.reject("Email is already taken, please try another email address");
    }
  }),
  body('password').exists().isStrongPassword({ minLength: 6, minLowercase: 1, minUppercase: 1, minSymbols: 1 }).withMessage("Invalid password, a password must contain at least 6 characters with at least 1 lowercase letter, 1 uppercase letter, and 1 symbol"),
  body('phone').exists().isMobilePhone().withMessage("Invalid phone number"),
  body('name').exists().withMessage("Please input restaurant name"),
  body('street').exists().withMessage("Please select restaurant location"),
  body('city').exists().withMessage("Please select restaurant location"),
  body('state').exists().withMessage("Please select restaurant location"),
  body('zipCode').exists().withMessage("Please select restaurant location"),
  // body('latitude').exists().withMessage("Please select restaurant location").isDecimal().withMessage('Invalid latitude'),
  // body('longtitude').exists().withMessage("Please select restaurant location").isDecimal().withMessage('Invalid longtitude'),
  body('code').exists().withMessage("Please input your email verification code").isLength({max: 6, min: 6}).withMessage("Invalid email verification code format").custom(async (value, { req }) => {
    const codeExist = await emailValidate.findOne({email: req.body.email, accountType: "Restaurant"});
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

const postRestaurantLoginValidator = [
  body('email').exists().isEmail().withMessage("Invalid email address").custom(async (value, { req }) => {
    const accountExist = await db.restaurant.findFirst({where: {email: value}});
    if (!accountExist) {
        return Promise.reject("Account does not exist");
    }
    req.user = accountExist;
    }),
    body('password').isStrongPassword({ minLength: 6, minLowercase: 1, minUppercase: 1, minSymbols: 1 }).withMessage("Invalid password, a password must contain at least 6 characters with at least 1 lowercase letter, 1 uppercase letter, and 1 symbol").custom(async (value, { req }) => {
    if(!Utils.checkPasswordHash(value, req.user.passwordHash)) {
        return Promise.reject("Incorrect password");
    };
  }),
  Utils.validate
]

const patchRestaurantProfileValidator = [
  body('phone').optional().isMobilePhone().withMessage("Invalid phone number"),
  body('name').optional(),
  body('street').optional(),
  body('city').optional(),
  body('state').optional(),
  body('zipCode').optional(),
  // body('latitude').optional().isDecimal().withMessage('Invalid latitude'),
  // body('longtitude').optional().isDecimal().withMessage('Invalid longtitude'),
  Utils.validate
]

const getRestaurantResetPasswordEmailCodeValidator = [
  query('email').exists().withMessage("Please input email").isEmail().withMessage("Invalid email address").custom(async value => {
    const accountExist = await db.restaurant.findFirst({where: {email: value}});
    if (!accountExist) {
        return Promise.reject("Restaurant account does not exist");
    }

    const codeExist = await emailValidate.findOne({email: value, accountType: "RestaurantReset"});
    if (codeExist) {
        return Promise.reject("Code is already sent, please try again after 5 mins");
    }
  }),
  Utils.validate
]

const postRestaurantResetPasswordValidator = [
  body('email').exists().isEmail().withMessage("Invalid email address").custom(async (value, { req }) => {
    const accountExist = await db.restaurant.findFirst({where: {email: value}});
    if (!accountExist) {
      return Promise.reject("Restaurant account does not exist");
    }
    req.user = accountExist;
  }),
  body('password').exists().isStrongPassword({ minLength: 6, minLowercase: 1, minUppercase: 1, minSymbols: 1 }).withMessage("Invalid password, a password must contain at least 6 characters with at least 1 lowercase letter, 1 uppercase letter, and 1 symbol"),
  body('code').exists().withMessage("Please input your email verification code").isLength({max: 6, min: 6}).withMessage("Invalid email verification code format").custom(async (value, { req }) => {
    const codeExist = await emailValidate.findOne({email: req.body.email, accountType: "RestaurantReset"});
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

const deleteRestaurantAccountValidator = [
  query("email").exists().withMessage("Please input email address").isEmail().withMessage("Invalid email address").custom(async function(value, { req }) {
      const account = await db.restaurant.findUnique({
        where: {
          email: value
        }
      });

      if (!account) {
        return Promise.reject("Restaurant account does not exist");
      }
      req.user = account;
  }),
  Utils.validate
]

const getRestaurantOrdersValidator = [
  query('page').optional().default(1).isInt().withMessage('Invalid page number').toInt(),
  query('pageSize').optional().default(10).isInt().withMessage('Invalid page size').toInt()
]

module.exports = {
    getRestaurantEmailCodeValidator,
    postRestaurantSignUpValidator,
    postRestaurantLoginValidator,
    patchRestaurantProfileValidator,
    getRestaurantResetPasswordEmailCodeValidator,
    postRestaurantResetPasswordValidator,
    deleteRestaurantAccountValidator,
    getRestaurantOrdersValidator
};
