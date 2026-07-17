import React, { useState, useEffect, useRef } from 'react';
import './VoiceAndVideoControls.css';

/**
 * Voice and Video Controls Component
 * Adds text-to-speech narration and video demonstrations
 */
const VoiceAndVideoControls = ({ lessonContent, subject, topic }) => {
  const [isNarrating, setIsNarrating] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [narrationSpeed, setNarrationSpeed] = useState(0.9);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const utteranceRef = useRef(null);

  // Load available voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        
        // Try to select a good English voice
        const preferredVoice = voices.find(v => 
          v.lang.includes('en-') && (
            v.name.includes('Google') || 
            v.name.includes('Microsoft') ||
            v.name.includes('Female') ||
            v.name.includes('Samantha')
          )
        );
        setSelectedVoice(preferredVoice || voices[0]);
      };
      
      loadVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  // Prepare text for narration
  const prepareNarrationText = () => {
    let fullText = '';

    // Introduction
    if (lessonContent.introduction) {
      fullText += `Introduction. ${lessonContent.introduction}. `;
    }

    // Sections
    if (lessonContent.sections) {
      lessonContent.sections.forEach((section, idx) => {
        fullText += `Section ${idx + 1}: ${section.title}. `;
        
        if (typeof section.content === 'string') {
          // Clean up text for better speech
          const cleanContent = section.content
            .replace(/\*\*/g, '') // Remove bold markers
            .replace(/`/g, '') // Remove code markers
            .replace(/₹/g, 'rupees ') // Convert rupee symbol
            .replace(/→/g, ' leads to ')
            .replace(/✅/g, ' check mark ')
            .replace(/❌/g, ' cross mark ');
          fullText += `${cleanContent}. `;
        }

        // Examples
        if (section.examples && section.examples.length > 0) {
          fullText += 'Let me show you some examples. ';
          section.examples.forEach((ex, exIdx) => {
            if (typeof ex === 'string') {
              fullText += `Example ${exIdx + 1}: ${ex}. `;
            } else if (ex.description) {
              fullText += `Example ${exIdx + 1}: ${ex.title || ex.scenario}. ${ex.description}. `;
            }
          });
        }
      });
    }

    // Key Takeaways
    if (lessonContent.keyTakeaways && lessonContent.keyTakeaways.length > 0) {
      fullText += 'Here are the key points to remember. ';
      lessonContent.keyTakeaways.forEach((takeaway, idx) => {
        const cleanTakeaway = takeaway.replace(/✅/g, '').replace(/→/g, ' means ');
        fullText += `Point ${idx + 1}: ${cleanTakeaway}. `;
      });
    }

    return fullText;
  };

  // Start narration
  const startNarration = () => {
    if (!('speechSynthesis' in window)) {
      alert('Sorry, your browser does not support text-to-speech!');
      return;
    }

    // Stop any existing narration
    window.speechSynthesis.cancel();

    const text = prepareNarrationText();
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.voice = selectedVoice;
    utterance.rate = narrationSpeed;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsNarrating(true);
    };

    utterance.onend = () => {
      setIsNarrating(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsNarrating(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Stop narration
  const stopNarration = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsNarrating(false);
    }
  };

  // Pause/Resume narration
  const togglePause = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    } else {
      window.speechSynthesis.pause();
    }
  };

  // Mock video library (replace with actual video URLs)
  const getVideos = () => {
    const videoLibrary = {
      'CA Foundation': {
        'Accounting Fundamentals': [
          {
            title: 'Accounting Equation Made Simple',
            embedUrl: 'https://www.youtube.com/embed/0C4qpAWMXbE',
            thumbnail: 'https://img.youtube.com/vi/0C4qpAWMXbE/mqdefault.jpg',
            duration: '10:30',
          },
        ],
        'Journal Entries': [
          {
            title: 'Golden Rules of Accounting',
            embedUrl: 'https://www.youtube.com/embed/JMq5QgU5TRw',
            thumbnail: 'https://img.youtube.com/vi/JMq5QgU5TRw/mqdefault.jpg',
            duration: '15:20',
          },
        ],
      },
    };

    return videoLibrary[subject]?.[topic] || [];
  };

  const videos = getVideos();

  return (
    <div className="voice-video-controls">
      {/* Voice Narration Controls */}
      <div className="voice-controls">
        <div className="voice-header">
          <h4>🎙️ Voice Narration</h4>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={voiceEnabled}
              onChange={(e) => setVoiceEnabled(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {voiceEnabled && (
          <div className="voice-settings">
            <div className="voice-row">
              <button
                onClick={isNarrating ? stopNarration : startNarration}
                className={`voice-btn ${isNarrating ? 'recording' : ''}`}
                disabled={!selectedVoice}
              >
                {isNarrating ? '⏹️ Stop' : '▶️ Play Lesson'}
              </button>

              {isNarrating && (
                <button onClick={togglePause} className="voice-btn">
                  ⏸️ Pause
                </button>
              )}
            </div>

            <div className="voice-settings-row">
              <label>
                Voice:
                <select
                  value={selectedVoice?.name || ''}
                  onChange={(e) => {
                    const voice = availableVoices.find(v => v.name === e.target.value);
                    setSelectedVoice(voice);
                  }}
                >
                  {availableVoices
                    .filter(v => v.lang.includes('en'))
                    .map(voice => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                </select>
              </label>

              <label>
                Speed:
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={narrationSpeed}
                  onChange={(e) => setNarrationSpeed(Number(e.target.value))}
                />
                <span>{narrationSpeed}x</span>
              </label>
            </div>

            <p className="voice-note">
              💡 Listen to the entire lesson while you follow along!
            </p>
          </div>
        )}
      </div>

      {/* Video Demonstrations */}
      {videos.length > 0 && (
        <div className="video-controls">
          <h4>🎥 Video Demonstrations</h4>
          <div className="video-grid">
            {videos.map((video, idx) => (
              <div
                key={idx}
                className="video-card"
                onClick={() => {
                  setCurrentVideo(video);
                  setShowVideoModal(true);
                }}
              >
                <img src={video.thumbnail} alt={video.title} />
                <div className="video-info">
                  <h5>{video.title}</h5>
                  <span className="duration">{video.duration}</span>
                </div>
                <div className="play-overlay">▶️</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video Modal */}
      {showVideoModal && currentVideo && (
        <div className="video-modal" onClick={() => setShowVideoModal(false)}>
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowVideoModal(false)}
            >
              ✕
            </button>
            <h3>{currentVideo.title}</h3>
            <iframe
              src={currentVideo.embedUrl}
              title={currentVideo.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceAndVideoControls;
