import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../../contexts/AppContext";
import CreatePost from "./CreatePost";
import PostCard from "./PostCard";
import { normalizeSocialPosts } from "../socialData";
import "../styles/SocialFeed.css";

const PAGE_SIZE = 5;

const sortPosts = (posts, sortBy) => {
  const sorted = [...posts];

  sorted.sort((left, right) => {
    if (sortBy === "trending") {
      return (
        right.likeCount +
        right.commentCount +
        right.shareCount -
        (left.likeCount + left.commentCount + left.shareCount)
      );
    }

    return new Date(right.createdAt) - new Date(left.createdAt);
  });

  return sorted;
};

const mergeUniquePosts = (primaryPosts = [], secondaryPosts = []) => {
  const seenPostIds = new Set();

  return [...primaryPosts, ...secondaryPosts].filter((post) => {
    const postId = String(post?._id || "");
    if (!postId || seenPostIds.has(postId)) {
      return false;
    }

    seenPostIds.add(postId);
    return true;
  });
};

const formatScheduledTime = (value) => {
  if (!value) {
    return "Unscheduled";
  }

  const scheduledDate = new Date(value);
  if (Number.isNaN(scheduledDate.getTime())) {
    return "Unscheduled";
  }

  return scheduledDate.toLocaleString("en-IN");
};

const SocialFeed = ({ realTimePosts, socket, onlineUsers, typingUsers }) => {
  const { apiCall, mockData } = useApp();
  const [posts, setPosts] = useState([]);
  const [draftPosts, setDraftPosts] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("recent");
  const [statusMessage, setStatusMessage] = useState("");
  const [loadingFeed, setLoadingFeed] = useState(true);

  const loadSocialWorkspace = useCallback(async () => {
    setLoadingFeed(true);

    try {
      const [feedResponse, draftsResponse, scheduledResponse] = await Promise.all([
        apiCall("/socialmedia/feed", "GET"),
        apiCall("/socialmedia/posts/drafts", "GET"),
        apiCall("/socialmedia/posts/scheduled", "GET"),
      ]);

      setPosts(normalizeSocialPosts(feedResponse?.posts || []));
      setDraftPosts(normalizeSocialPosts(draftsResponse?.posts || []));
      setScheduledPosts(normalizeSocialPosts(scheduledResponse?.posts || []));
      setStatusMessage("");
    } catch (error) {
      setPosts(normalizeSocialPosts(mockData?.socialMediaPosts || []));
      setDraftPosts([]);
      setScheduledPosts([]);
      setStatusMessage("Showing offline feed data while social sync reconnects.");
    } finally {
      setLoadingFeed(false);
    }
  }, [apiCall, mockData?.socialMediaPosts]);

  useEffect(() => {
    loadSocialWorkspace();
  }, [loadSocialWorkspace]);

  useEffect(() => {
    if (!Array.isArray(realTimePosts) || realTimePosts.length === 0) {
      return;
    }

    const normalizedRealtimePosts = normalizeSocialPosts(realTimePosts);
    setPosts((current) => mergeUniquePosts(normalizedRealtimePosts, current));
  }, [realTimePosts]);

  const visiblePosts = useMemo(() => {
    const sortedPosts = sortPosts(posts, sortBy);
    return sortedPosts.slice(0, page * PAGE_SIZE);
  }, [page, posts, sortBy]);

  const hasMore = useMemo(() => {
    const sortedPosts = sortPosts(posts, sortBy);
    return sortedPosts.length > page * PAGE_SIZE;
  }, [page, posts, sortBy]);

  const handlePublishPost = async (postPayload) => {
    const response = await apiCall("/socialmedia/posts/create", "POST", postPayload);
    const normalizedPost = normalizeSocialPosts([response?.post])[0];
    setPosts((current) => mergeUniquePosts([normalizedPost], current));
    setPage(1);
    setSortBy("recent");
    setStatusMessage("Post published to your feed.");
    return response?.post || null;
  };

  const handleSaveDraft = async (postPayload) => {
    const response = await apiCall("/socialmedia/posts/create", "POST", {
      ...postPayload,
      status: "draft",
    });
    const normalizedPost = normalizeSocialPosts([response?.post])[0];
    setDraftPosts((current) => mergeUniquePosts([normalizedPost], current));
    setStatusMessage("Draft saved to your creator workspace.");
    return response?.post || null;
  };

  const handleSchedulePost = async (postPayload) => {
    const response = await apiCall("/socialmedia/posts/create", "POST", {
      ...postPayload,
      status: "scheduled",
    });
    const normalizedPost = normalizeSocialPosts([response?.post])[0];
    setScheduledPosts((current) =>
      [...mergeUniquePosts([normalizedPost], current)].sort(
        (left, right) => new Date(left.scheduledFor || 0) - new Date(right.scheduledFor || 0)
      )
    );
    setStatusMessage("Post added to your scheduled queue.");
    return response?.post || null;
  };

  const handlePublishQueuedPost = async (postId, queueType) => {
    const response = await apiCall(`/socialmedia/posts/${postId}/publish`, "POST");
    const normalizedPost = normalizeSocialPosts([response?.post])[0];

    if (queueType === "draft") {
      setDraftPosts((current) => current.filter((post) => post._id !== postId));
    } else {
      setScheduledPosts((current) => current.filter((post) => post._id !== postId));
    }

    setPosts((current) => mergeUniquePosts([normalizedPost], current));
    setStatusMessage("Queued post published to your feed.");
  };

  const handleDeleteQueuedPost = async (postId, queueType) => {
    await apiCall(`/socialmedia/posts/${postId}`, "DELETE");

    if (queueType === "draft") {
      setDraftPosts((current) => current.filter((post) => post._id !== postId));
      setStatusMessage("Draft deleted.");
      return;
    }

    setScheduledPosts((current) => current.filter((post) => post._id !== postId));
    setStatusMessage("Scheduled post removed.");
  };

  const handleLoadMore = () => {
    setPage((current) => current + 1);
  };

  const handlePostDeleted = (postId) => {
    setPosts((current) => current.filter((post) => post._id !== postId));
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts((current) =>
      current.map((post) => (post._id === updatedPost._id ? updatedPost : post))
    );
  };

  const handleSortChange = (nextSort) => {
    setSortBy(nextSort);
    setPage(1);
  };

  return (
    <div className="social-feed">
      <div className="feed-header">
        <h2>Your Feed</h2>
        <div className="sort-buttons">
          <button
            className={`sort-btn ${sortBy === "recent" ? "active" : ""}`}
            onClick={() => handleSortChange("recent")}
            type="button"
          >
            Recent
          </button>
          <button
            className={`sort-btn ${sortBy === "trending" ? "active" : ""}`}
            onClick={() => handleSortChange("trending")}
            type="button"
          >
            Trending
          </button>
        </div>
      </div>

      <CreatePost
        onPostCreated={handlePublishPost}
        onSaveDraft={handleSaveDraft}
        onSchedulePost={handleSchedulePost}
      />

      {statusMessage ? <p className="feed-status-message">{statusMessage}</p> : null}

      {draftPosts.length > 0 ? (
        <section className="creator-queue-section">
          <div className="queue-section-header">
            <h3>Saved Drafts</h3>
            <span>{draftPosts.length}</span>
          </div>
          <div className="queue-list">
            {draftPosts.map((post) => (
              <article key={post._id} className="queue-card">
                <div>
                  <strong>{post.content || "Untitled draft"}</strong>
                  <p>Last updated {new Date(post.createdAt).toLocaleString("en-IN")}</p>
                </div>
                <div className="queue-actions">
                  <button
                    className="action-btn"
                    onClick={() => handlePublishQueuedPost(post._id, "draft")}
                    type="button"
                  >
                    Publish now
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => handleDeleteQueuedPost(post._id, "draft")}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {scheduledPosts.length > 0 ? (
        <section className="creator-queue-section">
          <div className="queue-section-header">
            <h3>Scheduled Posts</h3>
            <span>{scheduledPosts.length}</span>
          </div>
          <div className="queue-list">
            {scheduledPosts.map((post) => (
              <article key={post._id} className="queue-card">
                <div>
                  <strong>{post.content || "Scheduled post"}</strong>
                  <p>Scheduled for {formatScheduledTime(post.scheduledFor)}</p>
                </div>
                <div className="queue-actions">
                  <button
                    className="action-btn"
                    onClick={() => handlePublishQueuedPost(post._id, "scheduled")}
                    type="button"
                  >
                    Publish now
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => handleDeleteQueuedPost(post._id, "scheduled")}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="posts-container">
        {loadingFeed ? (
          <div className="empty-state">
            <p>Loading your social feed...</p>
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="empty-state">
            <p>No posts yet. Share the first update with your community.</p>
          </div>
        ) : (
          visiblePosts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onPostDeleted={handlePostDeleted}
              onPostUpdated={handlePostUpdated}
              socket={socket}
              onlineUsers={onlineUsers}
              typingUsers={typingUsers}
            />
          ))
        )}
      </div>

      {hasMore ? (
        <div className="load-more-container">
          <button className="load-more-btn" onClick={handleLoadMore} type="button">
            Load More
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default SocialFeed;
