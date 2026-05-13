# Healthcare User Manual (Front-End)

> Module: `src/modules/healthcare/Healthcare.js`  
> Product name in UI: **NilaCare — Complete Digital Healthcare Ecosystem**

## 1) What this module does
Healthcare provides an integrated digital healthcare experience with:
- **Doctor Consultation** (specialty selection + booking types)
- **Lab Booking** (blood tests, scans, and health packages)
- **Health Records Vault** (prescriptions/reports/scan reports/family profiles)
- **Pharmacy Delivery** (upload prescription + medicine search + add to cart)
- **Emergency & SOS** (ambulance requests, hospital finder, SOS alerts)
- **Elderly Care** (medicine reminders, appointment tracking, home nursing, health monitoring)

## 2) Entry point in the app
1. Open **Healthcare** from main navigation/menu.

## 3) Main navigation (sections)
Use the section navigation buttons to switch between features:
- Doctor Consultation
- Lab Booking
- Health Records Vault
- Pharmacy Delivery
- Emergency & SOS
- Elderly Care

## 4) Doctor Consultation
### 4.1 Choose a specialty
1. Select a **Specialty** dropdown (General Physician, Dentist, Gynecologist, Pediatrician, Dermatologist, ENT, Orthopedic, Mental Health, Cardiologist, Neurologist).
2. Click **Find Doctors**.

### 4.2 Book/consult
You’ll see doctor cards and actions:
- **Book Clinic Visit**
- **Video Call**

Expected behavior (demo):
- Buttons show a demo booking alert (in real app: open booking flow).

## 5) Lab Booking
This section shows:
- **Blood Tests**
- **Health Packages**

### 5.1 Book a blood test
1. Find a test in the **Blood Tests** list.
2. Click **Book Now**.

Expected behavior (demo):
- Alerts that booking would schedule home collection.

### 5.2 Book a package
1. Choose a health package card.
2. Click **Book Package**.

Expected behavior (demo):
- Alerts that booking would schedule home collection.

## 6) Health Records Vault
Open the vault section to view record buckets:
- Prescriptions
- Lab Reports
- Scan Reports
- Family Profiles

Actions (as shown in UI):
- **View All**
- **Manage Family**

## 7) Pharmacy Delivery
1. Click/open **Pharmacy Delivery**.
2. Upload a prescription image:
   - file upload input (accepts `image/*`)
3. Click **Upload & Order** (demo behavior may require backend wiring).

Then:
4. Search medicines using the search box.
5. For each medicine card, click **Add to Cart**.

Expected behavior:
- Medicine list filters by name/category query.
- “Add to Cart” uses demo alert in this build.

## 8) Emergency & SOS
Open **Emergency & SOS** to access emergency options:

- 🚑 **Ambulance Service**
  - Click **Request Ambulance**
- 🏥 **Nearby Hospitals**
  - Click **Find Hospitals**
- 🚨 **SOS Alert**
  - Click **Send SOS**

Expected behavior (demo):
- Buttons show demo request alerts.

Important disclaimer:
- The UI includes an emergency disclaimer recommending calling **108 or 112** for critical emergencies.

## 9) Elderly Care
Open **Elderly Care** and use caretaker support tools:

- 💊 Medicine Reminders → **Set Reminders**
- 📅 Appointment Tracking → **Manage Appointments**
- 🏠 Home Nursing → **Book Nurse**
- 🧘 Health Monitoring → **Start Monitoring**

Expected behavior (demo):
- Buttons are informational and may show alerts or connect to backend in production.

## 10) Troubleshooting
- Doctor booking doesn’t work:
  - this build uses demo alerts; ensure booking integration is enabled in backend.
- Pharmacy medicines list doesn’t match:
  - use the medicine search input and check spelling/category text.
- Emergency disclaimer:
  - for critical emergencies, call emergency services immediately.

## 11) UI sections reference (quick)
- Doctor Consultation: specialty dropdown + doctor cards
- Lab Booking: blood tests + health packages cards
- Records Vault: prescriptions/reports/scan buckets + family management
- Pharmacy Delivery: upload prescription + medicine search + add to cart
- Emergency & SOS: ambulance / hospitals / SOS buttons + disclaimer
- Elderly Care: reminders, appointments, home nursing, monitoring
