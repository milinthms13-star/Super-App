/**
 * astrologyNotificationScheduler.js
 * Handles scheduled notifications for astrology module
 * Includes daily horoscopes, festival reminders, dasha alerts, and muhurat notifications
 */

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const NotificationService = require('./NotificationService');
const {
  findProfileByUserId,
  getDailyHoroscope,
  getSignDetails,
} = require('./astrologyBackendService');

class AstrologyNotificationScheduler {
  constructor() {
    this.jobs = [];
    this.isInitialized = false;
  }

  /**
   * Initialize all scheduled notification jobs
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('AstrologyNotificationScheduler already initialized');
      return;
    }

    try {
      // Daily horoscope at 6:00 AM every day
      this.scheduleDailyHoroscope();

      // Festival reminders check at 8:00 AM daily
      this.scheduleFestivalReminders();

      // Dasha period alerts check at 9:00 AM daily
      this.scheduleDashaAlerts();

      // Good Muhurat alerts at 7:00 AM daily
      this.scheduleMuhuratAlerts();

      // Consultation reminders check every 15 minutes
      this.scheduleConsultationReminders();

      this.isInitialized = true;
      logger.info('AstrologyNotificationScheduler initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize AstrologyNotificationScheduler: ${error.message}`);
      throw error;
    }
  }

  /**
   * Schedule daily horoscope notifications
   * Runs at 6:00 AM every day
   */
  scheduleDailyHoroscope() {
    const job = cron.schedule('0 6 * * *', async () => {
      try {
        logger.info('Running daily horoscope notification job');
        await this.sendDailyHoroscopes();
      } catch (error) {
        logger.error(`Daily horoscope job failed: ${error.message}`);
      }
    });

    this.jobs.push({ name: 'dailyHoroscope', job });
    logger.info('Daily horoscope job scheduled (6:00 AM daily)');
  }

  /**
   * Send daily horoscopes to all opted-in users
   */
  async sendDailyHoroscopes() {
    try {
      const AstrologyUserProfile = require('../models/AstrologyUserProfile');
      const User = require('../models/User');

      // Find all profiles with daily horoscope enabled
      const profiles = await AstrologyUserProfile.find({
        'preferences.receiveDailyHoroscope': true,
        'notifications.dailyHoroscope': true,
      }).limit(1000);

      logger.info(`Sending daily horoscopes to ${profiles.length} users`);

      const emailTemplate = this.loadEmailTemplate('daily-horoscope.html');
      let successCount = 0;
      let failCount = 0;

      for (const profile of profiles) {
        try {
          const user = await User.findById(profile.userId);
          if (!user || !user.email) {
            failCount++;
            continue;
          }

          const sign = profile.sign || 'aries';
          const signDetails = getSignDetails(sign);
          const horoscope = getDailyHoroscope(sign);

          const emailData = {
            userName: user.name || 'User',
            zodiacSign: signDetails.name,
            zodiacEmoji: signDetails.emoji,
            horoscopeText: horoscope,
            luckyNumber: Math.floor(Math.random() * 99) + 1,
            luckyColor: this.getLuckyColor(sign),
            lovePercentage: Math.floor(Math.random() * 30) + 70,
            careerPercentage: Math.floor(Math.random() * 30) + 70,
            healthPercentage: Math.floor(Math.random() * 30) + 70,
            date: new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/astrology`,
            unsubscribeUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/astrology/settings`,
          };

          const emailHtml = this.replaceTemplatePlaceholders(emailTemplate, emailData);

          await NotificationService._sendEmail(user.email, {
            title: `Your Daily Horoscope - ${signDetails.name}`,
            message: horoscope,
            data: emailData,
          });

          // Also create in-app notification
          await NotificationService.sendNotification(profile.userId, {
            type: 'daily_horoscope',
            title: `🌟 ${signDetails.name} Daily Horoscope`,
            message: horoscope.substring(0, 150) + '...',
            icon: signDetails.emoji,
            channels: ['in-app'],
            data: { sign, horoscope },
          });

          successCount++;
        } catch (userError) {
          logger.error(`Failed to send horoscope to user ${profile.userId}: ${userError.message}`);
          failCount++;
        }
      }

      logger.info(`Daily horoscope job completed: ${successCount} sent, ${failCount} failed`);
    } catch (error) {
      logger.error(`sendDailyHoroscopes failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Schedule festival reminder notifications
   * Runs at 8:00 AM every day
   */
  scheduleFestivalReminders() {
    const job = cron.schedule('0 8 * * *', async () => {
      try {
        logger.info('Running festival reminder notification job');
        await this.sendFestivalReminders();
      } catch (error) {
        logger.error(`Festival reminder job failed: ${error.message}`);
      }
    });

    this.jobs.push({ name: 'festivalReminders', job });
    logger.info('Festival reminder job scheduled (8:00 AM daily)');
  }

  /**
   * Send festival reminders to opted-in users
   */
  async sendFestivalReminders() {
    try {
      const AstrologyUserProfile = require('../models/AstrologyUserProfile');
      const User = require('../models/User');

      const upcomingFestivals = this.getUpcomingFestivals();
      if (upcomingFestivals.length === 0) {
        logger.info('No upcoming festivals to remind about');
        return;
      }

      const profiles = await AstrologyUserProfile.find({
        'notifications.festivalReminders': true,
      }).limit(1000);

      logger.info(`Sending festival reminders to ${profiles.length} users for ${upcomingFestivals.length} festivals`);

      const emailTemplate = this.loadEmailTemplate('festival-reminder.html');
      let successCount = 0;

      for (const profile of profiles) {
        try {
          const user = await User.findById(profile.userId);
          if (!user || !user.email) continue;

          for (const festival of upcomingFestivals) {
            const emailData = {
              userName: user.name || 'User',
              festivalName: festival.name,
              festivalDate: festival.date,
              significance: festival.significance,
              ritualsList: festival.rituals.map(r => `<li>${r}</li>`).join(''),
              festivalTip: festival.tip,
              dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/astrology`,
            };

            const emailHtml = this.replaceTemplatePlaceholders(emailTemplate, emailData);

            await NotificationService._sendEmail(user.email, {
              title: `${festival.name} is Coming Soon!`,
              message: `${festival.name} on ${festival.date}. ${festival.significance}`,
            });

            await NotificationService.sendNotification(profile.userId, {
              type: 'festival_reminder',
              title: `🎉 ${festival.name} Reminder`,
              message: `${festival.name} is on ${festival.date}`,
              icon: '🪔',
              channels: ['in-app'],
              data: festival,
            });
          }

          successCount++;
        } catch (userError) {
          logger.error(`Failed to send festival reminder to user ${profile.userId}: ${userError.message}`);
        }
      }

      logger.info(`Festival reminder job completed: ${successCount} users notified`);
    } catch (error) {
      logger.error(`sendFestivalReminders failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Schedule Dasha period alert notifications
   * Runs at 9:00 AM every day
   */
  scheduleDashaAlerts() {
    const job = cron.schedule('0 9 * * *', async () => {
      try {
        logger.info('Running Dasha alert notification job');
        await this.sendDashaAlerts();
      } catch (error) {
        logger.error(`Dasha alert job failed: ${error.message}`);
      }
    });

    this.jobs.push({ name: 'dashaAlerts', job });
    logger.info('Dasha alert job scheduled (9:00 AM daily)');
  }

  /**
   * Send Dasha period alerts to opted-in users
   */
  async sendDashaAlerts() {
    try {
      const AstrologyUserProfile = require('../models/AstrologyUserProfile');
      const User = require('../models/User');

      const profiles = await AstrologyUserProfile.find({
        'notifications.dashaAlerts': true,
        birthDate: { $exists: true, $ne: null },
      }).limit(1000);

      logger.info(`Checking Dasha periods for ${profiles.length} users`);

      const emailTemplate = this.loadEmailTemplate('dasha-alert.html');
      let notificationCount = 0;

      for (const profile of profiles) {
        try {
          const dashaInfo = this.checkDashaPeriod(profile);
          if (!dashaInfo.shouldAlert) continue;

          const user = await User.findById(profile.userId);
          if (!user || !user.email) continue;

          const emailData = {
            userName: user.name || 'User',
            planetName: dashaInfo.planet,
            startDate: dashaInfo.startDate,
            duration: dashaInfo.duration,
            dashaDescription: dashaInfo.description,
            recommendationsList: dashaInfo.recommendations.map(r => `<li>${r}</li>`).join(''),
            consultationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/astrology/consultations`,
          };

          const emailHtml = this.replaceTemplatePlaceholders(emailTemplate, emailData);

          await NotificationService._sendEmail(user.email, {
            title: `New ${dashaInfo.planet} Dasha Period Beginning`,
            message: dashaInfo.description,
          });

          await NotificationService.sendNotification(profile.userId, {
            type: 'dasha_alert',
            title: `🌙 ${dashaInfo.planet} Dasha Alert`,
            message: `New Dasha period beginning: ${dashaInfo.planet}`,
            icon: '⭐',
            channels: ['in-app'],
            data: dashaInfo,
          });

          notificationCount++;
        } catch (userError) {
          logger.error(`Failed to send Dasha alert to user ${profile.userId}: ${userError.message}`);
        }
      }

      logger.info(`Dasha alert job completed: ${notificationCount} alerts sent`);
    } catch (error) {
      logger.error(`sendDashaAlerts failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Schedule good Muhurat alert notifications
   * Runs at 7:00 AM every day
   */
  scheduleMuhuratAlerts() {
    const job = cron.schedule('0 7 * * *', async () => {
      try {
        logger.info('Running Muhurat alert notification job');
        await this.sendMuhuratAlerts();
      } catch (error) {
        logger.error(`Muhurat alert job failed: ${error.message}`);
      }
    });

    this.jobs.push({ name: 'muhuratAlerts', job });
    logger.info('Muhurat alert job scheduled (7:00 AM daily)');
  }

  /**
   * Send good Muhurat alerts to opted-in users
   */
  async sendMuhuratAlerts() {
    try {
      const AstrologyUserProfile = require('../models/AstrologyUserProfile');
      const User = require('../models/User');

      const todayMuhurat = this.getTodayMuhurat();
      if (!todayMuhurat) {
        logger.info('No auspicious Muhurat today');
        return;
      }

      const profiles = await AstrologyUserProfile.find({
        'notifications.goodMuhurtam': true,
      }).limit(1000);

      logger.info(`Sending Muhurat alerts to ${profiles.length} users`);

      const emailTemplate = this.loadEmailTemplate('muhurat-alert.html');
      let successCount = 0;

      for (const profile of profiles) {
        try {
          const user = await User.findById(profile.userId);
          if (!user || !user.email) continue;

          const emailData = {
            userName: user.name || 'User',
            muhuratDate: todayMuhurat.date,
            muhuratTime: todayMuhurat.time,
            suitableFor: todayMuhurat.suitableFor,
            activitiesList: todayMuhurat.activities.map(a => `<li>${a}</li>`).join(''),
            panchangUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/astrology/panchang`,
          };

          const emailHtml = this.replaceTemplatePlaceholders(emailTemplate, emailData);

          await NotificationService._sendEmail(user.email, {
            title: '⏰ Auspicious Muhurat Today',
            message: `Good Muhurat at ${todayMuhurat.time} for ${todayMuhurat.suitableFor}`,
          });

          await NotificationService.sendNotification(profile.userId, {
            type: 'muhurat_alert',
            title: '🕉️ Auspicious Time Alert',
            message: `Good Muhurat at ${todayMuhurat.time}`,
            icon: '⏰',
            channels: ['in-app'],
            data: todayMuhurat,
          });

          successCount++;
        } catch (userError) {
          logger.error(`Failed to send Muhurat alert to user ${profile.userId}: ${userError.message}`);
        }
      }

      logger.info(`Muhurat alert job completed: ${successCount} alerts sent`);
    } catch (error) {
      logger.error(`sendMuhuratAlerts failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Schedule consultation reminder notifications
   * Runs every 15 minutes
   */
  scheduleConsultationReminders() {
    const job = cron.schedule('*/15 * * * *', async () => {
      try {
        await this.sendConsultationReminders();
      } catch (error) {
        logger.error(`Consultation reminder job failed: ${error.message}`);
      }
    });

    this.jobs.push({ name: 'consultationReminders', job });
    logger.info('Consultation reminder job scheduled (every 15 minutes)');
  }

  /**
   * Send consultation reminders 30 minutes before scheduled time
   */
  async sendConsultationReminders() {
    try {
      const ConsultationBooking = require('../models/AstrologyConsultationBooking');
      const User = require('../models/User');

      // Find bookings starting in 25-35 minutes (to catch them in the 15-min window)
      const now = new Date();
      const reminderWindowStart = new Date(now.getTime() + 25 * 60 * 1000);
      const reminderWindowEnd = new Date(now.getTime() + 35 * 60 * 1000);

      const upcomingBookings = await ConsultationBooking.find({
        status: { $in: ['confirmed', 'pending_payment'] },
        preferredDate: {
          $gte: reminderWindowStart,
          $lte: reminderWindowEnd,
        },
        reminderSent: { $ne: true },
      });

      if (upcomingBookings.length === 0) {
        return;
      }

      logger.info(`Sending reminders for ${upcomingBookings.length} upcoming consultations`);

      const emailTemplate = this.loadEmailTemplate('consultation-reminder.html');

      for (const booking of upcomingBookings) {
        try {
          const user = await User.findById(booking.userId);
          if (!user) continue;

          const emailData = {
            userName: user.name || 'User',
            consultantName: booking.consultantName,
            slotTime: booking.slot,
            confirmationCode: booking.confirmationCode,
            consultationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/astrology/consultations`,
          };

          if (user.email) {
            const emailHtml = this.replaceTemplatePlaceholders(emailTemplate, emailData);
            await NotificationService._sendEmail(user.email, {
              title: '⏰ Consultation Reminder - Starting in 30 Minutes',
              message: `Your consultation with ${booking.consultantName} starts soon at ${booking.slot}`,
            });
          }

          if (user.phone || user.mobile) {
            await NotificationService._sendSMS(user.phone || user.mobile, {
              message: `AstroNila Reminder: Your consultation with ${booking.consultantName} starts in 30 min at ${booking.slot}`,
            });
          }

          await NotificationService.sendNotification(booking.userId, {
            type: 'consultation_reminder',
            title: '⏰ Consultation Starting Soon',
            message: `Your consultation with ${booking.consultantName} starts in 30 minutes`,
            icon: '🔔',
            channels: ['in-app', 'push'],
            data: {
              bookingId: booking._id || booking.id,
              consultantName: booking.consultantName,
              slotTime: booking.slot,
            },
          });

          // Mark reminder as sent
          await ConsultationBooking.findByIdAndUpdate(booking._id, {
            reminderSent: true,
          });

        } catch (bookingError) {
          logger.error(`Failed to send reminder for booking ${booking._id}: ${bookingError.message}`);
        }
      }

      logger.info(`Consultation reminders sent successfully`);
    } catch (error) {
      logger.error(`sendConsultationReminders failed: ${error.message}`);
    }
  }

  /**
   * Load email template from file
   */
  loadEmailTemplate(templateName) {
    try {
      const templatePath = path.join(__dirname, '..', 'templates', 'emails', 'astrology', templateName);
      return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
      logger.error(`Failed to load template ${templateName}: ${error.message}`);
      return '<html><body><h1>{{title}}</h1><p>{{message}}</p></body></html>';
    }
  }

  /**
   * Replace template placeholders with actual data
   */
  replaceTemplatePlaceholders(template, data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || '');
    }
    return result;
  }

  /**
   * Get lucky color for a zodiac sign
   */
  getLuckyColor(sign) {
    const colors = {
      aries: 'Red',
      taurus: 'Green',
      gemini: 'Yellow',
      cancer: 'Silver',
      leo: 'Gold',
      virgo: 'Blue',
      libra: 'Pink',
      scorpio: 'Maroon',
      sagittarius: 'Purple',
      capricorn: 'Brown',
      aquarius: 'Turquoise',
      pisces: 'Sea Green',
    };
    return colors[sign.toLowerCase()] || 'White';
  }

  /**
   * Get upcoming festivals (within next 7 days)
   */
  getUpcomingFestivals() {
    // In production, fetch from a festivals database or API
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Sample festivals - replace with actual festival calendar
    const festivals = [
      {
        name: 'Diwali',
        date: 'November 1, 2026',
        significance: 'Festival of Lights',
        rituals: ['Light diyas', 'Perform Lakshmi Puja', 'Distribute sweets'],
        tip: 'Wear new clothes and light oil lamps in the evening',
      },
    ];

    return festivals.filter(f => {
      const festivalDate = new Date(f.date);
      return festivalDate >= today && festivalDate <= nextWeek;
    });
  }

  /**
   * Check if user's Dasha period is changing
   */
  checkDashaPeriod(profile) {
    // In production, calculate actual Dasha periods based on birth chart
    // This is a simplified placeholder
    return {
      shouldAlert: false,
      planet: 'Mercury',
      startDate: new Date().toLocaleDateString(),
      duration: '17 years',
      description: 'Mercury Dasha brings opportunities for communication, learning, and business ventures.',
      recommendations: [
        'Focus on education and skill development',
        'Good time for starting new business ventures',
        'Maintain clear communication in relationships',
      ],
    };
  }

  /**
   * Get today's auspicious Muhurat
   */
  getTodayMuhurat() {
    // In production, calculate actual Muhurat based on Panchang
    // This is a simplified placeholder
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) {
      return {
        date: new Date().toLocaleDateString(),
        time: '10:30 AM - 12:00 PM',
        suitableFor: 'New Ventures, Interviews, Meetings',
        activities: [
          'Starting new business projects',
          'Job interviews and important meetings',
          'Signing important documents',
          'Making investment decisions',
        ],
      };
    }
    return null;
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll() {
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      logger.info(`Stopped ${name} notification job`);
    });
    this.jobs = [];
    this.isInitialized = false;
    logger.info('All astrology notification jobs stopped');
  }
}

// Singleton instance
let schedulerInstance = null;

module.exports = {
  getInstance: () => {
    if (!schedulerInstance) {
      schedulerInstance = new AstrologyNotificationScheduler();
    }
    return schedulerInstance;
  },
  AstrologyNotificationScheduler,
};
