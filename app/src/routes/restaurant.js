var express = require('express');
var router = express.Router();
var { body, param, query } = require('express-validator');
var emailValidate = require("../../mongoose/schema/emailValidation");

var Utils = require('../utills');

var { PrismaClient } = require('@prisma/client');
const db = new PrismaClient()


// request an email verification code
router.get(
  '/emailCode', 
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
  Utils.validate,
  async function(req, res) {

    const email = req.query.email;

    const code = Utils.generateCode();
    const sent = await Utils.sendEmail(email, "Your Restaurant Account Verification Code", "<h1>"+ code +"</h1>");
    console.log(sent);
    if (!sent) {
      return Utils.makeResponse(res, 500, "Unable to sent email, please try again later");
    }

    await emailValidate.insertMany([{
      email: email,
      code: code,
      accountType: "Restaurant",
    }]);

    Utils.makeResponse(res, 200, "Code sent to your email, it will expire in 5 mins");
});


// sign up
router.post(
  '/', 
  body('email').exists().isEmail().withMessage("Invalid email address").custom(async value => {
    const accountExist = await db.restaurant.findFirst({where: {email: value}});
    if (accountExist) {
      return Promise.reject("Email is already taken, please try another email address");
    }
  }),
  body('password').exists().isStrongPassword({ minLength: 6, minLowercase: 1, minUppercase: 1, minSymbols: 1 }).withMessage("Invalid password, a password must contain at least 6 characters with at least 1 lowercase letter, 1 uppercase letter, and 1 symbol"),
  body('phone').exists().isMobilePhone().withMessage("Invalid phone number").custom(async value => {
    const accountExist = await db.restaurant.findFirst({where: {phone: value}});
    if (accountExist) {
      return Promise.reject("Phone number is already taken, please try another phone number");
    }
  }),
  body('name').exists().withMessage("Please input restaurant name"),
  body('street').exists().withMessage("Please select restaurant location"),
  body('city').exists().withMessage("Please select restaurant location"),
  body('state').exists().withMessage("Please select restaurant location"),
  body('zipCode').exists().withMessage("Please select restaurant location"),
  body('latitude').exists().withMessage("Please select restaurant location").isDecimal().withMessage('Invalid latitude'),
  body('longtitude').exists().withMessage("Please select restaurant location").isDecimal().withMessage('Invalid longtitude'),
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
  Utils.validate,
  async function(req, res) {
    const email = req.body.email;
    const password = req.body.password;
    const phone = req.body.phone;
    const name = req.body.name;
    const street = req.body.street;
    const city = req.body.city;
    const state = req.body.state;
    const zipCode = req.body.zipCode;
    const latitude = req.body.latitude;
    const longtitude = req.body.longtitude;

    await db.restaurant.create({
      data: {
        email: email,
        passwordHash: Utils.generatePasswordHash(password),
        phone: phone,
        name: name,
        street: street,
        city: city,
        state: state,
        zipCode: zipCode,
        latitude: latitude,
        longtitude: longtitude
      }
    });
    
    Utils.makeResponse(res, 200, "Restaurant account created successfully");
});


// log in
router.get(
  "/",
  query('email').exists().isEmail().withMessage("Invalid email address").custom(async (value, { req }) => {
    const accountExist = await db.restaurant.findFirst({where: {email: value}});
    if (!accountExist) {
      return Promise.reject("Account does not exist");
    }
    req.account = accountExist;
  }),
  query('password').isStrongPassword({ minLength: 6, minLowercase: 1, minUppercase: 1, minSymbols: 1 }).withMessage("Invalid password, a password must contain at least 6 characters with at least 1 lowercase letter, 1 uppercase letter, and 1 symbol").custom(async (value, { req }) => {
    if(!Utils.checkPasswordHash(value, req.account.passwordHash)) {
      return Promise.reject("Incorrect password");
    };
  }),
  Utils.validate,
  function(req, res) {
    Utils.makeResponse(res, 200, Utils.generateRestaurantToken(req.account.id));
});

// get restaurant profile
router.get(
  "/profile", 
  Utils.loginRequired, 
  function(req, res) {
    Utils.makeResponse(res, 200, req.user);
  }
);

module.exports = router;
