// Add these fields inside backend/models/SosIncident.js schema if you want to persist extra SOS details:

emergencyProfile: {
  bloodGroup: String,
  allergies: String,
  medicalConditions: String,
  emergencyNotes: String,
  homeAddress: String,
  preferredHospital: String,
},
silentMode: {
  type: Boolean,
  default: false,
},
leadPriority: {
  type: String,
  enum: ['normal', 'high', 'critical'],
  default: 'normal',
},
falseAlarmReason: {
  type: String,
  default: '',
},
liveLocationLastUpdatedAt: Date,
