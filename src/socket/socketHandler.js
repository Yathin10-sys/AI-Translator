/**
 * Socket.io Handler - Real-time Conversation Mode
 * Two users can chat in different languages; AI translates both sides instantly.
 */

const { v4: uuidv4 } = require("uuid");
const { translateText } = require("../services/aiService");
const { Translation } = require("../models"); // in-memory store

// Track conversation rooms
const rooms = new Map();

const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ── Create or Join Conversation Room ───────────────────────────────────
    socket.on("join_room", ({ roomId, userName, language }) => {
      const room = roomId || uuidv4();

      if (!rooms.has(room)) {
        rooms.set(room, {
          id: room,
          participants: [],
          context: [], // Conversation context for AI
        });
      }

      const roomData = rooms.get(room);

      // Max 2 participants per room
      if (roomData.participants.length >= 2) {
        socket.emit("room_full", { message: "Room is full (max 2 participants)" });
        return;
      }

      // Add participant
      const participantNum = roomData.participants.length + 1;
      const participant = {
        socketId: socket.id,
        name: userName || `User ${participantNum}`,
        language: language || "en",
        role: `user${participantNum}`,
      };

      roomData.participants.push(participant);
      socket.join(room);
      socket.roomId = room;
      socket.language = language;
      socket.userName = participant.name;
      socket.role = participant.role;

      // Notify room of updated participants
      io.to(room).emit("room_joined", {
        roomId: room,
        participants: roomData.participants.map((p) => ({
          name: p.name,
          language: p.language,
          role: p.role,
        })),
        yourRole: participant.role,
      });

      console.log(`👥 ${participant.name} joined room ${room} (${language})`);
    });

    // ── Live Conversation Message ───────────────────────────────────────────
    socket.on("send_message", async ({ text, roomId }) => {
      const room = rooms.get(roomId || socket.roomId);
      if (!room || !text?.trim()) return;

      const sender = room.participants.find((p) => p.socketId === socket.id);
      if (!sender) return;

      // Find the OTHER participant to determine target language
      const other = room.participants.find((p) => p.socketId !== socket.id);
      const targetLang = other?.language || "en";
      const sourceLang = sender.language || "auto";

      // Broadcast original message immediately (no lag)
      io.to(roomId || socket.roomId).emit("message", {
        id: uuidv4(),
        senderName: sender.name,
        senderRole: sender.role,
        originalText: text,
        sourceLang,
        targetLang,
        timestamp: new Date().toISOString(),
        isTranslating: true, // Tell UI translation is in progress
      });

      try {
        // Translate using AI with conversation context
        const result = await translateText({
          text,
          sourceLang,
          targetLang,
          tone: "casual",
          context: room.context.slice(-5), // Last 5 exchanges as context
        });

        const messageId = uuidv4();

        // Update context
        room.context.push({ original: text, translated: result.translation });
        if (room.context.length > 20) room.context.shift(); // Keep context manageable

        // Send translated message to ALL in room
        io.to(roomId || socket.roomId).emit("message_translated", {
          id: messageId,
          senderName: sender.name,
          senderRole: sender.role,
          originalText: text,
          translatedText: result.translation,
          sourceLang,
          detectedLang: result.detectedLang,
          targetLang,
          timestamp: new Date().toISOString(),
        });

        // Save to DB (fire and forget)
        Translation.create({
          originalText: text,
          translatedText: result.translation,
          sourceLang,
          detectedLang: result.detectedLang,
          targetLang,
          tone: "casual",
          model: result.model,
          conversationId: roomId || socket.roomId,
          speakerRole: sender.role,
        }).catch(() => {});
      } catch (err) {
        socket.emit("translation_error", { error: "Translation failed. Please try again." });
      }
    });

    // ── Typing Indicator ────────────────────────────────────────────────────
    socket.on("typing", ({ roomId, isTyping }) => {
      socket.to(roomId || socket.roomId).emit("partner_typing", {
        name: socket.userName,
        isTyping,
      });
    });

    // ── Language Change ─────────────────────────────────────────────────────
    socket.on("change_language", ({ roomId, language }) => {
      const room = rooms.get(roomId || socket.roomId);
      if (room) {
        const participant = room.participants.find((p) => p.socketId === socket.id);
        if (participant) {
          participant.language = language;
          socket.language = language;
          io.to(roomId || socket.roomId).emit("language_changed", {
            role: socket.role,
            name: socket.userName,
            language,
          });
        }
      }
    });

    // ── Disconnect ──────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const roomId = socket.roomId;
      if (roomId && rooms.has(roomId)) {
        const room = rooms.get(roomId);
        room.participants = room.participants.filter((p) => p.socketId !== socket.id);

        if (room.participants.length === 0) {
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit("partner_left", {
            name: socket.userName,
            message: `${socket.userName || "Partner"} has left the conversation`,
          });
        }
      }
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = initializeSocket;
