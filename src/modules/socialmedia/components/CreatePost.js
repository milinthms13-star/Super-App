import React, { useRef, useState } from "react";
import { useApp } from "../../../contexts/AppContext";
import { getAvatarSrc, normalizeSocialUser } from "../socialData";
import "../styles/CreatePost.css";

const CreatePost = ({ onPostCreated }) => {
  const { currentUser } = useApp();
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [privacy, setPrivacy] = useState("public");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const viewer = normalizeSocialUser(currentUser, "You");

  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files || []);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setImages((current) => [
          ...current,
          {
            file,
            preview: loadEvent.target?.result || "",
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    event.target.value = "";
  };

  const removeImage = (index) => {
    setImages((current) => current.filter((_, imageIndex) => imageIndex !== index));
  };

  const handleSubmit = () => {
    if (!content.trim() && images.length === 0) {
      window.alert("Please add some content or images.");
      return;
    }

    setLoading(true);

    const createdPost = {
      _id: `post-${Date.now()}`,
      author: viewer,
      content: content.trim(),
      images: images.map((image) => ({ url: image.preview })),
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      liked: false,
      saved: false,
      commentsList: [],
      hashtags: (content.match(/#\w+/g) || []).map((item) => item.replace("#", "")),
      createdAt: new Date().toISOString(),
      privacy,
    };

    onPostCreated(createdPost);
    setContent("");
    setImages([]);
    setPrivacy("public");
    setLoading(false);
  };

  return (
    <div className="create-post">
      <div className="create-post-header">
        <img
          src={getAvatarSrc(currentUser?.avatar, currentUser?.name || "You")}
          alt={viewer.name}
          className="user-avatar"
        />
        <textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="post-input"
          rows="3"
        />
      </div>

      {images.length > 0 ? (
        <div className="image-previews">
          {images.map((image, index) => (
            <div key={`${image.file?.name || "preview"}-${index}`} className="image-preview-item">
              <img src={image.preview} alt={`Preview ${index + 1}`} />
              <button className="remove-image-btn" onClick={() => removeImage(index)}>
                X
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="post-actions">
        <button
          className="action-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Add photos"
        >
          Photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageSelect}
          style={{ display: "none" }}
        />

        <select
          value={privacy}
          onChange={(event) => setPrivacy(event.target.value)}
          className="privacy-select"
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
          <option value="friends">Friends</option>
        </select>

        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={loading || (!content.trim() && images.length === 0)}
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
};

export default CreatePost;
