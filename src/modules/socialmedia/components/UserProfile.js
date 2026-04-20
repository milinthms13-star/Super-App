import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../../contexts/AppContext";
import { buildStoryGroups, getAvatarSrc, normalizeSocialPosts, normalizeSocialUser } from "../socialData";
import "../styles/UserProfile.css";

const UserProfile = ({ userId }) => {
  const { currentUser, mockData } = useApp();
  const posts = useMemo(
    () => normalizeSocialPosts(mockData?.socialMediaPosts || []),
    [mockData?.socialMediaPosts]
  );
  const storyGroups = useMemo(
    () => buildStoryGroups(mockData?.socialMediaStories || []),
    [mockData?.socialMediaStories]
  );
  const [isFollowing, setIsFollowing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    bio: "",
    website: "",
    location: "",
    profession: "",
  });

  const viewer = normalizeSocialUser(currentUser, "You");
  const profileUser = useMemo(() => {
    const matchedPostUser = posts.find((post) => String(post.author._id) === String(userId))?.author;
    const matchedStoryUser = storyGroups.find((group) => String(group.author._id) === String(userId))?.author;
    return matchedPostUser || matchedStoryUser || (String(viewer._id) === String(userId) ? viewer : null);
  }, [posts, storyGroups, userId, viewer]);

  const userPosts = useMemo(
    () => posts.filter((post) => String(post.author._id) === String(profileUser?._id)),
    [posts, profileUser?._id]
  );

  useEffect(() => {
    setEditData({
      bio: profileUser ? `${profileUser.name} is active on VibeHub.` : "",
      website: "",
      location: "Kerala",
      profession: "Community member",
    });
  }, [profileUser]);

  const isOwnProfile = String(viewer._id) === String(userId);

  if (!profileUser) {
    return <div className="error">User not found</div>;
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        <div className="profile-info-section">
          <img
            src={getAvatarSrc(profileUser.avatar, profileUser.name)}
            alt={profileUser.name}
            className="profile-photo"
          />

          <div className="profile-details">
            <h1>{profileUser.name}</h1>
            <p className="username">@{profileUser.email.split("@")[0]}</p>

            {isEditing && isOwnProfile ? (
              <div className="edit-mode">
                <textarea
                  value={editData.bio}
                  onChange={(event) => setEditData({ ...editData, bio: event.target.value })}
                  placeholder="Bio"
                />
                <input
                  type="text"
                  value={editData.website}
                  onChange={(event) => setEditData({ ...editData, website: event.target.value })}
                  placeholder="Website"
                />
                <input
                  type="text"
                  value={editData.location}
                  onChange={(event) => setEditData({ ...editData, location: event.target.value })}
                  placeholder="Location"
                />
                <input
                  type="text"
                  value={editData.profession}
                  onChange={(event) => setEditData({ ...editData, profession: event.target.value })}
                  placeholder="Profession"
                />
                <div className="edit-actions">
                  <button onClick={() => setIsEditing(false)}>Save</button>
                  <button onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                {editData.bio ? <p className="bio">{editData.bio}</p> : null}
                <div className="profile-meta">
                  {editData.location ? <span>{editData.location}</span> : null}
                  {editData.profession ? <span>{editData.profession}</span> : null}
                  {editData.website ? <span>{editData.website}</span> : null}
                </div>
              </>
            )}
          </div>

          <div className="profile-actions">
            {isOwnProfile ? (
              <button className="edit-profile-btn" onClick={() => setIsEditing((current) => !current)}>
                {isEditing ? "Cancel" : "Edit Profile"}
              </button>
            ) : (
              <>
                <button
                  className={`follow-btn ${isFollowing ? "following" : ""}`}
                  onClick={() => setIsFollowing((current) => !current)}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
                <button className="message-btn">Message</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="profile-stats">
        <div className="stat">
          <span className="stat-number">{userPosts.length}</span>
          <span className="stat-label">Posts</span>
        </div>
        <div className="stat">
          <span className="stat-number">{userPosts.reduce((sum, post) => sum + post.likeCount, 0)}</span>
          <span className="stat-label">Likes</span>
        </div>
        <div className="stat">
          <span className="stat-number">{storyGroups.find((group) => group.author._id === profileUser._id)?.stories.length || 0}</span>
          <span className="stat-label">Stories</span>
        </div>
      </div>

      <div className="profile-tabs">
        <button className="tab-btn active">Posts</button>
        <button className="tab-btn">Media</button>
        <button className="tab-btn">Likes</button>
      </div>

      <div className="user-posts">
        {userPosts.length === 0 ? (
          <div className="empty-state">
            <p>No posts yet.</p>
          </div>
        ) : (
          userPosts.map((post) => (
            <div key={post._id} className="post-preview">
              <p>{post.content.length > 100 ? `${post.content.slice(0, 100)}...` : post.content}</p>
              <div className="post-stats">
                <span>{post.likeCount} likes</span>
                <span>{post.commentCount} comments</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserProfile;
