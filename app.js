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

const MONGO_URL =
  "mongodb+srv://mern:mern@mernjourney.hiqnndy.mongodb.net/taskManager?retryWrites=true&w=majority&appName=MernJourney";
let Port = 3001;

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
      secure: false,
      sameSite: "lax",
    },
  }),
);

// 6. Debugging Middleware
app.use((req, res, next) => {
  console.log("=================================");
  console.log("PATH:", req.path);
  console.log("METHOD:", req.method);
  console.log("Session ID:", req.sessionID);
  console.log("Is Logged In:", req.session?.isLoggedIn);
  console.log("User:", req.session?.user);
  console.log("Cookies:", req.headers.cookie);
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

// 10. Server Initialization
mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("Mongodb is Connected");
    app.listen(Port, "0.0.0.0", () => {
      console.log(`Server is running at http://192.168.100.9:${Port}`);
    });
  })
  .catch((err) => {
    console.log("Error while connecting Mongodb", err);
  });
