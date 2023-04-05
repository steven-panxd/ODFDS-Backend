var express = require('express');
var router = express.Router();
// Set up websocket
var expressWs = require('express-ws')(router);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


module.exports = router;
