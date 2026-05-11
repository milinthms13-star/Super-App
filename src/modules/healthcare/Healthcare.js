import React, { useMemo, useState } from "react";
import "./Healthcare.css";

const HEALTHCARE_SECTIONS = [
  {
    id: "consultation",
    title: "Doctor Consultation",
    description: "Book appointments, video calls, and chat with doctors",
    icon: "👨‍⚕️",
    features: ["Specialty search", "Online booking", "Video consultation", "Digital prescriptions"],
  },
  {
    id: "lab",
    title: "Lab Booking",
    description: "Blood tests, scans, and health packages",
    icon: "🧪",
    features: ["Home collection", "Health packages", "Digital reports", "Price comparison"],
  },
  {
    id: "records",
    title: "Health Records Vault",
    description: "Store prescriptions, reports, and medical history",
    icon: "📋",
    features: ["Secure storage", "AI analysis", "Family profiles", "Report sharing"],
  },
  {
    id: "pharmacy",
    title: "Pharmacy Delivery",
    description: "Medicine delivery and refill reminders",
    icon: "💊",
    features: ["Prescription upload", "Refill alerts", "Emergency delivery", "Monthly subscriptions"],
  },
  {
    id: "emergency",
    title: "Emergency & SOS",
    description: "Ambulance booking and emergency support",
    icon: "🚑",
    features: ["One-tap ambulance", "Hospital finder", "SOS alerts", "Live location sharing"],
  },
  {
    id: "elderly",
    title: "Elderly Care",
    description: "Medicine reminders and caretaker support",
    icon: "👴",
    features: ["Medicine alerts", "Appointment reminders", "Home nursing", "Health monitoring"],
  },
];

const DOCTOR_SPECIALTIES = [
  "General Physician", "Dentist", "Gynecologist", "Pediatrician", "Dermatologist",
  "ENT Specialist", "Orthopedic", "Mental Health", "Cardiologist", "Neurologist"
];

const LAB_TESTS = [
  { name: "Complete Blood Count", price: "₹300", homeCollection: true },
  { name: "Diabetes Test", price: "₹250", homeCollection: true },
  { name: "Thyroid Profile", price: "₹500", homeCollection: true },
  { name: "Pregnancy Test", price: "₹200", homeCollection: false },
];

const HEALTH_PACKAGES = [
  { name: "Full Body Checkup", tests: 45, price: "₹2,999", discount: "20% off" },
  { name: "Women Wellness", tests: 32, price: "₹1,999", discount: "15% off" },
  { name: "Senior Citizen", tests: 38, price: "₹2,499", discount: "25% off" },
  { name: "Diabetes Package", tests: 28, price: "₹1,499", discount: "10% off" },
];

const MEDICINES = [
  { name: "Paracetamol 500mg", price: "₹25", category: "Pain Relief" },
  { name: "Vitamin D3", price: "₹180", category: "Supplements" },
  { name: "Blood Pressure Medicine", price: "₹150", category: "BP/Diabetes" },
  { name: "Antibiotic Course", price: "₹320", category: "Infection" },
];

const Healthcare = () => {
  const [activeSection, setActiveSection] = useState("consultation");
  const [selectedSpecialty, setSelectedSpecialty] = useState("General Physician");
  const [medicineQuery, setMedicineQuery] = useState("");

  const filteredMedicines = useMemo(() => {
    return MEDICINES.filter(medicine =>
      medicine.name.toLowerCase().includes(medicineQuery.toLowerCase()) ||
      medicine.category.toLowerCase().includes(medicineQuery.toLowerCase())
    );
  }, [medicineQuery]);

  const handleDoctorBooking = (specialty) => {
    alert(`Demo: Booking consultation for ${specialty}. In real app, this would open booking flow.`);
  };

  const handleLabBooking = (test) => {
    alert(`Demo: Booking ${test}. In real app, this would schedule home collection.`);
  };

  const handleMedicineOrder = (medicine) => {
    alert(`Demo: Ordering ${medicine}. In real app, this would add to cart.`);
  };

  const handleEmergencyRequest = (type) => {
    alert(`Demo: Requesting ${type}. In real app, this would connect to emergency services.`);
  };

  return (
    <div className="healthcare-shell">
      <section className="healthcare-hero">
        <div className="healthcare-hero-copy">
          <h1>NilaCare — Complete Digital Healthcare Ecosystem</h1>
          <p>
            Doctor consultations, lab bookings, pharmacy delivery, health records, and emergency support all in one place.
          </p>
          <div className="healthcare-hero-actions">
            <button type="button" className="healthcare-primary-button" onClick={() => setActiveSection("consultation")}>
              Book Doctor
            </button>
            <button type="button" className="healthcare-secondary-button" onClick={() => setActiveSection("lab")}>
              Book Lab Test
            </button>
          </div>
          <div className="healthcare-hero-tags">
            <span>24/7 Support</span>
            <span>Home Collection</span>
            <span>Digital Records</span>
            <span>Emergency Ready</span>
          </div>
        </div>
      </section>

      <section className="healthcare-nav">
        {HEALTHCARE_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`healthcare-nav-item ${activeSection === section.id ? "active" : ""}`}
            onClick={() => setActiveSection(section.id)}
          >
            <span className="healthcare-nav-icon">{section.icon}</span>
            <strong>{section.title}</strong>
            <span>{section.description}</span>
          </button>
        ))}
      </section>

      {activeSection === "consultation" && (
        <section className="healthcare-section">
          <div className="healthcare-section-heading">
            <h2>Doctor Consultation</h2>
            <p>Find and book appointments with verified doctors across specialties.</p>
          </div>
          <div className="healthcare-consultation-grid">
            <div className="healthcare-filter-card">
              <label className="healthcare-field">
                <span>Specialty</span>
                <select value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)}>
                  {DOCTOR_SPECIALTIES.map((specialty) => (
                    <option key={specialty} value={specialty}>{specialty}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="healthcare-primary-button" onClick={() => handleDoctorBooking(selectedSpecialty)}>
                Find Doctors
              </button>
            </div>
            <div className="healthcare-doctors-list">
              <div className="healthcare-doctor-card">
                <strong>Dr. Sarah Johnson</strong>
                <span>{selectedSpecialty} • 12 years experience</span>
                <span>₹500 consultation • 4.8 ⭐ (234 reviews)</span>
                <div className="healthcare-doctor-actions">
                  <button type="button" className="healthcare-secondary-button">Book Clinic Visit</button>
                  <button type="button" className="healthcare-secondary-button">Video Call</button>
                </div>
              </div>
              <div className="healthcare-doctor-card">
                <strong>Dr. Rajesh Kumar</strong>
                <span>{selectedSpecialty} • 8 years experience</span>
                <span>₹400 consultation • 4.7 ⭐ (156 reviews)</span>
                <div className="healthcare-doctor-actions">
                  <button type="button" className="healthcare-secondary-button">Book Clinic Visit</button>
                  <button type="button" className="healthcare-secondary-button">Video Call</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeSection === "lab" && (
        <section className="healthcare-section">
          <div className="healthcare-section-heading">
            <h2>Lab Booking</h2>
            <p>Book blood tests, scans, and health packages with home collection.</p>
          </div>
          <div className="healthcare-lab-grid">
            <div className="healthcare-lab-section">
              <h3>Blood Tests</h3>
              {LAB_TESTS.map((test) => (
                <div key={test.name} className="healthcare-test-card">
                  <div>
                    <strong>{test.name}</strong>
                    <span>{test.price} • {test.homeCollection ? "Home Collection" : "Lab Visit"}</span>
                  </div>
                  <button type="button" className="healthcare-primary-button" onClick={() => handleLabBooking(test.name)}>
                    Book Now
                  </button>
                </div>
              ))}
            </div>
            <div className="healthcare-lab-section">
              <h3>Health Packages</h3>
              {HEALTH_PACKAGES.map((pkg) => (
                <div key={pkg.name} className="healthcare-package-card">
                  <div>
                    <strong>{pkg.name}</strong>
                    <span>{pkg.tests} tests • {pkg.price}</span>
                    <span className="healthcare-discount">{pkg.discount}</span>
                  </div>
                  <button type="button" className="healthcare-primary-button" onClick={() => handleLabBooking(pkg.name)}>
                    Book Package
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeSection === "records" && (
        <section className="healthcare-section">
          <div className="healthcare-section-heading">
            <h2>Health Records Vault</h2>
            <p>Securely store and manage all your medical records and family health profiles.</p>
          </div>
          <div className="healthcare-records-grid">
            <div className="healthcare-record-card">
              <h3>📄 Prescriptions</h3>
              <span>12 documents stored</span>
              <button type="button" className="healthcare-secondary-button">View All</button>
            </div>
            <div className="healthcare-record-card">
              <h3>🧪 Lab Reports</h3>
              <span>8 reports stored</span>
              <button type="button" className="healthcare-secondary-button">View All</button>
            </div>
            <div className="healthcare-record-card">
              <h3>📊 Scan Reports</h3>
              <span>5 scans stored</span>
              <button type="button" className="healthcare-secondary-button">View All</button>
            </div>
            <div className="healthcare-record-card">
              <h3>👨‍👩‍👧‍👦 Family Profiles</h3>
              <span>4 family members</span>
              <button type="button" className="healthcare-secondary-button">Manage Family</button>
            </div>
          </div>
        </section>
      )}

      {activeSection === "pharmacy" && (
        <section className="healthcare-section">
          <div className="healthcare-section-heading">
            <h2>Pharmacy Delivery</h2>
            <p>Upload prescriptions and get medicines delivered to your doorstep.</p>
          </div>
          <div className="healthcare-pharmacy-grid">
            <div className="healthcare-upload-card">
              <h3>Upload Prescription</h3>
              <input type="file" accept="image/*" />
              <button type="button" className="healthcare-primary-button">Upload & Order</button>
            </div>
            <div className="healthcare-medicines-section">
              <input
                type="text"
                placeholder="Search medicines..."
                value={medicineQuery}
                onChange={(e) => setMedicineQuery(e.target.value)}
                className="healthcare-search-input"
              />
              <div className="healthcare-medicines-list">
                {filteredMedicines.map((medicine) => (
                  <div key={medicine.name} className="healthcare-medicine-card">
                    <div>
                      <strong>{medicine.name}</strong>
                      <span>{medicine.category} • {medicine.price}</span>
                    </div>
                    <button type="button" className="healthcare-primary-button" onClick={() => handleMedicineOrder(medicine.name)}>
                      Add to Cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {activeSection === "emergency" && (
        <section className="healthcare-section">
          <div className="healthcare-section-heading">
            <h2>Emergency & SOS</h2>
            <p>One-tap emergency services and hospital finder for critical situations.</p>
          </div>
          <div className="healthcare-emergency-grid">
            <div className="healthcare-emergency-card">
              <h3>🚑 Ambulance Service</h3>
              <p>Request ambulance with live location sharing</p>
              <button type="button" className="healthcare-emergency-button" onClick={() => handleEmergencyRequest("ambulance")}>
                Request Ambulance
              </button>
            </div>
            <div className="healthcare-emergency-card">
              <h3>🏥 Nearby Hospitals</h3>
              <p>Find emergency hospitals in your area</p>
              <button type="button" className="healthcare-secondary-button" onClick={() => handleEmergencyRequest("hospitals")}>
                Find Hospitals
              </button>
            </div>
            <div className="healthcare-emergency-card">
              <h3>🚨 SOS Alert</h3>
              <p>Send emergency alert to family and contacts</p>
              <button type="button" className="healthcare-emergency-button" onClick={() => handleEmergencyRequest("sos")}>
                Send SOS
              </button>
            </div>
          </div>
          <div className="healthcare-disclaimer">
            <strong>⚠️ Emergency Disclaimer:</strong> This service is not a substitute for professional medical emergency response. For critical emergencies, call 108 or 112 immediately.
          </div>
        </section>
      )}

      {activeSection === "elderly" && (
        <section className="healthcare-section">
          <div className="healthcare-section-heading">
            <h2>Elderly Care Support</h2>
            <p>Medicine reminders, appointment tracking, and caretaker support for senior citizens.</p>
          </div>
          <div className="healthcare-elderly-grid">
            <div className="healthcare-care-card">
              <h3>💊 Medicine Reminders</h3>
              <p>Automated reminders for daily medications</p>
              <button type="button" className="healthcare-secondary-button">Set Reminders</button>
            </div>
            <div className="healthcare-care-card">
              <h3>📅 Appointment Tracking</h3>
              <p>Doctor visit and lab test reminders</p>
              <button type="button" className="healthcare-secondary-button">Manage Appointments</button>
            </div>
            <div className="healthcare-care-card">
              <h3>🏠 Home Nursing</h3>
              <p>Book qualified nurses for home care</p>
              <button type="button" className="healthcare-secondary-button">Book Nurse</button>
            </div>
            <div className="healthcare-care-card">
              <h3>🧘 Health Monitoring</h3>
              <p>Monthly health checkup packages</p>
              <button type="button" className="healthcare-secondary-button">Start Monitoring</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Healthcare;