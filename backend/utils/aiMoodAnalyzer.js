// Simple keyword-based mood analyzer
const MOOD_KEYWORDS = {
  very_sad: ['depressed', 'hopeless', 'devastated', 'broken', 'worst'],
  sad: ['sad', 'down', 'hurt', 'lonely', 'cry'],
  neutral: ['okay', 'fine', 'normal', 'average'],
  happy: ['happy', 'good', 'great', 'excited', 'joy'],
  very_happy: ['ecstatic', 'amazing', 'best', 'thrilled', 'blessed']
};

function analyzeMood(content) {
  const lowerContent = content.toLowerCase();
  let scores = { very_sad: 0, sad: 0, neutral: 0, happy: 0, very_happy: 0 };
  
  Object.keys(MOOD_KEYWORDS).forEach(mood => {
    MOOD_KEYWORDS[mood].forEach(keyword => {
      scores[mood] += (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
    });
  });

  return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
}

module.exports = { analyzeMood };

