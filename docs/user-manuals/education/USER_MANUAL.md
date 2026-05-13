# Education User Manual (Front-End)

> Module: `src/modules/education/Education.js`

## 1) What this module does
Education is an end-to-end learning hub for:
- **Overview** of tuition, courses, community, and support
- **Skill Courses** browsing + filtering
- **My Learning** (your enrolled courses)
- **Community** (groups you can join)
- **Career** support (resume/interview/job pathway tiles)
- **Government Support**:
  - scholarships search + apply
  - government scheme cards
- **Study Assistant (AI chat)** for education guidance

> The module saves education progress and preferences to backend **when you are signed in**.

## 2) Entry point in the app
1. Open **Education** from the main navigation/menu.
2. The default screen is the **Overview** / **Home** section.

## 3) Main navigation sections
Use the section navigation buttons:
- Overview
- Courses
- My Learning
- Community
- Career
- Government

## 4) Overview (Home)
From **Overview**, you can jump to:
- Browse Courses
- Request Subject Tuition
- View Government Support
- Explore Career

### 4.1 Request Subject Tuition
1. Select a **subject** from the tuition subject dropdown (Mathematics, Science, English, etc.).
2. Click **Request Tuition**.
Expected result:
- A tuition request is submitted (or saved locally if not authenticated).

## 5) Courses (Skill Courses Hub)
### 5.1 Browse/search courses
1. In **Courses**, use **Search courses** input.
2. Search matches:
   - course name
   - level
   - description

### 5.2 View course details
1. Click **View Details** (for a course card).
2. Review syllabus and outcomes.
3. Use **Back to Courses** to return.

### 5.3 Enroll in a course
1. Click **Enroll Now** on the course card (or **Enroll in Course** in the details view).
2. If enrolled already, the button switches to **Enrolled**.
3. Enrollment triggers payment flow when backend returns payment details:
   - Razorpay checkout (UPI / card / etc. depending on gateway config)
   - Payment is verified before enrollment is confirmed.

Expected result:
- On success: course appears in **My Learning**
- If you’re not signed in: enrollment is saved locally and synced later

## 6) My Learning
1. Open **My Learning**.
2. If you have no enrolled courses, you’ll see an empty state and a button to browse courses.
3. If you are enrolled, you’ll see course cards with:
   - course title, level, duration, price
4. Actions:
   - **View Course**
   - **Continue Learning** (opens course detail screen)

## 7) Community
1. Open **Community**.
2. Browse predefined community groups (example groups like doubt boards/practice groups).
3. Click:
   - **Join Group** to join, or
   - **Joined** to indicate membership

Expected result:
- Join action is persisted locally or synced to backend when authenticated.

## 8) Career Support
1. Open **Career**.
2. Review the tiles:
   - Resume and Interview Coaching
   - Job Pathways
   - Skill Assessment
3. Click the action button on each tile.
Expected result:
- A status message is shown that the resource is added to your support queue.

## 9) Government Support
### 9.1 Scholarships search + apply
1. Open **Government**.
2. In the search box, search by scholarship name or eligibility.
3. For each scholarship:
   - click **Apply Now** (button changes to **Applied** after apply)

Expected result:
- If signed in: an application draft is created and synced to backend.
- If not signed in: application is saved locally with sync pending.

### 9.2 Government scheme cards
- The UI also shows cards like:
  - Scholarship Eligibility Checker
  - Education Loan Assistance
  - Skill Development Grants
Click **Learn More** for assisted mode messages.

## 10) Study Assistant (AI)
1. Scroll to **Study Assistant**.
2. Enter a question in the input.
3. Click **Ask Assistant**.
4. Read the response text.

Validation:
- If the question is empty, the UI asks you to enter a question first.

## 11) Troubleshooting
- Education progress not syncing:
  - ensure you are signed in (module syncs only when authenticated and `apiCall` is available)
- Enrollment doesn’t complete:
  - check payment gateway flow and try again if payment verification fails
- “My Learning” is empty:
  - enroll in a course first
- Assistant gives generic guidance:
  - include details like “exam revision”, “study plan”, “speaking practice”, or “coding growth”

## 12) UI sections reference (quick)
- Overview:
  - tuition booking request
- Courses:
  - search, view details, enroll
- My Learning:
  - enrolled courses list + continue
- Community:
  - join groups
- Career:
  - resume/interview/job pathways
- Government:
  - scholarships search + apply + schemes
- Study Assistant:
  - education Q&A
