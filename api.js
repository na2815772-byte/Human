/* =====================================================
   NELOY AI VOICE ASSISTANT
   FILE: backend/api.js

   FEATURES:
   1. Gemini + Groq AI responses
   2. Separate model results
   3. 24-hour usage lock
   4. Automatic provider fallback
   5. AI identity question detection
   6. English default response
===================================================== */

"use strict";

const express = require("express");
const router = express.Router();

const {
  GoogleGenerativeAI
} = require("@google/generative-ai");

const Groq = require("groq-sdk");

// ==========================================
// CONFIGURATION
// ==========================================

const CONFIG = {
  GEMINI_MODEL: "gemini-2.5-flash",
  GROQ_MODEL: "llama-3.3-70b-versatile",

  LOCK_DURATION: 24 * 60 * 60 * 1000,

  MAX_REQUESTS: {
    gemini: 50,
    groq: 50
  },

  IDENTITY_ANSWER:
    "I am an AI, an Artificial Intelligence presented by Neloy.",

  LIMIT_MESSAGE:
    "Your usage limit has been reached. Please try again after 24 hours."
};

// ==========================================
// API KEYS
// ==========================================

const geminiKey = process.env.GEMINI_API_KEY;
const groqKey = process.env.GROQ_API_KEY;

const gemini = geminiKey
  ? new GoogleGenerativeAI(geminiKey)
  : null;

const groq = groqKey
  ? new Groq({ apiKey: groqKey })
  : null;

// ==========================================
// USAGE STORAGE
// ==========================================

// IMPORTANT:
// This in-memory storage is suitable for testing only.
// For production, use a database such as MongoDB or PostgreSQL.

const usageStore = new Map();

// ==========================================
// GET USER ID
// ==========================================

function getUserId(req) {

  if (!req.user || !req.user.id) {
    return null;
  }

  return String(req.user.id);

}

// ==========================================
// GET USER USAGE
// ==========================================

function getUsage(userId) {

  if (!usageStore.has(userId)) {

    usageStore.set(userId, {

      gemini: {
        requests: 0,
        exhausted: false
      },

      groq: {
        requests: 0,
        exhausted: false
      },

      lockedUntil: null

    });

  }

  return usageStore.get(userId);

}

// ==========================================
// CHECK 24-HOUR LOCK
// ==========================================

function checkUsageLock(usage) {

  const now = Date.now();

  if (
    usage.lockedUntil &&
    now < usage.lockedUntil
  ) {

    return {
      locked: true,
      lockedUntil: usage.lockedUntil
    };

  }

  // Reset after 24 hours.
  if (
    usage.lockedUntil &&
    now >= usage.lockedUntil
  ) {

    usage.gemini.requests = 0;
    usage.gemini.exhausted = false;

    usage.groq.requests = 0;
    usage.groq.exhausted = false;

    usage.lockedUntil = null;

  }

  return {
    locked: false,
    lockedUntil: null
  };

}

// ==========================================
// CHECK PROVIDER AVAILABILITY
// ==========================================

function isAvailable(usage, provider) {

  const providerUsage = usage[provider];

  if (!providerUsage) return false;

  return (
    !providerUsage.exhausted &&
    providerUsage.requests < CONFIG.MAX_REQUESTS[provider]
  );

}

// ==========================================
// MARK PROVIDER QUOTA EXHAUSTED
// ==========================================

function exhaustProvider(usage, provider) {

  usage[provider].exhausted = true;

}

// ==========================================
// CHECK BOTH PROVIDERS
// ==========================================

function bothProvidersExhausted(usage) {

  return (
    !isAvailable(usage, "gemini") &&
    !isAvailable(usage, "groq")
  );

}

// ==========================================
// ACTIVATE 24-HOUR LOCK
// ==========================================

function activateLock(usage) {

  if (bothProvidersExhausted(usage)) {

    usage.lockedUntil =
      Date.now() + CONFIG.LOCK_DURATION;

  }

}

// ==========================================
// IDENTITY QUESTION DETECTOR
// ==========================================

function normalizeQuestion(text) {

  return String(text || "")
    .toLowerCase()
    .replace(/[?!.,'"`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

}

function isIdentityQuestion(question) {

  const text = normalizeQuestion(question);

  const patterns = [

    // Who are you?
    /\bwho are you\b/,
    /\bwhat are you\b/,
    /\bwho is this\b/,
    /\bwho am i talking to\b/,

    // AI identity
    /\bare you an? ai\b/,
    /\bare you artificial intelligence\b/,
    /\bare you a robot\b/,
    /\bare you a chatbot\b/,
    /\bare you human\b/,
    /\bare you real\b/,

    // Creator / presentation
    /\bwho created you\b/,
    /\bwho made you\b/,
    /\bwho developed you\b/,
    /\bwho presented you\b/,
    /\bwho is your creator\b/,
    /\bwho is your owner\b/,

    // Bangla questions
    /তুমি কে/,
    /আপনি কে/,
    /তোমার পরিচয়/,
    /তোমার পরিচয়/,
    /কে তোমাকে তৈরি/,
    /কে বানিয়েছে/,
    /কে বানিয়েছে/,
    /তুমি কি এআই/,
    /তুমি কি রোবট/,
    /তুমি কি মানুষ/,
    /তুমি কি কৃত্রিম বুদ্ধিমত্তা/,

    // Bangla-English mixed
    /\btumi ke\b/,
    /\btomar porichoy\b/,
    /\btumi ki ai\b/,
    /\btumi ki robot\b/,
    /\btomake ke baniyeche\b/,
    /\bke tomake create koreche\b/

  ];

  return patterns.some(pattern => pattern.test(text));

}

// ==========================================
// GEMINI REQUEST
// ==========================================

async function askGemini(question, answerLanguage) {

  if (!gemini) {

    throw new Error("Gemini API key is missing.");

  }

  const model = gemini.getGenerativeModel({

    model: CONFIG.GEMINI_MODEL

  });

  const prompt = `

You are NELOY AI VOICE ASSISTANT.

Answer the user's question clearly and helpfully.

Default answer language: English.

If the user explicitly requests Bangla, answer in Bangla.

If the user speaks Bangla or mixed Bangla-English
without requesting Bangla, answer in English.

Answer language preference: ${answerLanguage}

User question:
${question}

`;

  const result = await model.generateContent(prompt);

  return result.response.text();

}

// ==========================================
// GROQ REQUEST
// ==========================================

async function askGroq(question, answerLanguage) {

  if (!groq) {

    throw new Error("Groq API key is missing.");

  }

  const completion = await groq.chat.completions.create({

    model: CONFIG.GROQ_MODEL,

    messages: [

      {
        role: "system",

        content:
          "You are NELOY AI VOICE ASSISTANT. Answer clearly. Default to English unless the user explicitly requests Bangla."
      },

      {
        role: "user",

        content:
          `Answer language: ${answerLanguage}\nQuestion: ${question}`
      }

    ],

    temperature: 0.7,

    max_tokens: 1024

  });

  return completion.choices[0].message.content;

}

// ==========================================
// DETECT PROVIDER QUOTA ERRORS
// ==========================================

function isQuotaError(error) {

  const status = error.status || error.statusCode;

  const message = String(
    error.message || ""
  ).toLowerCase();

  return (
    status === 429 ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource exhausted") ||
    message.includes("too many requests")
  );

}

// ==========================================
// RUN PROVIDER
// ==========================================

async function runProvider(
  usage,
  provider,
  question,
  answerLanguage
) {

  if (!isAvailable(usage, provider)) {

    return {
      status: "error",
      error: "Provider unavailable or quota exhausted."
    };

  }

  usage[provider].requests++;

  try {

    let answer;

    if (provider === "gemini") {

      answer = await askGemini(
        question,
        answerLanguage
      );

    } else {

      answer = await askGroq(
        question,
        answerLanguage
      );

    }

    return {
      status: "success",
      answer: answer
    };

  } catch (error) {

    console.error(
      provider.toUpperCase() + " ERROR:",
      error.message
    );

    if (isQuotaError(error)) {

      exhaustProvider(usage, provider);

    }

    return {
      status: "error",
      error: isQuotaError(error)
        ? "Provider quota exhausted."
        : "Provider request failed."
    };

  }

}

// ==========================================
// MAIN CHAT API
// ==========================================

router.post("/chat", async (req, res) => {

  try {

    // ======================================
    // AUTHENTICATION
    // ======================================

    const userId = getUserId(req);

    if (!userId) {

      return res.status(401).json({

        success: false,

        message: "Please login first."

      });

    }

    const question = String(
      req.body.message || ""
    ).trim();

    const answerLanguage =
      req.body.answerLanguage === "bangla"
        ? "bangla"
        : "english";

    if (!question) {

      return res.status(400).json({

        success: false,

        message: "Please enter a question."

      });

    }

    if (question.length > 5000) {

      return res.status(400).json({

        success: false,

        message: "Your message is too long."

      });

    }

    // ======================================
    // IDENTITY QUESTIONS
    // ======================================

    if (isIdentityQuestion(question)) {

      return res.status(200).json({

        success: true,

        provider: "system",

        answer: CONFIG.IDENTITY_ANSWER,

        results: {
          gemini: {
            status: "skipped",
            answer: null
          },

          groq: {
            status: "skipped",
            answer: null
          }
        }

      });

    }

    // ======================================
    // USER USAGE
    // ======================================

    const usage = getUsage(userId);

    const lock = checkUsageLock(usage);

    // ======================================
    // 24-HOUR LOCK CHECK
    // ======================================

    if (lock.locked) {

      return res.status(429).json({

        success: false,

        locked: true,

        lockedUntil: lock.lockedUntil,

        message: CONFIG.LIMIT_MESSAGE,

        results: {
          gemini: {
            status: "quota_exhausted"
          },

          groq: {
            status: "quota_exhausted"
          }
        }

      });

    }

    // ======================================
    // CHECK BOTH PROVIDERS
    // ======================================

    if (bothProvidersExhausted(usage)) {

      activateLock(usage);

      return res.status(429).json({

        success: false,

        locked: true,

        lockedUntil: usage.lockedUntil,

        message: CONFIG.LIMIT_MESSAGE

      });

    }

    // ======================================
    // CALL GEMINI AND GROQ
    // ======================================

    const [geminiResult, groqResult] =
      await Promise.all([

        runProvider(
          usage,
          "gemini",
          question,
          answerLanguage
        ),

        runProvider(
          usage,
          "groq",
          question,
          answerLanguage
        )

      ]);

    // ======================================
    // CHECK QUOTA AFTER REQUESTS
    // ======================================

    if (bothProvidersExhausted(usage)) {

      activateLock(usage);

    }

    // ======================================
    // SELECT MAIN ANSWER
    // ======================================

    let answer = "";
    let provider = "";

    if (
      geminiResult.status === "success" &&
      geminiResult.answer
    ) {

      answer = geminiResult.answer;
      provider = "gemini";

    } else if (
      groqResult.status === "success" &&
      groqResult.answer
    ) {

      answer = groqResult.answer;
      provider = "groq";

    }

    // ======================================
    // BOTH PROVIDERS FAILED
    // ======================================

    if (!answer) {

      if (bothProvidersExhausted(usage)) {

        activateLock(usage);

        return res.status(429).json({

          success: false,

          locked: true,

          lockedUntil: usage.lockedUntil,

          message: CONFIG.LIMIT_MESSAGE,

          results: {
            gemini: {
              status: "error",
              error: geminiResult.error
            },

            groq: {
              status: "error",
              error: groqResult.error
            }
          }

        });

      }

      return res.status(503).json({

        success: false,

        message:
          "Both AI requests failed. Please try again.",

        results: {
          gemini: geminiResult,
          groq: groqResult
        }

      });

    }

    // ======================================
    // SUCCESS RESPONSE
    // ======================================

    return res.status(200).json({

      success: true,

      provider: provider,

      answer: answer,

      results: {

        gemini: geminiResult,

        groq: groqResult

      },

      usage: {

        gemini: usage.gemini.requests,

        groq: usage.groq.requests

      }

    });

  } catch (error) {

    console.error("CHAT API ERROR:", error);

    return res.status(500).json({

      success: false,

      message:
        "An internal server error occurred."

    });

  }

});

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
