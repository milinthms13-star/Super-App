const validatePhoneNumber = (req, res, next) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required',
    });
  }

  // Remove common formatting characters
  const cleanPhone = phone.replace(/[\s\-().+]/g, '');

  // Check length (10-15 digits is standard)
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number length',
    });
  }

  // Check if all characters are digits
  if (!/^\d+$/.test(cleanPhone)) {
    return res.status(400).json({
      success: false,
      message: 'Phone number should contain only digits',
    });
  }

  // Attach cleaned phone to request
  req.body.phone = cleanPhone;

  next();
};

const validateOTP = (req, res, next) => {
  const { otp, contactId } = req.body;

  if (!otp) {
    return res.status(400).json({
      success: false,
      message: 'OTP is required',
    });
  }

  if (!contactId) {
    return res.status(400).json({
      success: false,
      message: 'Contact ID is required',
    });
  }

  // OTP should be 6 digits
  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      success: false,
      message: 'OTP must be a 6-digit number',
    });
  }

  next();
};

const validateSOSAlert = (req, res, next) => {
  const { reason, latitude, longitude, channels } = req.body;

  if (!reason) {
    return res.status(400).json({
      success: false,
      message: 'Alert reason is required',
    });
  }

  const validReasons = ['Medical', 'Unsafe situation', 'Travel check-in', 'Vehicle breakdown', 'Other'];
  if (!validReasons.includes(reason)) {
    return res.status(400).json({
      success: false,
      message: `Reason must be one of: ${validReasons.join(', ')}`,
    });
  }

  if (latitude === undefined || latitude === null) {
    return res.status(400).json({
      success: false,
      message: 'Latitude is required',
    });
  }

  if (longitude === undefined || longitude === null) {
    return res.status(400).json({
      success: false,
      message: 'Longitude is required',
    });
  }

  // Validate lat/lng ranges
  if (latitude < -90 || latitude > 90) {
    return res.status(400).json({
      success: false,
      message: 'Latitude must be between -90 and 90',
    });
  }

  if (longitude < -180 || longitude > 180) {
    return res.status(400).json({
      success: false,
      message: 'Longitude must be between -180 and 180',
    });
  }

  if (!channels || !Array.isArray(channels) || channels.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one notification channel is required',
    });
  }

  const validChannels = ['SMS', 'WhatsApp', 'Call'];
  const invalidChannels = channels.filter((ch) => !validChannels.includes(ch));
  if (invalidChannels.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Invalid channels: ${invalidChannels.join(', ')}. Valid: ${validChannels.join(', ')}`,
    });
  }

  next();
};

module.exports = {
  validatePhoneNumber,
  validateOTP,
  validateSOSAlert,
};
