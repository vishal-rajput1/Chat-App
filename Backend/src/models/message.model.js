import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiverId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text:{
            type: String,
        },
        image:{
            type: String,
        },
        edited: {
  type: Boolean,
  default: false,
},

deleted: {
  type: Boolean,
  default: false,
},
seen: {
    type: Boolean,
    default: false
},

delivered: {
    type: Boolean,
    default: false
},
        replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "message", default: null },
        reactions: [{
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
          emoji: { type: String, required: true, maxlength: 16 },
        }],
        audio: { type: String, default: "" },
    },
        {
            timestamps: true
        },
        
    
);

const message = mongoose.model("message", messageSchema);

export default message;
