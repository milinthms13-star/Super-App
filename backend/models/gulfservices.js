const mongoose = require('mongoose');
const { Schema } = mongoose;

const timelineEntrySchema = new Schema(
  {
    status: { type: String, trim: true },
    note: { type: String, trim: true, default: '' },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

const GulfVisaRequestSchema = new Schema(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    visaType: { type: String, required: true, trim: true },
    urgency: { type: String, trim: true, default: 'normal' },
    currentLocation: { type: String, trim: true },
    message: { type: String, trim: true, default: '' },
    status: { type: String, trim: true, default: 'submitted', index: true },
    timeline: { type: [timelineEntrySchema], default: [] },
  },
  { timestamps: true }
);

const GulfJobSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, trim: true, required: true },
    country: { type: String, trim: true, required: true, index: true },
    category: { type: String, trim: true, required: true, index: true },
    summary: { type: String, trim: true },
    salary: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
    },
    visaType: { type: String, trim: true, default: 'Employment' },
    accommodation: { type: Boolean, default: false },
    food: { type: Boolean, default: false },
    urgentHiring: { type: Boolean, default: false },
    experience: { type: Number, default: 0, min: 0 },
    description: { type: String, trim: true },
    recruiterId: { type: String, trim: true, default: '' },
    status: { type: String, trim: true, default: 'active', index: true },
  },
  { timestamps: true }
);

const GulfJobApplicationSchema = new Schema(
  {
    applicationId: { type: String, required: true, unique: true, index: true },
    jobId: { type: String, required: true, trim: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true },
    experience: { type: Number, default: 0, min: 0 },
    currentCompany: { type: String, trim: true, default: '' },
    expectedSalary: { type: Number, default: 0, min: 0 },
    availabilityDays: { type: Number, default: 30, min: 0 },
    cvFile: { type: String, trim: true, default: '' },
    status: { type: String, trim: true, default: 'submitted', index: true },
  },
  { timestamps: true }
);

const GulfAttestationRequestSchema = new Schema(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true },
    documentType: { type: String, required: true, trim: true },
    documentName: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    urgency: { type: String, trim: true, default: 'standard' },
    documentFile: { type: String, trim: true, default: '' },
    status: { type: String, trim: true, default: 'document_received', index: true },
    timeline: { type: [timelineEntrySchema], default: [] },
  },
  { timestamps: true }
);

const GulfTravelSupportSchema = new Schema(
  {
    supportId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    serviceType: { type: String, trim: true },
    details: { type: String, trim: true },
    status: { type: String, trim: true, default: 'requested' },
  },
  { timestamps: true }
);

const GulfMedicalBookingSchema = new Schema(
  {
    bookingId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, index: true },
    phone: { type: String, trim: true },
    country: { type: String, trim: true },
    appointmentDate: { type: Date },
    status: { type: String, trim: true, default: 'scheduled', index: true },
  },
  { timestamps: true }
);

const GulfReturneeServiceSchema = new Schema(
  {
    serviceId: { type: String, required: true, unique: true, index: true },
    email: { type: String, trim: true, index: true },
    fullName: { type: String, trim: true },
    serviceCategory: { type: String, trim: true },
    details: { type: String, trim: true },
    status: { type: String, trim: true, default: 'pending' },
  },
  { timestamps: true }
);

const GulfNRIServiceSchema = new Schema(
  {
    serviceId: { type: String, required: true, unique: true, index: true },
    email: { type: String, trim: true, index: true },
    fullName: { type: String, trim: true },
    serviceType: { type: String, trim: true },
    details: { type: String, trim: true },
    status: { type: String, trim: true, default: 'open' },
  },
  { timestamps: true }
);

const GulfEmergencyCaseSchema = new Schema(
  {
    caseId: { type: String, required: true, unique: true, index: true },
    issueType: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    country: { type: String, trim: true },
    message: { type: String, trim: true },
    status: { type: String, trim: true, default: 'received', index: true },
  },
  { timestamps: true }
);

const GulfUserSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: String, trim: true, index: true },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    country: { type: String, trim: true },
    preferences: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const GulfRecruiterSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    licenseNumber: { type: String, trim: true },
    registrationNumber: { type: String, trim: true },
    country: { type: String, trim: true },
    verified: { type: Boolean, default: false, index: true },
    status: { type: String, trim: true, default: 'active' },
    successCases: { type: Number, default: 0 },
    rating: { type: Number, default: 4.5 },
    reviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = {
  GulfVisaRequest: mongoose.model('GulfVisaRequest', GulfVisaRequestSchema),
  GulfJob: mongoose.model('GulfJob', GulfJobSchema),
  GulfJobApplication: mongoose.model('GulfJobApplication', GulfJobApplicationSchema),
  GulfAttestationRequest: mongoose.model('GulfAttestationRequest', GulfAttestationRequestSchema),
  GulfTravelSupport: mongoose.model('GulfTravelSupport', GulfTravelSupportSchema),
  GulfMedicalBooking: mongoose.model('GulfMedicalBooking', GulfMedicalBookingSchema),
  GulfReturneeService: mongoose.model('GulfReturneeService', GulfReturneeServiceSchema),
  GulfNRIService: mongoose.model('GulfNRIService', GulfNRIServiceSchema),
  GulfEmergencyCase: mongoose.model('GulfEmergencyCase', GulfEmergencyCaseSchema),
  GulfUser: mongoose.model('GulfUser', GulfUserSchema),
  GulfRecruiter: mongoose.model('GulfRecruiter', GulfRecruiterSchema),
};
