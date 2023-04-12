var express = require('express');
var router = express.Router();
var { getDriverEmailCodeValidator,
      postDriverSignUpValidator,
      postDriverLoginValidator,
      patchDriverProfileValidator,
      getDriverResetPasswordEmailCodeValidator,
      postDriverResetPasswordValidator,
      deleteDriverAccountValidator,
      getDriverOrdersValidator,
      updateLocationValidator
} = require("./validator");
var emailValidate = require("../../../mongoose/schema/emailValidation");
var driverLocation  = require("../../../mongoose/schema/driverLocation");

var StripeWrapper = require('./../../stripe/StripeWrapper');

var Utils = require('../../utills');

var { PrismaClient } = require('@prisma/client');
const db = new PrismaClient()

// get driver account sign up email verification code
router.get('/emailCode', getDriverEmailCodeValidator, async function(req, res) {
    const email = req.query.email;

    const code = Utils.generateCode();
    const sent = await Utils.sendEmail(email, "Your Driver Account Verification Code", "<h1>"+ code +"</h1>");
    if (!sent) {
        return Utils.makeResponse(res, 500, "Unable to sent email, please try again later");
    }

    await emailValidate.insertMany([{
        email: email,
        code: code,
        accountType: "Driver",
    }]);

    Utils.makeResponse(res, 200, "Code sent to your email, it will expire in 5 mins");
});

// sign up driver account
router.post('/', postDriverSignUpValidator, async function(req, res) {
  var result;
  try {
    result = await StripeWrapper.createDriverAccount({
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone
    });
  } catch (stripeError) {
    return Utils.makeResponse(res, 200, "Stripe Error: " + stripeError.message);
  }

  var stripeAccountId = result.id;
  await db.driver.create({
    data: {
        email: req.body.email,
        passwordHash: Utils.generatePasswordHash(req.body.password),
        phone: req.body.phone,
        driverLicenseNumber: req.body.driverLicenseNumber,
        driverLicenseImage: req.body.driverLicenseImage,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        middleName: req.body.middleName,
        stripeAccountId: stripeAccountId
    }
  });
  
  Utils.makeResponse(res, 200, "Driver account created successfully");
});

// delete driver account (dev use only)
router.delete('/', deleteDriverAccountValidator, async function(req, res) {
  await db.driver.delete({
    where: {
      id: req.user.id
    }
  });
  
  Utils.makeResponse(res, 200, "Succeed");
});


// log in driver account
router.post("/token", postDriverLoginValidator, function(req, res) {
  Utils.makeResponse(res, 200, Utils.generateDriverToken(req.user.id));
});

// get driver profile
router.get("/profile", Utils.driverLoginRequired, function(req, res) {
  Utils.makeResponse(res, 200, req.user);
});

// update driver profile
router.patch("/profile", Utils.driverLoginRequired, patchDriverProfileValidator, async function(req, res) {
  var result;
  try {
    result = await StripeWrapper.updateDriverAccount({
      firstName: req.body.firstname || req.user.firstName,
      lastName: req.body.lastName || req.user.LastName,
      email: req.body.email || req.user.email,
      stripeAccountId: req.user.stripeAccountId
    })
  } catch (stripeError) {
    return Utils.makeResponse(res, 500, "Stripe Error: " + stripeError.message);
  };

  var stripeAccountId = result.id;
  await db.driver.update({
    where: {
      id: req.user.id
    },
    data: {
      phone: req.body.phone,
      driverLicenseNumber: req.body.driverLicenseNumber,
      driverLicenseImage: req.body.driverLicenseImage,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      middleName: req.body.middleName,
      stripeAccountId: stripeAccountId //likely won't change
    }
  });

  Utils.makeResponse(res, 200, "Profile updated");
});

// get driver account reset password email verification code
router.get('/reset/emailCode', getDriverResetPasswordEmailCodeValidator, async function(req, res) {
  const email = req.query.email;

  const code = Utils.generateCode();
  const sent = await Utils.sendEmail(email, "Your Driver Account Reset Password Verification Code", "<h1>"+ code +"</h1>");
  if (!sent) {
      return Utils.makeResponse(res, 500, "Unable to sent email, please try again later");
  }

  await emailValidate.insertMany([{
      email: email,
      code: code,
      accountType: "DriverReset",
  }]);

  Utils.makeResponse(res, 200, "Code sent to your email, it will expire in 5 mins");
});

// reset password by email verification code
router.patch('/reset/password', postDriverResetPasswordValidator, async function(req, res) {
  await db.driver.update({
    where: {
      id: req.user.id
    },
    data: {
      passwordHash: Utils.generatePasswordHash(req.body.password)
    }
  });
  
  Utils.makeResponse(res, 200, "Succeed");
});

// get driver order history
router.get('/orders', getDriverOrdersValidator, Utils.driverLoginRequired, async function(req, res) {
  const page = req.query.page;
  const pageSize = req.query.pageSize;

  // calculate total page number
  const allCount = await db.deliveryOrder.count({
    orderBy: {
      id: 'desc'
    },
    where: {
      driverId: req.user.id
    }
  });
  const totalPage = Math.ceil(allCount / pageSize);

  const skip = (page - 1) * pageSize; // skip some data and get the data from current page
  const rawData = await db.deliveryOrder.findMany({
    orderBy: {
      id: 'desc'
    },
    where: {
      driverId: req.user.id
    },
    include: {
      restaurant: {
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          street: true,
          city: true,
          state: true,
          zipCode: true
        }
      }
    },
    skip: skip,
    take: pageSize
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

// driver update their current location function
router.post('/location', updateLocationValidator, Utils.driverLoginRequired, async function(req, res) {
  const lat = req.body.latitude;
  const longt = req.body.longitude;

  await driverLocation.findOneAndUpdate({
    driverId: req.user.id
  }, {
    location: {
      type: "Point",
      coordinates: [longt, lat]
    }
  }, { upsert: true });

  Utils.makeResponse(res, 200, "Succeed");
});

// driver delete location reports
router.delete('/location', Utils.driverLoginRequired, async function(req, res) {
  await driverLocation.deleteOne({
    driverId: req.user.id
  });

  Utils.makeResponse(res, 200, "Succeed");
});


// bug, reference: https://github.com/trasherdk/express-ws-original/issues/2
// client need to wait a little bit to send the first message after connectted to the websocket
router.ws('/locationWebsocket', async function(ws, req) {
  // store all driver websocket connections
  // { driverId: websocketClientInstance }
  let clients = req.app.get("wsClients");

  // authenticate user by accessToken in request
  await Utils.driverloginRequiredWs(req, ws);
  // close the websocket if authentication failed
  if (!req.user) {
    return ws.close();  // this goes to ws.on("close", () => {})
  }

  var sendMessageError = false;

  // when server receives a message from the client (frontend)
  ws.on('message', async function message(msg) {
    // validate if the message received is a json string
    if (!Utils.isJSON(msg)) {
      sendMessageError = true;
      return Utils.makeWsResponse(ws, 400, "Invalid Json String");
    }

    // validate if the message received is a valid latitude and longitude
    const jsonMsg = JSON.parse(msg);
    // if no latitude
    if(!jsonMsg.hasOwnProperty("latitude")) {
      sendMessageError = true;
      return Utils.makeWsResponse(ws, 400, "Please input latitude");
    }
    // if no longitude
    if(!jsonMsg.hasOwnProperty("longitude")) {
      sendMessageError = true;
      return Utils.makeWsResponse(ws, 400, "Please input longitude");
    }
    // if latitude is not a number
    if(!Utils.isNumeric(jsonMsg.latitude)) {
      sendMessageError = true;
      return Utils.makeWsResponse(ws, 400, "Invalid latitude");
    }
    // if longitude is not a number
    if(!Utils.isNumeric(jsonMsg.longitude)) {
      sendMessageError = true;
      return Utils.makeWsResponse(ws, 400, "Invalid longitude");
    }
    // if latitude is out of bound
    const latitude = Utils.parseNumber(jsonMsg.latitude);
    if(Math.abs(latitude) > 90) {
      sendMessageError = true;
      return Utils.makeWsResponse(ws, 400, "Invalid latitude");
    }
    // if longitude is out of bound
    const longitude = Utils.parseNumber(jsonMsg.longitude);
    if(Math.abs(longitude) > 180) {
      sendMessageError = true;
      return Utils.makeWsResponse(ws, 400, "Invalid longitude");
    }
    
    // update driver location on MongoDB database
    await driverLocation.findOneAndUpdate({
      driverId: req.user.id
    }, {
      location: {
        type: "Point",
        coordinates: [longitude, latitude]
      }
    }, { upsert: true });

    // if this is the first correctly update location request, store the client websocket instance for future use (sever may wanna send message to client)
    if(!clients.has(req.user.id)) {
      clients.set(req.user.id, ws);
    }

    if (sendMessageError) {
      return;
    }

    Utils.makeWsResponse(ws, 201, "Succeed");
  });

  // when client (frontend) disconnect with the server
  ws.on('close', async function close(code, reason) {
    if (req.user) {
      // delete the location info on mongoDB database when disconnected
      await driverLocation.deleteOne({
        driverId: req.user.id
      });
      // delete the stored client websocket instance when disconnected
      clients.delete(req.user.id);
      console.log("see you " + req.user.email);
    } else {
      console.log("see you");
    }
  });
});

module.exports = router;
