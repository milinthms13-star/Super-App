# Finance Module - Testing Guide

## 🧪 Complete Testing Checklist

Use this guide to verify all features are working correctly.

---

## 1️⃣ Backend API Testing

### Setup Test Environment
```bash
# Start backend server
cd backend
npm start

# Server should be running on http://localhost:5000
```

### Test with cURL or Postman

#### A. Test Notifications
```bash
curl -X POST http://localhost:5000/api/finance/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "test123",
    "channel": "sms",
    "template": "welcome",
    "phone": "9876543210"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "notificationId": "notif_...",
  "mockMode": true
}
```

#### B. Test Credit Bureau
```bash
curl -X POST http://localhost:5000/api/finance/credit-bureau/check \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "test123",
    "fullName": "Test User",
    "pan": "ABCDE1234F",
    "dob": "1990-01-01"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "creditScore": 750,
  "riskLevel": "medium",
  "bureau": "cibil",
  "mockMode": true
}
```

#### C. Test Fraud Detection
```bash
curl -X POST http://localhost:5000/api/finance/fraud/check \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "test123",
    "phone": "9876543210",
    "email": "test@example.com",
    "ipAddress": "192.168.1.1"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "riskScore": 35,
  "checks": {
    "duplicateCheck": { "passed": true },
    "velocityCheck": { "passed": true },
    "blacklistCheck": { "passed": true }
  }
}
```

#### D. Test CRM Activities
```bash
# Create a call log
curl -X POST http://localhost:5000/api/finance/crm/calls \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "test123",
    "duration": 300,
    "outcome": "positive",
    "notes": "Customer interested in loan"
  }'

# Create a note
curl -X POST http://localhost:5000/api/finance/crm/notes \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "test123",
    "content": "Follow up next week",
    "category": "follow_up"
  }'

# Create a task
curl -X POST http://localhost:5000/api/finance/crm/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "test123",
    "title": "Send documents",
    "dueDate": "2024-12-15",
    "priority": "high"
  }'

# Get all activities
curl http://localhost:5000/api/finance/crm/activities/test123
```

#### E. Test Workflow
```bash
# Get workflow stats
curl http://localhost:5000/api/finance/workflow/stats

# Auto-assign a lead
curl -X POST http://localhost:5000/api/finance/workflow/assign-lead \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "test123",
    "strategy": "load-balanced"
  }'
```

---

## 2️⃣ Frontend Component Testing

### Setup Test Environment
```bash
# Start frontend development server
npm run dev

# Open browser: http://localhost:3000
```

### Navigate to Finance Module
```
Home → Finance Hub
```

### Test Sequence

#### Test 1: Language Switcher
- [ ] Click language icon in top-right corner
- [ ] Select Malayalam (മലയാളം)
- [ ] Verify dropdown shows native language names
- [ ] Switch back to English
- [ ] Check console for language change logs

#### Test 2: Advanced Tools Tab
- [ ] Click "Advanced Tools" tab in main navigation
- [ ] Verify sub-tabs appear: CRM, Credit, Documents, Fraud, Reports
- [ ] Admin users should see: Workflow, Analytics, Institutions
- [ ] Verify role-based visibility

#### Test 3: CRM Panel
- [ ] Go to Advanced Tools → CRM Activities
- [ ] Verify 5 tabs: Timeline, Calls, Notes, Tasks, Meetings
- [ ] Click "Timeline" tab
  - [ ] Should show empty state or loading indicator
- [ ] Click "Log Call" tab
  - [ ] Fill in: Duration = 300, Outcome = Positive, Notes = "Test call"
  - [ ] Click "Log Call" button
  - [ ] Verify success message
  - [ ] Check Timeline tab for new entry
- [ ] Click "Add Note" tab
  - [ ] Fill in: Note content, select category
  - [ ] Click "Add Note"
  - [ ] Verify appears in Timeline
- [ ] Click "Create Task" tab
  - [ ] Fill in: Title, Due Date, Priority
  - [ ] Click "Create Task"
  - [ ] Verify appears in Timeline
- [ ] Click "Schedule Meeting" tab
  - [ ] Fill in: Title, Date/Time, Location
  - [ ] Click "Schedule Meeting"
  - [ ] Verify appears in Timeline

#### Test 4: Credit Bureau Viewer
- [ ] Go to Advanced Tools → Credit Bureau
- [ ] Click "Check Credit Bureau" button
- [ ] Wait for loading
- [ ] Verify credit score display (300-900 range)
- [ ] Check risk level indicator (Low/Medium/High)
- [ ] Verify account summary section
- [ ] Check insights and recommendations
- [ ] Verify mock mode banner shows

#### Test 5: Document Verification Panel
- [ ] Go to Advanced Tools → Document Verification
- [ ] Click "Upload Documents" button
- [ ] Select multiple files (PDF, JPG, PNG)
- [ ] Click "Verify Documents"
- [ ] Wait for processing
- [ ] Verify OCR text extraction displays
- [ ] Check quality scores for each document
- [ ] Verify DigiLocker status (if implemented)

#### Test 6: Fraud Detection Widget
- [ ] Go to Advanced Tools → Fraud Detection
- [ ] Click "Run Fraud Check" button
- [ ] Wait for analysis
- [ ] Verify risk score gauge (0-100)
- [ ] Check all fraud checks:
  - [ ] Duplicate check
  - [ ] Velocity check
  - [ ] Blacklist check
  - [ ] IP reputation
  - [ ] Device fingerprint
- [ ] Verify color-coded risk level
- [ ] Check recommendations section

#### Test 7: Reports Panel
- [ ] Go to Advanced Tools → Reports
- [ ] Verify analytics summary cards display
- [ ] Click filter icon
- [ ] Select report type: "Summary Report"
- [ ] Set date range: Last 30 days
- [ ] Select status: "All Statuses"
- [ ] Click "Apply Filters"
- [ ] Click "Download PDF" button
  - [ ] Verify PDF downloads
  - [ ] Open PDF and verify content
- [ ] Click "Download Excel" button
  - [ ] Verify Excel file downloads
  - [ ] Open in Excel/LibreOffice and verify data

#### Test 8: Task Manager Widget (Consultants/Admins Only)
- [ ] Login as consultant or admin
- [ ] Go to Advanced Tools
- [ ] Verify Task Manager Widget at top
- [ ] Check pending tasks list
- [ ] Verify priority indicators:
  - [ ] Red = Overdue
  - [ ] Orange = Due Today
  - [ ] Yellow = Urgent (next 3 days)
- [ ] Click checkbox on a task
  - [ ] Verify task marked as completed
  - [ ] Check API call in Network tab
- [ ] Click collapse/expand button
  - [ ] Verify widget collapses/expands

#### Test 9: Workflow Automation (Admins Only)
- [ ] Login as admin
- [ ] Go to Advanced Tools → Workflow Automation
- [ ] Verify workflow statistics cards
- [ ] Toggle "Enable Auto-Assignment"
  - [ ] Verify switch changes state
- [ ] Select assignment strategy: "Round Robin"
- [ ] Toggle "Enable SLA Monitoring"
- [ ] Set SLA time: 48 hours
- [ ] Toggle "Enable Auto Follow-up"
- [ ] Set follow-up interval: 3 days
- [ ] Click "Save Workflow Settings"
  - [ ] Verify success message
- [ ] Click "Test Workflow"
  - [ ] Verify test completes successfully

#### Test 10: Analytics Charts (Admins Only)
- [ ] Login as admin
- [ ] Go to Advanced Tools → Analytics
- [ ] Select time range: "Last 30 Days"
- [ ] Verify summary cards display
- [ ] Check chart placeholders:
  - [ ] Lead Trend Over Time
  - [ ] Conversion Funnel
  - [ ] Lead Status Distribution
- [ ] Verify installation note for chart libraries
- [ ] If recharts installed, verify charts render

#### Test 11: Institution Portal
- [ ] Go to Advanced Tools → Institution Portal
- [ ] Verify "All Institutions" tab
  - [ ] Should show grid of institution cards
- [ ] Click "Add Institution" button
  - [ ] Fill in: Name, Type, Contact details
  - [ ] Click "Save"
  - [ ] Verify new institution appears in grid
- [ ] Click "View Details" on an institution
  - [ ] Verify "Institution Details" tab opens
  - [ ] Check leads table
  - [ ] Verify data displays correctly
- [ ] Click "Analytics" tab
  - [ ] Verify stats cards display
  - [ ] Check Total Leads, Approved, Conversion Rate
- [ ] Click "Edit" on an institution
  - [ ] Update contact person name
  - [ ] Click "Save"
  - [ ] Verify changes saved

---

## 3️⃣ Integration Testing

### End-to-End Flow Test

#### Scenario: Complete Lead Journey

1. **Create a Lead**
   - [ ] Go to Finance Hub → Apply tab
   - [ ] Fill in lead form completely
   - [ ] Upload documents
   - [ ] Submit lead
   - [ ] Note the Lead ID

2. **View in Tracking Dashboard**
   - [ ] Go to Track Status tab
   - [ ] Enter phone number
   - [ ] Click "Track Applications"
   - [ ] Verify lead appears in list
   - [ ] Note lead status

3. **Access Advanced Tools**
   - [ ] Click "View Advanced Tools" on the lead
   - [ ] Verify navigates to Advanced Tools tab
   - [ ] Verify Lead ID is pre-filled

4. **Log CRM Activity**
   - [ ] Go to CRM Activities tab
   - [ ] Log a phone call
   - [ ] Add a follow-up note
   - [ ] Create a task
   - [ ] Schedule a meeting
   - [ ] Verify all appear in Timeline

5. **Run Credit Check**
   - [ ] Go to Credit Bureau tab
   - [ ] Click "Check Credit Bureau"
   - [ ] Verify score displays
   - [ ] Check risk analysis

6. **Verify Documents**
   - [ ] Go to Document Verification tab
   - [ ] Upload Aadhaar and PAN
   - [ ] Click "Verify Documents"
   - [ ] Check OCR results
   - [ ] Verify quality scores

7. **Check for Fraud**
   - [ ] Go to Fraud Detection tab
   - [ ] Click "Run Fraud Check"
   - [ ] Verify risk score
   - [ ] Check all fraud checks pass

8. **Generate Report**
   - [ ] Go to Reports tab
   - [ ] Select "Detailed Report"
   - [ ] Download PDF
   - [ ] Verify PDF contains:
     - [ ] Lead details
     - [ ] Credit score
     - [ ] Document status
     - [ ] Fraud check results
     - [ ] CRM timeline

9. **Update Status (Consultant/Admin)**
   - [ ] Go back to Tracking Dashboard
   - [ ] Update lead status to "Approved"
   - [ ] Add status note
   - [ ] Verify status updates in UI

10. **View Analytics (Admin)**
    - [ ] Go to Advanced Tools → Analytics
    - [ ] Verify new lead appears in stats
    - [ ] Check conversion funnel updates
    - [ ] Verify charts reflect new data

---

## 4️⃣ Role-Based Access Testing

### Test as Different User Roles

#### A. Regular User
- [ ] Can access: CRM (view only), Credit Bureau, Documents, Fraud, Reports
- [ ] Cannot access: Workflow Automation, Analytics, Institution Portal
- [ ] Cannot see: Task Manager Widget
- [ ] Cannot create: CRM activities (only view)

#### B. Consultant
- [ ] Can access: All User features + CRM (full access)
- [ ] Can see: Task Manager Widget
- [ ] Can access: Institution Portal (view only)
- [ ] Cannot access: Workflow Automation, Analytics (admin only)
- [ ] Can create: CRM activities, tasks, notes, calls, meetings

#### C. Admin
- [ ] Can access: ALL features
- [ ] Can see: Task Manager Widget
- [ ] Can access: Workflow Automation, Analytics, Institution Portal (full)
- [ ] Can create/edit/delete: Everything
- [ ] Can view: All reports, audit logs, commission data

#### D. Institution User
- [ ] Can access: Institution Portal (own institution only)
- [ ] Can view: Leads assigned to their institution
- [ ] Can submit: Review decisions
- [ ] Cannot access: Other institutions' data

---

## 5️⃣ Mobile Responsive Testing

### Test on Different Screen Sizes

#### Desktop (1920x1080)
- [ ] All components display in grid layout
- [ ] Sidebar and main content side-by-side
- [ ] Charts display full width
- [ ] Tables show all columns

#### Tablet (768x1024)
- [ ] Components adjust to 2-column grid
- [ ] Sidebar collapses to hamburger menu
- [ ] Charts remain readable
- [ ] Tables may scroll horizontally

#### Mobile (375x667)
- [ ] Components stack vertically
- [ ] Navigation becomes bottom tabs or hamburger
- [ ] Charts adjust to single column
- [ ] Tables become card-based lists
- [ ] Touch targets are large enough (44x44px minimum)

### Test Gestures
- [ ] Tap: Buttons respond correctly
- [ ] Swipe: Tabs can be swiped
- [ ] Scroll: Smooth scrolling on long lists
- [ ] Pinch-zoom: Disabled on form inputs

---

## 6️⃣ Browser Compatibility Testing

Test in all major browsers:

### Chrome/Edge (Chromium)
- [ ] All features work
- [ ] Charts render correctly
- [ ] File uploads work
- [ ] Date pickers display properly

### Firefox
- [ ] Same as Chrome
- [ ] Check for any CSS differences

### Safari (macOS/iOS)
- [ ] Date pickers may look different (native)
- [ ] File uploads work
- [ ] Touch events work on iOS

---

## 7️⃣ Performance Testing

### Check Loading Times
- [ ] Initial page load < 3 seconds
- [ ] API calls return < 1 second (mock mode)
- [ ] Component render < 500ms
- [ ] Large lists use virtualization

### Check Network Traffic
- [ ] Open DevTools → Network tab
- [ ] Verify API calls are optimized
- [ ] No duplicate requests
- [ ] Proper caching headers

### Check Memory Usage
- [ ] Open DevTools → Performance tab
- [ ] Record session
- [ ] Check for memory leaks
- [ ] Verify components unmount properly

---

## 8️⃣ Error Handling Testing

### Test Error Scenarios

#### Network Errors
- [ ] Disconnect internet
- [ ] Try to submit form
- [ ] Verify error message displays
- [ ] Verify form data persists
- [ ] Reconnect and retry
- [ ] Verify submission succeeds

#### Validation Errors
- [ ] Leave required fields empty
- [ ] Enter invalid phone number
- [ ] Enter invalid email
- [ ] Upload wrong file type
- [ ] Verify validation messages display

#### API Errors
- [ ] Simulate 500 error from backend
- [ ] Verify error alert displays
- [ ] Verify user can retry
- [ ] Check error is logged

#### Permission Errors
- [ ] Try to access admin features as user
- [ ] Verify access denied message
- [ ] Verify redirects to allowed page

---

## 9️⃣ Accessibility Testing

### Keyboard Navigation
- [ ] Tab through all form fields
- [ ] Use Enter to submit forms
- [ ] Use Arrow keys in dropdowns
- [ ] Use Space to toggle checkboxes
- [ ] Use Escape to close dialogs

### Screen Reader
- [ ] Use NVDA/JAWS (Windows) or VoiceOver (Mac)
- [ ] Verify all labels are read
- [ ] Check ARIA attributes
- [ ] Verify focus indicators visible

### Color Contrast
- [ ] Use WAVE or axe DevTools
- [ ] Verify all text meets WCAG AA standards
- [ ] Check color-blind friendly colors
- [ ] Verify focus indicators have sufficient contrast

---

## 🔟 Security Testing

### Input Validation
- [ ] Try XSS: `<script>alert('xss')</script>`
- [ ] Try SQL injection: `' OR '1'='1`
- [ ] Try path traversal: `../../etc/passwd`
- [ ] Verify all inputs are sanitized

### Authentication
- [ ] Try accessing admin routes without login
- [ ] Verify redirects to login
- [ ] Check JWT token expiry
- [ ] Verify refresh token works

### File Upload Security
- [ ] Try uploading .exe file
- [ ] Try uploading oversized file
- [ ] Try uploading malicious PDF
- [ ] Verify all uploads are validated

---

## ✅ Final Checklist

Before marking as "READY FOR PRODUCTION":

- [ ] All backend APIs return expected responses
- [ ] All frontend components render without errors
- [ ] All user roles have correct permissions
- [ ] All integrations work end-to-end
- [ ] Mobile responsive on all screen sizes
- [ ] Works in all major browsers
- [ ] No console errors or warnings
- [ ] Performance is acceptable
- [ ] Error handling works correctly
- [ ] Accessibility standards met
- [ ] Security tests pass
- [ ] Documentation is complete
- [ ] Code is reviewed
- [ ] Tests are written
- [ ] Deployment steps are documented

---

## 📝 Bug Report Template

If you find any issues, report them using this format:

```markdown
### Bug Report

**Title:** [Short description]

**Severity:** [Critical / High / Medium / Low]

**Component:** [Which component/page]

**Steps to Reproduce:**
1. Go to...
2. Click on...
3. Enter...
4. Observe...

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshots:**
[Attach screenshots if applicable]

**Environment:**
- Browser: [Chrome 120]
- OS: [Windows 11]
- User Role: [Admin/Consultant/User]

**Console Errors:**
```
[Paste any console errors]
```

**Additional Context:**
[Any other relevant information]
```

---

*Testing completed on: [DATE]*  
*Tested by: [NAME]*  
*Result: [PASS / FAIL]*

