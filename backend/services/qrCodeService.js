const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;

class QRCodeService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../uploads/qrcodes');
    this.ensureUploadDir();
  }

  async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating QR code upload directory:', error);
    }
  }

  /**
   * Generate QR code for mini app
   * @param {Object} options - QR code generation options
   * @returns {Promise<Object>} QR code data (buffer, dataURL, and file path)
   */
  async generateMiniAppQRCode(miniAppId, miniAppUrl, options = {}) {
    try {
      const {
        format = 'png',
        width = 300,
        margin = 4,
        color = {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel = 'M', // L, M, Q, H
        saveToFile = true
      } = options;

      const qrOptions = {
        errorCorrectionLevel,
        type: 'image/png',
        quality: 0.92,
        margin,
        color,
        width
      };

      // Generate QR code as buffer
      const qrBuffer = await QRCode.toBuffer(miniAppUrl, qrOptions);

      // Generate QR code as data URL
      const qrDataURL = await QRCode.toDataURL(miniAppUrl, qrOptions);

      let filePath = null;
      if (saveToFile) {
        const filename = `miniapp-${miniAppId}-${uuidv4()}.${format}`;
        filePath = path.join(this.uploadsDir, filename);
        await fs.writeFile(filePath, qrBuffer);
      }

      return {
        buffer: qrBuffer,
        dataURL: qrDataURL,
        filePath: filePath ? path.relative(path.join(__dirname, '..'), filePath) : null,
        url: filePath ? `/uploads/qrcodes/${path.basename(filePath)}` : null,
        miniAppId,
        miniAppUrl
      };
    } catch (error) {
      console.error('Error generating mini app QR code:', error);
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Generate QR code for business contact info (vCard)
   * @param {Object} businessData - Business contact information
   * @returns {Promise<Object>} QR code data
   */
  async generateBusinessContactQRCode(businessData, options = {}) {
    try {
      const {
        name,
        phone,
        email,
        website,
        address,
        businessId
      } = businessData;

      // Create vCard format
      const vCard = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${name}`,
        `ORG:${name}`,
        phone ? `TEL:${phone}` : null,
        email ? `EMAIL:${email}` : null,
        website ? `URL:${website}` : null,
        address ? `ADR:;;${address};;;` : null,
        'END:VCARD'
      ].filter(Boolean).join('\n');

      const qrOptions = {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.92,
        margin: 4,
        width: options.width || 300,
        color: options.color || {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };

      const qrBuffer = await QRCode.toBuffer(vCard, qrOptions);
      const qrDataURL = await QRCode.toDataURL(vCard, qrOptions);

      let filePath = null;
      if (options.saveToFile !== false) {
        const filename = `business-contact-${businessId}-${uuidv4()}.png`;
        filePath = path.join(this.uploadsDir, filename);
        await fs.writeFile(filePath, qrBuffer);
      }

      return {
        buffer: qrBuffer,
        dataURL: qrDataURL,
        filePath: filePath ? path.relative(path.join(__dirname, '..'), filePath) : null,
        url: filePath ? `/uploads/qrcodes/${path.basename(filePath)}` : null,
        businessId,
        vCard
      };
    } catch (error) {
      console.error('Error generating business contact QR code:', error);
      throw new Error(`Failed to generate contact QR code: ${error.message}`);
    }
  }

  /**
   * Generate QR code for payment (UPI, payment link)
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} QR code data
   */
  async generatePaymentQRCode(paymentData, options = {}) {
    try {
      const {
        type, // 'upi' or 'url'
        upiId,
        payeeName,
        amount,
        currency = 'INR',
        note,
        paymentUrl,
        orderId
      } = paymentData;

      let qrContent = '';

      if (type === 'upi' && upiId) {
        // UPI payment format
        qrContent = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}`;
        if (amount) qrContent += `&am=${amount}`;
        if (currency) qrContent += `&cu=${currency}`;
        if (note) qrContent += `&tn=${encodeURIComponent(note)}`;
      } else if (type === 'url' && paymentUrl) {
        qrContent = paymentUrl;
      } else {
        throw new Error('Invalid payment data: must provide either UPI details or payment URL');
      }

      const qrOptions = {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.92,
        margin: 4,
        width: options.width || 300,
        color: options.color || {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };

      const qrBuffer = await QRCode.toBuffer(qrContent, qrOptions);
      const qrDataURL = await QRCode.toDataURL(qrContent, qrOptions);

      let filePath = null;
      if (options.saveToFile !== false) {
        const filename = `payment-${orderId || uuidv4()}.png`;
        filePath = path.join(this.uploadsDir, filename);
        await fs.writeFile(filePath, qrBuffer);
      }

      return {
        buffer: qrBuffer,
        dataURL: qrDataURL,
        filePath: filePath ? path.relative(path.join(__dirname, '..'), filePath) : null,
        url: filePath ? `/uploads/qrcodes/${path.basename(filePath)}` : null,
        paymentData,
        qrContent
      };
    } catch (error) {
      console.error('Error generating payment QR code:', error);
      throw new Error(`Failed to generate payment QR code: ${error.message}`);
    }
  }

  /**
   * Generate generic QR code from any text/URL
   * @param {string} content - Content to encode
   * @returns {Promise<Object>} QR code data
   */
  async generateQRCode(content, options = {}) {
    try {
      const qrOptions = {
        errorCorrectionLevel: options.errorCorrectionLevel || 'M',
        type: 'image/png',
        quality: 0.92,
        margin: options.margin || 4,
        width: options.width || 300,
        color: options.color || {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };

      const qrBuffer = await QRCode.toBuffer(content, qrOptions);
      const qrDataURL = await QRCode.toDataURL(content, qrOptions);

      let filePath = null;
      if (options.saveToFile) {
        const filename = `qr-${uuidv4()}.png`;
        filePath = path.join(this.uploadsDir, filename);
        await fs.writeFile(filePath, qrBuffer);
      }

      return {
        buffer: qrBuffer,
        dataURL: qrDataURL,
        filePath: filePath ? path.relative(path.join(__dirname, '..'), filePath) : null,
        url: filePath ? `/uploads/qrcodes/${path.basename(filePath)}` : null,
        content
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Generate QR code with logo overlay
   * @param {string} content - Content to encode
   * @param {string} logoPath - Path to logo image
   * @returns {Promise<Object>} QR code data with logo
   */
  async generateQRCodeWithLogo(content, logoPath, options = {}) {
    try {
      // This would require additional image processing with sharp
      // For now, returning basic QR code
      // TODO: Implement logo overlay using sharp
      return await this.generateQRCode(content, options);
    } catch (error) {
      console.error('Error generating QR code with logo:', error);
      throw new Error(`Failed to generate QR code with logo: ${error.message}`);
    }
  }

  /**
   * Delete QR code file
   * @param {string} filePath - Relative file path
   */
  async deleteQRCode(filePath) {
    try {
      const fullPath = path.join(__dirname, '..', filePath);
      await fs.unlink(fullPath);
      return { success: true, message: 'QR code deleted successfully' };
    } catch (error) {
      console.error('Error deleting QR code:', error);
      throw new Error(`Failed to delete QR code: ${error.message}`);
    }
  }

  /**
   * Generate bulk QR codes
   * @param {Array} items - Array of items to generate QR codes for
   * @returns {Promise<Array>} Array of QR code results
   */
  async generateBulkQRCodes(items, type = 'url', options = {}) {
    try {
      const results = [];
      
      for (const item of items) {
        try {
          let qrData;
          
          switch (type) {
            case 'miniapp':
              qrData = await this.generateMiniAppQRCode(item.id, item.url, options);
              break;
            case 'contact':
              qrData = await this.generateBusinessContactQRCode(item, options);
              break;
            case 'payment':
              qrData = await this.generatePaymentQRCode(item, options);
              break;
            default:
              qrData = await this.generateQRCode(item.content || item.url, options);
          }
          
          results.push({
            success: true,
            item,
            qrData
          });
        } catch (error) {
          results.push({
            success: false,
            item,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error generating bulk QR codes:', error);
      throw new Error(`Failed to generate bulk QR codes: ${error.message}`);
    }
  }
}

module.exports = new QRCodeService();
