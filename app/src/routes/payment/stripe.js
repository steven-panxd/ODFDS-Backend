var express = require('express');
var router = express.Router();
var StripeWrapper = require('./../../stripe/StripeWrapper');
var Utils = require('./../../utils');

var { PrismaClient, OrderStatus } = require('@prisma/client');
const db = new PrismaClient();

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
//body.orderId - the amount in USD cents to be charged
//body.paymentMethodId - the ID of the stripe payment method being used for this transaction
router.post('/payment_intent', Utils.restaurantLoginRequired, async (req, res) => {
    //get order from db
    var order = await db.deliveryOrder.findUnique({where: {id: req.body.orderId}})
    //check order status before paying
    if (order.orderStatus !== OrderStatus.CREATED){
        Utils.makeResponse(res, 400, "Order has already been paid for.")
    }
    StripeWrapper.createPaymentIntent(req.user, order.estimatedDeliveryCost * 100, req.body.paymentMethodId).then(
        (result) => {
            switch(result.status){
                case 'succeeded':
                    break
                default:
                    Utils.makeResponse(res, 400, "Payment failed.")
                    return
            }
            Utils.makeResponse(res, 200, result)
        }
    ).catch(
        async (error) => {
            //payment was unsuccesful, so order should be cancelled
            await db.deliveryOrder.update(
                {where: {
                    id: req.body.orderId
                },
                data: {
                    orderStatus: OrderStatus.CANCELLED,
                    stripeTransferId: result.id
                }
            })
            Utils.makeResponse(res, error.raw.statusCode, error)
        }
    )
})

//query.intentId - the ID of the stripe payment intent to get
router.get('/payment_intent', (req, res) => {
    StripeWrapper.retreivePaymentIntent(req.query.intentId).then(
        (result) => {
            Utils.makeResponse(res, 200, result)
        }
    ).catch(
        (error) => {
            Utils.makeResponse(res, error.raw.statusCode, error)
        }
    )
})

//req.body.orderId - the id of the order that is being paid
router.post('/pay_order', Utils.driverLoginRequired, async (req, res) => {
    //get order from db
    var order = await db.deliveryOrder.findUnique({where: {id: req.body.orderId}})
    //make sure driver is the one assigned to it
    if(order.driverId !== req.user.id){
        Utils.makeResponse(res, 400, "Unable to claim payment for this order.")
        return
    }
    //make sure order has not already been paid
    if(order.orderStatus === OrderStatus.DRIVER_PAID){
        Utils.makeResponse(res, 400, "Order payment has already been claimed.")
        return
    }
    //check that order status is "DELIVERED"
    if(order.orderStatus !== OrderStatus.DELIVERED){
        Utils.makeResponse(res, 400, "Order must have status DELIVERED.")
        return
    }
    //pay order
    StripeWrapper.transferFunds(order.estimatedDeliveryCost*100, req.user.stripeAccountId).then(
        async (result) => {
            await db.deliveryOrder.update(
                {where: {
                    id: req.body.orderId
                },
                data: {
                    orderStatus: OrderStatus.DRIVER_PAID,
                    stripeTransferId: result.id
                }
            })
            Utils.makeResponse(res, 200, result)
        }
    ).catch(
        (error) => {
            console.log(error)
            Utils.makeResponse(res, error.raw.statusCode, error)
        }
    )
})

//query.transferId - the ID of the strip transfer to get
router.get('/transfer', Utils.driverLoginRequired, (req, res) => {
    StripeWrapper.retrieveTransfer(req.query.transferId).then(
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