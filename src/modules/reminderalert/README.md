# ReminderAlert TodoList Integration Documentation

## Overview

The ReminderAlert module has been successfully integrated with the backend API to provide a complete Todo/Reminder management system. This document outlines the implementation, architecture, and usage.

## Components

### 1. ReminderAlert.js
Main component for the reminder/todo management interface.

**Features:**
- Create, read, update, delete (CRUD) reminders
- Filter reminders by category (All, Work, Personal, Urgent)
- Set priority levels (Low, Medium, High)
- Configure reminder channels (In-app, SMS, Call)
- Mark reminders as complete
- Set recurring reminders (daily, weekly, monthly, or none)
- Real-time status updates (Reminder scheduled, Escalation armed, Completed)

**State Management:**
- `tasks`: Array of reminders from backend
- `loading`: Loading state for async operations
- `error`: Error messages for failed operations
- `showAddForm`: Toggle form visibility
- `submitting`: Disable form during submission
- `editingTaskId`: Track which reminder is being edited
- `activeFilter`: Current category filter

**Key Methods:**
- `handleSubmit()`: Create or update reminder via API
- `handleEdit()`: Prepare reminder for editing
- `handleToggleComplete()`: Mark reminder as complete/incomplete
- `handleDelete()`: Delete reminder
- `handleFormChange()`: Update form data

### 2. TodoList.js
Alternative component for displaying reminders in a simpler list format.

**Features:**
- Display reminders as a vertical list
- Toggle completion with checkbox
- Filter by category
- Show/hide completed reminders
- Delete reminders
- Display reminder metadata (priority, category, status)

**Props:**
- `category`: Filter by category (default: "All")
- `showCompleted`: Include completed reminders (default: false)

## API Service

### remindersService.js

Centralized service for all API calls related to reminders.

**Methods:**

#### `fetchReminders(options)`
Fetch reminders for the current user.
```javascript
const response = await fetchReminders({ category: "Work", limit: 50 });
// Returns: { data: [...], pagination: {...} }
```

**Options:**
- `category`: Filter by category (Work, Personal, Urgent, All)
- `completed`: Filter by completion status (true/false)
- `limit`: Number of results (default: 50)
- `skip`: Skip results for pagination (default: 0)

#### `createReminder(reminderData)`
Create a new reminder.
```javascript
const response = await createReminder({
  title: "Doctor appointment",
  description: "Routine checkup",
  category: "Personal",
  priority: "High",
  dueDate: new Date(),
  dueTime: "09:00",
  reminders: ["In-app", "SMS"],
  recurring: "none"
});
```

#### `updateReminder(reminderId, reminderData)`
Update an existing reminder.
```javascript
const response = await updateReminder("reminder_id", {
  title: "Updated title",
  completed: true
});
```

#### `deleteReminder(reminderId)`
Delete a reminder.
```javascript
await deleteReminder("reminder_id");
```

#### `toggleReminderCompletion(reminderId, completed)`
Toggle reminder completion status.
```javascript
await toggleReminderCompletion("reminder_id", true);
```

## Backend API Endpoints

### Base URL
```
http://localhost:5000/api/reminders
```

### Endpoints

#### GET /api/reminders
Get all reminders for the authenticated user.

**Query Parameters:**
- `category`: Work, Personal, Urgent (optional)
- `completed`: true/false (optional)
- `limit`: Number of results (default: 50)
- `skip`: Skip results (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 50,
    "skip": 0,
    "hasMore": true
  }
}
```

#### POST /api/reminders
Create a new reminder.

**Request Body:**
```json
{
  "title": "Task title",
  "description": "Task description",
  "category": "Work",
  "priority": "High",
  "dueDate": "2024-12-31T00:00:00.000Z",
  "dueTime": "17:30",
  "reminders": ["In-app", "SMS"],
  "recurring": "none"
}
```

#### PUT /api/reminders/:id
Update a reminder.

**Request Body:**
```json
{
  "title": "Updated title",
  "completed": true,
  "status": "Completed"
}
```

#### DELETE /api/reminders/:id
Delete a reminder.

## Data Model

### Reminder Schema
```javascript
{
  _id: ObjectId,                          // MongoDB ID
  userId: ObjectId,                       // User reference
  title: String (required),               // Task title
  description: String,                    // Task description
  category: String (Work|Personal|Urgent),// Category
  priority: String (Low|Medium|High),     // Priority level
  dueDate: Date (required),               // Due date
  dueTime: String,                        // Due time (HH:mm format)
  completed: Boolean (default: false),    // Completion status
  completedAt: Date,                      // When completed
  reminders: [String],                    // ['In-app', 'SMS', 'Call']
  recurring: String (none|daily|weekly|monthly), // Recurrence
  status: String,                         // Status (Reminder scheduled, Escalation armed, etc.)
  lastNotified: Date,                     // Last notification sent
  notificationCount: Number,              // Total notifications sent
  createdAt: Date,                        // Created timestamp
  updatedAt: Date                         // Last updated timestamp
}
```

## Authentication

All API requests require authentication via cookies. The service is configured with:
```javascript
axios.defaults.withCredentials = true;
```

This means:
- Cookie-based authentication (JWT or session tokens)
- Credentials are automatically sent with every request
- Requires user to be logged in

## Error Handling

The service includes comprehensive error handling:

1. **API Errors**: Caught and re-thrown with meaningful messages
2. **Component Errors**: Displayed to user in UI
3. **Fallback**: If backend is unavailable, seed tasks are used

**Error Display:**
- Main error section shows global issues
- Submit error section shows form-specific issues
- Console logging for debugging

## Usage Examples

### Using ReminderAlert Component
```jsx
import { ReminderAlert } from "./modules/reminderalert";

function App() {
  return <ReminderAlert />;
}
```

### Using TodoList Component
```jsx
import { TodoList } from "./modules/reminderalert";

function Dashboard() {
  return (
    <div>
      <h2>Today's Tasks</h2>
      <TodoList category="Work" showCompleted={false} />
    </div>
  );
}
```

### Using remindersService Directly
```jsx
import { fetchReminders, createReminder } from "./services/remindersService";

async function loadUserReminders() {
  try {
    const response = await fetchReminders({ category: "Personal" });
    console.log("Reminders:", response.data);
  } catch (error) {
    console.error("Failed to load:", error.message);
  }
}
```

## File Structure

```
src/
├── modules/
│   └── reminderalert/
│       ├── ReminderAlert.js      # Main component
│       ├── TodoList.js           # List view component
│       ├── index.js              # Module exports
│       └── README.md             # This file
├── services/
│   └── remindersService.js       # API service
└── styles/
    └── ReminderAlert.css         # Styling

backend/
├── routes/
│   └── reminders.js              # API endpoints
├── models/
│   └── Reminder.js               # Data model
└── middleware/
    ├── auth.js                   # Authentication
    └── rateLimiter.js            # Rate limiting
```

## Features

### Create Reminders
- Title and description
- Category, priority, due date/time
- Multiple reminder channels
- Recurring options

### Manage Reminders
- Edit existing reminders
- Mark as complete/incomplete
- Delete reminders
- Filter by category
- View completion status

### Status Tracking
- Reminder scheduled
- Escalation armed (multiple reminders)
- Completed
- Retry enabled

### Recurring Reminders
- None (one-time)
- Daily
- Weekly
- Monthly

## Styling

The component uses CSS classes defined in `ReminderAlert.css`:
- `.reminderalert-page`: Main container
- `.reminderalert-hero`: Header section
- `.reminderalert-panel`: Content panels
- `.reminderalert-task-card`: Individual task card
- `.reminderalert-filter-chip`: Filter buttons
- `.reminderalert-task-list`: Task list container

## Performance Considerations

1. **Pagination**: API supports limit/skip for large datasets
2. **Memoization**: `useMemo` used for filtered tasks
3. **Caching**: Seed tasks used as fallback
4. **Rate Limiting**: Backend rate limiter protects API

## Security Features

1. **Authentication**: Required for all requests
2. **User Isolation**: Users can only access their own reminders
3. **Input Validation**: Backend validates all inputs
4. **CSRF Protection**: Cookies with SameSite policy
5. **Rate Limiting**: Prevents API abuse

## Troubleshooting

### Reminders Not Loading
- Check browser console for errors
- Verify backend is running
- Check authentication status
- Look for API errors in network tab

### Submit Errors
- Verify title and due date are filled
- Check backend logs
- Verify authentication token/cookie

### Backend Connection Issues
- Ensure `REACT_APP_API_URL` is correct
- Check CORS settings on backend
- Verify port 5000 is accessible

## Future Enhancements

- Reminder notifications (push, email)
- Recurring reminder generation
- Bulk operations
- Export/import reminders
- Sharing reminders with other users
- Reminder attachments
- Search functionality
- Advanced filtering

## Support

For issues or questions about the ReminderAlert module, refer to:
- Backend logs: `backend/logs/`
- Frontend console: Browser DevTools
- API documentation: This README
