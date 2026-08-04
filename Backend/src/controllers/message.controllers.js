import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Contact from "../models/contact.model.js";
import Friendship from "../models/friendship.model.js";
import Block from "../models/block.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const query = req.query.search?.trim();
    const filter = { _id: { $ne: loggedInUserId } };
    if (query) filter.username = { $regex: query, $options: "i" };
    const filteredUsers = await User.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "messages",
          let: { contactId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $and: [{ $eq: ["$senderId", req.user._id] }, { $eq: ["$receiverId", "$$contactId"] }] },
                    { $and: [{ $eq: ["$senderId", "$$contactId"] }, { $eq: ["$receiverId", req.user._id] }] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            { $project: { createdAt: 1, text: 1 } },
          ],
          as: "latestMessage",
        },
      },
      { $addFields: { latestMessage: { $arrayElemAt: ["$latestMessage", 0] } } },
      {
        $lookup: {
          from: "messages",
          let: { contactId: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [
              { $eq: ["$senderId", "$$contactId"] },
              { $eq: ["$receiverId", req.user._id] },
              { $eq: ["$seen", false] },
            ] } } },
            { $count: "count" },
          ],
          as: "unread",
        },
      },
      { $addFields: { unreadCount: { $ifNull: [{ $arrayElemAt: ["$unread.count", 0] }, 0] } } },
      {
        $lookup: {
          from: "contacts",
          let: { contactId: "$_id" },
          pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$ownerId", req.user._id] }, { $eq: ["$contactId", "$$contactId"] }] } } }, { $project: { nickname: 1 } }],
          as: "contactSettings",
        },
      },
      { $addFields: { nickname: { $ifNull: [{ $arrayElemAt: ["$contactSettings.nickname", 0] }, ""] } } },
      { $sort: { "latestMessage.createdAt": -1, username: 1 } },
      { $project: { password: 0, unread: 0, contactSettings: 0 } },
    ]);

    const ids = filteredUsers.map((user) => user._id);
    const [friendships, blocks] = await Promise.all([
      Friendship.find({ $or: [{ requesterId: req.user._id, recipientId: { $in: ids } }, { recipientId: req.user._id, requesterId: { $in: ids } }] }),
      Block.find({ $or: [{ blockerId: req.user._id, blockedId: { $in: ids } }, { blockedId: req.user._id, blockerId: { $in: ids } }] }),
    ]);
    const enrichedUsers = filteredUsers.map((user) => {
      const friendship = friendships.find((item) => item.requesterId.equals(user._id) || item.recipientId.equals(user._id));
      const block = blocks.find((item) => item.blockerId.equals(user._id) || item.blockedId.equals(user._id));
      return { ...user, friendshipStatus: friendship?.status || "none", requestDirection: friendship?.requesterId.equals(req.user._id) ? "sent" : friendship ? "received" : null, isBlocked: Boolean(block), blockedByMe: block?.blockerId.equals(req.user._id) || false };
    });
    res.status(200).json(enrichedUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).populate("replyTo", "text image audio senderId deleted");

    await Message.updateMany({ senderId: userToChatId, receiverId: myId, seen: false }, { $set: { seen: true, delivered: true } });
    const seenMessages = await Message.find({ senderId: userToChatId, receiverId: myId }).select("_id");
    const senderSocketId = getReceiverSocketId(userToChatId);
    if (senderSocketId && seenMessages.length) io.to(senderSocketId).emit("messagesSeen", seenMessages.map((item) => item._id.toString()));

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, audio, replyTo } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    const [friendship, blocked] = await Promise.all([
      Friendship.findOne({ status: "accepted", $or: [{ requesterId: senderId, recipientId: receiverId }, { requesterId: receiverId, recipientId: senderId }] }),
      Block.findOne({ $or: [{ blockerId: senderId, blockedId: receiverId }, { blockerId: receiverId, blockedId: senderId }] }),
    ]);
    if (blocked) return res.status(403).json({ message: "You cannot message this user" });
    if (!friendship) return res.status(403).json({ message: "Messages are available after the friend request is accepted" });

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    let audioUrl;
    if (audio) {
      const uploadResponse = await cloudinary.uploader.upload(audio, { resource_type: "video" });
      audioUrl = uploadResponse.secure_url;
    }
    const receiverSocketId = getReceiverSocketId(receiverId);
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      audio: audioUrl,
      replyTo: replyTo || null,
      delivered: Boolean(receiverSocketId),
    });

    await newMessage.save();

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { text } = req.body;

    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    message.text = text;
    message.edited = true;

    await message.save();

    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) io.to(receiverSocketId).emit("messageUpdated", message);

    res.status(200).json(message);
  } catch (error) {
    console.log("Edit Error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    message.text = "This message was deleted";
    message.image = "";
    message.audio = "";
    message.deleted = true;

    await message.save();

    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) io.to(receiverSocketId).emit("messageUpdated", message);

    res.status(200).json(message);
  } catch (error) {
    console.log("Delete Error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateContactNickname = async (req, res) => {
  try {
    const nickname = req.body.nickname?.trim() || "";
    if (nickname.length > 40) return res.status(400).json({ message: "Nickname must be 40 characters or less" });
    const contact = await User.findById(req.params.id).select("_id");
    if (!contact) return res.status(404).json({ message: "User not found" });
    const settings = await Contact.findOneAndUpdate(
      { ownerId: req.user._id, contactId: contact._id },
      { nickname }, { new: true, upsert: true, runValidators: true },
    );
    res.json({ nickname: settings.nickname });
  } catch (error) { res.status(500).json({ message: "Unable to update nickname" }); }
};

export const reactToMessage = async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message || !emoji) return res.status(404).json({ message: "Message or emoji not found" });
    const userId = req.user._id;
    const existing = message.reactions.findIndex((reaction) => reaction.userId.toString() === userId.toString() && reaction.emoji === emoji);
    existing >= 0 ? message.reactions.splice(existing, 1) : message.reactions.push({ userId, emoji });
    await message.save();
    const peerId = message.senderId.toString() === userId.toString() ? message.receiverId : message.senderId;
    const peerSocketId = getReceiverSocketId(peerId);
    if (peerSocketId) io.to(peerSocketId).emit("messageUpdated", message);
    res.json(message);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createCallLog = async (req, res) => {
  try {
    const { id: receiverId } = req.params;
    const { type, status, duration } = req.body;
    if (!["voice", "video"].includes(type) || !["completed", "missed", "declined"].includes(status)) return res.status(400).json({ message: "Invalid call log" });
    const safeDuration = Math.max(0, Math.min(Number(duration) || 0, 86400));
    const label = `${type === "video" ? "Video" : "Voice"} call · ${status}${safeDuration ? ` · ${Math.floor(safeDuration / 60)}:${String(safeDuration % 60).padStart(2, "0")}` : ""}`;
    const callMessage = await Message.create({ senderId: req.user._id, receiverId, text: label, call: { type, status, duration: safeDuration }, delivered: Boolean(getReceiverSocketId(receiverId)) });
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) io.to(receiverSocketId).emit("newMessage", callMessage);
    res.status(201).json(callMessage);
  } catch (error) { res.status(500).json({ message: "Unable to save call history" }); }
};

export const sendFriendRequest = async (req, res) => {
  try {
    const recipientId = req.params.id;
    if (recipientId === req.user._id.toString()) return res.status(400).json({ message: "You cannot add yourself" });
    if (await Block.exists({ $or: [{ blockerId: req.user._id, blockedId: recipientId }, { blockerId: recipientId, blockedId: req.user._id }] })) return res.status(403).json({ message: "Friend request unavailable" });
    const existing = await Friendship.findOne({ $or: [{ requesterId: req.user._id, recipientId }, { requesterId: recipientId, recipientId: req.user._id }] });
    if (existing) return res.status(400).json({ message: "Friend request already exists" });
    await Friendship.create({ requesterId: req.user._id, recipientId });
    res.status(201).json({ message: "Friend request sent" });
  } catch (error) { res.status(500).json({ message: "Unable to send friend request" }); }
};

export const respondToFriendRequest = async (req, res) => {
  try {
    const friendship = await Friendship.findOne({ requesterId: req.params.id, recipientId: req.user._id, status: "pending" });
    if (!friendship) return res.status(404).json({ message: "Friend request not found" });
    if (req.body.accept) { friendship.status = "accepted"; await friendship.save(); return res.json({ message: "Friend request accepted" }); }
    await friendship.deleteOne();
    res.json({ message: "Friend request declined" });
  } catch (error) { res.status(500).json({ message: "Unable to respond to friend request" }); }
};

export const toggleBlock = async (req, res) => {
  try {
    const query = { blockerId: req.user._id, blockedId: req.params.id };
    const existing = await Block.findOne(query);
    if (existing) { await existing.deleteOne(); return res.json({ blocked: false }); }
    await Block.create(query);
    res.json({ blocked: true });
  } catch (error) { res.status(500).json({ message: "Unable to update block" }); }
};
