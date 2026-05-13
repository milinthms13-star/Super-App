# Gulf Services User Manual (Front-End)

> Module: `src/modules/gulfservices/GulfServices.js`  
> Product name in UI: **Gulf Services** (Complete Gulf Support Hub)

## 1) What this module does
Gulf Services is a Gulf-support hub for Kerala families with Gulf connections. It provides:
- **Visa Assistance & Tracking** (visit, employment, family, renewal)
- **Gulf Jobs & Interview Support** (verified recruiter-style job listing cards)
- Document-focused support overview
- Travel, medical/PCC, returnee, and NRI service guidance

## 2) Entry point in the app
1. Open **Gulf Services** from main navigation/menu.

## 3) Hero: start the journey
In the top hero:
- You can choose quick actions:
  - **Start Visa Support**
  - **Explore Gulf Jobs**
- A right-side summary explains key value areas:
  - Visa Reminders
  - Verified Recruiters
  - Attestation Tracking

## 4) Quick action cards
You’ll see a grid of “quick action” tiles, each with a short subtitle. These represent:
- Visa Assistance
- Gulf Jobs
- Document Attestation
- Travel Support
- Medical & PCC
- Returnee Help

## 5) Main panel: Visa + Jobs
The module is split into two columns.

### 5.1 Left column: Visa Assistance & Tracking
Read the list of supported steps:
- Visit visa processing and support
- Employment visa guidance and document review
- Family visa assistance and sponsor coordination
- Renewal reminders and status updates

### 5.2 Right column: Gulf Jobs & Interview Support
This column includes:
1. A country selector with buttons:
   - UAE, Saudi Arabia, Qatar, Oman, Kuwait, Bahrain
2. A Gulf job list that updates when you change the country

Each job card shows:
- title (category opportunities in selected country)
- company (demo list)
- summary text (verified recruiter style)

## 6) Support features overview
A “Ready for every Gulf need” section lists major services:
- Travel Support (flights, insurance, forex, SIM setup)
- Document Attestation (MEA/embassy/HRD tracking + delivery)
- Medical & PCC (GAMCA medical + PCC guidance)
- Returnee Support (re-entry jobs, business setup, NRI services)
- NRI Services (bank account support, money transfer links, legal consult, property management)
- Emergency & Alerts (expiry reminders, document vault, Gulf SOS support)

## 7) Troubleshooting
- Country selection doesn’t change jobs:
  - click a different country button again; job cards are generated from internal state
- Expectation mismatch:
  - this module currently presents job/visa content as UI cards and guidance (demo-style) rather than a full transactional booking flow.

## 8) UI sections reference (quick)
- Hero with Start Visa Support / Explore Gulf Jobs actions
- Quick action tiles grid
- Two-column panel:
  - Visa Assistance & Tracking
  - Country selector + Gulf Jobs list
- Support features overview grid
