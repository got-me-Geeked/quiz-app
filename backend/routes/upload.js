const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const MAX_IMAGE_MB = 5;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg"];
const ALLOWED_EXT = [".png", ".jpg", ".jpeg"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // уникальное имя: случайные байты + оригинальное расширение (в нижнем регистре)
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString("hex") + ext;
    cb(null, name);
  },
});

function fileFilter(req, file, cb) {
  const extOk = ALLOWED_EXT.includes(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimeOk = ALLOWED_MIME.includes(file.mimetype);
  if (extOk && mimeOk) return cb(null, true);
  cb(new Error("INVALID_TYPE"));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 }, // лимит размера на сервере
});

// POST /api/upload
router.post("/", requireAuth, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ error: `Картинка больше ${MAX_IMAGE_MB} МБ` });
      }
      if (err.message === "INVALID_TYPE") {
        return res.status(400).json({ error: "Только PNG, JPG, JPEG" });
      }
      console.error("upload error:", err);
      return res.status(500).json({ error: "Ошибка загрузки файла" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Файл не получен" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    return res.json({ imageUrl });
  });
});

module.exports = router;
