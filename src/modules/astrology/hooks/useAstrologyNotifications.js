import { useState, useCallback, useEffect } from "react";
import { astrologyService } from "../../../services/astrologyService";

export const useAstrologyNotifications = ({ currentUser }) => {
  const [notificationPreferences, setNotificationPreferences] = useState({
    dailyHoroscope: true,
    festivalReminders: true,
    goodMuhurtam: true,
    dashaAlerts: true,
  });
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  // Load notification preferences
  useEffect(() => {
    if (currentUser?.id) {
      loadNotificationPreferences();
    }
  }, [currentUser?.id]);

  const loadNotificationPreferences = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const profile = await astrologyService.getProfile();
      if (profile?.notifications) {
        setNotificationPreferences({
          dailyHoroscope: profile.notifications.dailyHoroscope !== false,
          festivalReminders: profile.notifications.festivalReminders !== false,
          goodMuhurtam: profile.notifications.goodMuhurtam !== false,
          dashaAlerts: profile.notifications.dashaAlerts !== false,
        });
      }
    } catch (error) {
      console.error("Failed to load notification preferences:", error);
    }
  }, [currentUser?.id]);

  const handleUpdateNotificationPreferences = useCallback(async (preferences) => {
    if (!currentUser?.id) {
      setNotificationsError("Please sign in to update notification preferences.");
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError("");

    try {
      const updatedProfile = await astrologyService.updateProfile({
        notifications: {
          ...notificationPreferences,
          ...preferences,
        },
      });

      if (updatedProfile?.notifications) {
        setNotificationPreferences({
          dailyHoroscope: updatedProfile.notifications.dailyHoroscope !== false,
          festivalReminders: updatedProfile.notifications.festivalReminders !== false,
          goodMuhurtam: updatedProfile.notifications.goodMuhurtam !== false,
          dashaAlerts: updatedProfile.notifications.dashaAlerts !== false,
        });
      }

      return updatedProfile;
    } catch (error) {
      setNotificationsError(error.message || "Failed to update notification preferences.");
      return null;
    } finally {
      setNotificationsLoading(false);
    }
  }, [currentUser?.id, notificationPreferences]);

  const handleToggleNotification = useCallback(async (type) => {
    const newValue = !notificationPreferences[type];
    await handleUpdateNotificationPreferences({
      [type]: newValue,
    });
  }, [notificationPreferences, handleUpdateNotificationPreferences]);

  const loadNotificationHistory = useCallback(async () => {
    if (!currentUser?.id) return;

    setNotificationsLoading(true);
    setNotificationsError("");

    try {
      // This would call a backend endpoint to fetch notification history
      // For now, we'll use localStorage as a fallback
      const storedHistory = localStorage.getItem(`notificationHistory_${currentUser.id}`);
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        if (Array.isArray(parsed)) {
          setNotificationHistory(parsed);
          const unread = parsed.filter(n => !n.read).length;
          setUnreadCount(unread);
        }
      }
    } catch (error) {
      console.error("Failed to load notification history:", error);
      setNotificationsError("Failed to load notifications.");
    } finally {
      setNotificationsLoading(false);
    }
  }, [currentUser?.id]);

  const handleMarkAsRead = useCallback((notificationId) => {
    setNotificationHistory((prev) => {
      const updated = prev.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      );

      // Save to localStorage
      try {
        if (currentUser?.id) {
          localStorage.setItem(`notificationHistory_${currentUser.id}`, JSON.stringify(updated));
        }
      } catch (error) {
        console.error("Failed to save notification state:", error);
      }

      const unread = updated.filter(n => !n.read).length;
      setUnreadCount(unread);

      return updated;
    });
  }, [currentUser?.id]);

  const handleMarkAllAsRead = useCallback(() => {
    setNotificationHistory((prev) => {
      const updated = prev.map((notification) => ({ ...notification, read: true }));

      // Save to localStorage
      try {
        if (currentUser?.id) {
          localStorage.setItem(`notificationHistory_${currentUser.id}`, JSON.stringify(updated));
        }
      } catch (error) {
        console.error("Failed to save notification state:", error);
      }

      setUnreadCount(0);
      return updated;
    });
  }, [currentUser?.id]);

  const handleDeleteNotification = useCallback((notificationId) => {
    setNotificationHistory((prev) => {
      const updated = prev.filter((notification) => notification.id !== notificationId);

      // Save to localStorage
      try {
        if (currentUser?.id) {
          localStorage.setItem(`notificationHistory_${currentUser.id}`, JSON.stringify(updated));
        }
      } catch (error) {
        console.error("Failed to save notification state:", error);
      }

      const unread = updated.filter(n => !n.read).length;
      setUnreadCount(unread);

      return updated;
    });
  }, [currentUser?.id]);

  const handleClearAllNotifications = useCallback(() => {
    setNotificationHistory([]);
    setUnreadCount(0);
    try {
      if (currentUser?.id) {
        localStorage.removeItem(`notificationHistory_${currentUser.id}`);
      }
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  }, [currentUser?.id]);

  const handleScheduleDailyHoroscope = useCallback(async (time = "07:00") => {
    if (!currentUser?.id) {
      setNotificationsError("Please sign in to schedule notifications.");
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError("");

    try {
      // This would call a backend endpoint to schedule daily horoscope
      // For now, we'll just update preferences
      await handleUpdateNotificationPreferences({
        dailyHoroscope: true,
        preferredTime: time,
      });

      return { success: true, time };
    } catch (error) {
      setNotificationsError(error.message || "Failed to schedule daily horoscope.");
      return null;
    } finally {
      setNotificationsLoading(false);
    }
  }, [currentUser?.id, handleUpdateNotificationPreferences]);

  const clearNotificationsError = useCallback(() => {
    setNotificationsError("");
  }, []);

  // Simulate receiving a notification (for testing)
  const addTestNotification = useCallback((notification) => {
    const newNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: notification.type || "info",
      title: notification.title || "Test Notification",
      message: notification.message || "This is a test notification.",
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    };

    setNotificationHistory((prev) => {
      const updated = [newNotification, ...prev].slice(0, 50); // Keep last 50

      try {
        if (currentUser?.id) {
          localStorage.setItem(`notificationHistory_${currentUser.id}`, JSON.stringify(updated));
        }
      } catch (error) {
        console.error("Failed to save notification:", error);
      }

      return updated;
    });

    setUnreadCount((prev) => prev + 1);
  }, [currentUser?.id]);

  return {
    notificationPreferences,
    notificationHistory,
    unreadCount,
    notificationsLoading,
    notificationsError,
    handleUpdateNotificationPreferences,
    handleToggleNotification,
    loadNotificationHistory,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDeleteNotification,
    handleClearAllNotifications,
    handleScheduleDailyHoroscope,
    clearNotificationsError,
    addTestNotification,
  };
};
