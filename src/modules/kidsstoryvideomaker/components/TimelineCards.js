import React from "react";

const TimelineCards = React.memo(function TimelineCards({ scenes, getSceneId }) {
  if (!scenes.length) {
    return <p>Create the project to build your scene timeline.</p>;
  }

  return scenes.map((scene, index) => {
    const sceneId = getSceneId(scene, index);
    return (
      <div key={sceneId} className="timeline-card">
        <div className="timeline-number">{sceneId}</div>
        <div>
          <strong>{scene.title || `Scene ${sceneId}`}</strong>
          <p>{scene.description || scene.summary}</p>
        </div>
      </div>
    );
  });
});

export default TimelineCards;
