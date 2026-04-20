import React, { useEffect, useMemo, useState } from "react";
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

const SocialFeed = ({ realTimePosts, socket, onlineUsers, typingUsers }) => {
  const { mockData } = useApp();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    const allPosts = [...normalizeSocialPosts(mockData?.socialMediaPosts || []), ...realTimePosts];
    // Remove duplicates based on _id
    const uniquePosts = allPosts.filter((post, index, self) =>
      index === self.findIndex(p => p._id === post._id)
    );
    setPosts(uniquePosts);
  }, [mockData?.socialMediaPosts, realTimePosts]);

  const visiblePosts = useMemo(() => {
    const sortedPosts = sortPosts(posts, sortBy);
    return sortedPosts.slice(0, page * PAGE_SIZE);
  }, [page, posts, sortBy]);

  const hasMore = useMemo(() => {
    const sortedPosts = sortPosts(posts, sortBy);
    return sortedPosts.length > page * PAGE_SIZE;
  }, [page, posts, sortBy]);

  const handlePostCreated = (newPost) => {
    setPosts((current) => [newPost, ...current]);
    setPage(1);
    setSortBy("recent");
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
          >
            Recent
          </button>
          <button
            className={`sort-btn ${sortBy === "trending" ? "active" : ""}`}
            onClick={() => handleSortChange("trending")}
          >
            Trending
          </button>
        </div>
      </div>

      <CreatePost onPostCreated={handlePostCreated} />

      <div className="posts-container">
        {visiblePosts.length === 0 ? (
          <div className="empty-state">
            <p>No posts yet. Share the first update with your community.</p>
          </div>
        ) : (
          visiblePosts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onPostDeleted={handlePostDeleted}
              onPostUpdated={handlePostUpdated}              socket={socket}
              onlineUsers={onlineUsers}
              typingUsers={typingUsers}            />
          ))
        )}
      </div>

      {hasMore ? (
        <div className="load-more-container">
          <button className="load-more-btn" onClick={handleLoadMore}>
            Load More
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default SocialFeed;
