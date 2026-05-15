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

const STORAGE_KEY = 'voiceFriendState';

const buildRequestHeaders = () => {
  const token = getStoredAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const VoiceFriend = () => {
  const [sessionId, setSessionId] = useState(null);
  const [persona, setPersona] = useState('supportive');
  const [mood, setMood] = useState('neutral');
  const [language, setLanguage] = useState('en');
  const [messageText, setMessageText] = useState('');
  const [conversation, setConversation] = useState([]);
  const [status, setStatus] = useState('Welcome to your AI Voice Friend. Share what you feel or ask for encouragement.');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognition = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = language || 'en-IN';

      recognition.current.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setMessageText(transcript);
          setStatus('Voice captured. Edit or send your message.');
        }
      };

      recognition.current.onerror = () => {
        setListening(false);
        setStatus('Voice recognition failed. Try again or type your message.');
      };

      recognition.current.onend = () => {
        setListening(false);
      };
    }

    return () => {
      if (recognition.current?.abort) {
        recognition.current.abort();
      }
    };
  }, [language]);

  const initSession = useCallback(async (existingSessionId) => {
    try {
      setBusy(true);
      if (existingSessionId) {
        try {
          const historyResponse = await axios.get(
            buildApiUrl(`/ai-voice-friend/history/${existingSessionId}`),
            { headers: buildRequestHeaders() }
          );

          if (historyResponse?.data?.success) {
            const sessionData = historyResponse.data.data;
            setSessionId(sessionData.sessionId);
            setPersona(sessionData.persona || persona);
            setMood(sessionData.mood || mood);
            setLanguage(sessionData.language || language);
            setConversation(sessionData.messages || []);
            setStatus('Restored your previous Voice Friend session.');
            return;
          }
        } catch (restoreError) {
          console.warn('Voice Friend session restore failed:', restoreError.message);
        }
      }

      setConversation([]);
      const response = await axios.post(
        buildApiUrl('/ai-voice-friend/init'),
        { persona, mood, language },
        { headers: buildRequestHeaders() }
      );

      if (response?.data?.success) {
        setSessionId(response.data.data.sessionId);
        setStatus('Voice Friend session ready. Start the conversation when you are ready.');
      } else {
        setStatus('Unable to start Voice Friend session. Please refresh.');
      }
    } catch (error) {
      setStatus('Failed to start Voice Friend. Check your network and try again.');
    } finally {
      setBusy(false);
    }
  }, [persona, mood, language]);

  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed?.sessionId) {
          initSession(parsed.sessionId);
          return;
        }
      } catch (error) {
        console.warn('Unable to restore Voice Friend state:', error);
      }
    }
    initSession();
  }, [initSession]);

  const speakText = useCallback((text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language || 'en-IN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }, [language]);

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

    const userMessage = { role: 'user', content: trimmed };
    setConversation((prev) => [...prev, userMessage]);
    setMessageText('');
    setStatus('Thinking...');
    setBusy(true);

    try {
      const response = await axios.post(
        buildApiUrl('/ai-voice-friend/message'),
        { sessionId, message: trimmed, persona, mood, language },
        { headers: buildRequestHeaders() }
      );

      const aiText = response?.data?.data?.response || 'I am here with you. Please continue.';
      const assistantMessage = { role: 'assistant', content: aiText };
      setConversation((prev) => [...prev, assistantMessage]);
      setStatus('Conversation updated.');
      speakText(aiText);
    } catch (error) {
      setStatus('Sorry, I could not process that message right now.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!sessionId) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sessionId, persona, mood, language, conversation })
    );
  }, [sessionId, persona, mood, language, conversation]);

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
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setConversation([]);
    setMessageText('');
    setStatus('Resetting Voice Friend session...');
    localStorage.removeItem(STORAGE_KEY);
    await initSession();
  };

  const conversationList = useMemo(() => {
    return conversation.map((item, index) => (
      <div key={`${item.role}-${index}`} className={`voice-friend-bubble ${item.role}`}>
        <strong>{item.role === 'assistant' ? 'Nila Friend' : 'You'}</strong>
        <p>{item.content}</p>
      </div>
    ));
  }, [conversation]);

  return (
    <div className="voice-friend-page">
      <div className="voice-friend-header">
        <h1>AI Voice Friend</h1>
        <p>Emotion-aware chat companion with voice input and supportive guidance.</p>
        <div className="voice-friend-summary">
          <span><strong>Persona:</strong> {VOICE_PERSONAS.find((opt) => opt.id === persona)?.label}</span>
          <span><strong>Mood:</strong> {MOOD_OPTIONS.find((opt) => opt.id === mood)?.label}</span>
          <span><strong>Language:</strong> {language.toUpperCase()}</span>
          <span><strong>Messages:</strong> {conversation.length}</span>
        </div>
      </div>

      <div className="voice-friend-controls">
        <div className="voice-friend-control-group">
          <label>Persona</label>
          <select value={persona} onChange={(e) => setPersona(e.target.value)}>
            {VOICE_PERSONAS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="voice-friend-control-group">
          <label>Mood</label>
          <select value={mood} onChange={(e) => setMood(e.target.value)}>
            {MOOD_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="voice-friend-control-group">
          <label>Language</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="ml">Malayalam</option>
            <option value="kn">Kannada</option>
          </select>
        </div>
      </div>

      <div className="voice-friend-status">{status}</div>

      <div className="voice-friend-chat-panel">{conversationList}</div>

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
