// Resume Enhancement Utilities - Zero-cost AI-powered features

// Common stop words to filter out
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will',
  'with', 'have', 'had', 'been', 'being', 'do', 'does', 'did', 'doing'
]);

// Extract keywords from text
export const extractKeywords = (text = '', maxCount = 20) => {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && 
      !STOP_WORDS.has(word) && 
      !/^\d+$/.test(word)
    );

  const frequency = new Map();
  words.forEach(word => {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  });

  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCount)
    .map(([word]) => word);
};

// Calculate ATS score
export const calculateATSScore = (resume, jobDescription = '') => {
  let score = 0;
  const issues = [];
  const suggestions = [];

  // Check personal info completeness (20 points)
  const personalInfo = resume.personalInfo || {};
  if (personalInfo.fullName && personalInfo.fullName.length > 2) score += 5;
  else issues.push('Add your full name');
  
  if (personalInfo.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalInfo.email)) score += 5;
  else issues.push('Add a valid email address');
  
  if (personalInfo.phone && personalInfo.phone.length >= 10) score += 5;
  else issues.push('Add your phone number');
  
  if (personalInfo.location) score += 5;
  else suggestions.push('Add your location for better local job matches');

  // Check summary (15 points)
  if (resume.summary) {
    const summaryLength = resume.summary.length;
    if (summaryLength >= 100 && summaryLength <= 400) {
      score += 15;
    } else if (summaryLength > 0) {
      score += 8;
      suggestions.push('Professional summary should be 100-400 characters (2-4 sentences)');
    } else {
      issues.push('Add a professional summary');
    }
  } else {
    issues.push('Add a professional summary highlighting your key strengths');
  }

  // Check experience (25 points)
  const experience = resume.experience || [];
  if (experience.length === 0) {
    issues.push('Add at least one work experience entry');
  } else {
    score += 10;
    const hasDescriptions = experience.every(exp => exp.description && exp.description.length > 50);
    if (hasDescriptions) {
      score += 15;
    } else {
      score += 8;
      suggestions.push('Add detailed descriptions (50+ characters) for all experiences');
    }
  }

  // Check education (15 points)
  const education = resume.education || [];
  if (education.length === 0) {
    issues.push('Add at least one education entry');
  } else {
    score += 15;
  }

  // Check skills (15 points)
  const skills = resume.skills || [];
  if (skills.length === 0) {
    issues.push('Add relevant skills');
  } else if (skills.length < 5) {
    score += 8;
    suggestions.push('Add at least 5-10 relevant skills');
  } else {
    score += 15;
  }

  // Check keyword match with job description (10 points)
  if (jobDescription) {
    const jdKeywords = extractKeywords(jobDescription, 15);
    const resumeText = [
      resume.summary,
      ...skills,
      ...experience.map(e => `${e.position} ${e.description}`)
    ].join(' ');
    const resumeKeywords = extractKeywords(resumeText, 30);
    
    const matchedKeywords = jdKeywords.filter(kw => resumeKeywords.includes(kw));
    const matchPercent = jdKeywords.length > 0 
      ? (matchedKeywords.length / jdKeywords.length) * 100 
      : 0;

    if (matchPercent >= 70) score += 10;
    else if (matchPercent >= 40) score += 5;
    else if (matchPercent > 0) score += 2;

    if (matchPercent < 50) {
      suggestions.push(`Keyword match: ${Math.round(matchPercent)}%. Add relevant keywords from job description`);
    }
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    issues,
    suggestions,
    level: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'needs improvement'
  };
};

// Keyword optimization - find missing keywords
export const analyzeKeywordMatch = (resume, jobDescription) => {
  if (!jobDescription || jobDescription.trim().length < 20) {
    return {
      matchedKeywords: [],
      missingKeywords: [],
      matchPercent: 0,
      suggestions: []
    };
  }

  const jdKeywords = extractKeywords(jobDescription, 20);
  const resumeText = [
    resume.summary || '',
    ...(resume.skills || []),
    ...(resume.experience || []).map(e => `${e.position} ${e.company} ${e.description}`)
  ].join(' ');
  const resumeKeywords = extractKeywords(resumeText, 50);

  const matchedKeywords = jdKeywords.filter(kw => resumeKeywords.includes(kw));
  const missingKeywords = jdKeywords.filter(kw => !resumeKeywords.includes(kw));
  const matchPercent = jdKeywords.length > 0 
    ? Math.round((matchedKeywords.length / jdKeywords.length) * 100)
    : 0;

  const suggestions = [];
  if (missingKeywords.length > 0) {
    suggestions.push(`Add these keywords: ${missingKeywords.slice(0, 5).join(', ')}`);
  }
  if (matchPercent < 50) {
    suggestions.push('Include job-specific terms from the job description in your summary and experience');
  }
  if (matchPercent >= 70) {
    suggestions.push('Great keyword match! Your resume aligns well with the job description');
  }

  return {
    matchedKeywords: matchedKeywords.slice(0, 10),
    missingKeywords: missingKeywords.slice(0, 10),
    matchPercent,
    suggestions
  };
};

// AI-powered content suggestions
export const ROLE_TEMPLATES = {
  'software': {
    skills: ['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'Git', 'API Development', 'Agile', 'Problem Solving', 'Code Review'],
    summaryTemplate: 'Results-driven Software Developer with expertise in [SKILLS]. Proven track record of building scalable applications and delivering high-quality code. Passionate about solving complex problems and staying current with emerging technologies.',
    bulletTemplates: [
      'Developed and maintained [X] applications using [TECHNOLOGY], improving performance by [Y]%',
      'Collaborated with cross-functional teams to deliver [PROJECT] on time and within budget',
      'Implemented [FEATURE] that increased user engagement by [Y]%',
      'Optimized database queries reducing load time by [Y]%'
    ]
  },
  'marketing': {
    skills: ['Digital Marketing', 'SEO', 'Content Strategy', 'Social Media', 'Google Analytics', 'Email Marketing', 'Campaign Management', 'A/B Testing', 'Market Research'],
    summaryTemplate: 'Creative Marketing Professional with [X] years driving brand growth and customer engagement. Expertise in [SKILLS] with proven success in increasing ROI and market presence.',
    bulletTemplates: [
      'Developed and executed marketing campaigns that increased brand awareness by [Y]%',
      'Managed social media presence across [X] platforms, growing followers by [Y]%',
      'Analyzed market trends and customer data to optimize campaign performance',
      'Collaborated with sales team to generate [X] qualified leads per month'
    ]
  },
  'manager': {
    skills: ['Team Leadership', 'Project Management', 'Strategic Planning', 'Budget Management', 'Performance Management', 'Cross-functional Collaboration', 'Process Improvement', 'Stakeholder Management'],
    summaryTemplate: 'Experienced Manager with [X] years leading high-performing teams and driving business results. Skilled in [SKILLS] with a track record of exceeding organizational goals.',
    bulletTemplates: [
      'Led team of [X] professionals, achieving [Y]% improvement in productivity',
      'Managed $[X] budget while delivering projects [Y]% under cost',
      'Implemented process improvements that reduced operational costs by [Y]%',
      'Mentored and developed team members, resulting in [X] promotions'
    ]
  },
  'designer': {
    skills: ['UI/UX Design', 'Figma', 'Adobe Creative Suite', 'Wireframing', 'Prototyping', 'User Research', 'Visual Design', 'Responsive Design', 'Design Systems'],
    summaryTemplate: 'Creative Designer with expertise in [SKILLS]. Passionate about creating user-centered designs that balance aesthetics with functionality. Proven ability to translate business requirements into compelling visual solutions.',
    bulletTemplates: [
      'Designed [X] user interfaces that improved user satisfaction by [Y]%',
      'Created design systems used across [X] products, improving consistency',
      'Conducted user research with [X] participants to inform design decisions',
      'Collaborated with developers to implement responsive designs across devices'
    ]
  },
  'sales': {
    skills: ['Sales Strategy', 'Client Relationship Management', 'Negotiation', 'CRM Software', 'Lead Generation', 'Pipeline Management', 'Presentation Skills', 'B2B Sales', 'Account Management'],
    summaryTemplate: 'Dynamic Sales Professional with proven success in [SKILLS]. Consistently exceeds quotas and builds lasting client relationships. Expertise in identifying opportunities and closing high-value deals.',
    bulletTemplates: [
      'Exceeded sales quota by [Y]% for [X] consecutive quarters',
      'Built and maintained relationships with [X] key accounts, generating $[Y] in revenue',
      'Developed sales strategies that increased market penetration by [Y]%',
      'Negotiated contracts worth $[X], resulting in [Y]% profit margin'
    ]
  },
  'analyst': {
    skills: ['Data Analysis', 'Excel', 'SQL', 'Python', 'Tableau', 'Statistical Analysis', 'Data Visualization', 'Business Intelligence', 'Reporting', 'Problem Solving'],
    summaryTemplate: 'Detail-oriented Analyst with expertise in [SKILLS]. Skilled at transforming complex data into actionable insights that drive business decisions. Strong background in statistical analysis and data visualization.',
    bulletTemplates: [
      'Analyzed [X] datasets to identify trends and patterns, driving [Y]% improvement',
      'Created dashboards and reports that improved decision-making for [X] stakeholders',
      'Conducted statistical analysis to optimize [PROCESS], saving $[Y] annually',
      'Collaborated with teams to define KPIs and track performance metrics'
    ]
  }
};

// Detect role type from job title
export const detectRoleType = (jobTitle = '') => {
  const title = jobTitle.toLowerCase();
  if (/developer|engineer|programmer|coder/i.test(title)) return 'software';
  if (/marketing|brand|campaign|seo|content/i.test(title)) return 'marketing';
  if (/manager|director|lead|head|supervisor/i.test(title)) return 'manager';
  if (/designer|ux|ui|visual|graphic/i.test(title)) return 'designer';
  if (/sales|account executive|business development/i.test(title)) return 'sales';
  if (/analyst|data|research|business intelligence/i.test(title)) return 'analyst';
  return null;
};

// Generate AI-powered suggestions
export const generateContentSuggestions = (resume, jobDescription = '') => {
  const suggestions = [];
  const roleType = detectRoleType(resume.personalInfo?.fullName || jobDescription);
  const template = roleType ? ROLE_TEMPLATES[roleType] : null;

  // Summary suggestions
  if (!resume.summary || resume.summary.length < 50) {
    if (template) {
      const skillsList = (resume.skills || []).slice(0, 4).join(', ') || template.skills.slice(0, 3).join(', ');
      const suggestedSummary = template.summaryTemplate.replace('[SKILLS]', skillsList);
      suggestions.push({
        type: 'summary',
        title: 'Professional Summary Suggestion',
        content: suggestedSummary,
        action: 'Use this template and customize with your details'
      });
    } else {
      suggestions.push({
        type: 'summary',
        title: 'Add Professional Summary',
        content: 'Write 2-4 sentences highlighting your experience, key skills, and career goals.',
        action: 'Focus on results and impact'
      });
    }
  }

  // Skills suggestions
  if (resume.skills && resume.skills.length < 5) {
    if (template) {
      const missingSkills = template.skills.filter(s => 
        !resume.skills.some(rs => rs.toLowerCase().includes(s.toLowerCase()))
      );
      if (missingSkills.length > 0) {
        suggestions.push({
          type: 'skills',
          title: 'Recommended Skills to Add',
          content: missingSkills.slice(0, 5).join(', '),
          action: 'Add relevant skills that match your experience'
        });
      }
    }
  }

  // Experience bullet suggestions
  if (resume.experience && resume.experience.length > 0) {
    const weakExperience = resume.experience.filter(exp => 
      !exp.description || exp.description.length < 100
    );
    if (weakExperience.length > 0 && template) {
      suggestions.push({
        type: 'experience',
        title: 'Strengthen Experience Descriptions',
        content: template.bulletTemplates.slice(0, 3).join('\n• '),
        action: 'Use these templates and fill in with your specific achievements'
      });
    }
  }

  // Quantify achievements
  const hasNumbers = resume.experience?.some(exp => 
    /\d+%|\$\d+|\d+ (users|clients|projects)/i.test(exp.description || '')
  );
  if (!hasNumbers && resume.experience && resume.experience.length > 0) {
    suggestions.push({
      type: 'achievement',
      title: 'Add Measurable Achievements',
      content: 'Include numbers, percentages, or metrics to quantify your impact (e.g., "Increased sales by 30%", "Managed team of 5", "Reduced costs by $50K")',
      action: 'Add at least one measurable achievement per role'
    });
  }

  return suggestions;
};

// Generate cover letter
export const generateCoverLetter = (resume, jobDescription = '', companyName = '') => {
  const name = resume.personalInfo?.fullName || 'Your Name';
  const email = resume.personalInfo?.email || 'your.email@example.com';
  const phone = resume.personalInfo?.phone || 'Your Phone';
  const topSkills = (resume.skills || []).slice(0, 5).join(', ');
  const yearsExp = resume.experience?.length || 0;
  const roleType = detectRoleType(jobDescription);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Extract key responsibilities from job description
  const jdKeywords = extractKeywords(jobDescription, 8);
  const relevantKeywords = jdKeywords.slice(0, 4).join(', ');

  const intro = companyName 
    ? `I am writing to express my strong interest in the position at ${companyName}.`
    : 'I am writing to express my strong interest in this opportunity.';

  const body = yearsExp > 0
    ? `With ${yearsExp}+ years of professional experience and expertise in ${topSkills}, I am confident in my ability to contribute meaningfully to your team.`
    : `With strong expertise in ${topSkills}, I am eager to bring my skills and enthusiasm to your team.`;

  const relevanceSection = relevantKeywords
    ? `\n\nMy background aligns well with your requirements, particularly in ${relevantKeywords}. ${resume.summary || 'I have a proven track record of delivering results and exceeding expectations.'}`
    : '';

  const closing = companyName
    ? `I am excited about the opportunity to contribute to ${companyName}'s success and would welcome the chance to discuss how my experience and skills align with your needs.`
    : 'I am excited about this opportunity and would welcome the chance to discuss how my experience and skills align with your needs.';

  return `${name}
${email} | ${phone}
${resume.personalInfo?.location || ''}

${date}

${companyName ? `${companyName}\n` : ''}Dear Hiring Manager,

${intro} ${body}${relevanceSection}

Throughout my career, I have consistently demonstrated the ability to:
• Deliver high-quality results while meeting deadlines and budget constraints
• Collaborate effectively with cross-functional teams and stakeholders
• Adapt quickly to new technologies, processes, and business requirements
• Take initiative and drive projects from concept to completion

${closing}

Thank you for considering my application. I look forward to the opportunity to discuss my qualifications in more detail.

Sincerely,
${name}`;
};

// Parse resume text (simple text extraction)
export const parseResumeText = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const parsed = {
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      portfolio: ''
    },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
    languages: []
  };

  // Extract email
  const emailMatch = text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
  if (emailMatch) parsed.personalInfo.email = emailMatch[0];

  // Extract phone
  const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) parsed.personalInfo.phone = phoneMatch[0];

  // Extract LinkedIn
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
  if (linkedinMatch) parsed.personalInfo.linkedin = linkedinMatch[0];

  // First non-email/phone line is likely the name
  const firstLine = lines.find(l => 
    !l.includes('@') && 
    !/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(l) &&
    l.length < 50
  );
  if (firstLine) parsed.personalInfo.fullName = firstLine;

  // Extract skills section
  const skillsIndex = lines.findIndex(l => /^skills?:?$/i.test(l));
  if (skillsIndex !== -1 && lines[skillsIndex + 1]) {
    const skillsText = lines[skillsIndex + 1];
    parsed.skills = skillsText.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
  }

  // Simple summary extraction (look for paragraph after contact info)
  const summaryStart = lines.findIndex((l, i) => 
    i > 3 && l.length > 100 && !l.includes('•') && !l.includes('-')
  );
  if (summaryStart !== -1) {
    parsed.summary = lines[summaryStart];
  }

  return parsed;
};

// Action items based on score
export const getActionItems = (score) => {
  if (score >= 80) {
    return [
      'Your resume is strong! Review for any typos',
      'Ensure all dates and contact info are current',
      'Consider customizing for each job application'
    ];
  } else if (score >= 60) {
    return [
      'Add more quantifiable achievements with numbers',
      'Expand experience descriptions with specific examples',
      'Review and add relevant keywords from job postings'
    ];
  } else if (score >= 40) {
    return [
      'Complete all missing sections (experience, education, skills)',
      'Write a compelling professional summary',
      'Add 8-10 relevant skills for your target role'
    ];
  } else {
    return [
      'Fill in basic contact information',
      'Add at least one work experience or education entry',
      'List your key skills and competencies',
      'Write a brief professional summary'
    ];
  }
};
