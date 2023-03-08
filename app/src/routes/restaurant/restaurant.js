var express = require('express');
var router = express.Router();
var { getRestaurantEmailCodeValidator, 
      postRestaurantSignUpValidator, 
      postRestaurantLoginValidator,
      patchRestaurantProfileValidator
    } = require("./validator");
var emailValidate = require("../../../mongoose/schema/emailValidation");

var Utils = require('../../utills');

var { PrismaClient } = require('@prisma/client');
const db = new PrismaClient()


// get sign up restaurant email verification code
router.get('/emailCode', getRestaurantEmailCodeValidator, async function(req, res) {
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


// sign up restaurant account
router.post('/', postRestaurantSignUpValidator, async function(req, res) {
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


// log in restaurant account
router.post("/token", postRestaurantLoginValidator, function(req, res) {
  Utils.makeResponse(res, 200, Utils.generateRestaurantToken(req.account.id));
});

// get restaurant profile
router.get("/profile", Utils.restaurantLoginRequired, function(req, res) {
  Utils.makeResponse(res, 200, req.user);
});

// update restaurant profile
router.patch("/profile", Utils.restaurantLoginRequired, patchRestaurantProfileValidator, async function(req, res) {
  const phone = req.body.phone;
  const name = req.body.name;
  const street = req.body.street;
  const city = req.body.city;
  const state = req.body.state;
  const zipCode = req.body.zipCode;
  const latitude = req.body.latitude;
  const longtitude = req.body.longtitude;

  await db.restaurant.update({
    where: {
      id: req.user.id
    },
    data: {
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

  Utils.makeResponse(res, 200, "Profile updated");
});

module.exports = router;
