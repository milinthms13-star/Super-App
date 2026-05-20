# Resume Builder Upgrade Patch

## Main gaps found

1. First screen has too many tools. Users need quick actions first.
2. Upload parser uses `readAsText`, so PDF/DOCX parsing will fail or produce junk.
3. ATS score is useful, but user does not see a clear health checklist.
4. Role-wise resume generation exists but is hidden; make it visible with presets.
5. Gulf resume fields are good, but user needs one-click Gulf flow.
6. Recruiter email exists, but WhatsApp recruiter message is missing.
7. Backend validation is basic; add payload validation before generate/save.

## Files included

- `ResumeQuickStart.js`
- `ResumeRolePresetPanel.js`
- `resumeBuilderUpgradeUtils.js`
- `resumeBuilderBackendUpgrade.js`
- `RESUME_BUILDER_UPGRADE_CSS.css`

## Frontend integration

In `src/modules/resumebuilder/ResumeBuilder.js`, add imports:

```js
import ResumeQuickStart from './ResumeQuickStart';
import ResumeRolePresetPanel from './ResumeRolePresetPanel';
import { ROLE_PRESETS, getResumeHealth, buildWhatsappRecruiterMessage } from './resumeBuilderUpgradeUtils';
```

Add this function inside the component:

```js
const handleQuickResumeAction = useCallback((actionId) => {
  if (actionId === 'gulf') {
    setResumeType('gulf');
    setTemplate(hasPremiumAccess ? 'gulf-blue-professional' : 'simple-ats');
    setFormData((current) => ({
      ...current,
      preferredCountry: current.preferredCountry || 'UAE',
      preferredGulfCountry: current.preferredGulfCountry || 'UAE',
      availableToRelocate: 'Yes',
    }));
    setActiveSection('ai-builder');
    setWizardStep(5);
    return;
  }

  if (actionId === 'ats') {
    setTemplate('simple-ats');
    setActiveSection('ats-score');
    return;
  }

  if (actionId === 'fresher') {
    setResumeType('fresher');
    setTemplate(hasPremiumAccess ? 'fresher-student' : 'simple-ats');
    setActiveSection('ai-builder');
    setWizardStep(3);
    return;
  }

  if (actionId === 'upload') {
    setActiveSection('upload');
  }
}, [hasPremiumAccess]);
```

Add this function inside the component:

```js
const applyRolePreset = useCallback((presetKey) => {
  const preset = ROLE_PRESETS[presetKey];
  if (!preset) return;
  setFormData((current) => {
    const skills = [...new Set([...toList(current.skills), ...preset.skills])];
    const experienceLine = `${current.targetJob || preset.label} | Company Name | Duration | ${preset.bullets.join('; ')}`;
    return {
      ...current,
      targetJob: current.targetJob || preset.label,
      skills: skills.join(', '),
      experience: current.experience ? `${current.experience}\n${experienceLine}` : experienceLine,
      summary: current.summary || rewriteSummaryLocal({ ...current, targetJob: current.targetJob || preset.label, skills: skills.join(', ') }, jobDescription),
    };
  });
  pushStatus('success', `${preset.label} preset applied.`);
}, [jobDescription, pushStatus]);
```

After the hero section, render quick actions:

```jsx
<ResumeQuickStart onAction={handleQuickResumeAction} />
```

Inside the AI Builder/wizard career or skills area, render:

```jsx
<ResumeRolePresetPanel onApply={applyRolePreset} />
```

Add resume health card near the live preview:

```jsx
{(() => {
  const health = getResumeHealth(previewResume, jobDescription);
  return (
    <div className="resume-health-card">
      <strong>Resume Health: {health.score}%</strong>
      <ul>{health.issues.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
})()}
```

In recruiter email section, add WhatsApp copy:

```jsx
<button
  type="button"
  className="secondary-button"
  onClick={() => copyText(buildWhatsappRecruiterMessage(previewResume))}
>
  Copy WhatsApp Recruiter Message
</button>
```

## CSS

Paste `RESUME_BUILDER_UPGRADE_CSS.css` at the bottom of `ResumeBuilder.css`.

## Backend integration

Copy `resumeBuilderBackendUpgrade.js` to:

```txt
backend/services/resumeBuilderUpgradeService.js
```

In `backend/routes/resumebuilder.js`, import:

```js
const { validateResumePayload, sanitizeResumeForStorage } = require('../services/resumeBuilderUpgradeService');
```

At the start of `/generate` route, after reading `formData`, add:

```js
const validation = validateResumePayload({ formData });
if (!validation.valid) {
  return res.status(400).json({ success: false, message: validation.errors.join(' ') });
}
```

Before saving resume payloads in `/my-resumes`, wrap payload:

```js
const safePayload = sanitizeResumeForStorage(payload);
```

## Recommended later upgrade

For real PDF/DOCX upload parsing, add backend upload parsing using `multer`, `pdf-parse`, and `mammoth`. The current frontend `readAsText` is okay only for `.txt` style files.
