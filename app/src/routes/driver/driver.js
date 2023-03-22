var express = require('express');
var router = express.Router();
var { getDriverEmailCodeValidator,
      postDriverSignUpValidator,
      postDriverLoginValidator,
      patchDriverProfileValidator,
      getDriverResetPasswordEmailCodeValidator,
      postDriverResetPasswordValidator,
      deleteDriverAccountValidator,
      getDriverOrdersValidator
} = require("./validator");
var emailValidate = require("../../../mongoose/schema/emailValidation");

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
        bankAccountNumber: req.body.bankAccountNumber,
        bankRoutingNumber: req.body.bankRoutingNumber
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
      bankAccountNumber: req.body.bankAccountNumber,
      bankRoutingNumber: req.body.bankRoutingNumber
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
  const data = await db.deliveryOrder.findMany({
    orderBy: {
      id: 'desc'
    },
    where: {
      driverId: req.user.id
    },
    skip: skip,
    take: pageSize
  });

  Utils.makeResponse(res, 200, {
    data: data,
    pageSize: pageSize,
    totalPage: totalPage,
    page: page,
  });
});

module.exports = router;
