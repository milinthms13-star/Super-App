import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../../utils/api';
import { getStoredAuthToken } from '../../utils/auth';
import './VoiceFriend.css';

const VOICE_PERSONAS = [
  { id: 'supportive', label: 'Calm Supporter' },
  { id: 'motivational', label: 'Motivator' },
  { id: 'mindful', label: 'Mindful Guide' },
  { id: 'playful', label: 'Playful Friend' },
];

const MOOD_OPTIONS = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'happy', label: 'Happy' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'sad', label: 'Sad' },
];

const AI_FRIENDS = [
  {
    id: 'nila',
    name: 'Nila',
    avatar: '/avatars/nila.png',
    voice: 'female-soft',
    personality: 'Caring and emotional',
    style: 'calm and gentle',
    color: '#c7d2fe',
    label: 'Comforting companion',
  },
  {
    id: 'arjun',
    name: 'Arjun',
    avatar: '/avatars/arjun.png',
    voice: 'male-calm',
    personality: 'Protective and motivating',
    style: 'warm and encouraging',
    color: '#a7f3d0',
    label: 'Motivating buddy',
  },
  {
    id: 'anya',
    name: 'Anya',
    avatar: '/avatars/anya.png',
    voice: 'female-warm',
    personality: 'Empathetic and soothing',
    style: 'soft and comforting',
    color: '#fbcfe8',
    label: 'Soothing guide',
  },
];

const STORAGE_KEY = 'voiceFriendState';

const buildRequestHeaders = () => {
  const token = getStoredAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const VoiceFriend = () => {
  const [sessionId, setSessionId] = useState(null);
  const [friendId, setFriendId] = useState('nila');
  const [userName, setUserName] = useState('');
  const [persona, setPersona] = useState('supportive');
  const [mood, setMood] = useState('neutral');
  const [language, setLanguage] = useState('en');
  const [messageText, setMessageText] = useState('');
  const [conversation, setConversation] = useState([]);
  const [status, setStatus] = useState('Welcome to your AI Voice Friend. Share what you feel or ask for encouragement.');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [friendCustomName, setFriendCustomName] = useState('');
  const [friendCustomAvatar, setFriendCustomAvatar] = useState('');
  const [persistData, setPersistData] = useState(true);
  const [hasPendingSessionSettings, setHasPendingSessionSettings] = useState(false);
  const [editingPersona, setEditingPersona] = useState(false);
  const recognition = useRef(null);
  const audioPlayerRef = useRef(null);
  const avatarInputRef = useRef(null);
  const messageAbortControllerRef = useRef(null);
  const speechAbortControllerRef = useRef(null);
  const chatPanelRef = useRef(null);
  const hasInitializedRef = useRef(false);
  const sessionMetaRef = useRef({ friendId: 'nila', userName: '', persona: 'supportive', mood: 'neutral', language: 'en' });
  const lastAssistantTextRef = useRef('');

  const selectedFriend = useMemo(
    () => AI_FRIENDS.find((friend) => friend.id === friendId) || AI_FRIENDS[0],
    [friendId]
  );

  const markPendingSessionSettings = useCallback(() => {
    setHasPendingSessionSettings(true);
  }, []);

  const handleFriendIdChange = (value) => {
    setFriendId(value);
    markPendingSessionSettings();
  };

  const handleUserNameChange = (value) => {
    setUserName(value);
    markPendingSessionSettings();
  };

  const handlePersonaChange = (value) => {
    setPersona(value);
    markPendingSessionSettings();
  };

  const handleMoodChange = (value) => {
    setMood(value);
    markPendingSessionSettings();
  };

  const handleLanguageChange = (value) => {
    setLanguage(value);
    markPendingSessionSettings();
  };

  const applySessionSettings = async () => {
    if (busy) return;
    setStatus('Applying updated Voice Friend settings...');
    setBusy(true);
    await initSession(undefined, friendId, userName);
    setBusy(false);
  };

  useEffect(() => {
    if (recognition.current?.abort) {
      try {
        recognition.current.abort();
      } catch (err) {
        // ignore stale abort errors
      }
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const instance = new SpeechRecognition();
      instance.continuous = false;
      instance.interimResults = false;
      instance.lang = language || 'en-IN';

      instance.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setMessageText(transcript);
          setStatus('Voice captured. Edit or send your message.');
        }
      };

      instance.onerror = (event) => {
        setListening(false);
        if (event?.error === 'not-allowed' || event?.error === 'permission-denied') {
          setStatus('Microphone access was denied. Please allow access in your browser settings.');
        } else if (event?.error === 'no-speech') {
          setStatus('No speech was detected. Try speaking a little louder.');
        } else {
          setStatus('Voice recognition failed. Try again or type your message.');
        }
      };

      instance.onend = () => {
        setListening(false);
      };

      recognition.current = instance;
    }

    return () => {
      if (recognition.current?.abort) {
        try {
          recognition.current.abort();
        } catch (err) {
          // ignore stale abort errors
        }
      }
    };
  }, [language]);

  const initSession = useCallback(async (existingSessionId, initialFriendId, initialUserName) => {
    try {
      setBusy(true);
      const sessionFriendId = initialFriendId || friendId;
      const sessionUserName = initialUserName || userName;

      if (existingSessionId) {
        try {
          const historyResponse = await axios.get(
            buildApiUrl(`/ai-voice-friend/history/${existingSessionId}`),
            { headers: buildRequestHeaders() }
          );

          if (historyResponse?.data?.success) {
            const sessionData = historyResponse.data.data;
            setSessionId(sessionData.sessionId);
            setFriendId(sessionData.friendId || sessionFriendId);
            setPersona(sessionData.persona || persona);
            setMood(sessionData.mood || mood);
            setLanguage(sessionData.language || language);
            setUserName(sessionData.userName || sessionUserName || '');
            setConversation(sessionData.messages || []);
            setStatus('Restored your previous Voice Friend session.');
            sessionMetaRef.current = {
              friendId: sessionData.friendId || sessionFriendId,
              userName: sessionData.userName || sessionUserName || '',
              persona: sessionData.persona || persona,
              mood: sessionData.mood || mood,
              language: sessionData.language || language,
            };
            setHasPendingSessionSettings(false);
            return;
          }
        } catch (restoreError) {
          console.warn('Voice Friend session restore failed:', restoreError.message);
        }
      }

      setConversation([]);
      const response = await axios.post(
        buildApiUrl('/ai-voice-friend/init'),
        { persona, mood, language, friendId: sessionFriendId, userName: sessionUserName },
        { headers: buildRequestHeaders() }
      );

      if (response?.data?.success) {
        setSessionId(response.data.data.sessionId);
        setStatus('Voice Friend session ready. Start the conversation when you are ready.');
        sessionMetaRef.current = {
          friendId: sessionFriendId,
          userName: sessionUserName || '',
          persona,
          mood,
          language,
        };
        setHasPendingSessionSettings(false);
      } else {
        setStatus('Unable to start Voice Friend session. Please refresh.');
      }
    } catch (error) {
      setStatus('Failed to start Voice Friend. Check your network and try again.');
    } finally {
      setBusy(false);
    }
  }, [persona, mood, language, friendId, userName]);

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }
    hasInitializedRef.current = true;

    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        const savedAt = parsed?.savedAt ? new Date(parsed.savedAt).getTime() : Date.now();
        const expiryMs = 1000 * 60 * 60 * 24; // 24 hours
        if (Date.now() - savedAt > expiryMs) {
          localStorage.removeItem(STORAGE_KEY);
        } else {
          setPersistData(parsed?.persistData !== undefined ? parsed.persistData : true);
          if (parsed?.friendId) {
            setFriendId(parsed.friendId);
          }
          if (parsed?.userName) {
            setUserName(parsed.userName);
          }
          if (parsed?.persona) {
            setPersona(parsed.persona);
          }
          if (parsed?.mood) {
            setMood(parsed.mood);
          }
          if (parsed?.language) {
            setLanguage(parsed.language);
          }
          if (parsed?.friendCustomName) {
            setFriendCustomName(parsed.friendCustomName);
          }
          if (parsed?.friendCustomAvatar) {
            setFriendCustomAvatar(parsed.friendCustomAvatar);
          }
          if (parsed?.sessionId) {
            initSession(parsed.sessionId, parsed.friendId, parsed.userName);
            return;
          }
          initSession(undefined, parsed.friendId, parsed.userName);
          return;
        }
      } catch (error) {
        console.warn('Unable to restore Voice Friend state:', error);
      }
    }
    initSession();
  }, [initSession]);

  const stopAudioPlayback = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      try {
        if (audioPlayerRef.current.src?.startsWith('blob:')) {
          URL.revokeObjectURL(audioPlayerRef.current.src);
        }
      } catch (err) {
        // ignore cleanup errors
      }
      audioPlayerRef.current = null;
    }
    setPlayingAudio(false);
  }, []);

  const speakText = useCallback((text) => {
    if (!window.speechSynthesis) return;
    stopAudioPlayback();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language || 'en-IN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setPlayingAudio(false);
    utterance.onerror = () => setPlayingAudio(false);
    setPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  }, [language, stopAudioPlayback]);

  const playResponseAudio = useCallback(async (text) => {
    if (!text || !sessionId) {
      return false;
    }
    // prevent concurrent audio generation requests
    if (audioLoading) return false;

    speechAbortControllerRef.current?.abort();
    const controller = new AbortController();
    speechAbortControllerRef.current = controller;

    try {
      setAudioLoading(true);
      stopAudioPlayback();
      const response = await axios.post(
        buildApiUrl('/ai-voice-friend/speech'),
        {
          text,
          friendId,
          voice: selectedFriend.voice,
          language,
        },
        { headers: buildRequestHeaders(), signal: controller.signal }
      );

      const audioBase64 = response?.data?.data?.audio;
      const mimeType = response?.data?.data?.mimeType || 'audio/mpeg';
      if (!audioBase64) {
        return false;
      }

      const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
      audioPlayerRef.current = audio;
      setPlayingAudio(true);
      audio.onended = () => {
        audioPlayerRef.current = null;
        setPlayingAudio(false);
      };
      audio.onerror = () => {
        audioPlayerRef.current = null;
        setPlayingAudio(false);
      };
      await audio.play();
      return true;
    } catch (error) {
      if (axios.isCancel?.(error) || error?.name === 'CanceledError') {
        console.warn('TTS request canceled', error);
        return false;
      }
      console.warn('Voice Friend TTS playback failed:', error);
      return false;
    } finally {
      setAudioLoading(false);
    }
  }, [friendId, language, selectedFriend.voice, sessionId, audioLoading, stopAudioPlayback]);

  const sendMessage = async () => {
    if (busy) {
      return;
    }

    const trimmed = String(messageText || '').trim();
    if (!trimmed) {
      setStatus('Please type or speak a message before sending.');
      return;
    }
    if (!sessionId) {
      setStatus('Setting up your Voice Friend session. Please wait a moment.');
      return;
    }

    const requestSessionId = sessionId;
    const userMessage = { role: 'user', content: trimmed, timestamp: new Date().toISOString() };
    setConversation((prev) => [...prev, userMessage]);
    setMessageText('');
    setStatus('Thinking...');
    setBusy(true);

    messageAbortControllerRef.current?.abort();
    const controller = new AbortController();
    messageAbortControllerRef.current = controller;

    try {
      const response = await axios.post(
        buildApiUrl('/ai-voice-friend/message'),
        { sessionId, message: trimmed, persona, mood, language, friendId, userName },
        { headers: buildRequestHeaders(), signal: controller.signal }
      );

      if (sessionId !== requestSessionId) {
        return;
      }

      const aiText = response?.data?.data?.response || `I hear you${userName ? `, ${userName}` : ''}. Please continue.`;
      if (String(lastAssistantTextRef.current || '').trim() !== String(aiText || '').trim()) {
        const assistantMessage = { role: 'assistant', content: aiText, timestamp: new Date().toISOString() };
        setConversation((prev) => [...prev, assistantMessage]);
        lastAssistantTextRef.current = aiText;
        setTimeout(() => { lastAssistantTextRef.current = ''; }, 15000);
      } else {
        console.warn('Duplicate assistant response suppressed');
      }
      setStatus('Conversation updated.');

      if (!audioLoading) {
        const played = await playResponseAudio(aiText);
        if (!played) {
          speakText(aiText);
        }
      }
    } catch (error) {
      if (axios.isCancel?.(error) || error?.name === 'CanceledError') {
        setStatus('Message canceled. Session was reset or a new request started.');
        return;
      }
      setStatus('Sorry, I could not process that message right now.');
    } finally {
      if (sessionId === requestSessionId) {
        setBusy(false);
      }
    }
  };

  useEffect(() => {
    if (!sessionId) {
      if (persistData) {
        localStorage.removeItem(STORAGE_KEY);
      }
      return;
    }

    if (!persistData) {
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        persistData,
        sessionId,
        friendId,
        userName,
        persona,
        mood,
        language,
        conversation,
        friendCustomName,
        friendCustomAvatar,
      })
    );
  }, [sessionId, friendId, userName, persona, mood, language, conversation, friendCustomName, friendCustomAvatar, persistData]);

  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        try {
          if (audioPlayerRef.current.src?.startsWith('blob:')) {
            URL.revokeObjectURL(audioPlayerRef.current.src);
          }
        } catch (err) {
          // ignore cleanup errors
        }
        audioPlayerRef.current = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const abortPendingRequests = useCallback(() => {
    messageAbortControllerRef.current?.abort();
    speechAbortControllerRef.current?.abort();
    stopAudioPlayback();
  }, [stopAudioPlayback]);

  const handleVoiceStart = () => {
    if (!recognition.current) {
      setStatus('Voice input is not supported in this browser.');
      return;
    }
    if (listening) {
      recognition.current.stop();
      setListening(false);
      setStatus('Voice capture stopped.');
      return;
    }
    try {
      setListening(true);
      setStatus('Listening... please speak now.');
      recognition.current.start();
    } catch (error) {
      setListening(false);
      setStatus('Unable to start voice capture. Try again.');
    }
  };

  const handleSend = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const handleResetSession = async () => {
    abortPendingRequests();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setConversation([]);
    setMessageText('');
    setStatus('Resetting Voice Friend session...');
    if (persistData) {
      localStorage.removeItem(STORAGE_KEY);
    }
    await initSession();
  };

  const lastAssistantResponseText = useMemo(() => {
    for (let i = conversation.length - 1; i >= 0; i -= 1) {
      if (conversation[i].role === 'assistant') {
        return conversation[i].content;
      }
    }
    return '';
  }, [conversation]);

  useEffect(() => {
    if (chatPanelRef.current) {
      chatPanelRef.current.scrollTop = chatPanelRef.current.scrollHeight;
    }
  }, [conversation]);

  const handleReplayLastResponse = async () => {
    if (!lastAssistantResponseText) {
      setStatus('No response available to replay yet.');
      return;
    }

    setStatus('Replaying the last response...');
    setBusy(true);
    const played = await playResponseAudio(lastAssistantResponseText);
    if (!played) {
      speakText(lastAssistantResponseText);
    }
    setBusy(false);
  };

  const conversationList = useMemo(() => {
    return conversation.map((item, index) => {
      const timestampText = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      return (
        <div key={`${item.role}-${index}`} className={`voice-friend-bubble ${item.role}`} role="listitem">
          {item.role === 'assistant' && (
            <div className="voice-friend-bubble-avatar" style={{ backgroundColor: selectedFriend.color }}>
              {selectedFriend.name[0]}
            </div>
          )}
          <div className="voice-friend-bubble-content">
            <div className="voice-friend-bubble-header">
              <strong>{item.role === 'assistant' ? selectedFriend.name : userName || 'You'}</strong>
              {timestampText && <time dateTime={item.timestamp}>{timestampText}</time>}
            </div>
            <p>{item.content}</p>
            {item.role === 'assistant' && (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="voice-friend-button"
                  aria-label={`Replay voice friend response from ${timestampText || 'recently'}`}
                  onClick={async () => {
                    setStatus('Playing response...');
                    setBusy(true);
                    const played = await playResponseAudio(item.content);
                    if (!played) speakText(item.content);
                    setBusy(false);
                  }}
                >
                  Replay
                </button>
              </div>
            )}
          </div>
        </div>
      );
    });
  }, [conversation, selectedFriend, userName, playResponseAudio, speakText]);

  return (
    <div className="voice-friend-page">
      <div className="voice-friend-header">
        <div className="voice-friend-profile">
            <div
              className="voice-friend-profile-avatar"
              style={{
                backgroundColor: selectedFriend.color,
                backgroundImage: friendCustomAvatar ? `url(${friendCustomAvatar})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {!friendCustomAvatar && (friendCustomName || selectedFriend.name)[0]}
            </div>
            <div className="voice-friend-profile-meta">
              <h1>{friendCustomName || selectedFriend.name}</h1>
              <p>{selectedFriend.personality}</p>

              <div className="voice-friend-persona-card">
                <img src={friendCustomAvatar || selectedFriend.avatar} alt={`${friendCustomName || selectedFriend.name} avatar`} className="voice-friend-persona-img" />
                <div className="voice-friend-persona-meta">
                  <div className="voice-friend-persona-bio">{selectedFriend.style}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      value={friendCustomName}
                      onChange={(e) => setFriendCustomName(e.target.value)}
                      placeholder={selectedFriend.name}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />

                    <button
                      type="button"
                      className="voice-friend-button"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      Upload face
                    </button>

                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        // attempt upload to backend
                        try {
                          const fd = new FormData();
                          fd.append('avatar', file);
                          const resp = await axios.post(buildApiUrl('/ai-voice-friend/avatar'), fd, { headers: { ...buildRequestHeaders(), 'Content-Type': 'multipart/form-data' } });
                          const url = resp?.data?.data?.url;
                          if (url) {
                            setFriendCustomAvatar(url);
                            return;
                          }
                        } catch (err) {
                          console.warn('Avatar upload failed, falling back to local image', err);
                        }

                        // fallback: local data URL
                        const reader = new FileReader();
                        reader.onload = () => setFriendCustomAvatar(String(reader.result || ''));
                        reader.readAsDataURL(file);
                      }}
                    />

                    <button
                      type="button"
                      className="voice-friend-button"
                      onClick={() => {
                        if (!window.confirm('Clear custom name and avatar?')) return;
                        setFriendCustomName('');
                        setFriendCustomAvatar('');
                        try {
                          const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
                          delete stored.friendCustomName;
                          delete stored.friendCustomAvatar;
                          localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
                        } catch (e) {
                          // ignore
                        }
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        <p>Emotion-aware chat companion with voice input and supportive guidance.</p>
        <div className="voice-friend-summary">
          <span><strong>Persona:</strong> {VOICE_PERSONAS.find((opt) => opt.id === persona)?.label}</span>
          <span><strong>Mood:</strong> {MOOD_OPTIONS.find((opt) => opt.id === mood)?.label}</span>
          <span><strong>Language:</strong> {language.toUpperCase()}</span>
          <span><strong>Voice input:</strong> {speechSupported ? 'Supported' : 'Unavailable'}</span>
          <span><strong>Audio:</strong> {audioLoading ? 'Loading...' : playingAudio ? 'Playing response' : 'Ready'}</span>
          <span><strong>Messages:</strong> {conversation.length}</span>
        </div>
      </div>

      <div className="voice-friend-controls">
        <div className="voice-friend-control-group">
          <label>Friend</label>
          <select value={friendId} onChange={(e) => handleFriendIdChange(e.target.value)}>
            {AI_FRIENDS.map((option) => (
              <option key={option.id} value={option.id}>{option.name} — {option.label}</option>
            ))}
          </select>
        </div>
        <div className="voice-friend-control-group">
          <label>Your name</label>
          <input
            value={userName}
            onChange={(e) => handleUserNameChange(e.target.value)}
            placeholder="Enter your name"
          />
        </div>
        <div className="voice-friend-control-group">
          <label>Persona</label>
          <select value={persona} onChange={(e) => handlePersonaChange(e.target.value)}>
            {VOICE_PERSONAS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="voice-friend-control-group">
          <label>Mood</label>
          <select value={mood} onChange={(e) => handleMoodChange(e.target.value)}>
            {MOOD_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="voice-friend-control-group">
          <label>Language</label>
          <select value={language} onChange={(e) => handleLanguageChange(e.target.value)}>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="ml">Malayalam</option>
            <option value="kn">Kannada</option>
          </select>
        </div>
        <div className="voice-friend-control-group">
          <label>
            <input
              type="checkbox"
              checked={persistData}
              onChange={(e) => setPersistData(e.target.checked)}
              aria-label="Persist Voice Friend state across visits"
            />
            Persist session data across visits
          </label>
          <p className="voice-friend-control-note">Keeps your friend name, avatar, and conversation history for 24 hours when enabled.</p>
        </div>
        {hasPendingSessionSettings && (
          <div className="voice-friend-control-group">
            <button type="button" className="voice-friend-button primary" onClick={applySessionSettings} disabled={busy}>
              Apply updated session settings
            </button>
          </div>
        )}
      </div>

      <div className="voice-friend-status">{status}</div>

      {busy && (
        <div className="voice-friend-typing">
          <div className="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      )}

      <div className={`voice-friend-waveform ${playingAudio || audioLoading ? 'active' : 'inactive'}`} aria-hidden>
        <div className="wave" />
      </div>

      <div className="voice-friend-chat-panel" role="list" aria-live="polite" ref={chatPanelRef}>
        {conversationList}
      </div>

      <form className="voice-friend-input-row" onSubmit={handleSend}>
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Share how you're feeling or ask for a friendly suggestion..."
          rows={3}
        />
        <div className="voice-friend-actions">
          <button type="button" className="voice-friend-button" onClick={handleVoiceStart} disabled={busy}>
            {listening ? 'Stop Listening' : speechSupported ? 'Speak' : 'Voice Unsupported'}
          </button>
          <button type="submit" className="voice-friend-button primary" disabled={busy || (!messageText.trim() && !listening)}>
            {busy ? 'Sending...' : 'Send'}
          </button>
          <button type="button" className="voice-friend-button" onClick={handleReplayLastResponse} disabled={busy || audioLoading || !lastAssistantResponseText}>
            {audioLoading ? 'Loading audio...' : playingAudio ? 'Replaying...' : 'Replay'}
          </button>
          <button type="button" className="voice-friend-button" onClick={handleResetSession} disabled={busy}>
            Reset
          </button>
        </div>
      </form>

      <div className="voice-friend-note">
        Tip: Use the microphone icon to capture a short voice note, then send it for a gentle, emotion-aware response.
      </div>
    </div>
  );
};

export default VoiceFriend;
