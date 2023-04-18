var { body, param, query } = require('express-validator');

var { PrismaClient } = require('@prisma/client');
const db = new PrismaClient()

var Utils = require('../../utils');

getOrderValidator = [
    query("token").exists({ checkFalsy: true }).withMessage("Please input your token").bail().custom(async (value, { req }) => {
        const order = await Utils.checkCustomerToken(value);
        if (!order) {
            return Promise.reject("invalid customer token");
        }

        req.order = order;
    }),
    Utils.validate
]

generateTokenValidator = [
    query("orderId").exists({ checkFalsy: true }).withMessage("Please input orderId").isInt().withMessage("Invalid order id").toInt().bail().custom(async (value, { req }) => {
        const order  = await db.deliveryOrder.findUnique({
            where: {
                id: value
            }
        });

        if (!order) {
            return Promise.reject("order does not exist");
        }
    }),
    Utils.validate
]

module.exports = {
    getOrderValidator,
    generateTokenValidator
}