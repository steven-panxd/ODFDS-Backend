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
    if (req.order.status == OrderStatus.DELIVERED || req.order.status == OrderStatus.CANCELLED || req.order.status == OrderStatus.ASSIGNED) {
        return Utils.makeResponse(res, 200, req.order);
    }

    // otherwise, find driver's current location as well
    const driverCurrentLocation = await driverOnRoute.find({ driverId: req.order.driver.id }).sort({createdAt: "desc"}).limit(1);
    if (driverCurrentLocation) {
        req.order.driver.latitude = driverCurrentLocation[0].location.coordinates[1];
        req.order.driver.longitude = driverCurrentLocation[0].location.coordinates[0];
    }
    Utils.makeResponse(res, 200, req.order);
});

module.exports = router;