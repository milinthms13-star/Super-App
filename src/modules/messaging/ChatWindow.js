import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import MessageSearch from './MessageSearch';
import MessageContextMenu from './MessageContextMenu';
import EmojiPicker from './EmojiPicker';
import ReadReceipts from './ReadReceipts';
import MessagePagination from './MessagePagination';
import AISmartReplies from './AISmartReplies';
import { getAvatarLabel, getEntityId, isSameEntity, checkFamilyAutoAccess, canSeeReadReceipts } from './utils';

const ChatWindow = ({
  chat,
  messages,
  onSendMessage,
  onTyping,
  showAISuggestions,
  latestMessageId,
  onSelectAISuggestion,
  typingUsers,
  encryptionEnabled,
  onToggleEncryption,
  onStartCall,
  onOpenFileUpload,
  onEditMessage,
  onDeleteMessage,
  onToggleImportant,
  onAddReaction,
  onSearchMessages,
  focusedMessageId,
  onFocusHandled,
  onSendVoiceMessage,
  sendingVoiceMessage,
  totalMessages = 0,
  canShowOlderMessages = false,
  hasOlderMessagesLoaded = false,
  loadingOlderMessages = false,
  onShowOlderMessages,
  onShowLatestOnly,
  onClearChat,
  onRestoreClearedChat,
  isChatCleared = false,
  onDeleteAllMessages,
  onRetryMessage,
  onExportChat,
  familyAccessPolicy = null,
}) => {
  const { currentUser } = useApp();
  const [messageInput, setMessageInput] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState(null);
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [showLocationPanel, setShowLocationPanel] = useState(false);
  const [locationMode, setLocationMode] = useState('current');
  const [locationDurationMinutes, setLocationDurationMinutes] = useState(60);
  const [locationError, setLocationError] = useState('');
  const [isLiveLocationSharing, setIsLiveLocationSharing] = useState(false);
  const [liveLocationEndsAt, setLiveLocationEndsAt] = useState('');
  const [showBackgroundPanel, setShowBackgroundPanel] = useState(false);
  const [showHeaderActionsMenu, setShowHeaderActionsMenu] = useState(false);
  const [backgroundError, setBackgroundError] = useState('');
  const [backgroundPreference, setBackgroundPreference] = useState({
    type: 'none',
    value: '',
    layout: 'one-side',
  });
  const [isFamilyMember, setIsFamilyMember] = useState(false);
  const [showReadReceipts, setShowReadReceipts] = useState(false);
  const messagesEndRef = useRef(null);
  const messageContainerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const liveLocationIntervalRef = useRef(null);
  const liveLocationTimeoutRef = useRef(null);
  const liveBackgroundVideoRef = useRef(null);
  const liveBackgroundStreamRef = useRef(null);
  const uploadedVideoUrlRef = useRef('');
  const voiceChunksRef = useRef([]);
  const voiceRecordingStartedAtRef = useRef(0);
  const previousMessageSnapshotRef = useRef({ count: 0, lastId: '' });
  const emojiButtonRef = useRef(null);
  const headerActionsMenuRef = useRef(null);
  const autoLocationStartedForChatRef = useRef(new Set());
  const currentUserId = getEntityId(currentUser);
  const resolvedCurrentUserId = getEntityId(
    chat?.participants?.find((participant) => isSameEntity(participant, currentUser))
  ) || currentUserId;
  const backgroundStorageKey = useMemo(
    () => `malabarbazaar-chat-background-${currentUserId || 'guest'}-${chat?._id || 'none'}`,
    [currentUserId, chat?._id]
  );
  const familyAutoLocationEnabled = Boolean(
    familyAccessPolicy?.isFamilyContact && familyAccessPolicy?.location?.active
  );
  const familyAutoCameraEnabled = Boolean(
    familyAccessPolicy?.isFamilyContact && familyAccessPolicy?.camera?.active
  );

  useEffect(() => {
    const latestMessageId = getEntityId(messages[messages.length - 1]);
    const previousSnapshot = previousMessageSnapshotRef.current;
    const isFirstLoad = previousSnapshot.count === 0 && messages.length > 0;
    const appendedLatestMessage =
      messages.length > previousSnapshot.count &&
      latestMessageId &&
      latestMessageId !== previousSnapshot.lastId;

    if (isFirstLoad || appendedLatestMessage) {
      messagesEndRef.current?.scrollIntoView({ behavior: isFirstLoad ? 'auto' : 'smooth' });
    }

    previousMessageSnapshotRef.current = {
      count: messages.length,
      lastId: latestMessageId,
    };
  }, [messages]);

  useEffect(() => {
    if (!focusedMessageId) {
      return;
    }

    const messageElement = messageContainerRef.current?.querySelector(
      `[data-message-id="${focusedMessageId}"]`
    );

    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('highlight');
      window.setTimeout(() => {
        messageElement.classList.remove('highlight');
      }, 1800);
    }

    if (onFocusHandled) {
      onFocusHandled();
    }
  }, [focusedMessageId, onFocusHandled]);

  useEffect(() => () => {
    mediaRecorderRef.current = null;
    voiceRecordingStartedAtRef.current = 0;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (liveLocationIntervalRef.current) {
      window.clearInterval(liveLocationIntervalRef.current);
      liveLocationIntervalRef.current = null;
    }
    if (liveLocationTimeoutRef.current) {
      window.clearTimeout(liveLocationTimeoutRef.current);
      liveLocationTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!chat?._id) {
      return;
    }

    if (typeof window === 'undefined') {
      setBackgroundPreference({ type: 'none', value: '', layout: 'one-side' });
      return;
    }

    try {
      const rawPreference = window.localStorage.getItem(backgroundStorageKey);
      if (!rawPreference) {
        setBackgroundPreference({ type: 'none', value: '', layout: 'one-side' });
        return;
      }

      const parsedPreference = JSON.parse(rawPreference);
      setBackgroundPreference({
        type: parsedPreference?.type || 'none',
        value: parsedPreference?.value || '',
        layout: parsedPreference?.layout === 'both-sides' ? 'both-sides' : 'one-side',
      });
    } catch (error) {
      setBackgroundPreference({ type: 'none', value: '', layout: 'one-side' });
    }
  }, [backgroundStorageKey, chat?._id]);

  useEffect(() => {
    const ensureLiveVideoStream = async () => {
      if (backgroundPreference.type !== 'live') {
        if (liveBackgroundStreamRef.current) {
          liveBackgroundStreamRef.current.getTracks().forEach((track) => track.stop());
          liveBackgroundStreamRef.current = null;
        }

        if (liveBackgroundVideoRef.current) {
          liveBackgroundVideoRef.current.srcObject = null;
        }
        return;
      }

      if (liveBackgroundStreamRef.current && liveBackgroundVideoRef.current) {
        liveBackgroundVideoRef.current.srcObject = liveBackgroundStreamRef.current;
        return;
      }

      try {
        setBackgroundError('');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        stream.getAudioTracks().forEach((track) => track.stop());
        liveBackgroundStreamRef.current = stream;

        if (liveBackgroundVideoRef.current) {
          liveBackgroundVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        setBackgroundError('Unable to access camera for live background.');
        setBackgroundPreference((currentPreference) => ({
          ...currentPreference,
          type: 'none',
          value: '',
        }));
      }
    };

    ensureLiveVideoStream();
  }, [backgroundPreference.type]);

  useEffect(
    () => () => {
      if (liveBackgroundStreamRef.current) {
        liveBackgroundStreamRef.current.getTracks().forEach((track) => track.stop());
        liveBackgroundStreamRef.current = null;
      }

      if (uploadedVideoUrlRef.current) {
        URL.revokeObjectURL(uploadedVideoUrlRef.current);
        uploadedVideoUrlRef.current = '';
      }
    },
    []
  );

  useEffect(() => {
    setShowLocationPanel(false);
    setShowHeaderActionsMenu(false);
    setLocationError('');
    setIsLiveLocationSharing(false);
    setLiveLocationEndsAt('');

    if (liveLocationIntervalRef.current) {
      window.clearInterval(liveLocationIntervalRef.current);
      liveLocationIntervalRef.current = null;
    }
    if (liveLocationTimeoutRef.current) {
      window.clearTimeout(liveLocationTimeoutRef.current);
      liveLocationTimeoutRef.current = null;
    }
  }, [chat?._id]);

  useEffect(() => {
    if (!showHeaderActionsMenu) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (headerActionsMenuRef.current?.contains(event.target)) {
        return;
      }

      setShowHeaderActionsMenu(false);
    };

    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [showHeaderActionsMenu]);

  // Family auto-access check
  useEffect(() => {
    const checkFamilyAccess = async () => {
      try {
        const recipientId = getEntityId(getOtherParticipants()[0]);
        if (!currentUser?._id || !recipientId) return;

        // Check if family member
        const isFamilyMember = await checkFamilyAutoAccess(
          currentUser._id,
          recipientId
        );

        if (isFamilyMember) {
          console.log('✓ Family member detected - enabling auto-access features');

          // You can set state or conditionally render family-specific UI
          setIsFamilyMember(isFamilyMember);

          // Check read receipt visibility
          const canSee = await canSeeReadReceipts(currentUser._id, recipientId);
          setShowReadReceipts(canSee);
        }
      } catch (error) {
        console.error('Error checking family access:', error);
      }
    };

    if (currentUser?._id && chat?._id) {
      checkFamilyAccess();
    }
  }, [currentUser?._id, chat?._id]);

  const runHeaderMenuAction = (event, action) => {
    event.preventDefault();
    event.stopPropagation();
    action?.();
    setShowHeaderActionsMenu(false);
  };

  const getOtherParticipants = () =>
    chat?.participants?.filter((participant) => !isSameEntity(participant, currentUser)) || [];

  const getChatTitle = () => {
    if (chat?.type === 'group') {
      return chat.groupName;
    }

    return getOtherParticipants()[0]?.name || 'Unknown User';
  };

  const getChatInfo = () => {
    if (chat?.type === 'group') {
      return `${chat.participants.length} members`;
    }

    return getOtherParticipants()[0]?.isOnline ? 'Active now' : 'Available';
  };

  const getChatAvatar = () => {
    if (chat?.type === 'group') {
      return getAvatarLabel(chat.groupName, 'GR');
    }

    const otherParticipant = getOtherParticipants()[0];
    return getAvatarLabel(
      otherParticipant?.name,
      otherParticipant?.username,
      otherParticipant?.avatar,
      'U'
    );
  };

  const saveBackgroundPreference = (nextPreference) => {
    setBackgroundPreference(nextPreference);

    if (typeof window === 'undefined') {
      return;
    }

    try {
      const persistablePreference =
        nextPreference.type === 'video' && String(nextPreference.value || '').startsWith('blob:')
          ? { ...nextPreference, type: 'none', value: '' }
          : nextPreference;
      window.localStorage.setItem(backgroundStorageKey, JSON.stringify(persistablePreference));
    } catch (error) {
      // Ignore persistence failures.
    }
  };

  const updateBackgroundPreference = (partialPreference) => {
    const nextPreference = {
      ...backgroundPreference,
      ...partialPreference,
    };

    if (
      backgroundPreference.type === 'video'
      && String(backgroundPreference.value || '').startsWith('blob:')
      && nextPreference.type !== 'video'
      && uploadedVideoUrlRef.current
    ) {
      URL.revokeObjectURL(uploadedVideoUrlRef.current);
      uploadedVideoUrlRef.current = '';
    }

    saveBackgroundPreference(nextPreference);
  };

  const handleBackgroundFileSelect = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    if (selectedFile.type.startsWith('image/')) {
      const fileReader = new FileReader();
      fileReader.onload = () => {
        const dataUrl = String(fileReader.result || '');
        if (!dataUrl) {
          setBackgroundError('Unable to read selected image.');
          return;
        }

        updateBackgroundPreference({
          type: 'image',
          value: dataUrl,
        });
        setBackgroundError('');
      };
      fileReader.onerror = () => {
        setBackgroundError('Unable to read selected image.');
      };
      fileReader.readAsDataURL(selectedFile);
      return;
    }

    if (selectedFile.type.startsWith('video/')) {
      if (uploadedVideoUrlRef.current) {
        URL.revokeObjectURL(uploadedVideoUrlRef.current);
      }

      const objectUrl = URL.createObjectURL(selectedFile);
      uploadedVideoUrlRef.current = objectUrl;
      updateBackgroundPreference({
        type: 'video',
        value: objectUrl,
      });
      setBackgroundError('');
      return;
    }

    setBackgroundError('Only image or video files are supported for chat backgrounds.');
  };

  const handleSendMessage = () => {
    if (!messageInput.trim()) {
      return;
    }

    onSendMessage(
      messageInput.trim(),
      'text',
      null,
      replyingToMessage?._id || null
    );
    setMessageInput('');
    setReplyingToMessage(null);
    if (onTyping) {
      onTyping(false);
    }
  };

  const handleStickerSelect = async (sticker) => {
    await onSendMessage(
      sticker.name,
      'sticker',
      {
        fileName: sticker.name,
        mimeType: 'image/svg+xml',
        s3Url: sticker.url,
        fileSize: 0,
        stickerId: sticker.id,
        animated: Boolean(sticker.animated),
        category: sticker.category,
        tags: sticker.tags || [],
      },
      replyingToMessage?._id || null
    );
    setReplyingToMessage(null);
  };

  const formatLiveLocationTimeRemaining = () => {
    if (!liveLocationEndsAt) {
      return '';
    }

    const remainingMs = new Date(liveLocationEndsAt).getTime() - Date.now();
    if (remainingMs <= 0) {
      return 'Ending now';
    }

    const remainingMinutes = Math.ceil(remainingMs / 60000);
    if (remainingMinutes < 60) {
      return `${remainingMinutes}m left`;
    }

    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m left` : `${hours}h left`;
  };

  const stopLiveLocationSharing = useCallback(async ({ notifyChat = false } = {}) => {
    if (liveLocationIntervalRef.current) {
      window.clearInterval(liveLocationIntervalRef.current);
      liveLocationIntervalRef.current = null;
    }
    if (liveLocationTimeoutRef.current) {
      window.clearTimeout(liveLocationTimeoutRef.current);
      liveLocationTimeoutRef.current = null;
    }

    setIsLiveLocationSharing(false);
    setLiveLocationEndsAt('');

    if (notifyChat) {
      await onSendMessage('📍 Live location sharing ended.', 'location');
    }
  }, [onSendMessage]);

  const getCurrentPosition = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported on this device.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      });
    });

  const sendLocationMessage = async ({ isLive = false, isFinal = false } = {}) => {
    const position = await getCurrentPosition();
    const { latitude, longitude } = position.coords;
    const mapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    const locationLabel = isFinal
      ? '📍 Final live location update'
      : isLive
        ? '📍 Live location update'
        : '📍 Current location';
    const expiresLine = isLive && liveLocationEndsAt
      ? `Live until ${new Date(liveLocationEndsAt).toLocaleString()}`
      : '';
    const contentLines = [
      `${locationLabel}: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      mapUrl,
      expiresLine,
    ].filter(Boolean);

    await onSendMessage(contentLines.join('\n'), 'location');
  };

  const handleShareCurrentLocation = async () => {
    try {
      setLocationError('');
      await sendLocationMessage({ isLive: false });
      setShowLocationPanel(false);
    } catch (error) {
      setLocationError(error.message || 'Unable to fetch current location.');
    }
  };

  const startLiveLocationWithDuration = async (duration) => {
    try {
      setLocationError('');
      await stopLiveLocationSharing();

      const endsAt = new Date(Date.now() + duration * 60000).toISOString();
      setLiveLocationEndsAt(endsAt);
      setIsLiveLocationSharing(true);

      await onSendMessage(
        `📍 Live location sharing started for ${duration} minutes.`,
        'location'
      );
      await sendLocationMessage({ isLive: true });

      liveLocationIntervalRef.current = window.setInterval(async () => {
        try {
          await sendLocationMessage({ isLive: true });
        } catch (error) {
          setLocationError('Location update failed. Live sharing stopped.');
          await stopLiveLocationSharing({ notifyChat: true });
        }
      }, 60000);

      liveLocationTimeoutRef.current = window.setTimeout(async () => {
        try {
          await sendLocationMessage({ isLive: true, isFinal: true });
          await onSendMessage('📍 Live location sharing ended automatically.', 'location');
        } catch (error) {
          // Ignore send failures during forced stop.
        }
        await stopLiveLocationSharing();
      }, duration * 60000);
    } catch (error) {
      setLocationError(error.message || 'Unable to start live location sharing.');
      await stopLiveLocationSharing();
    }
  };

  const resolveAutoLocationDurationMinutes = () => {
    const temporaryExpiry = familyAccessPolicy?.location?.expiresAt;
    const mode = String(familyAccessPolicy?.location?.mode || '').toLowerCase();

    if (mode === 'temporary' && temporaryExpiry) {
      const remainingMs = new Date(temporaryExpiry).getTime() - Date.now();
      if (remainingMs > 0) {
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        return Math.min(Math.max(remainingMinutes, 1), 1440);
      }
    }

    return 60;
  };

  const handleStartLiveLocation = async () => {
    const duration = Number(locationDurationMinutes || 0);
    if (!duration || duration < 1 || duration > 1440) {
      setLocationError('Please choose a valid duration up to 24 hours.');
      return;
    }

    await startLiveLocationWithDuration(duration);
  };

  useEffect(() => {
    const chatId = getEntityId(chat?._id || chat);
    if (!chatId || chat?.type !== 'direct') {
      return;
    }

    if (!familyAutoLocationEnabled || isLiveLocationSharing) {
      return;
    }

    if (autoLocationStartedForChatRef.current.has(chatId)) {
      return;
    }

    autoLocationStartedForChatRef.current.add(chatId);
    const autoDuration = resolveAutoLocationDurationMinutes();
    setLocationMode('live');
    setLocationDurationMinutes(autoDuration);
    void startLiveLocationWithDuration(autoDuration);
  }, [chat, familyAutoLocationEnabled, isLiveLocationSharing]);

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    setMessageInput(nextValue);
    if (onTyping) {
      onTyping(nextValue.length > 0);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const stopVoiceCaptureStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const buildVoiceFileFromChunks = (mimeType = 'audio/webm') => {
    const voiceBlob = new Blob(voiceChunksRef.current, { type: mimeType });
    if (!voiceChunksRef.current.length || voiceBlob.size === 0) {
      return null;
    }

    const extension = mimeType.includes('ogg')
      ? 'ogg'
      : mimeType.includes('mp4')
        ? 'm4a'
        : 'webm';

    return new File([voiceBlob], `voice-note-${Date.now()}.${extension}`, { type: mimeType });
  };

  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceError('Voice notes are not supported in this browser.');
      return;
    }

    try {
      setVoiceError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ].find((candidate) => (
        typeof MediaRecorder.isTypeSupported !== 'function' || MediaRecorder.isTypeSupported(candidate)
      ));

      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      voiceChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          voiceChunksRef.current.push(event.data);
        }
      };

      recorder.start(250);
      voiceRecordingStartedAtRef.current = Date.now();
      setIsRecordingVoice(true);
    } catch (error) {
      setVoiceError('Microphone access is required to record a voice note.');
      voiceRecordingStartedAtRef.current = 0;
      stopVoiceCaptureStream();
    }
  };

  const stopVoiceRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      return;
    }

    const recordedFile = await new Promise((resolve, reject) => {
      recorder.onstop = () => {
        window.setTimeout(() => {
          const nextFile = buildVoiceFileFromChunks(recorder.mimeType || 'audio/webm');
          if (!nextFile) {
            const recordingDuration = Date.now() - voiceRecordingStartedAtRef.current;
            reject(
              new Error(
                recordingDuration < 400
                  ? 'Record for a little longer before sending the voice note.'
                  : 'No audio was captured. Please try recording again.'
              )
            );
            return;
          }

          resolve(nextFile);
        }, 0);
      };

      recorder.onerror = () => {
        reject(new Error('Voice recording failed.'));
      };

      if (typeof recorder.requestData === 'function' && recorder.state === 'recording') {
        try {
          recorder.requestData();
        } catch (error) {
          // Ignore requestData errors and fall back to the stop event.
        }
      }

      recorder.stop();
    });

    setIsRecordingVoice(false);
    stopVoiceCaptureStream();
    mediaRecorderRef.current = null;
    voiceChunksRef.current = [];
    voiceRecordingStartedAtRef.current = 0;

    if (recordedFile && onSendVoiceMessage) {
      await onSendVoiceMessage(recordedFile);
    }
  };

  const handleVoiceButtonClick = async () => {
    if (sendingVoiceMessage) {
      return;
    }

    try {
      if (isRecordingVoice) {
        await stopVoiceRecording();
        return;
      }

      await startVoiceRecording();
    } catch (error) {
      setVoiceError(error.message || 'Unable to send voice note.');
      setIsRecordingVoice(false);
      stopVoiceCaptureStream();
      mediaRecorderRef.current = null;
      voiceChunksRef.current = [];
      voiceRecordingStartedAtRef.current = 0;
    }
  };

  const openMessageActions = (message, isOwnMessage, position) => {
    setContextMenu({
      message,
      canEdit: isOwnMessage && message.messageType === 'text' && !message.isPending,
      canRecall: isOwnMessage && !message.isPending,
      position,
    });
  };

  const buildActionMenuPosition = (event) => {
    const targetRect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 200;
    const menuHeight = 220;

    return {
      x: Math.max(12, Math.min(targetRect.left, window.innerWidth - menuWidth - 12)),
      y: Math.max(12, Math.min(targetRect.bottom + 8, window.innerHeight - menuHeight - 12)),
    };
  };

  const handleContextMenu = (event, message, isOwnMessage) => {
    if (message.isDeleted) {
      return;
    }

    event.preventDefault();
    openMessageActions(message, isOwnMessage, { x: event.clientX, y: event.clientY });
  };

  const handleActionButtonClick = (event, message, isOwnMessage) => {
    if (message.isDeleted) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    openMessageActions(message, isOwnMessage, buildActionMenuPosition(event));
  };

  const handleEditMessage = (message) => {
    setEditingMessageId(message._id);
    setEditingContent(message.content || '');
  };

  const handleRecallMessage = async (message) => {
    if (!message?._id) {
      return;
    }

    if (!window.confirm('Recall this message for everyone?')) {
      return;
    }

    await onDeleteMessage(message._id);
  };

  const handleReplyMessage = (message) => {
    setReplyingToMessage(message);
    setContextMenu(null);
  };

  const handleToggleImportantMessage = async (message) => {
    if (onToggleImportant) {
      await onToggleImportant(message._id);
    }
    setContextMenu(null);
  };

  const handleAddReaction = (message, event) => {
    if (event) {
      event.stopPropagation();
    }

    const targetRect = event?.currentTarget?.getBoundingClientRect?.();
    if (targetRect) {
      setEmojiPickerPosition({
        x: Math.max(12, Math.min(targetRect.left, window.innerWidth - 420)),
        y: Math.max(12, Math.min(targetRect.bottom + 8, window.innerHeight - 520)),
      });
    } else {
      setEmojiPickerPosition(null);
    }

    setSelectedMessageForReaction(message);
    setShowEmojiPicker(true);
  };

  const handleEmojiSelect = async (emoji) => {
    if (selectedMessageForReaction?._id) {
      await onAddReaction(selectedMessageForReaction._id, emoji);
      setSelectedMessageForReaction(null);
      setShowEmojiPicker(false);
      setEmojiPickerPosition(null);
      return;
    }

    setMessageInput((currentValue) => `${currentValue}${emoji}`);
    setShowEmojiPicker(false);
    setEmojiPickerPosition(null);
  };

  const toggleComposerEmojiPicker = () => {
    if (showEmojiPicker && !selectedMessageForReaction) {
      setShowEmojiPicker(false);
      setEmojiPickerPosition(null);
      return;
    }

    setSelectedMessageForReaction(null);

    const targetRect = emojiButtonRef.current?.getBoundingClientRect?.();
    if (!targetRect) {
      setEmojiPickerPosition(null);
      setShowEmojiPicker(true);
      return;
    }

    const pickerWidth = Math.min(420, window.innerWidth - 24);
    const estimatedPickerHeight = 520;
    const left = Math.max(12, Math.min(targetRect.left, window.innerWidth - pickerWidth - 12));
    const top = Math.max(12, targetRect.top - estimatedPickerHeight - 12);

    setEmojiPickerPosition({
      x: left,
      y: top,
    });
    setShowEmojiPicker(true);
  };

  const handleSearchSelect = (message) => {
    const messageElement = messageContainerRef.current?.querySelector(
      `[data-message-id="${message._id}"]`
    );
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('highlight');
      window.setTimeout(() => messageElement.classList.remove('highlight'), 1800);
    }
    setShowSearch(false);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleSaveEdit = async () => {
    if (!editingContent.trim() || !editingMessageId) {
      return;
    }

    await onEditMessage(editingMessageId, editingContent.trim());
    handleCancelEdit();
  };

  const renderReplyPreview = (message) => {
    if (!message?.replyTo) {
      return null;
    }

    const replyAuthor = message.replyTo?.senderId?.name || 'Previous message';
    const replyText = message.replyTo?.content || 'Attachment';

    return (
      <div className="message-reply-preview">
        <strong>{replyAuthor}</strong>
        <span>{replyText}</span>
      </div>
    );
  };

  const chatWindowBackgroundStyle = {};
  if (backgroundPreference.type === 'image' && backgroundPreference.value) {
    chatWindowBackgroundStyle.backgroundImage = `url("${backgroundPreference.value}")`;
    chatWindowBackgroundStyle.backgroundSize = 'cover';
    chatWindowBackgroundStyle.backgroundPosition = 'center';
  }

  const isVideoBackgroundActive =
    (backgroundPreference.type === 'video' || backgroundPreference.type === 'live')
    && Boolean(backgroundPreference.value || backgroundPreference.type === 'live');

  if (!chat) {
    return (
      <div className="chat-window empty-chat">
        <div className="chat-window-empty-shell">
          <h2>No conversation selected</h2>
          <p>Choose a chat from the sidebar to begin messaging.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`chat-window ${
        backgroundPreference.layout === 'both-sides' ? 'chat-window-bg-both-sides' : 'chat-window-bg-one-side'
      } ${backgroundPreference.type !== 'none' ? 'chat-window-with-custom-bg' : ''}`}
      style={chatWindowBackgroundStyle}
    >
      {isVideoBackgroundActive && (
        <div className="chat-window-video-bg-layer" aria-hidden="true">
          {backgroundPreference.type === 'video' ? (
            <video
              className="chat-window-video-bg"
              src={backgroundPreference.value}
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <video
              ref={liveBackgroundVideoRef}
              className="chat-window-video-bg"
              autoPlay
              muted
              playsInline
            />
          )}
        </div>
      )}
      {backgroundPreference.type !== 'none' && <div className="chat-window-bg-overlay" aria-hidden="true"></div>}

      <div className="chat-window-header">
        <div className="chat-header-profile">
          <span className="chat-header-avatar">{getChatAvatar()}</span>
          <div className="chat-header-info">
            <h3>{getChatTitle()}</h3>
            {isFamilyMember && (
              <div className="family-badge">
                <span>👨‍👩‍👧 Family Member</span>
                <span className="auto-access">Auto-Access Enabled</span>
              </div>
            )}
            <p className="chat-status">{getChatInfo()}</p>
            {(familyAutoLocationEnabled || familyAutoCameraEnabled) && (
              <p className="chat-status">
                Family auto-access: {familyAutoLocationEnabled ? 'Location' : ''}
                {familyAutoLocationEnabled && familyAutoCameraEnabled ? ' + ' : ''}
                {familyAutoCameraEnabled ? 'Camera call auto-accept' : ''}
              </p>
            )}
          </div>
        </div>
        <div className="chat-header-actions" ref={headerActionsMenuRef}>
          <button
            className={`btn-icon btn-icon-secondary ${showSearch ? 'active' : ''}`}
            title="Search messages"
            onClick={() => setShowSearch((current) => !current)}
            type="button"
          >
            Search
          </button>
          <button
            className="btn-icon btn-icon-secondary"
            title="Voice Call"
            onClick={() => onStartCall('audio')}
            type="button"
          >
            Audio
          </button>
          <button
            className="btn-icon btn-icon-secondary"
            title="Video Call"
            onClick={() => onStartCall('video')}
            type="button"
          >
            Video
          </button>
          <button
            className={`btn-icon btn-icon-secondary ${isChatCleared ? 'active' : ''}`}
            title={isChatCleared ? 'Show cleared messages again' : 'Clear this chat from your view'}
            onClick={isChatCleared ? onRestoreClearedChat : onClearChat}
            type="button"
          >
            {isChatCleared ? 'Restore' : 'Clear'}
          </button>
          <button
            className="btn-icon btn-icon-secondary"
            title="Export chat transcript"
            onClick={onExportChat}
            type="button"
          >
            Export
          </button>
          <button
            className={`btn-icon btn-icon-secondary ${showHeaderActionsMenu ? 'active' : ''}`}
            title="More chat actions"
            onClick={(event) => {
              event.stopPropagation();
              setShowHeaderActionsMenu((current) => !current);
            }}
            type="button"
          >
            Tools
          </button>

          {showHeaderActionsMenu && (
            <div
              className="chat-header-actions-menu"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                className="chat-header-actions-item"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => runHeaderMenuAction(
                  event,
                  isChatCleared ? onRestoreClearedChat : onClearChat
                )}
                type="button"
              >
                {isChatCleared ? 'Restore Chat' : 'Clear Chat'}
              </button>
              <button
                className="chat-header-actions-item"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => runHeaderMenuAction(event, onExportChat)}
                type="button"
              >
                Export Chat
              </button>
              <button
                className={`chat-header-actions-item ${encryptionEnabled ? 'active' : ''}`}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => runHeaderMenuAction(event, onToggleEncryption)}
                type="button"
              >
                {encryptionEnabled ? 'Disable Encryption' : 'Enable Encryption'}
              </button>
              <button
                className={`chat-header-actions-item ${showBackgroundPanel ? 'active' : ''}`}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => runHeaderMenuAction(event, () => {
                  setShowBackgroundPanel((current) => !current);
                })}
                type="button"
              >
                {showBackgroundPanel ? 'Hide Background Panel' : 'Background Settings'}
              </button>
              <button
                className="chat-header-actions-item danger"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => runHeaderMenuAction(event, onDeleteAllMessages)}
                type="button"
              >
                Delete All Messages
              </button>
            </div>
          )}
        </div>
      </div>

      {showBackgroundPanel && (
        <div className="chat-background-panel">
          <div className="chat-background-panel-header">
            <h4>Chat Background</h4>
            <button
              type="button"
              className="chat-background-close-btn"
              onClick={() => setShowBackgroundPanel(false)}
            >
              Close
            </button>
          </div>

          <div className="chat-background-actions">
            <button
              type="button"
              className={`chat-background-chip ${backgroundPreference.type === 'none' ? 'active' : ''}`}
              onClick={() => updateBackgroundPreference({ type: 'none', value: '' })}
            >
              None
            </button>
            <button
              type="button"
              className={`chat-background-chip ${backgroundPreference.type === 'live' ? 'active' : ''}`}
              onClick={() => updateBackgroundPreference({ type: 'live', value: '' })}
            >
              Live Video (Muted)
            </button>
            <label className="chat-background-upload-chip">
              Upload Image/Video
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleBackgroundFileSelect}
              />
            </label>
          </div>

          <div className="chat-background-layout-row">
            <span>Apply layout:</span>
            <button
              type="button"
              className={`chat-background-layout-btn ${
                backgroundPreference.layout === 'one-side' ? 'active' : ''
              }`}
              onClick={() => updateBackgroundPreference({ layout: 'one-side' })}
            >
              One Side
            </button>
            <button
              type="button"
              className={`chat-background-layout-btn ${
                backgroundPreference.layout === 'both-sides' ? 'active' : ''
              }`}
              onClick={() => updateBackgroundPreference({ layout: 'both-sides' })}
            >
              Both Sides
            </button>
          </div>

          {backgroundError && <p className="chat-background-error">{backgroundError}</p>}
          {backgroundPreference.type === 'live' && (
            <p className="chat-background-note">
              Live background uses camera video only. Audio remains off.
            </p>
          )}
        </div>
      )}

      {showSearch && (
        <MessageSearch
          chatId={chat?._id}
          messages={messages}
          onSearch={onSearchMessages}
          onSelectMessage={handleSearchSelect}
          onClose={() => setShowSearch(false)}
        />
      )}

      <div className="messages-container" ref={messageContainerRef}>
        {isChatCleared ? (
          <div className="message-history-state">
            <p className="message-history-copy">This chat history is hidden from your view.</p>
            <button className="btn-pagination" onClick={onRestoreClearedChat} type="button">
              Show previous messages
            </button>
          </div>
        ) : (
          <MessagePagination
            visibleMessages={messages.length}
            totalMessages={Math.max(totalMessages, messages.length)}
            canShowOlderMessages={canShowOlderMessages}
            hasOlderMessagesLoaded={hasOlderMessagesLoaded}
            loadingOlderMessages={loadingOlderMessages}
            onShowOlderMessages={onShowOlderMessages}
            onShowLatestOnly={onShowLatestOnly}
          />
        )}

        {messages.length === 0 ? (
          <div className="no-messages">
            <p>{isChatCleared ? 'New messages will appear here.' : 'No messages yet. Say hello!'}</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = isSameEntity(message.senderId, currentUser);
            const isEditing = editingMessageId === message._id;

            return (
              <div
                key={message._id || index}
                className={`message ${isOwnMessage ? 'sent' : 'received'} ${
                  message.isDeleted ? 'deleted' : ''
                } ${message.isPending ? 'pending' : ''} ${message.isFailed ? 'failed' : ''}`}
                data-message-id={message._id}
                onContextMenu={(event) => handleContextMenu(event, message, isOwnMessage)}
              >
                {!isOwnMessage && (
                  <span className="message-avatar">
                    {getAvatarLabel(
                      message.senderId?.name,
                      message.senderId?.username,
                      message.senderId?.avatar,
                      'U'
                    )}
                  </span>
                )}

                <div className="message-content">
                  {chat.type === 'group' && !isOwnMessage && (
                    <p className="message-sender">{message.senderId?.name}</p>
                  )}

                  <div className="message-bubble">
                    {renderReplyPreview(message)}

                    {isEditing ? (
                      <div className="message-edit-form">
                        <textarea
                          value={editingContent}
                          onChange={(event) => setEditingContent(event.target.value)}
                          className="edit-textarea"
                          autoFocus
                        />
                        <div className="edit-actions">
                          <button className="btn-edit-save" onClick={handleSaveEdit} type="button">
                            Save
                          </button>
                          <button className="btn-edit-cancel" onClick={handleCancelEdit} type="button">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : message.isDeleted ? (
                      <p className="message-deleted-text">This message was recalled.</p>
                    ) : (
                      <>
                        {message.messageType === 'text' && <p>{message.content}</p>}
                        {message.messageType === 'image' && (
                          <div className="message-media">
                            <img src={message.media?.url} alt="" />
                          </div>
                        )}
                        {message.messageType === 'sticker' && (
                          <div className="message-sticker">
                            <img
                              src={message.media?.url}
                              alt={message.content || 'Sticker'}
                              className="message-sticker-image"
                              loading="lazy"
                            />
                            <span className="message-sticker-label">{message.content || 'Sticker'}</span>
                          </div>
                        )}
                        {message.messageType === 'location' && (
                          <div className="message-location-card">
                            <span className="message-location-title">Location shared</span>
                            <pre className="message-location-text">{message.content}</pre>
                            {(() => {
                              const contentText = String(message.content || '');
                              const urlMatch = contentText.match(/https?:\/\/\S+/i);
                              let locationUrl = urlMatch ? urlMatch[0] : null;

                              if (!locationUrl) {
                                const coordMatch = contentText.match(/([-+]?\d{1,3}\.\d+)[,\s]+([-+]?\d{1,3}\.\d+)/);
                                if (coordMatch) {
                                  const latitude = parseFloat(coordMatch[1]);
                                  const longitude = parseFloat(coordMatch[2]);
                                  if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
                                    locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
                                  }
                                }
                              }

                              if (!locationUrl) {
                                return null;
                              }

                              return (
                                <a
                                  href={locationUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="message-location-link"
                                >
                                  Open in Maps
                                </a>
                              );
                            })()}
                          </div>
                        )}
                        {message.messageType === 'video' && (
                          <div className="message-media">
                            <video src={message.media?.url} controls />
                          </div>
                        )}
                        {(message.messageType === 'audio' || message.messageType === 'voice') && (
                          <div className="message-media">
                            {message.messageType === 'voice' && (
                              <span className="voice-note-label">Voice note</span>
                            )}
                            {message.media?.url ? (
                              <audio controls preload="metadata">
                                <source src={message.media.url} type={message.media?.type || undefined} />
                                Your browser could not play this audio file.
                              </audio>
                            ) : (
                              <p className="message-media-fallback">Audio file is not available.</p>
                            )}
                          </div>
                        )}
                        {message.messageType === 'file' && (
                          <div className="message-media">
                            <a href={message.media?.url} target="_blank" rel="noreferrer">
                              {message.content || 'Open file'}
                            </a>
                          </div>
                        )}

                        {message.reactions?.length > 0 && (
                          <div className="message-reactions">
                            {message.reactions.map((reaction, reactionIndex) => (
                              <button
                                key={`${reaction.emoji}-${reactionIndex}`}
                                className="reaction-chip"
                                onClick={(event) => handleAddReaction(message, event)}
                                type="button"
                              >
                                {reaction.emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        {(message.markedAsImportantBy || []).some(
                          (id) => id === resolvedCurrentUserId || id._id === resolvedCurrentUserId
                        ) && (
                          <div className="message-important-badge">
                            ⭐ Marked as important
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="message-meta">
                    <span className="message-time">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {message.isPending && (
                      <span className="message-pending-label">Sending...</span>
                    )}
                    {message.isFailed && (
                      <span className="message-pending-label">
                        Failed to send
                      </span>
                    )}
                    {message.edits?.length > 0 && !message.isDeleted && (
                      <span className="message-edited-label">Edited</span>
                    )}
                    {isOwnMessage && !message.isPending && (
                      <ReadReceipts
                        deliveryStatus={message.deliveryStatus}
                        currentUserId={resolvedCurrentUserId}
                      />
                    )}
                    {!message.isDeleted && !message.isPending && isOwnMessage && (
                      <button
                        className="message-inline-action message-overflow-action danger"
                        onClick={() => handleRecallMessage(message)}
                        type="button"
                        title="Recall message"
                      >
                        Recall
                      </button>
                    )}
                    {message.isFailed && !message.isDeleted && (
                      <button
                        className="message-inline-action"
                        onClick={() => onRetryMessage?.(message)}
                        type="button"
                        title={message.errorMessage || 'Retry sending message'}
                      >
                        Retry
                      </button>
                    )}
                    {!message.isDeleted && (
                      <button
                        className="message-inline-action message-overflow-action"
                        onClick={(event) => handleActionButtonClick(event, message, isOwnMessage)}
                        type="button"
                        title="More actions"
                        aria-label="More actions"
                      >
                        ⋯
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {typingUsers.size > 0 && (
          <div className="typing-indicator">
            <span className="typing-label-live">
              {Array.from(typingUsers).length === 1 ? 'Someone typing' : 'People typing'}
            </span>
            <span className="typing-dot-live"></span>
            <span className="typing-dot-live"></span>
            <span className="typing-dot-live"></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {contextMenu && (
        <MessageContextMenu
          message={contextMenu.message}
          position={contextMenu.position}
          canEdit={contextMenu.canEdit}
          canRecall={contextMenu.canRecall}
          isImportant={(contextMenu.message?.markedAsImportantBy || []).some(
            (id) => id === resolvedCurrentUserId || id._id === resolvedCurrentUserId
          )}
          onEdit={handleEditMessage}
          onRecall={handleRecallMessage}
          onReply={handleReplyMessage}
          onReact={handleAddReaction}
          onToggleImportant={handleToggleImportantMessage}
          onDelete={handleRecallMessage}
          onClose={() => setContextMenu(null)}
        />
      )}

      {showEmojiPicker && (
        <EmojiPicker
          onSelectEmoji={handleEmojiSelect}
          onSelectSticker={handleStickerSelect}
          position={emojiPickerPosition}
          onClose={() => {
            setShowEmojiPicker(false);
            setSelectedMessageForReaction(null);
            setEmojiPickerPosition(null);
          }}
        />
      )}

      <div className="message-input-area">
        {replyingToMessage && (
          <div className="replying-banner">
            <div className="replying-banner-content">
              <strong>Replying to {replyingToMessage.senderId?.name || 'message'}</strong>
              <span>{replyingToMessage.content || 'Attachment'}</span>
            </div>
            <button
              className="replying-banner-close"
              onClick={() => setReplyingToMessage(null)}
              type="button"
            >
              X
            </button>
          </div>
        )}

        {showAISuggestions && chat?._id && latestMessageId && (
          <div className="smart-replies-inline-row">
            <span className="smart-replies-label">AI replies</span>
            <AISmartReplies
              chatId={chat?._id}
              messageId={latestMessageId}
              onSelectReply={onSelectAISuggestion}
            />
          </div>
        )}

        <textarea
          value={messageInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="message-textarea"
          rows="1"
        />
        <div className="message-actions">
          <button
            ref={emojiButtonRef}
            className="btn-action btn-action-secondary"
            title="Emoji picker"
            aria-label="Emoji picker"
            onClick={toggleComposerEmojiPicker}
            type="button"
          >
            😀
          </button>
          <button
            className="btn-action btn-action-secondary"
            title="Attach file"
            aria-label="Attach file"
            onClick={onOpenFileUpload}
            type="button"
          >
            📎
          </button>
          <button
            className={`btn-action btn-action-secondary ${showLocationPanel ? 'active' : ''}`}
            title="Share location"
            aria-label="Share location"
            onClick={() => setShowLocationPanel((current) => !current)}
            type="button"
          >
            📍
          </button>
          <button
            className={`btn-action btn-action-secondary ${isRecordingVoice ? 'voice-recording' : ''}`}
            title={isRecordingVoice ? 'Stop and send voice note' : 'Record voice note'}
            aria-label={isRecordingVoice ? 'Stop voice note' : 'Record voice note'}
            onClick={handleVoiceButtonClick}
            disabled={sendingVoiceMessage}
            type="button"
          >
            🎙️
          </button>
          <button
            className="btn-send btn-action-primary"
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
            title="Send message"
            type="button"
          >
            ➤
          </button>
        </div>
        {showLocationPanel && (
          <div className="location-share-panel">
            <div className="location-share-row">
              <button
                type="button"
                className={`location-share-chip ${locationMode === 'current' ? 'active' : ''}`}
                onClick={() => setLocationMode('current')}
              >
                Current
              </button>
              <button
                type="button"
                className={`location-share-chip ${locationMode === 'live' ? 'active' : ''}`}
                onClick={() => setLocationMode('live')}
              >
                Live
              </button>
            </div>
            {locationMode === 'live' && (
              <div className="location-share-row">
                <label htmlFor="location-duration">Duration</label>
                <select
                  id="location-duration"
                  className="location-duration-select"
                  value={locationDurationMinutes}
                  onChange={(event) => setLocationDurationMinutes(Number(event.target.value))}
                  disabled={isLiveLocationSharing}
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={180}>3 hours</option>
                  <option value={360}>6 hours</option>
                  <option value={720}>12 hours</option>
                  <option value={1440}>24 hours</option>
                </select>
              </div>
            )}
            <div className="location-share-row">
              {locationMode === 'current' ? (
                <button
                  type="button"
                  className="location-primary-btn btn-action-primary"
                  onClick={handleShareCurrentLocation}
                >
                  Share Current Location
                </button>
              ) : isLiveLocationSharing ? (
                <>
                  <span className="location-live-status">
                    Live sharing active ({formatLiveLocationTimeRemaining()})
                  </span>
                  <button
                    type="button"
                    className="location-stop-btn btn-action-danger"
                    onClick={() => stopLiveLocationSharing({ notifyChat: true })}
                  >
                    Stop Live Sharing
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="location-primary-btn btn-action-primary"
                  onClick={handleStartLiveLocation}
                >
                  Start Live Sharing
                </button>
              )}
            </div>
          </div>
        )}
        {locationError && (
          <div className="location-share-error">{locationError}</div>
        )}
        {(isRecordingVoice || voiceError) && (
          <div className={`voice-note-status ${voiceError ? 'error' : ''}`}>
            {voiceError || 'Recording voice note... tap "Stop Voice" to send.'}
          </div>
        )}
        {encryptionEnabled && (
          <div className="encryption-indicator">
            <span className="encryption-text">Encryption enabled</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Family badge styles
const familyBadgeStyles = `
  .family-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 4px 0;
    font-size: 12px;
    color: #667eea;
    font-weight: 600;
  }
  
  .family-badge .auto-access {
    background: #667eea;
    color: white;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'family-badge-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = familyBadgeStyles;
    document.head.appendChild(style);
  }
}

export default ChatWindow;
