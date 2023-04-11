var express = require('express')
var router = express.Router()
var StripeWrapper = require('./../../payment/StripeWrapper');
var Utils = require('./../../utills')

var { PrismaClient } = require('@prisma/client');
const db = new PrismaClient()

//create setup intent
router.post('/create_setup_intent', Utils.restaurantLoginRequired, (req, res) => {
    StripeWrapper.createSetupIntent(req.user.stripeCustomerId).then(
        (result) => {
            Utils.makeResponse(res, 200, result)
        }
    ).catch(
        (error) => {
            Utils.makeResponse(res, error.raw.statusCode, error)
        }
    )
})


//get a list of payment methods for a specific customer
router.post('/methods', Utils.restaurantLoginRequired, (req, res) => {
    StripeWrapper.listCustomerPaymentMethods(req.user).then(
        (result) => {
            Utils.makeResponse(res, 200, result)
        }
    ).catch(
        (error) => {
            Utils.makeResponse(res, error.raw.statusCode, error)
        }
    )
})

//remove a payment method
router.delete('/methods', Utils.restaurantLoginRequired, (req, res) => {
    StripeWrapper.removePaymentMethod(req.query.methodId).then(
        (result) => {
            Utils.makeResponse(res, 200, result)
        }
    ).catch(
        (error) => {
            Utils.makeResponse(res, error.raw.statusCode, error)
        }
    )
})

//create driver account
router.post("/driver/create", Utils.driverLoginRequired, (req, res) => {
    StripeWrapper.createDriverAccount(req.user).then(
        (result) => {
            Utils.makeResponse(res, 200, result)
        }
    ).catch(
        (error) => {
            Utils.makeResponse(res, error.raw.statusCode, error)
        }
    )
})

//get drive account
router.get("/driver", Utils.driverLoginRequired, (req, res) => {
    StripeWrapper.getDriverAccount(req.user.stripeAccountId).then(
        (result) => {
            Utils.makeResponse(res, 200, result)
        }
    ).catch(
        (error) => {
            Utils.makeResponse(res, error.raw.statusCode, error)
        }
    )
})

//create onboarding links
//body.refreshUrl - the url stripe returns to when refreshing the page
//body.returnUrl - the url stripe navigates to when form is complete
router.post('/driver/onboard', Utils.driverLoginRequired, (req, res) => {
    StripeWrapper.createOnboardingLink(req.user.stripeAccountId, req.body.refreshUrl, req.body.returnUrl).then(
        (result) => {
            Utils.makeResponse(res, 200, result)
        }
    ).catch(
        (error) => {
            Utils.makeResponse(res, error.raw.statusCode, error)
        }
    )
})

//create update links
//body.refreshUrl - the url stripe returns to when refreshing the page
//body.returnUrl - the url stripe navigates to when form is complete
router.post('/driver/update', Utils.driverLoginRequired, (req, res) => {
    StripeWrapper.createUpdateLink(req.user.stripeAccountId, req.body.refreshUrl, req.body.returnUrl).then(
        (result) => {
            Utils.makeResponse(res, 200, result)
        }
    ).catch(
        (error) => {
            Utils.makeResponse(res, error.raw.statusCode, error)
        }
    )
})

//create payment intent
//body.amountCents - the amount in USD cents to be charged
//body.paymentMethodId - the ID of the stripe payment method being used for this transaction
router.post('/create_payment_intent', Utils.restaurantLoginRequired, (req, res) => {
    StripeWrapper.createPaymentIntent(req.user, req.body.amountCents, req.body.paymentMethodId).then(
        (result) => {
            Utils.makeResponse(res, 200, result)
        }
    ).catch(
        (error) => {
            Utils.makeResponse(res, error.raw.statusCode, error)
        }
    )
})

router.post('/set_payment_recipient', Utils.restaurantLoginRequired, (req, res) => {
    StripeWrapper.setPaymentIntentRecipient(req.body.intentId, req.body.recipientAccountId).then(
        (result) => {
            Utils.makeResponse(res, 200, result)
        }
    ).catch(
        (error) => {
            Utils.makeResponse(res, error.raw.statusCode, error)
        }
    )
})

module.exports = router