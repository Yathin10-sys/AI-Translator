/**
 * AI Service - Core translation and AI features
 * Supports Groq Llama/Mixtral, Anthropic Claude, and Google Translate fallback
 */

const Groq = require("groq-sdk");
const NodeCache = require("node-cache");

// In-memory cache (TTL from env, default 1 hour)
const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL) || 3600 });

// Groq client
let groq = null;
if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "gsk_your_groq_api_key_here") {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// ────────────────────────────────────────────────────────────────────────────
// TONE SYSTEM PROMPTS
// ────────────────────────────────────────────────────────────────────────────
const TONE_PROMPTS = {
  formal: "Use formal, professional language with respectful tone.",
  casual: "Use casual, everyday conversational language as if talking to a friend.",
  business: "Use precise business English with professional jargon where appropriate.",
  friendly: "Use warm, friendly, encouraging language with a positive tone.",
  technical: "Preserve technical accuracy. Keep all technical terms as-is.",
};

// ────────────────────────────────────────────────────────────────────────────
// LANGUAGE CODE MAPS
// ────────────────────────────────────────────────────────────────────────────
const LANGUAGE_NAMES = {
  auto: "Auto Detect",
  en: "English", es: "Spanish", fr: "French", de: "German",
  it: "Italian", pt: "Portuguese", ru: "Russian", zh: "Chinese",
  ja: "Japanese", ko: "Korean", ar: "Arabic", hi: "Hindi",
  bn: "Bengali", te: "Telugu", ta: "Tamil", ur: "Urdu",
  nl: "Dutch", pl: "Polish", sv: "Swedish", tr: "Turkish",
  vi: "Vietnamese", th: "Thai", id: "Indonesian", ms: "Malay",
  ro: "Romanian", cs: "Czech", hu: "Hungarian", uk: "Ukrainian",
};

// ────────────────────────────────────────────────────────────────────────────
// CORE TRANSLATE FUNCTION
// ────────────────────────────────────────────────────────────────────────────
const translateText = async ({ text, sourceLang, targetLang, tone = "formal", context = [] }) => {
  if (!text || !text.trim()) return { translation: "", detectedLang: sourceLang };

  // Build cache key
  const cacheKey = `translate:${text.slice(0, 50)}:${sourceLang}:${targetLang}:${tone}`;
  const cached = cache.get(cacheKey);
  if (cached) return { ...cached, cached: true };

  // Use Groq if available
  if (groq) {
    return await translateWithGroq({ text, sourceLang, targetLang, tone, context, cacheKey });
  }

  // Fallback: Google Translate REST
  if (process.env.GOOGLE_TRANSLATE_API_KEY) {
    return await translateWithGoogle({ text, sourceLang, targetLang, cacheKey });
  }

  // Last resort: LibreTranslate (free, no key)
  return await translateWithLibre({ text, sourceLang, targetLang, cacheKey });
};

// Groq Translation
const translateWithGroq = async ({ text, sourceLang, targetLang, tone, context, cacheKey }) => {
  const toneInstruction = TONE_PROMPTS[tone] || TONE_PROMPTS.formal;
  const sourceName = LANGUAGE_NAMES[sourceLang] || sourceLang;
  const targetName = LANGUAGE_NAMES[targetLang] || targetLang;

  // Build message history for context-aware translation
  const messages = [
    {
      role: "system",
      content: `You are an expert AI translator specializing in nuanced, context-aware translation.
Your task: Translate from ${sourceName} to ${targetName}.
Tone: ${toneInstruction}
Rules:
- Preserve original meaning and nuance
- Do NOT add explanations or notes
- Return ONLY the translated text
- Detect source language if "auto" is given
- Maintain formatting (newlines, punctuation)`,
    },
  ];

  // Add conversation context (last 3 exchanges)
  if (context && context.length > 0) {
    messages.push({
      role: "user",
      content: `Previous context:\n${context.slice(-3).map((c) => `${c.original} → ${c.translated}`).join("\n")}`,
    });
    messages.push({ role: "assistant", content: "Understood. I'll use this context." });
  }

  messages.push({ role: "user", content: text });

  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama3-70b-8192",
    messages,
    temperature: 0.3,
    max_tokens: 2000,
  });

  const translation = response.choices[0].message.content.trim();

  // Detect language if auto
  let detectedLang = sourceLang;
  if (sourceLang === "auto") {
    detectedLang = await detectLanguageWithAI(text);
  }

  const result = { translation, detectedLang, model: "groq" };
  cache.set(cacheKey, result);
  return result;
};

// Google Translate Fallback
const translateWithGoogle = async ({ text, sourceLang, targetLang, cacheKey }) => {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`;
  const fetch = (await import("node-fetch")).default;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      source: sourceLang === "auto" ? undefined : sourceLang,
      target: targetLang,
      format: "text",
    }),
  });
  const data = await response.json();
  const translation = data.data.translations[0].translatedText;
  const detectedLang = data.data.translations[0].detectedSourceLanguage || sourceLang;
  const result = { translation, detectedLang, model: "google" };
  cache.set(cacheKey, result);
  return result;
};

// LibreTranslate Free Fallback
const translateWithLibre = async ({ text, sourceLang, targetLang, cacheKey }) => {
  try {
    const fetch = (await import("node-fetch")).default;
    const response = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: sourceLang === "auto" ? "auto" : sourceLang,
        target: targetLang,
        format: "text",
        api_key: "",
      }),
    });
    const data = await response.json();
    const result = {
      translation: data.translatedText || text,
      detectedLang: data.detectedLanguage?.language || sourceLang,
      model: "libre",
    };
    cache.set(cacheKey, result);
    return result;
  } catch {
    // If everything fails, return original text with error note
    return { translation: text, detectedLang: sourceLang, model: "fallback", error: "Translation unavailable" };
  }
};

// ────────────────────────────────────────────────────────────────────────────
// LANGUAGE DETECTION
// ────────────────────────────────────────────────────────────────────────────
const detectLanguageWithAI = async (text) => {
  if (!groq) return "en";
  try {
    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content: "Detect the language of the given text. Respond with ONLY the ISO 639-1 language code (e.g., en, es, fr, de). No explanation.",
        },
        { role: "user", content: text.slice(0, 200) },
      ],
      temperature: 0,
      max_tokens: 5,
    });
    return response.choices[0].message.content.trim().toLowerCase().slice(0, 2);
  } catch {
    return "en";
  }
};

// ────────────────────────────────────────────────────────────────────────────
// EXPLAIN TRANSLATION (AI Feature)
// ────────────────────────────────────────────────────────────────────────────
const explainTranslation = async ({ original, translated, sourceLang, targetLang, tone }) => {
  if (!groq) {
    return { explanation: "AI explanation requires Groq API key. Please add GROQ_API_KEY to .env" };
  }

  const cacheKey = `explain:${original.slice(0, 40)}:${targetLang}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama3-70b-8192",
    messages: [
      {
        role: "system",
        content: `You are a language teacher explaining translations clearly and helpfully.
Provide:
1. Why specific words/phrases were chosen
2. Grammar notes (key differences between languages)
3. Tone analysis (what tone was preserved)
4. 1-2 alternative phrasings if applicable
Keep it concise (under 200 words) and easy to understand.`,
      },
      {
        role: "user",
        content: `Original (${LANGUAGE_NAMES[sourceLang] || sourceLang}): "${original}"
Translation (${LANGUAGE_NAMES[targetLang] || targetLang}): "${translated}"
Tone used: ${tone}

Explain this translation.`,
      },
    ],
    temperature: 0.5,
    max_tokens: 400,
  });

  const result = { explanation: response.choices[0].message.content.trim() };
  cache.set(cacheKey, result);
  return result;
};

// ────────────────────────────────────────────────────────────────────────────
// TEXT ENHANCEMENT (Grammar correction, fluency)
// ────────────────────────────────────────────────────────────────────────────
const enhanceText = async ({ text, language, mode = "fluency" }) => {
  if (!groq) return { enhanced: text, changes: [] };

  const modeInstructions = {
    fluency: "Improve the fluency and natural flow of the text. Fix any awkward phrasing.",
    grammar: "Correct all grammar mistakes while preserving the original meaning exactly.",
    formal: "Rewrite in a more formal, professional tone.",
    casual: "Rewrite in a more casual, conversational tone.",
  };

  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama3-70b-8192",
    messages: [
      {
        role: "system",
        content: `You are an expert in ${LANGUAGE_NAMES[language] || language} language.
Task: ${modeInstructions[mode] || modeInstructions.fluency}
Return JSON: { "enhanced": "improved text", "changes": ["change 1", "change 2"] }`,
      },
      { role: "user", content: text },
    ],
    temperature: 0.4,
    max_tokens: 600,
    response_format: { type: "json_object" },
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch {
    return { enhanced: text, changes: [] };
  }
};

// ────────────────────────────────────────────────────────────────────────────
// EMOTION/TONE DETECTION
// ────────────────────────────────────────────────────────────────────────────
const detectEmotion = async (text) => {
  if (!groq) return { emotion: "neutral", confidence: 0.5 };

  const cacheKey = `emotion:${text.slice(0, 40)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama3-70b-8192",
    messages: [
      {
        role: "system",
        content: `Detect the emotional tone of text. Return JSON: { "emotion": "happy|sad|angry|neutral|excited|fearful|surprised", "confidence": 0.0-1.0, "sentiment": "positive|negative|neutral" }`,
      },
      { role: "user", content: text.slice(0, 500) },
    ],
    temperature: 0,
    max_tokens: 60,
    response_format: { type: "json_object" },
  });

  try {
    const result = JSON.parse(response.choices[0].message.content);
    cache.set(cacheKey, result);
    return result;
  } catch {
    return { emotion: "neutral", confidence: 0.5, sentiment: "neutral" };
  }
};

// ────────────────────────────────────────────────────────────────────────────
// WORD INSIGHTS (Hover definitions, synonyms)
// ────────────────────────────────────────────────────────────────────────────
const getWordInsights = async ({ word, language, context }) => {
  if (!groq) return null;

  const cacheKey = `word:${word}:${language}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama3-70b-8192",
    messages: [
      {
        role: "system",
        content: `Provide word insights in JSON format: { "definition": "brief definition", "synonyms": ["word1","word2","word3"], "partOfSpeech": "noun/verb/etc", "example": "usage example" }`,
      },
      {
        role: "user",
        content: `Word: "${word}" (${LANGUAGE_NAMES[language] || language})${context ? `\nContext: "${context}"` : ""}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 200,
    response_format: { type: "json_object" },
  });

  try {
    const result = JSON.parse(response.choices[0].message.content);
    cache.set(cacheKey, result);
    return result;
  } catch {
    return null;
  }
};

// ────────────────────────────────────────────────────────────────────────────
// ALTERNATIVE PHRASINGS
// ────────────────────────────────────────────────────────────────────────────
const getAlternatives = async ({ text, language, count = 3 }) => {
  if (!groq) return { alternatives: [] };

  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama3-70b-8192",
    messages: [
      {
        role: "system",
        content: `Generate ${count} alternative ways to say the same thing in ${LANGUAGE_NAMES[language] || language}. Return JSON: { "alternatives": ["phrase1", "phrase2", "phrase3"] }`,
      },
      { role: "user", content: text },
    ],
    temperature: 0.7,
    max_tokens: 300,
    response_format: { type: "json_object" },
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch {
    return { alternatives: [] };
  }
};

module.exports = {
  translateText,
  explainTranslation,
  enhanceText,
  detectEmotion,
  getWordInsights,
  getAlternatives,
  detectLanguageWithAI,
  LANGUAGE_NAMES,
  cache,
};
