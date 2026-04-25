/**
 * OCR Controller - Image → Text → AI Translation
 * Uses Tesseract.js for browser-side fallback + server-side processing
 */

const path = require("path");
const fs = require("fs");
const multer = require("multer");
const Tesseract = require("tesseract.js");

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

exports.uploadMiddleware = upload.single("image");

// ─── OCR Extract Text ────────────────────────────────────────────────────────
exports.extractText = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const imagePath = req.file.path;
    const { lang = "eng" } = req.body;

    console.log(`🔍 OCR processing: ${req.file.filename}`);

    // Run Tesseract OCR
    const result = await Tesseract.recognize(imagePath, lang, {
      logger: () => {}, // Suppress logs
    });

    // Clean up uploaded file after processing
    fs.unlink(imagePath, () => {});

    const extractedText = result.data.text.trim();
    const confidence = result.data.confidence;

    if (!extractedText) {
      return res.status(422).json({
        error: "No text found in image. Please try a clearer image.",
        confidence: 0,
      });
    }

    res.json({
      text: extractedText,
      confidence: Math.round(confidence),
      words: result.data.words?.length || 0,
    });
  } catch (err) {
    next(err);
  }
};
