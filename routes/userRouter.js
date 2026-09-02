let express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const {
  postAddUser,
  getUser,
  postLogin,
  logOut,
  updateProfile,
  // <--- If this is undefined in user.controller.js, Express throws this exact error
  uploadAvatar,
} = require("../controllers/user.controller");

let userRouter = express.Router();

// Ensure uploads directory exists before storage starts
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Helper function for unique filenames
const randomString = (length) => {
  const characters = "abcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Preserves original extension cleanly
    const ext = path.extname(file.originalname);
    const cleanName = path
      .basename(file.originalname, ext)
      .replace(/\s+/g, "-");
    cb(null, `${randomString(10)}-${cleanName}${ext}`);
  },
});

// File filter validation for images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

// Routes
userRouter.post("/addUser", upload.single("avatar"), postAddUser);
userRouter.get("/getUser", getUser);
userRouter.post("/login", postLogin);
userRouter.post("/logout", logOut);
userRouter.post("/profile-update/:id", updateProfile);

// Avatar Upload Endpoint
userRouter.post(
  "/upload-avatar/:userId",
  upload.single("avatar"),
  uploadAvatar,
);

module.exports = userRouter;
