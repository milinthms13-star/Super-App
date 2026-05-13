export const HEALTHCARE_SECTIONS = [
  {
    id: "consultation",
    title: "Doctor Consultation",
    description: "Book clinic or video consultations",
    shortLabel: "Doctors",
    icon: "DR",
  },
  {
    id: "lab",
    title: "Lab & Scans",
    description: "Book tests, scans, and home collection",
    shortLabel: "Labs",
    icon: "LB",
  },
  {
    id: "records",
    title: "Records Vault",
    description: "Upload and manage medical files",
    shortLabel: "Records",
    icon: "RV",
  },
  {
    id: "family",
    title: "Family Profiles",
    description: "Manage family healthcare profiles",
    shortLabel: "Family",
    icon: "FM",
  },
  {
    id: "pharmacy",
    title: "Pharmacy",
    description: "Order medicines with safety checks",
    shortLabel: "Pharmacy",
    icon: "PH",
  },
  {
    id: "reminders",
    title: "Refill Reminders",
    description: "Medicine refill and elderly reminders",
    shortLabel: "Reminders",
    icon: "RM",
  },
  {
    id: "emergency",
    title: "Emergency SOS",
    description: "Instant emergency actions",
    shortLabel: "SOS",
    icon: "ER",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Healthcare alerts and updates",
    shortLabel: "Alerts",
    icon: "NT",
  },
  {
    id: "elderly",
    title: "Elderly Care",
    description: "Plans and reminders for seniors",
    shortLabel: "Elderly",
    icon: "EC",
  },
  {
    id: "partner",
    title: "Partner Dashboard",
    description: "Doctor/lab/pharmacy partner and admin approvals",
    shortLabel: "Partner",
    icon: "PD",
  },
];

export const MOCK_DOCTORS = [
  {
    id: "doc-1",
    name: "Dr. Sarah Johnson",
    specialty: "General Physician",
    experienceYears: 12,
    consultationFee: 500,
    rating: 4.8,
    reviewsCount: 234,
    languages: ["English", "Malayalam", "Hindi"],
    qualifications: "MBBS, MD (Internal Medicine)",
    clinicAddress: "Kozhikode Medical Center",
    availableModes: ["clinic", "video"],
    availableSlots: [
      { date: "2026-05-14", times: ["09:30", "10:00", "11:00", "17:30"] },
      { date: "2026-05-15", times: ["10:30", "12:00", "18:00"] },
      { date: "2026-05-16", times: ["09:00", "15:30", "19:00"] },
    ],
  },
  {
    id: "doc-2",
    name: "Dr. Rajesh Kumar",
    specialty: "Cardiologist",
    experienceYears: 8,
    consultationFee: 700,
    rating: 4.7,
    reviewsCount: 156,
    languages: ["English", "Tamil"],
    qualifications: "MBBS, DM (Cardiology)",
    clinicAddress: "Malabar Heart Institute",
    availableModes: ["clinic", "video"],
    availableSlots: [
      { date: "2026-05-14", times: ["11:30", "12:30", "16:30"] },
      { date: "2026-05-15", times: ["09:30", "14:30", "17:00"] },
      { date: "2026-05-17", times: ["10:00", "13:00", "18:30"] },
    ],
  },
  {
    id: "doc-3",
    name: "Dr. Anitha Nair",
    specialty: "Gynecologist",
    experienceYears: 11,
    consultationFee: 600,
    rating: 4.9,
    reviewsCount: 192,
    languages: ["English", "Malayalam"],
    qualifications: "MBBS, DGO, MS (OBG)",
    clinicAddress: "Nila Women Wellness Clinic",
    availableModes: ["clinic", "video"],
    availableSlots: [
      { date: "2026-05-14", times: ["09:00", "10:00", "12:00"] },
      { date: "2026-05-16", times: ["11:00", "14:00", "17:30"] },
      { date: "2026-05-18", times: ["09:30", "15:00", "18:00"] },
    ],
  },
];

export const MOCK_LAB_TESTS = [
  { id: "lab-1", name: "Complete Blood Count", price: 300, homeCollection: true, type: "blood" },
  { id: "lab-2", name: "Diabetes Test", price: 250, homeCollection: true, type: "blood" },
  { id: "lab-3", name: "Thyroid Profile", price: 500, homeCollection: true, type: "blood" },
  { id: "lab-4", name: "Pregnancy Test", price: 200, homeCollection: false, type: "blood" },
  { id: "scan-1", name: "MRI Scan", price: 4500, homeCollection: false, type: "scan" },
  { id: "scan-2", name: "CT Scan", price: 3800, homeCollection: false, type: "scan" },
  { id: "scan-3", name: "Ultrasound", price: 1400, homeCollection: false, type: "scan" },
  { id: "scan-4", name: "X-Ray", price: 600, homeCollection: false, type: "scan" },
];

export const MOCK_HEALTH_PACKAGES = [
  { id: "pkg-1", name: "Full Body Checkup", tests: 45, price: 2999, discount: "20% off" },
  { id: "pkg-2", name: "Women Wellness", tests: 32, price: 1999, discount: "15% off" },
  { id: "pkg-3", name: "Senior Citizen", tests: 38, price: 2499, discount: "25% off" },
  { id: "pkg-4", name: "Diabetes Package", tests: 28, price: 1499, discount: "10% off" },
];

export const MOCK_MEDICINES = [
  { id: "med-1", name: "Paracetamol 500mg", price: 25, category: "Pain Relief", requiresPrescription: false },
  { id: "med-2", name: "Vitamin D3", price: 180, category: "Supplements", requiresPrescription: false },
  { id: "med-3", name: "Blood Pressure Medicine", price: 150, category: "Cardiac", requiresPrescription: true },
  { id: "med-4", name: "Antibiotic Course", price: 320, category: "Infection", requiresPrescription: true },
  { id: "med-5", name: "Insulin Pen", price: 980, category: "Diabetes", requiresPrescription: true },
  { id: "med-6", name: "Calcium Tablets", price: 220, category: "Supplements", requiresPrescription: false },
];

export const MOCK_RECORDS = [
  {
    id: "rec-1",
    title: "Cardiology Follow Up",
    category: "Prescription",
    doctorName: "Dr. Rajesh Kumar",
    familyMember: "Self",
    recordDate: "2026-04-22",
    fileName: "cardiology-prescription-apr.pdf",
    fileType: "application/pdf",
    fileUrl: "",
  },
  {
    id: "rec-2",
    title: "CBC Report",
    category: "Lab Report",
    doctorName: "Dr. Sarah Johnson",
    familyMember: "Father",
    recordDate: "2026-04-18",
    fileName: "cbc-report-apr.jpg",
    fileType: "image/jpeg",
    fileUrl: "",
  },
];

export const MOCK_APPOINTMENTS = [
  {
    id: "apt-1",
    doctorId: "doc-1",
    doctorName: "Dr. Sarah Johnson",
    specialty: "General Physician",
    appointmentDate: "2026-05-14",
    appointmentTime: "10:00",
    mode: "video",
    status: "confirmed",
    reason: "Recurring fever",
    patientName: "Primary User",
  },
  {
    id: "apt-2",
    doctorId: "doc-2",
    doctorName: "Dr. Rajesh Kumar",
    specialty: "Cardiologist",
    appointmentDate: "2026-05-20",
    appointmentTime: "17:00",
    mode: "clinic",
    status: "booked",
    reason: "Quarterly heart check",
    patientName: "Father",
  },
];

export const FAMILY_MEMBERS = ["Self", "Father", "Mother", "Spouse", "Child", "Grandparent"];

export const GOVERNMENT_SCHEMES = [
  {
    id: "scheme-1",
    name: "Ayushman Bharat",
    summary: "Coverage for eligible families with cashless hospitalization support.",
  },
  {
    id: "scheme-2",
    name: "Karunya Arogya Suraksha Padhathi",
    summary: "Kerala support program for major critical care treatments.",
  },
  {
    id: "scheme-3",
    name: "Kerala Health Insurance Assistance",
    summary: "State-aligned insurance assistance and claim support guidance.",
  },
];

export const ELDERLY_CARE_PLANS = [
  {
    id: "care-1",
    title: "Monthly Elderly Care Plan",
    description: "Doctor checkup, medicine refill review, vitals tracking, and family summary.",
  },
  {
    id: "care-2",
    title: "Medicine Refill Reminder",
    description: "Auto reminders 5 days before medicines run out.",
  },
  {
    id: "care-3",
    title: "Insurance and Claim Assistance",
    description: "Help desk for submitting hospital bills and reimbursement claims.",
  },
];
