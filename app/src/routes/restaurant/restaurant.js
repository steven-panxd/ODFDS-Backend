var express = require('express');
var router = express.Router();
var { getRestaurantEmailCodeValidator, 
      postRestaurantSignUpValidator, 
      postRestaurantLoginValidator,
      patchRestaurantProfileValidator,
      getRestaurantResetPasswordEmailCodeValidator,
      postRestaurantResetPasswordValidator,
      deleteRestaurantAccountValidator,
      getRestaurantOrdersValidator,
      postDeliveryOrderValidator,
      getEstimatedValidator,
      getOrderDetailValidator,
      postPayDeliveryOrderValidator
    } = require("./validator");
var emailValidate = require("../../../mongoose/schema/emailValidation");
var driverLocation  = require("../../../mongoose/schema/driverLocation");

var StripeWrapper = require('./../../stripe/StripeWrapper');

var Utils = require('../../utils');

var { PrismaClient, OrderStatus } = require('@prisma/client');
const db = new PrismaClient()

const duplicate = require("duplicate-requests").default;

// get sign up restaurant email verification code
router.get('/emailCode', getRestaurantEmailCodeValidator, async function(req, res) {
  const email = req.query.email;

  const code = Utils.generateCode();
  const sent = await Utils.sendEmail(email, "Your Restaurant Account Verification Code", "<h1>"+ code +"</h1>");
  if (!sent) {
    return Utils.makeResponse(res, 500, "Unable to sent email, please try again later");
  }

  await emailValidate.insertMany([{
    email: email,
    code: code,
    accountType: "Restaurant",
  }]);

  Utils.makeResponse(res, 200, "Code sent to your email, it will expire in 5 mins");
});


// sign up restaurant account
router.post('/', postRestaurantSignUpValidator, async function(req, res) {
  const email = req.body.email;
  const password = req.body.password;
  const phone = req.body.phone;
  const name = req.body.name;
  const street = req.body.street;
  const city = req.body.city;
  const state = req.body.state;
  const zipCode = req.body.zipCode;
  // const latitude = req.body.latitude;
  // const longtitude = req.body.longtitude;

  //create stripe customer account at the same time as profile creation.
  var result;
  try {
    result = await StripeWrapper.createRestaurantAccount({city, street, zipCode, state, email, name});
  } catch (stripeError) {
    return Utils.makeResponse(res, 500, "Stripe Error: " + stripeError.message);
  }

  var stripeCustomerId = result.id;
  await db.restaurant.create({
    data: {
      email: email,
      passwordHash: Utils.generatePasswordHash(password),
      phone: phone,
      name: name,
      street: street,
      city: city,
      state: state,
      zipCode: zipCode,
      stripeCustomerId: stripeCustomerId
      // latitude: latitude,
      // longtitude: longtitude
    }
  });
  
  Utils.makeResponse(res, 200, "Restaurant account created successfully");
});

// delete restaurant account (dev use only)
router.delete('/', deleteRestaurantAccountValidator, async function(req, res) {
  await db.restaurant.delete({
    where: {
      id: req.user.id
    }
  });
  
  Utils.makeResponse(res, 200, "Succeed");
});

// log in restaurant account
router.post("/token", postRestaurantLoginValidator, async function(req, res) {
  Utils.makeResponse(res, 200, Utils.generateRestaurantToken(req.user.id));
});

// get restaurant profile
router.get("/profile", Utils.restaurantLoginRequired, function(req, res) {
  Utils.makeResponse(res, 200, req.user);
});

// update restaurant profile
router.patch("/profile", Utils.restaurantLoginRequired, patchRestaurantProfileValidator, async function(req, res) {
  const phone = req.body.phone;
  const name = req.body.name;
  const street = req.body.street;
  const city = req.body.city;
  const state = req.body.state;
  const zipCode = req.body.zipCode;
  // const latitude = req.body.latitude;
  // const longtitude = req.body.longtitude;
  
  //update stripe customer account at the same time as profile creation.
  var result;
  try {
    result = await StripeWrapper.updateRestaurantAccount({
      customerId: req.user.stripeCustomerId,
      city: city || req.user.city, 
      street: street || req.user.street, 
      zipCode: zipCode || req.user.zipCode, 
      state: state || req.user.state,
      name: name || req.user.name,
      email: req.user.email
    });
  } catch(stripeError) {
    return Utils.makeResponse(res, 500, "Stripe Error: " + stripeError.message);
  }

  var stripeCustomerId = result.id;
  await db.restaurant.update({
    where: {
      id: req.user.id
    },
    data: {
      phone: phone,
      name: name,
      street: street,
      city: city,
      state: state,
      zipCode: zipCode,
      stripeCustomerId: stripeCustomerId //this probably won't change, but just to be safe
      // latitude: latitude,
      // longtitude: longtitude
    }
  });

  Utils.makeResponse(res, 200, "Profile updated");
});

// get restaurant account reset password email verification code
router.get('/reset/emailCode', getRestaurantResetPasswordEmailCodeValidator, async function(req, res) {
  const email = req.query.email;

  const code = Utils.generateCode();
  const sent = await Utils.sendEmail(email, "Your Restaurant Account Reset Password Verification Code", "<h1>"+ code +"</h1>");
  if (!sent) {
      return Utils.makeResponse(res, 500, "Unable to sent email, please try again later");
  }

  await emailValidate.insertMany([{
      email: email,
      code: code,
      accountType: "RestaurantReset",
  }]);

  Utils.makeResponse(res, 200, "Code sent to your email, it will expire in 5 mins");
});

// reset password by email verification code
router.patch('/reset/password', postRestaurantResetPasswordValidator, async function(req, res) {
  await db.restaurant.update({
    where: {
      id: req.user.id
    },
    data: {
      passwordHash: Utils.generatePasswordHash(req.body.password)
    }
  });
  
  Utils.makeResponse(res, 200, "Succeed");
});

// calculate estimated order price and delivery time?
router.post('/order/estimate', Utils.restaurantLoginRequired, getEstimatedValidator, async function(req, res) {
  const street = req.body.street;
  const city = req.body.city;
  const state = req.body.state;
  const zipCode = req.body.zipCode;

  const originAddr = req.user.street + ", " + req.user.city + ", " + req.user.state + ", " + req.user.zipCode;
  const destAddr = street + ", " + city + ", " + state + ", " + zipCode;

  const result = await Utils.calculateDistance(originAddr, destAddr);
  const estimatedPrice = Utils.calculatePrice(result.distance)

  Utils.makeResponse(res, 200, {
    estimatedDistanceInMeters: result.distance,
    estimatedDurationInSeconds: result.duration,
    estimatedPriceInDollars: estimatedPrice
  });
});

// get restaurant order history
router.get('/orders', Utils.restaurantLoginRequired, getRestaurantOrdersValidator, async function(req, res) {
  const page = req.query.page;
  const pageSize = req.query.pageSize;

  // calculate total page number
  const allCount = await db.deliveryOrder.count({
    orderBy: {
      id: 'desc'
    },
    where: {
      restaurantId: req.user.id
    }
  });
  const totalPage = Math.ceil(allCount / pageSize);

  const skip = (page - 1) * pageSize; // skip some data and get the data from current page
  const rawData = await db.deliveryOrder.findMany({
    orderBy: {
      id: 'desc'
    },
    where: {
      restaurantId: req.user.id
    },
    include: {
      driver: {
        select: {
          id: true,
          lastName: true,
          firstName: true,
          middleName: true,
          phone: true,
          email: true
        }
      }
    },
    skip: skip,
    take: pageSize
  });
  
  // remove foreign key fields
  let cleanData = [];
  rawData.forEach((model) => {
    cleanData.push(Utils.exclude(model, ["restaurantId", "driverId", "transactionId"]));
  });

  Utils.makeResponse(res, 200, {
    data: cleanData,
    pageSize: pageSize,
    totalPage: totalPage,
    page: page,
    allCount: allCount
  });
});

// get order detail information by order id
router.get("/order", Utils.restaurantLoginRequired, getOrderDetailValidator, async function(req, res) {
  // if the order is delivered or the driver hasn't accepted it
  req.order.restaurant = req.user;
  if (req.order.status == OrderStatus.CREATED || req.order.status == OrderStatus.ASSIGNED || req.order.status == OrderStatus.DELIVERED || req.order.status == OrderStatus.CANCELLED) {
    return Utils.makeResponse(res, 200, req.order);
  }

  // if the order is not delivered, append driver's current location to the return info
  const driverOnRouteLocation = await Utils.getDriverOnRouteLocation(req.order.driver.id);
  req.order.driver.latitude = driverOnRouteLocation.latitude;
  req.order.driver.longitude = driverOnRouteLocation.longitude;
  return Utils.makeResponse(res, 200, req.order);
});

// create a new order, have not assign the order to a driver
router.post('/order', Utils.restaurantLoginRequired, postDeliveryOrderValidator, async function(req, res) {
  const customerAddr = req.body.customerStreet + ", " + req.body.customerCity + ", " + req.body.customerState + ", " + req.body.customerZipCode;
  const restaurantAddr = req.user.street + ", " + req.user.city + ", " + req.user.state + ", " + req.user.zipCode;
  
  const result = await Utils.calculateDistance(restaurantAddr, customerAddr);  // distance and duration between restaurant and customer
  if (!result.duration) {  // if there is no route between them, customer is too far from the restaurant
    return Utils.makeResponse(res, 404, "No route between restaurant and customer");
  }

  // calculate delivery time and price
  const cost = Utils.calculatePrice(result.distance);

  const order = await db.deliveryOrder.create({
    data: {
      cost: cost,
      customerStreet: req.body.customerStreet,
      customerCity: req.body.customerCity,
      customerState: req.body.customerState,
      customerZipCode: req.body.customerZipCode,
      customerName: req.body.customerName,
      customerEmail: req.body.customerEmail,
      customerPhone: req.body.customerPhone,
      restaurantId: req.user.id,
      comment: req.body.comment
    },
    include: {
      restaurant: {
        select: {
            id: true,
            name: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
            phone: true,
            email: true
        }
      }
    }
  });

  Utils.makeResponse(res, 200, {
    message: "Order created, pending payment",
    orderId: order.id
  });
});

// cache pay order function, make sure an order should only be paid once
router.use(duplicate({
  expiration: "1m",
  property: "id",
  prefix: "restaurant.order.pay",
  errorHandling: {
    statusCode: 429, // The status code to send if request is duplicated
    json: {
      code: 429,
      data: "Duplicated requests received in a short time, please try again later",
    } // Javascript plain object to send if request is duplicated
  },
}));

router.post("/order/pay", Utils.restaurantLoginRequired, postPayDeliveryOrderValidator, async function(req, res) {
  // compose customer address and restaurant address
  const customerAddr = req.order.customerStreet + ", " + req.order.customerCity + ", " + req.order.customerState + ", " + req.order.customerZipCode;
  const restaurantAddr = req.user.street + ", " + req.user.city + ", " + req.user.state + ", " + req.user.zipCode;

  // find driver who is coming and picking up only ONE order from current restaurant
  let driver;
  let driverWsClient;
  let newDriverFlag = false;
  driver = await Utils.findOneOrderDriver(req, req.user);
  // otherwise, find a new nearest driver
  if (!driver) {
    newDriverFlag = true;
    // find nearest driver
    const nearestDriver = await Utils.findNearestDriver(req.user, []);
    // if there is no driver near the restaurant, cancel the order
    if (!nearestDriver) {
      await db.deliveryOrder.update({
        where: {
          id: req.body.orderId
        },
        data: {
          status: OrderStatus.CANCELLED
        }
      });
      return Utils.makeResponse(res, 404, "No avaliable drivers online, order got cancelled");
    }
    driver = nearestDriver;
  }

  const nearestDriverLocation = driver.latitude + ", " + driver.longitude;
  const result1 = await Utils.calculateDistance(nearestDriverLocation, restaurantAddr); // distance and duration between nearest driver and restaurant
  const result2 = await Utils.calculateDistance(restaurantAddr, customerAddr);  // distance and duration between restaurant and customer
  if (result1.duration == null || result2.duration == null) {  // if there is no route between them, drivers are too far from the restaurant, cancel the order
    await db.deliveryOrder.update({
      where: {
        id: req.order.id
      },
      data: {
        status: OrderStatus.CANCELLED
      }
    });
    return Utils.makeResponse(res, 404, "Avaliable driver's are too far from you, order got cancelled");
  }

  // if the driver's location is in the database but the driver's websocket is disconnected
  driverWsClient = Utils.getDriverWsClient(req, driver.id);
  if (!driverWsClient) {
    return Utils.makeResponse(res, 404, "Avaliable driver's websocket disconnected, order got cancelled");
  }

  // make and process the order payment
  let paymentResult;
  try {
    paymentResult = await StripeWrapper.createPaymentIntent(req.user, req.order.cost * 100, req.body.paymentMethodId);
  } catch(stripeError) {
    console.log(stripeError);
    //payment was unsuccesful, so order should be cancelled
    await db.deliveryOrder.update(
      {where: {
          id: req.body.orderId
      },
      data: {
          status: OrderStatus.CANCELLED
      }
    })
    console.log(stripeError);
    return Utils.makeResponse(res, 404, "Stripe Error: " + stripeError.raw.message)
  }
  // check payment status, if not paid, cancel the order
  if (paymentResult.status != "requires_confirmation") {
    await db.deliveryOrder.update(
      {where: {
          id: req.body.orderId
      },
      data: {
          status: OrderStatus.CANCELLED,
          stripeTransferId: paymentResult.id
      }
    });
    console.log(paymentResult);
    return Utils.makeResponse(res, 404, "Payment Error: invalid payment result status = " + paymentResult.status);
  }

  // estimatedDeliveryTime = Now + time the driver need to go to the restaurant + time the driver need to deliver the order from restaurant to customer
  const estimatedDeliveryTime = new Date(new Date().getTime() + (result1.duration + result2.duration) * 1000);

  // update database
  let order;
  if (newDriverFlag) {
    order = await db.deliveryOrder.update({
      where: {
        id: req.body.orderId
      },
      data: {
        stripePaymentIntentId: paymentResult.id,
        driverId: driver.id,
        estimatedDeliveryTime: estimatedDeliveryTime,
        status: OrderStatus.ASSIGNED
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
            phone: true,
            email: true
          }
        }
      }
    });
    // send order to driver
    // TODO: bug when driverWsClient is null
    await Utils.assignPendingAcceptanceOrderToDriver(req, driverWsClient, driver.id, order);
  } else {
    order = await db.deliveryOrder.findUnique({where: {id: req.body.orderId}});
    // confirm payment from restaurant
    try {
        paymentResult = await StripeWrapper.confirmPaymentIntent(paymentResult.id);
    } catch (stripeError) {
        await Utils.cancelOrder(order, "Your order #" + order.id + " is cancelled due to payment error. " + stripeError.raw.message ? stripeError.raw.message : "");
        return Utils.makeResponse(res, 402, "Payment failed, order got cancelled;")
    }

    if (paymentResult.status != "succeeded") {
        await Utils.cancelOrder(order, "Your order #" + order.id + " is cancelled due to payment error. invalid payment status = " + paymentResult.status);
        return Utils.makeResponse(res, 402, "Payment failed, order got cancelled;")
    }
    
    order = await db.deliveryOrder.update({
      where: {
        id: req.body.orderId
      },
      data: {
        stripePaymentIntentId: paymentResult.id,
        driverId: driver.id,
        estimatedDeliveryTime: estimatedDeliveryTime,
        status: OrderStatus.ACCEPTED  // accepted automatically
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
            phone: true,
            email: true
          }
        }
      }
    });
    // send order to driver
    await Utils.assignSecondOrderToDriver(req, driverWsClient, driver.id, order);
  }
  
  // send tracking token to customer by email
  await Utils.sendEmail(order.customerEmail, "To Customer: Information for your order #" + order.id, "<h2> Your order tracking token: " + Utils.generateCustomerToken(order.id) + "</h2>");

  Utils.makeResponse(res, 200, {
    message: "Order paid",
    orderId: order.id
  });
});

module.exports = router;
