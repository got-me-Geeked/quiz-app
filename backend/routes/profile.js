const express = require("express");
const { requireAuth } = require("../middleware/auth");
const prisma = require("../prisma");

const router = express.Router();

// GET /api/profile
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { username: true, email: true },
    });
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    res.json({ profile: user });
  } catch (err) {
    console.error("profile error:", err);
    res.status(500).json({ error: "Не удалось загрузить профиль" });
  }
});

module.exports = router;
