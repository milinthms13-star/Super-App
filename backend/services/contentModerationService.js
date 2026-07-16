/**
 * FREE Content Moderation Service for Kids Video Maker
 * 
 * Uses 100% free methods:
 * 1. Keyword filtering (no API needed)
 * 2. Free AI moderation via Pollinations/HuggingFace (when available)
 * 
 * No paid APIs (OpenAI moderation, Perspective API, etc.)
 */

const sanitizeText = (value = '') => String(value || '').replace(/\u0000/g, '').trim();

// Comprehensive kid-safety rules - FREE, no API cost
const KID_SAFETY_RULES = [
  { code: 'self_harm', reason: 'self-harm or suicide', pattern: /suicide|self[-\s]?harm|cut[-\s]?myself|hurt[-\s]?myself/i, severity: 'critical' },
  { code: 'weapons', reason: 'weapons or violence', pattern: /weapon|gun|knife|sword|bomb|explosive|firearm/i, severity: 'high' },
  { code: 'graphic_violence', reason: 'graphic violence', pattern: /gore|kill|murder|terror|blood|death|torture|stab|shoot/i, severity: 'critical' },
  { code: 'abuse', reason: 'abuse or bullying', pattern: /abuse|bully|hurt\s+someone|harm\s+others|punch|kick\s+someone/i, severity: 'high' },
  { code: 'adult', reason: 'adult content', pattern: /explicit|adult\s+content|sexual|porn|nude|naked/i, severity: 'critical' },
  { code: 'drugs', reason: 'drugs or alcohol', pattern: /drug|alcohol|cigarette|smoking|marijuana|cocaine|meth|heroin/i, severity: 'high' },
  { code: 'hate_speech', reason: 'hate speech or discrimination', pattern: /hate|racist|sexist|discriminat|slur/i, severity: 'critical' },
  { code: 'scary', reason: 'scary or frightening themes', pattern: /horror|nightmare|ghost|demon|evil|satan|devil/i, severity: 'medium' },
  { code: 'inappropriate', reason: 'inappropriate language', pattern: /damn|hell|stupid|idiot|dumb|shut\s+up|loser|ugly/i, severity: 'low' },
  { code: 'dangerous', reason: 'dangerous activities', pattern: /jump\s+off|run\s+away|danger|unsafe|risky|peril/i, severity: 'medium' },
];

/**
 * Quick keyword-based safety check (FREE - instant, no API)
 */
function checkKeywordSafety(text) {
  const cleanText = sanitizeText(text);
  if (!cleanText) {
    return { safe: true, blocked: false, reasons: [] };
  }

  const violations = [];
  for (const rule of KID_SAFETY_RULES) {
    if (rule.pattern.test(cleanText)) {
      violations.push({
        code: rule.code,
        reason: rule.reason,
        severity: rule.severity
      });
    }
  }

  return {
    safe: violations.length === 0,
    blocked: violations.length > 0,
    reasons: violations,
    method: 'keyword-filter'
  };
}

/**
 * AI-powered moderation using FREE Pollinations or HuggingFace APIs
 * Falls back to keyword check if AI unavailable
 */
async function checkAISafety(text, options = {}) {
  const { aiProviderEnabled = true, freeAiProvider = 'pollinations', timeoutMs = 5000 } = options;

  // Quick keyword check first (free, instant)
  const keywordResult = checkKeywordSafety(text);
  
  if (!aiProviderEnabled) {
    return keywordResult;
  }

  // Try free AI moderation for deeper analysis
  try {
    const cleanText = sanitizeText(text).slice(0, 8000);
    const prompt = `Analyze this text for child-safety. Check for: violence, scary content, inappropriate language, adult themes, drugs, weapons, self-harm, hate speech.

Text to analyze:
"${cleanText}"

Respond ONLY with JSON:
{"safe": true/false, "concerns": ["list of specific concerns if unsafe"], "severity": "low/medium/high/critical"}

If safe for children, respond: {"safe": true, "concerns": [], "severity": "none"}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Try Pollinations first (free, no auth required)
      const response = await fetch('https://text.pollinations.ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are a strict child-safety content moderator. Respond only with JSON.' },
            { role: 'user', content: prompt }
          ],
          model: 'openai',
          jsonMode: true
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (response.ok) {
        const aiResult = await response.json();
        const aiText = aiResult?.text || aiResult?.message || '';
        
        // Try to parse JSON response
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          if (parsed.safe === false) {
            const aiReasons = (parsed.concerns || []).map((concern, i) => ({
              code: 'ai_flagged',
              reason: String(concern || 'unsafe content'),
              severity: parsed.severity || 'medium'
            }));

            return {
              safe: false,
              blocked: true,
              reasons: [...keywordResult.reasons, ...aiReasons],
              method: 'ai-moderation-free'
            };
          }
        }
      }
    } catch (aiError) {
      console.warn('Free AI moderation unavailable:', aiError.message);
    }

    // Fall back to keyword result if AI fails
    return {
      ...keywordResult,
      method: 'keyword-filter-fallback'
    };

  } catch (error) {
    console.warn('AI safety check error:', error.message);
    return keywordResult;
  }
}

/**
 * Combined safety check: keyword + AI (all FREE)
 */
async function moderateContent(text, options = {}) {
  const { useAI = true, ...aiOptions } = options;

  if (useAI) {
    return await checkAISafety(text, aiOptions);
  }

  return checkKeywordSafety(text);
}

/**
 * Create a safety error for API responses
 */
function createSafetyError(context, assessment) {
  const error = new Error(`Content blocked: ${context} contains unsafe content for children.`);
  error.code = 'SAFETY_VIOLATION';
  error.status = 422;
  error.safety = {
    context,
    blocked: true,
    reasons: assessment?.reasons || [],
    method: assessment?.method || 'unknown'
  };
  return error;
}

/**
 * Validate content is kid-safe, throw error if not
 */
async function validateKidSafe(content, context = 'content', options = {}) {
  const result = await moderateContent(content, options);
  
  if (result.blocked) {
    throw createSafetyError(context, result);
  }

  return result;
}

module.exports = {
  checkKeywordSafety,
  checkAISafety,
  moderateContent,
  validateKidSafe,
  createSafetyError,
  KID_SAFETY_RULES
};
