const mongoose = require('mongoose');

const karaokeParticipantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['host', 'guest'],
      required: true,
    },
    displayName: {
      type: String,
      default: '',
      trim: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const karaokeTakeSchema = new mongoose.Schema(
  {
    singerRole: {
      type: String,
      enum: ['host', 'guest'],
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    format: {
      type: String,
      default: 'webm',
      trim: true,
    },
    durationMs: {
      type: Number,
      default: 0,
      min: 0,
    },
    localStartedAtMs: {
      type: Number,
      default: null,
    },
    trackOffsetMs: {
      type: Number,
      default: 0,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const karaokeMixOutputSchema = new mongoose.Schema(
  {
    format: {
      type: String,
      enum: ['mp3', 'wav'],
      required: true,
    },
    outputUrl: {
      type: String,
      required: true,
      trim: true,
    },
    fileSizeBytes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const karaokeMixJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued',
    },
    startedAt: Date,
    completedAt: Date,
    errorMessage: {
      type: String,
      default: '',
      trim: true,
    },
    outputs: [karaokeMixOutputSchema],
  },
  { _id: false }
);

const karaokeLyricSchema = new mongoose.Schema(
  {
    timeSec: {
      type: Number,
      required: true,
      min: 0,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const karaokeDuetRoomSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      minlength: 6,
      maxlength: 8,
    },
    inviteToken: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'live', 'recording', 'mixing', 'completed', 'closed'],
      default: 'waiting',
      index: true,
    },
    title: {
      type: String,
      default: 'Remote Karaoke Duet',
      trim: true,
    },
    karaokeTrackUrl: {
      type: String,
      default: '',
      trim: true,
    },
    karaokeTrackBpm: {
      type: Number,
      default: 0,
      min: 0,
    },
    startedAtMs: {
      type: Number,
      default: null,
    },
    participants: [karaokeParticipantSchema],
    lyrics: [karaokeLyricSchema],
    settings: {
      hearOtherSinger: {
        type: Boolean,
        default: true,
      },
      enableNoiseCancellation: {
        type: Boolean,
        default: true,
      },
      enableEchoCancellation: {
        type: Boolean,
        default: true,
      },
      enablePitchCorrection: {
        type: Boolean,
        default: false,
      },
      reverbPreset: {
        type: String,
        default: 'studio-light',
        trim: true,
      },
    },
    realtimeState: {
      latestTimecodeMs: {
        type: Number,
        default: 0,
      },
      lastSyncAt: Date,
      beatCount: {
        type: Number,
        default: 0,
      },
    },
    takes: [karaokeTakeSchema],
    mixJobs: [karaokeMixJobSchema],
    finalOutputs: [karaokeMixOutputSchema],
  },
  { timestamps: true }
);

karaokeDuetRoomSchema.index({ createdBy: 1, createdAt: -1 });
karaokeDuetRoomSchema.index({ roomCode: 1, status: 1 });

module.exports =
  mongoose.models.KaraokeDuetRoom ||
  mongoose.model('KaraokeDuetRoom', karaokeDuetRoomSchema);
