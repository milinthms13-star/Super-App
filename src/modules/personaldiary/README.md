# Personal Diary Application Module

A comprehensive React-based diary and journaling module for the NilaHub platform that enables users to write, organize, and reflect on their personal experiences with mood tracking and advanced features.

## 📋 Features

### Core Features
- ✍️ **Rich Entry Creation**: Write diary entries with title, content, and metadata
- 😊 **Mood Tracking**: Associate entries with 5 mood levels (Very Sad → Very Happy)
- 🏷️ **Categorization**: Organize entries by category (Personal, Work, Travel, Health, Relationships, Other)
- 🔖 **Tagging System**: Add multiple tags to entries for better organization
- 📅 **Date Tracking**: Automatic timestamp and entry date recording
- 🔐 **Privacy Control**: Mark entries as private or public

### Advanced Features
- 📊 **Mood Analytics**: View mood trends over 30 days with visual charts
- 📆 **Calendar View**: See all entries on a calendar grid
- 🔍 **Search & Filtering**: Find entries by title, content, category, mood, or tags
- 💾 **Draft Support**: Save entries as drafts before publishing
- ⏰ **Auto-save**: Automatic saving of draft entries
- 🎨 **Beautiful UI**: Responsive, modern design with gradient backgrounds

## 🏗️ Architecture

### Components

#### **Diary.js** (Main Component)
The primary container component that manages the entire diary application.

**Responsibilities:**
- Entry state management (loading, filtering, editing)
- API integration with backend services
- Filter and search functionality
- View mode switching (List, Calendar, Analytics)

**Props:**
- None (Uses useContext for global user information)

**State:**
```javascript
{
  entries: Array,           // All diary entries
  loading: Boolean,         // Loading state
  error: String,           // Error messages
  showEditor: Boolean,     // Editor modal visibility
  editingEntry: Object,    // Entry being edited
  selectedCategory: String, // Active category filter
  selectedMood: String,    // Active mood filter
  searchQuery: String,     // Search text
  selectedTags: Array,     // Selected tag filters
  moodStats: Array,        // Mood statistics data
  viewMode: String,        // 'list' | 'calendar' | 'analytics'
  submitting: Boolean,     // Form submission state
}
```

#### **DiaryEditor.js** (Entry Editor)
Modal-based form for creating and editing diary entries.

**Features:**
- Title input (max 200 chars)
- Rich content area (max 50,000 chars)
- Mood emoji selector
- Category dropdown
- Tag management with autocomplete
- Draft mode toggle
- Entry date picker
- Form validation
- Real-time character count

**Props:**
```javascript
{
  entry: Object|null,        // Entry to edit (null for new)
  onSave: Function,          // Callback on save
  onClose: Function,         // Callback on close
  submitting: Boolean,       // Loading state
}
```

#### **DiaryEntryCard.js** (Entry Display)
Card component for displaying diary entry summaries.

**Features:**
- Entry title with truncated content preview
- Mood indicator (colored emoji circle)
- Category badge
- Tag display (max 3 tags shown)
- Edit/Delete action buttons
- Formatted date and time

**Props:**
```javascript
{
  entry: Object,             // Entry data
  onEdit: Function,          // Edit button callback
  onDelete: Function,        // Delete button callback
}
```

#### **DiaryCalendar.js** (Calendar View)
Calendar visualization showing entries by date.

**Features:**
- Month navigation (previous/next)
- Days with entries highlighted
- Visual indicators for entry count
- Click to select date

**Props:**
```javascript
{
  entries: Array,            // All entries
  onDateClick: Function,     // Date selection callback
}
```

#### **MoodChart.js** (Analytics)
Data visualization for mood statistics.

**Features:**
- Mood distribution bars
- Percentage calculation
- Entry count by mood
- Most common mood indicator
- 30-day statistics

**Props:**
```javascript
{
  moodStats: Array,          // Mood statistics data
}
```

### Services

#### **diaryService.js** (API Integration)
Frontend service for all API communications.

**Exported Functions:**
```javascript
fetchDiaryEntries(options)              // Get all entries with filters
fetchDraftEntries()                     // Get draft entries
fetchTags()                             // Get all tags with counts
fetchMoodStats(days)                    // Get mood statistics
fetchDiaryEntry(id)                     // Get single entry
createDiaryEntry(data)                  // Create new entry
updateDiaryEntry(id, data)              // Update entry
deleteDiaryEntry(id)                    // Delete entry
fetchEntriesByDate(date)                // Get entries for date range
```

### Backend Models & Routes

#### **DiaryEntry.js** (MongoDB Schema)
```javascript
{
  userId: String,                       // User reference
  title: String,                        // Entry title
  content: String,                      // Entry content
  mood: String,                         // Mood enum
  category: String,                     // Category enum
  tags: [String],                       // Tag array
  attachments: [{
    type: String,
    url: String,
    fileName: String,
    fileSize: Number,
    uploadedAt: Date,
  }],
  isDraft: Boolean,                     // Draft flag
  isPrivate: Boolean,                   // Privacy flag
  entryDate: Date,                      // Entry date
  createdAt: Date,                      // Creation timestamp
  updatedAt: Date,                      // Update timestamp
}
```

**Indices:**
- `userId + createdAt` (for chronological retrieval)
- `userId + entryDate` (for date-based queries)
- `userId + category` (for category filtering)
- `userId + tags` (for tag-based search)
- `userId + mood` (for mood analysis)

#### **diary.js** (Express Routes)
```javascript
GET    /api/diary                       // Fetch entries with filtering
GET    /api/diary/drafts                // Fetch draft entries
GET    /api/diary/tags                  // Get tag aggregation
GET    /api/diary/mood-stats            // Get mood statistics
GET    /api/diary/:id                   // Get single entry
GET    /api/diary/by-date/:date         // Get entries by date range
POST   /api/diary                       // Create entry
PUT    /api/diary/:id                   // Update entry
DELETE /api/diary/:id                   // Delete entry
```

## 🎨 Styling

### CSS Structure
- **Diary.css** contains all component styling
- Responsive design with mobile-first approach
- Gradient purple backgrounds matching NilaHub theme
- CSS Grid for layouts

### Key Classes
- `.diary-page` - Main container
- `.diary-hero` - Hero section
- `.diary-editor-modal` - Editor modal
- `.diary-entry-card` - Entry card
- `.diary-calendar-grid` - Calendar grid
- `.diary-mood-analytics` - Analytics section

### Responsive Breakpoints
- `768px` - Tablet adjustments
- `480px` - Mobile adjustments

## 🔄 Data Flow

```
┌─────────────────────────────────────┐
│        Diary.js (Main)              │
│   State Management & Logic          │
└──────────┬──────────────────────────┘
           │
    ┌──────┴──────┬──────────┬──────────┐
    │             │          │          │
    v             v          v          v
DiaryEditor  DiaryEntryCard Calendar  MoodChart
(Create/Edit) (Display)     (View)    (Analytics)
    │             │          │          │
    └──────┬──────┴──────────┴──────────┘
           │
           v
    diaryService.js
    (API Calls)
           │
           v
    Backend Routes
    (Express API)
           │
           v
    MongoDB
    (Data Storage)
```

## 🚀 Usage

### Accessing the Module
1. Login to NilaHub
2. Navigate to "My Diary" from the sidebar
3. Click "✍️ New Entry" to start writing

### Creating an Entry
1. Click "✍️ New Entry" button
2. Enter title and content
3. Select mood by clicking emoji
4. Choose category
5. Add tags (optional)
6. Click "Save Entry" to publish or check "Save as draft"

### Filtering Entries
1. Use search box to find by title or content
2. Select category from dropdown
3. Click mood emojis to filter by mood
4. Click tags to filter by tags
5. Combine multiple filters for precise searches

### Viewing Analytics
1. Click "📊 Mood Analytics" button
2. See mood distribution for last 30 days
3. View percentage and count for each mood
4. Identify most common mood

### Calendar View
1. Click "📅 Calendar" button
2. Navigate months using arrows
3. Dots on days indicate entries
4. Click to view entries for that date

## 🔐 Security & Privacy

- **User Isolation**: Each user sees only their own entries
- **Authentication**: All endpoints require valid JWT
- **Authorization**: Backend validates user ownership
- **Private Entries**: Entries can be marked as private
- **Data Protection**: Sensitive information encrypted at rest

## ⚡ Performance Optimization

- **Lazy Loading**: Entries load on demand with pagination
- **Memoization**: Filtered entries use useMemo to prevent unnecessary recalculations
- **Database Indices**: Optimized queries with proper indexing
- **Debounced Search**: Search input is debounced to reduce API calls

## 🧪 Testing

### API Testing
Use Postman or cURL to test endpoints:

```bash
# Get all entries
curl -X GET http://localhost:5000/api/diary \
  -H "Cookie: auth=<token>"

# Create entry
curl -X POST http://localhost:5000/api/diary \
  -H "Content-Type: application/json" \
  -H "Cookie: auth=<token>" \
  -d '{"title":"My Day","content":"...","mood":"happy"}'
```

### Component Testing
Components use React hooks and standard testing patterns.

## 📱 Mobile Support

The diary module is fully responsive and optimized for:
- Smartphones (< 480px)
- Tablets (480px - 768px)
- Desktops (> 768px)

## 🐛 Troubleshooting

### Entries Not Loading
- Check browser console for errors
- Verify backend server is running on port 5000
- Check authentication status

### Images Not Uploading
- Verify file size limits
- Check CORS settings
- Ensure backend has file upload configured

### Mood Stats Empty
- Ensure entries with moods exist
- Check date range in request
- Verify database indices

## 📚 Future Enhancements

- [ ] Rich text editor with formatting
- [ ] Image/file attachments
- [ ] Entry sharing (with password protection)
- [ ] Reminders for daily journaling
- [ ] Backup and export (PDF, CSV)
- [ ] Voice-to-text entry
- [ ] Biometric lock for sensitive entries
- [ ] Cloud synchronization
- [ ] Entry templates
- [ ] Collaborative journaling

## 🤝 Integration Notes

- Uses existing NilaHub authentication system
- Follows established API conventions
- Integrates with AppContext for global state
- Uses axios for HTTP requests with credentials
- Follows project CSS conventions

## 📄 API Response Examples

### Get Entries Response
```json
{
  "success": true,
  "data": [{
    "_id": "ObjectId",
    "userId": "uuid-string",
    "title": "My Day",
    "content": "Today was great!",
    "mood": "happy",
    "category": "Personal",
    "tags": ["work", "achievement"],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }]
}
```

### Mood Stats Response
```json
{
  "success": true,
  "data": [{
    "_id": "happy",
    "count": 12
  }, {
    "_id": "neutral",
    "count": 5
  }]
}
```

## 📞 Support

For issues or feature requests related to the Diary module, refer to:
- Project documentation
- GitHub issues tracker
- Development team contact
