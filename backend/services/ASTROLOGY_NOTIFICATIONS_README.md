# Astrology Notification System

## Overview
The Astrology Notification System provides automated email, SMS, and in-app notifications for the astrology module. It includes scheduled notifications for daily horoscopes, festival reminders, Dasha alerts, auspicious Muhurat times, and consultation reminders.

## Features

### 1. **Daily Horoscope Notifications**
- **Schedule**: 6:00 AM daily
- **Recipients**: Users with `notifications.dailyHoroscope` enabled
- **Content**: Personalized daily horoscope based on zodiac sign
- **Channels**: Email + In-app notification
- **Template**: `daily-horoscope.html`

### 2. **Festival Reminders**
- **Schedule**: 8:00 AM daily
- **Recipients**: Users with `notifications.festivalReminders` enabled
- **Content**: Upcoming festivals within the next 7 days with rituals and significance
- **Channels**: Email + In-app notification
- **Template**: `festival-reminder.html`

### 3. **Dasha Period Alerts**
- **Schedule**: 9:00 AM daily
- **Recipients**: Users with `notifications.dashaAlerts` enabled and birth details available
- **Content**: Alerts when a new planetary Dasha period begins
- **Channels**: Email + In-app notification
- **Template**: `dasha-alert.html`

### 4. **Auspicious Muhurat Alerts**
- **Schedule**: 7:00 AM daily
- **Recipients**: Users with `notifications.goodMuhurtam` enabled
- **Content**: Good timings for starting important activities
- **Channels**: Email + In-app notification
- **Template**: `muhurat-alert.html`

### 5. **Consultation Reminders**
- **Schedule**: Every 15 minutes
- **Recipients**: Users with confirmed bookings starting in 30 minutes
- **Content**: Reminder about upcoming consultation with consultant details
- **Channels**: Email + SMS + In-app + Push notification
- **Template**: `consultation-reminder.html`

## Architecture

### Core Components

1. **astrologyNotificationScheduler.js**
   - Main scheduler service using `node-cron`
   - Manages all scheduled notification jobs
   - Singleton pattern for single instance across server

2. **Email Templates** (`backend/templates/emails/astrology/`)
   - Responsive HTML email templates
   - Template variables using `{{placeholder}}` syntax
   - Professional design with gradients and mobile-friendly layout

3. **NotificationService Integration**
   - Leverages existing NotificationService for email/SMS delivery
   - Creates in-app notifications for real-time updates
   - Supports push notifications for mobile apps

## Setup Instructions

### 1. Install Dependencies
```bash
npm install node-cron
```

### 2. Environment Variables
Add to your `.env` file:
```env
# Frontend URL for email links
FRONTEND_URL=http://localhost:3000

# Email service (if using external provider)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS service (if using Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Disable background services (for testing)
DISABLE_BACKGROUND_SERVICES=false
```

### 3. Server Integration
The scheduler is automatically initialized in `backend/server.js`:
```javascript
const { getInstance: getAstrologyScheduler } = require('./services/astrologyNotificationScheduler');

// Start scheduler
getAstrologyScheduler().initialize();

// Stop scheduler on shutdown
getAstrologyScheduler().stopAll();
```

## Usage

### Starting the Scheduler
The scheduler starts automatically when the server boots:
```bash
npm run dev
# or
npm start
```

### Manual Control
```javascript
const { getInstance } = require('./services/astrologyNotificationScheduler');

// Get scheduler instance
const scheduler = getInstance();

// Initialize (starts all jobs)
await scheduler.initialize();

// Stop all jobs
scheduler.stopAll();
```

## Notification Preferences

Users can control notifications through their astrology profile:

### User Profile Schema
```javascript
{
  notifications: {
    dailyHoroscope: Boolean,      // Daily horoscope emails
    goodMuhurtam: Boolean,         // Auspicious time alerts
    festivalReminders: Boolean,    // Festival notifications
    dashaAlerts: Boolean           // Dasha period alerts
  },
  preferences: {
    receiveDailyHoroscope: Boolean // Additional horoscope preference
  }
}
```

### Frontend Integration
Users manage preferences at: `/astrology/settings`

## Email Template System

### Template Structure
Templates use simple placeholder replacement:
```html
<h1>Hello {{userName}}</h1>
<p>Your sign: {{zodiacSign}}</p>
```

### Available Placeholders

**Daily Horoscope:**
- `{{userName}}`, `{{zodiacSign}}`, `{{zodiacEmoji}}`
- `{{horoscopeText}}`, `{{luckyNumber}}`, `{{luckyColor}}`
- `{{lovePercentage}}`, `{{careerPercentage}}`, `{{healthPercentage}}`
- `{{date}}`, `{{dashboardUrl}}`, `{{unsubscribeUrl}}`

**Consultation Reminder:**
- `{{userName}}`, `{{consultantName}}`, `{{slotTime}}`
- `{{confirmationCode}}`, `{{consultationUrl}}`

**Festival Reminder:**
- `{{userName}}`, `{{festivalName}}`, `{{festivalDate}}`
- `{{significance}}`, `{{ritualsList}}`, `{{festivalTip}}`

**Dasha Alert:**
- `{{userName}}`, `{{planetName}}`, `{{startDate}}`, `{{duration}}`
- `{{dashaDescription}}`, `{{recommendationsList}}`

**Muhurat Alert:**
- `{{userName}}`, `{{muhuratDate}}`, `{{muhuratTime}}`
- `{{suitableFor}}`, `{{activitiesList}}`

### Creating Custom Templates
1. Create HTML file in `backend/templates/emails/astrology/`
2. Use `{{placeholder}}` for dynamic content
3. Load template using `loadEmailTemplate('filename.html')`
4. Replace placeholders with `replaceTemplatePlaceholders(template, data)`

## Cron Schedule Reference

| Job | Schedule | Description |
|-----|----------|-------------|
| Daily Horoscope | `0 6 * * *` | 6:00 AM daily |
| Festival Reminders | `0 8 * * *` | 8:00 AM daily |
| Dasha Alerts | `0 9 * * *` | 9:00 AM daily |
| Muhurat Alerts | `0 7 * * *` | 7:00 AM daily |
| Consultation Reminders | `*/15 * * * *` | Every 15 minutes |

## Data Sources

### Production Implementation Needed

1. **Festival Calendar**: Replace `getUpcomingFestivals()` with actual festival database or API
2. **Dasha Calculations**: Implement `checkDashaPeriod()` with proper Vedic astrology calculations
3. **Muhurat Calculator**: Replace `getTodayMuhurat()` with Panchang API integration
4. **Lucky Numbers/Colors**: Connect to actual astrological calculation engine

### Recommended APIs
- **Panchang Data**: VedicRishi API, AstroSage API
- **Vedic Calculations**: Swiss Ephemeris, Jagannatha Hora
- **Festival Calendar**: Custom database with regional festivals

## Testing

### Test Individual Jobs
```javascript
const { getInstance } = require('./services/astrologyNotificationScheduler');
const scheduler = getInstance();

// Test daily horoscope
await scheduler.sendDailyHoroscopes();

// Test festival reminders
await scheduler.sendFestivalReminders();

// Test consultation reminders
await scheduler.sendConsultationReminders();
```

### Disable in Development
Set environment variable:
```env
DISABLE_BACKGROUND_SERVICES=true
```

## Monitoring

### Logging
All notification jobs log their activity:
```
[INFO] Running daily horoscope notification job
[INFO] Sending daily horoscopes to 150 users
[INFO] Daily horoscope job completed: 148 sent, 2 failed
```

### Error Handling
- Individual user failures don't stop the batch
- Errors are logged with user context
- Jobs continue on next schedule even if one run fails

## Performance Considerations

1. **Batch Limits**: Current limit of 1000 users per job run
2. **Rate Limiting**: Consider implementing email/SMS rate limits
3. **Queue System**: For large user bases, use job queues (Bull, BullMQ)
4. **Email Throttling**: Implement delays between sends if needed

## Security

1. **User Data**: Only sends to users with verified email/phone
2. **Unsubscribe**: All emails include preference management link
3. **Template Injection**: All user data is sanitized before template insertion
4. **PII Protection**: Logs don't include sensitive user information

## Future Enhancements

1. **Timezone Support**: Send notifications based on user timezone
2. **Frequency Control**: Allow users to choose notification frequency
3. **A/B Testing**: Test different email templates and timings
4. **Analytics**: Track open rates, click rates, and engagement
5. **SMS Templates**: Create dedicated SMS message templates
6. **Push Notifications**: Full push notification support for mobile apps
7. **Webhook Support**: Allow external systems to trigger notifications
8. **Multi-language**: Localized content based on user preferences

## Troubleshooting

### Notifications Not Sending
1. Check scheduler is initialized: Look for "AstrologyNotificationScheduler initialized successfully" in logs
2. Verify user preferences: Ensure `notifications.*` fields are enabled
3. Check email service: Verify SMTP credentials or email service configuration
4. Review logs: Search for error messages in application logs

### Wrong Schedule Times
1. Verify server timezone settings
2. Check cron expression syntax
3. Ensure server time is synchronized (NTP)

### Template Issues
1. Verify template file exists in correct directory
2. Check placeholder names match exactly
3. Ensure HTML is well-formed

## Support
For issues or questions, contact the development team or refer to the main documentation.
