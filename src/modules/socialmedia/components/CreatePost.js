import React, { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../../contexts/AppContext";
import { getAvatarSrc, normalizeSocialUser } from "../socialData";
import "../styles/CreatePost.css";

const SOCIAL_DRAFT_STORAGE_PREFIX = "vibehub-social-composer";

const buildDraftStorageKey = (userId) =>
  `${SOCIAL_DRAFT_STORAGE_PREFIX}:${String(userId || "guest")}`;

const CreatePost = ({ onPostCreated, onSaveDraft, onSchedulePost }) => {
  const { currentUser } = useApp();
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [privacy, setPrivacy] = useState("public");
  const [loading, setLoading] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [showScheduleOptions, setShowScheduleOptions] = useState(false);
  const [composerNotice, setComposerNotice] = useState("");
  const fileInputRef = useRef(null);
  const restoredDraftRef = useRef(false);

  const viewer = normalizeSocialUser(currentUser, "You");
  const draftStorageKey = useMemo(
    () => buildDraftStorageKey(currentUser?._id || currentUser?.id),
    [currentUser]
  );

  const resetComposer = () => {
    setContent("");
    setImages([]);
    setPrivacy("public");
    setScheduleAt("");
    setShowScheduleOptions(false);
    setComposerNotice("");
    restoredDraftRef.current = false;

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(draftStorageKey);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedDraft = window.localStorage.getItem(draftStorageKey);
      if (!storedDraft) {
        return;
      }

      const parsedDraft = JSON.parse(storedDraft);
      setContent(String(parsedDraft?.content || ""));
      setImages(Array.isArray(parsedDraft?.images) ? parsedDraft.images : []);
      setPrivacy(String(parsedDraft?.privacy || "public"));
      restoredDraftRef.current = true;
      setComposerNotice("Recovered your local draft from the last session.");
    } catch (error) {
      // Keep the composer usable even if local draft restoration fails.
    }
  }, [draftStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const payload = {
      content,
      images,
      privacy,
      updatedAt: new Date().toISOString(),
    };

    if (!content.trim() && images.length === 0) {
      window.localStorage.removeItem(draftStorageKey);
      return;
    }

    window.localStorage.setItem(draftStorageKey, JSON.stringify(payload));
  }, [content, draftStorageKey, images, privacy]);

  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files || []);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setImages((current) => [
          ...current,
          {
            fileName: file.name,
            mimeType: file.type || "image/*",
            url: loadEvent.target?.result || "",
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

  const buildPostPayload = () => ({
    content: content.trim(),
    images: images.map((image) => ({
      url: image.url,
      caption: "",
    })),
    privacy,
    hashtags: (content.match(/#\w+/g) || []).map((item) => item.replace("#", "")),
  });

  const validateComposer = (action = "publish") => {
    if (!content.trim() && images.length === 0) {
      window.alert(
        action === "draft"
          ? "Add some content or media before saving this draft."
          : "Please add some content or images."
      );
      return false;
    }

    return true;
  };

  const runComposerAction = async (mode, callback, extraPayload = {}, successMessage = "") => {
    if (!validateComposer(mode)) {
      return;
    }

    if (typeof callback !== "function") {
      return;
    }

    setLoading(mode);

    try {
      await callback({
        ...buildPostPayload(),
        ...extraPayload,
      });

      resetComposer();
      if (successMessage) {
        setComposerNotice(successMessage);
      }
    } catch (error) {
      setComposerNotice(
        error?.response?.data?.message || error?.message || "We could not save this post right now."
      );
    } finally {
      setLoading("");
    }
  };

  const handlePublish = () =>
    runComposerAction("publish", onPostCreated, {}, "Post published successfully.");

  const handleSaveDraft = () =>
    runComposerAction("draft", onSaveDraft, { status: "draft" }, "Draft saved.");

  const handleSchedule = () => {
    if (!scheduleAt) {
      window.alert("Choose a future time for the scheduled post.");
      return;
    }

    const scheduledFor = new Date(scheduleAt);
    if (Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() <= Date.now()) {
      window.alert("Scheduled posts need a future publish time.");
      return;
    }

    runComposerAction(
      "schedule",
      onSchedulePost,
      {
        status: "scheduled",
        scheduledFor: scheduledFor.toISOString(),
      },
      "Post scheduled successfully."
    );
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

      {composerNotice ? <p className="composer-notice">{composerNotice}</p> : null}

      {images.length > 0 ? (
        <div className="image-previews">
          {images.map((image, index) => (
            <div key={`${image.fileName || "preview"}-${index}`} className="image-preview-item">
              <img src={image.url} alt={`Preview ${index + 1}`} />
              <button className="remove-image-btn" onClick={() => removeImage(index)} type="button">
                X
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {showScheduleOptions ? (
        <div className="schedule-controls">
          <label htmlFor="social-schedule-at">Schedule publish time</label>
          <input
            id="social-schedule-at"
            type="datetime-local"
            value={scheduleAt}
            onChange={(event) => setScheduleAt(event.target.value)}
          />
        </div>
      ) : null}

      <div className="post-actions">
        <button
          className="action-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Add photos"
          type="button"
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
          className="action-btn"
          onClick={handleSaveDraft}
          disabled={Boolean(loading)}
          type="button"
        >
          {loading === "draft" ? "Saving..." : "Save Draft"}
        </button>

        <button
          className="action-btn"
          onClick={() => setShowScheduleOptions((current) => !current)}
          disabled={Boolean(loading)}
          type="button"
        >
          {showScheduleOptions ? "Hide Schedule" : "Schedule"}
        </button>

        {showScheduleOptions ? (
          <button
            className="action-btn"
            onClick={handleSchedule}
            disabled={Boolean(loading)}
            type="button"
          >
            {loading === "schedule" ? "Scheduling..." : "Confirm Schedule"}
          </button>
        ) : null}

        <button
          className="submit-btn"
          onClick={handlePublish}
          disabled={Boolean(loading) || (!content.trim() && images.length === 0)}
          type="button"
        >
          {loading === "publish" ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
};

export default CreatePost;
