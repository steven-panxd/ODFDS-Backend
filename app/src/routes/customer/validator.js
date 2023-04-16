var { body, param, query } = require('express-validator');
var emailValidate = require("../../../mongoose/schema/emailValidation");

var { PrismaClient } = require('@prisma/client');
const db = new PrismaClient()

var Utils = require('../../utils');

getOrderValidator = [
    query("token").exists("Please input your token")
]

module.exports = {
    getOrderValidator
}