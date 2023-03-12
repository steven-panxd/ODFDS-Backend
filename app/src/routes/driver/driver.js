var express = require('express');
var router = express.Router();
var { getDriverEmailCodeValidator } = require("./validator");
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

module.exports = router;
