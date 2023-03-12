var fs = require('fs');
var express = require('express');
var router = express.Router();

var uploadedImage = require('../../../mongoose/schema/uploadedImage'); 
var Utils = require('../../utills');

// set up multer
var multer  = require('multer')
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const path = "./uploads";
        fs.mkdirSync(path, { recursive: true });
        cb(null, path);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const splittedFileName = file.originalname.split(".")
        const ext = splittedFileName[splittedFileName.length - 1];
        const path = uniqueSuffix + "." + ext;
        cb(null, path);
    },
});

// setup multer uploader
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const splittedFileName = file.originalname.split(".")
        const ext = splittedFileName[splittedFileName.length - 1];
        if ((file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") && (ext == "jpg" || ext == "jpeg" || ext == "png")) {
            cb(null, true);
        } else {
            cb(null, false);
            req.originalname = file.originalname;
            return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
    }
 });

const uploadSingleImage = upload.single('image')


// upload image API
// this API uses a third-party middleware Multer
// doc: https://expressjs.com/en/resources/middleware/multer.html
router.post("/upload/image", async function(req, res) {
    uploadSingleImage(req, res, async function(err) {
        if (err instanceof multer.MulterError) {
            return Utils.makeResponse(res, 500, {
                "field": "image",
                "value": req.file.originalname,
                "message": err.message
            });
        } else if (err) {
            return Utils.makeResponse(res, 400, {
                "field": "image",
                "value": req.originalname,
                "message": err.message
            });
        }

        if (!req.file) {
            return Utils.makeResponse(res, 400, {
                "field": "image",
                "value": null,
                "message": "No image file received"
            });
        }

        await uploadedImage.insertMany([{
            name: req.file.filename,
            path: req.file.path
        }]);
        Utils.makeResponse(res, 200, "http://" + req.hostname + ":3000" + "/common/file/" + req.file.filename);        
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

module.exports = router;