var { body, param, query } = require('express-validator');
var emailValidate = require("../../../mongoose/schema/emailValidation");

var { PrismaClient, OrderStatus } = require('@prisma/client');
const db = new PrismaClient()

var Utils = require('../../utils');

const getRestaurantEmailCodeValidator = [
  query('email').exists({ checkFalsy: true }).withMessage("Please input email").isEmail().withMessage("Invalid email address").bail().custom(async value => {
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
  body('email').exists({ checkFalsy: true }).withMessage("Please input email").isEmail().withMessage("Invalid email address").bail().custom(async value => {
    const accountExist = await db.restaurant.findFirst({where: {email: value}});
    if (accountExist) {
      return Promise.reject("Email is already taken, please try another email address");
    }
  }),
  body('password').exists({ checkFalsy: true }).withMessage("Please input password").isStrongPassword({ minLength: 6, minLowercase: 1, minUppercase: 1, minSymbols: 1 }).withMessage("Invalid password, a password must contain at least 6 characters with at least 1 lowercase letter, 1 uppercase letter, and 1 symbol"),
  body('phone').exists({ checkFalsy: true }).withMessage("Please input phone number").isMobilePhone().withMessage("Invalid phone number"),
  body('name').exists({ checkFalsy: true }).withMessage("Please input restaurant name"),
  body('street').exists({ checkFalsy: true }).withMessage("Please select restaurant location"),
  body('city').exists({ checkFalsy: true }).withMessage("Please select restaurant location"),
  body('state').exists({ checkFalsy: true }).withMessage("Please select restaurant location"),
  body('zipCode').exists({ checkFalsy: true }).withMessage("Please select restaurant location").isPostalCode("US").withMessage("Invalid U.S. zipcode"),
  body('code').exists({ checkFalsy: true }).withMessage("Please input your email verification code").isLength({max: 6, min: 6}).withMessage("Invalid email verification code format").bail().custom(async (value, { req }) => {
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
  body('email').exists({ checkFalsy: true }).withMessage("Please input email").isEmail().withMessage("Invalid email address").bail().custom(async (value, { req }) => {
    const accountExist = await db.restaurant.findFirst({where: {email: value}});
    if (!accountExist) {
        return Promise.reject("Account does not exist");
    }
    req.user = accountExist;
    }),
    body('password').exists({ checkFalsy: true }).withMessage("Please input password").isStrongPassword({ minLength: 6, minLowercase: 1, minUppercase: 1, minSymbols: 1 }).withMessage("Invalid password, a password must contain at least 6 characters with at least 1 lowercase letter, 1 uppercase letter, and 1 symbol").bail().custom(async (value, { req }) => {
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
  body('zipCode').optional().isPostalCode("US").withMessage("Invalid U.S. zipcode"),
  // body('latitude').optional().isDecimal().withMessage('Invalid latitude'),
  // body('longtitude').optional().isDecimal().withMessage('Invalid longtitude'),
  Utils.validate
]

const getRestaurantResetPasswordEmailCodeValidator = [
  query('email').exists({ checkFalsy: true }).withMessage("Please input email").isEmail().withMessage("Invalid email address").bail().custom(async value => {
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
  body('email').exists({ checkFalsy: true }).withMessage("Please input email").isEmail().withMessage("Invalid email address").bail().custom(async (value, { req }) => {
    const accountExist = await db.restaurant.findFirst({where: {email: value}});
    if (!accountExist) {
      return Promise.reject("Restaurant account does not exist");
    }
    req.user = accountExist;
  }),
  body('password').exists({ checkFalsy: true }).withMessage("Please input password").isStrongPassword({ minLength: 6, minLowercase: 1, minUppercase: 1, minSymbols: 1 }).withMessage("Invalid password, a password must contain at least 6 characters with at least 1 lowercase letter, 1 uppercase letter, and 1 symbol"),
  body('code').exists({ checkFalsy: true }).withMessage("Please input your email verification code").isLength({max: 6, min: 6}).withMessage("Invalid email verification code format").custom(async (value, { req }) => {
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
  query("email").exists({ checkFalsy: true }).withMessage("Please input email address").isEmail().withMessage("Invalid email address").bail().custom(async function(value, { req }) {
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
  query('page').exists({ checkFalsy: true }).withMessage("Please input page number").isInt({min: 1}).withMessage("Page number must be an integer that is greater than or equal to 1").toInt(),
  query('pageSize').exists({ checkFalsy: true }).withMessage("Please input page size").isInt({min: 1}).withMessage("Page size must be an integer that is greater than or equal to 1").toInt(),
  Utils.validate
]

const getEstimatedValidator = [
  body("street").exists({ checkFalsy: true }).withMessage("Please input street"),
  body("city").exists({ checkFalsy: true }).withMessage("Please input city"),
  body("state").exists({ checkFalsy: true }).withMessage("Please input state"),
  body("zipCode").exists({ checkFalsy: true }).withMessage("Please input zip code").isPostalCode("US").withMessage("Invalid U.S. zipcode"),
  Utils.validate
]

const postDeliveryOrderValidator = [
  body("customerStreet").exists({ checkFalsy: true }).withMessage("Please input customer's street"),
  body("customerCity").exists({ checkFalsy: true }).withMessage("Please input customer's city"),
  body("customerState").exists({ checkFalsy: true }).withMessage("Please input customer's state"),
  body("customerZipCode").exists({ checkFalsy: true }).withMessage("Please input customer's zip code").isPostalCode("US").withMessage("Invalid U.S. zipcode"),
  body("customerName").exists({ checkFalsy: true }).withMessage("Please input customer's name"),
  body("customerEmail").exists({ checkFalsy: true }).withMessage("Please input customer's email address").isEmail().withMessage("Invalid customer's email address"),
  body("customerPhone").exists({ checkFalsy: true }).withMessage("Please input customer's phone number").isMobilePhone().withMessage("Invalid customer's phone number"),
  body("comment").optional(),
  Utils.validate
]

const postPayDeliveryOrderValidator = [
  body("orderId").exists({ checkFalsy: true }).withMessage("please input order id").isInt().withMessage("Invalid order id").toInt().bail().custom(async (value, { req }) => {
    //get order from db
    var order = await db.deliveryOrder.findUnique({where: {id: value}})
    if (!order) {
      return Promise.reject("Order does not exist");
    }

    if (order.restaurantId != req.user.id) {
      return Promise.reject("This is not your order");
    }

    //check order status before paying
    if (order.status != OrderStatus.CREATED){
      return Promise.reject("Invalid order status = " + order.status);
    }

    req.order = order;
  }),
  body("paymentMethodId").exists({ checkFalsy: true }).withMessage("please input stripe payment method id"),
  Utils.validate
]

const getOrderDetailValidator = [
  query("orderId").exists({ checkFalsy: true }).withMessage("Please input order id").isInt().withMessage("Invalid order id").toInt().bail().custom(async (value, { req }) => {
    const order = await db.deliveryOrder.findUnique({
      where: {
        id: value
      },
      include: {
        driver: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
            middleName: true,
            phone: true,
            email: true
          }
        },
      }
    });

    // if order does not exist
    if (!order) {
      return Promise.reject("Order does not exist");
    }

    // if the order does not belong to the restaurant
    if (req.user.id != order.restaurantId) {
      return Promise.reject("This is not your order");
    }

    req.order = order;
  }),
  Utils.validate
]

module.exports = {
    getRestaurantEmailCodeValidator,
    postRestaurantSignUpValidator,
    postRestaurantLoginValidator,
    patchRestaurantProfileValidator,
    getRestaurantResetPasswordEmailCodeValidator,
    postRestaurantResetPasswordValidator,
    deleteRestaurantAccountValidator,
    getRestaurantOrdersValidator,
    getEstimatedValidator,
    postDeliveryOrderValidator,
    getOrderDetailValidator,
    postPayDeliveryOrderValidator
};
