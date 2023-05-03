var express = require('express');
var router = express.Router();
var fs = require('fs');

var { validateAddressValidator } = require("./validator");

var uploadedImage = require('../../../mongoose/schema/uploadedImage'); 
var Utils = require('../../utils');

const fileUpload = require('express-fileupload');
router.use(fileUpload({
    limits: {
        fileSize: 1048576
    }
}));

// upload image API
// this API uses a third-party middleware Multer
// doc: https://expressjs.com/en/resources/middleware/multer.html
router.post("/upload/image", async function(req, res) {
    let imageFile;

    if (!req.files || Object.keys(req.files).length === 0) {
        return Utils.makeResponse(res, 400, {
            "field": "image",
            "value": null,
            "message": "No image file received"
        });
    }

    imageFile = req.files.image;
    imageFIleNameSplit = imageFile.name.split(".");
    ext = imageFIleNameSplit[imageFIleNameSplit.length - 1];
    if (!((ext == "jpg" || ext == "jpeg" || ext == "png") && (imageFile.mimetype == "image/jpeg" || imageFile.mimetype == "image/png"))) {
        return Utils.makeResponse(res, 500, {
            "field": "image",
            "value": imageFile.name,
            "message": "Only .png, .jpg and .jpeg format allowed!"
        });
    }

    uploadFolderPath = './upload/';
    if (!fs.existsSync(uploadFolderPath)) {
        fs.mkdirSync(uploadFolderPath);
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const uploadedFilename = uniqueSuffix + "." + ext;
    const uploadFilePath = uploadFolderPath + uniqueSuffix + "." + ext;

    // Use the mv() method to place the file somewhere on your server
    imageFile.mv(uploadFilePath, async function(err) {
        if (err) {
            return Utils.makeResponse(res, 500, {
                "field": "image",
                "value": imageFile.name,
                "message": err.message
            });
        }

        await uploadedImage.insertMany([{
            name: uploadedFilename,
            path: uploadFilePath
        }]);
        
        // port is NODE_LOCAL_PORT in a docker container, or NODE_DOCKER_PORT in development
        const port = process.env.NODE_LOCAL_PORT ? process.env.NODE_LOCAL_PORT : process.env.NODE_DOCKER_PORT

        Utils.makeResponse(res, 200, "http://" + req.hostname + ":" + port + "/common/file/" + uploadedFilename);     
    });
});


// retrive stored file (image) api
router.get("/file/:fileName", async function(req, res) {
    mongoData = await uploadedImage.findOne({ name: req.params.fileName });
    if (!mongoData) {
        return Utils.makeResponse(res, 400, "Can not find file");
    }
    res.sendFile(mongoData.path, { root: "./" });
});

// validate address
router.get("/validateAddress", validateAddressValidator, async function(req, res) {
    const street = req.query.street;
    const city = req.query.city;
    const state = req.query.state;
    const zipCode = req.query.zipCode;
  
    const result = await Utils.validateAddress(street, city, state, zipCode);
  
    if (result.pass) {
        // pass address checks
        return Utils.makeResponse(res, 200, "succeed");
    } else {
        if (result.inferred) {
            if (result.zipCode) {
                // inferred address succeed
                delete result.message;
                delete result.pass;
                delete result.inferred;
                return Utils.makeResponse(res, 402, result);
            } else {
                // inferred addres without zipcode
                return Utils.makeResponse(res, 404, "Google maps API can not infer an address with a valid zipcode");
            }
        } else {
            // can not infer a valid address
            return Utils.makeResponse(res, 404, "Google maps API can not validate and infer this address");
      }
    }
  });

module.exports = router;