var crypto = require('node:crypto');
var jwt = require('jsonwebtoken');
var nodemailer = require('nodemailer');
var { validationResult } = require('express-validator');

var { PrismaClient } = require('@prisma/client');
const db = new PrismaClient()

class Utils {
    static makeResponse(res, status_code, data) {
        res.status(status_code).json({
            "code": status_code,
            "data": data
        });
    }

    static validate(req, res, next) {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {  // return error message if fail validation
        Utils.makeResponse(res, 400, {
            field: errors.array()[0]["param"],
            value: errors.array()[0]["value"] != undefined ? errors.array()[0]["value"] : null,
            message: errors.array()[0]["msg"]
        });
      } else {  // else, execute the actual function body
        next();
      }
    };

    static async sendEmail(email, subject, htmlContent) {
        return new Promise((resolve, reject) => {
            const transporter = nodemailer.createTransport({
                port: process.env.MAIL_PORT,               // true for 465, false for other ports
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

    static generatePasswordHash(raw_password) {
        return crypto.createHmac('sha512', process.env.SECRET_KEY).update(raw_password).digest('hex');
    }
    
    static checkPasswordHash(raw_password, passwordHash) {
        return crypto.createHmac('sha512', process.env.SECRET_KEY).update(raw_password).digest('hex') == passwordHash;
    }

    static generateRestaurantToken(restaurant_id) {
        var data = {
            type: "restaurant",
            id: restaurant_id
        }
        return jwt.sign(data, process.env.SECRET_KEY, { expiresIn: '2h' });
    }

    static generateDriverToken(driver_id) {
        var data = {
            type: "Driver",
            id: driver_id
        }
        return jwt.sign(data, process.env.SECRET_KEY, { expiresIn: '2h' });
    }

    static generateRestaurantToken(driver_id) {
        var data = {
            type: "Restaurant",
            id: driver_id
        }
        return jwt.sign(data, process.env.SECRET_KEY, { expiresIn: '2h' });
    }

    static verifyToken(token) {
        try {
            var decoded = jwt.verify(token, process.env.SECRET_KEY);
          } catch(err) {
            return null;
          }

        return decoded;
    }

    static generateCode() {
        return ("" + Math.random()).substring(2, 8);
    }

    // exclude fields (keys) from a query set
    // https://www.prisma.io/docs/concepts/components/prisma-client/excluding-fields
    static exclude(model, keys) {
        for (let key of keys) {
          delete model[key]
        }
        return model
    }

    static async loginRequired(req, res, next) {
        const access_token = req.headers.access_token;
        if (!access_token) {
            return Utils.makeResponse(res, 401, "Please log in");
        }

        const decoded = Utils.verifyToken(access_token);
        if (!decoded) {
            return Utils.makeResponse(res, 401, "Please log in"); 
        }

        const id = decoded.id;
        const type = decoded.type;
        var user;
        if (type == "Restaurant") {
            user = await db.restaurant.findFirst({where: {id: id}});
        } else if (type == "Driver") {
            user = await db.driver.findUnique({ where: id });
        }
        user = Utils.exclude(user, ["passwordHash"]);
        req.user = user;
        next();
    }
}

module.exports = Utils;