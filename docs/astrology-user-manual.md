# AstroNila Astrology Module User Manual

## Overview

AstroNila’s Astrology module helps users explore daily horoscope readings, save birth details, generate Kundli reports, check compatibility, book consultations, and review astrology analytics where permitted.

The module is designed around a few simple entry points:

- **Today** for daily horoscope and personalized guidance
- **Kundli** for birth-profile-based readings and report generation
- **Consult** for booking astrology consultations
- **Saved Reports** for past readings and generated histories
- **Profile** for birth details and preferences
- **Analytics** for admin-only operational insights

## Who can use it

### Regular users
Can:
- View zodiac signs and daily horoscope content
- Save a personal astrology profile
- Generate Kundli and horoscope reports
- Book consultation slots
- View saved readings and past reports

### Consultants
Can:
- Access consultant dashboard features
- Manage availability and bookings
- Update consultant profile data

### Admins
Can:
- Access consultant data and analytics dashboard
- Download analytics reports
- Review operational alerts and trends

## Getting started

1. Open the **Astrology** module from the app.
2. Select your zodiac sign from the sign strip.
3. Use the tab bar to move between features.
4. Fill out your profile details if you want personalized readings.
5. Save your profile to keep birth details and reading history.

## Main features

## 1. Today view

The **Today** tab shows:

- Your daily horoscope
- Sign-specific advice
- Career and finance guidance
- Remedy suggestions
- Panchangam summary
- Festival updates
- Prediction cards and future outlook summaries

### What you can do
- Change your zodiac sign
- Save a quick astrology profile
- Generate a report
- Download horoscope reports
- Ask the in-app astrology assistant

## 2. Zodiac sign selection

The module includes all 12 zodiac signs:

- Aries
- Taurus
- Gemini
- Cancer
- Leo
- Virgo
- Libra
- Scorpio
- Sagittarius
- Capricorn
- Aquarius
- Pisces

Each sign shows:
- Name
- Date range
- Element
- Horoscope preview

Tap a sign chip to switch the module content to that sign.

## 3. Profile settings

Use **Profile** to store your birth and preference details.

### Fields available
- Birth date
- Birth time
- Birth place
- Birth timezone
- Gender
- Favorite topics

### Why it matters
Profile data helps personalize:
- Daily horoscope readings
- Kundli generation
- Saved astrology history
- Report summaries

### Saving profile data
1. Open the **Profile** tab.
2. Fill in your details.
3. Tap **Save profile**.

## 4. Kundli view

The **Kundli** tab focuses on birth-based astrology.

### You can:
- Enter birth details
- Choose birth place and timezone
- Set nakshatra details
- Generate a Kundli report
- Download a PDF report
- Review planet chart summaries

### Recommended inputs
For best results, enter:
- Accurate birth date
- Accurate birth time
- Correct birth place
- Correct timezone

If you do not know your exact details, the module still works with partial data, but the reading may be less specific.

## 5. Compatibility check

The **Match** section helps compare zodiac signs for compatibility.

### How to use
1. Select your sign.
2. Select your partner’s sign.
3. Tap **Check porutham**.

The result shows:
- Compatibility score
- Short summary
- Guidance note if applicable

## 6. Remedies

The **Remedies** section provides practical astrology suggestions for the selected sign.

These may include:
- Routine suggestions
- Focus and discipline tips
- Calm communication advice
- Spiritual or reflective practices

## 7. Panchangam

The **Panchangam** section shows daily calendar-style astrological details such as:
- Tithi
- Nakshatra
- Rahu Kalam
- Yamagandam
- Sunrise and sunset values

It also includes festival updates.

## 8. AI Astrology

The **AI** section lets you ask an astrology-related question.

### Use it for:
- Career concerns
- Relationship guidance
- General day planning
- Remedies and routines

### How to ask
1. Open the **AI** tab.
2. Enter your question.
3. Tap **Ask now**.

## 9. Saved Reports

The **Saved** tab helps you revisit previous astrology content.

You can see:
- Saved daily reports
- Saved Kundli entries
- History of previously generated reports

Tap any saved entry to reopen it.

## 10. Consultation booking

The **Consult** section is used to book time with astrology consultants.

### Typical steps
1. Open the consultant list.
2. Choose an available slot.
3. Confirm booking details.
4. Complete payment if required.
5. Track consultation status from the app.

## 11. Consultant dashboard

Consultants can use this area to:
- Review bookings
- Manage slots
- Update profile information
- View earnings summaries

## 12. Analytics dashboard

Admins can access analytics features to monitor:
- Booking totals
- Revenue
- Ratings
- User retention
- Consultant performance
- Operational alerts
- Exportable reports

## Navigation tips

### Top header
Contains:
- App branding
- Search field
- Language toggle
- Profile shortcut
- Menu with quick links

### Mobile bottom nav
The bottom navigation bar gives fast access to:
- Today
- Kundli
- Consult
- Saved
- Profile

## Language support

The module supports English and Malayalam UI text in the main astrology home screen.

To switch:
- Tap the language button in the top bar

## Common actions

### Search
Use the search bar to quickly find:
- A zodiac sign
- A module feature

### Save profile
Use this when you want readings to reflect your birth data.

### Download reports
Use the download buttons in:
- Kundli
- Horoscope report sections
- Analytics reports for admin users

## Troubleshooting

### I cannot see personalized results
Make sure your profile has:
- Birth date
- Birth time
- Birth place
- Correct timezone

### A report will not download
Check that:
- You are signed in
- The selected tab has finished loading
- The browser allows downloads

### A consultation slot is missing
The consultant may have:
- Removed the slot
- Reassigned availability
- Updated the booking schedule

### Analytics is unavailable
Analytics is restricted to admin users only.

## Best practices

- Enter accurate birth details for better readings
- Save your profile before generating Kundli reports
- Use the saved reports area to revisit important readings
- Use consultation booking only after reviewing available slots
- Keep your timezone consistent with your birth data

## Related files

Useful implementation files for this module:

- `src/modules/astrology/AstrologyHome.js`
- `src/modules/astrology/AnalyticsDashboard.js`
- `src/modules/astrology/ConsultantAdminPanel.js`
- `src/services/astrologyService.js`
- `backend/routes/astrology.js`
- `backend/utils/astrologyData.js`
- `backend/models/AstrologyUserProfile.js`

## Module status

The module includes both frontend and backend support for:
- Daily horoscope generation
- Profile storage
- Consultation workflows
- Report generation
- Analytics dashboards

Some screens depend on authenticated user context and available backend services.
