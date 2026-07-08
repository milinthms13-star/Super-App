const express = require('express');
const router = express.Router();
const qrCodeService = require('../services/qrCodeService');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/qrcode/miniapp
 * @desc    Generate QR code for mini app
 * @access  Private
 */
router.post('/miniapp', authenticate, async (req, res) => {
  try {
    const { miniAppId, miniAppUrl, options } = req.body;

    if (!miniAppId || !miniAppUrl) {
      return res.status(400).json({
        success: false,
        message: 'Mini app ID and URL are required'
      });
    }

    const qrData = await qrCodeService.generateMiniAppQRCode(
      miniAppId,
      miniAppUrl,
      options || {}
    );

    res.json({
      success: true,
      message: 'QR code generated successfully',
      data: qrData
    });
  } catch (error) {
    console.error('Error generating mini app QR code:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate QR code'
    });
  }
});

/**
 * @route   POST /api/qrcode/contact
 * @desc    Generate QR code for business contact (vCard)
 * @access  Private
 */
router.post('/contact', authenticate, async (req, res) => {
  try {
    const { businessData, options } = req.body;

    if (!businessData || !businessData.name) {
      return res.status(400).json({
        success: false,
        message: 'Business name is required'
      });
    }

    const qrData = await qrCodeService.generateBusinessContactQRCode(
      businessData,
      options || {}
    );

    res.json({
      success: true,
      message: 'Contact QR code generated successfully',
      data: qrData
    });
  } catch (error) {
    console.error('Error generating contact QR code:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate contact QR code'
    });
  }
});

/**
 * @route   POST /api/qrcode/payment
 * @desc    Generate QR code for payment (UPI or payment link)
 * @access  Private
 */
router.post('/payment', authenticate, async (req, res) => {
  try {
    const { paymentData, options } = req.body;

    if (!paymentData || !paymentData.type) {
      return res.status(400).json({
        success: false,
        message: 'Payment type is required (upi or url)'
      });
    }

    if (paymentData.type === 'upi' && !paymentData.upiId) {
      return res.status(400).json({
        success: false,
        message: 'UPI ID is required for UPI payment QR code'
      });
    }

    if (paymentData.type === 'url' && !paymentData.paymentUrl) {
      return res.status(400).json({
        success: false,
        message: 'Payment URL is required for URL-based payment QR code'
      });
    }

    const qrData = await qrCodeService.generatePaymentQRCode(
      paymentData,
      options || {}
    );

    res.json({
      success: true,
      message: 'Payment QR code generated successfully',
      data: qrData
    });
  } catch (error) {
    console.error('Error generating payment QR code:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate payment QR code'
    });
  }
});

/**
 * @route   POST /api/qrcode/generate
 * @desc    Generate generic QR code from text/URL
 * @access  Private
 */
router.post('/generate', authenticate, async (req, res) => {
  try {
    const { content, options } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content is required'
      });
    }

    const qrData = await qrCodeService.generateQRCode(content, options || {});

    res.json({
      success: true,
      message: 'QR code generated successfully',
      data: qrData
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate QR code'
    });
  }
});

/**
 * @route   POST /api/qrcode/bulk
 * @desc    Generate multiple QR codes in bulk
 * @access  Private
 */
router.post('/bulk', authenticate, async (req, res) => {
  try {
    const { items, type, options } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }

    if (items.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 QR codes can be generated in a single request'
      });
    }

    const results = await qrCodeService.generateBulkQRCodes(
      items,
      type || 'url',
      options || {}
    );

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Generated ${successCount} QR codes successfully, ${failCount} failed`,
      data: {
        results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failCount
        }
      }
    });
  } catch (error) {
    console.error('Error generating bulk QR codes:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate bulk QR codes'
    });
  }
});

/**
 * @route   DELETE /api/qrcode/:filePath
 * @desc    Delete QR code file
 * @access  Private
 */
router.delete('/:filePath', authenticate, async (req, res) => {
  try {
    const { filePath } = req.params;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'File path is required'
      });
    }

    const result = await qrCodeService.deleteQRCode(`uploads/qrcodes/${filePath}`);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting QR code:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete QR code'
    });
  }
});

/**
 * @route   GET /api/qrcode/preview
 * @desc    Generate QR code preview (returns data URL without saving)
 * @access  Private
 */
router.get('/preview', authenticate, async (req, res) => {
  try {
    const { content } = req.query;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content query parameter is required'
      });
    }

    const qrData = await qrCodeService.generateQRCode(content, {
      saveToFile: false
    });

    res.json({
      success: true,
      message: 'QR code preview generated',
      data: {
        dataURL: qrData.dataURL
      }
    });
  } catch (error) {
    console.error('Error generating QR code preview:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate QR code preview'
    });
  }
});

module.exports = router;
