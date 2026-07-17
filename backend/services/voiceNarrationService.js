/**
 * Voice Narration Service for Personal Tutor
 * Uses Web Speech API (FREE - No API keys needed!)
 */

/**
 * Generate speech synthesis instructions for lesson content
 * This runs on the client-side using browser's built-in speech API
 */
function prepareLessonForSpeech(lessonContent) {
  const speechSegments = [];

  // Introduction
  if (lessonContent.introduction) {
    speechSegments.push({
      type: 'introduction',
      text: lessonContent.introduction,
      rate: 0.9, // Slightly slower for introduction
      pitch: 1.1,
    });
  }

  // Sections
  if (lessonContent.sections) {
    lessonContent.sections.forEach((section, index) => {
      // Section title
      speechSegments.push({
        type: 'section-title',
        text: `Section ${index + 1}: ${section.title}`,
        rate: 0.95,
        pitch: 1.2,
        pause: 500, // Pause after title
      });

      // Section content
      if (typeof section.content === 'string') {
        speechSegments.push({
          type: 'content',
          text: section.content,
          rate: 0.85,
          pitch: 1.0,
        });
      }

      // Examples
      if (section.examples && section.examples.length > 0) {
        speechSegments.push({
          type: 'examples-intro',
          text: 'Now let me show you some examples:',
          rate: 0.9,
          pitch: 1.1,
        });

        section.examples.forEach((example, exIdx) => {
          const exampleText = typeof example === 'string' 
            ? example 
            : `${example.title || example.scenario}. ${example.description || example.analysis}`;
          
          speechSegments.push({
            type: 'example',
            text: `Example ${exIdx + 1}: ${exampleText}`,
            rate: 0.85,
            pitch: 1.0,
            pause: 300,
          });
        });
      }
    });
  }

  // Key Takeaways
  if (lessonContent.keyTakeaways && lessonContent.keyTakeaways.length > 0) {
    speechSegments.push({
      type: 'takeaways-intro',
      text: 'Here are the key points to remember:',
      rate: 0.9,
      pitch: 1.2,
      pause: 500,
    });

    lessonContent.keyTakeaways.forEach((takeaway, idx) => {
      speechSegments.push({
        type: 'takeaway',
        text: `Point ${idx + 1}: ${takeaway}`,
        rate: 0.85,
        pitch: 1.0,
        pause: 400,
      });
    });
  }

  return speechSegments;
}

/**
 * Get available voices for the browser
 * This is executed on client-side
 */
function getAvailableVoices() {
  // This will be called from frontend
  // Returns list of available voices in user's browser
  return {
    instructions: 'Call window.speechSynthesis.getVoices() on frontend',
    preferredVoices: [
      'Google UK English Female',
      'Google US English',
      'Microsoft David - English (United States)',
      'Microsoft Zira - English (United States)',
    ],
  };
}

/**
 * Generate instructions for video demonstrations
 */
function getVideoDemonstrations(subject, topic) {
  const videoLibrary = {
    'CA Foundation': {
      'Accounting Fundamentals': [
        {
          title: 'Accounting Equation Explained',
          url: 'https://www.youtube.com/embed/0C4qpAWMXbE',
          duration: '10:30',
          description: 'Visual explanation of Assets = Liabilities + Capital',
        },
      ],
      'Journal Entries': [
        {
          title: 'Golden Rules of Accounting',
          url: 'https://www.youtube.com/embed/JMq5QgU5TRw',
          duration: '15:20',
          description: 'Complete guide to journal entries with examples',
        },
      ],
    },
    'UPSC Prelims': {
      'Indian Polity': [
        {
          title: 'Article 32 Explained',
          url: 'https://www.youtube.com/embed/polity-video-id',
          duration: '20:00',
          description: 'Fundamental Rights and Constitutional Remedies',
        },
      ],
      'Indian Economy': [
        {
          title: 'Understanding Fiscal Deficit',
          url: 'https://www.youtube.com/embed/economy-video-id',
          duration: '18:00',
          description: 'Budget concepts made simple',
        },
      ],
    },
  };

  return videoLibrary[subject]?.[topic] || [];
}

/**
 * Generate interactive demonstration data
 */
function getInteractiveDemonstrations(subject, topic) {
  const demonstrations = {
    'CA Foundation': {
      'Accounting Fundamentals': {
        type: 'interactive-equation',
        title: 'Balance the Equation Game',
        description: 'Try different transactions and see how the equation balances',
        steps: [
          { action: 'Add Cash ₹1,00,000', result: 'Assets increase, Capital increases' },
          { action: 'Buy Furniture ₹20,000', result: 'One asset increases, another decreases' },
          { action: 'Take Loan ₹50,000', result: 'Assets increase, Liabilities increase' },
        ],
      },
      'Journal Entries': {
        type: 'step-by-step-entry',
        title: 'Create Your Own Journal Entry',
        description: 'Follow the steps to write a journal entry',
        steps: [
          'Step 1: Read the transaction',
          'Step 2: Identify the accounts',
          'Step 3: Classify accounts (Personal/Real/Nominal)',
          'Step 4: Apply golden rule',
          'Step 5: Write the entry',
          'Step 6: Check your answer',
        ],
      },
    },
  };

  return demonstrations[subject]?.[topic] || null;
}

module.exports = {
  prepareLessonForSpeech,
  getAvailableVoices,
  getVideoDemonstrations,
  getInteractiveDemonstrations,
};
