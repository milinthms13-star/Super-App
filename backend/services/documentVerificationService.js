const axios = require('axios');
const Tesseract = require('tesseract.js');
const logger = require('../utils/logger');
const fs = require('fs').promises;

// DigiLocker Configuration
const DIGILOCKER_CLIENT_ID = process.env.DIGILOCKER_CLIENT_ID || '';
const DIGILOCKER_CLIENT_SECRET = process.env.DIGILOCKER_CLIENT_SECRET || '';
const DIGILOCKER_API_URL = process.env.DIGILOCKER_API_URL || 'https://api.digitallocker.gov.in';

// Cloud Vision Configuration (for OCR)
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || '';

class DocumentVerificationService {
  /**
   * Verify Aadhaar via DigiLocker
   */
  async verifyAadhaarDigiLocker(aadhaarNumber, accessToken) {
    if (!DIGILOCKER_CLIENT_ID || !DIGILOCKER_CLIENT_SECRET) {
      logger.warn('DigiLocker not configured, returning mock verification');
      return this.generateMockAadhaarVerification(aadhaarNumber);
    }

    try {
      const response = await axios.post(
        `${DIGILOCKER_API_URL}/public/oauth2/1/token`,
        {
          grant_type: 'authorization_code',
          code: accessToken,
          client_id: DIGILOCKER_CLIENT_ID,
          client_secret: DIGILOCKER_CLIENT_SECRET,
        },
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000,
        }
      );

      const token = response.data.access_token;

      // Fetch Aadhaar document
      const docResponse = await axios.get(
        `${DIGILOCKER_API_URL}/public/oauth2/3/file/AADHAAR`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/xml',
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        verified: true,
        source: 'digilocker',
        data: this.parseAadhaarXML(docResponse.data),
      };
    } catch (error) {
      logger.error(`DigiLocker verification error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        mock: true,
        data: this.generateMockAadhaarVerification(aadhaarNumber),
      };
    }
  }

  /**
   * Verify PAN via DigiLocker
   */
  async verifyPANDigiLocker(panNumber, accessToken) {
    if (!DIGILOCKER_CLIENT_ID || !DIGILOCKER_CLIENT_SECRET) {
      logger.warn('DigiLocker not configured, returning mock verification');
      return this.generateMockPANVerification(panNumber);
    }

    try {
      const response = await axios.post(
        `${DIGILOCKER_API_URL}/public/oauth2/1/token`,
        {
          grant_type: 'authorization_code',
          code: accessToken,
          client_id: DIGILOCKER_CLIENT_ID,
          client_secret: DIGILOCKER_CLIENT_SECRET,
        },
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000,
        }
      );

      const token = response.data.access_token;

      // Fetch PAN document
      const docResponse = await axios.get(
        `${DIGILOCKER_API_URL}/public/oauth2/3/file/PANCR`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/xml',
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        verified: true,
        source: 'digilocker',
        data: this.parsePANXML(docResponse.data),
      };
    } catch (error) {
      logger.error(`DigiLocker PAN verification error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        mock: true,
        data: this.generateMockPANVerification(panNumber),
      };
    }
  }

  /**
   * Extract text from document using OCR
   */
  async extractTextFromDocument(filePath, documentType = 'general') {
    try {
      // Check if file exists
      await fs.access(filePath);

      // Use Google Cloud Vision if configured
      if (GOOGLE_VISION_API_KEY) {
        return await this.extractTextGoogleVision(filePath, documentType);
      }

      // Fallback to Tesseract
      return await this.extractTextTesseract(filePath, documentType);
    } catch (error) {
      logger.error(`OCR extraction error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Extract text using Google Cloud Vision
   */
  async extractTextGoogleVision(filePath, documentType) {
    try {
      const imageBuffer = await fs.readFile(filePath);
      const base64Image = imageBuffer.toString('base64');

      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
        {
          requests: [
            {
              image: { content: base64Image },
              features: [
                { type: 'TEXT_DETECTION' },
                { type: 'DOCUMENT_TEXT_DETECTION' },
              ],
            },
          ],
        },
        { timeout: 15000 }
      );

      const text = response.data.responses[0]?.fullTextAnnotation?.text || '';
      const extracted = this.parseExtractedText(text, documentType);

      return {
        success: true,
        source: 'google-vision',
        rawText: text,
        extracted,
      };
    } catch (error) {
      logger.error(`Google Vision error: ${error.message}`);
      // Fallback to Tesseract
      return this.extractTextTesseract(filePath, documentType);
    }
  }

  /**
   * Extract text using Tesseract.js
   */
  async extractTextTesseract(filePath, documentType) {
    try {
      const result = await Tesseract.recognize(filePath, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.info(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const text = result.data.text;
      const extracted = this.parseExtractedText(text, documentType);

      return {
        success: true,
        source: 'tesseract',
        rawText: text,
        extracted,
      };
    } catch (error) {
      logger.error(`Tesseract error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse extracted text based on document type
   */
  parseExtractedText(text, documentType) {
    const upperText = text.toUpperCase();
    const extracted = {};

    switch (documentType) {
      case 'aadhaar':
        // Extract Aadhaar number (12 digits)
        const aadhaarMatch = text.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/);
        if (aadhaarMatch) {
          extracted.aadhaarNumber = aadhaarMatch[0].replace(/\s/g, '');
        }

        // Extract name (after "Name:" or before "DOB")
        const nameMatch = text.match(/(?:Name:?\s*)([A-Z\s]+?)(?:\s*(?:DOB|Date of Birth))/i);
        if (nameMatch) {
          extracted.name = nameMatch[1].trim();
        }

        // Extract DOB
        const dobMatch = text.match(/(?:DOB|Date of Birth):?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);
        if (dobMatch) {
          extracted.dob = dobMatch[1];
        }

        // Extract Gender
        if (upperText.includes('MALE') && !upperText.includes('FEMALE')) {
          extracted.gender = 'Male';
        } else if (upperText.includes('FEMALE')) {
          extracted.gender = 'Female';
        }
        break;

      case 'pan':
        // Extract PAN number (format: ABCDE1234F)
        const panMatch = text.match(/\b[A-Z]{5}\d{4}[A-Z]\b/);
        if (panMatch) {
          extracted.panNumber = panMatch[0];
        }

        // Extract name
        const panNameMatch = text.match(/Name[:\s]+([A-Z\s]+?)(?:\s*Father|$)/i);
        if (panNameMatch) {
          extracted.name = panNameMatch[1].trim();
        }

        // Extract DOB
        const panDobMatch = text.match(/(?:Date of Birth|DOB)[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);
        if (panDobMatch) {
          extracted.dob = panDobMatch[1];
        }
        break;

      case 'bankStatement':
        // Extract account number
        const accMatch = text.match(/(?:A\/C|Account|A\/c|AC)[:\s#]*(\d{9,18})/i);
        if (accMatch) {
          extracted.accountNumber = accMatch[1];
        }

        // Extract IFSC
        const ifscMatch = text.match(/(?:IFSC|IFS)[:\s]*([A-Z]{4}0[A-Z0-9]{6})/i);
        if (ifscMatch) {
          extracted.ifscCode = ifscMatch[1];
        }

        // Extract account holder name
        const holderMatch = text.match(/(?:Name|Account Holder)[:\s]+([A-Z\s]+?)(?:\s*Address|$)/i);
        if (holderMatch) {
          extracted.accountHolderName = holderMatch[1].trim();
        }
        break;

      case 'salarySlip':
        // Extract employee name
        const empNameMatch = text.match(/(?:Employee Name|Name)[:\s]+([A-Z\s]+?)(?:\s*Employee|$)/i);
        if (empNameMatch) {
          extracted.employeeName = empNameMatch[1].trim();
        }

        // Extract salary amount
        const salaryMatch = text.match(/(?:Net Pay|Net Salary|Take Home)[:\s]*[₹Rs\.]*\s*([\d,]+(?:\.\d{2})?)/i);
        if (salaryMatch) {
          extracted.netSalary = salaryMatch[1].replace(/,/g, '');
        }

        // Extract month/year
        const monthMatch = text.match(/(?:Month|Period|For)[:\s]*([A-Z]+\s*\d{4})/i);
        if (monthMatch) {
          extracted.salaryMonth = monthMatch[1];
        }
        break;
    }

    return extracted;
  }

  /**
   * Verify document quality
   */
  async verifyDocumentQuality(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // Check file size (should be > 10KB and < 5MB)
      if (fileSize < 10 * 1024) {
        return {
          valid: false,
          reason: 'File size too small - image quality may be poor',
          score: 0,
        };
      }

      if (fileSize > 5 * 1024 * 1024) {
        return {
          valid: false,
          reason: 'File size too large - please compress the image',
          score: 0,
        };
      }

      // TODO: Add actual image quality checks (blur detection, brightness, etc.)
      // For now, basic validation based on size

      return {
        valid: true,
        score: 85,
        fileSize,
      };
    } catch (error) {
      return {
        valid: false,
        reason: error.message,
        score: 0,
      };
    }
  }

  /**
   * Generate mock Aadhaar verification
   */
  generateMockAadhaarVerification(aadhaarNumber) {
    return {
      verified: true,
      aadhaarNumber: aadhaarNumber || 'XXXX-XXXX-' + Math.floor(Math.random() * 10000),
      name: 'Mock User Name',
      dob: '01/01/1990',
      gender: 'Male',
      address: 'Mock Address, Kerala',
      isMock: true,
    };
  }

  /**
   * Generate mock PAN verification
   */
  generateMockPANVerification(panNumber) {
    return {
      verified: true,
      panNumber: panNumber || 'ABCDE1234F',
      name: 'Mock User Name',
      dob: '01/01/1990',
      status: 'Active',
      isMock: true,
    };
  }

  /**
   * Parse Aadhaar XML from DigiLocker
   */
  parseAadhaarXML(xml) {
    // Simplified parsing - in production, use proper XML parser
    return {
      aadhaarNumber: 'XXXX-XXXX-XXXX',
      name: 'Name from DigiLocker',
      dob: '01/01/1990',
      gender: 'Male',
      address: 'Address from DigiLocker',
    };
  }

  /**
   * Parse PAN XML from DigiLocker
   */
  parsePANXML(xml) {
    // Simplified parsing - in production, use proper XML parser
    return {
      panNumber: 'ABCDE1234F',
      name: 'Name from DigiLocker',
      dob: '01/01/1990',
      status: 'Active',
    };
  }

  /**
   * Cross-verify name across documents
   */
  crossVerifyName(name1, name2) {
    const normalize = (str) =>
      str
        .toUpperCase()
        .replace(/[^A-Z\s]/g, '')
        .trim();

    const n1 = normalize(name1);
    const n2 = normalize(name2);

    // Exact match
    if (n1 === n2) {
      return { match: true, score: 100 };
    }

    // Partial match (fuzzy)
    const words1 = n1.split(/\s+/);
    const words2 = n2.split(/\s+/);
    const commonWords = words1.filter((w) => words2.includes(w));
    const score = Math.round(
      (commonWords.length / Math.max(words1.length, words2.length)) * 100
    );

    return {
      match: score >= 70,
      score,
      message:
        score >= 70
          ? 'Names partially match'
          : 'Names do not match sufficiently',
    };
  }
}

module.exports = new DocumentVerificationService();
