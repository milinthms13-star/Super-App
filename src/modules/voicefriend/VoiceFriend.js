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
  }, [language]);

  const initSession = useCallback(async () => {
    try {
      setBusy(true);
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
    initSession();
  }, [initSession]);

  const speakText = useCallback((text) => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language || 'en-IN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }, [language]);

  const sendMessage = async () => {
    const trimmed = String(messageText || '').trim();
    if (!trimmed || !sessionId) {
      setStatus('Please type a message before sending.');
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

  const handleVoiceStart = () => {
    if (!recognition.current) {
      setStatus('Voice input is not supported in this browser.');
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
          <button type="button" className="voice-friend-button" onClick={handleVoiceStart} disabled={busy || listening}>
            {listening ? 'Listening...' : speechSupported ? 'Speak' : 'Voice Unsupported'}
          </button>
          <button type="submit" className="voice-friend-button primary" disabled={busy || !messageText.trim()}>
            Send
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
