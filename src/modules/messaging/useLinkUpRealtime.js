import { useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";
import { BACKEND_BASE_URL } from "../../utils/api";

const toId = (value) => String(value?._id || value?.id || value || "");

export function useLinkUpRealtime({ token, userId, activeChatId, onMessage }) {
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState(() => new Set());
  const [typingUsers, setTypingUsers] = useState({});

  useEffect(() => {
    if (!token || !userId) {
      return undefined;
    }

    const socket = io(BACKEND_BASE_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("users:status:get", []);
    });

    socket.on("message:received", (message) => {
      onMessage?.(message);
    });

    socket.on("user:online", ({ userId: onlineUserId }) => {
      const normalizedId = toId(onlineUserId);
      if (!normalizedId) return;
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.add(normalizedId);
        return next;
      });
    });

    socket.on("user:offline", ({ userId: offlineUserId }) => {
      const normalizedId = toId(offlineUserId);
      if (!normalizedId) return;
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(normalizedId);
        return next;
      });
    });

    socket.on("users:status:response", (statuses = {}) => {
      const next = new Set();
      Object.entries(statuses || {}).forEach(([id, state]) => {
        if (String(state || "").toLowerCase() === "online") {
          next.add(toId(id));
        }
      });
      setOnlineUsers(next);
    });

    socket.on("user:typing:started", ({ chatId, userId: typingUserId }) => {
      const normalizedChatId = toId(chatId);
      const normalizedUserId = toId(typingUserId);
      if (!normalizedChatId || !normalizedUserId) return;
      setTypingUsers((prev) => ({ ...prev, [normalizedChatId]: normalizedUserId }));
    });

    socket.on("user:typing:stopped", ({ chatId }) => {
      const normalizedChatId = toId(chatId);
      if (!normalizedChatId) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[normalizedChatId];
        return next;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, userId, onMessage]);

  useEffect(() => {
    const socket = socketRef.current;
    const normalizedChatId = toId(activeChatId);
    if (!socket || !normalizedChatId) {
      return undefined;
    }

    socket.emit("chat:join", normalizedChatId);
    return () => {
      socket.emit("chat:leave", normalizedChatId);
    };
  }, [activeChatId]);

  const sendTyping = (isTyping = true) => {
    const socket = socketRef.current;
    const normalizedChatId = toId(activeChatId);
    if (!socket || !normalizedChatId) return;

    socket.emit(isTyping ? "user:typing" : "user:typing:stopped", normalizedChatId);
  };

  return {
    socket: socketRef.current,
    onlineUsers: useMemo(() => Array.from(onlineUsers), [onlineUsers]),
    typingUsers,
    sendTyping,
  };
}
