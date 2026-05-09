const websocket = require('./websocket');

const getSocketInstance = () => {
  try {
    return websocket.io?.() || { emit: () => {} };
  } catch (_error) {
    return { emit: () => {} };
  }
};

module.exports = getSocketInstance();
