import React, { useMemo, useState, useEffect, useRef } from "react";
import { useApp } from "../../contexts/AppContext";
import Messaging from "./components/Messaging";
import Notifications from "./components/Notifications";
import SearchDiscovery from "./components/SearchDiscovery";
import SocialFeed from "./components/SocialFeed";
import ForYouFeed from "./components/ForYouFeed";
import Polls from "./components/Polls";
import CreatorAnalytics from "./components/CreatorAnalytics";
import Stories from "./components/Stories";
import {
  buildConversations,
  buildSearchUsers,
  buildStoryGroups,
  getAvatarSrc,
  normalizeSocialPosts,
} from "./socialData";
import "../../styles/SocialMedia.css";
import io from 'socket.io-client';

const TABS = [
  { id: "feed", label: "Feed", icon: "Feed" },
  { id: "foryou", label: "For You", icon: "🔥" },
  { id: "polls", label: "Polls", icon: "📊" },
  { id: "analytics", label: "Analytics", icon: "📈" },
  { id: "search", label: "Search", icon: "Find" },
  { id: "stories", label: "Stories", icon: "Story" },
  { id: "messages", label: "Messages", icon: "Chat" },
  { id: "notifications", label: "Notifications", icon: "Bell" },
];

const SocialMedia = () => {
  const { currentUser, mockData, apiCall } = useApp();
  const [activeTab, setActiveTab] = useState("feed");

  const [followedUsers, setFollowedUsers] = useState(new Set());

  const isValidObjectId = (value = "") => /^[0-9a-fA-F]{24}$/.test(String(value));

  // Real-time features state
  const [socket, setSocket] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [realTimePosts, setRealTimePosts] = useState([]);
  const [realTimeNotifications, setRealTimeNotifications] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Map());

  const socketRef = useRef(null);

  const normalizedPosts = useMemo(
    () => normalizeSocialPosts(mockData?.socialMediaPosts || []),
    [mockData?.socialMediaPosts]
  );
  const normalizedStories = useMemo(
    () => buildStoryGroups(mockData?.socialMediaStories || []),
    [mockData?.socialMediaStories]
  );
  const normalizedConversations = useMemo(
    () => buildConversations(mockData?.conversations || [], currentUser),
    [currentUser, mockData?.conversations]
  );
  const suggestedUsers = useMemo(
    () => buildSearchUsers(normalizedPosts, normalizedStories, normalizedConversations).slice(0, 5),
    [normalizedConversations, normalizedPosts, normalizedStories]
  );
  const trendingTags = useMemo(() => {
    const tagMap = new Map();

    normalizedPosts.forEach((post) => {
      (post.hashtags || []).forEach((tag) => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagMap.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6);
  }, [normalizedPosts]);

  // WebSocket initialization for real-time features
  useEffect(() => {
    if (currentUser) {
      const newSocket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token'),
        },
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      // Connection events
      newSocket.on('connect', () => {
        setIsOnline(true);
        console.log('Connected to social media server');
        newSocket.emit('user_online', { userId: currentUser._id });
      });

      newSocket.on('disconnect', () => {
        setIsOnline(false);
        console.log('Disconnected from social media server');
      });

      // Post events
      newSocket.on('new_post', (postData) => {
        setRealTimePosts(prev => [postData, ...prev]);
      });

      newSocket.on('post_updated', (updatedPost) => {
        setRealTimePosts(prev => prev.map(post =>
          post._id === updatedPost._id ? updatedPost : post
        ));
      });

      newSocket.on('post_deleted', (postId) => {
        setRealTimePosts(prev => prev.filter(post => post._id !== postId));
      });

      // Notification events
      newSocket.on('new_notification', (notification) => {
        setRealTimeNotifications(prev => [notification, ...prev]);
      });

      // User presence events
      newSocket.on('user_online', ({ userId }) => {
        setOnlineUsers(prev => new Set([...prev, userId]));
      });

      newSocket.on('user_offline', ({ userId }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      });

      // Typing events
      newSocket.on('user_typing', ({ userId, context }) => {
        setTypingUsers(prev => new Map(prev.set(`${userId}_${context}`, Date.now())));
      });

      newSocket.on('user_stopped_typing', ({ userId, context }) => {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.delete(`${userId}_${context}`);
          return newMap;
        });
      });

      // Story events
      newSocket.on('new_story', (storyData) => {
        // Handle new story in real-time
        console.log('New story:', storyData);
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [currentUser]);

  useEffect(() => {
    const followedSet = new Set();
    if (Array.isArray(currentUser?.following)) {
      currentUser.following.forEach((userId) => followedSet.add(userId));
    }
    setFollowedUsers(followedSet);
  }, [currentUser?.following]);

  const handleFollowToggle = async (userId) => {
    if (!isValidObjectId(userId)) {
      console.warn(`Skipped follow toggle for invalid user ID: ${userId}`);
      return;
    }

    const isFollowing = followedUsers.has(userId);

    try {
      await apiCall(`/social/users/${userId}/${isFollowing ? "unfollow" : "follow"}`, "POST");

      setFollowedUsers((prev) => {
        const updated = new Set(prev);
        if (isFollowing) {
          updated.delete(userId);
        } else {
          updated.add(userId);
        }
        return updated;
      });
    } catch (error) {
      console.error("Unable to update follow status", error);
    }
  };

  // Clean up old typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const newMap = new Map();
        for (const [key, timestamp] of prev) {
          if (now - timestamp < 3000) { // Keep typing indicators for 3 seconds
            newMap.set(key, timestamp);
          }
        }
        return newMap;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "feed":
        return (
          <SocialFeed
            realTimePosts={realTimePosts}
            socket={socket}
            onlineUsers={onlineUsers}
            typingUsers={typingUsers}
          />
        );
      case "foryou":
        return (
          <ForYouFeed
            realTimePosts={realTimePosts}
            socket={socket}
            onlineUsers={onlineUsers}
            typingUsers={typingUsers}
          />
        );
      case "messages":
        return <Messaging />;
      case "stories":
        return <Stories socket={socket} />;
      case "notifications":
        return (
          <Notifications
            realTimeNotifications={realTimeNotifications}
            socket={socket}
          />
        );
      case "polls":
        return <Polls />;
      case "analytics":
        return <CreatorAnalytics />;
      case "search":
        return <SearchDiscovery />;
      default:
        return (
          <SocialFeed
            realTimePosts={realTimePosts}
            socket={socket}
            onlineUsers={onlineUsers}
            typingUsers={typingUsers}
          />
        );
    }
  };

  return (
    <div className="socialmedia-container">
      {/* Connection status indicator */}
      <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
        <span className="status-dot"></span>
        {isOnline ? 'Live' : 'Offline'}
      </div>

      <div className="socialmedia-layout">
        <div className="sidebar">
          <div className="sidebar-header">
            <h2>VibeHub</h2>
            <div className="online-count">
              {onlineUsers.size} online
            </div>
          </div>

          <nav className="sidebar-nav">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`nav-item ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="icon">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-profile">
            <div className="profile-card">
              <img
                src={getAvatarSrc(currentUser?.avatar, currentUser?.name || "You")}
                alt={currentUser?.name || "Current user"}
              />
              <h4>{currentUser?.name || "VibeHub User"}</h4>
              <p className="email">{currentUser?.email || "guest@vibehub.local"}</p>
              <button className="profile-btn">View Profile</button>
            </div>
          </div>
        </div>

        <div className="main-content">{renderContent()}</div>

        <div className="right-sidebar">
          <div className="widget">
            <h3>Who to Follow</h3>
            <div className="suggestions-list">
              {suggestedUsers.length === 0 ? (
                <div className="no-suggestions">No follow suggestions available.</div>
              ) : (
                suggestedUsers.map((user) => {
                  const isFollowing = followedUsers.has(user._id);
                  return (
                    <div key={user._id} className="suggestion-item">
                      <img src={user.avatar} alt={user.name} className="suggestion-avatar" />
                      <div className="suggestion-info">
                        <p>{user.name}</p>
                        <small>Growing in your network</small>
                      </div>
                      <button
                        className={`follow-btn ${isFollowing ? "following" : ""}`}
                        onClick={() => handleFollowToggle(user._id)}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="widget">
            <h3>Trending Hashtags</h3>
            <div className="trending-list">
              {trendingTags.map(([trend, count]) => (
                <div key={trend} className="trending-item">
                  <p>#{trend}</p>
                  <small>{count} posts</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialMedia;
