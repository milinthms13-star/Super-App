import React, { useEffect, useState } from "react";
import { useApp } from "../../../contexts/AppContext";
import "../styles/PostCard.css";

const PostCard = ({ post, onPostDeleted, onPostUpdated, onlineUsers, typingUsers }) => {
  const { currentUser } = useApp();
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [saved, setSaved] = useState(Boolean(post.saved));
  const [likeCount, setLikeCount] = useState(Number(post.likeCount || 0));
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(Array.isArray(post.commentsList) ? post.commentsList : []);
  const [commentText, setCommentText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);

  useEffect(() => {
    setLiked(Boolean(post.liked));
    setSaved(Boolean(post.saved));
    setLikeCount(Number(post.likeCount || 0));
    setComments(Array.isArray(post.commentsList) ? post.commentsList : []);
    setEditedContent(post.content);
  }, [post]);

  const isOwnPost = String(currentUser?._id || currentUser?.id) === String(post.author._id);
  const createdAt = new Date(post.createdAt).toLocaleDateString();
  const isOnline = onlineUsers.has(post.author._id);
  const isTyping = typingUsers.has(`${post.author._id}_comment`);

  const handleLike = () => {
    const nextLiked = !liked;
    const nextLikeCount = nextLiked ? likeCount + 1 : Math.max(0, likeCount - 1);

    setLiked(nextLiked);
    setLikeCount(nextLikeCount);
    onPostUpdated({
      ...post,
      liked: nextLiked,
      likeCount: nextLikeCount,
      commentsList: comments,
      commentCount: comments.length,
      saved,
    });
  };

  const handleSave = () => {
    const nextSaved = !saved;
    setSaved(nextSaved);
    onPostUpdated({
      ...post,
      liked,
      likeCount,
      saved: nextSaved,
      commentsList: comments,
      commentCount: comments.length,
    });
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      onPostDeleted(post._id);
    }
  };

  const handleUpdate = () => {
    const nextContent = editedContent.trim();
    if (!nextContent) {
      return;
    }

    onPostUpdated({
      ...post,
      content: nextContent,
      liked,
      saved,
      likeCount,
      commentsList: comments,
      commentCount: comments.length,
    });
    setIsEditing(false);
  };

  const handleShare = () => {
    window.alert("Post shared successfully.");
    onPostUpdated({
      ...post,
      liked,
      saved,
      likeCount,
      commentsList: comments,
      commentCount: comments.length,
      shareCount: Number(post.shareCount || 0) + 1,
    });
  };

  const handleCommentSubmit = () => {
    if (!commentText.trim()) {
      return;
    }

    const comment = {
      _id: `comment-${Date.now()}`,
      author: {
        _id: String(currentUser?._id || currentUser?.id || "me"),
        name: currentUser?.name || "You",
        avatar: currentUser?.avatar || "",
      },
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
    };
    const nextComments = [...comments, comment];

    setComments(nextComments);
    setCommentText("");
    onPostUpdated({
      ...post,
      liked,
      saved,
      likeCount,
      commentsList: nextComments,
      commentCount: nextComments.length,
    });
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="author-info">
          <img src={post.author.avatar} alt={post.author.name} className="author-avatar" />
          <div className="author-details">
            <h4>{post.author.name}</h4>
            <span className="post-time">{createdAt}</span>
          </div>
        </div>

        {isOwnPost ? (
          <div className="post-menu">
            <button className="menu-btn">...</button>
            <div className="menu-dropdown">
              <button onClick={() => setIsEditing(true)}>Edit</button>
              <button onClick={handleDelete}>Delete</button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="post-content">
        {isEditing ? (
          <div className="edit-mode">
            <textarea value={editedContent} onChange={(event) => setEditedContent(event.target.value)} />
            <div className="edit-actions">
              <button onClick={handleUpdate} className="save-btn">
                Save
              </button>
              <button onClick={() => setIsEditing(false)} className="cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p>{post.content}</p>
        )}

        {post.images && post.images.length > 0 ? (
          <div className="post-images">
            {post.images.map((image, index) => (
              <img key={`${post._id}-image-${index}`} src={image.url} alt={`Post ${index + 1}`} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="post-stats">
        <span>{likeCount} likes</span>
        <span>{comments.length} comments</span>
        <span>{post.shareCount || 0} shares</span>
      </div>

      <div className="post-actions">
        <button className={`action-btn ${liked ? "liked" : ""}`} onClick={handleLike}>
          {liked ? "Unlike" : "Like"}
        </button>
        <button className="action-btn" onClick={() => setShowComments((current) => !current)}>
          Comment
        </button>
        <button className="action-btn" onClick={handleShare}>
          Share
        </button>
        <button className={`action-btn ${saved ? "saved" : ""}`} onClick={handleSave}>
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      {showComments ? (
        <div className="comments-section">
          <div className="comment-input">
            <input
              type="text"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleCommentSubmit();
                }
              }}
            />
            <button onClick={handleCommentSubmit} disabled={!commentText.trim()}>
              Send
            </button>
          </div>
          <div className="comments-list">
            {comments.map((comment) => (
              <div key={comment._id} className="comment">
                <img src={comment.author.avatar} alt={comment.author.name} />
                <div className="comment-content">
                  <strong>{comment.author.name}</strong>
                  <p>{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PostCard;
