/**
 * History Controller - Translation history & bookmarks (in-memory store)
 */

const { Translation } = require("../models");

// ─── Get History ────────────────────────────────────────────────────────────
exports.getHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, lang, bookmarked, sessionId } = req.query;
    const query = {};

    if (req.user) {
      query.userId = req.user._id;
    } else if (sessionId) {
      query.sessionId = sessionId;
    } else {
      return res.json({ translations: [], total: 0 });
    }

    if (lang) query.targetLang = lang;
    if (bookmarked === "true") query.isBookmarked = true;

    let results = await Translation.find(query);

    // Sort newest first
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = results.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginated = results.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      translations: paginated,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Toggle Bookmark ────────────────────────────────────────────────────────
exports.toggleBookmark = async (req, res, next) => {
  try {
    const { id } = req.params;
    const translation = await Translation.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      {},
      { new: true }
    );
    if (!translation) return res.status(404).json({ error: "Translation not found" });
    res.json({ isBookmarked: translation.isBookmarked });
  } catch (err) {
    next(err);
  }
};

// ─── Delete History Item ────────────────────────────────────────────────────
exports.deleteHistoryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Translation.findOneAndDelete({ _id: id, userId: req.user._id });
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
};

// ─── Clear All History ──────────────────────────────────────────────────────
exports.clearHistory = async (req, res, next) => {
  try {
    await Translation.deleteMany({ userId: req.user._id });
    res.json({ message: "History cleared" });
  } catch (err) {
    next(err);
  }
};

// ─── Get Conversation History ────────────────────────────────────────────────
exports.getConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const messages = await Translation.find({ conversationId });
    messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json({ messages });
  } catch (err) {
    next(err);
  }
};
