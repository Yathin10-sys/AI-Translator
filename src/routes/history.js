const express = require("express");
const router = express.Router();
const historyController = require("../controllers/historyController");
const { auth, optionalAuth } = require("../middleware/auth");

router.get("/", optionalAuth, historyController.getHistory);
router.patch("/:id/bookmark", auth, historyController.toggleBookmark);
router.delete("/:id", auth, historyController.deleteHistoryItem);
router.delete("/", auth, historyController.clearHistory);
router.get("/conversation/:conversationId", historyController.getConversation);

module.exports = router;
