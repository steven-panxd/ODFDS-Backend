var express = require('express');
var router = express.Router();
var {
    getOrderValidator
} = require("./validator");
var driverOnRoute  = require("../../../mongoose/schema/driverOnRoute");

var Utils = require('../../utils');
const { OrderStatus } = require('@prisma/client');

router.get("/order", getOrderValidator, Utils.customerTokenRequired, async function(req, res) {
    // if the order is already delivered, return order information only
    if (req.order.status == OrderStatus.DELIVERED) {
        return Utils.makeResponse(res, 200, req.order);
    }

    // otherwise, find driver's current location as well
    const driverCurrentLocation = await driverOnRoute.find({ driverId: req.order.driver.id }).sort({createdAt: "desc"}).limit(1);
    req.order.driver.latitude = driverCurrentLocation.location.coordinates[1];
    req.order.driver.longitude = driverCurrentLocation.location.coordinates[0];
    Utils.makeResponse(res, 200, req.order);
});

module.exports = router;