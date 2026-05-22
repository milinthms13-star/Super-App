const logger = require('../config/logger');
const NilaAIHubSession = require('../models/NilaAIHubSession');

const TRENDING_RECOMMENDATIONS = [
  {
    title: 'Gulf Visa Guidance Package',
    description: 'Step-by-step Gulf visa guidance with document checklist, processing timelines, and trusted agent support.',
  },
  {
    title: 'Local Service Price Comparator',
    description: 'Compare fees for travel agents, notary services, and migration paperwork across top-rated vendors.',
  },
  {
    title: 'Loan & Scheme Match',
    description: 'Find government scheme and instant loan options tailored for small businesses and salaried professionals.',
  },
  {
    title: 'Job Leads for Gulf & Local Work',
    description: 'Latest Gulf job leads, recruiter guidance, and local contract opportunities for your skill set.',
  },
  {
    title: 'Travel Safety + Health Checklist',
    description: 'Health, travel insurance, and emergency support recommendations for safe Gulf & local travel.',
  },
];

const PERSONALIZED_RECOMMENDATIONS = [
  {
    title: 'Recommended Gulf Migration Service',
    description: 'Verified Gulf visa consultants with high success rates and transparent fee structures.',
  },
  {
    title: 'Loan Scheme With Lowest EMI',
    description: 'Personalized loan suggestions with EMI comparison, eligibility checks, and quick apply links.',
  },
  {
    title: 'Local Vendor Match',
    description: 'Top local service providers for document help, travel bookings, and home services near you.',
  },
  {
    title: 'Gulf Job Readiness Guide',
    description: 'Resume, interview, and employer verification checklist for Gulf job seekers.',
  },
  {
    title: 'Health & Travel Support Plan',
    description: 'Pre-trip medical guidance, insurance selection, and emergency contact preparation.',
  },
];

const INTENT_SUGGESTIONS = {
  gulf_visa: [
    { text: 'Show Gulf visa document checklist' },
    { text: 'Suggest trusted Gulf service providers' },
    { text: 'Explain Gulf visa processing time' },
  ],
  loan_scheme: [
    { text: 'Compare loan EMI plans' },
    { text: 'Show government scheme options' },
    { text: 'Check eligibility for small business loan' },
  ],
  job_search: [
    { text: 'Find Gulf jobs matching my skills' },
    { text: 'Search local contract opportunities' },
    { text: 'How do I verify an employer?' },
  ],
  local_services: [
    { text: 'Compare local service pricing' },
    { text: 'Find a trusted agent nearby' },
    { text: 'What should I ask before hiring a service?' },
  ],
  health_travel: [
    { text: 'Get a travel safety checklist' },
    { text: 'Recommend travel insurance options' },
    { text: 'Suggest health support services' },
  ],
  general: [
    { text: 'Tell me more about Nila AI Hub' },
    { text: 'Show quick actions' },
    { text: 'Help me plan my next trip' },
  ],
};

const normalizeTopic = (topic = '') =>
  String(topic || '').trim().toLowerCase().replace(/\s+/g, '');

const detectIntent = (message = '', topic = '') => {
  const text = String(message || '').toLowerCase();
  const normalizedTopic = normalizeTopic(topic);

  if (normalizedTopic === 'gulfvisaguidance' || text.includes('gulf') || text.includes('visa')) {
    return 'gulf_visa';
  }

  if (normalizedTopic === 'businessminiappideas' || text.includes('loan') || text.includes('emi') || text.includes('scheme')) {
    return 'loan_scheme';
  }

  if (normalizedTopic === 'jobopportunities' || text.includes('job') || text.includes('employment') || text.includes('hiring')) {
    return 'job_search';
  }

  if (normalizedTopic === 'localservicepricing' || text.includes('service') || text.includes('vendor') || text.includes('pricing')) {
    return 'local_services';
  }

  if (normalizedTopic === 'healthtravelsupport' || text.includes('health') || text.includes('travel') || text.includes('insurance')) {
    return 'health_travel';
  }

  return 'general';
};

const generateResponse = (intent, message = '') => {
  const text = String(message || '').trim();

  switch (intent) {
    case 'gulf_visa':
      return `For Gulf visa guidance, I recommend preparing your passport, invitation or employment letter, medical report, and any embassy-specific documents. Start by checking the destination country requirements, book your medical exam early, and plan for at least 2-3 weeks of processing time.`;

    case 'loan_scheme':
      return `For loan and scheme support, compare interest rates, eligibility, and processing fees first. If you share your loan amount, income, or business type, I can suggest the most suitable government scheme or quick loan option.`;

    case 'job_search':
      return `I can help find Gulf and local job opportunities. Please tell me your skills, preferred sector, and whether you want a salaried or contract role so I can narrow it down.`;

    case 'local_services':
      return `I can compare local service providers for travel, documentation, or home assistance. Share your location and the type of help you need, and I’ll suggest trusted vendors with pricing guidance.`;

    case 'health_travel':
      return `For safe travel and health support, prepare a medical checklist, verify your insurance coverage, and choose clinics or hospitals with good reviews. I can also recommend travel insurance and emergency support contacts if you like.`;

    default:
      return `Welcome to Nila AI Hub! Ask me anything about Gulf visas, loans, local services, jobs, health, or travel. I’ll help you with practical next steps.`;
  }
};

const createBaseRecommendation = (item) => ({
  title: item.title,
  description: item.description,
});

class NilaAIHubService {
  static async initializeChatSession(userId = null) {
    try {
      const session = new NilaAIHubSession({
        userId: userId ? String(userId) : null,
        status: 'active',
        topic: 'general',
        messages: [
          {
            role: 'assistant',
            content: 'Welcome to Nila AI Hub. Ask anything about Gulf services, loans, local help, or your next trip.',
            timestamp: new Date(),
            intent: 'greeting',
          },
        ],
      });

      await session.save();
      logger.info(`NilaAIHub session initialized: ${session._id}`);

      return {
        sessionId: session._id,
        status: session.status,
      };
    } catch (error) {
      logger.error('Error initializing NilaAIHub session:', error);
      throw error;
    }
  }

  static async sendMessage(sessionId, userId, userMessage, context = {}) {
    try {
      if (!sessionId || !userMessage) {
        throw new Error('sessionId and userMessage are required');
      }

      const session = await NilaAIHubSession.findById(sessionId);
      if (!session) {
        throw new Error('Chat session not found');
      }

      const topic = context.topic || session.topic || 'general';
      const intent = detectIntent(userMessage, topic);
      const aiResponse = generateResponse(intent, userMessage);
      const suggestedActions = INTENT_SUGGESTIONS[intent] || INTENT_SUGGESTIONS.general;

      session.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
        intent,
      });
      session.messages.push({
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        intent,
      });
      session.topic = topic;
      session.lastMessageAt = new Date();
      await session.save();

      return {
        sessionId,
        response: aiResponse,
        intent,
        topic,
        suggestedActions,
      };
    } catch (error) {
      logger.error('Error sending NilaAIHub message:', error);
      throw error;
    }
  }

  static async getChatHistory(sessionId) {
    try {
      const session = await NilaAIHubSession.findById(sessionId);
      if (!session) {
        throw new Error('Chat session not found');
      }

      return {
        sessionId,
        messages: session.messages,
        status: session.status,
        topic: session.topic,
      };
    } catch (error) {
      logger.error('Error getting NilaAIHub chat history:', error);
      throw error;
    }
  }

  static async getPersonalizedRecommendations(userId, limit = 6) {
    try {
      const suggestions = PERSONALIZED_RECOMMENDATIONS.slice(0, limit).map(createBaseRecommendation);
      return suggestions;
    } catch (error) {
      logger.error('Error generating personalized recommendations:', error);
      throw error;
    }
  }

  static async getTrendingRecommendations(limit = 6) {
    try {
      return TRENDING_RECOMMENDATIONS.slice(0, limit).map(createBaseRecommendation);
    } catch (error) {
      logger.error('Error generating trending recommendations:', error);
      throw error;
    }
  }

  static async closeChatSession(sessionId) {
    try {
      const session = await NilaAIHubSession.findByIdAndUpdate(
        sessionId,
        { status: 'closed' },
        { new: true }
      );

      if (!session) {
        throw new Error('Chat session not found');
      }

      return {
        sessionId,
        status: session.status,
      };
    } catch (error) {
      logger.error('Error closing NilaAIHub session:', error);
      throw error;
    }
  }

  static async rateChatSession(sessionId, rating, feedback = '') {
    try {
      const session = await NilaAIHubSession.findByIdAndUpdate(
        sessionId,
        { rating, feedback, ratedAt: new Date() },
        { new: true }
      );

      if (!session) {
        throw new Error('Chat session not found');
      }

      return {
        sessionId,
        rating,
        feedback,
        message: 'Thank you for your feedback!',
      };
    } catch (error) {
      logger.error('Error rating NilaAIHub session:', error);
      throw error;
    }
  }
}

module.exports = NilaAIHubService;
