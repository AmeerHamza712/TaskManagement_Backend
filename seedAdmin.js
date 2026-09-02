const mongoose = require("mongoose");
const User = require("./models/user.model");
const MONGO_URL =
  "mongodb+srv://mern:mern@mernjourney.hiqnndy.mongodb.net/taskManager?retryWrites=true&w=majority&appName=MernJourney";
mongoose
  .connect(MONGO_URL)
  .then(async () => {
    const admin = new User({
      name: "Admin",
      email: "admin@gmail.com",
      password: "admin123",
      role: "admin",
    });

    await admin.save();

    console.log("Admin created");
    process.exit();
  })
  .catch(console.error);
