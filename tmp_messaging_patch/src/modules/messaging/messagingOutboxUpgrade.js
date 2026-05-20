export const MESSAGE_OUTBOX_KEY = 'nilahub-linkup-outbox-v2';

export const createClientMessageId = () =>
  `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const loadOutbox = () => {
  try {
    return JSON.parse(localStorage.getItem(MESSAGE_OUTBOX_KEY) || '[]');
  } catch {
    return [];
  }
};

export const saveOutbox = (items) => {
  localStorage.setItem(MESSAGE_OUTBOX_KEY, JSON.stringify(items || []));
};

export const addOutboxMessage = (message) => {
  const items = loadOutbox();
  const nextMessage = {
    ...message,
    clientMessageId: message.clientMessageId || createClientMessageId(),
    status: 'queued',
    retryCount: message.retryCount || 0,
    createdAt: message.createdAt || new Date().toISOString(),
  };

  saveOutbox([nextMessage, ...items].slice(0, 100));
  return nextMessage;
};

export const markOutboxMessageSent = (clientMessageId) => {
  saveOutbox(loadOutbox().filter((item) => item.clientMessageId !== clientMessageId));
};

export const markOutboxMessageFailed = (clientMessageId, errorMessage = 'Delivery failed') => {
  saveOutbox(
    loadOutbox().map((item) =>
      item.clientMessageId === clientMessageId
        ? {
            ...item,
            status: 'failed',
            retryCount: (item.retryCount || 0) + 1,
            errorMessage,
            updatedAt: new Date().toISOString(),
          }
        : item
    )
  );
};

export const buildMessagePayload = ({ chatId, content, messageType = 'text', media = null, replyTo = null }) => ({
  chatId,
  content: String(content || '').trim(),
  messageType,
  media,
  replyTo,
  clientMessageId: createClientMessageId(),
});
