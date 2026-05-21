const mongoose = require('mongoose');

const educationLearningEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    courseId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    lessonId: {
      type: String,
      trim: true,
      default: '',
    },
    eventType: {
      type: String,
      trim: true,
      default: 'progress_adjustment',
      enum: ['lesson_complete', 'quiz_complete', 'watch_time', 'progress_adjustment'],
      index: true,
    },
    progressDelta: {
      type: Number,
      default: 0,
    },
    progressAfter: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    quizScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

educationLearningEventSchema.index({ userEmail: 1, courseId: 1, createdAt: -1 });

module.exports = mongoose.model('EducationLearningEvent', educationLearningEventSchema);
