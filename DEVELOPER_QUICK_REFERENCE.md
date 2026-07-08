# Finance Module - Developer Quick Reference

## 🚀 Quick Start Commands

```bash
# Install dependencies (if not already installed)
npm install

# Optional: Install chart libraries for AnalyticsCharts
npm install recharts
# OR
npm install chart.js react-chartjs-2

# Optional: Install date picker for ReportsPanel
npm install @mui/x-date-pickers date-fns

# Start development server
npm run dev

# Start backend (if separate)
cd backend && npm start
```

---

## 📍 Component Usage Examples

### 1. CRM Panel
```jsx
import CRMPanel from './components/CRMPanel';

// In your component
<CRMPanel leadId="123abc" />
```

**Features:**
- Timeline view of all activities
- Log phone calls
- Add notes
- Create tasks
- Schedule meetings

---

### 2. Credit Bureau Viewer
```jsx
import CreditBureauViewer from './components/CreditBureauViewer';

<CreditBureauViewer leadId="123abc" />
```

**Features:**
- Credit score display (300-900)
- Risk level indicator
- Account summary
- Detailed insights
- Mock mode support

---

### 3. Document Verification Panel
```jsx
import DocumentVerificationPanel from './components/DocumentVerificationPanel';

<DocumentVerificationPanel leadId="123abc" />
```

**Features:**
- Multi-document upload
- OCR text extraction
- DigiLocker integration
- Quality scoring
- Document status tracking

---

### 4. Fraud Detection Widget
```jsx
import FraudDetectionWidget from './components/FraudDetectionWidget';

<FraudDetectionWidget leadId="123abc" />
```

**Features:**
- Risk score gauge (0-100)
- Multiple check types
- Color-coded alerts
- Recommendations
- Historical analysis

---

### 5. Reports Panel
```jsx
import ReportsPanel from './components/ReportsPanel';

<ReportsPanel leadId="123abc" />
// Or for all leads
<ReportsPanel />
```

**Features:**
- PDF report download
- Excel export
- Date range filters
- Multiple report types
- Analytics summary

---

### 6. Task Manager Widget
```jsx
import TaskManagerWidget from './components/TaskManagerWidget';

// For specific lead
<TaskManagerWidget leadId="123abc" />

// For specific user
<TaskManagerWidget userId="user123" />

// Compact mode
<TaskManagerWidget userId="user123" compact={true} />
```

**Features:**
- Pending tasks list
- Priority indicators (overdue, today, urgent)
- Task completion checkbox
- Compact/expanded views

---

### 7. Language Switcher
```jsx
import LanguageSwitcher from './components/LanguageSwitcher';

const [currentLang, setCurrentLang] = useState('en');

// Compact mode (icon button)
<LanguageSwitcher 
  currentLanguage={currentLang}
  onLanguageChange={setCurrentLang}
  compact={true}
/>

// Full mode (button with text)
<LanguageSwitcher 
  currentLanguage={currentLang}
  onLanguageChange={setCurrentLang}
  compact={false}
/>
```

**Supported Languages:**
- en - English
- ml - Malayalam (മലയാളം)
- te - Telugu (తెలుగు)
- ta - Tamil (தமிழ்)
- hi - Hindi (हिन्दी)
- kn - Kannada (ಕನ್ನಡ)

---

### 8. Institution Portal
```jsx
import InstitutionPortal from './components/InstitutionPortal';

<InstitutionPortal />
```

**Features:**
- View all partner institutions
- Add/Edit institutions
- Track leads by institution
- Institution analytics
- Status management

---

### 9. Workflow Automation
```jsx
import WorkflowAutomation from './components/WorkflowAutomation';

<WorkflowAutomation />
```

**Features:**
- Auto-assignment settings
- 4 assignment strategies:
  - Round Robin
  - Load Based
  - Skill Based
  - Geographic
- SLA management
- Auto follow-up configuration

---

### 10. Analytics Charts
```jsx
import AnalyticsCharts from './components/AnalyticsCharts';

<AnalyticsCharts />
```

**Features:**
- Lead trend over time
- Conversion funnel
- Status distribution
- Time range filters
- Summary cards

---

## 🔌 API Integration Examples

### financeApi.js Methods

```javascript
import { financeApi } from './financeApi';

// Notifications
await financeApi.sendNotification(leadId, { channel: 'sms', template: 'welcome' });

// Credit Bureau
const creditReport = await financeApi.checkCreditBureau(leadId);

// Document Verification
const verifyResult = await financeApi.verifyDocument(leadId, documentId);

// Fraud Detection
const fraudCheck = await financeApi.checkFraud(leadId);

// Reports
const pdfBlob = await financeApi.downloadLeadReport(leadId, 'pdf');

// CRM Activities
const activities = await financeApi.getCRMActivities(leadId);
await financeApi.createCRMCall(leadId, { duration: 300, outcome: 'positive' });
await financeApi.createCRMNote(leadId, { content: 'Customer interested' });
await financeApi.createCRMTask(leadId, { title: 'Follow up', dueDate: '2024-12-15' });
await financeApi.createCRMMeeting(leadId, { scheduledAt: '2024-12-15T10:00:00Z' });

// Tasks
const tasks = await financeApi.getCRMTasks({ status: 'pending' });
await financeApi.updateCRMTask(taskId, { status: 'completed' });

// Workflow
const stats = await financeApi.getWorkflowStats();

// Institution Portal
const institutions = await financeApi.getPartnerInstitutions();
await financeApi.registerPartnerInstitution({ name: 'ABC Bank', type: 'bank' });

// Analytics
const analytics = await financeApi.getAnalytics({ 
  startDate: '2024-01-01', 
  endDate: '2024-12-31' 
});
```

---

## 🎨 Styling Tips

### Material-UI Theme Integration
```javascript
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

<ThemeProvider theme={theme}>
  <CRMPanel leadId="123" />
</ThemeProvider>
```

### Custom Styling
```jsx
<CRMPanel 
  leadId="123"
  sx={{ 
    maxWidth: 1200, 
    margin: '0 auto',
    padding: 2 
  }}
/>
```

---

## 🔐 Role-Based Rendering

```javascript
// In your component
const { roleCapabilities } = useContext(FinanceContext);

return (
  <>
    {/* All users can see */}
    <CRMPanel leadId={leadId} />
    
    {/* Only consultants and admins */}
    {(roleCapabilities.isConsultant || roleCapabilities.isAdmin) && (
      <TaskManagerWidget userId={userId} />
    )}
    
    {/* Only admins */}
    {roleCapabilities.isAdmin && (
      <>
        <WorkflowAutomation />
        <AnalyticsCharts />
      </>
    )}
    
    {/* Institution users */}
    {roleCapabilities.isInstitutionUser && (
      <InstitutionPortal />
    )}
  </>
);
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Charts Not Showing
**Solution:** Install chart library
```bash
npm install recharts
```

### Issue 2: Date Picker Error
**Solution:** Install date picker dependencies
```bash
npm install @mui/x-date-pickers date-fns
```

### Issue 3: API Connection Error
**Solution:** Check backend is running
```bash
# Check backend/.env file
PORT=5000
MONGODB_URI=mongodb://localhost:27017/finance
```

### Issue 4: Mock Data Not Appearing
**Solution:** Services work in mock mode by default. To enable real APIs:
```bash
# Add to backend/.env
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
SENDGRID_API_KEY=your_key
```

### Issue 5: Language Switch Not Working
**Solution:** Ensure i18n middleware is loaded
```javascript
// In backend/server.js or app.js
app.use(require('./middleware/i18n'));
```

---

## 📦 Component Props Reference

### CRMPanel
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| leadId | string | Yes | - | Lead ID to load activities |

### CreditBureauViewer
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| leadId | string | Yes | - | Lead ID for credit check |

### DocumentVerificationPanel
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| leadId | string | Yes | - | Lead ID for document verification |

### FraudDetectionWidget
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| leadId | string | Yes | - | Lead ID for fraud analysis |

### ReportsPanel
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| leadId | string | No | null | Specific lead or all leads |

### TaskManagerWidget
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| leadId | string | No | null | Filter by lead |
| userId | string | No | null | Filter by user |
| compact | boolean | No | false | Compact view |

### LanguageSwitcher
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| currentLanguage | string | Yes | - | Current language code |
| onLanguageChange | function | Yes | - | Callback function |
| compact | boolean | No | false | Icon-only mode |

---

## 🧪 Testing Examples

### Component Testing (Jest + React Testing Library)
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import CRMPanel from './CRMPanel';

test('CRM Panel loads activities', async () => {
  render(<CRMPanel leadId="123" />);
  
  expect(screen.getByText(/CRM Activities/i)).toBeInTheDocument();
  
  // Wait for activities to load
  const timeline = await screen.findByRole('tab', { name: /timeline/i });
  expect(timeline).toBeInTheDocument();
});

test('Task completion toggles', async () => {
  render(<TaskManagerWidget userId="user123" />);
  
  const checkbox = screen.getByRole('checkbox');
  fireEvent.click(checkbox);
  
  // Verify API call was made
  expect(mockUpdateTask).toHaveBeenCalled();
});
```

### API Testing (Jest)
```javascript
import { financeApi } from './financeApi';

test('Credit bureau check returns score', async () => {
  const result = await financeApi.checkCreditBureau('lead123');
  
  expect(result.creditScore).toBeGreaterThanOrEqual(300);
  expect(result.creditScore).toBeLessThanOrEqual(900);
  expect(result.riskLevel).toBeDefined();
});
```

---

## 📱 Mobile Responsive Tips

All components are mobile-responsive by default using Material-UI Grid system:

```jsx
<Grid container spacing={2}>
  <Grid item xs={12} sm={6} md={4}>
    {/* Full width on mobile, half on tablet, third on desktop */}
  </Grid>
</Grid>
```

---

## 🔄 Real-Time Updates (Optional Enhancement)

To add WebSocket support for real-time updates:

```javascript
// client-side
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

socket.on('lead-updated', (data) => {
  // Refresh component data
  loadCRMActivities();
});

// server-side
io.emit('lead-updated', { leadId: '123', type: 'crm_activity' });
```

---

## 📊 Performance Optimization

### Lazy Loading Components
```javascript
import { lazy, Suspense } from 'react';

const CRMPanel = lazy(() => import('./components/CRMPanel'));
const AnalyticsCharts = lazy(() => import('./components/AnalyticsCharts'));

<Suspense fallback={<CircularProgress />}>
  <CRMPanel leadId="123" />
</Suspense>
```

### Memoization
```javascript
import { memo } from 'react';

export default memo(CRMPanel, (prevProps, nextProps) => {
  return prevProps.leadId === nextProps.leadId;
});
```

---

## 🎯 Best Practices

1. **Always pass leadId**: Most components require a leadId prop
2. **Handle loading states**: Components show loading indicators
3. **Check role permissions**: Use role-based rendering
4. **Use mock mode for dev**: All services work without API keys
5. **Handle errors gracefully**: Components show error alerts
6. **Test with different roles**: Admin, Consultant, User, Institution
7. **Verify language switching**: Test with all 6 languages
8. **Check mobile responsive**: Test on different screen sizes

---

## 📞 Component Communication

### Parent → Child (Props)
```jsx
<CRMPanel leadId={selectedLead.id} />
```

### Child → Parent (Callbacks)
```jsx
<LanguageSwitcher 
  onLanguageChange={(lang) => {
    setCurrentLanguage(lang);
    // Update other components
  }}
/>
```

### Sibling Communication (Lift State Up)
```jsx
// Parent component
const [selectedLead, setSelectedLead] = useState(null);

<TrackingDash onSelectLead={setSelectedLead} />
<CRMPanel leadId={selectedLead?.id} />
```

---

## 🚀 Deployment Checklist

- [ ] Install all dependencies
- [ ] Set environment variables
- [ ] Test all API endpoints
- [ ] Verify role-based access
- [ ] Test language switching
- [ ] Check mobile responsive
- [ ] Run build: `npm run build`
- [ ] Test production build
- [ ] Configure API keys for production
- [ ] Set up monitoring/logging
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Verify CORS settings
- [ ] Test end-to-end flow

---

## 🎓 Learning Resources

### Material-UI Documentation
- Components: https://mui.com/material-ui/getting-started/
- Icons: https://mui.com/material-ui/material-icons/
- Theming: https://mui.com/material-ui/customization/theming/

### React Best Practices
- Hooks: https://react.dev/reference/react
- Performance: https://react.dev/learn/render-and-commit

### API Integration
- Axios: https://axios-http.com/docs/intro
- Error Handling: https://axios-http.com/docs/handling_errors

---

*Happy Coding! 🎉*
