# Resume Builder User Manual (Front-End)

> Module: `src/modules/resumebuilder/ResumeBuilder.js`

## 1) What this module does
**Resume Builder** helps users create, edit, and manage resumes using guided steps and/or templates.

Depending on your MVP scope, it may support:
- Selecting a resume template/theme
- Creating a new resume from scratch
- Editing resume sections (profile, experience, skills, education, etc.)
- Live preview of the resume
- Saving updates (manual save or autosave)
- Downloading/exporting resumes (PDF/Doc/print if supported)
- Updating existing resume content

## 2) Entry point
1. Login.
2. Open **Resume Builder** from navigation.
3. The module opens on:
   - template/theme selection (if enabled), or
   - the resume editor for the selected template.

## 3) Main screen layout (what you see)

### 3.1 Template/theme selector (if enabled)
- Options to choose a template/style
- Confirm/select to start editing

### 3.2 Resume editor
- Section forms/fields to enter or update content (examples):
  - Summary / Objective
  - Skills
  - Experience
  - Education
  - Projects / Certifications (if supported)

### 3.3 Live preview / resume preview panel
- A preview that updates as you type (if your UI provides it)

### 3.4 Save / download actions
- Buttons for:
  - Save (or Update)
  - Download / Export
  - Print (if supported)

## 4) Step-by-step user flows

### 4.1 Create a new resume
1. Open **Resume Builder**.
2. Choose a template/theme (if prompted).
3. Start filling details:
   - Name and contact (if available in your editor)
   - Objective / Summary
   - Skills
   - Work Experience
   - Education
   - Projects/Certifications (if supported)
4. Review the live preview (if available).
5. Click **Save**.

Expected result:
- Your resume content is stored.
- The preview reflects your latest updates.

### 4.2 Edit resume sections
1. In the editor, open the section you want to change:
   - Summary/Objective, Skills, Experience, Education, etc.
2. Update your content fields.
3. Save changes:
   - Click **Save/Update**, or
   - rely on autosave (if supported)

Expected result:
- Saved updates appear in the preview and/or persist after refresh.

### 4.3 Download / export the resume
1. Locate **Download / Export / Print**.
2. Select the output option (format depends on your UI):
   - PDF / Doc / other formats (if provided)
3. Confirm.

Expected result:
- A resume file is generated and downloaded (or a print view opens).

## 5) Troubleshooting (UI-level)

- Content not saving:
  - Verify you’re logged in.
  - Check internet connectivity.
  - Ensure required fields aren’t empty (if validation exists).
  - Retry and refresh once.

- Preview not updating:
  - Wait for the preview to re-render (some UIs update after a short delay).
  - Check if the preview depends on saved content vs. live typing.

- Download/export not working:
  - Retry export once content is saved.
  - Check browser pop-up/download permissions.
  - If format selection exists, try a different format (e.g., PDF first).

## 6) UI sections reference
- Template selector (if enabled)
- Resume editor forms (per section)
- Live preview / resume preview panel
- Save / download/export actions
