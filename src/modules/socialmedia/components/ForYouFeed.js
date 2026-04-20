import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../../contexts/AppContext";
import PostCard from "./PostCard";
import { normalizeSocialPosts } from "../socialData";
import "../../../styles/ForYouFeed.css";

const PAGE_SIZE = 10;

// Simple recommendation algorithm
const calculateRelevanceScore = (post, userProfile) => {
  let score = 0;

  // Time decay (newer posts get higher score)
  const hoursSincePosted = (Date.now() - new Date(post.createdAt)) / (1000 * 60 * 60);
  score += Math.max(0, 24 - hoursSincePosted) / 24; // Higher score for recent posts

  // Engagement score
  const engagementScore = (post.likeCount || 0) + (post.commentCount || 0) * 2 + (post.shareCount || 0) * 3;
  score += Math.min(engagementScore / 100, 1); // Cap at 1

  // Hashtag matching (if user has interests)
  if (userProfile?.interests && post.hashtags) {
    const matchingTags = post.hashtags.filter(tag =>
      userProfile.interests.some(interest =>
        interest.toLowerCase().includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(interest.toLowerCase())
      )
    );
    score += matchingTags.length * 0.5;
  }

  // Author following bonus
  if (userProfile?.following?.includes(post.author._id)) {
    score += 0.8;
  }

  // Content type preferences
  if (userProfile?.contentPreferences) {
    if (post.images?.length && userProfile.contentPreferences.images) score += 0.2;
    if (post.videos?.length && userProfile.contentPreferences.videos) score += 0.3;
    if (post.content && userProfile.contentPreferences.text) score += 0.1;
  }

  return score;
};

const ForYouFeed = ({ realTimePosts, socket, onlineUsers, typingUsers }) => {
  const { mockData, currentUser } = useApp();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState({
    interests: ['technology', 'food', 'travel', 'music'],
    following: [],
    contentPreferences: {
      images: true,
      videos: true,
      text: true,
    }
  });

  useEffect(() => {
    const allPosts = [...normalizeSocialPosts(mockData?.socialMediaPosts || []), ...realTimePosts];
    // Remove duplicates based on _id
    const uniquePosts = allPosts.filter((post, index, self) =>
      index === self.findIndex(p => p._id === post._id)
    );
    setPosts(uniquePosts);
  }, [mockData?.socialMediaPosts, realTimePosts]);

  const recommendedPosts = useMemo(() => {
    const scoredPosts = posts.map(post => ({
      ...post,
      relevanceScore: calculateRelevanceScore(post, userProfile)
    }));

    // Sort by relevance score (descending)
    scoredPosts.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return scoredPosts;
  }, [posts, userProfile]);

  const visiblePosts = useMemo(() => {
    return recommendedPosts.slice(0, page * PAGE_SIZE);
  }, [recommendedPosts, page]);

  const hasMore = useMemo(() => {
    return recommendedPosts.length > page * PAGE_SIZE;
  }, [recommendedPosts, page]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setLoading(true);
      setTimeout(() => {
        setPage(current => current + 1);
        setLoading(false);
      }, 500);
    }
  };

  const handlePostDeleted = (postId) => {
    setPosts(current => current.filter(post => post._id !== postId));
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts(current =>
      current.map(post => post._id === updatedPost._id ? updatedPost : post)
    );
  };

  return (
    <div className="for-you-feed">
      <div className="feed-header">
        <h2>🔥 For You</h2>
        <p>Personalized content based on your interests</p>
        <div className="feed-stats">
          <span className="stat">📊 {recommendedPosts.length} posts analyzed</span>
          <span className="stat">🎯 AI-powered recommendations</span>
        </div>
      </div>

      <div className="posts-container">
        {visiblePosts.length === 0 ? (
          <div className="empty-state">
            <p>Discovering content tailored for you...</p>
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <>
            {visiblePosts.map((post, index) => (
              <div key={post._id || index} className="recommended-post">
                <div className="relevance-score">
                  <span className="score-badge">
                    {post.relevanceScore > 0.8 ? '🔥 Hot' :
                     post.relevanceScore > 0.6 ? '⭐ Recommended' :
                     post.relevanceScore > 0.4 ? '👍 Good' : '📄 Content'}
                  </span>
                  <span className="score-value">
                    {Math.round(post.relevanceScore * 100)}% match
                  </span>
                </div>
                <PostCard
                  post={post}
                  onPostDeleted={handlePostDeleted}
                  onPostUpdated={handlePostUpdated}
                  socket={socket}
                  onlineUsers={onlineUsers}
                  typingUsers={typingUsers}
                />
              </div>
            ))}

            {hasMore && (
              <div className="load-more-container">
                <button
                  className="load-more-btn"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner small"></div>
                      Loading more recommendations...
                    </>
                  ) : (
                    'Load More Recommendations'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ForYouFeed;