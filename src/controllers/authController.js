/**
 * Auth Controller - JWT-based authentication (in-memory store)
 */

const jwt = require("jsonwebtoken");
const { User } = require("../models");

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET || "secret", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// ─── Register ──────────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
};

// ─── Login ──────────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user._id);
    const { password: _p, comparePassword: _c, toJSON: _t, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    next(err);
  }
};

// ─── Get Profile ────────────────────────────────────────────────────────────
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password: _p, comparePassword: _c, toJSON: _t, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
};

// ─── Update Preferences ─────────────────────────────────────────────────────
exports.updatePreferences = async (req, res, next) => {
  try {
    const { preferredSourceLang, preferredTargetLang, preferredTone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { preferredSourceLang, preferredTargetLang, preferredTone },
      { new: true }
    );
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// ─── Add Custom Dictionary Entry ────────────────────────────────────────────
exports.addDictionaryEntry = async (req, res, next) => {
  try {
    const { original, preferred, lang } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.customDictionary.push({ original, preferred, lang });
    await User.findByIdAndUpdate(req.user._id, { customDictionary: user.customDictionary });
    res.json({ customDictionary: user.customDictionary });
  } catch (err) {
    next(err);
  }
};
