import React, { useMemo, useState } from "react";
import { useApp } from "../../../contexts/AppContext";
import {
  buildConversations,
  buildSearchUsers,
  buildStoryGroups,
  normalizeSocialPosts,
} from "../socialData";
import "../styles/SearchDiscovery.css";

const SearchDiscovery = () => {
  const { currentUser, mockData } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const posts = useMemo(
    () => normalizeSocialPosts(mockData?.socialMediaPosts || []),
    [mockData?.socialMediaPosts]
  );
  const storyGroups = useMemo(
    () => buildStoryGroups(mockData?.socialMediaStories || []),
    [mockData?.socialMediaStories]
  );
  const conversations = useMemo(
    () => buildConversations(mockData?.conversations || [], currentUser),
    [currentUser, mockData?.conversations]
  );
  const users = useMemo(
    () => buildSearchUsers(posts, storyGroups, conversations),
    [conversations, posts, storyGroups]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!normalizedQuery) {
      return {
        users: [],
        posts: [],
        hashtags: [],
      };
    }

    const matchingUsers = users.filter((user) =>
      [user.name, user.email].join(" ").toLowerCase().includes(normalizedQuery)
    );
    const matchingPosts = posts.filter((post) =>
      [post.content, post.author.name, ...(post.hashtags || [])].join(" ").toLowerCase().includes(normalizedQuery)
    );
    const hashtags = Array.from(
      new Set(
        posts
          .flatMap((post) => post.hashtags || [])
          .filter((tag) => tag.toLowerCase().includes(normalizedQuery))
      )
    );

    return {
      users: matchingUsers,
      posts: matchingPosts,
      hashtags: hashtags.length ? hashtags : normalizedQuery.length >= 2 ? [normalizedQuery] : [],
    };
  }, [normalizedQuery, posts, users]);

  const trendingPosts = useMemo(
    () =>
      [...posts]
        .sort(
          (left, right) =>
            right.likeCount + right.commentCount - (left.likeCount + left.commentCount)
        )
        .slice(0, 10),
    [posts]
  );

  return (
    <div className="search-discovery-container">
      <div className="search-header">
        <div className="search-box">
          <span className="search-icon">Search</span>
          <input
            type="text"
            placeholder="Search people, posts, hashtags..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {searchQuery ? (
        <div className="search-tabs">
          {[
            ["all", "All"],
            ["users", "People"],
            ["posts", "Posts"],
            ["hashtags", "Hashtags"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={`tab-btn ${activeTab === id ? "active" : ""}`}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="search-results">
        {!searchQuery ? (
          <div className="trending-section">
            <h2>Trending Now</h2>
            <div className="trending-posts">
              {trendingPosts.map((post) => (
                <div key={post._id} className="trending-item">
                  <div className="trending-author">
                    <img src={post.author.avatar} alt={post.author.name} />
                    <div>
                      <p>{post.author.name}</p>
                      <small>@{post.author.email}</small>
                    </div>
                  </div>
                  <p className="trending-content">
                    {post.content.length > 100 ? `${post.content.slice(0, 100)}...` : post.content}
                  </p>
                  <div className="trending-stats">
                    <span>{post.likeCount} likes</span>
                    <span>{post.commentCount} comments</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {(activeTab === "all" || activeTab === "users") && (
              <div className="results-section">
                <h3>People</h3>
                <div className="users-results">
                  {searchResults.users.map((user) => (
                    <div key={user._id} className="user-result">
                      <img src={user.avatar} alt={user.name} />
                      <div className="user-info">
                        <p>{user.name}</p>
                        <small>@{user.email}</small>
                      </div>
                      <button className="follow-btn">Follow</button>
                    </div>
                  ))}
                  {searchResults.users.length === 0 ? (
                    <p className="no-results">No users found.</p>
                  ) : null}
                </div>
              </div>
            )}

            {(activeTab === "all" || activeTab === "hashtags") && (
              <div className="results-section">
                <h3>Hashtags</h3>
                <div className="hashtags-results">
                  {searchResults.hashtags.map((hashtag) => {
                    const postCount = posts.filter((post) =>
                      (post.hashtags || []).some((tag) => tag.toLowerCase() === hashtag.toLowerCase())
                    ).length;

                    return (
                      <div key={hashtag} className="hashtag-result">
                        <h4>#{hashtag}</h4>
                        <small>{postCount || 1} posts</small>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(activeTab === "all" || activeTab === "posts") && (
              <div className="results-section">
                <h3>Posts</h3>
                <div className="posts-results">
                  {searchResults.posts.map((post) => (
                    <div key={post._id} className="post-result">
                      <div className="post-author">
                        <img src={post.author.avatar} alt={post.author.name} />
                        <div>
                          <p>{post.author.name}</p>
                          <small>@{post.author.email}</small>
                        </div>
                      </div>
                      <p>{post.content}</p>
                      <div className="post-stats">
                        <span>{post.likeCount} likes</span>
                        <span>{post.commentCount} comments</span>
                      </div>
                    </div>
                  ))}
                  {searchResults.posts.length === 0 ? (
                    <p className="no-results">No posts found.</p>
                  ) : null}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchDiscovery;
