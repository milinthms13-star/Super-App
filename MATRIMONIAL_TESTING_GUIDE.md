# Matrimonial Module - Complete Testing Guide

**Version:** 1.0  
**Date:** July 15, 2026  
**Scope:** Phases 1-4 Testing  

---

## 🎯 TESTING OVERVIEW

This guide provides comprehensive testing procedures for all implemented features in Phases 1-4 of the matrimonial module.

---

## 🧪 1. PHASE 1 TESTING: COMMUNICATION & PHOTOS

### 1.1 Multi-Photo Gallery Testing

**Test Case 1: Photo Upload**
```
Steps:
1. Login to matrimonial profile
2. Navigate to Photo Gallery
3. Click "Upload Photo"
4. Select image (JPG/PNG, max 5MB)
5. Verify upload progress
6. Verify photo appears in gallery

Expected: Photo uploads successfully, thumbnail generated
```

**Test Case 2: Set Primary Photo**
```
Steps:
1. Upload multiple photos (3-5)
2. Click "Set as Primary" on any photo
3. Verify primary badge appears
4. Check profile card shows this photo

Expected: Selected photo becomes primary display photo
```

**Test Case 3: Reorder Photos**
```
Steps:
1. Upload 5+ photos
2. Drag photo from position 3 to position 1
3. Verify order changes
4. Refresh page
5. Verify order persists

Expected: Photos reorder correctly and save
```

**Test Case 4: Delete Photo**
```
Steps:
1. Click delete icon on any photo
2. Confirm deletion
3. Verify photo removed from gallery
4. Verify count updates

Expected: Photo deleted successfully
```

---

### 1.2 Enhanced Chat Testing

**Test Case 5: Send Text Message**
```
Steps:
1. Open chat with a match
2. Type text message
3. Press Enter or click Send
4. Verify message appears in chat
5. Verify timestamp shows

Expected: Message sent and displayed correctly
```

**Test Case 6: Send Voice Note**
```
Steps:
1. Click microphone icon
2. Allow microphone permission
3. Record 5-10 second voice note
4. Click send
5. Verify audio player appears
6. Play back audio

Expected: Voice note records and plays correctly
```

**Test Case 7: Share Image**
```
Steps:
1. Click image icon
2. Select image from device
3. Verify preview shows
4. Click send
5. Verify image displays in chat
6. Click image to view full size

Expected: Image shares and displays correctly
```

**Test Case 8: Add Reaction**
```
Steps:
1. Hover over any message
2. Click reaction icon
3. Select emoji (❤️, 👍, 😊, etc.)
4. Verify reaction appears below message
5. Click again to remove

Expected: Reactions add/remove correctly
```

---

### 1.3 Success Stories Testing

**Test Case 9: Submit Success Story**
```
Steps:
1. Navigate to Success Stories
2. Click "Share Your Story"
3. Fill form (both names, story, wedding date)
4. Upload photo
5. Submit
6. Verify success message

Expected: Story submitted for admin approval
```

**Test Case 10: View Success Stories**
```
Steps:
1. Navigate to Success Stories page
2. Verify stories display in grid
3. Click on a story
4. Verify full story opens in modal
5. Test pagination (Next/Previous)

Expected: Stories display and navigate correctly
```

---

### 1.4 Notifications Testing

**Test Case 11: Configure Notification Preferences**
```
Steps:
1. Go to Notification Settings
2. Toggle Email notifications ON
3. Toggle SMS notifications OFF
4. Set quiet hours (10 PM - 8 AM)
5. Save preferences
6. Verify success message

Expected: Preferences save correctly
```

**Test Case 12: Receive Notifications**
```
Steps:
1. Have another user send you an interest
2. Check email inbox
3. Verify notification received
4. Click link in email
5. Verify redirects to profile

Expected: Notification received and link works
```

---

### 1.5 Saved Searches Testing

**Test Case 13: Save Search**
```
Steps:
1. Apply filters (age, location, education)
2. Click "Save Search"
3. Enter name "Mumbai Engineers"
4. Select alert frequency "Daily"
5. Save
6. Verify appears in Saved Searches

Expected: Search saved successfully
```

**Test Case 14: Use Saved Search**
```
Steps:
1. Go to Saved Searches
2. Click on saved search name
3. Verify filters applied
4. Verify results match criteria

Expected: Saved search loads correctly
```

---

## 🔐 2. PHASE 2 TESTING: TRUST & VERIFICATION

### 2.1 Document Verification Testing

**Test Case 15: Upload Aadhaar Card**
```
Steps:
1. Go to Verification Center
2. Select "Government ID"
3. Choose "Aadhaar Card"
4. Upload front and back images
5. Submit
6. Verify status shows "Pending Review"

Expected: Documents upload and status updates
```

**Test Case 16: Upload Income Proof**
```
Steps:
1. Select "Income Verification"
2. Upload latest salary slip
3. Submit
4. Verify in verification history

Expected: Income document uploaded successfully
```

**Test Case 17: Employment Verification**
```
Steps:
1. Select "Employment Verification"
2. Enter LinkedIn profile URL
3. Upload offer letter
4. Submit
5. Check status

Expected: Employment verification initiated
```

---

### 2.2 Trust Score Testing

**Test Case 18: Check Initial Trust Score**
```
Steps:
1. View profile
2. Check trust score badge
3. Verify shows Bronze (0-39)
4. Click badge for details
5. Verify breakdown shows

Expected: Trust score calculated correctly
```

**Test Case 19: Increase Trust Score**
```
Steps:
1. Complete email verification (+10)
2. Complete phone verification (+10)
3. Upload photo ID (+20)
4. Refresh trust score
5. Verify score increased to 40+ (Silver)

Expected: Trust score updates correctly
```

---

### 2.3 Video Profile Testing

**Test Case 20: Record Video Profile**
```
Steps:
1. Go to Video Profile section
2. Click "Record Video"
3. Allow camera permission
4. Record 30-second intro
5. Review recording
6. Submit
7. Verify shows "Under Review"

Expected: Video records and uploads successfully
```

---

## 🔮 3. PHASE 3 TESTING: ASTROLOGY & CULTURE

### 3.1 Kundali Generation Testing

**Test Case 21: Generate Kundali**
```
Steps:
1. Go to Astrology Hub
2. Enter birth details:
   - Date: 15/01/1995
   - Time: 10:30 AM
   - Place: Mumbai, India
3. Click "Generate Kundali"
4. Verify Kundali displays
5. Check planetary positions
6. Verify Rashi and Nakshatra shown

Expected: Kundali generates with all details
```

**Test Case 22: Download Kundali PDF**
```
Steps:
1. View generated Kundali
2. Click "Download PDF"
3. Verify PDF downloads
4. Open PDF
5. Verify contains birth chart, planets, doshas

Expected: PDF generates and downloads correctly
```

---

### 3.2 Guna Milan Testing

**Test Case 23: Calculate Guna Milan**
```
Steps:
1. Go to Guna Milan calculator
2. Enter your Kundali details
3. Enter partner's Kundali details
4. Click "Calculate Compatibility"
5. Verify score displays (0-36)
6. Check 8 guna breakdown
7. Verify recommendations shown

Expected: Guna Milan calculates correctly
```

---

### 3.3 Dosha Detection Testing

**Test Case 24: Check Mangal Dosha**
```
Steps:
1. View Kundali
2. Check Dosha section
3. Verify Mangal Dosha status
4. If present, check severity level
5. Verify remedies shown

Expected: Dosha detected accurately
```

---

### 3.4 Auspicious Dates Testing

**Test Case 25: Find Auspicious Dates**
```
Steps:
1. Go to Auspicious Dates
2. Select month (e.g., December 2026)
3. Select event type "Marriage"
4. Click "Find Dates"
5. Verify auspicious dates highlighted
6. Check Muhurat timings
7. Verify inauspicious dates marked

Expected: Auspicious dates calculated correctly
```

---

### 3.5 Multi-Language Testing

**Test Case 26: Change Language**
```
Steps:
1. Click language dropdown
2. Select "हिंदी" (Hindi)
3. Verify UI text changes
4. Navigate to different pages
5. Verify all text translated
6. Change back to English

Expected: Language switches correctly
```

---

## 👨‍👩‍👧 4. PHASE 4 TESTING: FAMILY PORTAL & ADVANCED MATCHING

### 4.1 Family Portal Testing

**Test Case 27: Add Family Member**
```
Steps:
1. Go to Family Portal
2. Click "Add Family Member"
3. Enter details:
   - Name: "Rajesh Kumar"
   - Relationship: "Father"
   - Email: "rajesh@example.com"
   - Phone: "+91 9876543210"
4. Set permissions (select 5/9)
5. Submit
6. Verify invitation email sent

Expected: Family member added, email sent
```

**Test Case 28: Accept Invitation**
```
Steps:
1. Open invitation email
2. Click "Accept Invitation" link
3. Login/register
4. Verify access granted
5. Check available features match permissions

Expected: Invitation accepted, access granted
```

**Test Case 29: Update Permissions**
```
Steps:
1. Go to Family Portal
2. Select family member
3. Toggle "Send Interests" ON
4. Toggle "Access Chat" OFF
5. Save changes
6. Verify permissions updated

Expected: Permissions update correctly
```

**Test Case 30: View Activity Log**
```
Steps:
1. Click "View Activity Log"
2. Verify shows family member actions
3. Check timestamps
4. Verify details (IP, device)
5. Filter by member
6. Export log

Expected: Activity log displays correctly
```

---

### 4.2 Compatibility Questionnaire Testing

**Test Case 31: Start Questionnaire**
```
Steps:
1. Go to Compatibility Questionnaire
2. Start with "Personality & Values"
3. Answer 3-4 questions
4. Click "Save Progress"
5. Verify completion % updates
6. Close and reopen
7. Verify answers saved

Expected: Progress saves automatically
```

**Test Case 32: Complete Full Questionnaire**
```
Steps:
1. Complete all 6 categories (50 questions)
2. Verify each category shows completed
3. Check completion shows 100%
4. Verify all question types work:
   - Single choice
   - Multiple choice
   - Scale (1-10)
   - Text input

Expected: All questions save correctly
```

**Test Case 33: Calculate Compatibility**
```
Steps:
1. Complete questionnaire
2. Select a match who also completed it
3. Click "Calculate Compatibility"
4. Verify score displays (0-100)
5. Check category breakdown (6 categories)
6. Read analysis (strengths, concerns, recommendations)

Expected: Compatibility calculates accurately
```

---

### 4.3 Meeting Scheduler Testing

**Test Case 34: Create Meeting**
```
Steps:
1. Go to Meeting Scheduler
2. Click "Schedule Meeting"
3. Select type: "First Meeting"
4. Enter title: "Coffee at Starbucks"
5. Choose location type: "Physical"
6. Enter venue details
7. Add 3 proposed dates
8. Add attendees
9. Submit

Expected: Meeting created successfully
```

**Test Case 35: Vote on Date**
```
Steps:
1. Open meeting details
2. View proposed dates
3. Vote "Yes" on 1st date
4. Vote "Maybe" on 2nd date
5. Vote "No" on 3rd date
6. Verify votes recorded

Expected: Votes save correctly
```

**Test Case 36: Finalize Meeting**
```
Steps:
1. Check vote results
2. Click "Finalize Meeting"
3. Select winning date
4. Confirm
5. Verify status changes to "Scheduled"
6. Check reminders set

Expected: Meeting finalized, reminders scheduled
```

**Test Case 37: Submit Meeting Feedback**
```
Steps:
1. Wait for meeting to pass (or change date manually)
2. Open meeting details
3. Click "Submit Feedback"
4. Rate experience (4/5 stars)
5. Select interest level "Interested"
6. Add comments
7. Suggest next step
8. Submit

Expected: Feedback submitted successfully
```

---

### 4.4 Behavioral Learning Testing

**Test Case 38: Log Interactions**
```
Steps:
1. View 10 different profiles
2. Like 3 profiles
3. Skip 2 profiles
4. Send interest to 1 profile
5. Go to Behavioral Insights
6. Verify all interactions logged

Expected: All interactions tracked
```

**Test Case 39: View Preference Patterns**
```
Steps:
1. After 20+ interactions
2. Go to "Preference Patterns"
3. Check attributes detected (age, education, location)
4. Verify frequency counts
5. Check ideal profile generated

Expected: Patterns detected correctly
```

**Test Case 40: Check Deal Breakers**
```
Steps:
1. Skip 5 profiles with same attribute (e.g., smoker)
2. Go to Behavioral Insights
3. Check "Deal Breakers" section
4. Verify attribute detected
5. Check confidence score

Expected: Deal breaker detected if >80% rejection
```

**Test Case 41: Get Smart Recommendations**
```
Steps:
1. After 30+ interactions
2. Click "Smart Recommendations"
3. Verify shows 10 profiles
4. Check they match learned preferences
5. Verify excludes deal-breakers
6. Check excludes already viewed

Expected: Recommendations are relevant
```

**Test Case 42: View Engagement Score**
```
Steps:
1. Go to Behavioral Insights
2. Check engagement score (0-100)
3. View breakdown:
   - Activity level (40 pts)
   - Quality (30 pts)
   - Success rate (30 pts)
4. Read insights

Expected: Score calculated correctly
```

---

## 🔄 5. INTEGRATION TESTING

### 5.1 End-to-End User Journey

**Test Case 43: Complete User Journey**
```
Steps:
1. Register new account
2. Complete profile (100%)
3. Upload 10 photos
4. Record video profile
5. Upload verification documents
6. Generate Kundali
7. Complete compatibility questionnaire
8. Add family member
9. Search for matches
10. Send interest
11. Receive acceptance
12. Start chat conversation
13. Send voice note
14. Schedule meeting
15. Submit feedback

Expected: Complete journey works seamlessly
```

---

### 5.2 Cross-Feature Testing

**Test Case 44: Family + Compatibility**
```
Steps:
1. Family member logs in
2. Views match profile
3. Checks compatibility score
4. Sends interest on behalf

Expected: Family can use compatibility features
```

**Test Case 45: Chat + Meeting**
```
Steps:
1. Chat with match
2. From chat, click "Schedule Meeting"
3. Meeting pre-fills with match details
4. Complete scheduling

Expected: Chat integrates with meeting scheduler
```

---

## 🔍 6. SECURITY TESTING

### 6.1 Authentication Tests

**Test Case 46: Unauthorized Access**
```
Steps:
1. Logout
2. Try to access /api/matrimonial/family/profile/123/members
3. Verify returns 401 Unauthorized

Expected: Protected routes require authentication
```

**Test Case 47: Cross-User Access**
```
Steps:
1. Login as User A
2. Try to access User B's family members
3. Verify returns 403 Forbidden

Expected: Users can't access others' data
```

---

### 6.2 Permission Tests

**Test Case 48: Family Permission Enforcement**
```
Steps:
1. Add family member with only "View Profile" permission
2. Family member logs in
3. Try to send interest
4. Verify action blocked

Expected: Permissions enforced correctly
```

---

## 📊 7. PERFORMANCE TESTING

### 7.1 Load Tests

**Test Case 49: Photo Upload Performance**
```
Steps:
1. Upload 10 photos simultaneously
2. Measure time to completion
3. Check server load
4. Verify all thumbnails generated

Expected: Completes in <30 seconds
```

**Test Case 50: Compatibility Calculation Performance**
```
Steps:
1. Calculate compatibility for 100 profiles
2. Measure response time
3. Check database queries

Expected: Completes in <5 seconds
```

---

### 7.2 Concurrency Tests

**Test Case 51: Concurrent Family Access**
```
Steps:
1. Have 3 family members login simultaneously
2. All view activity log
3. All update profile
4. Verify no conflicts

Expected: Concurrent access works correctly
```

---

## 🐛 8. ERROR HANDLING TESTING

### 8.1 Validation Tests

**Test Case 52: Invalid File Upload**
```
Steps:
1. Try to upload 20MB image
2. Verify error message shown
3. Try to upload .exe file
4. Verify rejected

Expected: Validation prevents invalid uploads
```

**Test Case 53: Required Fields**
```
Steps:
1. Try to create meeting without title
2. Verify error shown
3. Try to send interest without message
4. Verify validation works

Expected: Required fields enforced
```

---

### 8.2 Network Error Tests

**Test Case 54: Offline Behavior**
```
Steps:
1. Disconnect internet
2. Try to send message
3. Verify error message shown
4. Reconnect internet
5. Verify retry option works

Expected: Graceful error handling
```

---

## 📱 9. RESPONSIVE DESIGN TESTING

### 9.1 Mobile Testing

**Test Case 55: Mobile Photo Gallery**
```
Device: iPhone, Android
Steps:
1. Open photo gallery on mobile
2. Verify grid layout adapts
3. Test swipe gestures
4. Test photo upload from camera

Expected: Works smoothly on mobile
```

**Test Case 56: Mobile Chat**
```
Device: iPhone, Android
Steps:
1. Open chat on mobile
2. Test voice note recording
3. Test image upload
4. Verify keyboard behavior

Expected: Mobile chat fully functional
```

---

### 9.2 Tablet Testing

**Test Case 57: Tablet Questionnaire**
```
Device: iPad, Android Tablet
Steps:
1. Complete questionnaire on tablet
2. Verify layout adapts
3. Test all question types
4. Check navigation

Expected: Tablet experience optimized
```

---

## 🌐 10. BROWSER COMPATIBILITY TESTING

### Test Matrix:

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Photo Upload | ✓ | ✓ | ✓ | ✓ |
| Voice Notes | ✓ | ✓ | ✓ | ✓ |
| Video Recording | ✓ | ✓ | ✓ | ✓ |
| Kundali Chart | ✓ | ✓ | ✓ | ✓ |
| Compatibility Quiz | ✓ | ✓ | ✓ | ✓ |
| Meeting Scheduler | ✓ | ✓ | ✓ | ✓ |

**Test each feature in all browsers**

---

## ✅ 11. ACCEPTANCE CRITERIA CHECKLIST

### Phase 1 Acceptance:
- [ ] Can upload 10 photos
- [ ] Can set primary photo
- [ ] Voice notes work in chat
- [ ] Image sharing works
- [ ] Emoji reactions work
- [ ] Success stories display
- [ ] Notifications send correctly
- [ ] Saved searches work

### Phase 2 Acceptance:
- [ ] Can upload verification documents
- [ ] Trust score calculates correctly
- [ ] Video profile records
- [ ] 4 trust tiers work (Bronze/Silver/Gold/Platinum)
- [ ] Admin can approve/reject documents

### Phase 3 Acceptance:
- [ ] Kundali generates correctly
- [ ] Guna Milan calculates 36 points
- [ ] Doshas detected accurately
- [ ] Auspicious dates calculated
- [ ] 10 languages work
- [ ] PDF download works

### Phase 4 Acceptance:
- [ ] Can add family members
- [ ] 9 permissions work correctly
- [ ] Invitation email sends
- [ ] Activity logging works
- [ ] 50-question quiz completes
- [ ] Compatibility scores accurately
- [ ] Meetings can be scheduled
- [ ] Meeting feedback works
- [ ] Behavioral learning tracks interactions
- [ ] Smart recommendations relevant
- [ ] Deal breakers detected
- [ ] Engagement score calculated

---

## 📝 12. BUG REPORTING TEMPLATE

```
Bug ID: MAT-001
Title: [Clear, concise title]
Severity: Critical / High / Medium / Low
Priority: P0 / P1 / P2 / P3

Steps to Reproduce:
1. 
2. 
3. 

Expected Result:
[What should happen]

Actual Result:
[What actually happens]

Environment:
- Browser: Chrome 120
- OS: Windows 11
- Screen: 1920x1080

Screenshots/Videos:
[Attach if applicable]

Additional Notes:
[Any other relevant information]
```

---

## 🎯 13. TEST SUMMARY REPORT TEMPLATE

```
Test Summary Report
Date: [Date]
Tester: [Name]
Build Version: [Version]

Test Statistics:
- Total Test Cases: 57
- Passed: __
- Failed: __
- Blocked: __
- Not Executed: __

Pass Rate: ___%

Critical Bugs: __
High Priority Bugs: __
Medium Priority Bugs: __
Low Priority Bugs: __

Overall Status: PASS / FAIL
Ready for Production: YES / NO

Notes:
[Any additional notes]

Sign-off:
QA Lead: _______________
Product Manager: _______________
```

---

## 🚀 14. PRE-PRODUCTION CHECKLIST

Before going live, verify:

**Infrastructure:**
- [ ] Database backup configured
- [ ] Redis server running
- [ ] S3 buckets created
- [ ] CDN configured
- [ ] SSL certificates installed
- [ ] Environment variables set
- [ ] Monitoring tools active
- [ ] Error tracking enabled (Sentry)

**Third-Party Services:**
- [ ] Email service tested (SendGrid/SES)
- [ ] SMS service tested (MSG91/Twilio)
- [ ] WhatsApp API configured
- [ ] Razorpay payment gateway tested
- [ ] IDfy verification API tested
- [ ] Astrology API tested
- [ ] Video call service tested (Jitsi/Zoom)

**Security:**
- [ ] All routes authenticated
- [ ] Permissions enforced
- [ ] Input validation working
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented
- [ ] Rate limiting configured
- [ ] SSL/HTTPS enforced

**Performance:**
- [ ] Database indexed
- [ ] Images optimized
- [ ] Caching enabled
- [ ] Load testing passed
- [ ] Response times < 2 seconds

**Documentation:**
- [ ] API documentation complete
- [ ] User guides created
- [ ] Admin guides created
- [ ] Support team trained

---

## 📞 SUPPORT CONTACTS

**Development Team:**
- Backend Lead: [Contact]
- Frontend Lead: [Contact]
- DevOps: [Contact]

**Third-Party Support:**
- IDfy Support: support@idfy.com
- Prokerala Support: support@prokerala.com
- AWS Support: [Contact]

---

**Document Version:** 1.0  
**Last Updated:** July 15, 2026  
**Status:** Ready for Testing

---

## ✅ FINAL SIGN-OFF

**QA Lead:** _______________ Date: _______

**Product Manager:** _______________ Date: _______

**Engineering Lead:** _______________ Date: _______

**Approved for Production:** YES / NO
