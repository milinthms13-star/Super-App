const auth = require('./auth');

module.exports = auth;
module.exports.authenticate = auth.authenticate || auth;
module.exports.authenticateToken = auth.authenticateToken || auth;
module.exports.authMiddleware = auth.authMiddleware || auth;
module.exports.getJwtSecret = auth.getJwtSecret;
