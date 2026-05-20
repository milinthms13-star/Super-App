import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { BACKEND_BASE_URL, buildApiUrl } from '../../utils/api';
import { getStoredAuthToken } from '../../utils/auth';
import './VoiceFriend.css';

const VOICE_PERSONAS = [
  { id: 'supportive', label: 'Calm Supporter' },
  { id: 'motivational', label: 'Motivator' },
  { id: 'mindful', label: 'Mindful Guide' },
  { id: 'playful', label: 'Playful Friend' },
  { id: 'partner', label: 'Trusted Companion' },
];

const MOOD_OPTIONS = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'happy', label: 'Happy' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'sad', label: 'Sad' },
];

const SCENARIO_OPTIONS = [
  { id: 'room', label: 'Cozy room' },
  { id: 'park', label: 'Park walk' },
  { id: 'beach', label: 'Seaside' },
  { id: 'cafe', label: 'Cafe chat' },
];

const VOICE_OPTIONS = [
  { id: 'female-soft', label: 'Gentle' },
  { id: 'male-calm', label: 'Warm' },
  { id: 'female-warm', label: 'Soft' },
];

const AI_FRIENDS = [
  {
    id: 'nila',
    name: 'Nila',
    avatar: '/avatars/nila.png',
    voice: 'female-soft',
    voiceLabel: 'Gentle tone',
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
    voiceLabel: 'Steady warm tone',
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
    voiceLabel: 'Soft conversational tone',
    personality: 'Empathetic and soothing',
    style: 'soft and comforting',
    color: '#fbcfe8',
    label: 'Soothing guide',
  },
];

const STORAGE_KEY = 'voiceFriendState';
const VOICE_FRIEND_SESSION_HEADER = 'x-voicefriend-session-token';
const FACE_PRESET_STORAGE_PREFIX = 'voiceFriendFacePresets';
const MAX_AVATAR_FILE_SIZE_BYTES = 3 * 1024 * 1024;
const AVATAR_OUTPUT_SIZE = 512;
const SPEECH_LANG_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  ml: 'ml-IN',
  kn: 'kn-IN',
};

const QUICK_PROMPTS_BY_LANGUAGE = {
  en: [
    'I feel stressed today',
    'I need calm support',
    'Can you help me sleep better?',
    'I feel lonely right now',
  ],
  ml: [
    'എനിക്ക് ഇന്നൊക്കെ സ്ട്രെസ് ആണ്',
    'ശാന്തമായി സംസാരിക്കാമോ',
    'എനിക്ക് ഉറങ്ങാൻ സഹായിക്കൂ',
    'ഇപ്പോൾ ഒറ്റപ്പെട്ടതായി തോന്നുന്നു',
  ],
  hi: [
    'आज बहुत तनाव लग रहा है',
    'मुझे शांत होने में मदद करो',
    'नींद बेहतर करने में मदद करो',
    'अभी अकेलापन लग रहा है',
  ],
  kn: [
    'ಇಂದು ತುಂಬಾ ಒತ್ತಡವಾಗಿದೆ',
    'ನನ್ನನ್ನು ಶಾಂತವಾಗಲು ಸಹಾಯಮಾಡು',
    'ನಿದ್ರೆ ಸುಧಾರಿಸಲು ಸಹಾಯಮಾಡು',
    'ಈಗ ಒಂಟಿತನವಾಗಿದೆ',
  ],
};

const SAFETY_ALERT_TEXT =
  'For self-harm thoughts, medical emergency, or immediate danger, contact local emergency services, family, or a nearby doctor immediately.';

const decodeJwtPayload = (token = '') => {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
};

const sanitizePresetName = (value = '') => {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  return normalized || 'Face Preset';
};

const getFacePresetStorageKey = (fallbackName = '') => {
  const token = getStoredAuthToken();
  const payload = decodeJwtPayload(token || '');
  const principal =
    String(payload?.sub || payload?.email || payload?.phone || fallbackName || 'guest')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9@._-]+/g, '_')
      .slice(0, 80) || 'guest';
  return `${FACE_PRESET_STORAGE_PREFIX}:${principal}`;
};

const readFacePresets = (storageKey) => {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const writeFacePresets = (storageKey, presets) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(Array.isArray(presets) ? presets : []));
  } catch (error) {
    // ignore local storage quota errors
  }
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });

const loadImageFromDataUrl = (dataUrl) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load image preview.'));
    image.src = dataUrl;
  });

const renderCenterCroppedAvatar = async (file) => {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to process avatar image.');
  }

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const sourceSize = Math.max(1, Math.min(sourceWidth, sourceHeight));
  const sourceX = Math.max(0, Math.floor((sourceWidth - sourceSize) / 2));
  const sourceY = Math.max(0, Math.floor((sourceHeight - sourceSize) / 2));

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    AVATAR_OUTPUT_SIZE,
    AVATAR_OUTPUT_SIZE
  );

  const processedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const avatarBlob = await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to encode avatar image.'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.92);
  });

  const baseName = String(file?.name || 'avatar').replace(/\.[^.]+$/, '').slice(0, 64) || 'avatar';
  const processedFile = new File([avatarBlob], `${baseName}.jpg`, { type: 'image/jpeg' });

  return { processedDataUrl, processedFile };
};

const resolveVoiceFriendAvatarUrl = (value = '') => {
  const rawValue = String(value || '').trim();
  if (!rawValue) return '';
  if (/^(data:|blob:)/i.test(rawValue)) return rawValue;
  if (/^https?:\/\//i.test(rawValue)) return rawValue;
  if (/^\/(uploads|videos)\//i.test(rawValue)) {
    return `${String(BACKEND_BASE_URL || '').replace(/\/+$/, '')}${rawValue}`;
  }
  return rawValue;
};

const VoiceFriend = () => {
  const [sessionId, setSessionId] = useState(null);
  const [sessionToken, setSessionToken] = useState('');
  const [friendId, setFriendId] = useState('nila');
  const [userName, setUserName] = useState('');
  const [persona, setPersona] = useState('supportive');
  const [mood, setMood] = useState('neutral');
  const [language, setLanguage] = useState('en');
  const [messageText, setMessageText] = useState('');
  const [conversation, setConversation] = useState([]);
  const [status, setStatus] = useState('Welcome to your AI Voice Friend. Share how you feel and I will listen like a caring partner.');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [friendCustomName, setFriendCustomName] = useState('');
  const [friendCustomAvatar, setFriendCustomAvatar] = useState('');
  const [facePresets, setFacePresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [newPresetName, setNewPresetName] = useState('');
  const [scenario, setScenario] = useState('room');
  const [autoSendVoice, setAutoSendVoice] = useState(true);
  const [pendingVoiceTranscript, setPendingVoiceTranscript] = useState('');

  const buildRequestHeaders = () => {
    const token = getStoredAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (sessionToken) {
      headers[VOICE_FRIEND_SESSION_HEADER] = sessionToken;
    }
    return headers;
  };
  const [voice, setVoice] = useState('female-soft');
  const [persistData, setPersistData] = useState(true);
  const [hasPendingSessionSettings, setHasPendingSessionSettings] = useState(false);
  const [autoApplyingAvatar, setAutoApplyingAvatar] = useState(false);
  const [editingPersona, setEditingPersona] = useState(false);
  const recognition = useRef(null);
  const audioPlayerRef = useRef(null);
  const avatarInputRef = useRef(null);
  const messageAbortControllerRef = useRef(null);
  const speechAbortControllerRef = useRef(null);
  const sendMessageRef = useRef(null);
  const chatPanelRef = useRef(null);
  const hasInitializedRef = useRef(false);
  const sessionMetaRef = useRef({ friendId: 'nila', userName: '', persona: 'supportive', mood: 'neutral', language: 'en' });
  const lastAssistantTextRef = useRef('');

  const selectedFriend = useMemo(
    () => AI_FRIENDS.find((friend) => friend.id === friendId) || AI_FRIENDS[0],
    [friendId]
  );

  const selectedVoiceOption = useMemo(
    () => VOICE_OPTIONS.find((option) => option.id === voice) || VOICE_OPTIONS[0],
    [voice]
  );

  const moodEmojiMap = {
    neutral: '😌',
    happy: '😊',
    anxious: '🤔',
    sad: '🥺',
  };

  const displayName = friendCustomName || selectedFriend.name;
  const friendLabel = `${displayName} • ${selectedFriend.label}`;
  const resolvedFriendCustomAvatar = useMemo(
    () => resolveVoiceFriendAvatarUrl(friendCustomAvatar),
    [friendCustomAvatar]
  );
  const facePresetStorageKey = useMemo(
    () => getFacePresetStorageKey(userName),
    [userName]
  );
  const selectedPreset = useMemo(
    () => facePresets.find((preset) => preset.id === selectedPresetId) || null,
    [facePresets, selectedPresetId]
  );
  const quickPrompts = useMemo(
    () => QUICK_PROMPTS_BY_LANGUAGE[language] || QUICK_PROMPTS_BY_LANGUAGE.en,
    [language]
  );
  const voiceFriendScore = useMemo(() => {
    // New scoring that rewards actionable items and is achievable via optimizer
    let score = 6.0;
    if (speechSupported) score += 1.0; // speech input availability
    if (String(friendCustomAvatar || '').trim() || selectedFriend.avatar) score += 1.0; // avatar
    if (String(friendCustomName || '').trim()) score += 0.8; // friendly name
    if (persistData) score += 0.7; // persistence
    if (autoSendVoice) score += 0.5; // convenience
    if (SPEECH_LANG_MAP[language]) score += 0.6; // language mapping for TTS/STT
    // small bonus for existing conversation length
    if (conversation.length >= 2) score += 0.5;
    return Math.min(10, Number(score.toFixed(1)));
  }, [
    speechSupported,
    friendCustomAvatar,
    selectedFriend.avatar,
    friendCustomName,
    persistData,
    conversation.length,
    language,
  ]);

  const ratingOutOfFive = useMemo(() => {
    // Map the 0-10 companion score to 0-5 stars, rounding up to encourage improvements
    const numeric = Number(voiceFriendScore || 0);
    return Math.min(5, Math.max(0, Math.round((numeric / 10) * 5)));
  }, [voiceFriendScore]);

  const optimizeForMaxScore = useCallback(async () => {
    // Apply a set of safe, non-destructive defaults that improve the companion score
    if (busy) return;
    setStatus('Applying recommended Voice Friend optimizations...');
    setBusy(true);
    try {
      // ensure persistence so settings count
      setPersistData(true);

      // ensure a friendly name exists
      if (!String(friendCustomName || '').trim()) {
        setFriendCustomName(selectedFriend.name || 'Friend');
      }

      // ensure avatar present (local or remote)
      if (!String(friendCustomAvatar || '').trim() && selectedFriend.avatar) {
        setFriendCustomAvatar(resolveVoiceFriendAvatarUrl(selectedFriend.avatar || ''));
      }

      // enable helpful session flags
      setAutoSendVoice(true);
      setPersistData(true);

      // prefer browser locale when supported
      try {
        const navLang = (navigator?.language || navigator?.userLanguage || 'en').slice(0, 2).toLowerCase();
        if (SPEECH_LANG_MAP[navLang]) setLanguage(navLang);
      } catch (e) {
        // ignore
      }

      // auto-apply the updated session settings
      setHasPendingSessionSettings(true);
      await applySessionSettings();

      // If speech isn't supported, inform user that enabling mic will further improve rating
      if (!speechSupported) {
        setStatus('Optimized UI applied. Enable microphone in your browser to reach perfect score.');
      } else {
        setStatus('Optimizations applied — your Voice Friend should now rate higher.');
      }
    } catch (err) {
      console.warn('Optimization failed', err);
      setStatus('Optimization failed. Try again or adjust settings manually.');
    } finally {
      setBusy(false);
    }
  }, [busy, friendCustomName, selectedFriend, friendCustomAvatar, applySessionSettings, speechSupported]);

  // Diagnostic checks to surface gaps and quick actions
  const diagnostics = useMemo(() => {
    const mic = Boolean(speechSupported);
    const avatar = Boolean(String(friendCustomAvatar || selectedFriend.avatar || '').trim());
    const name = Boolean(String(friendCustomName || '').trim());
    const persistence = Boolean(persistData);
    const autosend = Boolean(autoSendVoice);
    const langSupported = Boolean(SPEECH_LANG_MAP[language]);
    return { mic, avatar, name, persistence, autosend, langSupported };
  }, [speechSupported, friendCustomAvatar, selectedFriend.avatar, friendCustomName, persistData, autoSendVoice, language]);

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

  const handleScenarioChange = (value) => {
    setScenario(value);
    markPendingSessionSettings();
  };

  const handleVoiceChange = (value) => {
    setVoice(value);
    markPendingSessionSettings();
  };

  const applySessionSettings = async (overrideSettings = {}) => {
    if (busy) return;
    setStatus('Applying updated Voice Friend settings...');
    await initSession(undefined, friendId, userName, overrideSettings);
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
      instance.lang = SPEECH_LANG_MAP[language] || 'en-IN';

      instance.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setMessageText(transcript);
          setPendingVoiceTranscript(transcript);
          if (autoSendVoice) {
            setStatus('Voice captured. Sending your message...');
          } else {
            setStatus('Voice captured. Edit or send your message.');
          }
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
  }, [language, autoSendVoice]);

  const initSession = useCallback(async (existingSessionId, initialFriendId, initialUserName, overrideSettings = {}) => {
    try {
      setBusy(true);
      const sessionFriendId = initialFriendId || friendId;
      const sessionUserName = initialUserName || userName;
      const sessionFriendCustomName = overrideSettings.friendCustomName !== undefined
        ? overrideSettings.friendCustomName
        : friendCustomName;
      const sessionFriendCustomAvatar = overrideSettings.friendCustomAvatar !== undefined
        ? overrideSettings.friendCustomAvatar
        : friendCustomAvatar;
      const sessionScenario = overrideSettings.scenario !== undefined
        ? overrideSettings.scenario
        : scenario;
      const sessionVoice = overrideSettings.voice !== undefined
        ? overrideSettings.voice
        : voice;

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
            setFriendCustomName(sessionData.friendCustomName || '');
            setFriendCustomAvatar(sessionData.friendCustomAvatar || '');
            setScenario(sessionData.scenario || 'room');
            setConversation(sessionData.messages || []);
            setStatus('Restored your previous Voice Friend session.');
            sessionMetaRef.current = {
              friendId: sessionData.friendId || sessionFriendId,
              userName: sessionData.userName || sessionUserName || '',
              persona: sessionData.persona || persona,
              mood: sessionData.mood || mood,
              language: sessionData.language || language,
              friendCustomName: sessionData.friendCustomName || '',
              friendCustomAvatar: sessionData.friendCustomAvatar || '',
              scenario: sessionData.scenario || 'room',
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
        {
          persona,
          mood,
          language,
          friendId: sessionFriendId,
          userName: sessionUserName,
          friendCustomName: sessionFriendCustomName,
          friendCustomAvatar: sessionFriendCustomAvatar,
          scenario: sessionScenario,
          voice: sessionVoice,
        },
        { headers: buildRequestHeaders() }
      );

      if (response?.data?.success) {
        setSessionId(response.data.data.sessionId);
        setSessionToken(response.data.data.sessionToken || '');
        setVoice(response.data.data.voice || sessionVoice);
        setStatus('Voice Friend session ready. Start the conversation when you are ready.');
        sessionMetaRef.current = {
          friendId: sessionFriendId,
          userName: sessionUserName || '',
          persona,
          mood,
          language,
          friendCustomName: sessionFriendCustomName || '',
          friendCustomAvatar: sessionFriendCustomAvatar || '',
          scenario: sessionScenario,
          voice: sessionVoice,
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
  }, [persona, mood, language, friendId, userName, friendCustomName, friendCustomAvatar, scenario, voice]);

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
          if (parsed?.scenario) {
            setScenario(parsed.scenario);
          }
          if (parsed?.voice) {
            setVoice(parsed.voice);
          }
          if (parsed?.sessionToken) {
            setSessionToken(parsed.sessionToken);
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

  useEffect(() => {
    const presets = readFacePresets(facePresetStorageKey);
    setFacePresets(presets);
    if (presets.length > 0) {
      setSelectedPresetId((current) => current || presets[0].id);
    } else {
      setSelectedPresetId('');
    }
  }, [facePresetStorageKey]);

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
    utterance.lang = SPEECH_LANG_MAP[language] || 'en-IN';
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
          sessionId,
          text,
          friendId,
          voice,
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
  }, [friendId, language, sessionId, audioLoading, stopAudioPlayback]);

  const sendMessage = async (overrideText = '') => {
    if (busy) {
      return;
    }

    const trimmed = String(overrideText || messageText || '').trim();
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
        {
          sessionId,
          message: trimmed,
          persona,
          mood,
          language,
          friendId,
          userName,
          friendCustomName,
          friendCustomAvatar,
          scenario,
        },
        { headers: buildRequestHeaders(), signal: controller.signal }
      );

      if (sessionId !== requestSessionId) {
        return;
      }

      const responseData = response?.data?.data || {};
      const aiText =
        responseData.response ||
        responseData.reply ||
        responseData.message ||
        responseData.text ||
        `I hear you${userName ? `, ${userName}` : ''}. Please continue.`;
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
  sendMessageRef.current = sendMessage;

  useEffect(() => {
    if (!autoSendVoice) {
      return;
    }
    const transcript = String(pendingVoiceTranscript || '').trim();
    if (!transcript || busy || !sessionId) {
      return;
    }
    setPendingVoiceTranscript('');
    if (typeof sendMessageRef.current === 'function') {
      sendMessageRef.current(transcript);
    }
  }, [pendingVoiceTranscript, autoSendVoice, busy, sessionId]);

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
        sessionToken,
        friendId,
        userName,
        persona,
        mood,
        language,
        scenario,
        voice,
        conversation: conversation.slice(-12),
        friendCustomName,
        friendCustomAvatar: String(friendCustomAvatar || '').length < 65536 ? friendCustomAvatar : '',
      })
    );
  }, [sessionId, sessionToken, friendId, userName, persona, mood, language, scenario, voice, conversation, friendCustomName, friendCustomAvatar, persistData]);

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
    setPendingVoiceTranscript('');
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

  const persistFacePresets = useCallback((nextPresets) => {
    setFacePresets(nextPresets);
    writeFacePresets(facePresetStorageKey, nextPresets);
  }, [facePresetStorageKey]);

  const saveCurrentFaceAsPreset = useCallback(() => {
    if (!resolvedFriendCustomAvatar) {
      setStatus('Upload or set an avatar first, then save it as a preset.');
      return;
    }
    const presetName = sanitizePresetName(newPresetName || friendCustomName || selectedFriend.name);
    const presetId = window.crypto?.randomUUID?.() || `preset-${Date.now()}`;
    const newPreset = {
      id: presetId,
      name: presetName,
      avatarUrl: resolvedFriendCustomAvatar,
      friendName: String(friendCustomName || '').trim(),
      updatedAt: new Date().toISOString(),
    };
    const nextPresets = [newPreset, ...facePresets.filter((preset) => preset.id !== presetId)].slice(0, 20);
    persistFacePresets(nextPresets);
    setSelectedPresetId(presetId);
    setNewPresetName('');
    setStatus(`Saved face preset: ${presetName}.`);
  }, [resolvedFriendCustomAvatar, newPresetName, friendCustomName, selectedFriend.name, facePresets, persistFacePresets]);

  const deleteSelectedPreset = useCallback(() => {
    if (!selectedPreset) {
      setStatus('Select a preset to delete.');
      return;
    }
    const nextPresets = facePresets.filter((preset) => preset.id !== selectedPreset.id);
    persistFacePresets(nextPresets);
    setSelectedPresetId(nextPresets[0]?.id || '');
    setStatus(`Removed preset: ${selectedPreset.name}.`);
  }, [selectedPreset, facePresets, persistFacePresets]);

  const renameSelectedPreset = useCallback(() => {
    if (!selectedPreset) {
      setStatus('Select a preset to rename.');
      return;
    }
    const nextName = sanitizePresetName(newPresetName || selectedPreset.name);
    const nextPresets = facePresets.map((preset) => (
      preset.id === selectedPreset.id
        ? { ...preset, name: nextName, updatedAt: new Date().toISOString() }
        : preset
    ));
    persistFacePresets(nextPresets);
    setStatus(`Preset renamed to: ${nextName}.`);
  }, [selectedPreset, newPresetName, facePresets, persistFacePresets]);

  const applyPresetById = useCallback(async (presetId) => {
    const targetPreset = facePresets.find((preset) => preset.id === presetId);
    if (!targetPreset) {
      setStatus('Choose a preset first.');
      return;
    }
    if (busy) {
      setStatus('Please wait for the current action to finish.');
      return;
    }

    const nextAvatar = resolveVoiceFriendAvatarUrl(targetPreset.avatarUrl);
    const nextName = String(targetPreset.friendName || '').trim();
    setFriendCustomAvatar(nextAvatar);
    if (nextName) {
      setFriendCustomName(nextName);
    }
    setSelectedPresetId(targetPreset.id);
    markPendingSessionSettings();
    setStatus(`Applying preset: ${targetPreset.name}...`);
    setAutoApplyingAvatar(true);
    try {
      await applySessionSettings({
        friendCustomAvatar: nextAvatar,
        friendCustomName: nextName || friendCustomName,
      });
      setStatus(`Preset "${targetPreset.name}" applied.`);
    } finally {
      setAutoApplyingAvatar(false);
    }
  }, [facePresets, busy, markPendingSessionSettings, applySessionSettings, friendCustomName]);

  const applySelectedPreset = useCallback(async () => {
    await applyPresetById(selectedPresetId);
  }, [applyPresetById, selectedPresetId]);

  const processAndUploadAvatar = useCallback(async (rawFile) => {
    if (!rawFile) return;
    const mimeType = String(rawFile.type || '').toLowerCase();
    if (!mimeType.startsWith('image/')) {
      setStatus('Please upload a valid image file (JPG, PNG, or WEBP).');
      return;
    }
    if (rawFile.size > MAX_AVATAR_FILE_SIZE_BYTES) {
      setStatus('Image is too large. Please choose an image under 3 MB.');
      return;
    }
    if (busy) {
      setStatus('Please wait for the current action to finish.');
      return;
    }

    setAutoApplyingAvatar(true);
    try {
      setStatus('Processing avatar image...');
      const { processedDataUrl, processedFile } = await renderCenterCroppedAvatar(rawFile);

      let appliedAvatarUrl = processedDataUrl;
      try {
        const fd = new FormData();
        fd.append('avatar', processedFile);

        const resp = await axios.post(
          buildApiUrl('/ai-voice-friend/avatar'),
          fd,
          {
            headers: {
              ...buildRequestHeaders(),
              Accept: 'application/json',
            },
          }
        );
        const uploadedUrl = resp?.data?.data?.url;
        if (uploadedUrl) {
          appliedAvatarUrl = resolveVoiceFriendAvatarUrl(uploadedUrl);
        }
      } catch (uploadError) {
        console.warn('Avatar upload failed, using local processed image.', uploadError);
      }

      setFriendCustomAvatar(appliedAvatarUrl);
      markPendingSessionSettings();
      setStatus('Applying new avatar...');
      await applySessionSettings({ friendCustomAvatar: appliedAvatarUrl });
      setStatus('Avatar updated and applied to your Voice Friend session.');
    } catch (error) {
      setStatus(error?.message || 'Could not process this image. Try another file.');
    } finally {
      setAutoApplyingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  }, [busy, markPendingSessionSettings, applySessionSettings]);

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
                backgroundImage: resolvedFriendCustomAvatar ? `url(${resolvedFriendCustomAvatar})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {!resolvedFriendCustomAvatar && (friendCustomName || selectedFriend.name)[0]}
            </div>
            <div className="voice-friend-profile-meta">
              <h1>{displayName}</h1>
              <p>{friendLabel}</p>

              <div className="voice-friend-persona-card">
                <img src={resolvedFriendCustomAvatar || selectedFriend.avatar} alt={`${friendCustomName || selectedFriend.name} avatar`} className="voice-friend-persona-img" />
                <div className="voice-friend-persona-meta">
                  <div className="voice-friend-persona-bio">{selectedFriend.style}</div>
                  <div className="voice-friend-persona-voice">Voice style: {selectedVoiceOption.label}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      value={friendCustomName}
                      onChange={(e) => {
                        setFriendCustomName(e.target.value);
                        markPendingSessionSettings();
                      }}
                      placeholder={selectedFriend.name}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />

                    <button
                      type="button"
                      className="voice-friend-button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={busy || autoApplyingAvatar}
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
                        await processAndUploadAvatar(file);
                      }}
                    />

                    <button
                      type="button"
                      className="voice-friend-button"
                      onClick={() => {
                        if (!window.confirm('Clear custom name and avatar?')) return;
                        setFriendCustomName('');
                        setFriendCustomAvatar('');
                        markPendingSessionSettings();
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
                  <div className="voice-friend-face-presets">
                    <input
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="Preset name (save/rename)"
                    />
                    <button
                      type="button"
                      className="voice-friend-button"
                      onClick={saveCurrentFaceAsPreset}
                    >
                      Save face
                    </button>
                    <select
                      value={selectedPresetId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setSelectedPresetId(nextId);
                        const nextPreset = facePresets.find((preset) => preset.id === nextId);
                        setNewPresetName(nextPreset?.name || '');
                      }}
                    >
                      <option value="">Select saved face</option>
                      {facePresets.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="voice-friend-button"
                      onClick={applySelectedPreset}
                      disabled={!selectedPresetId || busy || autoApplyingAvatar}
                    >
                      Use preset
                    </button>
                    <button
                      type="button"
                      className="voice-friend-button"
                      onClick={renameSelectedPreset}
                      disabled={!selectedPresetId}
                    >
                      Rename preset
                    </button>
                    <button
                      type="button"
                      className="voice-friend-button"
                      onClick={deleteSelectedPreset}
                      disabled={!selectedPresetId}
                    >
                      Delete preset
                    </button>
                  </div>
                  <div className="voice-friend-preset-strip" role="list" aria-label="Saved face presets">
                    {facePresets.map((preset) => {
                      const isActive = preset.id === selectedPresetId;
                      const thumbUrl = resolveVoiceFriendAvatarUrl(preset.avatarUrl);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          role="listitem"
                          className={`voice-friend-preset-thumb ${isActive ? 'active' : ''}`}
                          onClick={() => applyPresetById(preset.id)}
                          disabled={busy || autoApplyingAvatar}
                          title={`Use preset ${preset.name}`}
                        >
                          <span
                            className="voice-friend-preset-thumb-image"
                            style={{ backgroundImage: thumbUrl ? `url(${thumbUrl})` : undefined }}
                            aria-hidden
                          />
                          <span className="voice-friend-preset-thumb-name">{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        <div className={`voice-friend-video-stage voice-friend-video-stage--${scenario} ${playingAudio ? 'speaking' : ''}`} aria-label="Live video friend scene">
          <div className="voice-friend-video-backdrop" />
          <div className="voice-friend-video-badge">Live</div>
          <div className="voice-friend-video-avatar" style={{
            backgroundImage: resolvedFriendCustomAvatar ? `url(${resolvedFriendCustomAvatar})` : `url(${selectedFriend.avatar})`,
          }}>
            {!resolvedFriendCustomAvatar && !selectedFriend.avatar && (friendCustomName || selectedFriend.name)[0]}
            <div className="voice-friend-mouth" aria-hidden="true" />
          </div>
          <div className="voice-friend-video-label">
            <strong>{friendCustomName || selectedFriend.name}</strong>
            <span>{SCENARIO_OPTIONS.find((opt) => opt.id === scenario)?.label}</span>
          </div>
        </div>
        <p className="voice-friend-video-note">Your avatar speaks directly when a response is generated, and text replies are shown in chat for clarity.</p>
        <div className="voice-friend-summary">
            <span>
              <strong>Companion score:</strong> {voiceFriendScore}/10
              <div className="voice-friend-stars" aria-hidden style={{ display: 'inline-block', marginLeft: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} style={{ color: i < ratingOutOfFive ? '#f59e0b' : '#ddd', marginLeft: 4 }}>★</span>
                ))}
              </div>
            </span>
          <span><strong>Persona:</strong> {VOICE_PERSONAS.find((opt) => opt.id === persona)?.label}</span>
          <span><strong>Mood:</strong> {moodEmojiMap[mood] || ''} {MOOD_OPTIONS.find((opt) => opt.id === mood)?.label}</span>
          <span><strong>Voice style:</strong> {selectedVoiceOption.label}</span>
          <span><strong>Language:</strong> {language.toUpperCase()}</span>
          <span><strong>Scene:</strong> {SCENARIO_OPTIONS.find((opt) => opt.id === scenario)?.label}</span>
          <span><strong>Voice input:</strong> {speechSupported ? 'Supported' : 'Unavailable'}</span>
          <span><strong>Audio:</strong> {audioLoading ? 'Loading...' : playingAudio ? 'Playing response' : 'Ready'}</span>
          <span><strong>Messages:</strong> {conversation.length}</span>
          <span>
            <button
              type="button"
              className="voice-friend-button"
              onClick={optimizeForMaxScore}
              disabled={busy}
              title="Apply recommended settings to reach 5/5"
            >
              Make it 5/5
            </button>
          </span>
        </div>

        <div className="voice-friend-diagnostics" style={{ marginTop: 12 }}>
          <strong>Diagnostics</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            <li>
              {diagnostics.mic ? '✅' : '⚠️'} Microphone supported
              {!diagnostics.mic && (
                <button type="button" className="voice-friend-button" style={{ marginLeft: 8 }} onClick={() => {
                  setStatus('To enable voice, allow microphone access in your browser and try Speak.');
                  handleVoiceStart();
                }}>Try enable</button>
              )}
            </li>
            <li>
              {diagnostics.avatar ? '✅' : '⚠️'} Avatar set
              {!diagnostics.avatar && (
                <button type="button" className="voice-friend-button" style={{ marginLeft: 8 }} onClick={() => {
                  setFriendCustomAvatar(resolveVoiceFriendAvatarUrl(selectedFriend.avatar || ''));
                  setStatus('Applied a default avatar from the selected friend.');
                }}>Apply avatar</button>
              )}
            </li>
            <li>
              {diagnostics.name ? '✅' : '⚠️'} Friendly name
              {!diagnostics.name && (
                <button type="button" className="voice-friend-button" style={{ marginLeft: 8 }} onClick={() => {
                  setFriendCustomName(selectedFriend.name || 'Friend');
                  setStatus('Applied a friendly name to improve experience.');
                }}>Apply name</button>
              )}
            </li>
            <li>
              {diagnostics.persistence ? '✅' : '⚠️'} Persist session
              {!diagnostics.persistence && (
                <button type="button" className="voice-friend-button" style={{ marginLeft: 8 }} onClick={() => { setPersistData(true); setStatus('Persistence enabled.'); }}>Enable</button>
              )}
            </li>
            <li>
              {diagnostics.autosend ? '✅' : '⚠️'} Auto-send voice transcript
              {!diagnostics.autosend && (
                <button type="button" className="voice-friend-button" style={{ marginLeft: 8 }} onClick={() => { setAutoSendVoice(true); setStatus('Auto-send enabled.'); }}>Enable</button>
              )}
            </li>
          </ul>
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
          <label>Voice</label>
          <select value={voice} onChange={(e) => handleVoiceChange(e.target.value)}>
            {VOICE_OPTIONS.map((option) => (
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
          <label>Scenario</label>
          <select value={scenario} onChange={(e) => handleScenarioChange(e.target.value)}>
            {SCENARIO_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="voice-friend-control-group">
          <label className="voice-friend-checkbox-label">
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
        <div className="voice-friend-control-group">
          <label className="voice-friend-checkbox-label">
            <input
              type="checkbox"
              checked={autoSendVoice}
              onChange={(e) => setAutoSendVoice(e.target.checked)}
              aria-label="Auto send captured voice transcript"
            />
            Auto-send voice transcript after capture
          </label>
          <p className="voice-friend-control-note">When enabled, tap Speak once and your captured voice message is sent automatically.</p>
        </div>
        {hasPendingSessionSettings && (
          <div className="voice-friend-control-group">
            <button type="button" className="voice-friend-button primary" onClick={() => applySessionSettings()} disabled={busy || autoApplyingAvatar}>
              Apply updated session settings
            </button>
          </div>
        )}
      </div>

      <div className="voice-friend-safety-alert" role="note" aria-live="polite">
        {SAFETY_ALERT_TEXT}
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

      <div className="voice-friend-quick-prompts" role="list" aria-label="Suggested prompts">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            role="listitem"
            className="voice-friend-chip"
            onClick={() => sendMessage(prompt)}
            disabled={busy}
          >
            {prompt}
          </button>
        ))}
      </div>

      <form className="voice-friend-input-row" onSubmit={handleSend}>
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Speak or type your message. Your friend replies by voice, avatar, and chat text."
          rows={3}
        />
        <div className="voice-friend-actions">
          <button type="button" className="voice-friend-button" onClick={handleVoiceStart} disabled={busy}>
            {listening ? 'Stop Listening' : speechSupported ? (autoSendVoice ? 'Talk to Friend' : 'Speak') : 'Voice Unsupported'}
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
