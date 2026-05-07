const collections = {
  messages: [],
  chats: [],
  templates: [],
  filters: [],
  voiceMessages: [],
  disappearingMessages: [],
};

const counters = {
  messages: 1,
  chats: 1,
  templates: 1,
  filters: 1,
  voiceMessages: 1,
  disappearingMessages: 1,
};

function clone(value) {
  return value === undefined ? value : structuredClone(value);
}

function normalizeId(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value.toString === 'function') {
    return value.toString();
  }

  return String(value);
}

function idsEqual(left, right) {
  return normalizeId(left) === normalizeId(right);
}

function nextId(collectionName) {
  const value = `${collectionName}-${counters[collectionName]++}`;
  return value;
}

function stripFunctions(value) {
  if (Array.isArray(value)) {
    return value.map(stripFunctions);
  }

  if (value instanceof Date) {
    return new Date(value);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const result = {};
  Object.keys(value).forEach((key) => {
    if (typeof value[key] !== 'function') {
      result[key] = stripFunctions(value[key]);
    }
  });
  return result;
}

function getCollection(collectionName) {
  return collections[collectionName];
}

function getValuesByPath(value, pathParts) {
  if (pathParts.length === 0) {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => getValuesByPath(item, pathParts));
  }

  if (value === null || value === undefined) {
    return [undefined];
  }

  const [head, ...rest] = pathParts;
  return getValuesByPath(value[head], rest);
}

function compareValue(value, condition) {
  if (
    condition &&
    typeof condition === 'object' &&
    !Array.isArray(condition) &&
    !(condition instanceof Date)
  ) {
    if (Object.prototype.hasOwnProperty.call(condition, '$in')) {
      return condition.$in.some((candidate) => idsEqual(value, candidate) || value === candidate);
    }

    if (Object.prototype.hasOwnProperty.call(condition, '$ne')) {
      return !idsEqual(value, condition.$ne) && value !== condition.$ne;
    }

    if (Object.prototype.hasOwnProperty.call(condition, '$exists')) {
      const exists = value !== undefined;
      return condition.$exists ? exists : !exists;
    }

    if (Object.prototype.hasOwnProperty.call(condition, '$gte') && value < condition.$gte) {
      return false;
    }

    if (Object.prototype.hasOwnProperty.call(condition, '$lte') && value > condition.$lte) {
      return false;
    }

    if (Object.prototype.hasOwnProperty.call(condition, '$gt') && value <= condition.$gt) {
      return false;
    }

    if (Object.prototype.hasOwnProperty.call(condition, '$lt') && value >= condition.$lt) {
      return false;
    }

    return true;
  }

  return idsEqual(value, condition) || value === condition;
}

function matchesQuery(document, query = {}) {
  return Object.entries(query).every(([key, value]) => {
    if (key === '$or') {
      return value.some((subQuery) => matchesQuery(document, subQuery));
    }

    if (key === '$text') {
      const searchTerm = String(value.$search || '').toLowerCase();
      const content = String(document.content || '').toLowerCase();
      return searchTerm.length === 0 || content.includes(searchTerm);
    }

    const pathValues = getValuesByPath(document, key.split('.'));
    return pathValues.some((pathValue) => compareValue(pathValue, value));
  });
}

function sortDocuments(documents, sortSpec = {}) {
  const entries = Object.entries(sortSpec);
  if (entries.length === 0 || !Array.isArray(documents)) {
    return documents;
  }

  const [field, direction] = entries[0];
  const multiplier = typeof direction === 'number' ? direction : -1;
  const sorted = [...documents];

  sorted.sort((left, right) => {
    const leftValue = getValuesByPath(left, field.split('.'))[0];
    const rightValue = getValuesByPath(right, field.split('.'))[0];

    if (leftValue === rightValue) {
      return 0;
    }

    if (leftValue === undefined) {
      return 1;
    }

    if (rightValue === undefined) {
      return -1;
    }

    return leftValue > rightValue ? multiplier : -multiplier;
  });

  return sorted;
}

function applyUpdate(document, update = {}) {
  if (!document || !update) {
    return;
  }

  const setByPath = (target, path, value) => {
    const parts = path.split('.');
    let current = target;

    for (let index = 0; index < parts.length - 1; index += 1) {
      const key = parts[index];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[parts[parts.length - 1]] = value;
  };

  const getByPath = (target, path) => {
    return path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) {
        return undefined;
      }
      return current[key];
    }, target);
  };

  if (update.$set) {
    Object.entries(update.$set).forEach(([key, value]) => {
      setByPath(document, key, value);
    });
  }

  if (update.$inc) {
    Object.entries(update.$inc).forEach(([key, value]) => {
      setByPath(document, key, (getByPath(document, key) || 0) + value);
    });
  }

  if (update.$push) {
    Object.entries(update.$push).forEach(([key, value]) => {
      let arrayValue = getByPath(document, key);
      if (!Array.isArray(arrayValue)) {
        arrayValue = [];
        setByPath(document, key, arrayValue);
      }
      arrayValue.push(value);
    });
  }

  Object.entries(update).forEach(([key, value]) => {
    if (!key.startsWith('$')) {
      document[key] = value;
    }
  });
}

function createQuery(collectionName, initialData) {
  let current = Array.isArray(initialData) ? [...initialData] : initialData;
  let leanMode = false;

  const resolveValue = () => {
    const value = Array.isArray(current)
      ? current.map((item) => (leanMode ? clone(item) : hydrate(collectionName, item)))
      : leanMode || current === null || current === undefined
        ? clone(current)
        : hydrate(collectionName, current);
    return value;
  };

  const query = {
    sort(sortSpec) {
      if (Array.isArray(current)) {
        current = sortDocuments(current, sortSpec);
      }
      return query;
    },
    limit(limit) {
      if (Array.isArray(current)) {
        current = current.slice(0, Number(limit));
      }
      return query;
    },
    skip(offset) {
      if (Array.isArray(current)) {
        current = current.slice(Number(offset));
      }
      return query;
    },
    populate() {
      return query;
    },
    select() {
      return query;
    },
    lean() {
      leanMode = true;
      return Promise.resolve(resolveValue());
    },
    exec() {
      return Promise.resolve(resolveValue());
    },
    then(onFulfilled, onRejected) {
      return Promise.resolve(resolveValue()).then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return Promise.resolve(resolveValue()).catch(onRejected);
    },
    finally(onFinally) {
      return Promise.resolve(resolveValue()).finally(onFinally);
    },
  };

  return query;
}

function hydrate(collectionName, document) {
  if (!document) {
    return document;
  }

  const hydrated = clone(document);

  hydrated.save = async function save() {
    const collection = getCollection(collectionName);
    const index = collection.findIndex((item) => idsEqual(item._id, hydrated._id));
    const stored = stripFunctions(hydrated);

    if (index === -1) {
      collection.push(stored);
    } else {
      collection[index] = stored;
    }

    return hydrate(collectionName, stored);
  };

  hydrated.populate = async function populate() {
    return hydrated;
  };

  return hydrated;
}

function createModel(collectionName) {
  return class InMemoryModel {
    constructor(data = {}) {
      Object.assign(this, hydrate(collectionName, { _id: data._id || nextId(collectionName), ...data }));
    }

    async save() {
      return hydrate(collectionName, await hydrate(collectionName, this).save());
    }

    static async create(data) {
      const instance = new InMemoryModel(data);
      return instance.save();
    }

    static find(query = {}) {
      const documents = getCollection(collectionName).filter((item) => matchesQuery(item, query));
      return createQuery(collectionName, documents);
    }

    static findById(id) {
      const document = getCollection(collectionName).find((item) => idsEqual(item._id, id)) || null;
      return createQuery(collectionName, document);
    }

    static findOne(query = {}) {
      const document = getCollection(collectionName).find((item) => matchesQuery(item, query)) || null;
      return createQuery(collectionName, document);
    }

    static async countDocuments(query = {}) {
      return getCollection(collectionName).filter((item) => matchesQuery(item, query)).length;
    }

    static async deleteOne(query = {}) {
      const collection = getCollection(collectionName);
      const index = collection.findIndex((item) => matchesQuery(item, query));
      if (index === -1) {
        return { deletedCount: 0 };
      }

      collection.splice(index, 1);
      return { deletedCount: 1 };
    }

    static async updateOne(query = {}, update = {}) {
      const collection = getCollection(collectionName);
      const document = collection.find((item) => matchesQuery(item, query));
      if (!document) {
        return { matchedCount: 0, modifiedCount: 0 };
      }

      applyUpdate(document, update);
      return { matchedCount: 1, modifiedCount: 1 };
    }

    static async updateMany(query = {}, update = {}) {
      const documents = getCollection(collectionName).filter((item) => matchesQuery(item, query));
      documents.forEach((document) => applyUpdate(document, update));
      return {
        matchedCount: documents.length,
        modifiedCount: documents.length,
      };
    }

    static findByIdAndUpdate(id, update = {}) {
      const collection = getCollection(collectionName);
      const document = collection.find((item) => idsEqual(item._id, id)) || null;
      if (document) {
        applyUpdate(document, update);
      }
      return createQuery(collectionName, document);
    }
  };
}

const MessageModel = createModel('messages');
const ChatModel = createModel('chats');
const MessageTemplateModel = createModel('templates');
const MessageFilterModel = createModel('filters');
const VoiceMessageModel = createModel('voiceMessages');
const DisappearingMessageModel = createModel('disappearingMessages');

function seedChat(chat = {}) {
  const defaults = {
    _id: chat._id || nextId('chats'),
    owner: chat.owner || 'test-user-456',
    name: chat.name || 'Test Chat',
    description: chat.description || '',
    participants: chat.participants || [chat.owner || 'test-user-456'],
    settings: chat.settings || {},
    createdAt: chat.createdAt || new Date(),
  };

  collections.chats.push(stripFunctions(defaults));
  return defaults;
}

function seedMessage(message = {}) {
  const defaults = {
    _id: message._id || nextId('messages'),
    chatId: message.chatId || 'test-chat-123',
    senderId: message.senderId || 'test-user-456',
    content: message.content || 'Test message',
    messageType: message.messageType || message.type || 'text',
    type: message.type || message.messageType || 'text',
    attachments: message.attachments || [],
    media: message.media || null,
    metadata: message.metadata || {},
    mentions: message.mentions || [],
    readBy: message.readBy || [],
    readCount: message.readCount || 0,
    replyCount: message.replyCount || 0,
    reactionCount: message.reactionCount || 0,
    forwardCount: message.forwardCount || 0,
    createdAt: message.createdAt || new Date(),
    isDeleted: message.isDeleted || false,
    isPinned: message.isPinned || false,
    pinnedAt: message.pinnedAt || null,
    pinnedBy: message.pinnedBy || null,
    pinnedReason: message.pinnedReason || null,
    parentMessageId: message.parentMessageId,
    lastReplyAt: message.lastReplyAt || null,
    forwardedFrom: message.forwardedFrom || null,
    translations: message.translations || {},
    encryption: message.encryption || null,
  };

  collections.messages.push(stripFunctions(defaults));
  return defaults;
}

function resetMessagingStore() {
  Object.keys(collections).forEach((key) => {
    collections[key].length = 0;
  });

  Object.keys(counters).forEach((key) => {
    counters[key] = 1;
  });
}

module.exports = {
  ChatModel,
  DisappearingMessageModel,
  MessageFilterModel,
  MessageModel,
  MessageTemplateModel,
  VoiceMessageModel,
  idsEqual,
  resetMessagingStore,
  seedChat,
  seedMessage,
};
