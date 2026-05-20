import axios from "axios";
import { buildApiUrl } from "../utils/api";
import { getStoredAuthToken } from "../utils/auth";

const API_BASE_URL = buildApiUrl("/messaging");

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getStoredAuthToken() || localStorage.getItem("token") || "";
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      const base64 = raw.includes(",") ? raw.split(",")[1] : raw;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });

const normalizeChatId = (chat) => String(chat?._id || chat?.id || "");

export const messagingService = {
  async getChats(filters = {}) {
    const { data } = await api.get("/chats", { params: filters });
    return Array.isArray(data?.chats) ? data.chats : [];
  },

  async getMessages(chatId, page = 1, limit = 30) {
    const { data } = await api.get(`/messages/${chatId}`, {
      params: { page, limit },
    });
    return {
      messages: Array.isArray(data?.messages) ? data.messages : [],
      pagination: data?.pagination || null,
    };
  },

  async sendMessage({ chatId, content, messageType = "text", media, replyTo, clientMessageId }) {
    const resolvedClientMessageId =
      clientMessageId ||
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`);

    const payload = {
      chatId,
      content,
      messageType,
      media,
      replyTo,
      clientMessageId: resolvedClientMessageId,
    };

    const { data } = await api.post("/messages", payload);
    return data?.message;
  },

  async markChatRead(chatId) {
    const { data } = await api.put(`/chats/${chatId}/mark-read`);
    return data;
  },

  async searchMessages(query, chatId) {
    const { data } = await api.get("/search/messages", {
      params: { q: query, chatId },
    });
    return Array.isArray(data?.messages) ? data.messages : [];
  },

  async uploadFile(chatId, file) {
    const fileData = await toBase64(file);
    const payload = {
      chatId,
      fileName: file.name,
      fileSize: Number(file.size || 0),
      mimeType: file.type || "application/octet-stream",
      fileData,
    };

    const { data } = await api.post("/files/upload", payload);
    return data?.file;
  },

  async generateAIReplies(chatId, messageId) {
    const { data } = await api.post("/ai/replies/generate", {
      chatId,
      messageId,
      language: "en",
    });
    return Array.isArray(data?.suggestions) ? data.suggestions : [];
  },

  getChatId(chat) {
    return normalizeChatId(chat);
  },
};
