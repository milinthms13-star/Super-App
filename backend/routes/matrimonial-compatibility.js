const express = require('express');
const router = express.Router();
const CompatibilityQuestionnaire = require('../models/CompatibilityQuestionnaire');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const { authenticate } = require('../middleware/auth');

// Questionnaire structure (50 questions across 6 categories)
const questionnaireStructure = {
  personality: [
    { id: 'p1', question: 'How do you handle conflicts?', type: 'single', options: ['Discuss calmly', 'Need time alone first', 'Avoid confrontation', 'Express emotions openly'] },
    { id: 'p2', question: 'Your social preference?', type: 'single', options: ['Love parties and gatherings', 'Small groups preferred', 'One-on-one conversations', 'Mostly introverted'] },
    { id: 'p3', question: 'Decision making style?', type: 'single', options: ['Logical and analytical', 'Go with gut feeling', 'Seek others\' opinions', 'Take time to decide'] },
    { id: 'p4', question: 'How do you express love?', type: 'multi', options: ['Words of affirmation', 'Quality time', 'Physical touch', 'Acts of service', 'Gifts'] },
    { id: 'p5', question: 'Your stress management?', type: 'single', options: ['Exercise/sports', 'Talk to someone', 'Alone time', 'Work through it'] },
    { id: 'p6', question: 'Punctuality importance?', type: 'scale', min: 1, max: 10 },
    { id: 'p7', question: 'Cleanliness/organization level?', type: 'scale', min: 1, max: 10 },
    { id: 'p8', question: 'Spontaneity vs planning?', type: 'single', options: ['Love spontaneous plans', 'Bit of both', 'Prefer planned activities', 'Everything must be planned'] },
    { id: 'p9', question: 'Sense of humor type?', type: 'multi', options: ['Sarcastic', 'Witty', 'Slapstick', 'Dry humor', 'Punny'] },
    { id: 'p10', question: 'Privacy needs?', type: 'scale', min: 1, max: 10 }
  ],
  lifestyle: [
    { id: 'l1', question: 'Ideal weekend?', type: 'single', options: ['Out exploring', 'At home relaxing', 'With family', 'Pursuing hobbies'] },
    { id: 'l2', question: 'Dietary preferences?', type: 'multi', options: ['Vegetarian', 'Non-vegetarian', 'Vegan', 'Specific cuisine lover', 'Not particular'] },
    { id: 'l3', question: 'Exercise frequency?', type: 'single', options: ['Daily', '3-4 times/week', 'Occasionally', 'Rarely'] },
    { id: 'l4', question: 'Sleep schedule?', type: 'single', options: ['Early bird', 'Night owl', 'Flexible', 'Inconsistent'] },
    { id: 'l5', question: 'Smoking/drinking?', type: 'multi', options: ['Never smoke', 'Never drink', 'Social drinker', 'Regular drinker', 'Open to it'] },
    { id: 'l6', question: 'Pet preference?', type: 'single', options: ['Love pets', 'Okay with pets', 'Allergic/uncomfortable', 'No preference'] },
    { id: 'l7', question: 'Travel frequency desired?', type: 'single', options: ['Multiple times a year', 'Once a year', 'Occasionally', 'Not important'] },
    { id: 'l8', question: 'Technology usage?', type: 'single', options: ['Heavy user', 'Moderate', 'Minimal', 'Tech-averse'] },
    { id: 'l9', question: 'Entertainment preferences?', type: 'multi', options: ['Movies/series', 'Reading', 'Gaming', 'Sports', 'Music/concerts'] },
    { id: 'l10', question: 'Spirituality/religion importance?', type: 'scale', min: 1, max: 10 }
  ],
  family: [
    { id: 'f1', question: 'Family structure preference?', type: 'single', options: ['Joint family', 'Nuclear family', 'Close to parents', 'Independent living'] },
    { id: 'f2', question: 'In-law relationship expectation?', type: 'single', options: ['Very close', 'Respectful distance', 'Independent', 'Depends on chemistry'] },
    { id: 'f3', question: 'Festival celebrations importance?', type: 'scale', min: 1, max: 10 },
    { id: 'f4', question: 'Children plans?', type: 'single', options: ['Want children soon', 'Want children eventually', 'Open to discussion', 'Don\'t want children'] },
    { id: 'f5', question: 'Number of children preferred?', type: 'single', options: ['1', '2', '3+', 'Open'] },
    { id: 'f6', question: 'Parenting style?', type: 'single', options: ['Strict', 'Balanced', 'Lenient', 'Will decide together'] },
    { id: 'f7', question: 'Care for elderly parents?', type: 'single', options: ['Live with us', 'Nearby living', 'Regular visits', 'As needed'] },
    { id: 'f8', question: 'Family decision-making?', type: 'single', options: ['Couple decides', 'Joint family input', 'Consult parents', 'Case by case'] },
    { id: 'f9', question: 'Extended family interaction?', type: 'single', options: ['Very frequent', 'Regular', 'Occasional', 'Minimal'] },
    { id: 'f10', question: 'Traditional values importance?', type: 'scale', min: 1, max: 10 }
  ],
  career: [
    { id: 'c1', question: 'Career ambition level?', type: 'scale', min: 1, max: 10 },
    { id: 'c2', question: 'Work-life balance importance?', type: 'scale', min: 1, max: 10 },
    { id: 'c3', question: 'Partner working preference?', type: 'single', options: ['Must work', 'Prefer working', 'Their choice', 'Prefer homemaker'] },
    { id: 'c4', question: 'Relocation for career?', type: 'single', options: ['Open to relocate', 'Only within country', 'Only same city', 'Not open'] },
    { id: 'c5', question: 'Household responsibility sharing?', type: 'single', options: ['Equal split', 'Based on schedule', 'Traditional roles', 'Hire help'] },
    { id: 'c6', question: 'Career breaks acceptable?', type: 'single', options: ['Yes for either', 'Yes for specific reasons', 'Not preferred', 'Never'] },
    { id: 'c7', question: 'Entrepreneurship interest?', type: 'single', options: ['Have/want business', 'Open to it', 'Not interested', 'Prefer stable job'] },
    { id: 'c8', question: 'Further education plans?', type: 'single', options: ['Definitely', 'Maybe', 'No plans', 'Supportive if partner wants'] }
  ],
  finance: [
    { id: 'fi1', question: 'Financial management style?', type: 'single', options: ['Saver', 'Balanced', 'Spender', 'Investor'] },
    { id: 'fi2', question: 'Joint or separate finances?', type: 'single', options: ['Completely joint', 'Mostly joint', 'Hybrid approach', 'Separate'] },
    { id: 'fi3', question: 'Major purchase decisions?', type: 'single', options: ['Together always', 'Discuss big ones', 'Individual freedom', 'Depends on amount'] },
    { id: 'fi4', question: 'Luxury spending attitude?', type: 'single', options: ['Love luxuries', 'Occasional treats', 'Practical spending', 'Very frugal'] },
    { id: 'fi5', question: 'Financial planning importance?', type: 'scale', min: 1, max: 10 },
    { id: 'fi6', question: 'Home ownership priority?', type: 'single', options: ['High priority', 'Eventually', 'Rent is fine', 'No preference'] },
    { id: 'fi7', question: 'Supporting parents financially?', type: 'single', options: ['Definitely', 'If needed', 'Discuss together', 'Not expected'] }
  ],
  future: [
    { id: 'fu1', question: 'Preferred city tier for living?', type: 'single', options: ['Metro city', 'Tier 2 city', 'Small town', 'Abroad'] },
    { id: 'fu2', question: 'Dream lifestyle in 10 years?', type: 'text' },
    { id: 'fu3', question: 'Retirement plans?', type: 'single', options: ['Early retirement', 'Standard age', 'Work as long as able', 'Not thought about'] },
    { id: 'fu4', question: 'Importance of owning car?', type: 'scale', min: 1, max: 10 },
    { id: 'fu5', question: 'Social circle preference?', type: 'single', options: ['Large friend circle', 'Close few friends', 'Family-focused', 'Private life'] }
  ]
};

// Get questionnaire structure
router.get('/questions', authenticate, async (req, res) => {
  try {
    res.json({ questionnaire: questionnaireStructure });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Get user's questionnaire answers
router.get('/profile/:profileId', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    
    const questionnaire = await CompatibilityQuestionnaire.findOne({ profileId });
    
    if (!questionnaire) {
      return res.json({ questionnaire: null, completionPercentage: 0 });
    }

    res.json({ questionnaire });
  } catch (error) {
    console.error('Error fetching questionnaire:', error);
    res.status(500).json({ error: 'Failed to fetch questionnaire' });
  }
});

// Save/update answers
router.post('/profile/:profileId/answers', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { category, answers } = req.body;

    // Validate category
    if (!['personality', 'lifestyle', 'family', 'career', 'finance', 'future'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    let questionnaire = await CompatibilityQuestionnaire.findOne({ profileId });
    
    if (!questionnaire) {
      questionnaire = new CompatibilityQuestionnaire({
        profileId,
        userId: req.user._id
      });
    }

    // Update category answers
    const fieldName = `${category}Answers`;
    questionnaire[fieldName] = answers;
    questionnaire.lastUpdated = new Date();

    await questionnaire.save();

    res.json({
      message: 'Answers saved successfully',
      completionPercentage: questionnaire.completionPercentage,
      questionnaire
    });
  } catch (error) {
    console.error('Error saving answers:', error);
    res.status(500).json({ error: 'Failed to save answers' });
  }
});

// Calculate compatibility with another profile
router.get('/profile/:profileId/compatibility/:targetProfileId', authenticate, async (req, res) => {
  try {
    const { profileId, targetProfileId } = req.params;

    const myQuestionnaire = await CompatibilityQuestionnaire.findOne({ profileId });
    const theirQuestionnaire = await CompatibilityQuestionnaire.findOne({ profileId: targetProfileId });

    if (!myQuestionnaire || !theirQuestionnaire) {
      return res.json({
        error: 'Both profiles need to complete questionnaire',
        compatibility: null
      });
    }

    const compatibility = myQuestionnaire.calculateCompatibility(theirQuestionnaire);

    res.json({ compatibility });
  } catch (error) {
    console.error('Error calculating compatibility:', error);
    res.status(500).json({ error: 'Failed to calculate compatibility' });
  }
});

// Get compatibility scores for multiple profiles
router.post('/profile/:profileId/bulk-compatibility', authenticate, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { targetProfileIds } = req.body;

    if (!Array.isArray(targetProfileIds) || targetProfileIds.length === 0) {
      return res.status(400).json({ error: 'Invalid target profile IDs' });
    }

    const myQuestionnaire = await CompatibilityQuestionnaire.findOne({ profileId });
    if (!myQuestionnaire) {
      return res.json({
        error: 'Complete your questionnaire first',
        scores: []
      });
    }

    const scores = [];
    
    for (const targetId of targetProfileIds) {
      const theirQuestionnaire = await CompatibilityQuestionnaire.findOne({ profileId: targetId });
      if (theirQuestionnaire) {
        const compatibility = myQuestionnaire.calculateCompatibility(theirQuestionnaire);
        scores.push({
          profileId: targetId,
          score: compatibility.score,
          breakdown: compatibility.breakdown
        });
      } else {
        scores.push({
          profileId: targetId,
          score: null,
          note: 'Questionnaire not completed'
        });
      }
    }

    res.json({ scores });
  } catch (error) {
    console.error('Error calculating bulk compatibility:', error);
    res.status(500).json({ error: 'Failed to calculate compatibility scores' });
  }
});

// Get detailed compatibility analysis
router.get('/profile/:profileId/detailed-analysis/:targetProfileId', authenticate, async (req, res) => {
  try {
    const { profileId, targetProfileId } = req.params;

    const myQuestionnaire = await CompatibilityQuestionnaire.findOne({ profileId });
    const theirQuestionnaire = await CompatibilityQuestionnaire.findOne({ profileId: targetProfileId });

    if (!myQuestionnaire || !theirQuestionnaire) {
      return res.status(400).json({ error: 'Both profiles need to complete questionnaire' });
    }

    const compatibility = myQuestionnaire.calculateCompatibility(theirQuestionnaire);
    
    // Add detailed question-by-question comparison
    const detailedComparison = {};
    
    Object.keys(questionnaireStructure).forEach(category => {
      const myAnswers = myQuestionnaire[`${category}Answers`] || [];
      const theirAnswers = theirQuestionnaire[`${category}Answers`] || [];
      
      detailedComparison[category] = questionnaireStructure[category].map(q => {
        const myAnswer = myAnswers.find(a => a.questionId === q.id);
        const theirAnswer = theirAnswers.find(a => a.questionId === q.id);
        
        return {
          question: q.question,
          myAnswer: myAnswer?.answer,
          theirAnswer: theirAnswer?.answer,
          match: myAnswer && theirAnswer && 
            JSON.stringify(myAnswer.answer) === JSON.stringify(theirAnswer.answer)
        };
      });
    });

    res.json({
      compatibility,
      detailedComparison,
      recommendations: compatibility.analysis.recommendations
    });
  } catch (error) {
    console.error('Error generating detailed analysis:', error);
    res.status(500).json({ error: 'Failed to generate analysis' });
  }
});

module.exports = router;
