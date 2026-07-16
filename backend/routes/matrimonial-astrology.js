/**
 * Astrology Routes
 * Kundali, Guna Milan, Dosha detection, Auspicious dates
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const Horoscope = require('../models/Horoscope');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const astrologyService = require('../services/astrologyService');
const panchangService = require('../services/panchangService');
const logger = require('../utils/logger');

const router = express.Router();

router.use(authenticate);

// Create/Update Kundali
router.post('/kundali', async (req, res) => {
  try {
    const { dateOfBirth, timeOfBirth, placeOfBirth, latitude, longitude } = req.body;

    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    // Generate Kundali
    const kundaliResult = await astrologyService.generateKundali({
      name: profile.name,
      dateOfBirth,
      timeOfBirth,
      placeOfBirth,
      latitude,
      longitude,
    });

    if (!kundaliResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate Kundali',
      });
    }

    // Save or update horoscope
    let horoscope = await Horoscope.findOne({ profileId: profile._id });
    
    if (horoscope) {
      horoscope.birthDetails = { dateOfBirth, timeOfBirth, placeOfBirth, latitude, longitude };
      horoscope.kundali = kundaliResult.data;
      horoscope.doshas = kundaliResult.data.doshas || [];
      horoscope.lastUpdated = new Date();
    } else {
      horoscope = new Horoscope({
        profileId: profile._id,
        userId: req.user._id,
        birthDetails: { dateOfBirth, timeOfBirth, placeOfBirth, latitude, longitude },
        kundali: kundaliResult.data,
        doshas: kundaliResult.data.doshas || [],
      });
    }

    await horoscope.save();

    res.json({
      success: true,
      message: 'Kundali generated successfully',
      data: horoscope,
    });
  } catch (error) {
    logger.error('Kundali creation failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create Kundali',
    });
  }
});

// Get own Kundali
router.get('/kundali', async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    const horoscope = await Horoscope.findOne({ profileId: profile._id });

    if (!horoscope) {
      return res.status(404).json({
        success: false,
        message: 'Kundali not found. Please create one first.',
      });
    }

    res.json({
      success: true,
      data: horoscope,
    });
  } catch (error) {
    logger.error('Get Kundali failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Kundali',
    });
  }
});

// Get another profile's Kundali
router.get('/kundali/:profileId', async (req, res) => {
  try {
    const horoscope = await Horoscope.findOne({
      profileId: req.params.profileId,
      isPublic: true,
    });

    if (!horoscope) {
      return res.status(404).json({
        success: false,
        message: 'Kundali not available or private',
      });
    }

    res.json({
      success: true,
      data: horoscope,
    });
  } catch (error) {
    logger.error('Get profile Kundali failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Kundali',
    });
  }
});

// Calculate Guna Milan (compatibility)
router.post('/guna-milan', async (req, res) => {
  try {
    const { otherProfileId } = req.body;

    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Your profile not found',
      });
    }

    const myHoroscope = await Horoscope.findOne({ profileId: profile._id });
    const otherHoroscope = await Horoscope.findOne({ profileId: otherProfileId });

    if (!myHoroscope || !otherHoroscope) {
      return res.status(404).json({
        success: false,
        message: 'Kundali not available for one or both profiles',
      });
    }

    // Calculate Guna Milan
    const gunaMilan = astrologyService.calculateGunaMilan(
      myHoroscope.kundali,
      otherHoroscope.kundali
    );

    res.json({
      success: true,
      data: gunaMilan,
    });
  } catch (error) {
    logger.error('Guna Milan calculation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate compatibility',
    });
  }
});

// Get auspicious dates (Muhurat)
router.get('/auspicious-dates', async (req, res) => {
  try {
    const { month, year, purpose } = req.query;

    const dates = await panchangService.getAuspiciousDates({
      month: Number(month),
      year: Number(year),
      purpose: purpose || 'marriage',
    });

    res.json({
      success: true,
      data: dates,
    });
  } catch (error) {
    logger.error('Get auspicious dates failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch auspicious dates',
    });
  }
});

// Check specific date
router.post('/check-date', async (req, res) => {
  try {
    const { date, latitude, longitude } = req.body;

    const panchang = await panchangService.getPanchang({
      date,
      latitude: latitude || 28.6139, // Default Delhi
      longitude: longitude || 77.2090,
    });

    res.json({
      success: true,
      data: panchang,
    });
  } catch (error) {
    logger.error('Check date failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check date',
    });
  }
});

// Download Kundali PDF
router.get('/kundali/download-pdf', async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    const horoscope = await Horoscope.findOne({ profileId: profile._id });

    if (!horoscope) {
      return res.status(404).json({
        success: false,
        message: 'Kundali not found',
      });
    }

    // Generate PDF (using pdfkit or similar)
    const pdfBuffer = await panchangService.generateKundaliPDF(horoscope, profile);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=kundali-${profile.name}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('PDF generation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
    });
  }
});

module.exports = router;
