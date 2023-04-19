var express = require('express');
var router = express.Router();
var {
    getOrderValidator,
    generateTokenValidator
} = require("./validator");
var driverOnRoute  = require("../../../mongoose/schema/driverOnRoute");

var Utils = require('../../utils');
const { OrderStatus } = require('@prisma/client');

router.get("/generateCustomerToken", generateTokenValidator, async function(req, res) {
    Utils.makeResponse(res, 200, Utils.generateCustomerToken(req.query.orderId));
});

router.get("/order", getOrderValidator, async function(req, res) {
    // if the order is already delivered, return order information only
    if (req.order.status == OrderStatus.CREATED || req.order.status == OrderStatus.ASSIGNED || req.order.status == OrderStatus.DELIVERED || req.order.status == OrderStatus.CANCELLED) {
        return Utils.makeResponse(res, 200, req.order);
    }

    // otherwise, find driver's current location as well
    const driverCurrentLocation = await Utils.getDriverOnRouteLocation(req.order.driver.id);
    if (driverCurrentLocation) {
        req.order.driver.latitude = driverCurrentLocation.latitude;
        req.order.driver.longitude = driverCurrentLocation.longitude;
    }
    Utils.makeResponse(res, 200, req.order);
});

module.exports = router;