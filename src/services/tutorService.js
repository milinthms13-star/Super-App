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
 * Record lesson progress
 */
export const recordProgress = async (progressData) => {
  const response = await api.post('/lessons/progress', progressData);
  return response.data.data;
};

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
 * Get personalized dashboard
 */
export const fetchDashboard = async () => {
  const response = await api.get('/dashboard');
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
 * Get progress analytics
 */
export const fetchAnalytics = async (params) => {
  const response = await api.get('/progress/analytics', { params });
  return response.data.data;
};

export default {
  startSession,
  getSession,
  recordProgress,
  generateQuiz,
  submitQuiz,
  generateInterviewQuestions,
  submitInterviewPractice,
  fetchDashboard,
  completeSession,
  fetchAnalytics,
};
