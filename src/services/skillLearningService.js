import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

const BASE_API_PATH = `${API_BASE_URL}/appdata/skilllearning`;
const EDUCATION_API_BASE = `${API_BASE_URL}/appdata/education`;

export const fetchCourses = async (params = {}) => {
  const response = await axios.get(`${BASE_API_PATH}/courses`, { params });
  return response?.data?.data || {};
};

export const fetchCourseDetail = async (courseId) => {
  const response = await axios.get(`${BASE_API_PATH}/courses/${encodeURIComponent(courseId)}`);
  return response?.data?.data || {};
};

export const fetchDashboard = async () => {
  const response = await axios.get(`${BASE_API_PATH}/dashboard`);
  return response?.data?.data || {};
};

export const fetchCertificates = async () => {
  const response = await axios.get(`${BASE_API_PATH}/certificates`);
  return response?.data?.data || {};
};

export const fetchWallet = async () => {
  const response = await axios.get(`${BASE_API_PATH}/wallet`);
  return response?.data?.data || {};
};

export const fetchEducationState = async () => {
  const response = await axios.get(`${EDUCATION_API_BASE}/state`);
  return response?.data?.data || {};
};

export const fetchLearningOverview = async () => {
  const response = await axios.get(`${EDUCATION_API_BASE}/overview360`);
  return response?.data?.data || {};
};

export const fetchLearningPath = async () => {
  const response = await axios.get(`${EDUCATION_API_BASE}/discovery`);
  return response?.data?.data || {};
};

export const fetchSkillRecommendations = async (params = {}) => {
  const response = await axios.get(`${BASE_API_PATH}/recommendations`, { params });
  return response?.data?.data || {};
};

export const fetchProgressHistory = async (courseId) => {
  const response = await axios.get(`${EDUCATION_API_BASE}/progress/history`, { params: { courseId } });
  return response?.data?.data || {};
};

export const recordLearningProgress = async (payload = {}) => {
  const response = await axios.post(`${EDUCATION_API_BASE}/progress/event`, payload);
  return response?.data || {};
};

export const fetchQuestions = async (category) => {
  const response = await axios.get(`${BASE_API_PATH}/questions`, { params: { category } });
  return response?.data?.data || {};
};

export const submitMockTest = async (payload = {}) => {
  const response = await axios.post(`${BASE_API_PATH}/tests/submit`, payload);
  return response?.data?.data || {};
};

export const uploadCertificate = async (formData) => {
  const response = await axios.post(`${BASE_API_PATH}/certificates/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response?.data || {};
};

export const enrollCourse = async (courseId) => {
  const response = await axios.post(`${BASE_API_PATH}/course-enroll`, { courseId });
  return response?.data || {};
};

export default {
  fetchCourses,
  fetchCourseDetail,
  fetchDashboard,
  fetchCertificates,
  fetchWallet,
  fetchEducationState,
  fetchLearningOverview,
  fetchLearningPath,
  fetchSkillRecommendations,
  fetchProgressHistory,
  recordLearningProgress,
  fetchQuestions,
  submitMockTest,
  uploadCertificate,
  enrollCourse,
};
