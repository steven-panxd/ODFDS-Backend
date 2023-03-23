var express = require('express');
var router = express.Router();
var { getRestaurantEmailCodeValidator, 
      postRestaurantSignUpValidator, 
      postRestaurantLoginValidator,
      patchRestaurantProfileValidator,
      getRestaurantResetPasswordEmailCodeValidator,
      postRestaurantResetPasswordValidator,
      deleteRestaurantAccountValidator,
      getRestaurantOrdersValidator,
      postDeliveryOrderValidator,
      getEstimatedValidator
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
  // const latitude = req.body.latitude;
  // const longtitude = req.body.longtitude;

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
      // latitude: latitude,
      // longtitude: longtitude
    }
  });
  
  Utils.makeResponse(res, 200, "Restaurant account created successfully");
});

// delete restaurant account (dev use only)
router.delete('/', deleteRestaurantAccountValidator, async function(req, res) {
  await db.restaurant.delete({
    where: {
      id: req.user.id
    }
  });
  
  Utils.makeResponse(res, 200, "Succeed");
});

// log in restaurant account
router.post("/token", postRestaurantLoginValidator, async function(req, res) {
  Utils.makeResponse(res, 200, Utils.generateRestaurantToken(req.user.id));
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
  // const latitude = req.body.latitude;
  // const longtitude = req.body.longtitude;

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
      // latitude: latitude,
      // longtitude: longtitude
    }
  });

  Utils.makeResponse(res, 200, "Profile updated");
});

// get restaurant account reset password email verification code
router.get('/reset/emailCode', getRestaurantResetPasswordEmailCodeValidator, async function(req, res) {
  const email = req.query.email;

  const code = Utils.generateCode();
  const sent = await Utils.sendEmail(email, "Your Restaurant Account Reset Password Verification Code", "<h1>"+ code +"</h1>");
  if (!sent) {
      return Utils.makeResponse(res, 500, "Unable to sent email, please try again later");
  }

  await emailValidate.insertMany([{
      email: email,
      code: code,
      accountType: "RestaurantReset",
  }]);

  Utils.makeResponse(res, 200, "Code sent to your email, it will expire in 5 mins");
});

// reset password by email verification code
router.patch('/reset/password', postRestaurantResetPasswordValidator, async function(req, res) {
  await db.restaurant.update({
    where: {
      id: req.user.id
    },
    data: {
      passwordHash: Utils.generatePasswordHash(req.body.password)
    }
  });
  
  Utils.makeResponse(res, 200, "Succeed");
});

// get restaurant order history
router.get('/orders', getRestaurantOrdersValidator, Utils.restaurantLoginRequired, async function(req, res) {
  const page = req.query.page;
  const pageSize = req.query.pageSize;

  // calculate total page number
  const allCount = await db.deliveryOrder.count({
    orderBy: {
      id: 'desc'
    },
    where: {
      restaurantId: req.user.id
    }
  });
  const totalPage = Math.ceil(allCount / pageSize);

  const skip = (page - 1) * pageSize; // skip some data and get the data from current page
  const rawData = await db.deliveryOrder.findMany({
    orderBy: {
      id: 'desc'
    },
    where: {
      restaurantId: req.user.id
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
      }
    },
    skip: skip,
    take: pageSize,
  });

  // remove foreign key fields
  let cleanData = [];
  rawData.forEach((model) => {
    cleanData.push(Utils.exclude(model, ["restaurantId", "driverId", "transactionId"]));
  });

  Utils.makeResponse(res, 200, {
    data: cleanData,
    pageSize: pageSize,
    totalPage: totalPage,
    page: page,
  });
});

// calculate estimated order price and delivery time?
router.get('/order/estimated', getEstimatedValidator, Utils.restaurantLoginRequired, async function(req, res) {

});

// create a new order, need assign the order to a driver?
router.post('/order', postDeliveryOrderValidator, Utils.restaurantLoginRequired, async function(req, res) {

});


module.exports = router;
