/**
 * In-Memory Store — replaces MongoDB entirely.
 * Data lives only as long as the server process runs.
 */

const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");

// ─── In-memory collections ────────────────────────────────────────────────────
const users = new Map();        // id → user object
const translations = new Map(); // id → translation object

// ─── User helpers ─────────────────────────────────────────────────────────────
const User = {
  async create({ name, email, password }) {
    const id = uuidv4();
    const hashed = await bcrypt.hash(password, 12);
    const user = {
      _id: id,
      name,
      email: email.toLowerCase().trim(),
      password: hashed,
      avatar: "",
      preferredSourceLang: "auto",
      preferredTargetLang: "en",
      preferredTone: "formal",
      customDictionary: [],
      bookmarks: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.set(id, user);
    return sanitizeUser(user);
  },

  async findOne({ email }) {
    for (const u of users.values()) {
      if (u.email === email.toLowerCase().trim()) return u;
    }
    return null;
  },

  async findById(id) {
    return users.get(id) || null;
  },

  async findByIdAndUpdate(id, updates, opts = {}) {
    const user = users.get(id);
    if (!user) return null;
    Object.assign(user, updates, { updatedAt: new Date() });
    users.set(id, user);
    return opts.new ? sanitizeUser(user) : sanitizeUser(user);
  },
};

// ─── Translation helpers ──────────────────────────────────────────────────────
const Translation = {
  async create(data) {
    const id = uuidv4();
    const doc = { _id: id, ...data, createdAt: new Date(), updatedAt: new Date() };
    translations.set(id, doc);
    return doc;
  },

  async find(query = {}) {
    let results = [...translations.values()];
    if (query.userId)         results = results.filter(t => t.userId === query.userId);
    if (query.sessionId)      results = results.filter(t => t.sessionId === query.sessionId);
    if (query.targetLang)     results = results.filter(t => t.targetLang === query.targetLang);
    if (query.isBookmarked)   results = results.filter(t => t.isBookmarked === true);
    if (query.conversationId) results = results.filter(t => t.conversationId === query.conversationId);
    return results;
  },

  async findOne(query = {}) {
    const results = await Translation.find(query);
    return results[0] || null;
  },

  async findOneAndUpdate(query, update, opts = {}) {
    const doc = await Translation.findOne(query);
    if (!doc) return null;
    // Handle toggle bookmark
    if (update.$set?.isBookmarked !== undefined) {
      doc.isBookmarked = update.$set.isBookmarked;
    } else {
      // toggle
      doc.isBookmarked = !doc.isBookmarked;
    }
    doc.updatedAt = new Date();
    translations.set(doc._id, doc);
    return opts.new ? doc : doc;
  },

  async findOneAndDelete(query) {
    const doc = await Translation.findOne(query);
    if (doc) translations.delete(doc._id);
    return doc;
  },

  async deleteMany(query = {}) {
    const docs = await Translation.find(query);
    docs.forEach(d => translations.delete(d._id));
    return { deletedCount: docs.length };
  },

  async countDocuments(query = {}) {
    const results = await Translation.find(query);
    return results.length;
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sanitizeUser(user) {
  const u = { ...user };
  delete u.password;
  return u;
}

// Attach comparePassword helper directly on retrieved user objects
const _origFindOne = User.findOne.bind(User);
User.findOne = async function (query) {
  const user = await _origFindOne(query);
  if (user) {
    user.comparePassword = async (candidate) => bcrypt.compare(candidate, user.password);
    user.toJSON = () => sanitizeUser(user);
  }
  return user;
};

const _origFindById = User.findById.bind(User);
User.findById = async function (id) {
  const user = await _origFindById(id);
  if (user) {
    user.comparePassword = async (candidate) => bcrypt.compare(candidate, user.password);
    user.toJSON = () => sanitizeUser(user);
  }
  return user;
};

// Placeholder — not used but keeps imports from crashing
const Conversation = {
  async create() {},
  async find() { return []; },
};

module.exports = { User, Translation, Conversation };
