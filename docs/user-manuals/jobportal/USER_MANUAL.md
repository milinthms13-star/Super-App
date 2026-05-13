# JobPortal User Manual (Front-End)

> Module: `src/modules/jobportal/JobPortal.js`

## 1) What this module does
JobPortal lets users:
- Browse jobs by **category** (Local / Gulf / IT / Gig)
- Use **search** and additional **filters** (location, salary, experience)
- Open **Job Details** in a modal
- **Save** jobs (heart toggle) and **Apply** to jobs (apply toggle)
- Build a **Job-Seeker Profile** (resume score + resume/voice/video + skills/availability)
- Act as an **Employer**:
  - **Post New Job**
  - View a simple **Employer Dashboard** for posted jobs
- Chat with the in-app **AI Career Assistant** (demo responses)

## 2) Entry point in the app
1. Navigate to **Job Portal** from the main navigation/menu.

## 3) Main navigation tabs (UI)
Switch views using the top navigation bar:
- **Home**
- **Jobs**
- **Applications**
- **Profile**
- **Employer**

> Implementation note: the UI renders different panels based on `activeTab`. “Jobs” and “Home” browsing behaviors are driven by internal states (`selectedCategory`, etc.).

## 4) User flows

### 4.1 Home: discover and browse jobs
1. Open **Job Portal**.
2. (Optional) Use the **search** input:
   - Search matches job **title**, **company**, or **skills**
3. Click a **category card** in the category grid:
   - Local Jobs, Gulf Jobs, IT Jobs, Gig Jobs
4. After selecting a category, you’ll see a category view with:
   - A back button (**← Back**)
   - Sub-options buttons (subcategory/country/type depending on the selected category)
   - A list of matching jobs
5. Click any job item to open **Job Details** (modal).

### 4.2 Search + filters (Jobs view)
The component includes UI state for:
- `filterLocation`
- `filterSalary`
- `filterExperience`

Use these UI controls wherever they appear in your current build to narrow the job list by location/salary/experience (in the sample code they’re part of filtering logic for `filteredJobs`).

### 4.3 Save a job
1. On a job card/list item, click the **Save** button:
   - **🤍 Save** → becomes **❤️ Saved**
2. Saved jobs are stored in local component state (`savedJobs`) and persisted via browser `localStorage`.

### 4.4 Apply to a job
1. Open a job’s **Job Details** modal, or use the job card actions.
2. Click **🚀 Apply Now**.
3. The button becomes disabled and changes to **✅ Applied**.

Applied jobs are stored in `appliedJobs` and persisted via `localStorage`.

### 4.5 Job Details modal
When you click a job:
- You can view:
  - Company
  - Location
  - Salary
  - Experience
  - Job description
  - Requirements displayed as skill tags
  - Benefits list
- Actions at the bottom:
  - **🚀 Apply Now / ✅ Applied**
  - **🤍 Save Job / ❤️ Saved**
- Close with the **×** button.

---

## 5) Profile Builder (Profile tab)

### 5.1 Build your profile and improve Resume Score
1. Open **Profile** tab.
2. Fill **Basic Information**:
   - Full Name
   - Email
   - Phone
3. Fill **Resume & Documents**:
   - Upload **resume** (.pdf/.doc/.docx)
   - Upload **video intro** (video/*)
   - Upload **voice resume** (audio/*)
4. Fill **Skills & Experience**:
   - Skills (comma separated)
   - Experience dropdown
   - Expected Salary
5. Fill **Availability**:
   - Immediate Joiner / Part-time Only / Remote Only / Gulf Ready
   - Toggle **Ready for Gulf Jobs**
6. Click **Save Profile**.

### 5.2 Resume Score
- The UI shows a **percentage** in a circle.
- Score is computed from which profile fields are present (resume/skills/experience/portfolio/video intro/language count).

---

## 6) Employer (Employer tab)

### 6.1 Employer Dashboard
In **Employer** view:
- You see stats derived from internal arrays:
  - Active Jobs (posted by current user)
  - Total Applications (derived from `appliedJobs.length * 3`)
  - Shortlisted and Hired (simple calculated ratios)
- You see a list of up to **3** “Your Posted Jobs”
  - Each row has actions: **View** and **Edit** (currently UI buttons; the detailed edit flow is not implemented in the provided component code)

### 6.2 Post New Job
1. In **Employer** tab, click **+ Post New Job**.
2. Fill the form:
   - Job Details:
     - Job Title
     - Company Name
     - Location
     - Job Type (Local / Gulf / IT / Gig)
     - Subtype
   - Compensation & Requirements:
     - Salary Range
     - Experience Required
     - Required Skills (comma separated)
   - Job Description & Benefits:
     - Job Description
     - Benefits (comma separated)
   - Additional Options:
     - Mark as Urgent Hiring
     - Featured Job Listing
3. Click **Post Job**.
4. If required fields are missing (title/company/location), the UI shows an alert.

Expected result:
- New job appears at the top of the job list after being added to `jobs`.

---

## 7) AI Career Assistant (Home quick access)
1. On **Home**, click **🤖 AI Assistant**.
2. Type a message in the chat input.
3. Click **Send** or press **Enter**.

What you’ll see:
- A simulated response is appended after a short delay (demo array of suggestions).

Close the assistant with **×**.

---

## 8) Troubleshooting

### Profile not persisting
- This module persists profile and job lists using **localStorage**.
- If you clear site data/browser storage, your profile and saved/applied lists reset.

### Unable to apply or save
- Confirm you’re clicking:
  - Apply button in the modal/job card (changes to “Applied”)
  - Save button (toggles heart state)

### Job not posted
- Ensure the required employer fields are filled:
  - Job Title, Company Name, Location

## 9) UI sections reference (quick)
- Home hero + search + category cards
- Category view:
  - subcategory/country/type buttons
  - jobs list
- Job Details modal
- Profile Builder form + resume score
- Employer Dashboard + Post New Job form
- AI Assistant chat modal
