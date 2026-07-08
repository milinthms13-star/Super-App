const mongoose = require('mongoose');

const skillCourseSchema = new mongoose.Schema(
  {
    courseId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    level: {
      type: String,
      default: 'Beginner',
      trim: true,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      index: true,
    },
    duration: {
      type: String,
      default: 'Self paced',
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    modules: {
      type: [
        {
          title: { type: String, required: true, trim: true },
          description: { type: String, trim: true, default: '' },
          lessons: {
            type: [
              {
                title: { type: String, required: true, trim: true },
                description: { type: String, trim: true, default: '' },
                duration: { type: String, trim: true, default: '' },
                videoUrl: { type: String, trim: true, default: '' },
                contentUrl: { type: String, trim: true, default: '' },
                order: { type: Number, default: 0 },
              },
            ],
            default: [],
          },
          order: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    certificateAvailable: {
      type: Boolean,
      default: false,
    },
    jobLinked: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    instructor: {
      name: { type: String, trim: true, default: '' },
      bio: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, default: '' },
    },
    published: {
      type: Boolean,
      default: true,
      index: true,
    },
    enrollmentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

skillCourseSchema.index({ title: 'text', description: 'text', tags: 'text' });
skillCourseSchema.index({ published: 1, category: 1, level: 1 });

module.exports = mongoose.model('SkillCourse', skillCourseSchema);
