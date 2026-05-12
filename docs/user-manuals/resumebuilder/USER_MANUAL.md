# Resume Builder User Manual (Front-End)

> Module: `src/modules/resumebuilder/ResumeBuilder.js`

## 1) What this module does
Resume Builder helps users create, edit, and manage resumes using guided steps or templates. Depending on features enabled, it may support:
- choosing resume templates
- filling profile/experience sections
- downloading/saving versions
- updating existing resume content

## 2) Entry point
1. Login.
2. Open **Resume Builder** from navigation.
3. The module typically opens on a resume template selection or editor.

## 3) Step-by-step user flows

### 3.1 Create a new resume
1. Open Resume Builder.
2. Choose a template/theme (if prompted).
3. Start filling in details (name, objective, skills, work history, education).

Expected result:
- A preview updates as you enter content (if preview exists).

### 3.2 Edit resume sections
1. Navigate between sections:
   - Summary/Objective
   - Skills
   - Experience
   - Education
   - Projects/Certifications (if supported)
2. Update fields with the latest information.
3. Save changes (or autosave).

Expected result:
- Saved updates appear in the resume preview.

### 3.3 Download or export
1. Find **Download**, **Export**, or **Print**.
2. Choose format (PDF/Doc/other if supported).
3. Confirm download/export.

Expected result:
- Resume file is generated for the selected template.

## 4) Troubleshooting (UI-level)
- Content not saving:
  - Verify connectivity.
  - Check login/session.
  - Retry and ensure required fields aren’t missing.
- Download not working:
  - Try again.
  - Refresh and verify pop-up/download permissions.

## 5) UI sections reference
- Template selector (if enabled)
- Resume editor forms
- Live preview/resume preview panel
- Save/export/download actions
