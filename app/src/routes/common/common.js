var express = require('express');
var router = express.Router();
var fs = require('fs');

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

        Utils.makeResponse(res, 200, "http://" + req.hostname + ":3000" + "/common/file/" + uploadedFilename);     
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
router.get("/validateAddress", async function(req, res) {
    const street = req.query.street ? req.query.street : null;
    const city = req.query.city ? req.query.city : null;
    const state = req.query.state ? req.query.state : null;
    const zipCode = req.query.zipCode ? req.query.zipCode : null;
  
    const result = await Utils.validateAddress(street, city, state, zipCode);
  
    if (result.pass) {
      Utils.makeResponse(res, 200, result);
    } else {
      if (result.inferred) {
        Utils.makeResponse(res, 401, result);
      } else {
        Utils.makeResponse(res, 404, result.message);
      }
    }
  });

module.exports = router;