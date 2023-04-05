var crypto = require('node:crypto');
var jwt = require('jsonwebtoken');
var nodemailer = require('nodemailer');
var { validationResult } = require('express-validator');

var { PrismaClient } = require('@prisma/client');
const db = new PrismaClient()

const { Client } = require("@googlemaps/google-maps-services-js");
const googleMapsClient = new Client({});

var driverLocation  = require("../mongoose/schema/driverLocation");

class Utils {
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

    // decode/verify a json web token, return null if error, otherwise, return original data
    static verifyToken(token) {
        try {
            var decoded = jwt.verify(token, process.env.SECRET_KEY);
          } catch(err) {
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
            user = await db.restaurant.findUnique({where: {id: id}});
        } else if (type == "Driver") {
            user = await db.driver.findUnique({where: {id:id}});
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
            user = await db.restaurant.findUnique({where: {id: id}});
        } else if (type == "Driver") {
            user = await db.driver.findUnique({where: {id:id}});
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
    static async getLatLng(address, timeout = 1000) {
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
            console.log(e);
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
                data.distance = r.data.rows[0].elements[0].distance.value;
                data.duration = r.data.rows[0].elements[0].duration.value
            } else {
                console.log(r.data);
            }
        }).catch((e) => {
            console.log(e);
        });
        
        return data;
    }

    // find nearest driver to a restaurant by Gooogle Maps API, need req from a restaurant logined request
    static async findNearestDriver(req) {
        const address = req.user.street + ", " + req.user.city + ", " + req.user.state + ", " + req.user.zipCode;
        const addressLatLong = await Utils.getLatLng(address);
        
        // find top 5 nearest drivers by MongoDB GeoLocation (straight-line distance)
        const nearDrivers = await driverLocation.find({
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
        let nearestDriverId = 0
        let nearestDriverDistance = Infinity;
        // Only one driver is avaliable, return that driver
        if (nearDrivers.length == 1) {
            nearestDriverId = nearDrivers[0].driverId;
        } else {
            // multiple drivers are avaliable, find and return the cloest driver by Google Maps API
            const restaurantCoordinate = addressLatLong.latitude + ", " + addressLatLong.longitude;  // this is a constant
            for (let i = 0; i < nearDrivers.length; i++) {
                const driverCoordinate = nearDrivers[i].location.coordinates[1] + ", " + nearDrivers[i].location.coordinates[0]
                const result = await Utils.calculateDistance(restaurantCoordinate, driverCoordinate);
                if (result.distance < nearestDriverDistance) {
                    nearestDriverId = nearDrivers[i].driverId;
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
}

module.exports = Utils;