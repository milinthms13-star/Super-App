const mongoose = require('mongoose');

const attendeeSchema = new mongoose.Schema({
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MatrimonialProfile'
  },
  familyMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember'
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['candidate', 'family', 'friend']
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'tentative'],
    default: 'pending'
  },
  responseAt: Date
});

const meetingScheduleSchema = new mongoose.Schema({
  profile1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MatrimonialProfile',
    required: true,
    index: true
  },
  profile2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MatrimonialProfile',
    required: true,
    index: true
  },
  organizer: {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatrimonialProfile',
      required: true
    },
    familyMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyMember'
    }
  },
  meetingType: {
    type: String,
    enum: ['first_meeting', 'family_meeting', 'casual_meetup', 'video_call', 'phone_call', 'other'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 1000
  },
  
  // Scheduling details
  proposedDates: [{
    date: Date,
    time: String,
    proposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatrimonialProfile'
    },
    votes: [{
      profileId: mongoose.Schema.Types.ObjectId,
      vote: {
        type: String,
        enum: ['yes', 'no', 'maybe']
      }
    }]
  }],
  
  finalDate: {
    type: Date,
    index: true
  },
  finalTime: String,
  duration: {
    type: Number, // in minutes
    default: 60
  },
  
  // Location details
  meetingLocation: {
    type: {
      type: String,
      enum: ['physical', 'video', 'phone'],
      required: true
    },
    venue: {
      name: String,
      address: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      googleMapsLink: String
    },
    videoLink: String, // Jitsi/Zoom link
    phoneNumber: String
  },
  
  // Attendees
  attendees: [attendeeSchema],
  
  // Status
  status: {
    type: String,
    enum: ['proposed', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled'],
    default: 'proposed',
    index: true
  },
  
  // Reminders
  reminders: [{
    sentAt: Date,
    type: {
      type: String,
      enum: ['email', 'sms', 'whatsapp', 'push']
    },
    recipients: [mongoose.Schema.Types.ObjectId]
  }],
  
  // Post-meeting feedback
  feedback: [{
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatrimonialProfile'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    experience: {
      type: String,
      enum: ['excellent', 'good', 'average', 'poor']
    },
    interested: {
      type: String,
      enum: ['very_interested', 'interested', 'maybe', 'not_interested']
    },
    comments: String,
    suggestNextStep: {
      type: String,
      enum: ['second_meeting', 'family_introduction', 'more_time', 'not_compatible']
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Notes (private to organizer)
  privateNotes: String,
  
  // Cancellation
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatrimonialProfile'
    },
    reason: String,
    cancelledAt: Date
  },
  
  // Metadata
  metadata: {
    createdVia: {
      type: String,
      enum: ['web', 'mobile', 'family_portal']
    },
    timezone: String
  }
}, {
  timestamps: true
});

// Indexes
meetingScheduleSchema.index({ profile1: 1, profile2: 1 });
meetingScheduleSchema.index({ finalDate: 1, status: 1 });
meetingScheduleSchema.index({ 'organizer.profileId': 1 });

// Send reminders
meetingScheduleSchema.methods.sendReminders = async function(notificationService) {
  if (this.status !== 'scheduled' && this.status !== 'confirmed') {
    return;
  }

  const meetingDate = new Date(this.finalDate);
  const now = new Date();
  const hoursTillMeeting = (meetingDate - now) / (1000 * 60 * 60);

  // Send reminder 24 hours before and 2 hours before
  if ((hoursTillMeeting <= 24 && hoursTillMeeting > 23) || 
      (hoursTillMeeting <= 2 && hoursTillMeeting > 1)) {
    
    const recipients = this.attendees
      .filter(a => a.status === 'accepted')
      .map(a => a.profileId);

    const message = `Reminder: Meeting "${this.title}" scheduled on ${meetingDate.toLocaleString()}`;
    
    // Send via notification service
    await notificationService.sendBulk(recipients, 'meeting_reminder', {
      title: this.title,
      date: this.finalDate,
      location: this.meetingLocation
    });

    this.reminders.push({
      sentAt: new Date(),
      type: 'email',
      recipients
    });
    
    await this.save();
  }
};

// Check if meeting is upcoming (within 7 days)
meetingScheduleSchema.methods.isUpcoming = function() {
  if (!this.finalDate) return false;
  const now = new Date();
  const meetingDate = new Date(this.finalDate);
  const daysUntil = (meetingDate - now) / (1000 * 60 * 60 * 24);
  return daysUntil > 0 && daysUntil <= 7;
};

// Get meeting summary
meetingScheduleSchema.methods.getSummary = function() {
  return {
    id: this._id,
    title: this.title,
    type: this.meetingType,
    date: this.finalDate,
    time: this.finalTime,
    status: this.status,
    location: this.meetingLocation.type === 'physical' ? 
      this.meetingLocation.venue?.name : 
      this.meetingLocation.type,
    attendeeCount: this.attendees.length,
    acceptedCount: this.attendees.filter(a => a.status === 'accepted').length
  };
};

module.exports = mongoose.model('MeetingSchedule', meetingScheduleSchema);
