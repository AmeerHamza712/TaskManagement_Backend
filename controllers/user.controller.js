let User = require("../models/user.model");
let Invitation = require("../models/invitation.model");

exports.getUser = async (req, res) => {
  try {
    const users = await User.find();
    console.log("Get User");
    res.send(users);
  } catch (err) {
    console.log(err);
    res.status(500).send("Something went wrong");
  }
};

exports.postAddUser = (req, res, next) => {
  console.log("🔥🔥🔥 THIS IS THE NEW CONTROLLER FILE 🔥🔥🔥");

  const { name, email, password, title, bio } = req.body;

  // Check if a file was uploaded by Multer
  // Normalizes slashes so URLs work cleanly across Windows/Linux
  const avatarPath = req.file ? `/uploads/${req.file.filename}` : "";
  console.log("Admin are comming to Add user");

  const newUser = new User({
    name,
    email,
    password,
    profile: {
      avatar: avatarPath,
      title: title || "Team Member",
      bio: bio || "",
    },
  });

  newUser
    .save()
    .then((savedUser) => {
      console.log("New user added successfully:", savedUser);
      res.status(201).json({
        message: "User added successfully!",
        user: savedUser,
      });
    })
    .catch((err) => {
      console.log("Error occurred while adding new User:", err);
      res
        .status(500)
        .json({ error: "Failed to add user", details: err.message });
    });
};
exports.postLogin = async (req, res) => {
  console.log("Login Started");
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const found = await User.findOne({ email });

    if (!found) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 2. Direct plain text password comparison
    if (password !== found.password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 3. Set up session variables (Standardized to req.session.user)
    req.session.isLoggedIn = true;
    req.session.role = found.role || "member";
    req.session.email = found.email;
    req.session.user = found._id.toString();
    req.session.name = found.name;
    req.session.avatar = found.profile.avatar;

    console.log("Session before save:", req.session);

    // 4. Save session and respond
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Session save failed" });
      }
      console.log("Login successful");
      res.json({ message: "Login successful" });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
exports.logOut = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};
// exports.updateProfile = async (req, res) => {
//   try {
//     let { id } = req.params;
//     let { name, email } = req.body;
//     let user = User.findOne({ _id: id });
//     if (!user) {
//       return res
//         .status(404)
//         .json({ message: "User does not exit ? SignUp First" });
//     }
//     await user
//       .updateOne({}, { set: { name, email } })
//       .then(() => {
//         res.status(200).json({ message: "Profile updated successfuly" });
//       })
//       .catch((error) => {
//         res.status(404).json({
//           message: "Error while profile Updataion",
//           error,
//         });
//       });
//   } catch (error) {
//     res.status(500).json({
//       message: "Network Error",
//       error,
//     });
//   }
// };
exports.updateProfile = async (req, res) => {
  try {
    console.log("Updaeprofile is calling");
    let { id } = req.params;
    let { name, email } = req.body;

    // 1. Find and update the user in a single step
    // { new: true } returns the updated document, { runValidators: true } ensures schema validation rules apply
    let updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { name, email } },
      { returnDocument: "after", runValidators: true },
    );

    // 2. If no user matches the ID
    if (!updatedUser) {
      return res
        .status(404)
        .json({ message: "User does not exist? SignUp First" });
    }

    // 3. Success response
    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error while profile updating",
      error: error.message, // Sending error.message prevents breaking JSON structures
    });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "No avatar image uploaded." });
    }

    // Normalize slashes for static path resolution
    const avatarPath = `/uploads/${req.file.filename}`;

    // Update nested profile.avatar field
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { "profile.avatar": avatarPath } },
      { returnDocument: "after", runValidators: true },
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Keep session avatar in sync if active session exists
    if (req.session && req.session.user === userId) {
      req.session.avatar = avatarPath;
    }

    return res.status(200).json({
      message: "Avatar uploaded successfully",
      avatar: avatarPath,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return res.status(500).json({
      message: "Failed to upload avatar",
      error: error.message,
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Server Error" });
  }
};
