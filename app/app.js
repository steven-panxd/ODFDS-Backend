var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var swaggerUi = require('swagger-ui-express');
var YAML = require('yamljs');
var mongoose = require('mongoose');

var indexRouter = require('./src/routes/index');
var restaurantRouter = require("./src/routes/restaurant/restaurant");
var driverRouter = require('./src/routes/driver/driver');
var commonRouter = require('./src/routes/common/common');

// connect to MongoDB
mongoose.set("strictQuery", false);
let MONGO_DB_URI;
if (process.env.MONGO_DB_USER && process.env.MONGO_DB_PASSWORD) {
  MONGO_DB_URI = `mongodb://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASSWORD}@${process.env.MONGO_DB_HOST}:${process.env.MONGO_DB_DOCKER_PORT}/`;
} else {
  MONGO_DB_URI = `mongodb://${process.env.MONGO_DB_HOST}:${process.env.MONGO_DB_DOCKER_PORT}/`;
}
mongoose.connect(MONGO_DB_URI).then(_ => {
  console.log('Connected to MongoDB');
}).catch(error => {
  console.log(error.message);
  process.exit(1);
}) ;

var app = express();

// Set up express app
app.use(cors())
app.use(express.json())
app.use(logger('dev'));
app.use(express.json());
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
app.use('/common', commonRouter)

// initiate a place to store all client websocket instances
app.set("wsClients", new Map());

module.exports = app;
