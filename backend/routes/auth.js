const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = "7d";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[\p{L}\p{N}_]+$/u;

function validateRegister({ email, password, username }) {
  if (!email || !password || !username) {
    return "Все поля обязательны";
  }
  if (!EMAIL_RE.test(email)) {
    return "Некорректный формат email";
  }
  if (username.length < 3) {
    return "Имя пользователя должно быть не короче 3 символов";
  }
  if (!USERNAME_RE.test(username)) {
    return "Имя пользователя может содержать только буквы, цифры и нижнее подчёркивание";
  }
  if (password.length < 8) {
    return "Пароль должен быть не короче 8 символов";
  }
  if (!/\p{Lu}/u.test(password)) {
    return "Пароль должен содержать хотя бы одну заглавную букву";
  }
  if (!/[0-9]/.test(password)) {
    return "Пароль должен содержать хотя бы одну цифру";
  }
  return null;
}

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, username } = req.body || {};
    const validationError = validateRegister({ email, password, username });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ error: "Этот email уже занят" });
    }
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      return res.status(400).json({ error: "Это имя пользователя уже занято" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, username, passwordHash },
    });

    const token = signToken(user.id);
    return res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    const token = signToken(user.id);
    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(401).json({ error: "Пользователь не найден" });
    }
    return res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

module.exports = router;
