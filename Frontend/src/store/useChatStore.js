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
      set((state) => ({
        messages: res.data,
        users: state.users.map((user) => user._id === userId ? { ...user, unreadCount: 0 } : user),
      }));
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
      set((state) => ({
        messages: [...messages, res.data],
        users: [selectedUser, ...state.users.filter((user) => user._id !== selectedUser._id)],
      }));
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
  updateNickname: async (userId, nickname) => {
    const res = await axiosInstance.put(`/messages/contacts/${userId}/nickname`, { nickname });
    set((state) => ({
      users: state.users.map((user) => user._id === userId ? { ...user, nickname: res.data.nickname } : user),
      selectedUser: state.selectedUser?._id === userId ? { ...state.selectedUser, nickname: res.data.nickname } : state.selectedUser,
    }));
  },
  updateRelationship: async (userId, action, accept) => {
    const endpoints = {
      request: () => axiosInstance.post(`/messages/friends/${userId}`),
      respond: () => axiosInstance.put(`/messages/friends/${userId}`, { accept }),
      block: () => axiosInstance.put(`/messages/blocks/${userId}`),
    };
    const result = await endpoints[action]();
    if (action === "block") toast.success(result.data.blocked ? "User blocked" : "User unblocked");
    if (action === "request") toast.success("Friend request sent");
    if (action === "respond") toast.success(accept ? "Friend request accepted" : "Friend request declined");
    await get().getUsers();
    const updated = get().users.find((user) => user._id === userId);
    if (updated && get().selectedUser?._id === userId) set({ selectedUser: updated });
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
      set((state) => ({ users: [selectedUser, ...state.users.filter((user) => user._id !== selectedUser._id)] }));
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
  receiveUnreadMessage: (message) => set((state) => {
    const sender = state.users.find((user) => user._id === message.senderId);
    if (!sender) return state;
    const isOpen = state.selectedUser?._id === message.senderId;
    return {
      users: [{ ...sender, unreadCount: isOpen ? 0 : (sender.unreadCount || 0) + 1 }, ...state.users.filter((user) => user._id !== message.senderId)],
    };
  }),
}));
