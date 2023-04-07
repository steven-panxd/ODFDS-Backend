var express = require('express');
require('express-async-errors');  // allows error handler to handle errors from async functions
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var swaggerUi = require('swagger-ui-express');
var YAML = require('yamljs');

var indexRouter = require('./src/routes/index');
var restaurantRouter = require("./src/routes/restaurant/restaurant");
var driverRouter = require('./src/routes/driver/driver');
var commonRouter = require('./src/routes/common/common');
var paymentRouter = require('./src/routes/payment/stripe');
const Utils = require('./src/utills');

var app = express();

// Set up express app
app.use(cors())
app.use(express.json())
app.use(logger('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Set up swagger apis
const swaggerRouter = express.Router();
const swaggerDocument = YAML.load('./swagger.yaml');
swaggerRouter.use('/api-docs', swaggerUi.serve);
swaggerRouter.get('/api-docs', swaggerUi.setup(swaggerDocument));
// swaggerRouter.get('/api-docs', swaggerUi.setup(swaggerDocument, { swaggerOptions: { docExpansion: "full" } }));
app.use(swaggerRouter);

// Set up other apis
app.use('/', indexRouter);
app.use('/restaurant', restaurantRouter);
app.use('/driver', driverRouter);
app.use('/common', commonRouter);
app.use('/payment', paymentRouter);

// initiate a place to store all client websocket instances
app.set("wsClients", new Map());

// Global Error Handler
app.use((err, req, res, next) => {
    // return Server Error only when the app is running under production environment
    if ("production" == process.env.NODE_ENV) {
        return Utils.makeResponse(res, 500, "Server Error");
    }
    // otherwise, return detailed error message
    Utils.makeResponse(res, 500, err.message.trim());
});

module.exports = app;
