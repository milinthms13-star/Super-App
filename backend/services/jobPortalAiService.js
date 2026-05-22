const axios = require('axios');

const DEFAULT_CHAT_MODEL =
  process.env.JOBPORTAL_AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
const DEFAULT_EMBEDDING_MODEL =
  process.env.JOBPORTAL_EMBEDDING_MODEL || process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

const embeddingCache = new Map();

const normalizeSkills = (value = '') => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
  }
  return String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
};

const calculateLexicalSkillScore = (jobSkills = [], applicantSkills = []) => {
  const normalizedJobSkills = normalizeSkills(jobSkills);
  const normalizedApplicantSkills = normalizeSkills(applicantSkills);

  if (!normalizedJobSkills.length && !normalizedApplicantSkills.length) {
    return { score: 50, matchedSkills: [] };
  }

  if (!normalizedApplicantSkills.length) {
    return { score: 45, matchedSkills: [] };
  }

  const matchedSkills = normalizedJobSkills.filter((skill) => normalizedApplicantSkills.includes(skill));
  const uniqueMatchedSkills = Array.from(new Set(matchedSkills));
  const score = Math.min(100, 50 + uniqueMatchedSkills.length * 15);
  return { score, matchedSkills: uniqueMatchedSkills };
};

const cosineSimilarity = (vectorA = [], vectorB = []) => {
  if (!Array.isArray(vectorA) || !Array.isArray(vectorB) || !vectorA.length || !vectorB.length) {
    return 0;
  }
  const length = Math.min(vectorA.length, vectorB.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i += 1) {
    const a = Number(vectorA[i]) || 0;
    const b = Number(vectorB[i]) || 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }
  if (normA <= 0 || normB <= 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const openAiHeaders = (apiKey) => ({
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
});

const getEmbedding = async (text = '') => {
  const apiKey = process.env.OPENAI_API_KEY;
  const normalizedText = String(text || '').trim();
  if (!apiKey || !normalizedText) return null;

  const key = `${DEFAULT_EMBEDDING_MODEL}:${normalizedText}`;
  if (embeddingCache.has(key)) {
    return embeddingCache.get(key);
  }

  const response = await axios.post(
    'https://api.openai.com/v1/embeddings',
    {
      model: DEFAULT_EMBEDDING_MODEL,
      input: normalizedText,
    },
    {
      headers: openAiHeaders(apiKey),
      timeout: 30000,
    }
  );

  const embedding = response?.data?.data?.[0]?.embedding || null;
  if (Array.isArray(embedding) && embedding.length) {
    embeddingCache.set(key, embedding);
    return embedding;
  }
  return null;
};

const computeSemanticMatchScore = async ({
  jobTitle = '',
  jobDescription = '',
  jobSkills = [],
  applicantSkills = [],
  applicantContext = '',
} = {}) => {
  const lexical = calculateLexicalSkillScore(jobSkills, applicantSkills);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      score: lexical.score,
      lexicalScore: lexical.score,
      semanticScore: lexical.score,
      matchedSkills: lexical.matchedSkills,
      provider: 'fallback',
      model: 'fallback',
    };
  }

  try {
    const jobText = [
      `Title: ${String(jobTitle || '').trim()}`,
      `Description: ${String(jobDescription || '').trim()}`,
      `Skills: ${normalizeSkills(jobSkills).join(', ')}`,
    ]
      .filter(Boolean)
      .join('\n');

    const candidateText = [
      `Skills: ${normalizeSkills(applicantSkills).join(', ')}`,
      `Context: ${String(applicantContext || '').trim()}`,
    ]
      .filter(Boolean)
      .join('\n');

    const [jobEmbedding, candidateEmbedding] = await Promise.all([
      getEmbedding(jobText),
      getEmbedding(candidateText),
    ]);

    if (!jobEmbedding || !candidateEmbedding) {
      return {
        score: lexical.score,
        lexicalScore: lexical.score,
        semanticScore: lexical.score,
        matchedSkills: lexical.matchedSkills,
        provider: 'fallback',
        model: 'fallback',
      };
    }

    const similarity = cosineSimilarity(jobEmbedding, candidateEmbedding);
    const semanticScore = Math.max(0, Math.min(100, Math.round((similarity + 1) * 50)));
    const blendedScore = Math.round(lexical.score * 0.45 + semanticScore * 0.55);

    return {
      score: Math.max(0, Math.min(100, blendedScore)),
      lexicalScore: lexical.score,
      semanticScore,
      matchedSkills: lexical.matchedSkills,
      provider: 'openai',
      model: DEFAULT_EMBEDDING_MODEL,
    };
  } catch (_error) {
    return {
      score: lexical.score,
      lexicalScore: lexical.score,
      semanticScore: lexical.score,
      matchedSkills: lexical.matchedSkills,
      provider: 'fallback',
      model: 'fallback',
    };
  }
};

const parseJsonSafely = (raw = '{}') => {
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return {};
  }
};

const buildAssistantFallback = ({ message = '', context = {} } = {}) => {
  const profileCompleteness = Number(context?.profileCompleteness || 0);
  const applicationsCount = Number(context?.applicationsCount || 0);
  const savedJobsCount = Number(context?.savedJobsCount || 0);

  const answer = [
    `Question received: ${String(message || '').trim() || 'Career guidance request'}.`,
    profileCompleteness < 80
      ? 'Improve your profile completeness above 80% to increase recruiter response chances.'
      : 'Your profile is in good shape; focus on better-fit applications and interview prep.',
    `You currently have ${savedJobsCount} saved jobs and ${applicationsCount} submitted applications.`,
  ].join(' ');

  return {
    answer,
    nextSteps: [
      'Tailor your resume summary to each role and add measurable achievements.',
      'Apply to jobs where your match score is above 65% and close skill gaps quickly.',
      'For Gulf jobs, verify license number and contract terms before any payment.',
    ],
    safetyAlerts: [],
    disclaimer:
      'AI guidance is informational. Verify employer identity, compensation terms, and legal documents independently.',
    provider: 'fallback',
    model: 'fallback',
  };
};

const generateCareerAssistantResponse = async ({ message = '', context = {} } = {}) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return buildAssistantFallback({ message, context });
  }

  const systemPrompt = [
    'You are a job portal career copilot for candidates and employers.',
    'Return strictly valid JSON with keys: answer, nextSteps, safetyAlerts, disclaimer, provider, model.',
    'Keep the answer concise, practical, and culturally relevant for India and Gulf job seekers.',
    'Never provide legal guarantees or fake hiring claims.',
    'When there is fraud risk, include explicit safety alerts.',
  ].join(' ');

  const userPrompt = JSON.stringify({
    message: String(message || '').trim(),
    context,
    requestedOutput: '360 career guidance with actionable next steps and safety checks',
  });

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: DEFAULT_CHAT_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      },
      {
        headers: openAiHeaders(apiKey),
        timeout: 30000,
      }
    );

    const raw = response?.data?.choices?.[0]?.message?.content || '{}';
    const parsed = parseJsonSafely(raw);
    const fallback = buildAssistantFallback({ message, context });
    return {
      answer: String(parsed?.answer || '').trim() || fallback.answer,
      nextSteps: Array.isArray(parsed?.nextSteps) ? parsed.nextSteps.slice(0, 6) : fallback.nextSteps,
      safetyAlerts: Array.isArray(parsed?.safetyAlerts) ? parsed.safetyAlerts.slice(0, 6) : [],
      disclaimer: String(parsed?.disclaimer || '').trim() || fallback.disclaimer,
      provider: 'openai',
      model: DEFAULT_CHAT_MODEL,
    };
  } catch (_error) {
    return buildAssistantFallback({ message, context });
  }
};

const keywordRiskAssessment = ({ reason = '', details = '' } = {}) => {
  const text = `${String(reason || '')} ${String(details || '')}`.toLowerCase();
  const highRiskTerms = ['advance payment', 'passport', 'visa scam', 'fraud', 'cheated', 'money transfer'];
  const mediumRiskTerms = ['suspicious', 'fake', 'misleading', 'spam', 'abusive'];

  let score = 25;
  const categories = [];
  highRiskTerms.forEach((term) => {
    if (text.includes(term)) {
      score += 18;
      categories.push('financial_or_document_risk');
    }
  });
  mediumRiskTerms.forEach((term) => {
    if (text.includes(term)) {
      score += 10;
      categories.push('authenticity_risk');
    }
  });

  const boundedScore = Math.max(0, Math.min(100, score));
  let riskLevel = 'low';
  if (boundedScore >= 75) riskLevel = 'critical';
  else if (boundedScore >= 55) riskLevel = 'high';
  else if (boundedScore >= 35) riskLevel = 'medium';

  return {
    riskScore: boundedScore,
    riskLevel,
    categories: Array.from(new Set(categories)),
    provider: 'fallback',
    model: 'fallback',
  };
};

const assessJobReportRisk = async ({ reason = '', details = '', job = null } = {}) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const fallback = keywordRiskAssessment({ reason, details });
  if (!apiKey) return fallback;

  const systemPrompt = [
    'You classify job fraud report risk.',
    'Return strictly valid JSON: riskScore (0-100), riskLevel (low|medium|high|critical), categories (string[]), recommendation.',
    'Prioritize worker safety, document fraud, and payment fraud patterns.',
  ].join(' ');

  const userPrompt = JSON.stringify({
    report: {
      reason: String(reason || '').trim(),
      details: String(details || '').trim(),
    },
    job: job
      ? {
          title: job.title,
          company: job.company,
          type: job.type,
          location: job.location,
          isVerified: Boolean(job.isVerified),
        }
      : null,
  });

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: DEFAULT_CHAT_MODEL,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      },
      {
        headers: openAiHeaders(apiKey),
        timeout: 30000,
      }
    );

    const raw = response?.data?.choices?.[0]?.message?.content || '{}';
    const parsed = parseJsonSafely(raw);
    const riskScore = Math.max(0, Math.min(100, Number(parsed?.riskScore || fallback.riskScore)));
    const candidateRiskLevel = String(parsed?.riskLevel || '').trim().toLowerCase();
    const riskLevel = ['low', 'medium', 'high', 'critical'].includes(candidateRiskLevel)
      ? candidateRiskLevel
      : fallback.riskLevel;
    return {
      riskScore,
      riskLevel,
      categories: Array.isArray(parsed?.categories)
        ? parsed.categories.slice(0, 8).map((item) => String(item || '').trim()).filter(Boolean)
        : fallback.categories,
      recommendation: String(parsed?.recommendation || '').trim(),
      provider: 'openai',
      model: DEFAULT_CHAT_MODEL,
    };
  } catch (_error) {
    return fallback;
  }
};

module.exports = {
  calculateLexicalSkillScore,
  computeSemanticMatchScore,
  generateCareerAssistantResponse,
  assessJobReportRisk,
};
