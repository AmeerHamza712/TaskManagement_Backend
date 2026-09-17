const { urlencoded } = require("body-parser");
let mongoose = require("mongoose");
let express = require("express");
let session = require("express-session");
let MongodbStore = require("connect-mongodb-session")(session);
let userRouter = require("./routes/userRouter");
const teamRouter = require("./routes/teamRouter");
const taskRouter = require("./routes/taskRouter");
const notificationRouter = require("./routes/notificationRouter");
const invitationRoutes = require("./routes/invitationRouter");
const searchRouter = require("./routes/searchRouter");
let cors = require("cors");
let path = require("path");
let app = express();
let rootDir = require("./utils/pathUtil");
require("dotenv").config();

const MONGO_URL = process.env.MONGODB_URL;
const _dirname = path.resolve();

// 1. CORS Configuration
const allowedOrigins = ["http://localhost:5173", "http://192.168.100.9:5173"];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  }),
);

// 2. Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Static Files
app.use(express.static(path.join(rootDir, "public")));
app.use("/uploads", express.static(path.join(rootDir, "uploads")));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(express.static(path.join(_dirname, "/toDoApp/dist")));

// 4. Session Store Setup
const store = new MongodbStore({
  uri: MONGO_URL,
  collection: "sessions",
  expires: 7 * 24 * 60 * 60 * 1000,
});

store.on("error", function (error) {
  console.error("Session store error:", error);
});

// 5. Session Configuration
app.use(
  session({
    secret: "mySecretKey",
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  }),
);

// 6. Debugging Middleware
app.use((req, res, next) => {
  console.log("=================================");
  console.log("PATH:", req.path);
  console.log("METHOD:", req.method);
  console.log("Session ID:", req.sessionID);
  console.log("=================================");
  next();
});

// 7. Auth Check Route
app.get("/me", (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: "UnAuthorized" });
  }

  res.json({
    user: {
      _id: req.session.user,
      role: req.session.role,
      email: req.session.email,
      name: req.session.name,
      avatar: req.session.avatar,
    },
  });
});

// 8. Session Debug Route
app.get("/debug/sessions", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const sessions = await db.collection("sessions").find({}).toArray();
    res.json({
      count: sessions.length,
      sessions: sessions.map((s) => ({
        id: s._id,
        expires: s.expires,
        sessionData: s.session,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Application Routes
app.use(userRouter);
app.use(taskRouter);
app.use(teamRouter);
app.use(notificationRouter);
app.use(searchRouter);
app.use("/api/invitations", invitationRoutes);

app.use((req, res) => {
  res.sendFile(path.resolve(_dirname, "toDoApp", "dist", "index.html"));
});

// 10. Database Connection & Server Startup (Dual Mode)
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(MONGO_URL);
    isConnected = true;
    console.log("Mongodb is Connected");
  } catch (err) {
    console.log("Error while connecting Mongodb", err);
    throw err;
  }
}

// Serverless middleware for Vercel requests
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Local Development Server (Ignored on Vercel)
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running locally at http://localhost:${PORT}`);
    });
  });
}

// 11. CRITICAL FOR VERCEL
module.exports = app;
