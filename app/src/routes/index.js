var express = require('express');
var router = express.Router();
// Set up websocket
var expressWs = require('express-ws')(router);

var clients = new Set();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


router.ws('/websocket', function(ws, req) {
  ws.on('message', function message(msg) {
    clients.add(ws);
    
    console.log(req.headers.access_token);
    console.log('connected');
    ws.send(msg);
  });

  ws.on('close', function close(code, reason) {
    clients.delete(ws);
    console.log('disconnected');
  });
});

module.exports = router;
