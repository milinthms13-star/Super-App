const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const authenticate = require('../middleware/auth');
const ResumeDocument = require('../models/ResumeDocument');

const router = express.Router();

const MAX_KEYWORDS = 24;

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'to',
  'was',
  'were',
  'with',
  'you',
  'your',
  'our',
  'their',
  'this',
  'those',
  'these',
  'will',
  'have',
  'has',
  'had',
]);

const toList = (value = '') => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  return String(value || '')
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const cleanText = (value = '') =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const extractKeywords = (value = '') => {
  const words = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(
      (word) =>
        word.length > 2 &&
        !STOP_WORDS.has(word) &&
        !/^\d+$/.test(word)
    );

  const frequencies = new Map();
  words.forEach((word) => {
    frequencies.set(word, (frequencies.get(word) || 0) + 1);
  });

  return [...frequencies.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, MAX_KEYWORDS)
    .map(([keyword]) => keyword);
};

const parseEducation = (value = '') =>
  toList(value).map((line) => {
    const [degree = '', institution = '', year = ''] = line
      .split('|')
      .map((part) => part.trim());
    return {
      degree: degree || line,
      institution: institution || '',
      year: year || '',
    };
  });

const parseExperience = (value = '') =>
  toList(value).map((line) => {
    const [role = '', company = '', duration = '', achievements = ''] = line
      .split('|')
      .map((part) => part.trim());

    const bullets = toList(achievements);
    return {
      role: role || line,
      company: company || '',
      duration: duration || '',
      bullets:
        bullets.length > 0
          ? bullets
          : ['Collaborated with cross-functional teams to deliver outcomes.'],
    };
  });

const parseProjects = (value = '') =>
  toList(value).map((line) => {
    const [name = '', tech = '', summary = ''] = line
      .split('|')
      .map((part) => part.trim());
    return {
      name: name || line,
      tech: tech || '',
      summary: summary || '',
    };
  });

const detectMeasuredAchievements = (experience = []) => {
  const joined = experience
    .flatMap((item) => item.bullets || [])
    .join(' ')
    .toLowerCase();
  return /(\d+%|\d+\+|increased|reduced|saved|improved|grew|achieved)/.test(
    joined
  );
};

const computeSectionCompleteness = (resume = {}) => {
  const checks = {
    profile: Boolean(cleanText(resume.profile).length >= 60),
    skills: Array.isArray(resume.skills) && resume.skills.length > 0,
    education: Array.isArray(resume.education) && resume.education.length > 0,
    experience: Array.isArray(resume.experience) && resume.experience.length > 0,
    projects: Array.isArray(resume.projects) && resume.projects.length > 0,
    certifications:
      Array.isArray(resume.certifications) && resume.certifications.length > 0,
  };

  const completed = Object.values(checks).filter(Boolean).length;
  return {
    checks,
    completed,
    total: Object.keys(checks).length,
    percent: Math.round((completed / Object.keys(checks).length) * 100),
  };
};

const normalizeResumeFromForm = (formData = {}, options = {}) => {
  const skills = toList(formData.skills);
  const certifications = toList(formData.certifications);
  const languages = toList(formData.languages);
  const education = parseEducation(formData.education);
  const experience = parseExperience(formData.experience);
  const projects = parseProjects(formData.projects);

  const profile =
    cleanText(formData.summary) ||
    `Results-focused ${cleanText(formData.targetJob) || 'professional'} with expertise in ${skills
      .slice(0, 6)
      .join(', ')} and a track record of delivering measurable outcomes.`;

  return {
    header: {
      fullName: cleanText(formData.name),
      targetJob: cleanText(formData.targetJob),
      location: cleanText(formData.location),
      preferredCountry: cleanText(formData.preferredCountry || 'India'),
      email: cleanText(formData.email),
      phone: cleanText(formData.phone),
      linkedin: cleanText(formData.linkedin),
    },
    profile,
    skills,
    education,
    experience,
    projects,
    certifications,
    languages,
    gulfProfile: {
      passportStatus: cleanText(formData.passportStatus),
      visaStatus: cleanText(formData.visaStatus),
      gccExperience: cleanText(formData.gccExperience),
      drivingLicense: cleanText(formData.drivingLicense),
      expectedSalary: cleanText(formData.expectedSalary),
      noticePeriod: cleanText(formData.noticePeriod),
    },
    template: cleanText(options.template || 'simple-ats'),
    resumeType: cleanText(options.resumeType || 'professional'),
    language: cleanText(options.language || 'en'),
    lastGeneratedAt: new Date().toISOString(),
  };
};

const buildResumePlainText = (resume = {}) => {
  const lines = [];
  lines.push(cleanText(resume?.header?.fullName));
  lines.push(cleanText(resume?.header?.targetJob));
  lines.push(cleanText(resume?.header?.location));
  lines.push(cleanText(resume?.header?.email));
  lines.push(cleanText(resume?.header?.phone));
  lines.push(cleanText(resume.profile));

  (resume.skills || []).forEach((skill) => lines.push(cleanText(skill)));
  (resume.education || []).forEach((item) =>
    lines.push(`${cleanText(item.degree)} ${cleanText(item.institution)} ${cleanText(item.year)}`)
  );
  (resume.experience || []).forEach((item) => {
    lines.push(
      `${cleanText(item.role)} ${cleanText(item.company)} ${cleanText(item.duration)}`
    );
    (item.bullets || []).forEach((bullet) => lines.push(cleanText(bullet)));
  });
  (resume.projects || []).forEach((item) =>
    lines.push(`${cleanText(item.name)} ${cleanText(item.tech)} ${cleanText(item.summary)}`)
  );
  (resume.certifications || []).forEach((item) => lines.push(cleanText(item)));
  (resume.languages || []).forEach((item) => lines.push(cleanText(item)));

  return lines.filter(Boolean).join('\n');
};

const computeAtsReport = ({ resume = {}, jobDescription = '' }) => {
  const issues = [];
  const suggestions = [];
  const warnings = [];

  const resumeText = buildResumePlainText(resume);
  const resumeKeywords = extractKeywords(resumeText);
  const jdKeywords = extractKeywords(jobDescription);

  const matchedKeywords = jdKeywords.filter((keyword) =>
    resumeKeywords.includes(keyword)
  );
  const missingKeywords = jdKeywords.filter(
    (keyword) => !resumeKeywords.includes(keyword)
  );

  const keywordMatchPercent =
    jdKeywords.length > 0
      ? Math.round((matchedKeywords.length / jdKeywords.length) * 100)
      : 0;

  const hasContact = Boolean(
    cleanText(resume?.header?.email) || cleanText(resume?.header?.phone)
  );
  if (!hasContact) {
    issues.push('Missing email or phone number in resume header.');
    suggestions.push('Add at least one contact method: email or phone.');
  }

  const summary = cleanText(resume.profile);
  if (summary.length < 60) {
    issues.push('Professional summary is too short.');
    suggestions.push('Write a 3-4 sentence summary focused on outcomes and role fit.');
  }

  const sectionCompleteness = computeSectionCompleteness(resume);
  if (sectionCompleteness.percent < 70) {
    issues.push('Resume sections are incomplete.');
    suggestions.push('Complete profile, skills, education, experience, projects, and certifications sections.');
  }

  if (keywordMatchPercent < 35 && jdKeywords.length > 0) {
    issues.push('Low keyword match with job description.');
    suggestions.push('Mirror important role terms from the job description in summary and experience bullets.');
  }

  const hasMeasuredAchievements = detectMeasuredAchievements(resume.experience || []);
  if (!hasMeasuredAchievements) {
    issues.push('No measurable achievements detected.');
    suggestions.push('Add numbers: percentages, counts, revenue, cost savings, or delivery metrics.');
  }

  const textLines = resumeText.split('\n');
  if (textLines.some((line) => line.length > 180)) {
    warnings.push('Some lines are too long for ATS-friendly parsing.');
    suggestions.push('Break long paragraphs into short bullet points.');
  }
  if (/[\t]{2,}|[|]{2,}/.test(resumeText)) {
    warnings.push('Complex formatting markers detected.');
    suggestions.push('Avoid tables and complex separators in ATS exports.');
  }

  let score = 100;
  score -= hasContact ? 0 : 20;
  score -= summary.length >= 60 ? 0 : 12;
  score -= Math.max(0, 40 - keywordMatchPercent) * 0.6;
  score -= sectionCompleteness.percent >= 70 ? 0 : 16;
  score -= hasMeasuredAchievements ? 0 : 12;
  score -= warnings.length * 4;
  score = Math.max(30, Math.min(100, Math.round(score)));

  return {
    score,
    keywordMatchPercent,
    matchedKeywords,
    missingKeywords,
    issues,
    warnings,
    suggestions,
    sectionCompleteness,
    checkedAt: new Date().toISOString(),
  };
};

const parseJsonResponse = (content = '', fallbackValue = null) => {
  try {
    const fencedMatch = String(content || '').match(/```(?:json)?\s*([\s\S]*?)```/i);
    const text = fencedMatch ? fencedMatch[1] : content;
    return JSON.parse(text);
  } catch (_error) {
    return fallbackValue;
  }
};

const callOpenAiJson = async ({ systemPrompt, userPrompt, fallback }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallback();
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: process.env.OPENAI_RESUME_MODEL || 'gpt-4o-mini',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      },
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 45000,
      }
    );

    const content = response?.data?.choices?.[0]?.message?.content || '';
    const parsed = parseJsonResponse(content);
    if (!parsed || typeof parsed !== 'object') {
      return fallback();
    }

    return parsed;
  } catch (_error) {
    return fallback();
  }
};

router.post('/generate', authenticate, async (req, res) => {
  try {
    const { formData = {}, template = 'simple-ats', resumeType = 'professional', language = 'en' } =
      req.body || {};

    const fallbackResume = normalizeResumeFromForm(formData, {
      template,
      resumeType,
      language,
    });

    const aiResult = await callOpenAiJson({
      systemPrompt:
        'You are a senior resume writer. Return strictly valid JSON with fields: profile, skills, education, experience, projects, certifications, languages. Keep concise and ATS-friendly.',
      userPrompt: `Create an ATS-friendly resume body for this candidate profile.\n\n${JSON.stringify(
        {
          formData,
          template,
          resumeType,
          language,
        }
      )}`,
      fallback: () => fallbackResume,
    });

    const generatedResume = {
      ...fallbackResume,
      ...aiResult,
      template,
      resumeType,
      language,
      lastGeneratedAt: new Date().toISOString(),
    };

    return res.json({ success: true, resume: generatedResume });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate resume.',
      error: error.message,
    });
  }
});

router.post('/ats-check', authenticate, async (req, res) => {
  try {
    const { resume = {}, jobDescription = '' } = req.body || {};
    const report = computeAtsReport({ resume, jobDescription });
    return res.json({ success: true, report });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to check ATS score.',
      error: error.message,
    });
  }
});

router.post('/optimize', authenticate, async (req, res) => {
  try {
    const { resume = {}, jobDescription = '' } = req.body || {};
    const baseResume = resume && typeof resume === 'object' ? resume : {};
    const jdKeywords = extractKeywords(jobDescription);
    const report = computeAtsReport({ resume: baseResume, jobDescription });

    const fallbackResume = {
      ...baseResume,
      profile: cleanText(baseResume.profile)
        ? `${cleanText(baseResume.profile)} ${jdKeywords.slice(0, 5).join(', ')}`
        : `Outcome-focused professional aligned with ${jdKeywords
            .slice(0, 5)
            .join(', ')}`,
      experience: (baseResume.experience || []).map((item) => ({
        ...item,
        bullets: [...(item.bullets || [])].slice(0, 4).map((bullet, index) =>
          /(\d+%|\d+\+)/.test(bullet)
            ? bullet
            : `${bullet}${index === 0 ? ' Increased efficiency by 20%.' : ''}`
        ),
      })),
      optimization: {
        appliedKeywords: report.missingKeywords.slice(0, 8),
      },
    };

    const aiResult = await callOpenAiJson({
      systemPrompt:
        'You optimize resumes against job descriptions. Return strict JSON with fields: profile, skills, experience, optimization.',
      userPrompt: `Optimize this resume:\n${JSON.stringify({
        resume: baseResume,
        jobDescription,
      })}`,
      fallback: () => fallbackResume,
    });

    const optimizedResume = {
      ...fallbackResume,
      ...aiResult,
      optimization: {
        appliedKeywords:
          aiResult?.optimization?.appliedKeywords || fallbackResume.optimization.appliedKeywords,
      },
      optimizedAt: new Date().toISOString(),
    };

    return res.json({
      success: true,
      resume: optimizedResume,
      report: computeAtsReport({ resume: optimizedResume, jobDescription }),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to optimize resume.',
      error: error.message,
    });
  }
});

router.post('/cover-letter', authenticate, async (req, res) => {
  try {
    const { formData = {}, resume = {}, type = 'company', jobDescription = '' } = req.body || {};
    const targetJob = cleanText(formData.targetJob || resume?.header?.targetJob || 'the role');
    const name = cleanText(formData.name || resume?.header?.fullName || 'Candidate');
    const skills = toList(formData.skills || resume?.skills).slice(0, 6);

    const fallback = () => ({
      type,
      content: `Dear Hiring Manager,\n\nI am applying for the ${targetJob} position. I bring practical experience in ${skills.join(
        ', '
      )}, with a focus on measurable delivery and team collaboration.\n\nI am excited about this opportunity and would value a conversation to discuss how I can contribute from day one.\n\nSincerely,\n${name}`,
      highlights: skills.slice(0, 4),
    });

    const aiResult = await callOpenAiJson({
      systemPrompt:
        'You write concise professional cover letters. Return strict JSON with fields: content and highlights (array).',
      userPrompt: `Write a ${type} cover letter for this candidate:\n${JSON.stringify({
        formData,
        resume,
        jobDescription,
      })}`,
      fallback,
    });

    return res.json({
      success: true,
      letter: {
        type,
        content: cleanText(aiResult?.content || fallback().content).replace(/\. /g, '.\n'),
        highlights: Array.isArray(aiResult?.highlights)
          ? aiResult.highlights.slice(0, 6)
          : fallback().highlights,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate cover letter.',
      error: error.message,
    });
  }
});

router.post('/interview-prep', authenticate, async (req, res) => {
  try {
    const { targetJob = '', jobDescription = '', experience = '', skills = '' } = req.body || {};
    const role = cleanText(targetJob || 'the target role');
    const topSkills = toList(skills).slice(0, 5);

    const fallback = () => ({
      questions: [
        `Tell me about your experience related to ${role}.`,
        `Describe a project where you used ${topSkills[0] || 'your core skills'}.`,
        'How do you prioritize under tight deadlines?',
        'What measurable achievement are you most proud of?',
      ],
      tips: [
        'Use STAR structure in every answer.',
        'Quantify impact with numbers wherever possible.',
        'Prepare a 60-second pitch aligned to the job description.',
      ],
      skillCourses: topSkills.map((skill) => `${skill} interview prep`).slice(0, 4),
    });

    const aiResult = await callOpenAiJson({
      systemPrompt:
        'You are an interview coach. Return strict JSON with questions, tips, and skillCourses arrays.',
      userPrompt: `Prepare interview coaching for:\n${JSON.stringify({
        targetJob: role,
        jobDescription,
        experience,
        skills: topSkills,
      })}`,
      fallback,
    });

    return res.json({
      success: true,
      prep: {
        questions: Array.isArray(aiResult?.questions)
          ? aiResult.questions.slice(0, 8)
          : fallback().questions,
        tips: Array.isArray(aiResult?.tips) ? aiResult.tips.slice(0, 8) : fallback().tips,
        skillCourses: Array.isArray(aiResult?.skillCourses)
          ? aiResult.skillCourses.slice(0, 8)
          : fallback().skillCourses,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate interview prep.',
      error: error.message,
    });
  }
});

router.get('/my-resumes', authenticate, async (req, res) => {
  try {
    const resumes = await ResumeDocument.find({
      userId: req.user._id,
      isArchived: false,
    })
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({ success: true, resumes });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load resumes.',
      error: error.message,
    });
  }
});

router.post('/my-resumes', authenticate, async (req, res) => {
  try {
    const {
      name = 'Untitled Resume',
      resumeType = 'professional',
      template = 'simple-ats',
      language = 'en',
      formData = {},
      resumeData = {},
      atsScore,
    } = req.body || {};

    const doc = await ResumeDocument.create({
      userId: req.user._id,
      name: cleanText(name) || 'Untitled Resume',
      resumeType,
      template,
      language,
      formData,
      resumeData,
      atsHistory:
        typeof atsScore === 'number'
          ? [{ score: atsScore, checkedAt: new Date() }]
          : [],
      lastOpenedAt: new Date(),
    });

    return res.status(201).json({ success: true, resume: doc });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to save resume.',
      error: error.message,
    });
  }
});

router.put('/my-resumes/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid resume id.' });
    }

    const {
      name,
      resumeType,
      template,
      language,
      formData,
      resumeData,
      atsScore,
    } = req.body || {};

    const update = {
      lastOpenedAt: new Date(),
      updatedAt: new Date(),
    };

    if (name !== undefined) update.name = cleanText(name) || 'Untitled Resume';
    if (resumeType !== undefined) update.resumeType = resumeType;
    if (template !== undefined) update.template = template;
    if (language !== undefined) update.language = language;
    if (formData !== undefined) update.formData = formData;
    if (resumeData !== undefined) update.resumeData = resumeData;
    if (typeof atsScore === 'number') {
      update.$push = {
        atsHistory: {
          score: atsScore,
          checkedAt: new Date(),
        },
      };
    }

    const updated = await ResumeDocument.findOneAndUpdate(
      { _id: id, userId: req.user._id, isArchived: false },
      update,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Resume not found.' });
    }

    return res.json({ success: true, resume: updated });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update resume.',
      error: error.message,
    });
  }
});

router.delete('/my-resumes/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid resume id.' });
    }

    const deleted = await ResumeDocument.findOneAndUpdate(
      { _id: id, userId: req.user._id, isArchived: false },
      { isArchived: true, updatedAt: new Date() },
      { new: true }
    );

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Resume not found.' });
    }

    return res.json({ success: true, message: 'Resume deleted.' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete resume.',
      error: error.message,
    });
  }
});

router.post('/my-resumes/:id/duplicate', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid resume id.' });
    }

    const source = await ResumeDocument.findOne({
      _id: id,
      userId: req.user._id,
      isArchived: false,
    }).lean();

    if (!source) {
      return res.status(404).json({ success: false, message: 'Resume not found.' });
    }

    const duplicated = await ResumeDocument.create({
      userId: req.user._id,
      name: `${source.name} (Copy)`,
      resumeType: source.resumeType,
      template: source.template,
      language: source.language,
      formData: source.formData,
      resumeData: source.resumeData,
      atsHistory: source.atsHistory || [],
      lastOpenedAt: new Date(),
    });

    return res.status(201).json({ success: true, resume: duplicated });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to duplicate resume.',
      error: error.message,
    });
  }
});

module.exports = router;

