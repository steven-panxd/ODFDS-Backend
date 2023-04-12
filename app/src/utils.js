var crypto = require('node:crypto');
var jwt = require('jsonwebtoken');
var nodemailer = require('nodemailer');
var { validationResult } = require('express-validator');

var { PrismaClient, OrderStatus } = require('@prisma/client');
const db = new PrismaClient()

const { Client } = require("@googlemaps/google-maps-services-js");
const encodePathUtil = require("@googlemaps/google-maps-services-js/dist/util");
const googleMapsClient = new Client({});

var driverLocation = require("../mongoose/schema/driverLocation");
var driverOnRoute = require('../mongoose/schema/driverOnRoute');
var orderAssignHistory = require("../mongoose/schema/orderAssignHistory");

class Utils {
    static DriverStatus = {
        WAITTING_ORDER: 1,
        PENDING_ORDER_ACCEPTANCE: 2,
        IN_DELIVERY: 3
    }

    // make a fixed format response to the front end
    // example: {"code": 200, "data": "succeed" }
    static makeResponse(res, status_code, data) {
        res.status(status_code).json({
            "code": status_code,
            "data": data
        });
    }

    // make a fixed format websocket response to frontend
    // example: { "code": 401, "data": "Unauthorized" }
    static makeWsResponse(ws, status_code, data) {
        ws.send(JSON.stringify({
            code: status_code,
            data: data
        }));
    }

    // validate parameters
    // validation rules are set in the corresponding validator.js file
    // based on express-validator plugin
    // doc: https://express-validator.github.io/docs/
    static validate(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {  // return error message if fail validation, a fixed error message format here
            Utils.makeResponse(res, 400, {
                field: errors.array()[0]["param"],
                value: errors.array()[0]["value"] != undefined ? errors.array()[0]["value"] : null,
                message: errors.array()[0]["msg"]
            });
        } else {  // else, execute the actual function body
            next();
        }
    };

    // send an email to an email address
    // config .env file before use this
    // based on Nodemailer plugin
    // doc: https://nodemailer.com/usage/
    static async sendEmail(email, subject, htmlContent) {
        console.log("Sending email to " + email);
        return new Promise((resolve, reject) => {
            const transporter = nodemailer.createTransport({
                port: process.env.MAIL_PORT,
                host: process.env.MAIL_HOST,
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS,
                },
                secure: true,
            });

            const mailData = {
                from: process.env.MAIL_FROM,
                to: email,
                subject: subject,
                html: htmlContent,
            };

            transporter.sendMail(mailData, (error, info) => {
                if (error) {
                    console.log(error.message);
                    resolve(false);
                } else {
                    console.log('Email sent: ' + info.response);
                    resolve(true);
                }
            });
        });
    }

    // generate a SHA-2 hash from a plaintext password
    static generatePasswordHash(raw_password) {
        return crypto.createHmac('sha512', process.env.SECRET_KEY).update(raw_password).digest('hex');
    }

    // check plaintext password with a SHA-2 hash
    static checkPasswordHash(raw_password, passwordHash) {
        return crypto.createHmac('sha512', process.env.SECRET_KEY).update(raw_password).digest('hex') == passwordHash;
    }

    // generate a json web token for a restaurant account
    static generateRestaurantToken(restaurant_id) {
        var data = {
            type: "Restaurant",
            id: restaurant_id
        }
        return jwt.sign(data, process.env.SECRET_KEY, { expiresIn: process.env.JWT_EXPIRE_TIME });
    }

    // generate a json web token for a driver account
    static generateDriverToken(driver_id) {
        var data = {
            type: "Driver",
            id: driver_id
        }
        return jwt.sign(data, process.env.SECRET_KEY, { expiresIn: process.env.JWT_EXPIRE_TIME });
    }

    // generate a json web token for a customer to check their order status
    static generateCustomerToken(order_id) {
        var data = {
            type: "Order",
            id: order_id
        }
        return jwt.sign(data, process.env.SECRET_KEY);
    }

    // validate customer check order token
    static async customerTokenRequired(req, res, next) {
        const token = req.query.token;
        if (!token) {
            return Utils.makeResponse(res, 401, "Invalid token");
        }

        const decoded = Utils.verifyToken(token);
        if (!decoded) {
            return Utils.makeResponse(res, 401, "Invalid token");
        }

        const type = decoded.type;
        if (type != "Order") {
            return Utils.makeResponse(res, 401, "Invalid token");
        }

        const id = decoded.id;
        var order;
        order = await db.deliveryOrder.findUnique({
            where: { id: id },
            include: {
                driver: {
                    select: {
                        id: true,
                        lastName: true,
                        firstName: true,
                        middleName: true,
                        phone: true,
                        email: true
                    }
                },
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        street: true,
                        city: true,
                        state: true,
                        zipCode: true,
                        phone: true,
                        email: true
                    }
                }
            },
        })

        // if no order found from the database
        if (!order) {
            return Utils.makeResponse(res, 401, "Invalid json web token");
        }

        req.order = order;
        next()
    }

    // decode/verify a json web token, return null if error, otherwise, return original data
    static verifyToken(token) {
        try {
            var decoded = jwt.verify(token, process.env.SECRET_KEY);
        } catch (err) {
            return null;
        }

        return decoded;
    }

    // generate a 6-digit random code
    static generateCode() {
        return ("" + Math.random()).substring(2, 8);
    }

    // exclude fields (keys) from a prisma database query set
    // source: https://www.prisma.io/docs/concepts/components/prisma-client/excluding-fields
    static exclude(model, keys) {
        for (let key of keys) {
            delete model[key]
        }
        return model
    }

    static async restaurantLoginRequired(req, res, next) {
        return Utils.loginRequired(req, res, next, "Restaurant");
    }

    static async driverLoginRequired(req, res, next) {
        return Utils.loginRequired(req, res, next, "Driver");
    }

    // login required for an interface
    // put it before validatiors
    // access req.user to get user info queried from database
    static async loginRequired(req, res, next, accountType) {
        const access_token = req.headers.access_token;
        if (!access_token) {
            return Utils.makeResponse(res, 401, "Please log in");
        }

        const decoded = Utils.verifyToken(access_token);
        if (!decoded) {
            return Utils.makeResponse(res, 401, "Please log in");
        }

        const type = decoded.type;
        if (type != accountType) {
            return Utils.makeResponse(res, 401, "Please log in as a " + accountType);
        }

        const id = decoded.id;
        var user;
        if (type == "Restaurant") {
            user = await db.restaurant.findUnique({ where: { id: id } });
        } else if (type == "Driver") {
            user = await db.driver.findUnique({ where: { id: id } });
        } else {
            return Utils.makeResponse(res, 401, "Invalid json web token");
        }

        // if no user found from the database
        if (!user) {
            return Utils.makeResponse(res, 401, "Invalid json web token");
        }

        user = Utils.exclude(user, ["passwordHash"]);  // exclude password hash from the db query set
        req.user = user;
        next();
    }

    static async restaurantloginRequiredWs(req, ws) {
        return Utils.loginRequiredWs(req, ws, "Restaurant");
    }

    static async driverloginRequiredWs(req, ws) {
        return Utils.loginRequiredWs(req, ws, "Driver");
    }

    // authentication function for websocket
    // return error message to frontend if failed, and ws.user is undefined
    // otherwise, ws.user has the corresponding user information from database
    static async loginRequiredWs(req, ws, accountType) {
        const access_token = req.query.access_token;
        if (!access_token) {
            return Utils.makeWsResponse(ws, 401, "Please input access token");
        }

        const decoded = Utils.verifyToken(access_token);
        if (!decoded) {
            return Utils.makeWsResponse(ws, 401, "Please log in");
        }

        const type = decoded.type;
        if (type != accountType) {
            return Utils.makeWsResponse(ws, 401, "Please log in as a " + accountType);
        }

        const id = decoded.id;
        var user;
        if (type == "Restaurant") {
            user = await db.restaurant.findUnique({ where: { id: id } });
        } else if (type == "Driver") {
            user = await db.driver.findUnique({ where: { id: id } });
        } else {
            return Utils.makeWsResponse(res, 401, "Invalid json web token");
        }

        // if no user found from the database
        if (!user) {
            return Utils.makeWsResponse(res, 401, "Invalid json web token");
        }

        user = Utils.exclude(user, ["passwordHash"]);  // exclude password hash from the db query set
        req.user = user;
    }

    // test if a string is a json string
    static isJSON(str) {
        try {
            return (JSON.parse(str) && !!str);
        } catch (e) {
            return false;
        }
    }

    // convert an address to a coordinate by Google Maps API
    static async getLatLng(address, timeout = 5000) {
        let data = {
            latitude: null,
            longitude: null
        }

        await googleMapsClient.geocode({
            params: {
                address: address,
                key: process.env.GOOGLE_MAPS_API_KEY
            },
            timeout: timeout,
        }).then((r) => {
            if (r.data.status == "OK") {
                data.latitude = r.data.results[0].geometry.location.lat;
                data.longitude = r.data.results[0].geometry.location.lng;
            } else {
                console.log(r.data);
            }
        }).catch((e) => {
            console.log("Google Maps API Error: " + e.message);
            throw Error("Google Maps API Error: " + e.message);
        });

        return data;
    }

    // calculate the distance and duration between two places by Google Maps API
    static async calculateDistance(originAddr, destAddr, mode = "driving", units = "imperial", timeout = 1000) {
        let data = {
            distance: null,
            duration: null
        }

        await googleMapsClient.distancematrix({
            params: {
                key: process.env.GOOGLE_MAPS_API_KEY,
                origins: [originAddr],
                destinations: [destAddr],
                mode: mode,
                units: units
            },
            timeout: timeout,
        }).then((r) => {
            if (r.data.status == "OK") {
                data.distance = r.data.rows[0].elements[0].distance ? r.data.rows[0].elements[0].distance.value : null;
                data.duration = r.data.rows[0].elements[0].duration ? r.data.rows[0].elements[0].duration.value : null;
            } else {
                console.log(r.data);
            }
        }).catch((e) => {
            console.log(e);
        });

        return data;
    }

    // encode a sequence of coordinates to a trace string
    static encodeCoordinates(coordinates) {
        if (coordinates.length == 0) {
            return ""
        }

        return encodePathUtil.encodePath(coordinates);
    }

    // find nearest driver to a restaurant by Gooogle Maps API, need restaurant information
    static async findNearestDriver(restaurant, excludeDriverIds) {
        const address = restaurant.street + ", " + restaurant.city + ", " + restaurant.state + ", " + restaurant.zipCode;
        let addressLatLong = await Utils.getLatLng(address);

        // find top 5 nearest drivers by MongoDB GeoLocation (straight-line distance)
        const nearDrivers = await driverLocation.find({
            driverId: {
                $nin: excludeDriverIds
            },
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [addressLatLong.longitude, addressLatLong.latitude]
                    }
                }
            }
        }).limit(5);

        // No drivers avalible, return null
        if (nearDrivers.length == 0) {
            return null;
        }

        // use these two parameters to find the nearest driver by Google Maps API
        let nearestDriverId;
        let nearestDriverDistance = Infinity;
        let nearestDriverLatitude;
        let nearestDriverLongitude;
        // Only one driver is avaliable, return that driver
        if (nearDrivers.length == 1) {
            nearestDriverId = nearDrivers[0].driverId;
            nearestDriverLatitude = nearDrivers[0].location.coordinates[1];
            nearestDriverLongitude = nearDrivers[0].location.coordinates[0];
        } else {
            // multiple drivers are avaliable, find and return the cloest driver by Google Maps API
            const restaurantCoordinate = addressLatLong.latitude + ", " + addressLatLong.longitude;  // this is a constant
            for (let i = 0; i < nearDrivers.length; i++) {
                const driverCoordinate = nearDrivers[i].location.coordinates[1] + ", " + nearDrivers[i].location.coordinates[0]
                const result = await Utils.calculateDistance(restaurantCoordinate, driverCoordinate);
                if (result.distance < nearestDriverDistance) {
                    nearestDriverId = nearDrivers[i].driverId;
                    nearestDriverLatitude = nearDrivers[i].location.coordinates[1];
                    nearestDriverLongitude = nearDrivers[i].location.coordinates[0];
                    nearestDriverDistance = result.distance;
                }
            }
        }

        // find the nearest driver info from the MySQL Database
        const driver = await db.driver.findUnique({
            where: {
                id: nearestDriverId
            }
        });

        driver.latitude = nearestDriverLatitude;
        driver.longitude = nearestDriverLongitude;

        return driver;
    }

    // return true if the input if a number
    // source: https://stackoverflow.com/questions/20169217/how-to-write-isnumber-in-javascript
    static isNumeric(input) {
        const temp = Number.parseFloat(input);
        return typeof temp === 'number' && isFinite(temp);
    }

    // parse a number from a string
    static parseNumber(input) {
        return Number.parseFloat(input);
    }

    /**
     * Round half up ('round half towards positive infinity')
     * Negative numbers round differently than positive numbers.
     */
    // source: https://stackoverflow.com/questions/11832914/how-to-round-to-at-most-2-decimal-places-if-necessary
    static roundHalfUp(num, decimalPlaces = 0) {
        num = Math.round(num + "e" + decimalPlaces);
        return Number(num + "e" + -decimalPlaces);
    }

    // The cost is based on distance and time (like how a taxi works) with a minimum cost of $5 (first mile is free) with subsequent mile is $2/mile.
    static calculatePrice(distanceInMeters) {
        const distanceInMiles = distanceInMeters * 0.000621371192;  // convert meters to miles
        if (distanceInMiles < 1) {
            return 5;
        } else {
            const result = ((distanceInMiles - 1) * 2) + 5;
            return Utils.roundHalfUp(result, 2);  // round to 2 decimals
        }
    }

    // check driver status
    static async checkDriverStatus(req, driverWs, driverId) {
        const pendingAcceptOrders = await db.deliveryOrder.findFirst({
            where: {
                driverId: driverId,
                status: OrderStatus.ASSIGNED
            },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        street: true,
                        city: true,
                        state: true,
                        zipCode: true,
                        phone: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        // if the driver has pending acceptance order
        if (pendingAcceptOrders) {
            return await Utils.assignPendingAcceptanceOrderToDriver(req, driverWs, driverId, pendingAcceptOrders);
        }

        const inPickUpOrders = await db.deliveryOrder.findFirst({
            where: {
                driverId: driverId,
                status: OrderStatus.ACCEPTED
            },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        street: true,
                        city: true,
                        state: true,
                        zipCode: true,
                        phone: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        // if the driver has accepted in delivery order
        if (inPickUpOrders) {
            return await Utils.assignInPickUpOrderToDriver(req, driverWs, driverId, inPickUpOrders);
        }

        const inDeliveryOrders = await db.deliveryOrder.findFirst({
            where: {
                driverId: driverId,
                status: OrderStatus.PICKEDUP
            },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        street: true,
                        city: true,
                        state: true,
                        zipCode: true,
                        phone: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        // if the driver has accepted in delivery order
        if (inDeliveryOrders) {
            return await Utils.assignInDeliveryOrderToDriver(req, driverWs, driverId, inDeliveryOrders);
        }

        // otherwise, the driver does not have in process order
        await Utils.removeDriverFromAnyOrder(driverWs, driverId);
    }

    static async updateDriverLocation(driverWs, driverId, latitude, longitude) {
        if (driverWs.driverStatus == Utils.DriverStatus.WAITTING_ORDER) {
            // update driver location on MongoDB database (no pending orders)
            await driverLocation.findOneAndUpdate({
                driverId: driverId
            }, {
                location: {
                    type: "Point",
                    coordinates: [longitude, latitude]
                }
            }, { upsert: true });
        } else if (driverWs.driverStatus == Utils.DriverStatus.PENDING_ORDER_ACCEPTANCE) {
            // update & replace driver location on MongoDB database (has pending orders)
            await driverOnRoute.findOneAndUpdate({
                driverId: driverId
            }, {
                location: {
                    type: "Point",
                    coordinates: [longitude, latitude]
                }
            }, { upsert: true });
        } else if (driverWs.driverStatus == Utils.DriverStatus.IN_DELIVERY) {
            // append driver location on MongoDB database (in delivery process)
            await driverOnRoute.create({
                driverId: driverId,
                location: {
                    type: "Point",
                    coordinates: [longitude, latitude]
                }
            });
        }
        Utils.makeWsResponse(driverWs, 200, "Succeed");
    }

    static async assignPendingAcceptanceOrderToDriver(req, driverWs, driverId, order) {
        await driverLocation.deleteOne({
            driverId: driverId
        });
        driverWs.driverStatus = Utils.DriverStatus.PENDING_ORDER_ACCEPTANCE;
        await orderAssignHistory.create({
            driverId: driverId,
            orderId: order.id
        });

        // reassign the order if driver does not accept in 2 mins
        driverWs.timer = setTimeout(() => {
            Utils.driverTimeoutOrder(req, driverWs, driverId, order);
        }, 120000);

        Utils.makeWsResponse(driverWs, 201, order)
    }

    static async assignInPickUpOrderToDriver(req, driverWs, driverId, order) {
        driverWs.driverStatus = Utils.DriverStatus.IN_DELIVERY;
        Utils.makeWsResponse(driverWs, 204, order)
    }

    static async assignInDeliveryOrderToDriver(req, driverWs, driverId, order) {
        driverWs.driverStatus = Utils.DriverStatus.IN_DELIVERY;
        Utils.makeWsResponse(driverWs, 205, order)
    }

    static async reAssignOrder(req, order) {
        // drivers that was assigned to this order or rejected this order, need to be excluded
        let assignedDriverIds = [];
        const rawData = await orderAssignHistory.find({ orderId: order.id }).select({ _id: 0, driverId: 1 });
        rawData.map(obj => { assignedDriverIds.push(obj.driverId) });

        const restaurant = await db.restaurant.findUnique({ where: { id: order.restaurantId } });
        const nearestDriver = await Utils.findNearestDriver(restaurant, assignedDriverIds);

        // if no drivers avaliable, cancel this order
        if (!nearestDriver) {
            await Utils.cancelOrder(order);
            return;
        }

        // otherwise, assign this order to the new driver
        order = await db.deliveryOrder.update({
            where: {
                id: order.id
            },
            data: {
                driverId: nearestDriver.id
            },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        street: true,
                        city: true,
                        state: true,
                        zipCode: true,
                        phone: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        const newDriverWs = Utils.getDriverWsClient(req, nearestDriver.id);
        await Utils.assignPendingAcceptanceOrderToDriver(req, newDriverWs, nearestDriver.id, order);
    }

    static async removeDriverFromAnyOrder(driverWs, driverId) {
        await driverOnRoute.deleteMany({
            driverId: driverId
        });
        driverWs.driverStatus = Utils.DriverStatus.WAITTING_ORDER;
    }

    static async driverAcceptOrder(req, driverWs, driverId, order) {
        // clear reassign order timer
        clearTimeout(driverWs.timer);

        // set order status to accepted
        order = await db.deliveryOrder.update({
            where: {
                id: order.id
            },
            data: {
                status: OrderStatus.ACCEPTED
            },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        street: true,
                        city: true,
                        state: true,
                        zipCode: true,
                        phone: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        // remove all order assignment history
        await orderAssignHistory.deleteMany({
            orderId: order.id
        });

        await Utils.assignInPickUpOrderToDriver(req, driverWs, driverId, order);
    }

    static async driverRejectOrder(req, oldDriverWs, oldDriverId, order) {
        // clear reassign order timer
        clearTimeout(oldDriverWs.timer);

        // reassign order to a new driver, clean old driver records, notify the old driver
        await Utils.reAssignOrder(req, order);
        await Utils.removeDriverFromAnyOrder(oldDriverWs, oldDriverId);
        Utils.makeWsResponse(oldDriverWs, 203, {
            message: "Order rejected",
            orderId: order.id
        });
    }

    static async driverPickUpOrder(req, driverWs, driverId, order) {
        order = await db.deliveryOrder.update({
            where: {
                id: order.id
            },
            data: {
                status: OrderStatus.PICKEDUP
            },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        street: true,
                        city: true,
                        state: true,
                        zipCode: true,
                        phone: true,
                        email: true
                    }
                }
            }
        });

        await Utils.sendEmail(order.customerEmail, "To Customer: Your order #" + order.id + " is picked up", "<h2> Your order is picked up by driver:" + req.user.firstName + " " + req.user.lastName + ".</h2>");
        
        await Utils.assignInDeliveryOrderToDriver(req, driverWs, driverId, order);
    }

    static async driverDeliverOrder(req, driverWs, driverId, order) {
        const rawTracePoints = await driverOnRoute.find({
            driverId: driverId
        }).sort({ createdAt: "asc" });

        let tracePoints = [];
        rawTracePoints.map(obj => {
            tracePoints.push({
                lat: obj.location.coordinates[1],
                lng: obj.location.coordinates[0]
            })
        });

        const trace = Utils.encodeCoordinates(tracePoints);

        // update order status to DELIVERED, and update trace to the order
        order = await db.deliveryOrder.update({
            where: {
                id: order.id
            },
            data: {
                status: OrderStatus.DELIVERED,
                trace: trace
            },
            include: {
                restaurant: {
                    select: {
                        email: true
                    }
                }
            }
        });

        await Utils.removeDriverFromAnyOrder(driverWs, driverId);
        await Utils.sendEmail(order.customerEmail, "To Customer: Your order #" + order.id + " is delivered", "<h2> Your order is delivered.</h2>");
        await Utils.sendEmail(order.restaurant.email, "To Restaurant: Your order #" + order.id + " is delivered", "<h2> Your order is delivered.</h2>");

        Utils.makeWsResponse(driverWs, 206, order);
    }

    static async driverTimeoutOrder(req, oldDriverWs, oldDriverId, order) {
        // clear reassign order timer
        clearTimeout(oldDriverWs.timer);

        // reassign order to a new driver, clean old driver records, notify the old driver
        await Utils.reAssignOrder(req, order);
        await Utils.removeDriverFromAnyOrder(oldDriverWs, oldDriverId);
        Utils.makeWsResponse(oldDriverWs, 202, {
            message: "Order timeout",
            orderId: order.id
        });
    }

    static async cancelOrder(order) {
        // set order status to cancelled
        await db.deliveryOrder.update({
            where: {
                id: order.id
            },
            data: {
                status: OrderStatus.CANCELLED
            }
        });

        // remove all order assign history
        await orderAssignHistory.deleteMany({
            orderId: order.id
        });

        // send email notifications to restaurant and customer
        const restaurant = await db.restaurant.findUnique({ where: { id: order.restaurantId } });
        await Utils.sendEmail(order.customerEmail, "To Customer: Your order #" + order.id + " is cancelled", "<h2> Your order is cancelled due to driver shortage.</h2>");
        await Utils.sendEmail(restaurant.email, "To Restaurant: Your order #" + order.id + " is cancelled", "<h2> Your order is cancelled due to driver shortage.</h2>");
    }

    static async getDriverOnRouteLocation(driverId) {
        let locationData = {
            latitude: null,
            longitude: null
        }

        // find the latest driver on route location
        const driverOnRouteLocation = await driverOnRoute.find({
            driverId: driverId
        }).sort({ createdAt: "desc" }).limit(1);

        // if did not find location, it's currently unavaliable (driver haven't send any location to backend after accept the order)
        if (driverOnRouteLocation.length == 0) {
            return locationData;
        }

        // else, return latest location data
        locationData.latitude = driverOnRouteLocation[0].location.coordinates[1];
        locationData.longitude = driverOnRouteLocation[0].location.coordinates[0];
        return locationData;
    }

    static getDriverWsClient(req, driverId) {
        const clients = req.app.get("wsDriverClients");
        return clients.get(driverId);
    }

    static setDriverWsClient(req, driverId, ws) {
        const clients = req.app.get("wsDriverClients");
        clients.set(driverId, ws);
    }

    static removeDriverWsClient(req, driverId) {
        const clients = req.app.get("wsDriverClients");
        clients.delete(driverId);
    }
}

module.exports = Utils;