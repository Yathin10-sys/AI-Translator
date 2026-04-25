const express = require("express");
const router = express.Router();
const ocrController = require("../controllers/ocrController");

router.post("/extract", ocrController.uploadMiddleware, ocrController.extractText);

module.exports = router;
