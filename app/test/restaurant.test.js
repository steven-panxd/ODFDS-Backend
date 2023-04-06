var supertest = require('supertest');
var { describe, it } = require('mocha');
var { expect } = require('chai');
var mongoose = require("mongoose");

var app = require("../app");

var request = supertest.agent(app).set("Accept", "application/json");  // set default request headers

describe('Restaurant Sign Up Email Verification Code', function() {

    it('Empty email address', (done) => {
        request
            .get('/restaurant/emailCode')
            .expect("Content-Type", /application\/json/)
            .expect(400)
            .expect({
                code: 400,
                data: {
                    field: "email",
                    value: null,
                    message: "Please input email"
                }
            })
            .end(done);
    });

    it('Invalid email address', (done) => {
        request
            .get('/restaurant/emailCode?email=abc')
            .expect("Content-Type", /application\/json/)
            .expect(400)
            .expect({
                code: 400,
                data: {
                    field: "email",
                    value: "abc",
                    message: "Invalid email address"
                }
            })
            .end(done);
    });
});