const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

var { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

class StripeWrapper{
    static async createDriverAccount(profileData){
        return await stripe.accounts.create({
            country: 'US',
            type: 'custom',
            business_type: 'individual',
            individual: {
                email: profileData.email,
                first_name: profileData.firstName,
                last_name: profileData.lastName,
            },
            capabilities: {
                card_payments: {requested: true},
                transfers: {requested: true}
            }
        })
    }

    static async updateDriverAccount(profileData){
        console.log(profileData);
        return await stripe.accounts.update(profileData.stripeAccountId, {
            individual: {
                email: profileData.email,
                first_name: profileData.firstName,
                last_name: profileData.lastName,
            },
        })
    }

    static async getDriverAccount(accountId){
        return await stripe.accounts.retrieve(accountId)
    }

    static async createOnboardingLink(accountId, refreshUrl, returnUrl){
        return await stripe.accountLinks.create({
            account: accountId,
            refresh_url: refreshUrl,
            return_url: returnUrl,
            type: 'account_onboarding',
            collect: 'eventually_due'
        })
    }

    static async createUpdateLink(accountId, refreshUrl, returnUrl){
        return await stripe.accountLinks.create({
            account: accountId,
            refresh_url: refreshUrl,
            return_url: returnUrl,
            type: 'account_update',
            collect: 'eventually_due'
        })
    }

    //associate payment method with customer for future use

    static async createPaymentMethod(cardNumber, expMonth, expYear, cvc){
        return await stripe.paymentMethods.create({
            type: 'card',
            card: {
                number: cardNumber,
                exp_month: expMonth,
                exp_year: expYear,
                cvc: cvc
            }
        })
    }

    //payment methods using setup intents
    static async createSetupIntent(customerId){
        return await stripe.setupIntents.create({
            payment_method_types: ['card', 'us_bank_account'],
            usage: "on_session",
            customer: customerId
        })
    }

    static async createRestaurantAccount(profileData){
        return await stripe.customers.create({
            address: {
                city: profileData.city,
                country: 'US',
                line1: profileData.street, //This assumes no apartment number or unit number or anything else after the street name
                postal_code: profileData.zipCode,
                state: profileData.state
            },
            email: profileData.email,
            name: profileData.name
        })
    }

    static async updateRestaurantAccount(profileData){
        return await stripe.customers.update(profileData.customerId, {
            address: {
                city: profileData.city,
                country: 'US',
                line1: profileData.street, //This assumes no apartment number or unit number or anything else after the street name
                postal_code: profileData.zipCode,
                state: profileData.state
            },
            email: profileData.email,
            name: profileData.name
        })
    }

    static async listCustomerPaymentMethods(profileData){
        return await stripe.paymentMethods.list({
            customer: profileData.stripeCustomerId
        })
    }

    static async removePaymentMethod(paymentId){
        return await stripe.paymentMethods.detach(paymentId)
    }

    //make payment intent
    static async createPaymentIntent(profileData, amountCents, paymentMethodId){
        return await stripe.paymentIntents.create({
            amount: amountCents,
            currency: 'usd',
            payment_method_types: ['card', 'us_bank_account'],
            customer: profileData.stripeCustomerId,
            payment_method: paymentMethodId,
            receipt_email: profileData.email,
            confirm: true
        })
    }

    static async retreivePaymentIntent(intentId){
        return await stripe.paymentIntents.retrieve(intentId)
    }

    static async transferFunds(amountCents, driverAccountId){
        return await stripe.transfers.create({
            amount: amountCents,
            currency: 'usd',
            destination: driverAccountId
        })
    }
}

module.exports = StripeWrapper