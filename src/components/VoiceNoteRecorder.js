import React, { useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';

const VoiceNoteRecorder = ({ module, contextId, recipientId, onSend }) => {
  const { apiCall } = useApp();
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/m4a' });
        setAudioBlob(audioBlob);
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (error) {
      console.error('Recording failed:', error);
    }
  };

  const stopRecording = async () => {
    mediaRecorderRef.current.stop();
    setRecording(false);

    if (audioBlob && onSend) {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-note.m4a');
      formData.append('module', module);
      formData.append('contextId', contextId);
      formData.append('recipientId', recipientId);

      try {
        const response = await apiCall('/voice/voicenote', 'POST', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        onSend(response.voiceNote);
      } catch (error) {
        console.error('Voice note send failed:', error);
      }
    }
  };

  return (
    <div className="voice-note-recorder">
      <button onClick={recording ? stopRecording : startRecording} className="voice-recorder-btn">
        {recording ? '⏹️ Stop' : '🎤 Record'}
      </button>
      {audioBlob && <audio controls src={URL.createObjectURL(audioBlob)} />}
    </div>
  );
};

export default VoiceNoteRecorder;

