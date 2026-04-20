import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../../contexts/AppContext";
import { buildStoryGroups, getAvatarSrc, getMediaSrc, normalizeSocialUser } from "../socialData";
import "../styles/Stories.css";

const Stories = () => {
  const { currentUser, mockData } = useApp();
  const baseStoryGroups = useMemo(
    () => buildStoryGroups(mockData?.socialMediaStories || []),
    [mockData?.socialMediaStories]
  );
  const [storyGroups, setStoryGroups] = useState(baseStoryGroups);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [storyFile, setStoryFile] = useState(null);
  const [storyText, setStoryText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStoryGroups(baseStoryGroups);
  }, [baseStoryGroups]);

  const selectedGroup =
    storyGroups.find((group) => String(group._id) === String(selectedGroupId)) || null;
  const currentViewingStory = selectedGroup?.stories?.[currentStoryIndex] || null;

  const handleViewStory = (groupId) => {
    setSelectedGroupId(groupId);
    setCurrentStoryIndex(0);
  };

  const handleNextStory = () => {
    if (!selectedGroup) {
      return;
    }

    if (currentStoryIndex < selectedGroup.stories.length - 1) {
      setCurrentStoryIndex((current) => current + 1);
      return;
    }

    setSelectedGroupId("");
    setCurrentStoryIndex(0);
  };

  const handlePreviousStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((current) => current - 1);
    }
  };

  const closeStory = () => {
    setSelectedGroupId("");
    setCurrentStoryIndex(0);
  };

  const handleCreateStory = () => {
    if (!storyFile) {
      window.alert("Please select an image or video.");
      return;
    }

    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const author = normalizeSocialUser(currentUser, "You");
      const newStory = {
        _id: `story-${Date.now()}`,
        author,
        content: storyText.trim(),
        mediaUrl: event.target?.result || getMediaSrc("Your Story", "Your Story"),
        viewCount: 0,
        reactions: [{ emoji: "Like" }],
        createdAt: new Date().toISOString(),
      };

      setStoryGroups((current) => {
        const existingGroupIndex = current.findIndex((group) => group.author._id === author._id);
        if (existingGroupIndex >= 0) {
          return current.map((group, index) =>
            index === existingGroupIndex
              ? { ...group, stories: [newStory, ...group.stories] }
              : group
          );
        }

        return [{ _id: author._id, author, stories: [newStory] }, ...current];
      });

      setShowCreateModal(false);
      setStoryFile(null);
      setStoryText("");
      setLoading(false);
    };

    reader.onerror = () => {
      setLoading(false);
      window.alert("Failed to create the story.");
    };

    reader.readAsDataURL(storyFile);
  };

  return (
    <div className="stories-container">
      <div className="stories-header">
        <h2>Stories</h2>
        <button className="create-story-btn" onClick={() => setShowCreateModal(true)}>
          Create Story
        </button>
      </div>

      <div className="stories-grid">
        {storyGroups.map((group) => (
          <div key={group._id} className="story-group" onClick={() => handleViewStory(group._id)}>
            <div className="story-thumbnail">
              <img src={group.stories[0]?.mediaUrl} alt={group.author.name} />
            </div>
            <div className="story-info">
              <img src={group.author.avatar} alt={group.author.name} className="story-avatar" />
              <p>{group.author.name}</p>
            </div>
          </div>
        ))}
      </div>

      {selectedGroup && currentViewingStory ? (
        <div className="story-viewer">
          <button className="close-btn" onClick={closeStory}>
            X
          </button>

          <button
            className="nav-btn prev"
            onClick={handlePreviousStory}
            disabled={currentStoryIndex === 0}
          >
            Prev
          </button>

          <div className="story-content">
            <img src={currentViewingStory.mediaUrl} alt={currentViewingStory.author.name} />
            {currentViewingStory.content ? (
              <div className="story-text">{currentViewingStory.content}</div>
            ) : null}
          </div>

          <button className="nav-btn next" onClick={handleNextStory}>
            Next
          </button>

          <div className="story-meta">
            <div className="story-author">
              <img src={getAvatarSrc(currentViewingStory.author.avatar, currentViewingStory.author.name)} alt="" />
              <span>{currentViewingStory.author.name}</span>
            </div>
            <div className="story-views">{currentViewingStory.viewCount} views</div>
          </div>

          <div className="story-reactions">
            {currentViewingStory.reactions.map((reaction, index) => (
              <span key={`${reaction.emoji}-${index}`} className="reaction">
                {reaction.emoji}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {showCreateModal ? (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <h3>Create a Story</h3>

            <div className="file-input-area">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(event) => setStoryFile(event.target.files?.[0] || null)}
              />
              {storyFile ? (
                <div className="file-preview">
                  <p>{storyFile.name}</p>
                </div>
              ) : null}
            </div>

            <textarea
              placeholder="Add text to your story (optional)"
              value={storyText}
              onChange={(event) => setStoryText(event.target.value)}
              rows="3"
            />

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="submit-btn" onClick={handleCreateStory} disabled={!storyFile || loading}>
                {loading ? "Creating..." : "Create Story"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Stories;
