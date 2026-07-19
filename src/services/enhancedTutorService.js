import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: `${API_BASE_URL}/tutor`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);

// ==================== SESSION MANAGEMENT ====================

/**
 * Start a new tutoring session
 */
export const startSession = async (sessionData) => {
  const response = await api.post('/sessions/start', sessionData);
  return response.data.data;
};

/**
 * Get session details
 */
export const getSession = async (sessionId) => {
  const response = await api.get(`/sessions/${sessionId}`);
  return response.data.data;
};

/**
 * Complete a session
 */
export const completeSession = async (sessionId) => {
  const response = await api.post(`/sessions/${sessionId}/complete`);
  return response.data.data;
};

/**
 * Get all user sessions
 */
export const getUserSessions = async (filters = {}) => {
  const response = await api.get('/sessions', { params: filters });
  return response.data.data;
};

// ==================== PROGRESS TRACKING ====================

/**
 * Record lesson progress
 */
export const recordProgress = async (progressData) => {
  const response = await api.post('/lessons/progress', progressData);
  return response.data.data;
};

/**
 * Get progress analytics
 */
export const fetchAnalytics = async (params) => {
  const response = await api.get('/progress/analytics', { params });
  return response.data.data;
};

/**
 * Get progress for specific session
 */
export const getSessionProgress = async (sessionId) => {
  const response = await api.get(`/progress/${sessionId}`);
  return response.data.data;
};

// ==================== QUIZ MANAGEMENT ====================

/**
 * Generate quiz for current session
 */
export const generateQuiz = async (quizParams) => {
  const response = await api.post('/quiz/generate', quizParams);
  return response.data.data;
};

/**
 * Submit quiz answers
 */
export const submitQuiz = async (quizData) => {
  const response = await api.post('/quiz/submit', quizData);
  return response.data.data;
};

/**
 * Get quiz history
 */
export const getQuizHistory = async (filters = {}) => {
  const response = await api.get('/quiz/history', { params: filters });
  return response.data.data;
};

/**
 * Get quiz by ID
 */
export const getQuiz = async (quizId) => {
  const response = await api.get(`/quiz/${quizId}`);
  return response.data.data;
};

// ==================== FLASHCARDS ====================

/**
 * Generate flashcards for a session
 */
export const generateFlashcards = async (flashcardParams) => {
  const response = await api.post('/flashcards/generate', flashcardParams);
  return response.data.data;
};

/**
 * Record flashcard review
 */
export const recordFlashcardReview = async (reviewData) => {
  const response = await api.post('/flashcards/review', reviewData);
  return response.data.data;
};

/**
 * Get flashcards for a session
 */
export const getFlashcards = async (sessionId) => {
  const response = await api.get(`/flashcards/${sessionId}`);
  return response.data.data;
};

/**
 * Get due flashcards (spaced repetition)
 */
export const getDueFlashcards = async () => {
  const response = await api.get('/flashcards/due');
  return response.data.data;
};

// ==================== INTERVIEW PREPARATION ====================

/**
 * Generate interview questions
 */
export const generateInterviewQuestions = async (params) => {
  const response = await api.post('/interview/generate', params);
  return response.data.data;
};

/**
 * Submit interview practice response
 */
export const submitInterviewPractice = async (practiceData) => {
  const response = await api.post('/interview/practice', practiceData);
  return response.data.data;
};

/**
 * Get interview history
 */
export const getInterviewHistory = async () => {
  const response = await api.get('/interview/history');
  return response.data.data;
};

// ==================== DASHBOARD ====================

/**
 * Get personalized dashboard
 */
export const fetchDashboard = async () => {
  const response = await api.get('/dashboard');
  return response.data.data;
};

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (period = '30d') => {
  const response = await api.get('/dashboard/stats', { params: { period } });
  return response.data.data;
};

// ==================== GAMIFICATION ====================

/**
 * Fetch user achievements
 */
export const fetchAchievements = async () => {
  const response = await api.get('/achievements');
  return response.data.data;
};

/**
 * Check for new achievements
 */
export const checkAchievements = async () => {
  const response = await api.post('/achievements/check');
  return response.data.data;
};

/**
 * Get leaderboard
 */
export const getLeaderboard = async (params = {}) => {
  const response = await api.get('/leaderboard', { params });
  return response.data.data;
};

/**
 * Get user rank
 */
export const getUserRank = async () => {
  const response = await api.get('/leaderboard/rank');
  return response.data.data;
};

/**
 * Claim daily reward
 */
export const claimDailyReward = async () => {
  const response = await api.post('/rewards/daily');
  return response.data.data;
};

/**
 * Get user points and level
 */
export const getUserPoints = async () => {
  const response = await api.get('/points');
  return response.data.data;
};

// ==================== STUDY PLANS ====================

/**
 * Create AI-powered study plan
 */
export const createStudyPlan = async (planData) => {
  const response = await api.post('/study-plans/create', planData);
  return response.data.data;
};

/**
 * Get all study plans
 */
export const fetchStudyPlans = async () => {
  const response = await api.get('/study-plans');
  return response.data.data;
};

/**
 * Get specific study plan
 */
export const getStudyPlan = async (planId) => {
  const response = await api.get(`/study-plans/${planId}`);
  return response.data.data;
};

/**
 * Update study plan progress
 */
export const updateStudyPlanProgress = async (planId, progressData) => {
  const response = await api.put(`/study-plans/${planId}/progress`, progressData);
  return response.data.data;
};

/**
 * Delete study plan
 */
export const deleteStudyPlan = async (planId) => {
  const response = await api.delete(`/study-plans/${planId}`);
  return response.data.data;
};

// ==================== STUDY GROUPS ====================

/**
 * Create a new study group
 */
export const createStudyGroup = async (groupData) => {
  const response = await api.post('/study-groups/create', groupData);
  return response.data.data;
};

/**
 * Get all study groups
 */
export const fetchStudyGroups = async (filters = {}) => {
  const response = await api.get('/study-groups', { params: filters });
  return response.data.data;
};

/**
 * Get specific study group
 */
export const getStudyGroup = async (groupId) => {
  const response = await api.get(`/study-groups/${groupId}`);
  return response.data.data;
};

/**
 * Join a study group
 */
export const joinStudyGroup = async (groupId) => {
  const response = await api.post(`/study-groups/${groupId}/join`);
  return response.data.data;
};

/**
 * Leave a study group
 */
export const leaveStudyGroup = async (groupId) => {
  const response = await api.post(`/study-groups/${groupId}/leave`);
  return response.data.data;
};

/**
 * Post message to study group
 */
export const postGroupMessage = async (groupId, messageData) => {
  const response = await api.post(`/study-groups/${groupId}/messages`, messageData);
  return response.data.data;
};

/**
 * Get study group messages
 */
export const getGroupMessages = async (groupId, params = {}) => {
  const response = await api.get(`/study-groups/${groupId}/messages`, { params });
  return response.data.data;
};

/**
 * Schedule group study session
 */
export const scheduleGroupSession = async (groupId, sessionData) => {
  const response = await api.post(`/study-groups/${groupId}/sessions`, sessionData);
  return response.data.data;
};

/**
 * Get user's study groups
 */
export const getMyStudyGroups = async () => {
  const response = await api.get('/study-groups/my-groups');
  return response.data.data;
};

// ==================== RECOMMENDATIONS ====================

/**
 * Get personalized topic recommendations
 */
export const getRecommendedTopics = async () => {
  const response = await api.get('/recommendations/topics');
  return response.data.data;
};

/**
 * Get recommended study time
 */
export const getRecommendedStudyTime = async () => {
  const response = await api.get('/recommendations/study-time');
  return response.data.data;
};

/**
 * Get next topic recommendation
 */
export const getNextTopicRecommendation = async (currentSessionId) => {
  const response = await api.get('/recommendations/next-topic', {
    params: { sessionId: currentSessionId }
  });
  return response.data.data;
};

// ==================== NOTES & BOOKMARKS ====================

/**
 * Create a note for a lesson
 */
export const createNote = async (noteData) => {
  const response = await api.post('/notes/create', noteData);
  return response.data.data;
};

/**
 * Get notes for a session
 */
export const getNotes = async (sessionId) => {
  const response = await api.get(`/notes/${sessionId}`);
  return response.data.data;
};

/**
 * Update a note
 */
export const updateNote = async (noteId, noteData) => {
  const response = await api.put(`/notes/${noteId}`, noteData);
  return response.data.data;
};

/**
 * Delete a note
 */
export const deleteNote = async (noteId) => {
  const response = await api.delete(`/notes/${noteId}`);
  return response.data.data;
};

/**
 * Search notes
 */
export const searchNotes = async (query) => {
  const response = await api.get('/notes/search', { params: { q: query } });
  return response.data.data;
};

// ==================== WEAK AREAS & MASTERY ====================

/**
 * Get weak areas analysis
 */
export const getWeakAreas = async () => {
  const response = await api.get('/analysis/weak-areas');
  return response.data.data;
};

/**
 * Get mastery levels
 */
export const getMasteryLevels = async () => {
  const response = await api.get('/analysis/mastery');
  return response.data.data;
};

/**
 * Get learning path progress
 */
export const getLearningPathProgress = async (subject) => {
  const response = await api.get('/analysis/learning-path', { params: { subject } });
  return response.data.data;
};

// ==================== STREAKS & HABITS ====================

/**
 * Get current streak
 */
export const getCurrentStreak = async () => {
  const response = await api.get('/streaks/current');
  return response.data.data;
};

/**
 * Get streak history
 */
export const getStreakHistory = async () => {
  const response = await api.get('/streaks/history');
  return response.data.data;
};

/**
 * Record study session for streak
 */
export const recordStreakActivity = async () => {
  const response = await api.post('/streaks/record');
  return response.data.data;
};

// ==================== EXPORT & SHARING ====================

/**
 * Export progress report
 */
export const exportProgressReport = async (format = 'pdf', period = '30d') => {
  const response = await api.get('/export/progress', {
    params: { format, period },
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Share achievement
 */
export const shareAchievement = async (achievementId, platform) => {
  const response = await api.post('/share/achievement', {
    achievementId,
    platform
  });
  return response.data.data;
};

/**
 * Generate certificate
 */
export const generateCertificate = async (courseData) => {
  const response = await api.post('/certificates/generate', courseData);
  return response.data.data;
};

// ==================== NOTIFICATIONS ====================

/**
 * Get user notifications
 */
export const getNotifications = async () => {
  const response = await api.get('/notifications');
  return response.data.data;
};

/**
 * Mark notification as read
 */
export const markNotificationRead = async (notificationId) => {
  const response = await api.put(`/notifications/${notificationId}/read`);
  return response.data.data;
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsRead = async () => {
  const response = await api.put('/notifications/read-all');
  return response.data.data;
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (preferences) => {
  const response = await api.put('/notifications/preferences', preferences);
  return response.data.data;
};

// ==================== FEEDBACK & RATINGS ====================

/**
 * Submit lesson feedback
 */
export const submitLessonFeedback = async (feedbackData) => {
  const response = await api.post('/feedback/lesson', feedbackData);
  return response.data.data;
};

/**
 * Rate a quiz
 */
export const rateQuiz = async (quizId, rating, comment) => {
  const response = await api.post(`/feedback/quiz/${quizId}`, { rating, comment });
  return response.data.data;
};

/**
 * Report an issue
 */
export const reportIssue = async (issueData) => {
  const response = await api.post('/feedback/report', issueData);
  return response.data.data;
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Search for topics
 */
export const searchTopics = async (query, subject = null) => {
  const response = await api.get('/search/topics', {
    params: { q: query, subject }
  });
  return response.data.data;
};

/**
 * Get available subjects
 */
export const getAvailableSubjects = async () => {
  const response = await api.get('/subjects');
  return response.data.data;
};

/**
 * Get topic prerequisites
 */
export const getTopicPrerequisites = async (subject, topic) => {
  const response = await api.get('/topics/prerequisites', {
    params: { subject, topic }
  });
  return response.data.data;
};

/**
 * Estimate study time
 */
export const estimateStudyTime = async (subject, topic, difficulty) => {
  const response = await api.get('/estimate/study-time', {
    params: { subject, topic, difficulty }
  });
  return response.data.data;
};

// Export all functions as default
export default {
  // Session Management
  startSession,
  getSession,
  completeSession,
  getUserSessions,
  
  // Progress Tracking
  recordProgress,
  fetchAnalytics,
  getSessionProgress,
  
  // Quiz Management
  generateQuiz,
  submitQuiz,
  getQuizHistory,
  getQuiz,
  
  // Flashcards
  generateFlashcards,
  recordFlashcardReview,
  getFlashcards,
  getDueFlashcards,
  
  // Interview Preparation
  generateInterviewQuestions,
  submitInterviewPractice,
  getInterviewHistory,
  
  // Dashboard
  fetchDashboard,
  getDashboardStats,
  
  // Gamification
  fetchAchievements,
  checkAchievements,
  getLeaderboard,
  getUserRank,
  claimDailyReward,
  getUserPoints,
  
  // Study Plans
  createStudyPlan,
  fetchStudyPlans,
  getStudyPlan,
  updateStudyPlanProgress,
  deleteStudyPlan,
  
  // Study Groups
  createStudyGroup,
  fetchStudyGroups,
  getStudyGroup,
  joinStudyGroup,
  leaveStudyGroup,
  postGroupMessage,
  getGroupMessages,
  scheduleGroupSession,
  getMyStudyGroups,
  
  // Recommendations
  getRecommendedTopics,
  getRecommendedStudyTime,
  getNextTopicRecommendation,
  
  // Notes & Bookmarks
  createNote,
  getNotes,
  updateNote,
  deleteNote,
  searchNotes,
  
  // Weak Areas & Mastery
  getWeakAreas,
  getMasteryLevels,
  getLearningPathProgress,
  
  // Streaks & Habits
  getCurrentStreak,
  getStreakHistory,
  recordStreakActivity,
  
  // Export & Sharing
  exportProgressReport,
  shareAchievement,
  generateCertificate,
  
  // Notifications
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  updateNotificationPreferences,
  
  // Feedback & Ratings
  submitLessonFeedback,
  rateQuiz,
  reportIssue,
  
  // Utility
  searchTopics,
  getAvailableSubjects,
  getTopicPrerequisites,
  estimateStudyTime,
};
