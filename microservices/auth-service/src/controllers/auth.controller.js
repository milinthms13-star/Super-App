const authService = require('../services/auth.service');
const logger = require('../utils/logger');

exports.register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

exports.loginWithMpin = async (req, res) => {
  try {
    const { email, mpin } = req.body;
    const result = await authService.loginWithMpin(email, mpin);
    res.json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(401).json({
      success: false,
      error: error.message,
    });
  }
};

exports.setMpin = async (req, res) => {
  try {
    const { mpin } = req.body;
    const result = await authService.setMpin(req.user.userId, mpin);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error(`Set MPIN error: ${error.message}`);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const result = await authService.logout(token);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Token is valid',
      data: { user: req.user },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message,
    });
  }
};
