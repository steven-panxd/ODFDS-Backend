var supertest = require('supertest');
var { describe, it } = require('mocha');
var { expect } = require('chai');
var mongoose = require("mongoose");

var app = require("../app");

var request = supertest.agent(app).set("Accept", "application/json");  // set default request headers

describe('Driver Sign Up Email Verification Code', function() {

    it('Empty email address', (done) => {
        // arrange
        const url = "/driver/emailCode";
        const contentType = /application\/json/;
        const statusCode = 400;
        const data = {
            code: 400,
            data: {
                field: "email",
                value: null,
                message: "Please input email"
            }      
        }

        // act
        const resp = request.get(url);

        // assert
        resp
            .expect("Content-Type", contentType)
            .expect(statusCode)
            .expect(data)
            .end(done);
    });

    it('Invalid email address', (done) => {
        // arrange
        const url = "/driver/emailCode?email=abc";
        const contentType = /application\/json/;
        const statusCode = 400;
        const data = {
            code: 400,
            data: {
                field: "email",
                value: "abc",
                message: "Invalid email address"
            }      
        }

        // act
        const resp = request.get(url);

        // assert
        resp
            .expect("Content-Type", contentType)
            .expect(statusCode)
            .expect(data)
            .end(done);
    });

    
});