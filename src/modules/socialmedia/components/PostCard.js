import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../../contexts/AppContext";
import { getAvatarSrc, normalizeSocialUser } from "../socialData";
import "../styles/PostCard.css";
import Modal from "../../../components/Modal";
import { isSafeMediaUrl, getMediaSrc } from "../socialData";

const buildComments = (comments = []) =>
  (Array.isArray(comments) ? comments : []).map((comment, index) => ({
    _id: String(comment?._id || comment?.id || `comment-${index + 1}`),
    author: normalizeSocialUser(comment?.author || {}, `Commenter ${index + 1}`),
    content: String(comment?.content || ""),
    createdAt: comment?.createdAt || new Date().toISOString(),
  }));

const PostCard = ({ post, onPostDeleted, onPostUpdated, onlineUsers = new Set(), typingUsers = new Map() }) => {
  const { currentUser, apiCall } = useApp();
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [saved, setSaved] = useState(Boolean(post.saved));
  const [likeCount, setLikeCount] = useState(Number(post.likeCount || 0));
  const [shareCount, setShareCount] = useState(Number(post.shareCount || 0));
  const [showComments, setShowComments] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [comments, setComments] = useState(buildComments(post.commentsList));
  const [commentText, setCommentText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [actionMessage, setActionMessage] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);

  useEffect(() => {
    setLiked(Boolean(post.liked));
    setSaved(Boolean(post.saved));
    setLikeCount(Number(post.likeCount || 0));
    setShareCount(Number(post.shareCount || 0));
    setComments(buildComments(post.commentsList));
    setCommentsLoaded(false);
    setEditedContent(post.content);
  }, [post]);

  const author = useMemo(() => normalizeSocialUser(post.author, "User"), [post.author]);
  const isOwnPost = String(currentUser?._id || currentUser?.id) === String(author._id);
  const createdAt = new Date(post.createdAt).toLocaleDateString();
  const isOnline = onlineUsers.has(author._id);
  const isTyping = typingUsers.has(`${author._id}_comment`);
  const hasVideo = Array.isArray(post.videos) && post.videos.length > 0;
  const hasPoll = Array.isArray(post.pollOptions) && post.pollOptions.length > 0;

  const publishLocalUpdate = (nextValues = {}) => {
    onPostUpdated({
      ...post,
      ...nextValues,
      liked: nextValues.liked ?? liked,
      saved: nextValues.saved ?? saved,
      likeCount: nextValues.likeCount ?? likeCount,
      shareCount: nextValues.shareCount ?? shareCount,
      commentsList: nextValues.commentsList ?? comments,
      commentCount: (nextValues.commentsList ?? comments).length,
    });
  };

  const handleLike = async () => {
    const wasLiked = liked;
    const optimisticCount = wasLiked ? Math.max(0, likeCount - 1) : likeCount + 1;

    setLiked(!wasLiked);
    setLikeCount(optimisticCount);

    try {
      const endpoint = wasLiked
        ? `/socialmedia/posts/${post._id}/unlike`
        : `/socialmedia/posts/${post._id}/like`;
      const response = await apiCall(endpoint, "POST");
      const serverCount = Number(response?.post?.likeCount ?? optimisticCount);
      const serverLiked = response?.liked ?? !wasLiked;
      setLiked(Boolean(serverLiked));
      setLikeCount(serverCount);
      publishLocalUpdate({ liked: Boolean(serverLiked), likeCount: serverCount });
    } catch (error) {
      setLiked(wasLiked);
      setLikeCount(likeCount);
      setActionMessage("Could not update like right now.");
    }
  };

  const handleSave = async () => {
    const wasSaved = saved;
    setSaved(!wasSaved);

    try {
      const endpoint = wasSaved
        ? `/socialmedia/posts/${post._id}/unsave`
        : `/socialmedia/posts/${post._id}/save`;
      const response = await apiCall(endpoint, "POST");
      const serverSaved = response?.saved ?? !wasSaved;
      setSaved(Boolean(serverSaved));
      publishLocalUpdate({ saved: Boolean(serverSaved) });
    } catch (error) {
      setSaved(wasSaved);
      setActionMessage("Could not update save status right now.");
    }
  };

  const handleDelete = async () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setActionLoading("delete");
    try {
      await apiCall(`/socialmedia/posts/${post._id}`, "DELETE");
      onPostDeleted(post._id);
      setShowDeleteModal(false);
    } catch (error) {
      setActionMessage("Unable to delete this post.");
    } finally {
      setActionLoading("");
    }
  };

  const handleUpdate = async () => {
    const nextContent = editedContent.trim();
    if (!nextContent) {
      return;
    }

    setActionLoading("update");
    try {
      const response = await apiCall(`/socialmedia/posts/${post._id}`, "PUT", {
        content: nextContent,
      });
      const updated = response?.post;
      const normalizedContent = updated?.content || nextContent;
      publishLocalUpdate({ content: normalizedContent });
      setEditedContent(normalizedContent);
      setIsEditing(false);
      setActionMessage("Post updated.");
    } catch (error) {
      setActionMessage("Unable to update post.");
    } finally {
      setActionLoading("");
    }
  };

  const handleShare = async () => {
    setActionLoading("share");
    try {
      await apiCall(`/socialmedia/posts/${post._id}/share`, "POST");
      const nextShareCount = shareCount + 1;
      setShareCount(nextShareCount);
      publishLocalUpdate({ shareCount: nextShareCount });
      setActionMessage("Post shared successfully.");
    } catch (error) {
      setActionMessage("Unable to share post right now.");
    } finally {
      setActionLoading("");
    }
  };

  const loadComments = async () => {
    setActionLoading("comments");
    try {
      const response = await apiCall(`/socialmedia/posts/${post._id}/comments`, "GET");
      const commentList = buildComments(response?.comments || []);
      setComments(commentList);
      setCommentsLoaded(true);
      publishLocalUpdate({ commentsList: commentList });
    } catch (error) {
      setActionMessage("Unable to load comments right now.");
    } finally {
      setActionLoading("");
    }
  };

  const toggleComments = async () => {
    const nextShow = !showComments;
    setShowComments(nextShow);
    if (nextShow && !commentsLoaded) {
      await loadComments();
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) {
      return;
    }

    setActionLoading("comment");
    try {
      const response = await apiCall(`/socialmedia/posts/${post._id}/comments`, "POST", {
        content: commentText.trim(),
      });

      const createdComment = response?.comment;
      const normalizedComment = buildComments([createdComment])[0];
      const nextComments = [normalizedComment, ...comments];
      setComments(nextComments);
      setCommentText("");
      publishLocalUpdate({ commentsList: nextComments });
    } catch (error) {
      setActionMessage("Unable to add comment right now.");
    } finally {
      setActionLoading("");
    }
  };

  const handleReport = async () => {
    setReportReason('');
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason || !reportReason.trim()) return;
    setActionLoading("report");
    try {
      await apiCall("/socialmedia/report", "POST", {
        reportedObjectType: "post",
        reportedObjectId: post._id,
        reportReason: "other",
        description: reportReason.trim(),
      });
      setActionMessage("Thanks. Report submitted for moderation review.");
      setShowReportModal(false);
    } catch (error) {
      setActionMessage("Unable to submit report right now.");
    } finally {
      setActionLoading("");
    }
  };

  const handleBlockUser = async () => {
    setShowBlockModal(true);
  };

  const confirmBlock = async () => {
    setActionLoading("block");
    try {
      await apiCall(`/socialmedia/users/${author._id}/block`, "POST");
      setActionMessage(`${author.name} has been blocked.`);
      setShowBlockModal(false);
    } catch (error) {
      setActionMessage("Unable to block this user right now.");
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="author-info">
          <img src={getAvatarSrc(author.avatar, author.name)} alt={author.name} className="author-avatar" />
          <div className="author-details">
            <h4>{author.name}</h4>
            <span className="post-time">{createdAt}</span>
            {isOnline ? <span className="presence-indicator online">Online</span> : null}
            {isTyping ? <span className="presence-indicator typing">Typing...</span> : null}
          </div>
        </div>

        {isOwnPost ? (
          <div className="post-menu">
            <button className="menu-btn">...</button>
            <div className="menu-dropdown">
              <button onClick={() => setIsEditing(true)}>Edit</button>
              <button onClick={handleDelete} disabled={actionLoading === "delete"}>
                {actionLoading === "delete" ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="post-content">
        {isEditing ? (
          <div className="edit-mode">
            <textarea value={editedContent} onChange={(event) => setEditedContent(event.target.value)} />
            <div className="edit-actions">
              <button onClick={handleUpdate} className="save-btn" disabled={actionLoading === "update"}>
                {actionLoading === "update" ? "Saving..." : "Save"}
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
              <img
                key={`${post._id}-image-${index}`}
                src={isSafeMediaUrl(image.url) ? image.url : getMediaSrc(image.url)}
                alt={`Post ${index + 1}`}
              />
            ))}
          </div>
        ) : null}

        {hasVideo ? (
          <div className={`post-videos ${post.postType === "reel" ? "reel-mode" : ""}`}>
            {post.videos.map((video, index) => (
              <video
                key={`${post._id}-video-${index}`}
                src={isSafeMediaUrl(video.url) ? video.url : getMediaSrc(video.url)}
                controls
                preload="metadata"
              />
            ))}
          </div>
        ) : null}

        {hasPoll ? (
          <div className="post-poll">
            {post.pollOptions.map((option, index) => (
              <button key={`${post._id}-poll-${index}`} type="button">
                {option.text} <span>{Number(option.voteCount || 0)} votes</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="post-stats">
        <span>{likeCount} likes</span>
        <span>{comments.length} comments</span>
        <span>{shareCount} shares</span>
      </div>

      <div className="post-actions">
        <button className={`action-btn ${liked ? "liked" : ""}`} onClick={handleLike} disabled={actionLoading === "like"}>
          {liked ? "Unlike" : "Like"}
        </button>
        <button className="action-btn" onClick={toggleComments} disabled={actionLoading === "comments"}>
          Comment
        </button>
        <button className="action-btn" onClick={handleShare} disabled={actionLoading === "share"}>
          Share
        </button>
        <button className={`action-btn ${saved ? "saved" : ""}`} onClick={handleSave}>
          {saved ? "Saved" : "Save"}
        </button>
        {!isOwnPost ? (
          <>
            <button className="action-btn report" onClick={handleReport} disabled={actionLoading === "report"}>
              Report
            </button>
            <button className="action-btn report" onClick={handleBlockUser} disabled={actionLoading === "block"}>
              Block
            </button>
          </>
        ) : null}
      </div>

      {actionMessage ? <p className="post-action-message">{actionMessage}</p> : null}

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
            <button onClick={handleCommentSubmit} disabled={!commentText.trim() || actionLoading === "comment"}>
              {actionLoading === "comment" ? "Sending..." : "Send"}
            </button>
          </div>
          <div className="comments-list">
            {comments.map((comment) => (
              <div key={comment._id} className="comment">
                <img src={getAvatarSrc(comment.author.avatar, comment.author.name)} alt={comment.author.name} />
                <div className="comment-content">
                  <strong>{comment.author.name}</strong>
                  <p>{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {showDeleteModal && (
        <Modal
          title="Confirm delete"
          onClose={() => setShowDeleteModal(false)}
          actions={(
            <>
              <button onClick={confirmDelete} className="danger-btn">{actionLoading === 'delete' ? 'Deleting...' : 'Delete'}</button>
              <button onClick={() => setShowDeleteModal(false)}>Cancel</button>
            </>
          )}
        >
          <p>Are you sure you want to delete this post? This action cannot be undone.</p>
        </Modal>
      )}

      {showReportModal && (
        <Modal
          title="Report post"
          onClose={() => setShowReportModal(false)}
          actions={(
            <>
              <button onClick={submitReport} className="primary-btn">{actionLoading === 'report' ? 'Sending...' : 'Submit'}</button>
              <button onClick={() => setShowReportModal(false)}>Cancel</button>
            </>
          )}
        >
          <label>
            Reason
            <input value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="spam, abuse, misinformation" />
          </label>
        </Modal>
      )}

      {showBlockModal && (
        <Modal
          title={`Block ${author.name}?`}
          onClose={() => setShowBlockModal(false)}
          actions={(
            <>
              <button onClick={confirmBlock} className="danger-btn">{actionLoading === 'block' ? 'Blocking...' : 'Block'}</button>
              <button onClick={() => setShowBlockModal(false)}>Cancel</button>
            </>
          )}
        >
          <p>Blocking will hide content from this user and prevent them from messaging you. You can unblock later in settings.</p>
        </Modal>
      )}
    </div>
  );
};

export default PostCard;
