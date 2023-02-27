var express = require('express');
var router = express.Router();
var { body } = require('express-validator');

var utils = require('../utills');

var { PrismaClient } = require('@prisma/client');
const db = new PrismaClient()

router.get('/', function(req, res) {
  result = utils.send_email("steven.panxd@gmail.com", "Test Email", "<h1>this is a test email</h1>");
  console.log(result);
  res.send("restaurant api");
});

router.post('/', 
                // body('username').isEmail(),
                // body('password').isStrongPassword()
                function(req, res) {
  utils.make_response(res, 200, "ok");
});

module.exports = router;
