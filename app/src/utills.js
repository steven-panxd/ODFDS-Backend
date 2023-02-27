var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var nodemailer = require('nodemailer');

class Utils {
    make_response(res, status_code, data) {
        res.status(status_code).json({
            "code": status_code,
            "data": data
        });
    }

    send_email(email, subject, htmlContent) {
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
        
        transporter.sendMail(mailData, function(error, info){
            if (error) {
              console.log(error.message);
              return false;
            } else {
              console.log('Email sent: ' + info.response);
              return true;
            }
        });
    }

    generate_password(raw_password) {
        return crypto.createHmac('sha512', process.env.SECRET_KEY).update(raw_password).digest('hex');
    }
    
    check_password(raw_password, passwordHash) {
        return crypto.createHmac('sha512', process.env.SECRET_KEY).update(raw_password).digest('hex') == passwordHash;
    }

    generate_restaurant_token(restaurant_id) {
        var data = {
            type: "restaurant",
            id: restaurant_id
        }
        return jwt.sign(data, process.env.SECRET_KEY, { expiresIn: '2h' });
    }

    generate_driver_token(driver_id) {
        var data = {
            type: "driver",
            id: driver_id
        }
        return jwt.sign(data, process.env.SECRET_KEY, { expiresIn: '2h' });
    }

    verify_token(token) {
        try {
            var decoded = jwt.verify(token, process.env.SECRET_KEY);
          } catch(err) {
            return null;
          }

        return decoded;
    }

    generate_email_code(email) {
        
    }

    verify_email_code(email, code) {

    }
}

var utils = new Utils();

module.exports = utils;