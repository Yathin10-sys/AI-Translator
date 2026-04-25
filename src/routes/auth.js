const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { auth } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.get("/profile", auth, authController.getProfile);
router.put("/preferences", auth, authController.updatePreferences);
router.post("/dictionary", auth, authController.addDictionaryEntry);

module.exports = router;
