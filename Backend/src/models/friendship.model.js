import mongoose from "mongoose";

const friendshipSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted"], default: "pending" },
}, { timestamps: true });
friendshipSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });
export default mongoose.model("Friendship", friendshipSchema);
