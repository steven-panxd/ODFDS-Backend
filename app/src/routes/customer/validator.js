var { body, param, query } = require('express-validator');
var emailValidate = require("../../../mongoose/schema/emailValidation");

var { PrismaClient } = require('@prisma/client');
const db = new PrismaClient()

var Utils = require('../../utils');

getOrderValidator = [
    query("token").exists({ checkFalsy: true }).withMessage("Please input your token"),
    Utils.validate
]

generateTokenValidator = [
    query("orderId").exists({ checkFalsy: true }).withMessage("Please input orderId").isInt().withMessage("Invalid order id").bail().withMessage(async (value, { req }) => {
        const order  = await db.deliveryOrder.findUnique({
            where: {
                id: value
            }
        });

        if (!order) {
            return Promise.reject("order does not exist");
        }

        req.order = order;
    })
]

module.exports = {
    getOrderValidator,
    generateTokenValidator
}