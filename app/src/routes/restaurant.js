var express = require('express');
var router = express.Router();
var { body } = require('express-validator');

var utils = require('../utills');

var { PrismaClient } = require('@prisma/client');
const db = new PrismaClient()

router.get('/', function(req, res) {
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
