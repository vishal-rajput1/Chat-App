import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createCallLog, deleteMessage, editMessage, getMessages, getUsersForSidebar, reactToMessage, sendMessage, updateContactNickname } from "../controllers/message.controllers.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);
router.put("/:id", protectRoute, editMessage);
router.delete("/:id", protectRoute, deleteMessage);
router.post("/:id/reactions", protectRoute, reactToMessage);
router.post("/call/:id", protectRoute, createCallLog);
router.put("/contacts/:id/nickname", protectRoute, updateContactNickname);

export default router;
