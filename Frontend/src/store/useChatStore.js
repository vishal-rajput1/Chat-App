import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  replyTo: null,
  isTyping: false,
  messageSearch: "",
  setMessageSearch: (messageSearch) => set({ messageSearch }),

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  setReplyTo: (replyTo) => set({ replyTo }),
  sendTyping: (isTyping) => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;
    if (socket && selectedUser) socket.emit("typing", { receiverId: selectedUser._id, isTyping });
  },
  reactToMessage: async (id, emoji) => {
    const res = await axiosInstance.post(`/messages/${id}/reactions`, { emoji });
    set((state) => ({ messages: state.messages.map((m) => m._id === id ? res.data : m) }));
  },

   editMessage: async (id, text) => {
  const res = await axiosInstance.put(`/messages/${id}`, { text });

  set((state) => ({
    messages: state.messages.map((m) =>
      m._id === id ? res.data : m
    ),
  }));
},

deleteMessage: async (id) => {
  const res = await axiosInstance.delete(`/messages/${id}`);
  set((state) => ({ messages: state.messages.map((m) => m._id === id ? res.data : m) }));
},


  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });
    });
    socket.on("typing", ({ userId, isTyping }) => {
      if (userId === selectedUser._id) set({ isTyping });
    });
    socket.on("messagesSeen", (ids) => set((state) => ({
      messages: state.messages.map((message) => ids.includes(message._id) ? { ...message, seen: true, delivered: true } : message),
    })));
    socket.on("messageUpdated", (updated) => set((state) => ({
      messages: state.messages.map((message) => message._id === updated._id ? updated : message),
    })));
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("typing");
    socket.off("messagesSeen");
    socket.off("messageUpdated");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
