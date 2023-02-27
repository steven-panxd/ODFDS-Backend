var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var swaggerUi = require('swagger-ui-express');
var YAML = require('yamljs');

var indexRouter = require('./src/routes/index');
var restaurantRouter = require("./src/routes/restaurant");

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
app.use(swaggerRouter);

// Set up other apis
app.use('/', indexRouter);
app.use("/restaurant", restaurantRouter);

module.exports = app;
