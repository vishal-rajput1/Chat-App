import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        email:{
            type: String,
            required: true,
            unique: true,
        },
        fullName:{
            type: String,
            required:true,
        },
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^[a-z0-9_]{3,24}$/, "Username must be 3-24 letters, numbers, or underscores"],
        },
        password:{
            type: String,
            required: true,
            minlength: 6,
        },
        profilePic:{
            type: String,
            default: "",
        },
    },
    {timestamps:true}

);

const User = mongoose.model("User", userSchema)

export default User;
