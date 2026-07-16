/**
 * Panchang Service
 * Auspicious dates, Tithi, Nakshatra, Muhurat calculations
 */

const axios = require('axios');
const PDFDocument = require('pdfkit');
const logger = require('../utils/logger');

// Get Panchang for a specific date
const getPanchang = async ({ date, latitude, longitude }) => {
  try {
    if (process.env.PANCHANG_API_KEY) {
      const response = await axios.get(
        'https://api.prokerala.com/v2/astrology/panchang',
        {
          params: {
            ayanamsa: 1,
            datetime: date,
            coordinates: `${latitude},${longitude}`,
          },
          headers: {
            'Authorization': `Bearer ${process.env.PANCHANG_API_KEY}`,
          },
        }
      );

      return response.data;
    }

    // Fallback: simplified calculation
    return {
      date: new Date(date),
      tithi: 'Purnima',
      nakshatra: 'Rohini',
      yoga: 'Vishkumbha',
      karana: 'Bava',
      paksha: 'Shukla',
      sunrise: '06:30 AM',
      sunset: '06:45 PM',
      moonrise: '08:15 PM',
      moonset: '07:30 AM',
      auspiciousTime: [
        { start: '06:30', end: '08:00', name: 'Brahma Muhurat' },
        { start: '12:00', end: '13:30', name: 'Abhijit Muhurat' },
      ],
      inauspiciousTime: [
        { start: '14:00', end: '15:30', name: 'Rahu Kaal' },
      ],
    };
  } catch (error) {
    logger.error('Panchang fetch failed:', error);
    throw error;
  }
};

// Get auspicious dates for marriage/engagement
const getAuspiciousDates = async ({ month, year, purpose }) => {
  try {
    // In production, use Panchang API or calculate based on Vedic calendar
    const dates = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      
      // Skip inauspicious days
      if (isInauspiciousDay(date)) continue;

      // Check if date has good muhurat
      const panchang = await getPanchang({
        date: date.toISOString(),
        latitude: 28.6139,
        longitude: 77.2090,
      });

      if (panchang.auspiciousTime && panchang.auspiciousTime.length > 0) {
        dates.push({
          date: date.toISOString().split('T')[0],
          day: date.toLocaleDateString('en-IN', { weekday: 'long' }),
          tithi: panchang.tithi,
          nakshatra: panchang.nakshatra,
          muhurats: panchang.auspiciousTime,
          suitability: calculateSuitability(panchang),
        });
      }
    }

    return dates.sort((a, b) => b.suitability - a.suitability);
  } catch (error) {
    logger.error('Get auspicious dates failed:', error);
    throw error;
  }
};

// Check if day is inauspicious
const isInauspiciousDay = (date) => {
  const day = date.getDay();
  // Avoid Tuesdays and Saturdays for marriage in some traditions
  // This is configurable based on regional customs
  return false; // Simplified
};

// Calculate suitability score
const calculateSuitability = (panchang) => {
  let score = 50;

  // Good Tithis add points
  const goodTithis = ['Dwitiya', 'Tritiya', 'Panchami', 'Saptami', 'Dashami', 'Ekadashi', 'Trayodashi'];
  if (goodTithis.includes(panchang.tithi)) score += 20;

  // Good Nakshatras add points
  const goodNakshatras = ['Rohini', 'Uttara Phalguni', 'Hasta', 'Swati', 'Anuradha', 'Uttara Ashadha', 'Revati'];
  if (goodNakshatras.includes(panchang.nakshatra)) score += 20;

  // Multiple auspicious times add points
  if (panchang.auspiciousTime?.length > 1) score += 10;

  return Math.min(100, score);
};

// Generate Kundali PDF
const generateKundaliPDF = async (horoscope, profile) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Title
      doc.fontSize(24).font('Helvetica-Bold').text('Kundali', { align: 'center' });
      doc.moveDown();

      // Personal Details
      doc.fontSize(16).font('Helvetica-Bold').text('Personal Details');
      doc.fontSize(12).font('Helvetica');
      doc.text(`Name: ${profile.name}`);
      doc.text(`Date of Birth: ${new Date(horoscope.birthDetails.dateOfBirth).toLocaleDateString()}`);
      doc.text(`Time of Birth: ${horoscope.birthDetails.timeOfBirth}`);
      doc.text(`Place of Birth: ${horoscope.birthDetails.placeOfBirth}`);
      doc.moveDown();

      // Planetary Positions
      doc.fontSize(16).font('Helvetica-Bold').text('Planetary Positions');
      doc.fontSize(12).font('Helvetica');
      doc.text(`Ascendant (Lagna): ${horoscope.kundali.ascendant}`);
      doc.text(`Moon Sign (Rashi): ${horoscope.kundali.moonSign}`);
      doc.text(`Sun Sign: ${horoscope.kundali.sunSign}`);
      doc.text(`Nakshatra: ${horoscope.kundali.nakshatra}`);
      doc.moveDown();

      // Planets
      doc.fontSize(14).font('Helvetica-Bold').text('Planets:');
      doc.fontSize(11).font('Helvetica');
      Object.entries(horoscope.kundali.planets).forEach(([planet, data]) => {
        doc.text(`${planet.charAt(0).toUpperCase() + planet.slice(1)}: ${data.sign} (House ${data.house})`);
      });
      doc.moveDown();

      // Doshas
      if (horoscope.doshas && horoscope.doshas.length > 0) {
        doc.fontSize(16).font('Helvetica-Bold').text('Doshas');
        doc.fontSize(12).font('Helvetica');
        horoscope.doshas.forEach(dosha => {
          doc.text(`${dosha.name} - Severity: ${dosha.severity}`);
          doc.text(`${dosha.description}`);
          if (dosha.remedies && dosha.remedies.length > 0) {
            doc.text('Remedies:');
            dosha.remedies.forEach(remedy => {
              doc.text(`  • ${remedy}`);
            });
          }
          doc.moveDown(0.5);
        });
      }

      // Footer
      doc.fontSize(10).font('Helvetica').text(
        'Generated by SoulMatch Matrimonial Platform',
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  getPanchang,
  getAuspiciousDates,
  generateKundaliPDF,
};
