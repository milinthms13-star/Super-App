import React, { useState, useEffect, useRef } from 'react';
import './EnhancedVoiceAndVideoControls.css';

/**
 * Enhanced Voice and Video Controls Component
 * Features: Text-to-speech narration, multilingual support, YouTube integration,
 * speed control, bookmarks, and transcripts
 */
const EnhancedVoiceAndVideoControls = ({ lessonContent, subject, topic }) => {
  // Voice narration states
  const [isNarrating, setIsNarrating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [narrationSpeed, setNarrationSpeed] = useState(1.0);
  const [narrationPitch, setNarrationPitch] = useState(1.0);
  const [narrationVolume, setNarrationVolume] = useState(1.0);
  
  // Language support
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Video states
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [videos, setVideos] = useState([]);
  const [videoSearchQuery, setVideoSearchQuery] = useState('');
  
  // Bookmark states
  const [bookmarks, setBookmarks] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(0);
  
  const utteranceRef = useRef(null);
  const progressIntervalRef = useRef(null);

  const SUPPORTED_LANGUAGES = [
    { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
    { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
    { code: 'es-ES', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr-FR', name: 'French', flag: '🇫🇷' },
    { code: 'de-DE', name: 'German', flag: '🇩🇪' },
    { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳' },
    { code: 'zh-CN', name: 'Chinese', flag: '🇨🇳' },
    { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵' },
    { code: 'ko-KR', name: 'Korean', flag: '🇰🇷' },
    { code: 'pt-BR', name: 'Portuguese', flag: '🇧🇷' },
    { code: 'ru-RU', name: 'Russian', flag: '🇷🇺' },
    { code: 'ar-SA', name: 'Arabic', flag: '🇸🇦' },
  ];

  // Load available voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        
        // Select best voice for selected language
        const preferredVoice = voices.find(v => 
          v.lang.includes(selectedLanguage.split('-')[0]) && (
            v.name.includes('Google') || 
            v.name.includes('Microsoft') ||
            v.name.includes('Natural') ||
            v.quality === 'high'
          )
        );
        setSelectedVoice(preferredVoice || voices.find(v => v.lang.includes(selectedLanguage)) || voices[0]);
      };
      
      loadVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, [selectedLanguage]);

  // Load videos for the topic
  useEffect(() => {
    loadVideos();
  }, [subject, topic]);

  const loadVideos = () => {
    // Enhanced video library with real YouTube content
    const videoLibrary = {
      'JavaScript': {
        'Async Programming': [
          {
            title: 'JavaScript Promises Explained',
            videoId: 'DHvZLI7Db8E',
            embedUrl: 'https://www.youtube.com/embed/DHvZLI7Db8E',
            thumbnail: 'https://img.youtube.com/vi/DHvZLI7Db8E/mqdefault.jpg',
            duration: '15:32',
            channel: 'Web Dev Simplified',
          },
          {
            title: 'Async/Await Tutorial',
            videoId: 'V_Kr9OSfDeU',
            embedUrl: 'https://www.youtube.com/embed/V_Kr9OSfDeU',
            thumbnail: 'https://img.youtube.com/vi/V_Kr9OSfDeU/mqdefault.jpg',
            duration: '12:47',
            channel: 'Traversy Media',
          },
        ],
        'Closures': [
          {
            title: 'JavaScript Closures Explained',
            videoId: 'qikxEIxsXco',
            embedUrl: 'https://www.youtube.com/embed/qikxEIxsXco',
            thumbnail: 'https://img.youtube.com/vi/qikxEIxsXco/mqdefault.jpg',
            duration: '10:15',
            channel: 'Academind',
          },
        ],
      },
      'Python': {
        'Data Structures': [
          {
            title: 'Python Data Structures Tutorial',
            videoId: 'R-HLU9Fl5ug',
            embedUrl: 'https://www.youtube.com/embed/R-HLU9Fl5ug',
            thumbnail: 'https://img.youtube.com/vi/R-HLU9Fl5ug/mqdefault.jpg',
            duration: '18:22',
            channel: 'Corey Schafer',
          },
        ],
      },
      'React': {
        'Hooks': [
          {
            title: 'React Hooks Tutorial',
            videoId: 'O6P86uwfdR0',
            embedUrl: 'https://www.youtube.com/embed/O6P86uwfdR0',
            thumbnail: 'https://img.youtube.com/vi/O6P86uwfdR0/mqdefault.jpg',
            duration: '25:15',
            channel: 'Fireship',
          },
        ],
      },
      'CA Foundation': {
        'Accounting': [
          {
            title: 'CA Foundation Accounting Basics',
            videoId: '0C4qpAWMXbE',
            embedUrl: 'https://www.youtube.com/embed/0C4qpAWMXbE',
            thumbnail: 'https://img.youtube.com/vi/0C4qpAWMXbE/mqdefault.jpg',
            duration: '30:45',
            channel: 'CA Tutorials',
          },
        ],
      },
    };

    const topicVideos = videoLibrary[subject]?.[topic] || [];
    setVideos(topicVideos);
  };

  // Prepare text for narration
  const prepareNarrationText = () => {
    let fullText = '';

    if (lessonContent.title) {
      fullText += `Lesson: ${lessonContent.title}. `;
    }

    if (lessonContent.introduction) {
      fullText += `Introduction. ${cleanTextForSpeech(lessonContent.introduction)}. `;
    }

    if (lessonContent.sections) {
      lessonContent.sections.forEach((section, idx) => {
        fullText += `Section ${idx + 1}: ${section.title}. `;
        
        if (typeof section.content === 'string') {
          fullText += `${cleanTextForSpeech(section.content)}. `;
        } else if (Array.isArray(section.content)) {
          section.content.forEach((item, i) => {
            if (typeof item === 'string') {
              fullText += `${cleanTextForSpeech(item)}. `;
            } else if (item.description) {
              fullText += `${item.name || item.title}. ${cleanTextForSpeech(item.description)}. `;
            }
          });
        }

        if (section.examples && section.examples.length > 0) {
          fullText += 'Examples: ';
          section.examples.forEach((ex, exIdx) => {
            if (typeof ex === 'string') {
              fullText += `Example ${exIdx + 1}: ${cleanTextForSpeech(ex)}. `;
            } else if (ex.description) {
              fullText += `${cleanTextForSpeech(ex.description)}. `;
            }
          });
        }
      });
    }

    if (lessonContent.keyTakeaways && lessonContent.keyTakeaways.length > 0) {
      fullText += 'Key Takeaways: ';
      lessonContent.keyTakeaways.forEach((takeaway) => {
        fullText += `${cleanTextForSpeech(takeaway)}. `;
      });
    }

    return fullText;
  };

  const cleanTextForSpeech = (text) => {
    return text
      .replace(/\*\*/g, '') // Remove bold markers
      .replace(/`/g, '') // Remove code markers
      .replace(/₹/g, 'rupees ')
      .replace(/\$/g, 'dollars ')
      .replace(/€/g, 'euros ')
      .replace(/→/g, ' leads to ')
      .replace(/✅/g, ' check ')
      .replace(/❌/g, ' cross ')
      .replace(/\n+/g, '. ') // Replace newlines with periods
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };

  // Start narration
  const startNarration = () => {
    if (!('speechSynthesis' in window)) {
      alert('Sorry, your browser does not support text-to-speech!');
      return;
    }

    window.speechSynthesis.cancel();

    const text = prepareNarrationText();
    setTranscript(text);
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.voice = selectedVoice;
    utterance.rate = narrationSpeed;
    utterance.pitch = narrationPitch;
    utterance.volume = narrationVolume;
    utterance.lang = selectedLanguage;

    utterance.onstart = () => {
      setIsNarrating(true);
      setIsPaused(false);
      startProgressTracking(text.split(' ').length);
    };

    utterance.onend = () => {
      setIsNarrating(false);
      setIsPaused(false);
      stopProgressTracking();
      setCurrentPosition(0);
    };

    utterance.onpause = () => {
      setIsPaused(true);
      stopProgressTracking();
    };

    utterance.onresume = () => {
      setIsPaused(false);
      startProgressTracking(text.split(' ').length);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsNarrating(false);
      setIsPaused(false);
      stopProgressTracking();
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopNarration = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsNarrating(false);
      setIsPaused(false);
      stopProgressTracking();
      setCurrentPosition(0);
    }
  };

  const togglePause = () => {
    if (!window.speechSynthesis) return;
    
    if (isPaused) {
      window.speechSynthesis.resume();
    } else {
      window.speechSynthesis.pause();
    }
  };

  const startProgressTracking = (totalWords) => {
    let position = 0;
    progressIntervalRef.current = setInterval(() => {
      position += 1;
      setCurrentPosition(Math.min(position, totalWords));
    }, 200);
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const addBookmark = () => {
    if (!isNarrating) return;
    
    const bookmark = {
      id: Date.now(),
      position: currentPosition,
      timestamp: new Date().toLocaleTimeString(),
      label: `Bookmark ${bookmarks.length + 1}`,
    };
    
    setBookmarks([...bookmarks, bookmark]);
  };

  const jumpToBookmark = (bookmark) => {
    // Note: Jumping to specific positions in Web Speech API is limited
    // This is a simplified implementation
    stopNarration();
    // Would need more complex logic to resume from bookmark
  };

  const searchYouTubeVideos = async () => {
    if (!videoSearchQuery.trim()) return;
    
    // In a real implementation, you would call YouTube Data API
    // For now, we'll simulate a search
    console.log('Searching YouTube for:', videoSearchQuery);
    // API call would go here
  };

  const handleVideoEnd = () => {
    setShowVideoModal(false);
    setCurrentVideo(null);
  };

  return (
    <div className="enhanced-voice-video-controls">
      {/* Voice Narration Section */}
      <div className="control-section voice-section">
        <div className="section-header">
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
          <div className="voice-controls-expanded">
            {/* Language Selection */}
            <div className="control-row">
              <label>Language</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="control-select"
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Voice Selection */}
            <div className="control-row">
              <label>Voice</label>
              <select
                value={selectedVoice?.name || ''}
                onChange={(e) => {
                  const voice = availableVoices.find(v => v.name === e.target.value);
                  setSelectedVoice(voice);
                }}
                className="control-select"
              >
                {availableVoices
                  .filter(v => v.lang.includes(selectedLanguage.split('-')[0]))
                  .map(voice => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Playback Controls */}
            <div className="playback-controls">
              <button
                onClick={isNarrating ? stopNarration : startNarration}
                className={`control-btn primary ${isNarrating ? 'recording' : ''}`}
                disabled={!selectedVoice}
              >
                {isNarrating ? '⏹️ Stop' : '▶️ Play Lesson'}
              </button>

              {isNarrating && (
                <>
                  <button onClick={togglePause} className="control-btn">
                    {isPaused ? '▶️ Resume' : '⏸️ Pause'}
                  </button>
                  <button onClick={addBookmark} className="control-btn">
                    🔖 Bookmark
                  </button>
                </>
              )}
            </div>

            {/* Advanced Settings */}
            <div className="advanced-settings">
              <div className="control-slider">
                <label>
                  Speed: {narrationSpeed.toFixed(1)}x
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={narrationSpeed}
                    onChange={(e) => setNarrationSpeed(Number(e.target.value))}
                  />
                </label>
              </div>

              <div className="control-slider">
                <label>
                  Pitch: {narrationPitch.toFixed(1)}
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={narrationPitch}
                    onChange={(e) => setNarrationPitch(Number(e.target.value))}
                  />
                </label>
              </div>

              <div className="control-slider">
                <label>
                  Volume: {Math.round(narrationVolume * 100)}%
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={narrationVolume}
                    onChange={(e) => setNarrationVolume(Number(e.target.value))}
                  />
                </label>
              </div>
            </div>

            {/* Progress Bar */}
            {isNarrating && (
              <div className="narration-progress">
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${(currentPosition / transcript.split(' ').length) * 100}%` }}
                  ></div>
                </div>
                <span className="progress-text">
                  {currentPosition} / {transcript.split(' ').length} words
                </span>
              </div>
            )}

            {/* Bookmarks */}
            {bookmarks.length > 0 && (
              <div className="bookmarks-section">
                <h5>📑 Bookmarks</h5>
                <div className="bookmarks-list">
                  {bookmarks.map(bookmark => (
                    <div key={bookmark.id} className="bookmark-item">
                      <span>{bookmark.label} - {bookmark.timestamp}</span>
                      <button 
                        onClick={() => jumpToBookmark(bookmark)}
                        className="bookmark-jump-btn"
                      >
                        Jump
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transcript */}
            <div className="transcript-section">
              <button 
                onClick={() => setShowTranscript(!showTranscript)}
                className="transcript-toggle"
              >
                {showTranscript ? '📖 Hide Transcript' : '📖 Show Transcript'}
              </button>
              {showTranscript && transcript && (
                <div className="transcript-content">
                  {transcript}
                </div>
              )}
            </div>

            <p className="control-tip">
              💡 Listen to the entire lesson while you follow along! Supports 12+ languages.
            </p>
          </div>
        )}
      </div>

      {/* Video Demonstrations Section */}
      <div className="control-section video-section">
        <h4>🎥 Video Demonstrations</h4>
        
        {/* YouTube Search */}
        <div className="video-search">
          <input
            type="text"
            placeholder="Search YouTube for related videos..."
            value={videoSearchQuery}
            onChange={(e) => setVideoSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchYouTubeVideos()}
            className="search-input"
          />
          <button onClick={searchYouTubeVideos} className="search-btn">
            🔍 Search
          </button>
        </div>

        {videos.length > 0 ? (
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
                <div className="video-thumbnail-wrapper">
                  <img src={video.thumbnail} alt={video.title} />
                  <div className="video-duration">{video.duration}</div>
                  <div className="play-overlay">
                    <div className="play-icon">▶️</div>
                  </div>
                </div>
                <div className="video-info">
                  <h5>{video.title}</h5>
                  <span className="video-channel">{video.channel}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-videos-message">
            <p>No curated videos available for this topic yet.</p>
            <p>Try searching YouTube above!</p>
          </div>
        )}
      </div>

      {/* Video Modal */}
      {showVideoModal && currentVideo && (
        <div className="video-modal-overlay" onClick={() => setShowVideoModal(false)}>
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setShowVideoModal(false)}
            >
              ✕
            </button>
            <h3>{currentVideo.title}</h3>
            <p className="video-modal-channel">by {currentVideo.channel}</p>
            <div className="video-embed-container">
              <iframe
                src={`${currentVideo.embedUrl}?autoplay=1&rel=0`}
                title={currentVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onEnded={handleVideoEnd}
              />
            </div>
            <div className="video-actions">
              <a 
                href={`https://www.youtube.com/watch?v=${currentVideo.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="watch-on-youtube"
              >
                Watch on YouTube ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedVoiceAndVideoControls;
