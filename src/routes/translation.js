const express = require("express");
const router = express.Router();
const translationController = require("../controllers/translationController");
const { auth, optionalAuth } = require("../middleware/auth");
const { translationLimiter } = require("../middleware/rateLimit");

router.get("/languages", translationController.getLanguages);
router.post("/", translationLimiter, optionalAuth, translationController.translate);
router.post("/explain", translationLimiter, optionalAuth, translationController.explain);
router.post("/enhance", translationLimiter, optionalAuth, translationController.enhance);
router.post("/word-insights", optionalAuth, translationController.wordInsights);
router.post("/alternatives", optionalAuth, translationController.alternatives);
router.post("/detect-language", optionalAuth, translationController.detectLanguage);

module.exports = router;
