/**
 * Translation Controller - All AI translation endpoints
 */

const { Translation } = require("../models");
const aiService = require("../services/aiService");

// ─── Main Translation ───────────────────────────────────────────────────────
exports.translate = async (req, res, next) => {
  try {
    const {
      text,
      sourceLang = "auto",
      targetLang = "en",
      tone = "formal",
      context = [],
      sessionId,
    } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text is required" });
    }
    if (text.length > 5000) {
      return res.status(400).json({ error: "Text exceeds 5000 character limit" });
    }

    // Run translation + emotion detection in parallel
    const [result, emotionResult] = await Promise.all([
      aiService.translateText({ text, sourceLang, targetLang, tone, context }),
      aiService.detectEmotion(text),
    ]);

    // Save to history (if user is logged in or session exists)
    const userId = req.user?._id;
    if (userId || sessionId) {
      await Translation.create({
        userId,
        sessionId: sessionId || undefined,
        originalText: text,
        translatedText: result.translation,
        sourceLang,
        detectedLang: result.detectedLang,
        targetLang,
        tone,
        model: result.model,
        emotion: emotionResult.emotion,
        sentiment: emotionResult.sentiment,
        speakerRole: "single",
      }).catch(() => {}); // Don't fail on DB error
    }

    res.json({
      translation: result.translation,
      detectedLang: result.detectedLang || sourceLang,
      emotion: emotionResult,
      cached: result.cached || false,
      model: result.model,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Explain Translation ────────────────────────────────────────────────────
exports.explain = async (req, res, next) => {
  try {
    const { original, translated, sourceLang, targetLang, tone = "formal" } = req.body;

    if (!original || !translated) {
      return res.status(400).json({ error: "Both original and translated text are required" });
    }

    const result = await aiService.explainTranslation({
      original, translated, sourceLang, targetLang, tone,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Enhance Text ───────────────────────────────────────────────────────────
exports.enhance = async (req, res, next) => {
  try {
    const { text, language = "en", mode = "fluency" } = req.body;

    if (!text) return res.status(400).json({ error: "Text is required" });

    const result = await aiService.enhanceText({ text, language, mode });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Word Insights ──────────────────────────────────────────────────────────
exports.wordInsights = async (req, res, next) => {
  try {
    const { word, language = "en", context } = req.body;

    if (!word) return res.status(400).json({ error: "Word is required" });

    const result = await aiService.getWordInsights({ word, language, context });
    res.json(result || { error: "No insights available" });
  } catch (err) {
    next(err);
  }
};

// ─── Alternative Phrasings ──────────────────────────────────────────────────
exports.alternatives = async (req, res, next) => {
  try {
    const { text, language = "en", count = 3 } = req.body;

    if (!text) return res.status(400).json({ error: "Text is required" });

    const result = await aiService.getAlternatives({ text, language, count });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── Detect Language ────────────────────────────────────────────────────────
exports.detectLanguage = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    const lang = await aiService.detectLanguageWithAI(text);
    const name = aiService.LANGUAGE_NAMES[lang] || lang;
    res.json({ language: lang, name });
  } catch (err) {
    next(err);
  }
};

// ─── Get Supported Languages ────────────────────────────────────────────────
exports.getLanguages = async (req, res) => {
  const languages = Object.entries(aiService.LANGUAGE_NAMES).map(([code, name]) => ({
    code,
    name,
  }));
  res.json({ languages });
};
