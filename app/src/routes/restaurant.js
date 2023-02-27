var express = require('express');
var router = express.Router();

var utils = require('../utills');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send("restaurant api");
});

module.exports = router;
