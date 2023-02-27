var crypto = require('crypto');
var jwt = require('jsonwebtoken');

class Utils {
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

    validate_token(token) {
        try {
            var decoded = jwt.verify(token, process.env.SECRET_KEY);
          } catch(err) {
            return null;
          }

        return decoded;
    }
}

var utils = new Utils();

module.exports = utils;