/**
 * Photo Verification Service
 * Face matching, liveness detection, and photo verification
 */

const axios = require('axios');
const FormData = require('form-data');
const logger = require('../utils/logger');

class PhotoVerificationService {
  constructor() {
    // AWS Rekognition for face detection
    this.awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
    this.awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
    this.awsRegion = process.env.AWS_REGION || 'ap-south-1';
    
    // Alternative: Face++ API
    this.facePPApiKey = process.env.FACEPP_API_KEY;
    this.facePPApiSecret = process.env.FACEPP_API_SECRET;
  }

  /**
   * Verify face match between two photos
   */
  async verifyFaceMatch(image1Buffer, image2Buffer) {
    try {
      if (this.facePPApiKey && this.facePPApiSecret) {
        return await this.verifyFaceMatchFacePP(image1Buffer, image2Buffer);
      } else if (this.awsAccessKey && this.awsSecretKey) {
        return await this.verifyFaceMatchAWS(image1Buffer, image2Buffer);
      } else {
        // Fallback: Basic verification
        return await this.basicFaceVerification(image1Buffer, image2Buffer);
      }
    } catch (error) {
      logger.error('Error verifying face match:', error);
      throw error;
    }
  }

  /**
   * Face matching using Face++ API
   */
  async verifyFaceMatchFacePP(image1Buffer, image2Buffer) {
    try {
      const formData = new FormData();
      formData.append('api_key', this.facePPApiKey);
      formData.append('api_secret', this.facePPApiSecret);
      formData.append('image_file1', image1Buffer, { filename: 'image1.jpg' });
      formData.append('image_file2', image2Buffer, { filename: 'image2.jpg' });

      const response = await axios.post(
        'https://api-us.faceplusplus.com/facepp/v3/compare',
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000
        }
      );

      const data = response.data;
      
      if (data.error_message) {
        throw new Error(data.error_message);
      }

      const confidence = data.confidence || 0;
      const threshold = 80; // 80% confidence threshold

      logger.info(`Face match confidence: ${confidence}`);

      return {
        isMatch: confidence >= threshold,
        confidence,
        threshold,
        provider: 'facepp'
      };
    } catch (error) {
      logger.error('Face++ API error:', error);
      throw new Error(`Face matching failed: ${error.message}`);
    }
  }

  /**
   * Face matching using AWS Rekognition
   */
  async verifyFaceMatchAWS(image1Buffer, image2Buffer) {
    try {
      const AWS = require('aws-sdk');
      const rekognition = new AWS.Rekognition({
        accessKeyId: this.awsAccessKey,
        secretAccessKey: this.awsSecretKey,
        region: this.awsRegion
      });

      const params = {
        SourceImage: {
          Bytes: image1Buffer
        },
        TargetImage: {
          Bytes: image2Buffer
        },
        SimilarityThreshold: 80
      };

      const result = await rekognition.compareFaces(params).promise();

      if (result.FaceMatches && result.FaceMatches.length > 0) {
        const similarity = result.FaceMatches[0].Similarity;

        logger.info(`Face match similarity: ${similarity}`);

        return {
          isMatch: similarity >= 80,
          confidence: similarity,
          threshold: 80,
          provider: 'aws-rekognition'
        };
      }

      return {
        isMatch: false,
        confidence: 0,
        threshold: 80,
        provider: 'aws-rekognition',
        reason: 'No matching faces found'
      };
    } catch (error) {
      logger.error('AWS Rekognition error:', error);
      throw new Error(`Face matching failed: ${error.message}`);
    }
  }

  /**
   * Basic face verification (fallback)
   */
  async basicFaceVerification(image1Buffer, image2Buffer) {
    try {
      // This is a basic implementation
      // In production, integrate with a proper face recognition service
      
      const sharp = require('sharp');
      
      // Get image metadata
      const [meta1, meta2] = await Promise.all([
        sharp(image1Buffer).metadata(),
        sharp(image2Buffer).metadata()
      ]);

      // Basic checks
      const hasValidDimensions = 
        meta1.width >= 200 && meta1.height >= 200 &&
        meta2.width >= 200 && meta2.height >= 200;

      logger.info('Basic face verification (fallback mode)');

      return {
        isMatch: hasValidDimensions,
        confidence: hasValidDimensions ? 70 : 30,
        threshold: 70,
        provider: 'basic-fallback',
        warning: 'Using basic verification. Configure Face++ or AWS Rekognition for accurate results.'
      };
    } catch (error) {
      logger.error('Basic verification error:', error);
      return {
        isMatch: false,
        confidence: 0,
        threshold: 70,
        provider: 'basic-fallback',
        error: error.message
      };
    }
  }

  /**
   * Liveness detection
   */
  async detectLiveness(imageBuffer) {
    try {
      if (this.facePPApiKey && this.facePPApiSecret) {
        return await this.detectLivenessFacePP(imageBuffer);
      } else {
        return await this.basicLivenessCheck(imageBuffer);
      }
    } catch (error) {
      logger.error('Error detecting liveness:', error);
      throw error;
    }
  }

  /**
   * Liveness detection using Face++
   */
  async detectLivenessFacePP(imageBuffer) {
    try {
      const formData = new FormData();
      formData.append('api_key', this.facePPApiKey);
      formData.append('api_secret', this.facePPApiSecret);
      formData.append('image_file', imageBuffer, { filename: 'image.jpg' });
      formData.append('return_landmark', '1');
      formData.append('return_attributes', 'headpose,eyestatus,mouthstatus');

      const response = await axios.post(
        'https://api-us.faceplusplus.com/facepp/v3/detect',
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000
        }
      );

      const data = response.data;

      if (data.error_message) {
        throw new Error(data.error_message);
      }

      if (!data.faces || data.faces.length === 0) {
        return {
          isLive: false,
          score: 0,
          reason: 'No face detected'
        };
      }

      const face = data.faces[0];
      const attributes = face.attributes || {};

      // Check eye status
      const eyeStatus = attributes.eyestatus || {};
      const eyesOpen = 
        (eyeStatus.left_eye_status?.no_glass_eye_open > 0.5) &&
        (eyeStatus.right_eye_status?.no_glass_eye_open > 0.5);

      // Calculate liveness score
      let livenessScore = 50; // Base score

      if (eyesOpen) livenessScore += 30;
      if (face.landmark) livenessScore += 20;

      logger.info(`Liveness score: ${livenessScore}`);

      return {
        isLive: livenessScore >= 70,
        score: livenessScore,
        details: {
          faceDetected: true,
          eyesOpen,
          landmarks: !!face.landmark
        }
      };
    } catch (error) {
      logger.error('Face++ liveness detection error:', error);
      throw error;
    }
  }

  /**
   * Basic liveness check (fallback)
   */
  async basicLivenessCheck(imageBuffer) {
    try {
      const sharp = require('sharp');
      
      const metadata = await sharp(imageBuffer).metadata();
      const stats = await sharp(imageBuffer).stats();

      // Check if image is not heavily edited (basic check)
      const isReasonableSize = 
        metadata.width >= 300 && 
        metadata.height >= 300 &&
        metadata.width <= 4000 &&
        metadata.height <= 4000;

      // Check brightness and contrast
      const avgBrightness = stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;
      const hasGoodBrightness = avgBrightness >= 30 && avgBrightness <= 225;

      const livenessScore = (isReasonableSize ? 50 : 0) + (hasGoodBrightness ? 30 : 0) + 20;

      logger.info('Basic liveness check (fallback mode)');

      return {
        isLive: livenessScore >= 70,
        score: livenessScore,
        warning: 'Using basic liveness check. Configure Face++ for accurate results.',
        details: {
          reasonableSize: isReasonableSize,
          goodBrightness: hasGoodBrightness
        }
      };
    } catch (error) {
      logger.error('Basic liveness check error:', error);
      return {
        isLive: false,
        score: 0,
        error: error.message
      };
    }
  }

  /**
   * Detect face in image
   */
  async detectFace(imageBuffer) {
    try {
      if (this.facePPApiKey && this.facePPApiSecret) {
        const formData = new FormData();
        formData.append('api_key', this.facePPApiKey);
        formData.append('api_secret', this.facePPApiSecret);
        formData.append('image_file', imageBuffer, { filename: 'image.jpg' });

        const response = await axios.post(
          'https://api-us.faceplusplus.com/facepp/v3/detect',
          formData,
          {
            headers: formData.getHeaders(),
            timeout: 30000
          }
        );

        const data = response.data;
        
        return {
          faceDetected: data.faces && data.faces.length > 0,
          faceCount: data.faces ? data.faces.length : 0
        };
      } else {
        // Basic check
        const sharp = require('sharp');
        const metadata = await sharp(imageBuffer).metadata();
        
        return {
          faceDetected: metadata.width >= 200 && metadata.height >= 200,
          faceCount: 1,
          fallback: true
        };
      }
    } catch (error) {
      logger.error('Error detecting face:', error);
      throw error;
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured() {
    return {
      facepp: !!(this.facePPApiKey && this.facePPApiSecret),
      aws: !!(this.awsAccessKey && this.awsSecretKey)
    };
  }
}

// Singleton instance
const photoVerificationService = new PhotoVerificationService();

module.exports = photoVerificationService;
