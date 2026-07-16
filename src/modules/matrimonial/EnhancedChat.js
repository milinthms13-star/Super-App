import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './constants';
import './EnhancedChat.css';

const EnhancedChat = ({ threadId, otherProfile, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [reactions, setReactions] = useState({});
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    if (threadId) {
      fetchMessages();
    }
  }, [threadId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/matrimonial/messages/thread/${threadId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );
      setMessages(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const sendTextMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/matrimonial/messages`,
        {
          toProfileId: otherProfile._id,
          content: newMessage.trim(),
          messageType: 'text',
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setMessages([...messages, response.data.data]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('toProfileId', otherProfile._id);
      formData.append('messageType', 'image');

      const response = await axios.post(
        `${API_BASE_URL}/matrimonial/messages/image`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setMessages([...messages, response.data.data]);
      setShowImageUpload(false);
    } catch (error) {
      console.error('Failed to send image:', error);
      alert('Failed to send image');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendVoiceNote(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const sendVoiceNote = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('voiceNote', audioBlob, 'voice-note.webm');
      formData.append('toProfileId', otherProfile._id);
      formData.append('messageType', 'voice');

      const response = await axios.post(
        `${API_BASE_URL}/matrimonial/messages/voice`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setMessages([...messages, response.data.data]);
    } catch (error) {
      console.error('Failed to send voice note:', error);
      alert('Failed to send voice note');
    }
  };

  const addReaction = async (messageId, emoji) => {
    try {
      await axios.post(
        `${API_BASE_URL}/matrimonial/messages/${messageId}/react`,
        { emoji },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setReactions({
        ...reactions,
        [messageId]: emoji,
      });
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="enhanced-chat">
      <div className="chat-header">
        <div className="chat-header-profile">
          <div className="chat-avatar">
            {otherProfile.photoUrl ? (
              <img src={otherProfile.photoUrl} alt={otherProfile.name} />
            ) : (
              <div className="chat-avatar-placeholder">
                {otherProfile.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="chat-header-info">
            <h3>{otherProfile.name}</h3>
            <span className="chat-status">
              {isTyping ? 'Typing...' : 'Active'}
            </span>
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>Start the conversation with {otherProfile.name}</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className={`chat-message ${
                message.fromProfileId === currentUser.profileId ? 'sent' : 'received'
              }`}
            >
              <div className="message-content">
                {message.messageType === 'text' && (
                  <p>{message.content}</p>
                )}
                {message.messageType === 'image' && (
                  <img src={message.imageUrl} alt="Shared image" />
                )}
                {message.messageType === 'voice' && (
                  <audio controls src={message.voiceUrl} />
                )}
                <span className="message-time">{formatTime(message.createdAt)}</span>
              </div>
              {reactions[message._id] && (
                <span className="message-reaction">{reactions[message._id]}</span>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />

        <button
          className="chat-action-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Send image"
        >
          📷
        </button>

        <button
          className={`chat-action-btn ${recording ? 'recording' : ''}`}
          onClick={recording ? stopRecording : startRecording}
          title={recording ? 'Stop recording' : 'Send voice note'}
        >
          {recording ? '⏹️' : '🎤'}
        </button>

        <input
          type="text"
          className="chat-input"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
        />

        <button
          className="chat-send-btn"
          onClick={sendTextMessage}
          disabled={!newMessage.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default EnhancedChat;
