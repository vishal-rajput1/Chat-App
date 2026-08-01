import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import { sendLoginEmail } from "../lib/email.js";

export const signup = async (req, res) => {
  const { fullName, username, email, password } = req.body;
  try {
    if (!fullName || !username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const user = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: normalizedUsername }] });

    if (user) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      username: normalizedUsername,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    if (newUser) {
      // generate jwt token here
      generateToken(newUser._id, res);
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        username: newUser.username,
        email: newUser.email,
        profilePic: newUser.profilePic,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);
    sendLoginEmail(user).catch((emailError) => console.warn("Login email failed:", emailError.message));

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { fullName, username, email, profilePic } = req.body;
    const userId = req.user._id;

    // Find the current user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update full name if provided
    if (fullName) {
      user.fullName = fullName;
    }

    if (username && username.trim().toLowerCase() !== user.username) {
      const normalizedUsername = username.trim().toLowerCase();
      const existingUsername = await User.findOne({ username: normalizedUsername, _id: { $ne: userId } });
      if (existingUsername) return res.status(400).json({ message: "Username already exists" });
      user.username = normalizedUsername;
    }

    // Update email if provided
    if (email) {
      // Prevent duplicate emails
      const existingUser = await User.findOne({
        email,
        _id: { $ne: userId },
      });

      if (existingUser) {
        return res.status(400).json({
          message: "Email already exists",
        });
      }

      user.email = email;
    }

    // Update profile picture if provided
    if (profilePic) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic);

      user.profilePic = uploadResponse.secure_url;
    }

    await user.save();

    res.status(200).json(user);
  } catch (error) {
    console.log("Error in updateProfile:", error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Current and new passwords are required" });
    if (newPassword.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters" });
    const user = await User.findById(req.user._id);
    const isCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isCorrect) return res.status(400).json({ message: "Current password is incorrect" });
    if (await bcrypt.compare(newPassword, user.password)) return res.status(400).json({ message: "New password must be different" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error.message);
    res.status(500).json({ message: "Unable to change password" });
  }
};
