const mongoose = require('mongoose');

const danceDuetJobSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    userName: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed', 'deleted'],
      default: 'queued',
      index: true,
    },
    sourceFiles: {
      video1Name: { type: String, default: '', trim: true },
      video2Name: { type: String, default: '', trim: true },
      musicName: { type: String, default: '', trim: true },
      backgroundName: { type: String, default: '', trim: true },
      video1Size: { type: Number, default: 0 },
      video2Size: { type: Number, default: 0 },
      musicSize: { type: Number, default: 0 },
      backgroundSize: { type: Number, default: 0 },
    },
    options: {
      mode: { type: String, default: 'auto', trim: true },
      outputFormat: { type: String, default: 'reel', trim: true },
      backgroundColor: { type: String, default: 'black', trim: true },
      removeBackground: { type: Boolean, default: false },
      syncAudio: { type: Boolean, default: true },
      mirrorSecondVideo: { type: Boolean, default: false },
      secondVideoDelaySeconds: { type: Number, default: 0 },
      trimStart1: { type: Number, default: 0 },
      trimEnd1: { type: Number, default: 0 },
      trimStart2: { type: Number, default: 0 },
      trimEnd2: { type: Number, default: 0 },
    },
    output: {
      outputUrl: { type: String, default: '', trim: true },
      warning: { type: String, default: '', trim: true },
      errorMessage: { type: String, default: '', trim: true },
      processingMs: { type: Number, default: 0 },
    },
    queuedInput: {
      video1Path: { type: String, default: '', trim: true },
      video2Path: { type: String, default: '', trim: true },
      musicPath: { type: String, default: '', trim: true },
      backgroundPath: { type: String, default: '', trim: true },
    },
    processing: {
      attempts: { type: Number, default: 0 },
      maxAttempts: { type: Number, default: 2 },
      queuedAt: { type: Date, default: null },
      lastAttemptAt: { type: Date, default: null },
      nextRetryAt: { type: Date, default: null },
      deadLetteredAt: { type: Date, default: null },
      deadLetterReason: { type: String, default: '', trim: true },
      worker: { type: String, default: '', trim: true },
    },
    preflight: {
      readinessScore: { type: Number, default: 0 },
      riskLevel: { type: String, default: '', trim: true },
      summary: { type: String, default: '', trim: true },
      suggestions: [{ type: String, default: '' }],
      checks: [{ type: String, default: '' }],
      diagnostics: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    growthPack: {
      challengeTitle: { type: String, default: '', trim: true },
      thumbnailHook: { type: String, default: '', trim: true },
      shareCaption: { type: String, default: '', trim: true },
      instagramCaption: { type: String, default: '', trim: true },
      youtubeTitle: { type: String, default: '', trim: true },
      callToAction: { type: String, default: '', trim: true },
      hashtags: [{ type: String, default: '' }],
    },
    requestMetadata: {
      requestId: { type: String, default: '', trim: true },
      idempotencyKey: { type: String, default: '', trim: true },
      route: { type: String, default: '', trim: true },
      userAgent: { type: String, default: '', trim: true },
    },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

danceDuetJobSchema.index({ userEmail: 1, createdAt: -1 });
danceDuetJobSchema.index({ userEmail: 1, status: 1, createdAt: -1 });
danceDuetJobSchema.index({ userEmail: 1, 'requestMetadata.idempotencyKey': 1, createdAt: -1 });
danceDuetJobSchema.index({ status: 1, 'processing.nextRetryAt': 1, createdAt: 1 });

module.exports =
  mongoose.models.DanceDuetJob || mongoose.model('DanceDuetJob', danceDuetJobSchema);
