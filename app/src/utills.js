var crypto = require('node:crypto');
var jwt = require('jsonwebtoken');
var nodemailer = require('nodemailer');
var { validationResult } = require('express-validator');

var { PrismaClient } = require('@prisma/client');
const db = new PrismaClient()

class Utils {
    // make a fixed format response to the front end
    // example: {"code": 200, "data": "succeed" }
    static makeResponse(res, status_code, data) {
        res.status(status_code).json({
            "code": status_code,
            "data": data
        });
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
            user = await db.restaurant.findFirst({where: {id: id}});
        } else if (type == "Driver") {
            user = await db.driver.findUnique({ where: id });
        } else {
            return Utils.makeResponse(res, 401, "Invalid json web token"); 
        }
        user = Utils.exclude(user, ["passwordHash"]);  // exclude password hash from the db query set
        req.user = user;
        next();
    }
}

module.exports = Utils;