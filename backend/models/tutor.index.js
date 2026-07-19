/**
 * Tutor Module Models - Central Export
 * 
 * This file provides centralized access to all tutor-related models
 */

const TutorSession = require('./TutorSession.model');
const TutorProgress = require('./TutorProgress.model');
const TutorQuiz = require('./TutorQuiz.model');
const TutorFlashcard = require('./TutorFlashcard.model');
const TutorAchievement = require('./TutorAchievement.model');
const TutorUserStats = require('./TutorUserStats.model');
const StudyPlan = require('./StudyPlan.model');
const StudyGroup = require('./StudyGroup.model');

module.exports = {
  TutorSession,
  TutorProgress,
  TutorQuiz,
  TutorFlashcard,
  TutorAchievement,
  TutorUserStats,
  StudyPlan,
  StudyGroup,
};
