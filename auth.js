const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

// JWT_SECRET অবশ্যই .env ফাইলে রাখতে হবে।
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from environment variables.");
}

// Token তৈরি করার ফাংশন
function createToken(user) {
  if (!user || !user.id) {
    throw new Error("A valid user ID is required to create a token.");
  }

  return jwt.sign(
    {
      id: String(user.id),
      email: user.email || ""
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

// Cookie-তে Token সংরক্ষণ
function setAuthCookie(res, token) {
  res.cookie("neloy_auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
  });
}

// Authentication Middleware
function requireAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";

    const bearerToken = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

    const cookieToken = req.cookies?.neloy_auth;

    const token = bearerToken || cookieToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "Please log in first."
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.id,
      email: decoded.email || ""
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      message: "Your session is invalid or has expired. Please log in again."
    });
  }
}

// Check Login Session
router.get("/me", requireAuth, (req, res) => {
  res.json({
    success: true,
    authenticated: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName || ""
    }
  });
});

// Logout
router.post("/logout", (req, res) => {
  res.clearCookie("neloy_auth", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });

  res.json({
    success: true,
    message: "You have been logged out."
  });
});

module.exports = {
  router,
  requireAuth,
  createToken,
  setAuthCookie
};
