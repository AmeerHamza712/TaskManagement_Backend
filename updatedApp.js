const { urlencoded } = require("body-parser");
let mongoose = require("mongoose");
let express = require("express");
let session = require("express-session");
let MongodbStore = require("connect-mongodb-session")(session);
let userRouter = require("./routes/userRouter");
const teamRouter = require("./routes/teamRouter");
const taskRouter = require("./routes/taskRouter");
let cors = require("cors");
let path = require("path");
let app = express();
let rootDir = require("./utils/pathUtil");

// 1. CORS Configuration
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

// 2. Global Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Static File Serving
app.use(express.static(path.join(rootDir, "public")));
app.use("/uploads", express.static(path.join(rootDir, "uploads")));

const MONGO_URL =
  "mongodb+srv://mern:mern@mernjourney.hiqnndy.mongodb.net/taskManager?retryWrites=true&w=majority&appName=MernJourney";
let Port = 3001;

// 4. Database Connection FIRST
mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("Mongodb is Connected");

    // 5. ✅ Create session store AFTER MongoDB is connected
    const store = MongodbStore({
      uri: MONGO_URL,
      collection: "sessions",
      expires: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Handle store errors
    store.on("error", function (error) {
      console.error("Session store error:", error);
    });

    // 6. ✅ Session Configuration with cookie settings
    app.use(
      session({
        secret: "mySecretKey",
        resave: false,
        saveUninitialized: false,
        store,
        cookie: {
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          httpOnly: true,
          secure: false, // Set to true in production with HTTPS
          sameSite: "lax",
        },
      }),
    );

    // 7. 🔍 DEBUGGING MIDDLEWARE - See what's happening with sessions
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

    // 8. Auth Check Route
    app.get("/me", (req, res) => {
      if (!req.session.user) {
        return res.status(401).json({ error: "UnAuthorized" });
      }
      res.json({
        user: req.session.user,
        role: req.session.role,
        email: req.session.email,
      });
    });

    // 9. 🔍 Debug route to check sessions in MongoDB
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

    // 10. Application Routes
    app.use(userRouter);
    app.use(taskRouter);
    app.use(teamRouter);

    console.log("app.js is running");

    // 11. Start Server
    app.listen(Port, () => {
      console.log("Server is running at Port ", Port);
    });
  })
  .catch((err) => {
    console.log("Error while connecting Mongodb", err);
  });
