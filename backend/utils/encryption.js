// backend/utils/encryption.js
const nacl = require('tweetnacl');
const utils = require('tweetnacl-util');
const crypto = require('crypto');

/**
 * Generate key pair for end-to-end encryption
 * @returns {object} {publicKey, privateKey, publicKeyBase64, privateKeyBase64}
 */
const generateKeyPair = () => {
  const keyPair = nacl.box.keyPair();

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.secretKey,
    publicKeyBase64: utils.encodeBase64(keyPair.publicKey),
    privateKeyBase64: utils.encodeBase64(keyPair.secretKey),
  };
};

/**
 * Encrypt a message
 * @param {string} message - Message to encrypt
 * @param {Uint8Array|string} recipientPublicKey - Recipient's public key
 * @param {Uint8Array|string} senderPrivateKey - Sender's private key
 * @returns {object} {encryptedMessage, nonce, encryptedMessageBase64, nonceBase64}
 */
const encryptMessage = (message, recipientPublicKey, senderPrivateKey) => {
  try {
    // Convert from base64 if necessary
    const publicKey =
      typeof recipientPublicKey === 'string'
        ? utils.decodeBase64(recipientPublicKey)
        : recipientPublicKey;
    const privateKey =
      typeof senderPrivateKey === 'string'
        ? utils.decodeBase64(senderPrivateKey)
        : senderPrivateKey;

    // Generate nonce
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    // Encrypt message
    const messageUint8 = utils.decodeUTF8(message);
    const encrypted = nacl.box(messageUint8, nonce, publicKey, privateKey);

    return {
      encryptedMessage: encrypted,
      nonce: nonce,
      encryptedMessageBase64: utils.encodeBase64(encrypted),
      nonceBase64: utils.encodeBase64(nonce),
      algorithm: 'curve25519',
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
};

/**
 * Decrypt a message
 * @param {string|Uint8Array} encryptedMessage - Encrypted message
 * @param {string|Uint8Array} nonce - Nonce used for encryption
 * @param {string|Uint8Array} senderPublicKey - Sender's public key
 * @param {string|Uint8Array} recipientPrivateKey - Recipient's private key
 * @returns {string} Decrypted message
 */
const decryptMessage = (encryptedMessage, nonce, senderPublicKey, recipientPrivateKey) => {
  try {
    // Convert from base64 if necessary
    const encrypted =
      typeof encryptedMessage === 'string'
        ? utils.decodeBase64(encryptedMessage)
        : encryptedMessage;
    const nonceUint8 = typeof nonce === 'string' ? utils.decodeBase64(nonce) : nonce;
    const publicKey =
      typeof senderPublicKey === 'string' ? utils.decodeBase64(senderPublicKey) : senderPublicKey;
    const privateKey =
      typeof recipientPrivateKey === 'string'
        ? utils.decodeBase64(recipientPrivateKey)
        : recipientPrivateKey;

    // Decrypt message
    const decrypted = nacl.box.open(encrypted, nonceUint8, publicKey, privateKey);

    if (!decrypted) {
      throw new Error('Decryption failed: Invalid key or corrupted data');
    }

    return utils.encodeUTF8(decrypted);
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

/**
 * Hash a public key for fingerprint verification
 * @param {string|Uint8Array} publicKey - Public key
 * @returns {string} SHA-256 hash (hex)
 */
const generateKeyFingerprint = (publicKey) => {
  const keyData =
    typeof publicKey === 'string' ? Buffer.from(publicKey, 'base64') : Buffer.from(publicKey);
  return crypto.createHash('sha256').update(keyData).digest('hex');
};

/**
 * Verify message signature
 * @param {string|Uint8Array} message - Original message
 * @param {string|Uint8Array} signature - Signature
 * @param {string|Uint8Array} publicKey - Signer's public key
 * @returns {boolean} True if signature is valid
 */
const verifySignature = (message, signature, publicKey) => {
  try {
    const messageUint8 =
      typeof message === 'string' ? utils.decodeUTF8(message) : new Uint8Array(message);
    const sig = typeof signature === 'string' ? utils.decodeBase64(signature) : signature;
    const pubKey = typeof publicKey === 'string' ? utils.decodeBase64(publicKey) : publicKey;

    // For Ed25519 signatures (use signing key pair)
    const signingKeyPair = nacl.sign.keyPair.fromSecretKey(pubKey);
    return nacl.sign.detached.verify(messageUint8, sig, signingKeyPair.publicKey);
  } catch (error) {
    return false;
  }
};

/**
 * Sign a message with private key
 * @param {string|Uint8Array} message - Message to sign
 * @param {string|Uint8Array} privateKey - Signing private key
 * @returns {object} {signature, signatureBase64}
 */
const signMessage = (message, privateKey) => {
  try {
    const messageUint8 =
      typeof message === 'string' ? utils.decodeUTF8(message) : new Uint8Array(message);
    const privKey =
      typeof privateKey === 'string' ? utils.decodeBase64(privateKey) : privateKey;

    const signature = nacl.sign.detached(messageUint8, privKey);

    return {
      signature,
      signatureBase64: utils.encodeBase64(signature),
    };
  } catch (error) {
    throw new Error(`Signing failed: ${error.message}`);
  }
};

/**
 * Generate a random encryption key (for symmetric encryption fallback)
 * @returns {string} Base64 encoded random key
 */
const generateSymmetricKey = () => {
  const key = nacl.randomBytes(nacl.secretbox.keyLength);
  return utils.encodeBase64(key);
};

/**
 * Encrypt with symmetric key (for file encryption)
 * @param {Buffer} data - Data to encrypt
 * @param {string} key - Base64 encoded symmetric key
 * @returns {object} {encryptedData, nonce}
 */
const encryptSymmetric = (data, key) => {
  const keyUint8 = utils.decodeBase64(key);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);

  const encrypted = nacl.secretbox(new Uint8Array(data), nonce, keyUint8);

  return {
    encryptedData: Buffer.from(encrypted),
    nonce: utils.encodeBase64(nonce),
  };
};

/**
 * Decrypt with symmetric key
 * @param {Buffer} encryptedData - Encrypted data
 * @param {string} nonce - Base64 encoded nonce
 * @param {string} key - Base64 encoded symmetric key
 * @returns {Buffer} Decrypted data
 */
const decryptSymmetric = (encryptedData, nonce, key) => {
  const keyUint8 = utils.decodeBase64(key);
  const nonceUint8 = utils.decodeBase64(nonce);

  const decrypted = nacl.secretbox.open(new Uint8Array(encryptedData), nonceUint8, keyUint8);

  if (!decrypted) {
    throw new Error('Symmetric decryption failed');
  }

  return Buffer.from(decrypted);
};

module.exports = {
  generateKeyPair,
  encryptMessage,
  decryptMessage,
  generateKeyFingerprint,
  verifySignature,
  signMessage,
  generateSymmetricKey,
  encryptSymmetric,
  decryptSymmetric,
};
